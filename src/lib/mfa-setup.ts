/**
 * Multi-Factor Authentication Setup and Management
 * TOTP, SMS, Email, Recovery codes, and MFA policy enforcement
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientClient } from '@/lib/supabase/client'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { Resend } from 'resend'

// Types for MFA system
export interface MFAMethod {
  id: string
  userId: string
  type: 'totp' | 'sms' | 'email' | 'backup_codes'
  name: string
  isEnabled: boolean
  isPrimary: boolean
  isVerified: boolean
  metadata: TOTPMetadata | SMSMetadata | EmailMetadata | BackupCodesMetadata
  createdAt: Date
  lastUsed?: Date
  verifiedAt?: Date
}

export interface TOTPMetadata {
  secret: string
  qrCodeUrl?: string
  issuer: string
  accountName: string
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  digits: 6 | 8
  period: number
}

export interface SMSMetadata {
  phoneNumber: string
  countryCode: string
  isVerified: boolean
  lastVerificationCode?: string
  lastVerificationSent?: Date
  verificationAttempts: number
}

export interface EmailMetadata {
  email: string
  isVerified: boolean
  lastVerificationCode?: string
  lastVerificationSent?: Date
  verificationAttempts: number
}

export interface BackupCodesMetadata {
  codes: BackupCode[]
  generatedAt: Date
  usedCount: number
}

export interface BackupCode {
  code: string
  isUsed: boolean
  usedAt?: Date
}

export interface MFAChallenge {
  id: string
  userId: string
  sessionId: string
  challengeType: 'totp' | 'sms' | 'email' | 'backup_code'
  methodId: string
  code?: string // For SMS/Email challenges
  expiresAt: Date
  attempts: number
  maxAttempts: number
  isCompleted: boolean
  completedAt?: Date
  createdAt: Date
}

export interface MFAPolicy {
  organizationId: string
  isRequired: boolean
  gracePeriodDays: number
  allowedMethods: ('totp' | 'sms' | 'email')[]
  requireMultipleMethods: boolean
  backupCodesRequired: boolean
  totpSettings: {
    issuerName: string
    algorithm: 'SHA1' | 'SHA256' | 'SHA512'
    digits: 6 | 8
    period: number
    window: number
  }
  smsSettings: {
    enabled: boolean
    provider: 'twilio' | 'aws' | 'custom'
    maxAttemptsPerDay: number
    rateLimitMinutes: number
  }
  emailSettings: {
    enabled: boolean
    maxAttemptsPerDay: number
    rateLimitMinutes: number
  }
  enforcementRules: {
    requireForAdmins: boolean
    requireForPrivilegedActions: boolean
    exemptTrustedDevices: boolean
    trustedDeviceExpirationDays: number
  }
}

export interface MFASetupResult {
  method: MFAMethod
  qrCode?: string
  backupCodes?: string[]
  verificationRequired: boolean
}

export interface MFAVerificationResult {
  success: boolean
  methodUsed?: string
  remainingAttempts?: number
  error?: string
  backupCodeUsed?: boolean
  trusted?: boolean
}

// MFA Manager Class
export class MFAManager {
  private supabase: any
  private resend: Resend

  constructor() {
    this.supabase = createClient()
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  // MFA Setup Methods
  async setupTOTP(userId: string, name: string = 'Authenticator App'): Promise<MFASetupResult> {
    // Get user info for TOTP setup
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('email, full_name, organization_id')
      .eq('id', userId)
      .single()

    if (!profile) throw new Error('User profile not found')

    // Get MFA policy for organization
    const policy = await this.getMFAPolicy(profile.organization_id)

    // Generate TOTP secret
    const secret = authenticator.generateSecret()
    const issuer = policy.totpSettings.issuerName
    const accountName = `${profile.full_name} (${profile.email})`

    // Configure TOTP
    authenticator.options = {
      algorithm: policy.totpSettings.algorithm,
      digits: policy.totpSettings.digits,
      period: policy.totpSettings.period,
      window: policy.totpSettings.window,
    }

    // Generate QR code
    const otpauth = authenticator.keyuri(accountName, issuer, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

    // Create MFA method record
    const { data: method, error } = await this.supabase
      .from('mfa_methods')
      .insert({
        user_id: userId,
        type: 'totp',
        name,
        is_enabled: false, // Will be enabled after verification
        is_verified: false,
        metadata: JSON.stringify({
          secret,
          qrCodeUrl: qrCodeDataUrl,
          issuer,
          accountName,
          algorithm: policy.totpSettings.algorithm,
          digits: policy.totpSettings.digits,
          period: policy.totpSettings.period,
        } as TOTPMetadata),
      })
      .select()
      .single()

    if (error) throw error

    return {
      method: this.parseMFAMethod(method),
      qrCode: qrCodeDataUrl,
      verificationRequired: true,
    }
  }

  async setupSMS(
    userId: string,
    phoneNumber: string,
    countryCode: string,
    name: string = 'SMS'
  ): Promise<MFASetupResult> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(phoneNumber, countryCode)) {
      throw new Error('Invalid phone number format')
    }

    // Create MFA method record
    const { data: method, error } = await this.supabase
      .from('mfa_methods')
      .insert({
        user_id: userId,
        type: 'sms',
        name,
        is_enabled: false,
        is_verified: false,
        metadata: JSON.stringify({
          phoneNumber,
          countryCode,
          isVerified: false,
          verificationAttempts: 0,
        } as SMSMetadata),
      })
      .select()
      .single()

    if (error) throw error

    // Send verification SMS
    await this.sendSMSVerification(method.id)

    return {
      method: this.parseMFAMethod(method),
      verificationRequired: true,
    }
  }

  async setupEmail(userId: string, email: string, name: string = 'Email'): Promise<MFASetupResult> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format')
    }

    // Create MFA method record
    const { data: method, error } = await this.supabase
      .from('mfa_methods')
      .insert({
        user_id: userId,
        type: 'email',
        name,
        is_enabled: false,
        is_verified: false,
        metadata: JSON.stringify({
          email,
          isVerified: false,
          verificationAttempts: 0,
        } as EmailMetadata),
      })
      .select()
      .single()

    if (error) throw error

    // Send verification email
    await this.sendEmailVerification(method.id)

    return {
      method: this.parseMFAMethod(method),
      verificationRequired: true,
    }
  }

  async generateBackupCodes(userId: string): Promise<MFASetupResult> {
    // Generate 10 backup codes
    const codes: BackupCode[] = []
    for (let i = 0; i < 10; i++) {
      codes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        isUsed: false,
      })
    }

    // Create MFA method record
    const { data: method, error } = await this.supabase
      .from('mfa_methods')
      .insert({
        user_id: userId,
        type: 'backup_codes',
        name: 'Backup Codes',
        is_enabled: true,
        is_verified: true,
        metadata: JSON.stringify({
          codes,
          generatedAt: new Date(),
          usedCount: 0,
        } as BackupCodesMetadata),
      })
      .select()
      .single()

    if (error) throw error

    return {
      method: this.parseMFAMethod(method),
      backupCodes: codes.map(c => c.code),
      verificationRequired: false,
    }
  }

  // MFA Verification Methods
  async verifySetup(methodId: string, verificationCode: string): Promise<boolean> {
    const { data: method, error } = await this.supabase
      .from('mfa_methods')
      .select('*')
      .eq('id', methodId)
      .single()

    if (error || !method) throw new Error('MFA method not found')

    const methodObj = this.parseMFAMethod(method)
    let isValid = false

    switch (methodObj.type) {
      case 'totp':
        isValid = this.verifyTOTP(methodObj.metadata as TOTPMetadata, verificationCode)
        break
      case 'sms':
        isValid = await this.verifySMS(methodId, verificationCode)
        break
      case 'email':
        isValid = await this.verifyEmail(methodId, verificationCode)
        break
    }

    if (isValid) {
      // Enable and verify the method
      await this.supabase
        .from('mfa_methods')
        .update({
          is_enabled: true,
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq('id', methodId)

      // Check if this should be the primary method
      const userMethods = await this.getUserMFAMethods(methodObj.userId)
      if (userMethods.filter(m => m.isEnabled && m.isPrimary).length === 0) {
        await this.setPrimaryMethod(methodId)
      }

      return true
    }

    return false
  }

  async createMFAChallenge(
    userId: string,
    sessionId: string,
    preferredMethod?: string
  ): Promise<MFAChallenge> {
    const userMethods = await this.getUserMFAMethods(userId)
    const enabledMethods = userMethods.filter(m => m.isEnabled && m.isVerified)

    if (enabledMethods.length === 0) {
      throw new Error('No MFA methods configured')
    }

    // Choose method based on preference or use primary
    let selectedMethod = enabledMethods.find(m => m.isPrimary) || enabledMethods[0]
    if (preferredMethod) {
      const preferred = enabledMethods.find(m => m.id === preferredMethod)
      if (preferred) selectedMethod = preferred
    }

    // Create challenge
    const challengeId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    let challengeCode: string | undefined

    // Generate and send challenge code for SMS/Email
    if (selectedMethod.type === 'sms' || selectedMethod.type === 'email') {
      challengeCode = crypto.randomInt(100000, 999999).toString()

      if (selectedMethod.type === 'sms') {
        await this.sendSMSChallenge(selectedMethod.id, challengeCode)
      } else {
        await this.sendEmailChallenge(selectedMethod.id, challengeCode)
      }
    }

    const { data: challenge, error } = await this.supabase
      .from('mfa_challenges')
      .insert({
        id: challengeId,
        user_id: userId,
        session_id: sessionId,
        challenge_type: selectedMethod.type,
        method_id: selectedMethod.id,
        code: challengeCode,
        expires_at: expiresAt.toISOString(),
        max_attempts: 3,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: challenge.id,
      userId: challenge.user_id,
      sessionId: challenge.session_id,
      challengeType: challenge.challenge_type,
      methodId: challenge.method_id,
      code: challenge.code,
      expiresAt: new Date(challenge.expires_at),
      attempts: challenge.attempts || 0,
      maxAttempts: challenge.max_attempts,
      isCompleted: challenge.is_completed || false,
      completedAt: challenge.completed_at ? new Date(challenge.completed_at) : undefined,
      createdAt: new Date(challenge.created_at),
    }
  }

  async verifyMFAChallenge(
    challengeId: string,
    verificationCode: string
  ): Promise<MFAVerificationResult> {
    const { data: challenge, error } = await this.supabase
      .from('mfa_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (error || !challenge) {
      return { success: false, error: 'Challenge not found' }
    }

    // Check if challenge has expired
    if (new Date() > new Date(challenge.expires_at)) {
      return { success: false, error: 'Challenge has expired' }
    }

    // Check if already completed
    if (challenge.is_completed) {
      return { success: false, error: 'Challenge already completed' }
    }

    // Check attempts limit
    if (challenge.attempts >= challenge.max_attempts) {
      return { success: false, error: 'Maximum attempts exceeded' }
    }

    let isValid = false
    let backupCodeUsed = false

    // Verify based on challenge type
    switch (challenge.challenge_type) {
      case 'totp':
        isValid = await this.verifyTOTPChallenge(challenge.method_id, verificationCode)
        break
      case 'sms':
      case 'email':
        isValid = challenge.code === verificationCode
        break
      case 'backup_code':
        const result = await this.verifyBackupCode(challenge.user_id, verificationCode)
        isValid = result.success
        backupCodeUsed = result.success
        break
    }

    // Update challenge attempts
    await this.supabase
      .from('mfa_challenges')
      .update({
        attempts: challenge.attempts + 1,
        is_completed: isValid,
        completed_at: isValid ? new Date().toISOString() : null,
      })
      .eq('id', challengeId)

    if (isValid) {
      // Update method last used timestamp
      await this.supabase
        .from('mfa_methods')
        .update({ last_used: new Date().toISOString() })
        .eq('id', challenge.method_id)

      return {
        success: true,
        methodUsed: challenge.challenge_type,
        backupCodeUsed,
      }
    }

    return {
      success: false,
      error: 'Invalid verification code',
      remainingAttempts: challenge.max_attempts - (challenge.attempts + 1),
    }
  }

  // MFA Management Methods
  async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
    const { data: methods, error } = await this.supabase
      .from('mfa_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return methods.map(this.parseMFAMethod)
  }

  async setPrimaryMethod(methodId: string): Promise<void> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('user_id')
      .eq('id', methodId)
      .single()

    if (!method) throw new Error('Method not found')

    // Remove primary flag from all other methods
    await this.supabase
      .from('mfa_methods')
      .update({ is_primary: false })
      .eq('user_id', method.user_id)

    // Set this method as primary
    await this.supabase.from('mfa_methods').update({ is_primary: true }).eq('id', methodId)
  }

  async disableMFAMethod(methodId: string): Promise<void> {
    await this.supabase.from('mfa_methods').update({ is_enabled: false }).eq('id', methodId)
  }

  async deleteMFAMethod(methodId: string): Promise<void> {
    await this.supabase.from('mfa_methods').delete().eq('id', methodId)
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    const methods = await this.getUserMFAMethods(userId)
    return methods.some(m => m.isEnabled && m.isVerified)
  }

  async isMFARequired(userId: string): Promise<boolean> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single()

    if (!profile) return false

    const policy = await this.getMFAPolicy(profile.organization_id)

    if (!policy.isRequired) return false

    if (policy.enforcementRules.requireForAdmins && ['admin', 'owner'].includes(profile.role)) {
      return true
    }

    return policy.isRequired
  }

  // Policy Management
  async getMFAPolicy(organizationId: string): Promise<MFAPolicy> {
    const { data: policy, error } = await this.supabase
      .from('mfa_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error || !policy) {
      return this.getDefaultMFAPolicy(organizationId)
    }

    return {
      organizationId: policy.organization_id,
      isRequired: policy.is_required,
      gracePeriodDays: policy.grace_period_days,
      allowedMethods: policy.allowed_methods,
      requireMultipleMethods: policy.require_multiple_methods,
      backupCodesRequired: policy.backup_codes_required,
      totpSettings: JSON.parse(policy.totp_settings),
      smsSettings: JSON.parse(policy.sms_settings),
      emailSettings: JSON.parse(policy.email_settings),
      enforcementRules: JSON.parse(policy.enforcement_rules),
    }
  }

  async updateMFAPolicy(organizationId: string, policy: Partial<MFAPolicy>): Promise<MFAPolicy> {
    const { data, error } = await this.supabase
      .from('mfa_policies')
      .upsert({
        organization_id: organizationId,
        is_required: policy.isRequired,
        grace_period_days: policy.gracePeriodDays,
        allowed_methods: policy.allowedMethods,
        require_multiple_methods: policy.requireMultipleMethods,
        backup_codes_required: policy.backupCodesRequired,
        totp_settings: policy.totpSettings ? JSON.stringify(policy.totpSettings) : undefined,
        sms_settings: policy.smsSettings ? JSON.stringify(policy.smsSettings) : undefined,
        email_settings: policy.emailSettings ? JSON.stringify(policy.emailSettings) : undefined,
        enforcement_rules: policy.enforcementRules
          ? JSON.stringify(policy.enforcementRules)
          : undefined,
      })
      .select()
      .single()

    if (error) throw error

    return this.getMFAPolicy(organizationId)
  }

  // Private helper methods
  private verifyTOTP(metadata: TOTPMetadata, token: string): boolean {
    authenticator.options = {
      algorithm: metadata.algorithm,
      digits: metadata.digits,
      period: metadata.period,
      window: 1,
    }

    return authenticator.verify({ token, secret: metadata.secret })
  }

  private async verifyTOTPChallenge(methodId: string, token: string): Promise<boolean> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (!method) return false

    const metadata = JSON.parse(method.metadata) as TOTPMetadata
    return this.verifyTOTP(metadata, token)
  }

  private async verifySMS(methodId: string, code: string): Promise<boolean> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (!method) return false

    const metadata = JSON.parse(method.metadata) as SMSMetadata
    return metadata.lastVerificationCode === code
  }

  private async verifyEmail(methodId: string, code: string): Promise<boolean> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (!method) return false

    const metadata = JSON.parse(method.metadata) as EmailMetadata
    return metadata.lastVerificationCode === code
  }

  private async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean }> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'backup_codes')
      .single()

    if (!method) return { success: false }

    const metadata = JSON.parse(method.metadata) as BackupCodesMetadata
    const targetCode = metadata.codes.find(c => c.code === code.toUpperCase() && !c.isUsed)

    if (!targetCode) return { success: false }

    // Mark code as used
    targetCode.isUsed = true
    targetCode.usedAt = new Date()
    metadata.usedCount++

    await this.supabase
      .from('mfa_methods')
      .update({
        metadata: JSON.stringify(metadata),
        last_used: new Date().toISOString(),
      })
      .eq('id', method.id)

    return { success: true }
  }

  private async sendSMSVerification(methodId: string): Promise<void> {
    // Implementation would integrate with SMS provider (Twilio, AWS SNS, etc.)
    const verificationCode = crypto.randomInt(100000, 999999).toString()

    // Update method with verification code
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (method) {
      const metadata = JSON.parse(method.metadata) as SMSMetadata
      metadata.lastVerificationCode = verificationCode
      metadata.lastVerificationSent = new Date()

      await this.supabase
        .from('mfa_methods')
        .update({ metadata: JSON.stringify(metadata) })
        .eq('id', methodId)
    }

    // In production, send actual SMS here
    console.log(`SMS verification code: ${verificationCode}`)
  }

  private async sendEmailVerification(methodId: string): Promise<void> {
    const verificationCode = crypto.randomInt(100000, 999999).toString()

    // Update method with verification code
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (method) {
      const metadata = JSON.parse(method.metadata) as EmailMetadata
      metadata.lastVerificationCode = verificationCode
      metadata.lastVerificationSent = new Date()

      await this.supabase
        .from('mfa_methods')
        .update({ metadata: JSON.stringify(metadata) })
        .eq('id', methodId)

      // Send email
      await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: [metadata.email],
        subject: 'MFA Setup Verification Code',
        html: `
          <h1>Verification Code</h1>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 5 minutes.</p>
        `,
        text: `Your verification code is: ${verificationCode}. This code will expire in 5 minutes.`,
      })
    }
  }

  private async sendSMSChallenge(methodId: string, code: string): Promise<void> {
    // Implementation would send SMS via provider
    console.log(`SMS challenge code: ${code}`)
  }

  private async sendEmailChallenge(methodId: string, code: string): Promise<void> {
    const { data: method } = await this.supabase
      .from('mfa_methods')
      .select('metadata')
      .eq('id', methodId)
      .single()

    if (method) {
      const metadata = JSON.parse(method.metadata) as EmailMetadata

      await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
        to: [metadata.email],
        subject: 'Security Verification Code',
        html: `
          <h1>Security Verification</h1>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 5 minutes.</p>
        `,
        text: `Your verification code is: ${code}. This code will expire in 5 minutes.`,
      })
    }
  }

  private isValidPhoneNumber(phoneNumber: string, countryCode: string): boolean {
    // Basic validation - in production, use a proper phone number validation library
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/
    return phoneRegex.test(phoneNumber)
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private getDefaultMFAPolicy(organizationId: string): MFAPolicy {
    return {
      organizationId,
      isRequired: false,
      gracePeriodDays: 30,
      allowedMethods: ['totp', 'sms', 'email'],
      requireMultipleMethods: false,
      backupCodesRequired: true,
      totpSettings: {
        issuerName: 'ADSapp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        window: 1,
      },
      smsSettings: {
        enabled: true,
        provider: 'twilio',
        maxAttemptsPerDay: 10,
        rateLimitMinutes: 1,
      },
      emailSettings: {
        enabled: true,
        maxAttemptsPerDay: 10,
        rateLimitMinutes: 1,
      },
      enforcementRules: {
        requireForAdmins: true,
        requireForPrivilegedActions: false,
        exemptTrustedDevices: false,
        trustedDeviceExpirationDays: 30,
      },
    }
  }

  private parseMFAMethod(data: any): MFAMethod {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      name: data.name,
      isEnabled: data.is_enabled,
      isPrimary: data.is_primary || false,
      isVerified: data.is_verified,
      metadata: JSON.parse(data.metadata),
      createdAt: new Date(data.created_at),
      lastUsed: data.last_used ? new Date(data.last_used) : undefined,
      verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
    }
  }
}

// Export singleton instance
export const mfaManager = new MFAManager()
