/**
 * Facebook Messenger Channel Adapter
 * Purpose: Implements ChannelAdapter interface for Facebook Messenger
 * Date: 2026-01-28
 */

import { BaseChannelAdapter } from './base'
import {
  ChannelType,
  ChannelFeature,
  CanonicalMessage,
  SendResult,
  MessageStatus,
  HealthStatus,
  MediaContent,
  ContentType,
  MediaType,
  RichContent
} from '@/types/channels'
import {
  getFacebookConnection,
  sendFacebookMessage,
  sendTextMessage,
  sendTemplateMessage,
  sendQuickReplyMessage,
  sendTypingIndicator,
  getUserProfile,
  passThreadControl,
  takeThreadControl,
  decryptAccessToken
} from '@/lib/integrations/facebook/client'
import type {
  FacebookConnection,
  FacebookWebhookPayload,
  FacebookMessagingEvent,
  FacebookIncomingMessage,
  FacebookAttachment,
  SendFacebookMessageRequest
} from '@/types/facebook'

// =============================================================================
// Facebook-specific Types
// =============================================================================

interface FacebookChannelMetadata {
  psid: string // Page-Scoped User ID
  pageId?: string
  userName?: string
  profilePic?: string
  threadOwner?: 'app' | 'page_inbox' | 'secondary_app'
}

// =============================================================================
// Facebook Adapter Implementation
// =============================================================================

/**
 * Facebook Messenger adapter implementing the ChannelAdapter interface.
 * Wraps the Facebook Graph API client with unified channel semantics.
 */
export class FacebookAdapter extends BaseChannelAdapter {
  readonly channelType = ChannelType.FACEBOOK
  readonly name = 'Facebook Messenger'

  private connection: FacebookConnection
  private organizationId: string

  // Features supported by Facebook Messenger
  private static readonly SUPPORTED_FEATURES: ChannelFeature[] = [
    ChannelFeature.MEDIA,
    ChannelFeature.TEMPLATES,
    ChannelFeature.QUICK_REPLIES,
    ChannelFeature.READ_RECEIPTS,
    ChannelFeature.TYPING_INDICATORS,
    ChannelFeature.BUTTONS,
    ChannelFeature.CAROUSEL
  ]

  // Maximum content length for Messenger
  private static readonly MAX_TEXT_LENGTH = 2000

  // Supported media types
  private static readonly SUPPORTED_MEDIA_TYPES: MediaType[] = [
    'image',
    'video',
    'audio',
    'document'
  ]

  constructor(connection: FacebookConnection, organizationId: string) {
    super()
    this.connection = connection
    this.organizationId = organizationId
  }

  // =============================================================================
  // Static Factory Methods
  // =============================================================================

  /**
   * Creates a FacebookAdapter for a specific organization.
   *
   * @param organizationId - The organization ID to create adapter for
   * @returns A configured FacebookAdapter instance
   */
  static async createForOrganization(organizationId: string): Promise<FacebookAdapter> {
    const connection = await getFacebookConnection(organizationId)

    if (!connection) {
      throw new Error('Facebook Messenger not connected for this organization')
    }

    return new FacebookAdapter(connection, organizationId)
  }

  // =============================================================================
  // Core Operations
  // =============================================================================

  /**
   * Sends a message via Facebook Messenger.
   *
   * @param message - The canonical message to send
   * @returns SendResult with success status and channel message ID
   */
  async send(message: CanonicalMessage): Promise<SendResult> {
    try {
      // Validate message first
      const validation = this.validateMessage(message)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          retryable: false
        }
      }

      // Extract recipient from channel metadata
      const metadata = message.channelMetadata as FacebookChannelMetadata
      const recipientPsid = metadata.psid

      // Send typing indicator first for better UX
      await sendTypingIndicator(this.connection, recipientPsid, 'typing_on')

      // Convert to Facebook format and send
      const request = this.toFacebookFormat(message, recipientPsid)
      const result = await sendFacebookMessage(this.connection, request)

      // Turn off typing indicator
      await sendTypingIndicator(this.connection, recipientPsid, 'typing_off')

      return {
        success: true,
        channelMessageId: result.message_id
      }
    } catch (error) {
      const isRetryable = this.isRetryableError(error)
      return {
        success: false,
        error: this.formatErrorMessage(error),
        retryable: isRetryable
      }
    }
  }

  /**
   * Processes an incoming Facebook webhook payload into a canonical message.
   *
   * @param webhookPayload - The raw webhook payload from Facebook
   * @returns The parsed canonical message
   */
  async receive(webhookPayload: unknown): Promise<CanonicalMessage> {
    // Parse and validate webhook payload
    const { message, event } = this.parseWebhookPayload(webhookPayload)

    // Convert to canonical format
    return this.toCanonicalFormat(message, event)
  }

  /**
   * Gets the status of a message by its channel message ID.
   *
   * Note: Facebook provides status updates via webhooks.
   * This returns a default status.
   *
   * @param _channelMessageId - The Facebook message ID
   * @returns The current message status
   */
  async getStatus(_channelMessageId: string): Promise<MessageStatus> {
    // Facebook provides status updates via webhooks (delivery, read receipts)
    // No direct API to query message status
    return 'sent'
  }

  // =============================================================================
  // Feature Support
  // =============================================================================

  /**
   * Checks if a specific feature is supported by Facebook Messenger.
   *
   * @param feature - The feature to check
   * @returns true if the feature is supported
   */
  supportsFeature(feature: ChannelFeature): boolean {
    return FacebookAdapter.SUPPORTED_FEATURES.includes(feature)
  }

  /**
   * Returns all features supported by Facebook Messenger.
   *
   * @returns Array of supported features
   */
  getFeatures(): ChannelFeature[] {
    return [...FacebookAdapter.SUPPORTED_FEATURES]
  }

  // =============================================================================
  // Health Check
  // =============================================================================

  /**
   * Performs a health check on the Facebook connection.
   *
   * @returns HealthStatus with connection status
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      // Verify connection is active
      if (!this.connection.is_active) {
        return {
          isHealthy: false,
          lastError: 'Facebook connection is inactive'
        }
      }

      // Check if webhooks are subscribed
      if (!this.connection.webhook_subscribed) {
        return {
          isHealthy: false,
          lastError: 'Webhooks not subscribed'
        }
      }

      // Check token expiry (if applicable)
      const tokenExpiry = this.connection.token_expires_at
        ? new Date(this.connection.token_expires_at)
        : null

      if (tokenExpiry && tokenExpiry < new Date()) {
        return {
          isHealthy: false,
          lastError: 'Access token has expired'
        }
      }

      const latency = Date.now() - startTime

      return {
        isHealthy: true,
        latency
      }
    } catch (error) {
      return {
        isHealthy: false,
        lastError: this.formatErrorMessage(error)
      }
    }
  }

  // =============================================================================
  // Handover Protocol (Bot-to-Human)
  // =============================================================================

  /**
   * Passes thread control to another app (typically Page Inbox for human agents).
   *
   * @param recipientPsid - The user's Page-Scoped ID
   * @param targetAppId - The app ID to pass control to (optional, defaults to Page Inbox)
   * @param metadata - Optional metadata to include with the handover
   * @returns true if successful
   */
  async handoverToHuman(
    recipientPsid: string,
    targetAppId?: string,
    metadata?: string
  ): Promise<boolean> {
    return passThreadControl(this.connection, recipientPsid, targetAppId, metadata)
  }

  /**
   * Takes thread control back from current owner.
   *
   * @param recipientPsid - The user's Page-Scoped ID
   * @param metadata - Optional metadata to include
   * @returns true if successful
   */
  async takeoverFromHuman(recipientPsid: string, metadata?: string): Promise<boolean> {
    return takeThreadControl(this.connection, recipientPsid, metadata)
  }

  // =============================================================================
  // Validation
  // =============================================================================

  /**
   * Facebook-specific validation rules.
   */
  protected validateChannelSpecific(message: CanonicalMessage): string[] {
    const errors: string[] = []
    const metadata = message.channelMetadata as FacebookChannelMetadata | undefined

    // PSID is required
    if (!metadata?.psid) {
      errors.push('Facebook PSID is required in channel metadata')
    }

    // Validate text content length
    if (message.content && message.content.length > FacebookAdapter.MAX_TEXT_LENGTH) {
      errors.push(`Text content exceeds maximum length of ${FacebookAdapter.MAX_TEXT_LENGTH} characters`)
    }

    // Validate media type if present
    if (message.media) {
      if (!FacebookAdapter.SUPPORTED_MEDIA_TYPES.includes(message.media.type)) {
        errors.push(`Unsupported media type: ${message.media.type}. Supported types: ${FacebookAdapter.SUPPORTED_MEDIA_TYPES.join(', ')}`)
      }

      // Media must have URL
      if (!message.media.url) {
        errors.push('Media URL is required')
      }
    }

    return errors
  }

  // =============================================================================
  // Format Conversion Methods
  // =============================================================================

  /**
   * Converts a canonical message to Facebook API format.
   *
   * @param canonical - The canonical message to convert
   * @param recipientPsid - The recipient's Page-Scoped ID
   * @returns Facebook-formatted message request
   */
  private toFacebookFormat(
    canonical: CanonicalMessage,
    recipientPsid: string
  ): SendFacebookMessageRequest {
    const request: SendFacebookMessageRequest = {
      recipient: { id: recipientPsid },
      message: {},
      messaging_type: 'RESPONSE'
    }

    // Handle text messages
    if (canonical.contentType === 'text' && canonical.content) {
      request.message.text = canonical.content

      // Add quick replies if present
      if (canonical.richContent?.type === 'quick_replies' && Array.isArray(canonical.richContent.payload)) {
        request.message.quick_replies = canonical.richContent.payload.map((qr: {
          title: string
          payload?: string
        }) => ({
          content_type: 'text' as const,
          title: qr.title,
          payload: qr.payload || qr.title
        }))
      }

      return request
    }

    // Handle media messages
    if (canonical.contentType === 'media' && canonical.media) {
      request.message.attachment = {
        type: canonical.media.type as 'image' | 'video' | 'audio' | 'file',
        payload: {
          url: canonical.media.url,
          is_reusable: true
        }
      }
      return request
    }

    // Handle template messages
    if (canonical.contentType === 'rich' && canonical.richContent) {
      request.message.attachment = {
        type: 'template',
        payload: this.convertRichContentToTemplate(canonical.richContent)
      }
      return request
    }

    // Default to text if content exists
    if (canonical.content) {
      request.message.text = canonical.content
      return request
    }

    throw new Error('Unable to convert message: no valid content found')
  }

  /**
   * Converts rich content to Facebook template format.
   */
  private convertRichContentToTemplate(richContent: RichContent): Record<string, unknown> {
    switch (richContent.type) {
      case 'buttons':
        return {
          template_type: 'button',
          text: richContent.payload?.text || 'Choose an option',
          buttons: (richContent.payload?.buttons || []).map((btn: {
            type: string
            title: string
            url?: string
            payload?: string
          }) => {
            if (btn.type === 'url') {
              return {
                type: 'web_url',
                title: btn.title,
                url: btn.url
              }
            }
            return {
              type: 'postback',
              title: btn.title,
              payload: btn.payload || btn.title
            }
          })
        }

      case 'carousel':
        return {
          template_type: 'generic',
          elements: (richContent.payload?.elements || []).map((elem: {
            title: string
            subtitle?: string
            imageUrl?: string
            buttons?: Array<{ type: string; title: string; url?: string; payload?: string }>
          }) => ({
            title: elem.title,
            subtitle: elem.subtitle,
            image_url: elem.imageUrl,
            buttons: elem.buttons?.map((btn: {
              type: string
              title: string
              url?: string
              payload?: string
            }) => {
              if (btn.type === 'url') {
                return { type: 'web_url', title: btn.title, url: btn.url }
              }
              return { type: 'postback', title: btn.title, payload: btn.payload || btn.title }
            })
          }))
        }

      default:
        return richContent.payload as Record<string, unknown>
    }
  }

  /**
   * Converts a Facebook message to canonical format.
   *
   * @param message - The Facebook incoming message
   * @param event - The messaging event containing sender/recipient info
   * @returns The canonical message
   */
  private toCanonicalFormat(
    message: FacebookIncomingMessage,
    event: FacebookMessagingEvent
  ): CanonicalMessage {
    const now = new Date()

    // Determine content type and extract content
    const { contentType, content, media, richContent } = this.extractContent(message, event)

    // Build channel metadata
    const channelMetadata: FacebookChannelMetadata = {
      psid: event.sender.id
    }

    return {
      // Identity
      id: this.generateMessageId(),
      conversationId: '', // To be filled by the webhook processor

      // Channel information
      channelType: ChannelType.FACEBOOK,
      channelMessageId: message.mid,

      // Direction and sender
      direction: 'inbound',
      senderType: 'contact',
      senderId: event.sender.id,

      // Content
      contentType,
      content,
      media,
      richContent,

      // Threading
      replyToMessageId: message.reply_to?.mid,

      // Status
      status: 'delivered',

      // Metadata
      channelMetadata,

      // Timestamps
      timestamp: new Date(event.timestamp),
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Extracts content from a Facebook message into canonical format.
   */
  private extractContent(
    message: FacebookIncomingMessage,
    event: FacebookMessagingEvent
  ): {
    contentType: ContentType
    content: string
    media?: MediaContent
    richContent?: RichContent
  } {
    // Text message
    if (message.text) {
      return {
        contentType: 'text',
        content: message.text
      }
    }

    // Quick reply response
    if (message.quick_reply) {
      return {
        contentType: 'text',
        content: message.quick_reply.payload,
        richContent: {
          type: 'quick_replies',
          payload: { selectedPayload: message.quick_reply.payload }
        }
      }
    }

    // Attachment message
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]
      return this.extractAttachmentContent(attachment)
    }

    // Sticker
    if (message.sticker_id) {
      return {
        contentType: 'media',
        content: 'Sticker',
        media: {
          type: 'image',
          url: '', // Sticker URLs need to be looked up
          mimeType: 'image/png',
          metadata: { stickerId: message.sticker_id }
        }
      }
    }

    return {
      contentType: 'text',
      content: '[Unsupported message type]'
    }
  }

  /**
   * Extracts content from a Facebook attachment.
   */
  private extractAttachmentContent(attachment: FacebookAttachment): {
    contentType: ContentType
    content: string
    media?: MediaContent
    richContent?: RichContent
  } {
    switch (attachment.type) {
      case 'image':
        return {
          contentType: 'media',
          content: '',
          media: {
            type: 'image',
            url: attachment.payload.url || '',
            mimeType: 'image/jpeg',
            metadata: attachment.payload.sticker_id
              ? { stickerId: attachment.payload.sticker_id }
              : undefined
          }
        }

      case 'video':
        return {
          contentType: 'media',
          content: '',
          media: {
            type: 'video',
            url: attachment.payload.url || '',
            mimeType: 'video/mp4'
          }
        }

      case 'audio':
        return {
          contentType: 'media',
          content: '',
          media: {
            type: 'audio',
            url: attachment.payload.url || '',
            mimeType: 'audio/mpeg'
          }
        }

      case 'file':
        return {
          contentType: 'media',
          content: '',
          media: {
            type: 'document',
            url: attachment.payload.url || '',
            mimeType: 'application/octet-stream'
          }
        }

      case 'location':
        return {
          contentType: 'location',
          content: `Location: ${attachment.payload.coordinates?.lat}, ${attachment.payload.coordinates?.long}`,
          richContent: {
            type: 'location',
            payload: {
              latitude: attachment.payload.coordinates?.lat,
              longitude: attachment.payload.coordinates?.long,
              title: attachment.payload.title
            }
          }
        }

      case 'template':
        return {
          contentType: 'rich',
          content: 'Template message',
          richContent: {
            type: 'carousel',
            payload: attachment.payload
          }
        }

      case 'fallback':
        return {
          contentType: 'text',
          content: attachment.payload.title || '[Shared content]',
          richContent: {
            type: 'contact',
            payload: {
              type: 'fallback',
              title: attachment.payload.title,
              url: attachment.payload.url
            }
          }
        }

      default:
        return {
          contentType: 'text',
          content: `[Attachment: ${attachment.type}]`
        }
    }
  }

  /**
   * Parses and validates a Facebook webhook payload.
   *
   * @param payload - The raw webhook payload
   * @returns Parsed message and event
   */
  private parseWebhookPayload(payload: unknown): {
    message: FacebookIncomingMessage
    event: FacebookMessagingEvent
  } {
    // Validate basic structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: not an object')
    }

    const webhookPayload = payload as FacebookWebhookPayload

    if (webhookPayload.object !== 'page') {
      throw new Error(`Invalid webhook object type: ${webhookPayload.object}`)
    }

    if (!webhookPayload.entry || !Array.isArray(webhookPayload.entry) || webhookPayload.entry.length === 0) {
      throw new Error('Invalid webhook payload: missing entry array')
    }

    const entry = webhookPayload.entry[0]

    // Check for messaging (primary) or standby (when not thread owner)
    const messaging = entry.messaging || entry.standby

    if (!messaging || !Array.isArray(messaging) || messaging.length === 0) {
      throw new Error('Invalid webhook payload: no messaging events found')
    }

    const event = messaging[0]

    if (!event.message) {
      throw new Error('Invalid webhook payload: no message in event')
    }

    return {
      message: event.message,
      event
    }
  }

  // =============================================================================
  // Status Update Handling
  // =============================================================================

  /**
   * Parses status updates from Facebook webhook.
   *
   * @param payload - The raw webhook payload
   * @returns Array of status updates
   */
  parseStatusUpdates(payload: unknown): Array<{
    channelMessageId: string
    status: MessageStatus
    timestamp: Date
    recipientId: string
  }> {
    const webhookPayload = payload as FacebookWebhookPayload

    if (!webhookPayload?.entry?.[0]?.messaging) {
      return []
    }

    const updates: Array<{
      channelMessageId: string
      status: MessageStatus
      timestamp: Date
      recipientId: string
    }> = []

    for (const event of webhookPayload.entry[0].messaging) {
      // Delivery receipts
      if (event.delivery) {
        for (const mid of event.delivery.mids) {
          updates.push({
            channelMessageId: mid,
            status: 'delivered',
            timestamp: new Date(event.delivery.watermark),
            recipientId: event.sender.id
          })
        }
      }

      // Read receipts
      if (event.read) {
        updates.push({
          channelMessageId: `read_${event.read.watermark}`,
          status: 'read',
          timestamp: new Date(event.read.watermark),
          recipientId: event.sender.id
        })
      }
    }

    return updates
  }

  // =============================================================================
  // Postback Handling
  // =============================================================================

  /**
   * Parses postback events from Facebook webhook.
   *
   * @param payload - The raw webhook payload
   * @returns Parsed postback event or null
   */
  parsePostback(payload: unknown): {
    senderId: string
    payload: string
    title: string
    timestamp: Date
  } | null {
    const webhookPayload = payload as FacebookWebhookPayload

    if (!webhookPayload?.entry?.[0]?.messaging?.[0]?.postback) {
      return null
    }

    const event = webhookPayload.entry[0].messaging[0]
    const postback = event.postback!

    return {
      senderId: event.sender.id,
      payload: postback.payload,
      title: postback.title,
      timestamp: new Date(event.timestamp)
    }
  }

  // =============================================================================
  // Handover Protocol Events
  // =============================================================================

  /**
   * Parses handover protocol events from webhook.
   *
   * @param payload - The raw webhook payload
   * @returns Handover event details or null
   */
  parseHandoverEvent(payload: unknown): {
    type: 'pass' | 'take' | 'request'
    senderId: string
    appId: string
    metadata?: string
    timestamp: Date
  } | null {
    const webhookPayload = payload as FacebookWebhookPayload

    if (!webhookPayload?.entry?.[0]?.messaging?.[0]) {
      return null
    }

    const event = webhookPayload.entry[0].messaging[0]

    if (event.pass_thread_control) {
      return {
        type: 'pass',
        senderId: event.sender.id,
        appId: event.pass_thread_control.new_owner_app_id,
        metadata: event.pass_thread_control.metadata,
        timestamp: new Date(event.timestamp)
      }
    }

    if (event.take_thread_control) {
      return {
        type: 'take',
        senderId: event.sender.id,
        appId: event.take_thread_control.previous_owner_app_id,
        metadata: event.take_thread_control.metadata,
        timestamp: new Date(event.timestamp)
      }
    }

    if (event.request_thread_control) {
      return {
        type: 'request',
        senderId: event.sender.id,
        appId: event.request_thread_control.requested_owner_app_id,
        metadata: event.request_thread_control.metadata,
        timestamp: new Date(event.timestamp)
      }
    }

    return null
  }
}
