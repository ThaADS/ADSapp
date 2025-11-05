// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 * Configurable password complexity, history, rotation, and security policies
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientClient } from '@/lib/supabase/client'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Types for password policies
export interface PasswordPolicy {
  id: string
  organizationId: string
  name: string
  isActive: boolean
  rules: PasswordRules
  enforcement: PasswordEnforcement
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface PasswordRules {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  specialCharsSet: string
  preventCommonPasswords: boolean
  preventUserInfoInPassword: boolean
  preventKeyboardPatterns: boolean
  preventRepeatingChars: boolean
  maxRepeatingChars: number
  preventSequentialChars: boolean
  customDictionary: string[]
  entropyMinimum: number
}

export interface PasswordEnforcement {
  enforceOnLogin: boolean
  enforceOnRegistration: boolean
  enforceOnPasswordChange: boolean
  lockoutOnFailures: boolean
  maxFailureAttempts: number
  lockoutDurationMinutes: number
  warnBeforeExpiration: boolean
  warningDays: number
  forceChangeOnFirstLogin: boolean
  preventReuse: boolean
  passwordHistoryCount: number
  maxPasswordAge: number // days
  minPasswordAge: number // hours
  requireBreachCheck: boolean
  allowTemporaryPasswords: boolean
  temporaryPasswordExpiration: number // hours
}

export interface PasswordValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: string[]
  warnings: string[]
  suggestions: string[]
  entropy: number
  estimatedCrackTime: string
  strengthLevel: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
}

export interface PasswordHistory {
  id: string
  userId: string
  passwordHash: string
  createdAt: Date
}

export interface AccountLockout {
  id: string
  userId: string
  organizationId: string
  reason: 'password_failures' | 'security_violation' | 'manual'
  attemptCount: number
  lockedAt: Date
  lockedUntil: Date
  lockedBy?: string
  unlocked: boolean
  unlockedAt?: Date
  unlockedBy?: string
}

export interface BreachedPassword {
  passwordHash: string
  breachCount: number
  lastSeen: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Password Policy Manager
export class PasswordPolicyManager {
  private supabase: any
  private commonPasswords: Set<string>
  private keyboardPatterns: string[]

  constructor() {
    this.supabase = createClient()
    this.commonPasswords = new Set([
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
      'qwerty123', 'welcome123', 'admin123', 'root', 'toor', 'pass'
    ])
    this.keyboardPatterns = [
      'qwerty', 'asdf', 'zxcv', '1234', 'abcd', 'qwertyuiop',
      'asdfghjkl', 'zxcvbnm', '123456789', 'abcdefg'
    ]
  }

  // Policy Management
  async createPasswordPolicy(policy: Omit<PasswordPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordPolicy> {
    const { data, error } = await this.supabase
      .from('password_policies')
      .insert({
        organization_id: policy.organizationId,
        name: policy.name,
        is_active: policy.isActive,
        rules: JSON.stringify(policy.rules),
        enforcement: JSON.stringify(policy.enforcement),
        created_by: policy.createdBy
      })
      .select()
      .single()

    if (error) throw error
    return this.parsePolicy(data)
  }

  async getPasswordPolicy(organizationId: string): Promise<PasswordPolicy | null> {
    const { data, error } = await this.supabase
      .from('password_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error || !data) return this.getDefaultPolicy(organizationId)
    return this.parsePolicy(data)
  }

  async updatePasswordPolicy(policyId: string, updates: Partial<PasswordPolicy>): Promise<PasswordPolicy> {
    const { data, error } = await this.supabase
      .from('password_policies')
      .update({
        name: updates.name,
        is_active: updates.isActive,
        rules: updates.rules ? JSON.stringify(updates.rules) : undefined,
        enforcement: updates.enforcement ? JSON.stringify(updates.enforcement) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error
    return this.parsePolicy(data)
  }

  // Password Validation
  async validatePassword(
    password: string,
    organizationId: string,
    userId?: string,
    userInfo?: { email: string; fullName: string }
  ): Promise<PasswordValidationResult> {
    const policy = await this.getPasswordPolicy(organizationId)
    const rules = policy.rules
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Basic length checks
    if (password.length < rules.minLength) {
      errors.push(`Password must be at least ${rules.minLength} characters long`)
    }
    if (password.length > rules.maxLength) {
      errors.push(`Password must not exceed ${rules.maxLength} characters`)
    }

    // Character requirements
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
      suggestions.push('Add an uppercase letter (A-Z)')
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
      suggestions.push('Add a lowercase letter (a-z)')
    }

    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
      suggestions.push('Add a number (0-9)')
    }

    if (rules.requireSpecialChars) {
      const specialChars = rules.specialCharsSet || '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hasSpecialChar = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)
      if (!hasSpecialChar) {
        errors.push('Password must contain at least one special character')
        suggestions.push(`Add a special character (${specialChars})`)
      }
    }

    // Common password check
    if (rules.preventCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Password is too common and easily guessable')
      suggestions.push('Choose a more unique password')
    }

    // User info in password check
    if (rules.preventUserInfoInPassword && userInfo) {
      if (this.containsUserInfo(password, userInfo)) {
        errors.push('Password cannot contain your personal information')
        suggestions.push('Avoid using your name or email in the password')
      }
    }

    // Keyboard pattern check
    if (rules.preventKeyboardPatterns && this.hasKeyboardPattern(password)) {
      errors.push('Password contains keyboard patterns that are easy to guess')
      suggestions.push('Avoid sequential keys like "qwerty" or "123456"')
    }

    // Repeating characters check
    if (rules.preventRepeatingChars) {
      const maxRepeating = this.getMaxRepeatingChars(password)
      if (maxRepeating > rules.maxRepeatingChars) {
        errors.push(`Password cannot have more than ${rules.maxRepeatingChars} repeating characters`)
        suggestions.push('Reduce repeating characters')
      }
    }

    // Sequential characters check
    if (rules.preventSequentialChars && this.hasSequentialChars(password)) {
      errors.push('Password contains sequential characters that are predictable')
      suggestions.push('Avoid sequences like "abc" or "123"')
    }

    // Custom dictionary check
    if (rules.customDictionary.length > 0 && this.containsDictionaryWord(password, rules.customDictionary)) {
      errors.push('Password contains restricted words')
      suggestions.push('Avoid using restricted words or terms')
    }

    // Entropy check
    const entropy = this.calculateEntropy(password)
    if (entropy < rules.entropyMinimum) {
      warnings.push(`Password entropy is ${entropy.toFixed(1)} bits, recommended minimum is ${rules.entropyMinimum} bits`)
      suggestions.push('Use a longer password with more character variety')
    }

    // Breach check
    if (policy.enforcement.requireBreachCheck && await this.isBreachedPassword(password)) {
      errors.push('This password has been found in data breaches and should not be used')
      suggestions.push('Choose a completely different password')
    }

    // Password history check
    if (userId && policy.enforcement.preventReuse) {
      const isReused = await this.isPasswordReused(userId, password, policy.enforcement.passwordHistoryCount)
      if (isReused) {
        errors.push(`Cannot reuse any of your last ${policy.enforcement.passwordHistoryCount} passwords`)
        suggestions.push('Choose a password you have not used recently')
      }
    }

    // Calculate strength score
    const score = this.calculatePasswordScore(password, rules)
    const strengthLevel = this.getStrengthLevel(score)
    const estimatedCrackTime = this.estimateCrackTime(password, entropy)

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions,
      entropy,
      estimatedCrackTime,
      strengthLevel
    }
  }

  // Password History Management
  async savePasswordHistory(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12)

    await this.supabase
      .from('password_history')
      .insert({
        user_id: userId,
        password_hash: passwordHash
      })

    // Clean up old history based on policy
    const policy = await this.getUserPasswordPolicy(userId)
    if (policy?.enforcement.passwordHistoryCount) {
      await this.cleanupPasswordHistory(userId, policy.enforcement.passwordHistoryCount)
    }
  }

  private async cleanupPasswordHistory(userId: string, keepCount: number): Promise<void> {
    const { data: history } = await this.supabase
      .from('password_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(keepCount, 1000)

    if (history && history.length > 0) {
      const idsToDelete = history.map(h => h.id)
      await this.supabase
        .from('password_history')
        .delete()
        .in('id', idsToDelete)
    }
  }

  private async isPasswordReused(userId: string, password: string, historyCount: number): Promise<boolean> {
    const { data: history } = await this.supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(historyCount)

    if (!history) return false

    for (const record of history) {
      if (await bcrypt.compare(password, record.password_hash)) {
        return true
      }
    }

    return false
  }

  // Account Lockout Management
  async recordPasswordFailure(userId: string, organizationId: string): Promise<AccountLockout | null> {
    const policy = await this.getPasswordPolicy(organizationId)

    if (!policy.enforcement.lockoutOnFailures) {
      return null
    }

    // Get current failure count
    const { data: existing } = await this.supabase
      .from('login_attempts')
      .select('failure_count, last_attempt')
      .eq('user_id', userId)
      .single()

    const failureCount = (existing?.failure_count || 0) + 1

    // Update failure count
    await this.supabase
      .from('login_attempts')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        failure_count: failureCount,
        last_attempt: new Date().toISOString()
      })

    // Check if lockout threshold reached
    if (failureCount >= policy.enforcement.maxFailureAttempts) {
      return this.lockoutAccount(userId, organizationId, 'password_failures', failureCount)
    }

    return null
  }

  async lockoutAccount(
    userId: string,
    organizationId: string,
    reason: AccountLockout['reason'],
    attemptCount: number,
    lockedBy?: string
  ): Promise<AccountLockout> {
    const policy = await this.getPasswordPolicy(organizationId)
    const lockedUntil = new Date(Date.now() + policy.enforcement.lockoutDurationMinutes * 60 * 1000)

    const { data: lockout, error } = await this.supabase
      .from('account_lockouts')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        reason,
        attempt_count: attemptCount,
        locked_until: lockedUntil.toISOString(),
        locked_by: lockedBy
      })
      .select()
      .single()

    if (error) throw error

    // Deactivate user profile temporarily
    await this.supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    return {
      id: lockout.id,
      userId: lockout.user_id,
      organizationId: lockout.organization_id,
      reason: lockout.reason,
      attemptCount: lockout.attempt_count,
      lockedAt: new Date(lockout.locked_at),
      lockedUntil: new Date(lockout.locked_until),
      lockedBy: lockout.locked_by,
      unlocked: false
    }
  }

  async unlockAccount(lockoutId: string, unlockedBy: string): Promise<void> {
    const { data: lockout } = await this.supabase
      .from('account_lockouts')
      .select('user_id')
      .eq('id', lockoutId)
      .single()

    if (!lockout) throw new Error('Lockout not found')

    // Update lockout record
    await this.supabase
      .from('account_lockouts')
      .update({
        unlocked: true,
        unlocked_at: new Date().toISOString(),
        unlocked_by: unlockedBy
      })
      .eq('id', lockoutId)

    // Reactivate user profile
    await this.supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', lockout.user_id)

    // Reset failure count
    await this.supabase
      .from('login_attempts')
      .update({ failure_count: 0 })
      .eq('user_id', lockout.user_id)
  }

  async isAccountLocked(userId: string): Promise<AccountLockout | null> {
    const { data: lockout } = await this.supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .eq('unlocked', false)
      .gt('locked_until', new Date().toISOString())
      .single()

    if (!lockout) return null

    return {
      id: lockout.id,
      userId: lockout.user_id,
      organizationId: lockout.organization_id,
      reason: lockout.reason,
      attemptCount: lockout.attempt_count,
      lockedAt: new Date(lockout.locked_at),
      lockedUntil: new Date(lockout.locked_until),
      lockedBy: lockout.locked_by,
      unlocked: lockout.unlocked,
      unlockedAt: lockout.unlocked_at ? new Date(lockout.unlocked_at) : undefined,
      unlockedBy: lockout.unlocked_by
    }
  }

  // Breach Detection
  private async isBreachedPassword(password: string): Promise<boolean> {
    // In production, this would check against a breach database like HaveIBeenPwned
    // For now, we'll check against a local cache or make an API call
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)

    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
      if (response.ok) {
        const text = await response.text()
        return text.includes(suffix)
      }
    } catch (error) {
      // If API is unavailable, don't block the user
      console.error('Breach check failed:', error)
    }

    return false
  }

  // Password Strength Calculation
  private calculatePasswordScore(password: string, rules: PasswordRules): number {
    let score = 0

    // Length score (0-30 points)
    const lengthRatio = Math.min(password.length / 12, 1)
    score += lengthRatio * 30

    // Character variety (0-40 points)
    let charTypes = 0
    if (/[a-z]/.test(password)) charTypes++
    if (/[A-Z]/.test(password)) charTypes++
    if (/\d/.test(password)) charTypes++
    if (/[^a-zA-Z0-9]/.test(password)) charTypes++
    score += (charTypes / 4) * 40

    // Entropy bonus (0-20 points)
    const entropy = this.calculateEntropy(password)
    const entropyRatio = Math.min(entropy / 60, 1)
    score += entropyRatio * 20

    // Pattern penalties
    if (this.isCommonPassword(password)) score -= 30
    if (this.hasKeyboardPattern(password)) score -= 20
    if (this.hasSequentialChars(password)) score -= 15
    if (this.getMaxRepeatingChars(password) > 2) score -= 10

    // Bonus for meeting all requirements (0-10 points)
    const meetsAllReqs = this.meetsAllRequirements(password, rules)
    if (meetsAllReqs) score += 10

    return Math.max(0, Math.min(100, score))
  }

  private calculateEntropy(password: string): number {
    let charsetSize = 0

    if (/[a-z]/.test(password)) charsetSize += 26
    if (/[A-Z]/.test(password)) charsetSize += 26
    if (/\d/.test(password)) charsetSize += 10
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32

    return password.length * Math.log2(charsetSize)
  }

  private getStrengthLevel(score: number): PasswordValidationResult['strengthLevel'] {
    if (score >= 90) return 'very-strong'
    if (score >= 75) return 'strong'
    if (score >= 60) return 'good'
    if (score >= 40) return 'fair'
    if (score >= 20) return 'weak'
    return 'very-weak'
  }

  private estimateCrackTime(password: string, entropy: number): string {
    const attemptsPerSecond = 1000000000 // 1 billion attempts per second
    const secondsTocrack = Math.pow(2, entropy - 1) / attemptsPerSecond

    if (secondsTocrack < 60) return 'Less than 1 minute'
    if (secondsTocrack < 3600) return `${Math.floor(secondsTocrack / 60)} minutes`
    if (secondsTocrack < 86400) return `${Math.floor(secondsTocrack / 3600)} hours`
    if (secondsTocrack < 31536000) return `${Math.floor(secondsTocrack / 86400)} days`
    if (secondsTocrack < 31536000000) return `${Math.floor(secondsTocrack / 31536000)} years`
    return 'Centuries'
  }

  // Helper methods for validation
  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase())
  }

  private containsUserInfo(password: string, userInfo: { email: string; fullName: string }): boolean {
    const lowerPassword = password.toLowerCase()
    const emailParts = userInfo.email.toLowerCase().split('@')[0].split('.')
    const nameParts = userInfo.fullName.toLowerCase().split(' ')

    for (const part of [...emailParts, ...nameParts]) {
      if (part.length >= 3 && lowerPassword.includes(part)) {
        return true
      }
    }

    return false
  }

  private hasKeyboardPattern(password: string): boolean {
    const lowerPassword = password.toLowerCase()
    return this.keyboardPatterns.some(pattern => lowerPassword.includes(pattern))
  }

  private getMaxRepeatingChars(password: string): number {
    let maxRepeat = 1
    let currentRepeat = 1

    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        currentRepeat++
        maxRepeat = Math.max(maxRepeat, currentRepeat)
      } else {
        currentRepeat = 1
      }
    }

    return maxRepeat
  }

  private hasSequentialChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i)
      const char2 = password.charCodeAt(i + 1)
      const char3 = password.charCodeAt(i + 2)

      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true
      }
    }

    return false
  }

  private containsDictionaryWord(password: string, dictionary: string[]): boolean {
    const lowerPassword = password.toLowerCase()
    return dictionary.some(word => lowerPassword.includes(word.toLowerCase()))
  }

  private meetsAllRequirements(password: string, rules: PasswordRules): boolean {
    if (password.length < rules.minLength || password.length > rules.maxLength) return false
    if (rules.requireUppercase && !/[A-Z]/.test(password)) return false
    if (rules.requireLowercase && !/[a-z]/.test(password)) return false
    if (rules.requireNumbers && !/\d/.test(password)) return false
    if (rules.requireSpecialChars) {
      const specialChars = rules.specialCharsSet || '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hasSpecialChar = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)
      if (!hasSpecialChar) return false
    }
    return true
  }

  private async getUserPasswordPolicy(userId: string): Promise<PasswordPolicy | null> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (!profile) return null
    return this.getPasswordPolicy(profile.organization_id)
  }

  private getDefaultPolicy(organizationId: string): PasswordPolicy {
    return {
      id: 'default',
      organizationId,
      name: 'Default Policy',
      isActive: true,
      rules: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialCharsSet: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        preventCommonPasswords: true,
        preventUserInfoInPassword: true,
        preventKeyboardPatterns: true,
        preventRepeatingChars: true,
        maxRepeatingChars: 3,
        preventSequentialChars: true,
        customDictionary: [],
        entropyMinimum: 50
      },
      enforcement: {
        enforceOnLogin: true,
        enforceOnRegistration: true,
        enforceOnPasswordChange: true,
        lockoutOnFailures: true,
        maxFailureAttempts: 5,
        lockoutDurationMinutes: 30,
        warnBeforeExpiration: true,
        warningDays: 7,
        forceChangeOnFirstLogin: false,
        preventReuse: true,
        passwordHistoryCount: 12,
        maxPasswordAge: 90,
        minPasswordAge: 24,
        requireBreachCheck: true,
        allowTemporaryPasswords: true,
        temporaryPasswordExpiration: 24
      },
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private parsePolicy(data: any): PasswordPolicy {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      isActive: data.is_active,
      rules: JSON.parse(data.rules),
      enforcement: JSON.parse(data.enforcement),
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

// Export singleton instance
export const passwordPolicyManager = new PasswordPolicyManager()