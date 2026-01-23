/**
 * Advanced User Invitation System
 * Multi-step invitations, role-based templates, bulk operations, and customization
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

// Types for invitation system
export interface UserInvitation {
  id: string
  organizationId: string
  email: string
  role: 'owner' | 'admin' | 'agent'
  invitedBy: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expiresAt: Date
  token: string
  templateId?: string
  customMessage?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  acceptedAt?: Date
  remindersSent: number
  lastReminderAt?: Date
}

export interface InvitationTemplate {
  id: string
  organizationId: string
  name: string
  description: string
  role: 'owner' | 'admin' | 'agent'
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
  isDefault: boolean
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface BulkInvitationRequest {
  organizationId: string
  invitations: {
    email: string
    role: 'owner' | 'admin' | 'agent'
    customMessage?: string
    metadata?: Record<string, unknown>
  }[]
  templateId?: string
  sendImmediately: boolean
  scheduledFor?: Date
}

export interface BulkInvitationResult {
  id: string
  organizationId: string
  totalInvitations: number
  successfulInvitations: number
  failedInvitations: number
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  results: {
    email: string
    success: boolean
    invitationId?: string
    error?: string
  }[]
  createdBy: string
  createdAt: Date
  completedAt?: Date
}

export interface InvitationSettings {
  organizationId: string
  defaultExpirationDays: number
  maxReminders: number
  reminderIntervalDays: number
  requireApproval: boolean
  autoReminders: boolean
  allowCustomMessages: boolean
  restrictedDomains?: string[]
  allowedDomains?: string[]
  createdAt: Date
  updatedAt: Date
}

// Advanced Invitation Manager
export class UserInvitationManager {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  private async getSupabase(): Promise<TypedSupabaseClient> {
    return await createClient() as TypedSupabaseClient
  }

  // Single invitation methods
  async createInvitation(
    organizationId: string,
    email: string,
    role: 'owner' | 'admin' | 'agent',
    invitedBy: string,
    options: {
      templateId?: string
      customMessage?: string
      expirationDays?: number
      metadata?: Record<string, unknown>
      sendImmediately?: boolean
    } = {}
  ): Promise<UserInvitation> {
    // Get organization settings
    const settings = await this.getInvitationSettings(organizationId)

    // Validate email domain if restrictions exist
    await this.validateEmailDomain(email, settings)

    // Check if user already exists
    const existingUser = await this.checkExistingUser(email, organizationId)
    if (existingUser) {
      throw new Error('User already exists in this organization')
    }

    // Check for pending invitation
    const pendingInvitation = await this.getPendingInvitation(email, organizationId)
    if (pendingInvitation) {
      throw new Error('Pending invitation already exists for this email')
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expirationDays = options.expirationDays || settings.defaultExpirationDays
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)

    // Create invitation record
    const { data: invitation, error } = await this.supabase
      .from('user_invitations')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
        template_id: options.templateId,
        custom_message: options.customMessage,
        metadata: options.metadata,
        status: settings.requireApproval ? 'pending_approval' : 'pending',
      })
      .select()
      .single()

    if (error) throw error

    const invitationObj = this.parseInvitation(invitation)

    // Send invitation email if not requiring approval and sendImmediately is true
    if (!settings.requireApproval && options.sendImmediately !== false) {
      await this.sendInvitationEmail(invitationObj)
    }

    // Log invitation activity
    await this.logInvitationActivity(invitationObj.id, 'created', invitedBy)

    return invitationObj
  }

  async acceptInvitation(
    token: string,
    userData: {
      fullName: string
      password: string
    }
  ): Promise<{
    user: Record<string, unknown>
    profile: Record<string, unknown>
    invitation: UserInvitation
  }> {
    // Validate token and get invitation
    const invitation = await this.validateInvitationToken(token)

    if (!invitation) {
      throw new Error('Invalid or expired invitation token')
    }

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: invitation.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.fullName,
        invited_by: invitation.invitedBy,
        organization_id: invitation.organizationId,
      },
    })

    if (authError) throw authError

    // Create profile
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        organization_id: invitation.organizationId,
        email: invitation.email,
        full_name: userData.fullName,
        role: invitation.role,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) throw profileError

    // Update invitation status
    await this.supabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    // Log acceptance
    await this.logInvitationActivity(invitation.id, 'accepted', authData.user.id)

    // Send welcome email
    await this.sendWelcomeEmail(authData.user, profile)

    return {
      user: authData.user,
      profile,
      invitation: { ...invitation, status: 'accepted', acceptedAt: new Date() },
    }
  }

  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('status', 'pending')

    if (error) throw error

    await this.logInvitationActivity(invitationId, 'cancelled', cancelledBy)
  }

  async resendInvitation(invitationId: string, resentBy: string): Promise<void> {
    const { data: invitation, error } = await this.supabase
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      throw new Error('Invitation not found or not in pending status')
    }

    const invitationObj = this.parseInvitation(invitation)

    // Check if invitation has expired
    if (new Date() > invitationObj.expiresAt) {
      throw new Error('Cannot resend expired invitation')
    }

    // Check reminder limits
    const settings = await this.getInvitationSettings(invitationObj.organizationId)
    if (invitationObj.remindersSent >= settings.maxReminders) {
      throw new Error('Maximum reminders reached for this invitation')
    }

    // Send email
    await this.sendInvitationEmail(invitationObj, true)

    // Update reminder count
    await this.supabase
      .from('user_invitations')
      .update({
        reminders_sent: invitationObj.remindersSent + 1,
        last_reminder_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    await this.logInvitationActivity(invitationId, 'reminder_sent', resentBy)
  }

  // Bulk invitation methods
  async createBulkInvitations(request: BulkInvitationRequest): Promise<BulkInvitationResult> {
    const bulkId = crypto.randomUUID()
    const results: BulkInvitationResult['results'] = []

    // Create bulk operation record
    await this.supabase.from('bulk_invitation_operations').insert({
      id: bulkId,
      organization_id: request.organizationId,
      total_invitations: request.invitations.length,
      status: 'processing',
      created_by: request.organizationId, // This should come from the requesting user
    })

    let successCount = 0
    let failCount = 0

    // Process each invitation
    for (const invitationData of request.invitations) {
      try {
        const invitation = await this.createInvitation(
          request.organizationId,
          invitationData.email,
          invitationData.role,
          request.organizationId, // Should be the requesting user ID
          {
            templateId: request.templateId,
            customMessage: invitationData.customMessage,
            metadata: invitationData.metadata,
            sendImmediately: request.sendImmediately,
          }
        )

        results.push({
          email: invitationData.email,
          success: true,
          invitationId: invitation.id,
        })
        successCount++
      } catch (error) {
        results.push({
          email: invitationData.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failCount++
      }
    }

    // Update bulk operation status
    const bulkResult: BulkInvitationResult = {
      id: bulkId,
      organizationId: request.organizationId,
      totalInvitations: request.invitations.length,
      successfulInvitations: successCount,
      failedInvitations: failCount,
      status: failCount === 0 ? 'completed' : 'completed',
      results,
      createdBy: request.organizationId,
      createdAt: new Date(),
      completedAt: new Date(),
    }

    await this.supabase
      .from('bulk_invitation_operations')
      .update({
        successful_invitations: successCount,
        failed_invitations: failCount,
        status: bulkResult.status,
        results: JSON.stringify(results),
        completed_at: new Date().toISOString(),
      })
      .eq('id', bulkId)

    return bulkResult
  }

  async getBulkInvitationStatus(bulkId: string): Promise<BulkInvitationResult | null> {
    const { data, error } = await this.supabase
      .from('bulk_invitation_operations')
      .select('*')
      .eq('id', bulkId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      organizationId: data.organization_id,
      totalInvitations: data.total_invitations,
      successfulInvitations: data.successful_invitations || 0,
      failedInvitations: data.failed_invitations || 0,
      status: data.status,
      results: data.results ? JSON.parse(data.results) : [],
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    }
  }

  // Template management
  async createInvitationTemplate(
    template: Omit<InvitationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvitationTemplate> {
    const { data, error } = await this.supabase
      .from('invitation_templates')
      .insert({
        organization_id: template.organizationId,
        name: template.name,
        description: template.description,
        role: template.role,
        subject: template.subject,
        html_content: template.htmlContent,
        text_content: template.textContent,
        variables: template.variables,
        is_default: template.isDefault,
        is_active: template.isActive,
        created_by: template.createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return this.parseTemplate(data)
  }

  async getInvitationTemplates(
    organizationId: string,
    role?: string
  ): Promise<InvitationTemplate[]> {
    let query = this.supabase
      .from('invitation_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query.order('name')

    if (error) return []
    return data.map(this.parseTemplate)
  }

  async updateInvitationTemplate(
    templateId: string,
    updates: Partial<InvitationTemplate>
  ): Promise<InvitationTemplate> {
    const { data, error } = await this.supabase
      .from('invitation_templates')
      .update({
        ...updates,
        html_content: updates.htmlContent,
        text_content: updates.textContent,
        is_default: updates.isDefault,
        is_active: updates.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return this.parseTemplate(data)
  }

  // Settings management
  async getInvitationSettings(organizationId: string): Promise<InvitationSettings> {
    const { data, error } = await this.supabase
      .from('invitation_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      // Return default settings
      return {
        organizationId,
        defaultExpirationDays: 7,
        maxReminders: 3,
        reminderIntervalDays: 2,
        requireApproval: false,
        autoReminders: true,
        allowCustomMessages: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return {
      organizationId: data.organization_id,
      defaultExpirationDays: data.default_expiration_days,
      maxReminders: data.max_reminders,
      reminderIntervalDays: data.reminder_interval_days,
      requireApproval: data.require_approval,
      autoReminders: data.auto_reminders,
      allowCustomMessages: data.allow_custom_messages,
      restrictedDomains: data.restricted_domains,
      allowedDomains: data.allowed_domains,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  async updateInvitationSettings(
    organizationId: string,
    settings: Partial<InvitationSettings>
  ): Promise<InvitationSettings> {
    const { data, error } = await this.supabase
      .from('invitation_settings')
      .upsert({
        organization_id: organizationId,
        default_expiration_days: settings.defaultExpirationDays,
        max_reminders: settings.maxReminders,
        reminder_interval_days: settings.reminderIntervalDays,
        require_approval: settings.requireApproval,
        auto_reminders: settings.autoReminders,
        allow_custom_messages: settings.allowCustomMessages,
        restricted_domains: settings.restrictedDomains,
        allowed_domains: settings.allowedDomains,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return {
      organizationId: data.organization_id,
      defaultExpirationDays: data.default_expiration_days,
      maxReminders: data.max_reminders,
      reminderIntervalDays: data.reminder_interval_days,
      requireApproval: data.require_approval,
      autoReminders: data.auto_reminders,
      allowCustomMessages: data.allow_custom_messages,
      restrictedDomains: data.restricted_domains,
      allowedDomains: data.allowed_domains,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  // Query methods
  async getInvitations(
    organizationId: string,
    filters: {
      status?: string
      role?: string
      email?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ invitations: UserInvitation[]; total: number }> {
    let query = this.supabase
      .from('user_invitations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.role) {
      query = query.eq('role', filters.role)
    }
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      invitations: (data || []).map(this.parseInvitation),
      total: count || 0,
    }
  }

  async getInvitationById(invitationId: string): Promise<UserInvitation | null> {
    const { data, error } = await this.supabase
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (error || !data) return null
    return this.parseInvitation(data)
  }

  // Automation methods
  async processExpiredInvitations(): Promise<number> {
    const { data: expiredInvitations, error } = await this.supabase
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) throw error
    return expiredInvitations?.length || 0
  }

  async sendScheduledReminders(): Promise<number> {
    const { data: invitations, error } = await this.supabase
      .from('user_invitations')
      .select(
        `
        *,
        invitation_settings!inner(auto_reminders, reminder_interval_days, max_reminders)
      `
      )
      .eq('status', 'pending')
      .eq('invitation_settings.auto_reminders', true)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // At least 1 day old

    if (error || !invitations) return 0

    let remindersSent = 0

    for (const invitationData of invitations) {
      const invitation = this.parseInvitation(invitationData)
      const settings = invitationData.invitation_settings as {
        auto_reminders: boolean
        reminder_interval_days: number
        max_reminders: number
      }

      // Check if reminder is due
      const lastReminderDate = invitation.lastReminderAt || invitation.createdAt
      const daysSinceLastReminder = Math.floor(
        (Date.now() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (
        daysSinceLastReminder >= settings.reminder_interval_days &&
        invitation.remindersSent < settings.max_reminders
      ) {
        try {
          await this.sendInvitationEmail(invitation, true)

          await this.supabase
            .from('user_invitations')
            .update({
              reminders_sent: invitation.remindersSent + 1,
              last_reminder_at: new Date().toISOString(),
            })
            .eq('id', invitation.id)

          remindersSent++
        } catch (error) {
          console.error(`Failed to send reminder for invitation ${invitation.id}:`, error)
        }
      }
    }

    return remindersSent
  }

  // Private helper methods
  private async validateEmailDomain(email: string, settings: InvitationSettings): Promise<void> {
    const domain = email.split('@')[1]?.toLowerCase()

    if (settings.allowedDomains && settings.allowedDomains.length > 0) {
      if (!settings.allowedDomains.includes(domain)) {
        throw new Error(`Email domain ${domain} is not allowed`)
      }
    }

    if (settings.restrictedDomains && settings.restrictedDomains.includes(domain)) {
      throw new Error(`Email domain ${domain} is restricted`)
    }
  }

  private async checkExistingUser(email: string, organizationId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organizationId)
      .single()

    return !!data
  }

  private async getPendingInvitation(
    email: string,
    organizationId: string
  ): Promise<UserInvitation | null> {
    const { data } = await this.supabase
      .from('user_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .single()

    return data ? this.parseInvitation(data) : null
  }

  private async validateInvitationToken(token: string): Promise<UserInvitation | null> {
    const { data, error } = await this.supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null
    return this.parseInvitation(data)
  }

  private async sendInvitationEmail(
    invitation: UserInvitation,
    isReminder: boolean = false
  ): Promise<void> {
    let template: InvitationTemplate | null = null

    if (invitation.templateId) {
      template = await this.getTemplateById(invitation.templateId)
    }

    if (!template) {
      // Use default template
      const templates = await this.getInvitationTemplates(
        invitation.organizationId,
        invitation.role
      )
      template = templates.find(t => t.isDefault) || templates[0]
    }

    const subject = isReminder
      ? `Reminder: ${template?.subject || "You've been invited to join our team"}`
      : template?.subject || "You've been invited to join our team"

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`

    await this.resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: [invitation.email],
      subject,
      html: this.renderEmailTemplate(template, invitation, inviteUrl, isReminder),
      text: this.renderTextTemplate(template, invitation, inviteUrl, isReminder),
    })
  }

  private async sendWelcomeEmail(
    user: Record<string, unknown>,
    profile: Record<string, unknown>
  ): Promise<void> {
    const organizationName =
      (profile.organization as { name?: string } | null)?.name || 'our platform'
    const subject = `Welcome to ${organizationName}!`
    const userEmail = user.email as string
    const profileName = profile.full_name as string

    await this.resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: [userEmail],
      subject,
      html: `
        <h1>Welcome ${profileName}!</h1>
        <p>Your account has been successfully created. You can now access the platform.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard</a>
      `,
      text: `Welcome ${profileName}! Your account has been successfully created. Visit ${process.env.NEXT_PUBLIC_APP_URL}/dashboard to get started.`,
    })
  }

  private renderEmailTemplate(
    template: InvitationTemplate | null,
    invitation: UserInvitation,
    inviteUrl: string,
    isReminder: boolean
  ): string {
    const defaultHtml = `
      <h1>${isReminder ? 'Reminder: ' : ''}You've been invited!</h1>
      <p>You've been invited to join as a ${invitation.role}.</p>
      ${invitation.customMessage ? `<p><strong>Personal message:</strong> ${invitation.customMessage}</p>` : ''}
      <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      <p>This invitation expires on ${invitation.expiresAt.toLocaleDateString()}.</p>
    `

    if (!template) return defaultHtml

    return template.htmlContent
      .replace(/{{email}}/g, invitation.email)
      .replace(/{{role}}/g, invitation.role)
      .replace(/{{inviteUrl}}/g, inviteUrl)
      .replace(/{{customMessage}}/g, invitation.customMessage || '')
      .replace(/{{expiresAt}}/g, invitation.expiresAt.toLocaleDateString())
      .replace(/{{isReminder}}/g, isReminder.toString())
  }

  private renderTextTemplate(
    template: InvitationTemplate | null,
    invitation: UserInvitation,
    inviteUrl: string,
    isReminder: boolean
  ): string {
    const defaultText = `
      ${isReminder ? 'Reminder: ' : ''}You've been invited!

      You've been invited to join as a ${invitation.role}.
      ${invitation.customMessage ? `\nPersonal message: ${invitation.customMessage}` : ''}

      Accept your invitation: ${inviteUrl}

      This invitation expires on ${invitation.expiresAt.toLocaleDateString()}.
    `

    if (!template) return defaultText

    return template.textContent
      .replace(/{{email}}/g, invitation.email)
      .replace(/{{role}}/g, invitation.role)
      .replace(/{{inviteUrl}}/g, inviteUrl)
      .replace(/{{customMessage}}/g, invitation.customMessage || '')
      .replace(/{{expiresAt}}/g, invitation.expiresAt.toLocaleDateString())
      .replace(/{{isReminder}}/g, isReminder.toString())
  }

  private async getTemplateById(templateId: string): Promise<InvitationTemplate | null> {
    const { data, error } = await this.supabase
      .from('invitation_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error || !data) return null
    return this.parseTemplate(data)
  }

  private async logInvitationActivity(
    invitationId: string,
    activity: string,
    performedBy: string
  ): Promise<void> {
    await this.supabase.from('invitation_activity_logs').insert({
      invitation_id: invitationId,
      activity,
      performed_by: performedBy,
      performed_at: new Date().toISOString(),
    })
  }

  private parseInvitation(data: Record<string, unknown>): UserInvitation {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      email: data.email as string,
      role: data.role as 'owner' | 'admin' | 'agent',
      invitedBy: data.invited_by as string,
      status: data.status as 'pending' | 'accepted' | 'expired' | 'cancelled',
      expiresAt: new Date(data.expires_at as string),
      token: data.token as string,
      templateId: data.template_id as string | undefined,
      customMessage: data.custom_message as string | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      acceptedAt: data.accepted_at ? new Date(data.accepted_at as string) : undefined,
      remindersSent: (data.reminders_sent as number) || 0,
      lastReminderAt: data.last_reminder_at ? new Date(data.last_reminder_at as string) : undefined,
    }
  }

  private parseTemplate(data: Record<string, unknown>): InvitationTemplate {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      name: data.name as string,
      description: data.description as string,
      role: data.role as 'owner' | 'admin' | 'agent',
      subject: data.subject as string,
      htmlContent: data.html_content as string,
      textContent: data.text_content as string,
      variables: (data.variables as string[]) || [],
      isDefault: data.is_default as boolean,
      isActive: data.is_active as boolean,
      createdBy: data.created_by as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }
}

// Export singleton instance
export const userInvitationManager = new UserInvitationManager()
