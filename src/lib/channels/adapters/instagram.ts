/**
 * Instagram Channel Adapter
 * Purpose: Implements ChannelAdapter interface for Instagram Business DMs
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
  getInstagramConnection,
  sendInstagramMessage,
  decryptAccessToken,
  getRateLimitInfo
} from '@/lib/integrations/instagram/client'
import type {
  InstagramConnection,
  InstagramWebhookPayload,
  InstagramMessagingEvent,
  InstagramIncomingMessage,
  InstagramAttachment
} from '@/types/instagram'

// =============================================================================
// Instagram-specific Types
// =============================================================================

interface InstagramChannelMetadata {
  instagramUserId: string
  username?: string
  profilePic?: string
  threadId?: string
}

// =============================================================================
// Instagram Adapter Implementation
// =============================================================================

/**
 * Instagram adapter implementing the ChannelAdapter interface.
 * Wraps the Instagram Graph API client with unified channel semantics.
 */
export class InstagramAdapter extends BaseChannelAdapter {
  readonly channelType = ChannelType.INSTAGRAM
  readonly name = 'Instagram Direct Messages'

  private connection: InstagramConnection
  private organizationId: string

  // Features supported by Instagram DMs
  private static readonly SUPPORTED_FEATURES: ChannelFeature[] = [
    ChannelFeature.MEDIA,
    ChannelFeature.READ_RECEIPTS,
    ChannelFeature.REACTIONS
  ]

  // Maximum content length for Instagram DMs
  private static readonly MAX_TEXT_LENGTH = 1000

  // Supported media types
  private static readonly SUPPORTED_MEDIA_TYPES: MediaType[] = [
    'image',
    'video',
    'audio'
  ]

  constructor(connection: InstagramConnection, organizationId: string) {
    super()
    this.connection = connection
    this.organizationId = organizationId
  }

  // =============================================================================
  // Static Factory Methods
  // =============================================================================

  /**
   * Creates an InstagramAdapter for a specific organization.
   *
   * @param organizationId - The organization ID to create adapter for
   * @returns A configured InstagramAdapter instance
   */
  static async createForOrganization(organizationId: string): Promise<InstagramAdapter> {
    const connection = await getInstagramConnection(organizationId)

    if (!connection) {
      throw new Error('Instagram not connected for this organization')
    }

    return new InstagramAdapter(connection, organizationId)
  }

  // =============================================================================
  // Core Operations
  // =============================================================================

  /**
   * Sends a message via Instagram DM.
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
      const metadata = message.channelMetadata as InstagramChannelMetadata
      const recipientId = metadata.instagramUserId

      // Convert to Instagram format
      const instagramMessage = this.toInstagramFormat(message)

      // Send via client
      const result = await sendInstagramMessage(
        this.connection,
        recipientId,
        instagramMessage
      )

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
   * Processes an incoming Instagram webhook payload into a canonical message.
   *
   * @param webhookPayload - The raw webhook payload from Instagram
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
   * Note: Instagram doesn't have a direct API to query message status.
   * Status updates come via webhooks. This returns a default status.
   *
   * @param _channelMessageId - The Instagram message ID
   * @returns The current message status
   */
  async getStatus(_channelMessageId: string): Promise<MessageStatus> {
    // Instagram doesn't provide a status lookup API
    // Status updates are received via webhooks
    return 'sent'
  }

  // =============================================================================
  // Feature Support
  // =============================================================================

  /**
   * Checks if a specific feature is supported by Instagram.
   *
   * @param feature - The feature to check
   * @returns true if the feature is supported
   */
  supportsFeature(feature: ChannelFeature): boolean {
    return InstagramAdapter.SUPPORTED_FEATURES.includes(feature)
  }

  /**
   * Returns all features supported by Instagram.
   *
   * @returns Array of supported features
   */
  getFeatures(): ChannelFeature[] {
    return [...InstagramAdapter.SUPPORTED_FEATURES]
  }

  // =============================================================================
  // Health Check
  // =============================================================================

  /**
   * Performs a health check on the Instagram connection.
   *
   * @returns HealthStatus with connection status and rate limit info
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      // Verify token is valid by checking if it's not expired
      const tokenExpiry = this.connection.token_expires_at
        ? new Date(this.connection.token_expires_at)
        : null

      if (tokenExpiry && tokenExpiry < new Date()) {
        return {
          isHealthy: false,
          lastError: 'Access token has expired'
        }
      }

      // Get rate limit info
      const rateLimitInfo = await getRateLimitInfo(this.organizationId)

      const latency = Date.now() - startTime

      return {
        isHealthy: this.connection.is_active,
        latency,
        rateLimit: rateLimitInfo ? {
          remaining: rateLimitInfo.limit - rateLimitInfo.messages_sent_this_hour,
          resetAt: new Date(new Date(rateLimitInfo.hour_window_start).getTime() + 60 * 60 * 1000)
        } : undefined
      }
    } catch (error) {
      return {
        isHealthy: false,
        lastError: this.formatErrorMessage(error)
      }
    }
  }

  // =============================================================================
  // Validation
  // =============================================================================

  /**
   * Instagram-specific validation rules.
   */
  protected validateChannelSpecific(message: CanonicalMessage): string[] {
    const errors: string[] = []
    const metadata = message.channelMetadata as InstagramChannelMetadata | undefined

    // Instagram user ID is required
    if (!metadata?.instagramUserId) {
      errors.push('Instagram user ID is required in channel metadata')
    }

    // Validate text content length
    if (message.content && message.content.length > InstagramAdapter.MAX_TEXT_LENGTH) {
      errors.push(`Text content exceeds maximum length of ${InstagramAdapter.MAX_TEXT_LENGTH} characters`)
    }

    // Validate media type if present
    if (message.media) {
      if (!InstagramAdapter.SUPPORTED_MEDIA_TYPES.includes(message.media.type)) {
        errors.push(`Unsupported media type: ${message.media.type}. Supported types: ${InstagramAdapter.SUPPORTED_MEDIA_TYPES.join(', ')}`)
      }

      // Media must have URL
      if (!message.media.url) {
        errors.push('Media URL is required')
      }
    }

    // Instagram doesn't support rich content like buttons/lists in DMs (outside templates)
    if (message.richContent) {
      errors.push('Instagram DMs do not support rich content types')
    }

    return errors
  }

  // =============================================================================
  // Format Conversion Methods
  // =============================================================================

  /**
   * Converts a canonical message to Instagram API format.
   *
   * @param canonical - The canonical message to convert
   * @returns Instagram-formatted message object
   */
  private toInstagramFormat(canonical: CanonicalMessage): {
    text?: string
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file'
      payload: { url: string; is_reusable?: boolean }
    }
  } {
    // Handle text messages
    if (canonical.contentType === 'text' && canonical.content) {
      return {
        text: canonical.content
      }
    }

    // Handle media messages
    if (canonical.contentType === 'media' && canonical.media) {
      return {
        attachment: {
          type: canonical.media.type as 'image' | 'video' | 'audio' | 'file',
          payload: {
            url: canonical.media.url,
            is_reusable: true
          }
        }
      }
    }

    // Default to text if content exists
    if (canonical.content) {
      return {
        text: canonical.content
      }
    }

    throw new Error('Unable to convert message: no valid content found')
  }

  /**
   * Converts an Instagram message to canonical format.
   *
   * @param message - The Instagram incoming message
   * @param event - The messaging event containing sender/recipient info
   * @returns The canonical message
   */
  private toCanonicalFormat(
    message: InstagramIncomingMessage,
    event: InstagramMessagingEvent
  ): CanonicalMessage {
    const now = new Date()

    // Determine content type and extract content
    const { contentType, content, media, richContent } = this.extractContent(message)

    // Build channel metadata
    const channelMetadata: InstagramChannelMetadata = {
      instagramUserId: event.sender.id
    }

    return {
      // Identity
      id: this.generateMessageId(),
      conversationId: '', // To be filled by the webhook processor

      // Channel information
      channelType: ChannelType.INSTAGRAM,
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
   * Extracts content from an Instagram message into canonical format.
   */
  private extractContent(message: InstagramIncomingMessage): {
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

    // Attachment message
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]
      return this.extractAttachmentContent(attachment)
    }

    // Story mention
    if (message.story_mention) {
      return {
        contentType: 'rich',
        content: 'Story mention',
        richContent: {
          type: 'contact', // Using contact as a proxy for story
          payload: {
            type: 'story_mention',
            storyId: message.story_mention.id,
            storyUrl: message.story_mention.link
          }
        }
      }
    }

    return {
      contentType: 'text',
      content: '[Unsupported message type]'
    }
  }

  /**
   * Extracts content from an Instagram attachment.
   */
  private extractAttachmentContent(attachment: InstagramAttachment): {
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
            mimeType: 'image/jpeg'
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

      case 'sticker':
        return {
          contentType: 'media',
          content: 'Sticker',
          media: {
            type: 'image',
            url: attachment.payload.url || '',
            mimeType: 'image/webp'
          }
        }

      case 'story_mention':
        return {
          contentType: 'rich',
          content: 'Story mention',
          richContent: {
            type: 'contact',
            payload: {
              type: 'story_mention',
              storyId: attachment.payload.id,
              storyUrl: attachment.payload.link
            }
          }
        }

      case 'share':
        return {
          contentType: 'rich',
          content: attachment.payload.title || 'Shared content',
          richContent: {
            type: 'contact',
            payload: {
              type: 'share',
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
   * Parses and validates an Instagram webhook payload.
   *
   * @param payload - The raw webhook payload
   * @returns Parsed message and event
   */
  private parseWebhookPayload(payload: unknown): {
    message: InstagramIncomingMessage
    event: InstagramMessagingEvent
  } {
    // Validate basic structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: not an object')
    }

    const webhookPayload = payload as InstagramWebhookPayload

    if (webhookPayload.object !== 'instagram') {
      throw new Error(`Invalid webhook object type: ${webhookPayload.object}`)
    }

    if (!webhookPayload.entry || !Array.isArray(webhookPayload.entry) || webhookPayload.entry.length === 0) {
      throw new Error('Invalid webhook payload: missing entry array')
    }

    const entry = webhookPayload.entry[0]

    if (!entry.messaging || !Array.isArray(entry.messaging) || entry.messaging.length === 0) {
      throw new Error('Invalid webhook payload: no messaging events found')
    }

    const event = entry.messaging[0]

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
   * Parses a status update from Instagram webhook.
   *
   * @param payload - The raw webhook payload containing read receipts
   * @returns Array of status updates
   */
  parseStatusUpdates(payload: unknown): Array<{
    channelMessageId: string
    status: MessageStatus
    timestamp: Date
    recipientId: string
  }> {
    const webhookPayload = payload as InstagramWebhookPayload

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
      if (event.read) {
        // Instagram read receipts don't include specific message IDs
        // They include a watermark timestamp
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
}
