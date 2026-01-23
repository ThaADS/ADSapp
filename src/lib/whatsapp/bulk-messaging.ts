import { createClient } from '@/lib/supabase/server'
import { WhatsAppTemplateManager } from './templates'
import { WhatsAppClient } from './client'
import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { decryptWhatsAppCredentials } from '@/lib/security/credential-manager'

type TypedSupabaseClient = SupabaseClient<Database>

interface ContactData {
  id: string
  whatsapp_id: string
  name: string | null
  tags: string[] | null
}

export interface BulkCampaign {
  id: string
  organizationId: string
  name: string
  description?: string
  type: CampaignType
  status: CampaignStatus
  templateId?: string
  message?: {
    type: 'text' | 'template' | 'media'
    content: string
    mediaUrl?: string
    templateVariables?: Record<string, string>
  }
  targetAudience: {
    type: 'all' | 'tags' | 'contacts' | 'custom'
    tags?: string[]
    contactIds?: string[]
    customFilters?: AudienceFilter[]
  }
  scheduling: {
    type: 'immediate' | 'scheduled' | 'recurring'
    scheduledAt?: Date
    timezone?: string
    recurringPattern?: RecurringPattern
  }
  rateLimiting: {
    messagesPerHour: number
    messagesPerDay: number
    enabled: boolean
  }
  statistics: CampaignStatistics
  createdBy: string
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
}

export type CampaignType = 'promotional' | 'transactional' | 'notification' | 'survey'
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface AudienceFilter {
  field: 'last_message_at' | 'created_at' | 'tags' | 'name' | 'phone_number'
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'before'
    | 'after'
    | 'in'
    | 'not_in'
  value: string | string[] | Date
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  endDate?: Date
  daysOfWeek?: number[]
  dayOfMonth?: number
}

export interface CampaignStatistics {
  totalTargets: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  optOuts: number
  replies: number
  deliveryRate: number
  readRate: number
  replyRate: number
  failureRate: number
}

export interface BulkMessageJob {
  id: string
  campaignId: string
  contactId: string
  whatsappId: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  messageId?: string
  scheduledAt: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
  retryCount: number
  maxRetries: number
}

export interface ContactList {
  id: string
  organizationId: string
  name: string
  description?: string
  contactCount: number
  tags: string[]
  filters: AudienceFilter[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export class BulkMessagingEngine {
  private supabase = createClient()
  private templateManager = new WhatsAppTemplateManager()

  /**
   * Create a new bulk campaign
   */
  async createCampaign(
    organizationId: string,
    campaign: Omit<BulkCampaign, 'id' | 'createdAt' | 'updatedAt' | 'statistics' | 'status'>
  ): Promise<BulkCampaign> {
    try {
      // Calculate target audience size
      const targetCount = await this.calculateAudienceSize(organizationId, campaign.targetAudience)

      const campaignData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        status: 'draft' as CampaignStatus,
        template_id: campaign.templateId,
        message: campaign.message,
        target_audience: campaign.targetAudience,
        scheduling: campaign.scheduling,
        rate_limiting: campaign.rateLimiting,
        statistics: {
          totalTargets: targetCount,
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          messagesFailed: 0,
          optOuts: 0,
          replies: 0,
          deliveryRate: 0,
          readRate: 0,
          replyRate: 0,
          failureRate: 0,
        } as CampaignStatistics,
        created_by: campaign.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create campaign: ${error.message}`)
      }

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Start a bulk campaign
   */
  async startCampaign(campaignId: string): Promise<BulkCampaign> {
    try {
      const campaign = await this.getCampaign(campaignId)

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error('Campaign must be in draft or scheduled status to start')
      }

      // Validate campaign before starting
      const validation = await this.validateCampaign(campaign)
      if (!validation.valid) {
        throw new Error(`Campaign validation failed: ${validation.errors.join(', ')}`)
      }

      // Generate message jobs
      const jobs = await this.generateMessageJobs(campaign)

      // Update campaign status
      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .update({
          status: 'running',
          started_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to start campaign: ${error.message}`)
      }

      // Start processing jobs
      this.processMessageJobs(campaignId)

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to start campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string): Promise<BulkCampaign> {
    try {
      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .update({
          status: 'paused',
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to pause campaign: ${error.message}`)
      }

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to pause campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string): Promise<BulkCampaign> {
    try {
      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .update({
          status: 'running',
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to resume campaign: ${error.message}`)
      }

      // Resume processing jobs
      this.processMessageJobs(campaignId)

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to resume campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string): Promise<BulkCampaign> {
    try {
      // Cancel pending jobs
      await this.supabase
        .from('bulk_message_jobs')
        .update({ status: 'failed', error: 'Campaign cancelled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')

      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .update({
          status: 'cancelled',
          completed_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to cancel campaign: ${error.message}`)
      }

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to cancel campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<BulkCampaign> {
    try {
      const { data, error } = await this.supabase
        .from('bulk_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) {
        throw new Error(`Failed to get campaign: ${error.message}`)
      }

      return this.mapToCampaign(data)
    } catch (error) {
      throw new Error(
        `Failed to get campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get campaigns for organization
   */
  async getCampaigns(
    organizationId: string,
    options?: {
      status?: CampaignStatus
      type?: CampaignType
      limit?: number
      offset?: number
    }
  ): Promise<{
    campaigns: BulkCampaign[]
    total: number
    hasMore: boolean
  }> {
    try {
      let query = this.supabase
        .from('bulk_campaigns')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.type) {
        query = query.eq('type', options.type)
      }

      const limit = options?.limit || 50
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1)
      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to get campaigns: ${error.message}`)
      }

      const campaigns = data?.map(item => this.mapToCampaign(item)) || []

      return {
        campaigns,
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
   * Calculate audience size based on targeting criteria
   */
  async calculateAudienceSize(
    organizationId: string,
    targetAudience: BulkCampaign['targetAudience']
  ): Promise<number> {
    try {
      let query = this.supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_blocked', false)

      // Apply audience filters
      switch (targetAudience.type) {
        case 'all':
          // No additional filters
          break

        case 'tags':
          if (targetAudience.tags && targetAudience.tags.length > 0) {
            query = query.overlaps('tags', targetAudience.tags)
          }
          break

        case 'contacts':
          if (targetAudience.contactIds && targetAudience.contactIds.length > 0) {
            query = query.in('id', targetAudience.contactIds)
          }
          break

        case 'custom':
          if (targetAudience.customFilters) {
            query = this.applyCustomFilters(query, targetAudience.customFilters)
          }
          break
      }

      const { count, error } = await query

      if (error) {
        throw new Error(`Failed to calculate audience size: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      throw new Error(
        `Failed to calculate audience size: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Apply custom filters to query
   */
  private applyCustomFilters(query: any, filters: AudienceFilter[]): any {
    filters.forEach(filter => {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'contains':
          query = query.like(filter.field, `%${filter.value}%`)
          break
        case 'starts_with':
          query = query.like(filter.field, `${filter.value}%`)
          break
        case 'ends_with':
          query = query.like(filter.field, `%${filter.value}`)
          break
        case 'before':
          query = query.lt(filter.field, filter.value)
          break
        case 'after':
          query = query.gt(filter.field, filter.value)
          break
        case 'in':
          query = query.in(filter.field, filter.value as string[])
          break
        case 'not_in':
          query = query.not(filter.field, 'in', `(${(filter.value as string[]).join(',')})`)
          break
      }
    })
    return query
  }

  /**
   * Generate message jobs for campaign
   */
  async generateMessageJobs(campaign: BulkCampaign): Promise<BulkMessageJob[]> {
    try {
      // Get target contacts
      const contacts = await this.getTargetContacts(
        campaign.organizationId,
        campaign.targetAudience
      )

      const jobs: Omit<BulkMessageJob, 'id'>[] = []
      const now = new Date()

      contacts.forEach((contact, index) => {
        let scheduledAt = now

        // Apply rate limiting delays
        if (campaign.rateLimiting.enabled) {
          const delayMinutes = Math.floor(index / (campaign.rateLimiting.messagesPerHour / 60))
          scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000)
        }

        // Apply campaign scheduling
        if (campaign.scheduling.type === 'scheduled' && campaign.scheduling.scheduledAt) {
          const baseScheduledTime = campaign.scheduling.scheduledAt
          scheduledAt = new Date(baseScheduledTime.getTime() + index * 1000) // 1 second intervals
        }

        jobs.push({
          campaignId: campaign.id,
          contactId: contact.id,
          whatsappId: contact.whatsapp_id,
          status: 'pending',
          scheduledAt,
          retryCount: 0,
          maxRetries: 3,
        })
      })

      // Insert jobs into database
      const jobsData = jobs.map(job => ({
        id: crypto.randomUUID(),
        campaign_id: job.campaignId,
        contact_id: job.contactId,
        whatsapp_id: job.whatsappId,
        status: job.status,
        scheduled_at: job.scheduledAt,
        retry_count: job.retryCount,
        max_retries: job.maxRetries,
      }))

      const { data, error } = await this.supabase
        .from('bulk_message_jobs')
        .insert(jobsData)
        .select()

      if (error) {
        throw new Error(`Failed to create message jobs: ${error.message}`)
      }

      return data.map(item => this.mapToMessageJob(item))
    } catch (error) {
      throw new Error(
        `Failed to generate message jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get target contacts for campaign
   */
  private async getTargetContacts(
    organizationId: string,
    targetAudience: BulkCampaign['targetAudience']
  ): Promise<ContactData[]> {
    let query = this.supabase
      .from('contacts')
      .select('id, whatsapp_id, name, tags')
      .eq('organization_id', organizationId)
      .eq('is_blocked', false)

    // Apply audience filters (same logic as calculateAudienceSize)
    switch (targetAudience.type) {
      case 'tags':
        if (targetAudience.tags && targetAudience.tags.length > 0) {
          query = query.overlaps('tags', targetAudience.tags)
        }
        break
      case 'contacts':
        if (targetAudience.contactIds && targetAudience.contactIds.length > 0) {
          query = query.in('id', targetAudience.contactIds)
        }
        break
      case 'custom':
        if (targetAudience.customFilters) {
          query = this.applyCustomFilters(query, targetAudience.customFilters)
        }
        break
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get target contacts: ${error.message}`)
    }

    return data || []
  }

  /**
   * Process message jobs for campaign
   */
  private async processMessageJobs(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId)

      if (campaign.status !== 'running') {
        return
      }

      // Get pending jobs scheduled for now or earlier
      const { data: jobs, error } = await this.supabase
        .from('bulk_message_jobs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(100) // Process in batches

      if (error) {
        console.error('Failed to get message jobs:', error)
        return
      }

      if (!jobs || jobs.length === 0) {
        // Check if campaign is complete
        await this.checkCampaignCompletion(campaignId)
        return
      }

      // Get WhatsApp client
      const config = await this.getWhatsAppConfig(campaign.organizationId)
      if (!config) {
        throw new Error('WhatsApp not configured for organization')
      }

      const whatsappClient = new WhatsAppClient(config.accessToken, config.phoneNumberId)

      // Process jobs
      for (const jobData of jobs) {
        try {
          const job = this.mapToMessageJob(jobData)
          await this.processMessageJob(job, campaign, whatsappClient)
        } catch (error) {
          console.error(`Failed to process job ${jobData.id}:`, error)

          // Update job with error
          await this.supabase
            .from('bulk_message_jobs')
            .update({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date(),
            })
            .eq('id', jobData.id)
        }
      }

      // Update campaign statistics
      await this.updateCampaignStatistics(campaignId)

      // Continue processing if there are more jobs
      setTimeout(() => this.processMessageJobs(campaignId), 5000) // 5 second delay
    } catch (error) {
      console.error(`Failed to process message jobs for campaign ${campaignId}:`, error)
    }
  }

  /**
   * Process individual message job
   */
  private async processMessageJob(
    job: BulkMessageJob,
    campaign: BulkCampaign,
    whatsappClient: WhatsAppClient
  ): Promise<void> {
    try {
      let messageResponse: { id?: string; status?: string } | undefined

      // Send message based on campaign type
      if (campaign.templateId) {
        // Send template message
        const variables = campaign.message?.templateVariables || {}
        messageResponse = await this.templateManager.sendTemplateMessage(
          campaign.templateId,
          job.whatsappId,
          variables,
          whatsappClient.phoneNumberId,
          whatsappClient.accessToken
        )
      } else if (campaign.message) {
        // Send regular message
        switch (campaign.message.type) {
          case 'text':
            messageResponse = await whatsappClient.sendTextMessage(
              job.whatsappId,
              campaign.message.content
            )
            break
          case 'media':
            if (campaign.message.mediaUrl) {
              messageResponse = await whatsappClient.sendImageMessage(
                job.whatsappId,
                campaign.message.mediaUrl,
                campaign.message.content
              )
            }
            break
        }
      }

      // Update job as sent
      await this.supabase
        .from('bulk_message_jobs')
        .update({
          status: 'sent',
          message_id: messageResponse?.messages?.[0]?.id,
          sent_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', job.id)
    } catch (error) {
      // Handle retry logic
      if (job.retryCount < job.maxRetries) {
        await this.supabase
          .from('bulk_message_jobs')
          .update({
            retry_count: job.retryCount + 1,
            scheduled_at: new Date(Date.now() + Math.pow(2, job.retryCount) * 60000), // Exponential backoff
            updated_at: new Date(),
          })
          .eq('id', job.id)
      } else {
        await this.supabase
          .from('bulk_message_jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date(),
          })
          .eq('id', job.id)
      }

      throw error
    }
  }

  /**
   * Update campaign statistics
   */
  private async updateCampaignStatistics(campaignId: string): Promise<void> {
    try {
      // Get job statistics
      const { data: stats, error } = await this.supabase
        .from('bulk_message_jobs')
        .select('status')
        .eq('campaign_id', campaignId)

      if (error) {
        throw new Error(`Failed to get job statistics: ${error.message}`)
      }

      const totalTargets = stats?.length || 0
      const messagesSent =
        stats?.filter(s => ['sent', 'delivered', 'read'].includes(s.status)).length || 0
      const messagesDelivered =
        stats?.filter(s => ['delivered', 'read'].includes(s.status)).length || 0
      const messagesRead = stats?.filter(s => s.status === 'read').length || 0
      const messagesFailed = stats?.filter(s => s.status === 'failed').length || 0

      const statistics: CampaignStatistics = {
        totalTargets,
        messagesSent,
        messagesDelivered,
        messagesRead,
        messagesFailed,
        optOuts: 0, // Would need to track opt-outs separately
        replies: 0, // Would need to track replies separately
        deliveryRate: messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0,
        readRate: messagesSent > 0 ? (messagesRead / messagesSent) * 100 : 0,
        replyRate: 0, // Would calculate based on replies
        failureRate: totalTargets > 0 ? (messagesFailed / totalTargets) * 100 : 0,
      }

      await this.supabase
        .from('bulk_campaigns')
        .update({
          statistics,
          updated_at: new Date(),
        })
        .eq('id', campaignId)
    } catch (error) {
      console.error('Failed to update campaign statistics:', error)
    }
  }

  /**
   * Check if campaign is complete
   */
  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    try {
      const { data: pendingJobs, error } = await this.supabase
        .from('bulk_message_jobs')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .limit(1)

      if (error) {
        console.error('Failed to check pending jobs:', error)
        return
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        // Campaign is complete
        await this.supabase
          .from('bulk_campaigns')
          .update({
            status: 'completed',
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .eq('id', campaignId)
      }
    } catch (error) {
      console.error('Failed to check campaign completion:', error)
    }
  }

  /**
   * Get WhatsApp configuration for organization
   * Retrieves and decrypts per-tenant WhatsApp credentials
   */
  private async getWhatsAppConfig(
    organizationId: string
  ): Promise<{ phoneNumberId: string; accessToken: string; businessAccountId: string | null } | null> {
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
      businessAccountId: credentials.businessAccountId,
    }
  }

  /**
   * Validate campaign before starting
   */
  private async validateCampaign(
    campaign: BulkCampaign
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check message content
    if (!campaign.templateId && !campaign.message) {
      errors.push('Campaign must have either a template or message content')
    }

    if (campaign.templateId) {
      try {
        const template = await this.templateManager.getTemplate(campaign.templateId)
        if (template.status !== 'APPROVED') {
          errors.push('Template must be approved before use in campaigns')
        }
      } catch (error) {
        errors.push('Invalid template specified')
      }
    }

    // Check target audience
    if (campaign.statistics.totalTargets === 0) {
      errors.push('Campaign must target at least one contact')
    }

    // Check WhatsApp configuration
    const config = await this.getWhatsAppConfig(campaign.organizationId)
    if (!config) {
      errors.push('WhatsApp Business API not configured for organization')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Map database record to campaign interface
   */
  private mapToCampaign(data: Record<string, unknown>): BulkCampaign {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      templateId: data.template_id,
      message: data.message,
      targetAudience: data.target_audience,
      scheduling: data.scheduling,
      rateLimiting: data.rate_limiting,
      statistics: data.statistics,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    }
  }

  /**
   * Map database record to message job interface
   */
  private mapToMessageJob(data: Record<string, unknown>): BulkMessageJob {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      contactId: data.contact_id,
      whatsappId: data.whatsapp_id,
      status: data.status,
      messageId: data.message_id,
      scheduledAt: new Date(data.scheduled_at),
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
      error: data.error,
      retryCount: data.retry_count,
      maxRetries: data.max_retries,
    }
  }
}

/**
 * Contact List Manager for bulk messaging
 */
export class ContactListManager {
  private supabase = createClient()

  /**
   * Create a new contact list
   */
  async createContactList(
    organizationId: string,
    list: Omit<ContactList, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>
  ): Promise<ContactList> {
    try {
      const contactCount = await this.calculateListSize(organizationId, list.filters)

      const listData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: list.name,
        description: list.description,
        contact_count: contactCount,
        tags: list.tags,
        filters: list.filters,
        created_by: list.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const { data, error } = await this.supabase
        .from('contact_lists')
        .insert(listData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create contact list: ${error.message}`)
      }

      return this.mapToContactList(data)
    } catch (error) {
      throw new Error(
        `Failed to create contact list: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Calculate list size based on filters
   */
  private async calculateListSize(
    organizationId: string,
    filters: AudienceFilter[]
  ): Promise<number> {
    let query = this.supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_blocked', false)

    // Apply filters
    filters.forEach(filter => {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'contains':
          query = query.like(filter.field, `%${filter.value}%`)
          break
        // Add other operators as needed
      }
    })

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to calculate list size: ${error.message}`)
    }

    return count || 0
  }

  /**
   * Map database record to contact list interface
   */
  private mapToContactList(data: Record<string, unknown>): ContactList {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description,
      contactCount: data.contact_count,
      tags: data.tags || [],
      filters: data.filters || [],
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}
