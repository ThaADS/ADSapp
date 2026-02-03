/**
 * Twilio WhatsApp Channel Adapter
 * Purpose: Implements ChannelAdapter interface for Twilio WhatsApp API
 * Date: 2026-02-03
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
} from '@/types/channels'
import {
  TwilioWhatsAppClient,
  getTwilioWhatsAppClient,
} from '@/lib/integrations/twilio-whatsapp/client'
import type {
  TwilioWhatsAppInboundMessage,
  TwilioWhatsAppMessageStatus,
} from '@/types/twilio-whatsapp'

// =============================================================================
// Twilio WhatsApp-specific Types
// =============================================================================

interface TwilioWhatsAppChannelMetadata {
  phoneNumber: string
  profileName?: string
  waId?: string
  twilioAccountSid?: string
  twilioMessageSid?: string
}

// =============================================================================
// Twilio WhatsApp Adapter Implementation
// =============================================================================

/**
 * Twilio WhatsApp adapter implementing the ChannelAdapter interface.
 * Provides unified messaging interface for Twilio WhatsApp API.
 */
export class TwilioWhatsAppAdapter extends BaseChannelAdapter {
  readonly channelType = ChannelType.WHATSAPP
  readonly name = 'Twilio WhatsApp'

  private client: TwilioWhatsAppClient
  private organizationId: string

  // Features supported by Twilio WhatsApp
  // Note: Some features like TYPING_INDICATORS are not available via Twilio
  private static readonly SUPPORTED_FEATURES: ChannelFeature[] = [
    ChannelFeature.MEDIA,
    ChannelFeature.READ_RECEIPTS,
    // Rich content support will be added in Phase 22 (templates)
  ]

  // Maximum content length for WhatsApp text messages
  private static readonly MAX_TEXT_LENGTH = 4096

  // Supported media types
  private static readonly SUPPORTED_MEDIA_TYPES: MediaType[] = [
    'image',
    'video',
    'audio',
    'document',
  ]

  constructor(client: TwilioWhatsAppClient, organizationId: string) {
    super()
    this.client = client
    this.organizationId = organizationId
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Creates a TwilioWhatsAppAdapter for a specific organization.
   *
   * @param organizationId - The organization ID to create adapter for
   * @returns A configured TwilioWhatsAppAdapter instance
   */
  static async createForOrganization(organizationId: string): Promise<TwilioWhatsAppAdapter> {
    const client = await getTwilioWhatsAppClient(organizationId)
    return new TwilioWhatsAppAdapter(client, organizationId)
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Sends a message via Twilio WhatsApp.
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
          retryable: false,
        }
      }

      // Extract phone number from channel metadata
      const metadata = message.channelMetadata as TwilioWhatsAppChannelMetadata
      const phoneNumber = this.normalizePhoneNumber(metadata.phoneNumber)

      // Send based on content type
      let result

      if (message.contentType === 'media' && message.media) {
        // Send media message
        result = await this.client.sendMediaMessage(
          phoneNumber,
          message.media.url,
          message.content || undefined
        )
      } else {
        // Send text message
        result = await this.client.sendTextMessage(
          phoneNumber,
          message.content
        )
      }

      if (!result.sid) {
        return {
          success: false,
          error: result.errorMessage || 'Failed to send message',
          retryable: this.isRetryableError(new Error(result.errorMessage)),
        }
      }

      return {
        success: true,
        channelMessageId: result.sid,
      }
    } catch (error) {
      const isRetryable = this.isRetryableError(error)
      return {
        success: false,
        error: this.formatErrorMessage(error),
        retryable: isRetryable,
      }
    }
  }

  /**
   * Processes an incoming Twilio WhatsApp webhook payload into a canonical message.
   *
   * @param webhookPayload - The raw webhook payload from Twilio (already parsed)
   * @returns The parsed canonical message
   */
  async receive(webhookPayload: unknown): Promise<CanonicalMessage> {
    const payload = webhookPayload as TwilioWhatsAppInboundMessage

    // Convert to canonical format
    return this.toCanonicalFormat(payload)
  }

  /**
   * Gets the status of a message by its channel message ID.
   *
   * Note: Twilio provides status via webhooks, not direct query.
   * This returns a default status.
   *
   * @param _channelMessageId - The Twilio message SID
   * @returns The current message status
   */
  async getStatus(_channelMessageId: string): Promise<MessageStatus> {
    // Twilio doesn't provide a status lookup API
    // Status updates are received via webhooks
    return 'sent'
  }

  // ============================================================================
  // Feature Support
  // ============================================================================

  /**
   * Checks if a specific feature is supported.
   *
   * @param feature - The feature to check
   * @returns true if the feature is supported
   */
  supportsFeature(feature: ChannelFeature): boolean {
    return TwilioWhatsAppAdapter.SUPPORTED_FEATURES.includes(feature)
  }

  /**
   * Returns all supported features.
   *
   * @returns Array of supported features
   */
  getFeatures(): ChannelFeature[] {
    return [...TwilioWhatsAppAdapter.SUPPORTED_FEATURES]
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Performs a health check on the Twilio WhatsApp connection.
   *
   * @returns HealthStatus with connection status and latency
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      // Verify credentials by checking account
      const verification = await this.client.verifyCredentials()

      const latency = Date.now() - startTime

      if (!verification.valid) {
        return {
          isHealthy: false,
          latency,
          lastError: verification.error,
        }
      }

      return {
        isHealthy: true,
        latency,
      }
    } catch (error) {
      return {
        isHealthy: false,
        lastError: this.formatErrorMessage(error),
      }
    }
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Twilio WhatsApp-specific validation rules.
   */
  protected validateChannelSpecific(message: CanonicalMessage): string[] {
    const errors: string[] = []
    const metadata = message.channelMetadata as TwilioWhatsAppChannelMetadata | undefined

    // Phone number is required
    if (!metadata?.phoneNumber) {
      errors.push('Phone number is required in channel metadata')
    }

    // Validate text content length
    if (message.content && message.content.length > TwilioWhatsAppAdapter.MAX_TEXT_LENGTH) {
      errors.push(
        `Text content exceeds maximum length of ${TwilioWhatsAppAdapter.MAX_TEXT_LENGTH} characters`
      )
    }

    // Validate media type if present
    if (message.media) {
      if (!TwilioWhatsAppAdapter.SUPPORTED_MEDIA_TYPES.includes(message.media.type)) {
        errors.push(
          `Unsupported media type: ${message.media.type}. ` +
          `Supported types: ${TwilioWhatsAppAdapter.SUPPORTED_MEDIA_TYPES.join(', ')}`
        )
      }

      // Media must have URL
      if (!message.media.url) {
        errors.push('Media URL is required')
      }
    }

    // Require either text or media
    if (!message.content && !message.media) {
      errors.push('Message must have either text content or media')
    }

    return errors
  }

  // ============================================================================
  // Format Conversion Methods
  // ============================================================================

  /**
   * Converts an inbound Twilio message to canonical format.
   */
  private toCanonicalFormat(message: TwilioWhatsAppInboundMessage): CanonicalMessage {
    const now = new Date()

    // Determine content type
    let contentType: ContentType = 'text'
    let media: MediaContent | undefined

    if (message.numMedia > 0 && message.mediaUrls.length > 0) {
      contentType = 'media'
      media = this.extractMediaContent(
        message.mediaUrls[0],
        message.mediaContentTypes[0]
      )
    }

    // Build channel metadata
    const channelMetadata: TwilioWhatsAppChannelMetadata = {
      phoneNumber: message.from,
      profileName: message.profileName,
      waId: message.waId,
      twilioAccountSid: message.accountSid,
      twilioMessageSid: message.messageSid,
    }

    return {
      // Identity
      id: this.generateMessageId(),
      conversationId: '', // To be filled by the webhook processor

      // Channel information
      channelType: ChannelType.WHATSAPP,
      channelMessageId: message.messageSid,

      // Direction and sender
      direction: 'inbound',
      senderType: 'contact',
      senderId: message.from,

      // Content
      contentType,
      content: message.body,
      media,

      // Status
      status: 'delivered',

      // Metadata
      channelMetadata,

      // Timestamps
      timestamp: message.timestamp,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Extracts media content from URL and content type.
   */
  private extractMediaContent(url: string, contentType: string): MediaContent {
    // Determine media type from content type
    let type: MediaType = 'document'

    if (contentType.startsWith('image/')) {
      type = 'image'
    } else if (contentType.startsWith('video/')) {
      type = 'video'
    } else if (contentType.startsWith('audio/')) {
      type = 'audio'
    }

    return {
      type,
      url,
      mimeType: contentType,
    }
  }

  // ============================================================================
  // Status Update Handling
  // ============================================================================

  /**
   * Maps Twilio status to canonical message status.
   */
  static mapTwilioStatus(twilioStatus: TwilioWhatsAppMessageStatus): MessageStatus {
    switch (twilioStatus) {
      case 'queued':
      case 'sending':
      case 'accepted':
        return 'pending'
      case 'sent':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'read':
        return 'read'
      case 'failed':
      case 'undelivered':
        return 'failed'
      default:
        return 'pending'
    }
  }

  /**
   * Gets the organization ID this adapter was created for.
   */
  getOrganizationId(): string {
    return this.organizationId
  }
}
