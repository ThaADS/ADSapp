/**
 * SMS Channel Adapter
 * Purpose: ChannelAdapter implementation for Twilio SMS/MMS messaging
 * Date: 2026-01-28
 */

import { createClient } from '@/lib/supabase/server'
import { BaseChannelAdapter } from './base'
import {
  ChannelType,
  ChannelFeature,
  CanonicalMessage,
  SendResult,
  MessageStatus,
  HealthStatus
} from '@/types/channels'
import {
  SMSConnection,
  SMSConversation,
  SMSMessage,
  SMSMessageStatus,
  TwilioIncomingSMS,
  TwilioStatusCallback,
  isValidE164,
  normalizeToE164,
  isOptOutKeyword,
  parseMediaFromWebhook
} from '@/types/sms'
import {
  sendSMS,
  getMessage,
  verifyTwilioCredentials,
  decryptToken,
  isFinalStatus,
  isDeliverySuccess,
  TwilioSendError
} from '@/lib/integrations/sms/client'

// =============================================================================
// SMS ADAPTER
// =============================================================================

export class SMSAdapter extends BaseChannelAdapter {
  readonly channelType = ChannelType.SMS
  readonly name = 'SMS'

  private accountSid: string
  private authToken: string
  private phoneNumber: string
  private phoneNumberSid: string
  private messagingServiceSid?: string
  private connectionId: string
  private organizationId: string

  // SMS supports text, MMS media, and read receipts (delivery receipts)
  private static readonly SUPPORTED_FEATURES: ChannelFeature[] = [
    ChannelFeature.MEDIA, // MMS
    ChannelFeature.DELIVERY_RECEIPTS,
  ]

  // Character limits
  private static readonly MAX_SMS_LENGTH = 1600 // Standard SMS limit (can be split into segments)
  private static readonly MAX_SEGMENTS = 10 // Max concatenated SMS segments
  private static readonly MAX_MMS_MEDIA = 10 // Max media attachments for MMS

  private constructor(config: {
    accountSid: string
    authToken: string
    phoneNumber: string
    phoneNumberSid: string
    messagingServiceSid?: string
    connectionId: string
    organizationId: string
  }) {
    super()
    this.accountSid = config.accountSid
    this.authToken = config.authToken
    this.phoneNumber = config.phoneNumber
    this.phoneNumberSid = config.phoneNumberSid
    this.messagingServiceSid = config.messagingServiceSid
    this.connectionId = config.connectionId
    this.organizationId = config.organizationId
  }

  // =============================================================================
  // FACTORY METHOD
  // =============================================================================

  /**
   * Create an SMSAdapter for a specific organization.
   * Loads credentials from the database.
   */
  static async createForOrganization(organizationId: string): Promise<SMSAdapter> {
    const supabase = await createClient()

    const { data: connection, error } = await supabase
      .from('sms_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error || !connection) {
      throw new Error(`No active SMS connection found for organization ${organizationId}`)
    }

    const smsConnection = connection as SMSConnection

    return new SMSAdapter({
      accountSid: smsConnection.twilio_account_sid,
      authToken: decryptToken(smsConnection.twilio_auth_token_hash),
      phoneNumber: smsConnection.phone_number,
      phoneNumberSid: smsConnection.phone_number_sid,
      messagingServiceSid: smsConnection.messaging_service_sid || undefined,
      connectionId: smsConnection.id,
      organizationId: organizationId,
    })
  }

  // =============================================================================
  // CORE OPERATIONS
  // =============================================================================

  /**
   * Send an SMS/MMS message
   */
  async send(message: CanonicalMessage): Promise<SendResult> {
    // Validate message
    const validation = this.validateMessage(message)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      }
    }

    const recipientPhone = message.channelMetadata?.sms?.recipientPhone
    if (!recipientPhone) {
      return {
        success: false,
        error: 'Recipient phone number is required in channelMetadata.sms.recipientPhone',
      }
    }

    // Check opt-out status
    const optedOut = await this.checkOptOut(recipientPhone)
    if (optedOut) {
      return {
        success: false,
        error: 'Recipient has opted out of SMS messages',
        errorCode: 'OPTED_OUT',
      }
    }

    try {
      // Build request
      const mediaUrls: string[] = []
      if (message.media && message.media.length > 0) {
        for (const media of message.media.slice(0, SMSAdapter.MAX_MMS_MEDIA)) {
          mediaUrls.push(media.url)
        }
      }

      // Determine webhook URL for status callbacks
      const statusCallbackUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sms/status`
        : undefined

      // Send via Twilio
      const result = await sendSMS(this.accountSid, this.authToken, {
        To: normalizeToE164(recipientPhone),
        From: this.messagingServiceSid ? undefined : this.phoneNumber,
        MessagingServiceSid: this.messagingServiceSid,
        Body: message.content || undefined,
        MediaUrl: mediaUrls.length > 0 ? mediaUrls : undefined,
        StatusCallback: statusCallbackUrl,
      })

      // Store message in database
      await this.storeOutboundMessage(message, result.sid, recipientPhone)

      return {
        success: true,
        channelMessageId: result.sid,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage = this.formatErrorMessage(error)
      const errorCode = error instanceof TwilioSendError ? String(error.code) : this.extractErrorCode(error)

      return {
        success: false,
        error: errorMessage,
        errorCode,
        retryable: this.isRetryableError(error),
      }
    }
  }

  /**
   * Process incoming SMS webhook payload
   */
  async receive(webhookPayload: unknown): Promise<CanonicalMessage> {
    const payload = webhookPayload as TwilioIncomingSMS

    // Parse media attachments
    const media = parseMediaFromWebhook(payload)

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(payload.From)

    // Check for opt-out keyword
    const body = payload.Body?.trim() || ''
    if (isOptOutKeyword(body)) {
      await this.processOptOut(payload.From, body, payload.MessageSid)
    }

    // Build canonical message
    const canonicalMessage: CanonicalMessage = {
      id: payload.MessageSid,
      conversationId: conversation.id,
      channelType: ChannelType.SMS,
      direction: 'inbound',
      content: payload.Body || null,
      timestamp: new Date().toISOString(),
      sender: {
        id: payload.From,
        phone: payload.From,
        name: conversation.remote_name || undefined,
      },
      channelMetadata: {
        sms: {
          messageSid: payload.MessageSid,
          accountSid: payload.AccountSid,
          fromNumber: payload.From,
          toNumber: payload.To,
          numSegments: parseInt(payload.NumSegments || '1', 10),
          fromCountry: payload.FromCountry,
          fromCity: payload.FromCity,
          fromState: payload.FromState,
          fromZip: payload.FromZip,
        },
      },
    }

    // Add media if present
    if (media.length > 0) {
      canonicalMessage.media = media.map((m, index) => ({
        id: `${payload.MessageSid}_media_${index}`,
        type: this.getMediaType(m.contentType),
        url: m.url,
        mimeType: m.contentType,
      }))
    }

    return canonicalMessage
  }

  /**
   * Get message delivery status
   */
  async getStatus(channelMessageId: string): Promise<MessageStatus> {
    try {
      const message = await getMessage(this.accountSid, this.authToken, channelMessageId)

      return {
        channelMessageId: message.sid,
        status: this.mapTwilioStatus(message.status),
        timestamp: message.date_updated,
        error: message.error_message || undefined,
        errorCode: message.error_code ? String(message.error_code) : undefined,
      }
    } catch (error) {
      return {
        channelMessageId,
        status: 'unknown',
        error: this.formatErrorMessage(error),
      }
    }
  }

  // =============================================================================
  // FEATURE SUPPORT
  // =============================================================================

  supportsFeature(feature: ChannelFeature): boolean {
    return SMSAdapter.SUPPORTED_FEATURES.includes(feature)
  }

  getFeatures(): ChannelFeature[] {
    return [...SMSAdapter.SUPPORTED_FEATURES]
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<HealthStatus> {
    try {
      const result = await verifyTwilioCredentials(this.accountSid, this.authToken)

      if (result.valid) {
        return {
          healthy: true,
          latency: undefined,
          lastChecked: new Date().toISOString(),
        }
      }

      return {
        healthy: false,
        error: result.error,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        healthy: false,
        error: this.formatErrorMessage(error),
        lastChecked: new Date().toISOString(),
      }
    }
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  protected validateChannelSpecific(message: CanonicalMessage): string[] {
    const errors: string[] = []

    // Check content length
    if (message.content && message.content.length > SMSAdapter.MAX_SMS_LENGTH * SMSAdapter.MAX_SEGMENTS) {
      errors.push(`SMS content exceeds maximum length of ${SMSAdapter.MAX_SMS_LENGTH * SMSAdapter.MAX_SEGMENTS} characters`)
    }

    // Check recipient phone
    const recipientPhone = message.channelMetadata?.sms?.recipientPhone
    if (!recipientPhone) {
      errors.push('Recipient phone number is required')
    } else if (!isValidE164(normalizeToE164(recipientPhone))) {
      errors.push('Invalid phone number format')
    }

    // Check media count for MMS
    if (message.media && message.media.length > SMSAdapter.MAX_MMS_MEDIA) {
      errors.push(`MMS supports maximum ${SMSAdapter.MAX_MMS_MEDIA} media attachments`)
    }

    // SMS doesn't support rich content
    if (message.richContent) {
      errors.push('SMS does not support rich content (templates, buttons, quick replies)')
    }

    return errors
  }

  // =============================================================================
  // OPT-OUT MANAGEMENT
  // =============================================================================

  /**
   * Check if a phone number has opted out
   */
  private async checkOptOut(phoneNumber: string): Promise<boolean> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('sms_opt_outs')
      .select('is_active')
      .eq('organization_id', this.organizationId)
      .eq('phone_number', normalizeToE164(phoneNumber))
      .eq('is_active', true)
      .single()

    return !!data
  }

  /**
   * Process opt-out request
   */
  private async processOptOut(
    phoneNumber: string,
    keyword: string,
    messageSid: string
  ): Promise<void> {
    const supabase = await createClient()
    const normalizedPhone = normalizeToE164(phoneNumber)

    // Upsert opt-out record
    await supabase.from('sms_opt_outs').upsert(
      {
        organization_id: this.organizationId,
        phone_number: normalizedPhone,
        keyword: keyword.toUpperCase(),
        opted_out_at: new Date().toISOString(),
        source_message_sid: messageSid,
        is_active: true,
      },
      { onConflict: 'organization_id,phone_number' }
    )

    // Update conversation opt-out status
    await supabase
      .from('sms_conversations')
      .update({
        opted_out: true,
        opted_out_at: new Date().toISOString(),
        opt_out_keyword: keyword.toUpperCase(),
      })
      .eq('sms_connection_id', this.connectionId)
      .eq('remote_phone_number', normalizedPhone)

    // Send confirmation message (CTIA requirement)
    try {
      await sendSMS(this.accountSid, this.authToken, {
        To: normalizedPhone,
        From: this.phoneNumber,
        Body: 'You have been unsubscribed and will no longer receive messages from us. Reply START to resubscribe.',
      })
    } catch (error) {
      console.error('Failed to send opt-out confirmation:', error)
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get or create SMS conversation for a phone number
   */
  private async getOrCreateConversation(remotePhone: string): Promise<SMSConversation> {
    const supabase = await createClient()
    const normalizedPhone = normalizeToE164(remotePhone)

    // Try to find existing conversation
    const { data: existing } = await supabase
      .from('sms_conversations')
      .select('*')
      .eq('sms_connection_id', this.connectionId)
      .eq('remote_phone_number', normalizedPhone)
      .single()

    if (existing) {
      return existing as SMSConversation
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('sms_conversations')
      .insert({
        sms_connection_id: this.connectionId,
        organization_id: this.organizationId,
        remote_phone_number: normalizedPhone,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select()
      .single()

    if (error || !newConversation) {
      throw new Error(`Failed to create SMS conversation: ${error?.message}`)
    }

    return newConversation as SMSConversation
  }

  /**
   * Store outbound message in database
   */
  private async storeOutboundMessage(
    message: CanonicalMessage,
    twilioSid: string,
    recipientPhone: string
  ): Promise<void> {
    const supabase = await createClient()

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(recipientPhone)

    // Store message
    await supabase.from('sms_messages').insert({
      sms_conversation_id: conversation.id,
      twilio_message_sid: twilioSid,
      twilio_account_sid: this.accountSid,
      direction: 'outbound',
      from_number: this.phoneNumber,
      to_number: normalizeToE164(recipientPhone),
      body: message.content,
      num_segments: 1, // Will be updated by status callback
      num_media: message.media?.length || 0,
      media_urls: message.media?.map((m) => m.url) || null,
      media_content_types: message.media?.map((m) => m.mimeType || 'application/octet-stream') || null,
      status: 'queued',
      twilio_created_at: new Date().toISOString(),
    })

    // Update conversation
    await supabase
      .from('sms_conversations')
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)
  }

  /**
   * Map Twilio message status to our canonical status
   */
  private mapTwilioStatus(status: SMSMessageStatus): string {
    const statusMap: Record<SMSMessageStatus, string> = {
      queued: 'pending',
      sending: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
      received: 'received',
    }
    return statusMap[status] || 'unknown'
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  // =============================================================================
  // PUBLIC GETTERS
  // =============================================================================

  getConnectionId(): string {
    return this.connectionId
  }

  getOrganizationId(): string {
    return this.organizationId
  }

  getPhoneNumber(): string {
    return this.phoneNumber
  }
}
