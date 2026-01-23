/**
 * Drip Campaign Engine
 * Manages automated message sequences triggered by events or manual enrollment
 *
 * Features:
 * - Multi-step campaigns with configurable delays
 * - Trigger-based enrollment (tags, events, API)
 * - Stop-on-reply logic
 * - Business hours respect
 * - Comprehensive analytics
 */

import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from './client'
import { WhatsAppTemplateManager } from './templates'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import crypto from 'crypto'
import { decryptWhatsAppCredentials } from '@/lib/security/credential-manager'

type TypedSupabaseClient = SupabaseClient<Database>

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DripCampaign {
  id: string
  organizationId: string
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  status: CampaignStatus
  isActive: boolean
  settings: CampaignSettings
  statistics: CampaignStatistics
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type TriggerType = 'manual' | 'contact_created' | 'tag_added' | 'custom_event' | 'api'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived'

export interface TriggerConfig {
  tags?: string[] // For tag_added trigger
  events?: string[] // For custom_event trigger
  conditions?: Array<{
    field: string
    operator: string
    value: any
  }>
}

export interface CampaignSettings {
  stopOnReply: boolean
  respectBusinessHours: boolean
  maxContactsPerDay: number
}

export interface CampaignStatistics {
  totalEnrolled: number
  activeContacts: number
  completedContacts: number
  droppedContacts: number
  totalMessagesSent: number
  averageCompletionRate: number
}

export interface DripStep {
  id: string
  campaignId: string
  stepOrder: number
  name: string
  delayType: DelayType
  delayValue: number
  messageType: MessageType
  templateId?: string
  messageContent?: string
  mediaUrl?: string
  templateVariables?: Record<string, string>
  conditions?: StepCondition[]
  settings: StepSettings
  createdAt: Date
  updatedAt: Date
}

export type DelayType = 'minutes' | 'hours' | 'days' | 'weeks'
export type MessageType = 'text' | 'template' | 'media'

export interface StepCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface StepSettings {
  sendOnlyDuringBusinessHours: boolean
  skipWeekends: boolean
}

export interface DripEnrollment {
  id: string
  campaignId: string
  contactId: string
  status: EnrollmentStatus
  currentStepId?: string
  currentStepOrder?: number
  enrolledAt: Date
  nextMessageAt?: Date
  completedAt?: Date
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  replied: boolean
  enrolledBy?: string
  droppedReason?: string
  createdAt: Date
  updatedAt: Date
}

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'dropped' | 'opted_out'

export interface DripMessageLog {
  id: string
  enrollmentId: string
  stepId: string
  contactId: string
  whatsappMessageId?: string
  status: MessageStatus
  scheduledAt: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'

// ============================================================================
// DRIP CAMPAIGN ENGINE
// ============================================================================

export class DripCampaignEngine {
  private supabase: TypedSupabaseClient
  private templateManager: WhatsAppTemplateManager

  constructor(supabase?: TypedSupabaseClient) {
    this.supabase = (supabase || createClient()) as TypedSupabaseClient
    this.templateManager = new WhatsAppTemplateManager()
  }

  // ========================================================================
  // CAMPAIGN MANAGEMENT
  // ========================================================================

  /**
   * Create a new drip campaign
   */
  async createCampaign(
    organizationId: string,
    campaign: Omit<
      DripCampaign,
      'id' | 'createdAt' | 'updatedAt' | 'statistics' | 'status' | 'isActive'
    >
  ): Promise<DripCampaign> {
    try {
      const campaignData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: campaign.name,
        description: campaign.description,
        trigger_type: campaign.triggerType,
        trigger_config: campaign.triggerConfig,
        status: 'draft' as CampaignStatus,
        is_active: false,
        settings: campaign.settings,
        statistics: {
          totalEnrolled: 0,
          activeContacts: 0,
          completedContacts: 0,
          droppedContacts: 0,
          totalMessagesSent: 0,
          averageCompletionRate: 0,
        },
        created_by: campaign.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await this.supabase
        .from('drip_campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (error) throw new Error(`Failed to create campaign: ${error.message}`)

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to create drip campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Add a step to a drip campaign
   */
  async addStep(
    campaignId: string,
    step: Omit<DripStep, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>
  ): Promise<DripStep> {
    try {
      const stepData = {
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        step_order: step.stepOrder,
        name: step.name,
        delay_type: step.delayType,
        delay_value: step.delayValue,
        message_type: step.messageType,
        template_id: step.templateId,
        message_content: step.messageContent,
        media_url: step.mediaUrl,
        template_variables: step.templateVariables,
        conditions: step.conditions,
        settings: step.settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await this.supabase
        .from('drip_campaign_steps')
        .insert(stepData)
        .select()
        .single()

      if (error) throw new Error(`Failed to add step: ${error.message}`)

      return this.mapToStep(data)
    } catch (error) {
      throw new Error(
        `Failed to add campaign step: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get campaign by ID with all steps
   */
  async getCampaign(campaignId: string): Promise<DripCampaign & { steps: DripStep[] }> {
    try {
      const { data: campaignData, error: campaignError } = await this.supabase
        .from('drip_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw new Error(`Failed to get campaign: ${campaignError.message}`)

      const { data: stepsData, error: stepsError } = await this.supabase
        .from('drip_campaign_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_order', { ascending: true })

      if (stepsError) throw new Error(`Failed to get steps: ${stepsError.message}`)

      return {
        ...this.mapToCampaign(campaignData),
        steps: (stepsData || []).map(s => this.mapToStep(s)),
      }
    } catch (error) {
      throw new Error(
        `Failed to get campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get all campaigns for an organization
   */
  async getCampaigns(
    organizationId: string,
    options?: {
      status?: CampaignStatus
      limit?: number
      offset?: number
    }
  ): Promise<{
    campaigns: DripCampaign[]
    total: number
    hasMore: boolean
  }> {
    try {
      let query = this.supabase
        .from('drip_campaigns')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const limit = options?.limit || 50
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw new Error(`Failed to get campaigns: ${error.message}`)

      return {
        campaigns: (data || []).map(c => this.mapToCampaign(c)),
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      }
    } catch (error) {
      throw new Error(
        `Failed to get campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Activate a campaign (make it live)
   */
  async activateCampaign(campaignId: string): Promise<DripCampaign> {
    try {
      // Validate campaign has steps
      const { data: steps } = await this.supabase
        .from('drip_campaign_steps')
        .select('id')
        .eq('campaign_id', campaignId)

      if (!steps || steps.length === 0) {
        throw new Error('Campaign must have at least one step before activation')
      }

      const { data, error } = await this.supabase
        .from('drip_campaigns')
        .update({
          status: 'active',
          is_active: true,
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw new Error(`Failed to activate campaign: ${error.message}`)

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to activate campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<DripCampaign> {
    try {
      const { data, error } = await this.supabase
        .from('drip_campaigns')
        .update({
          status: 'paused',
          is_active: false,
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw new Error(`Failed to pause campaign: ${error.message}`)

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to pause campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ========================================================================
  // ENROLLMENT MANAGEMENT
  // ========================================================================

  /**
   * Enroll a contact in a drip campaign
   */
  async enrollContact(
    campaignId: string,
    contactId: string,
    enrolledBy?: string
  ): Promise<DripEnrollment> {
    try {
      // Check if campaign is active
      const { data: campaign } = await this.supabase
        .from('drip_campaigns')
        .select('is_active, status')
        .eq('id', campaignId)
        .single()

      if (!campaign?.is_active) {
        throw new Error('Campaign must be active to enroll contacts')
      }

      // Check if already enrolled
      const { data: existing } = await this.supabase
        .from('drip_enrollments')
        .select('id, status')
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId)
        .single()

      if (existing && existing.status === 'active') {
        throw new Error('Contact already enrolled in this campaign')
      }

      // Create enrollment
      const enrollmentData = {
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'active' as EnrollmentStatus,
        enrolled_at: new Date(),
        enrolled_by: enrolledBy,
        messages_sent: 0,
        messages_delivered: 0,
        messages_read: 0,
        replied: false,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const { data, error } = await this.supabase
        .from('drip_enrollments')
        .insert(enrollmentData)
        .select()
        .single()

      if (error) throw new Error(`Failed to enroll contact: ${error.message}`)

      // Schedule first message
      await this.scheduleNextMessage(data.id)

      return this.mapToEnrollment(data)
    } catch (error) {
      throw new Error(
        `Failed to enroll contact: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Enroll multiple contacts at once
   */
  async enrollContacts(
    campaignId: string,
    contactIds: string[],
    enrolledBy?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const contactId of contactIds) {
      try {
        await this.enrollContact(campaignId, contactId, enrolledBy)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Contact ${contactId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return results
  }

  /**
   * Stop an enrollment (drop from campaign)
   */
  async stopEnrollment(
    enrollmentId: string,
    reason: 'manual' | 'replied' | 'opted_out' | 'error'
  ): Promise<DripEnrollment> {
    try {
      const status = reason === 'opted_out' ? 'opted_out' : 'dropped'

      const { data, error } = await this.supabase
        .from('drip_enrollments')
        .update({
          status,
          dropped_reason: reason,
          updated_at: new Date(),
        })
        .eq('id', enrollmentId)
        .select()
        .single()

      if (error) throw new Error(`Failed to stop enrollment: ${error.message}`)

      return this.mapToEnrollment(data)
    } catch (error) {
      throw new Error(
        `Failed to stop enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get enrollments for a campaign
   */
  async getEnrollments(
    campaignId: string,
    options?: {
      status?: EnrollmentStatus
      limit?: number
      offset?: number
    }
  ): Promise<{
    enrollments: DripEnrollment[]
    total: number
  }> {
    try {
      let query = this.supabase
        .from('drip_enrollments')
        .select('*', { count: 'exact' })
        .eq('campaign_id', campaignId)

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const limit = options?.limit || 100
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1).order('enrolled_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw new Error(`Failed to get enrollments: ${error.message}`)

      return {
        enrollments: (data || []).map(e => this.mapToEnrollment(e)),
        total: count || 0,
      }
    } catch (error) {
      throw new Error(
        `Failed to get enrollments: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ========================================================================
  // MESSAGE SCHEDULING & SENDING
  // ========================================================================

  /**
   * Schedule the next message for an enrollment
   * This is the core logic that moves contacts through the sequence
   */
  async scheduleNextMessage(enrollmentId: string): Promise<void> {
    try {
      // Get enrollment details
      const { data: enrollment, error: enrollError } = await this.supabase
        .from('drip_enrollments')
        .select(
          `
          *,
          campaign:drip_campaigns(*),
          contact:contacts(*)
        `
        )
        .eq('id', enrollmentId)
        .single()

      if (enrollError) throw new Error(`Failed to get enrollment: ${enrollError.message}`)
      if (enrollment.status !== 'active') return // Don't schedule if not active

      // Get next step
      const { data: nextStep, error: stepError } = await this.supabase
        .from('drip_campaign_steps')
        .select('*')
        .eq('campaign_id', enrollment.campaign_id)
        .gt('step_order', enrollment.current_step_order || 0)
        .order('step_order', { ascending: true })
        .limit(1)
        .single()

      if (stepError || !nextStep) {
        // No more steps - mark as completed
        await this.supabase
          .from('drip_enrollments')
          .update({
            status: 'completed',
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .eq('id', enrollmentId)
        return
      }

      // Calculate next message time
      const delay = this.calculateDelay(nextStep.delay_type, nextStep.delay_value)
      const nextMessageAt = new Date(Date.now() + delay)

      // Update enrollment
      await this.supabase
        .from('drip_enrollments')
        .update({
          current_step_id: nextStep.id,
          current_step_order: nextStep.step_order,
          next_message_at: nextMessageAt,
          updated_at: new Date(),
        })
        .eq('id', enrollmentId)

      // Create message log entry
      await this.supabase.from('drip_message_logs').insert({
        id: crypto.randomUUID(),
        enrollment_id: enrollmentId,
        step_id: nextStep.id,
        contact_id: enrollment.contact_id,
        status: 'pending',
        scheduled_at: nextMessageAt,
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
    } catch (error) {
      console.error('Failed to schedule next message:', error)
      throw error
    }
  }

  /**
   * Process due messages (to be called by scheduler/cron)
   */
  async processDueMessages(organizationId: string): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    }

    try {
      // Get all pending messages that are due
      const { data: dueMessages, error } = await this.supabase
        .from('drip_message_logs')
        .select(
          `
          *,
          enrollment:drip_enrollments!inner(*),
          step:drip_campaign_steps!inner(*),
          contact:contacts!inner(*)
        `
        )
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .eq('enrollment.campaign.organization_id', organizationId)
        .limit(100) // Process in batches

      if (error) throw new Error(`Failed to get due messages: ${error.message}`)

      if (!dueMessages || dueMessages.length === 0) return results

      // Get WhatsApp config
      const config = await this.getWhatsAppConfig(organizationId)
      if (!config) {
        throw new Error('WhatsApp not configured for organization')
      }

      const whatsappClient = new WhatsAppClient(config.accessToken, config.phoneNumberId)

      // Process each message
      for (const messageLog of dueMessages) {
        try {
          await this.sendDripMessage(messageLog, whatsappClient)
          results.processed++
        } catch (error) {
          results.failed++
          results.errors.push(
            `Message ${messageLog.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )

          // Mark as failed if max retries exceeded
          if (messageLog.retry_count >= 3) {
            await this.supabase
              .from('drip_message_logs')
              .update({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date(),
              })
              .eq('id', messageLog.id)
          }
        }
      }

      return results
    } catch (error) {
      console.error('Failed to process due messages:', error)
      throw error
    }
  }

  /**
   * Send a single drip message
   */
  private async sendDripMessage(messageLog: any, whatsappClient: WhatsAppClient): Promise<void> {
    try {
      const step = messageLog.step
      const contact = messageLog.contact
      const enrollment = messageLog.enrollment

      // Check if should stop on reply
      const campaign = await this.getCampaign(enrollment.campaign_id)
      if (campaign.settings.stopOnReply && enrollment.replied) {
        await this.stopEnrollment(enrollment.id, 'replied')
        await this.supabase
          .from('drip_message_logs')
          .update({ status: 'skipped', updated_at: new Date() })
          .eq('id', messageLog.id)
        return
      }

      // Send message based on type
      let messageResponse: any

      if (step.message_type === 'template' && step.template_id) {
        messageResponse = await this.templateManager.sendTemplateMessage(
          step.template_id,
          contact.whatsapp_id,
          step.template_variables || {},
          whatsappClient.phoneNumberId,
          whatsappClient.accessToken
        )
      } else if (step.message_type === 'text' && step.message_content) {
        messageResponse = await whatsappClient.sendTextMessage(
          contact.whatsapp_id,
          step.message_content
        )
      } else if (step.message_type === 'media' && step.media_url) {
        messageResponse = await whatsappClient.sendImageMessage(
          contact.whatsapp_id,
          step.media_url,
          step.message_content || ''
        )
      }

      // Update message log
      await this.supabase
        .from('drip_message_logs')
        .update({
          status: 'sent',
          whatsapp_message_id: messageResponse?.messages?.[0]?.id,
          sent_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', messageLog.id)

      // Update enrollment stats
      await this.supabase
        .from('drip_enrollments')
        .update({
          messages_sent: enrollment.messages_sent + 1,
          updated_at: new Date(),
        })
        .eq('id', enrollment.id)

      // Schedule next message
      await this.scheduleNextMessage(enrollment.id)
    } catch (error) {
      // Retry logic
      const retryCount = messageLog.retry_count + 1
      if (retryCount < 3) {
        const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
        await this.supabase
          .from('drip_message_logs')
          .update({
            retry_count: retryCount,
            scheduled_at: nextRetry,
            updated_at: new Date(),
          })
          .eq('id', messageLog.id)
      }
      throw error
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private calculateDelay(delayType: DelayType, delayValue: number): number {
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day

    switch (delayType) {
      case 'minutes':
        return delayValue * minute
      case 'hours':
        return delayValue * hour
      case 'days':
        return delayValue * day
      case 'weeks':
        return delayValue * week
      default:
        return 0
    }
  }

  /**
   * Get WhatsApp configuration for organization
   * Retrieves and decrypts per-tenant WhatsApp credentials
   */
  private async getWhatsAppConfig(
    organizationId: string
  ): Promise<{ phoneNumberId: string; accessToken: string } | null> {
    const { data: organization } = await this.supabase
      .from('organizations')
      .select('whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_access_token, whatsapp_webhook_verify_token')
      .eq('id', organizationId)
      .single()

    if (!organization?.whatsapp_phone_number_id || !organization?.whatsapp_access_token) {
      return null
    }

    // Decrypt credentials (handles both encrypted and legacy plaintext)
    const credentials = decryptWhatsAppCredentials(
      organizationId,
      organization.whatsapp_access_token,
      organization.whatsapp_phone_number_id,
      organization.whatsapp_business_account_id,
      organization.whatsapp_webhook_verify_token
    )

    if (!credentials) {
      return null
    }

    return {
      accessToken: credentials.accessToken,
      phoneNumberId: credentials.phoneNumberId,
    }
  }

  // ========================================================================
  // MAPPERS
  // ========================================================================

  private mapToCampaign(data: any): DripCampaign {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description,
      triggerType: data.trigger_type,
      triggerConfig: data.trigger_config || {},
      status: data.status,
      isActive: data.is_active,
      settings: data.settings || {
        stopOnReply: true,
        respectBusinessHours: false,
        maxContactsPerDay: 1000,
      },
      statistics: data.statistics || {
        totalEnrolled: 0,
        activeContacts: 0,
        completedContacts: 0,
        droppedContacts: 0,
        totalMessagesSent: 0,
        averageCompletionRate: 0,
      },
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private mapToStep(data: any): DripStep {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      stepOrder: data.step_order,
      name: data.name,
      delayType: data.delay_type,
      delayValue: data.delay_value,
      messageType: data.message_type,
      templateId: data.template_id,
      messageContent: data.message_content,
      mediaUrl: data.media_url,
      templateVariables: data.template_variables || {},
      conditions: data.conditions || [],
      settings: data.settings || {
        sendOnlyDuringBusinessHours: false,
        skipWeekends: false,
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private mapToEnrollment(data: any): DripEnrollment {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      contactId: data.contact_id,
      status: data.status,
      currentStepId: data.current_step_id,
      currentStepOrder: data.current_step_order,
      enrolledAt: new Date(data.enrolled_at),
      nextMessageAt: data.next_message_at ? new Date(data.next_message_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      messagesSent: data.messages_sent,
      messagesDelivered: data.messages_delivered,
      messagesRead: data.messages_read,
      replied: data.replied,
      enrolledBy: data.enrolled_by,
      droppedReason: data.dropped_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}

// ============================================================================
// TRIGGER HANDLER (for automatic enrollments)
// ============================================================================

export class DripTriggerHandler {
  private engine: DripCampaignEngine

  constructor() {
    this.engine = new DripCampaignEngine()
  }

  /**
   * Handle tag added event
   */
  async handleTagAdded(contactId: string, tag: string, organizationId: string): Promise<void> {
    try {
      // Find active campaigns triggered by this tag
      const { data: campaigns } = await this.engine['supabase']
        .from('drip_campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trigger_type', 'tag_added')
        .eq('is_active', true)

      if (!campaigns) return

      for (const campaign of campaigns) {
        const triggerConfig = campaign.trigger_config as TriggerConfig
        if (triggerConfig.tags && triggerConfig.tags.includes(tag)) {
          await this.engine.enrollContact(campaign.id, contactId)
        }
      }
    } catch (error) {
      console.error('Failed to handle tag added:', error)
    }
  }

  /**
   * Handle contact created event
   */
  async handleContactCreated(contactId: string, organizationId: string): Promise<void> {
    try {
      // Find active campaigns triggered by contact creation
      const { data: campaigns } = await this.engine['supabase']
        .from('drip_campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trigger_type', 'contact_created')
        .eq('is_active', true)

      if (!campaigns) return

      for (const campaign of campaigns) {
        await this.engine.enrollContact(campaign.id, contactId)
      }
    } catch (error) {
      console.error('Failed to handle contact created:', error)
    }
  }

  /**
   * Handle message received (for stop-on-reply logic)
   */
  async handleMessageReceived(contactId: string): Promise<void> {
    try {
      // Mark all active enrollments for this contact as "replied"
      await this.engine['supabase']
        .from('drip_enrollments')
        .update({ replied: true, updated_at: new Date() })
        .eq('contact_id', contactId)
        .eq('status', 'active')

      // The actual stopping will happen when next message tries to send
      // (based on campaign's stopOnReply setting)
    } catch (error) {
      console.error('Failed to handle message received:', error)
    }
  }
}
