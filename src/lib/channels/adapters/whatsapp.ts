/**
 * WhatsApp Channel Adapter
 * Purpose: Implements ChannelAdapter interface for WhatsApp Business Cloud API
 * Date: 2026-01-24
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
  EnhancedWhatsAppClient,
  WhatsAppMessage,
  WhatsAppWebhookValue,
  getWhatsAppClient
} from '@/lib/whatsapp/enhanced-client'

// ============================================================================
// WhatsApp-specific Types
// ============================================================================

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: WhatsAppWebhookValue
    field: string
  }>
}

interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

interface WhatsAppChannelMetadata {
  phoneNumber: string
  profileName?: string
  phoneNumberId?: string
  waId?: string
}

// ============================================================================
// WhatsApp Adapter Implementation
// ============================================================================

/**
 * WhatsApp adapter implementing the ChannelAdapter interface.
 * Wraps the existing EnhancedWhatsAppClient with unified channel semantics.
 */
export class WhatsAppAdapter extends BaseChannelAdapter {
  readonly channelType = ChannelType.WHATSAPP
  readonly name = 'WhatsApp Business Cloud API'

  private client: EnhancedWhatsAppClient
  private phoneNumberId: string

  // Features supported by WhatsApp Business Cloud API
  private static readonly SUPPORTED_FEATURES: ChannelFeature[] = [
    ChannelFeature.RICH_CONTENT,
    ChannelFeature.MEDIA,
    ChannelFeature.READ_RECEIPTS,
    ChannelFeature.LOCATION_SHARING,
    ChannelFeature.CONTACT_CARDS,
    ChannelFeature.REACTIONS
  ]

  // Maximum content length for WhatsApp text messages
  private static readonly MAX_TEXT_LENGTH = 4096

  // Supported media types
  private static readonly SUPPORTED_MEDIA_TYPES: MediaType[] = [
    'image',
    'video',
    'audio',
    'document'
  ]

  constructor(client: EnhancedWhatsAppClient, phoneNumberId: string) {
    super()
    this.client = client
    this.phoneNumberId = phoneNumberId
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Creates a WhatsAppAdapter for a specific organization.
   * Uses existing credential retrieval and decryption logic.
   *
   * @param organizationId - The organization ID to create adapter for
   * @returns A configured WhatsAppAdapter instance
   */
  static async createForOrganization(organizationId: string): Promise<WhatsAppAdapter> {
    const client = await getWhatsAppClient(organizationId)

    // Get phone number ID from organization settings
    // Note: getWhatsAppClient already retrieves credentials, we need phone number ID
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('whatsapp_phone_number_id')
      .eq('id', organizationId)
      .single()

    if (error || !organization?.whatsapp_phone_number_id) {
      throw new Error('WhatsApp phone number ID not found for organization')
    }

    return new WhatsAppAdapter(client, organization.whatsapp_phone_number_id)
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Sends a message via WhatsApp.
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

      // Extract phone number from channel metadata
      const metadata = message.channelMetadata as WhatsAppChannelMetadata
      const phoneNumber = this.normalizePhoneNumber(metadata.phoneNumber)

      // Convert to WhatsApp format
      const whatsappMessage = this.toWhatsAppFormat(message)

      // Send via client
      const channelMessageId = await this.client.sendMessage(
        this.phoneNumberId,
        phoneNumber,
        whatsappMessage
      )

      return {
        success: true,
        channelMessageId
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
   * Processes an incoming WhatsApp webhook payload into a canonical message.
   *
   * @param webhookPayload - The raw webhook payload from WhatsApp
   * @returns The parsed canonical message
   */
  async receive(webhookPayload: unknown): Promise<CanonicalMessage> {
    // Parse and validate webhook payload
    const { message, contact, metadata } = this.parseWebhookPayload(webhookPayload)

    // Convert to canonical format
    return this.toCanonicalFormat(message, contact, metadata)
  }

  /**
   * Gets the status of a message by its channel message ID.
   *
   * Note: WhatsApp doesn't have a direct API to query message status.
   * Status updates come via webhooks. This returns a default status.
   *
   * @param _channelMessageId - The WhatsApp message ID
   * @returns The current message status
   */
  async getStatus(_channelMessageId: string): Promise<MessageStatus> {
    // WhatsApp doesn't provide a status lookup API
    // Status updates are received via webhooks
    // Return 'sent' as the default status for outbound messages
    return 'sent'
  }

  // ============================================================================
  // Feature Support
  // ============================================================================

  /**
   * Checks if a specific feature is supported by WhatsApp.
   *
   * @param feature - The feature to check
   * @returns true if the feature is supported
   */
  supportsFeature(feature: ChannelFeature): boolean {
    return WhatsAppAdapter.SUPPORTED_FEATURES.includes(feature)
  }

  /**
   * Returns all features supported by WhatsApp.
   *
   * @returns Array of supported features
   */
  getFeatures(): ChannelFeature[] {
    return [...WhatsAppAdapter.SUPPORTED_FEATURES]
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Performs a health check on the WhatsApp connection.
   *
   * @returns HealthStatus with connection status and latency
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      // Verify connection by fetching business profile
      await this.client.getBusinessProfile(this.phoneNumberId)

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

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * WhatsApp-specific validation rules.
   */
  protected validateChannelSpecific(message: CanonicalMessage): string[] {
    const errors: string[] = []
    const metadata = message.channelMetadata as WhatsAppChannelMetadata | undefined

    // Phone number is required
    if (!metadata?.phoneNumber) {
      errors.push('Phone number is required in channel metadata')
    }

    // Validate text content length
    if (message.content && message.content.length > WhatsAppAdapter.MAX_TEXT_LENGTH) {
      errors.push(`Text content exceeds maximum length of ${WhatsAppAdapter.MAX_TEXT_LENGTH} characters`)
    }

    // Validate media type if present
    if (message.media) {
      if (!WhatsAppAdapter.SUPPORTED_MEDIA_TYPES.includes(message.media.type)) {
        errors.push(`Unsupported media type: ${message.media.type}. Supported types: ${WhatsAppAdapter.SUPPORTED_MEDIA_TYPES.join(', ')}`)
      }

      // Media must have URL
      if (!message.media.url) {
        errors.push('Media URL is required')
      }
    }

    return errors
  }

  // ============================================================================
  // Format Conversion Methods
  // ============================================================================

  /**
   * Converts a canonical message to WhatsApp API format.
   *
   * @param canonical - The canonical message to convert
   * @returns WhatsApp-formatted message object
   */
  private toWhatsAppFormat(canonical: CanonicalMessage): Record<string, unknown> {
    // Handle text messages
    if (canonical.contentType === 'text' && canonical.content) {
      return {
        type: 'text',
        text: {
          body: canonical.content
        }
      }
    }

    // Handle media messages
    if (canonical.contentType === 'media' && canonical.media) {
      return this.convertMediaToWhatsApp(canonical.media, canonical.content)
    }

    // Handle rich content (buttons, lists, etc.)
    if (canonical.contentType === 'rich' && canonical.richContent) {
      return this.convertRichContentToWhatsApp(canonical.richContent, canonical.content)
    }

    // Default to text if content exists
    if (canonical.content) {
      return {
        type: 'text',
        text: {
          body: canonical.content
        }
      }
    }

    throw new Error('Unable to convert message: no valid content found')
  }

  /**
   * Converts media content to WhatsApp format.
   */
  private convertMediaToWhatsApp(
    media: MediaContent,
    caption?: string
  ): Record<string, unknown> {
    const mediaObject: Record<string, unknown> = {
      link: media.url
    }

    if (caption) {
      mediaObject.caption = caption
    }

    if (media.filename) {
      mediaObject.filename = media.filename
    }

    return {
      type: media.type,
      [media.type]: mediaObject
    }
  }

  /**
   * Converts rich content to WhatsApp interactive format.
   */
  private convertRichContentToWhatsApp(
    richContent: RichContent,
    bodyText?: string
  ): Record<string, unknown> {
    const payload = richContent.payload as Record<string, unknown>

    switch (richContent.type) {
      case 'button':
        return {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText || ''
            },
            action: {
              buttons: payload.buttons || []
            }
          }
        }

      case 'list':
        return {
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: bodyText || ''
            },
            action: {
              button: payload.buttonText || 'Select',
              sections: payload.sections || []
            }
          }
        }

      case 'location':
        return {
          type: 'location',
          location: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            name: payload.name,
            address: payload.address
          }
        }

      case 'contact':
        return {
          type: 'contacts',
          contacts: payload.contacts || [payload]
        }

      default:
        throw new Error(`Unsupported rich content type: ${richContent.type}`)
    }
  }

  /**
   * Converts a WhatsApp message to canonical format.
   *
   * @param whatsapp - The WhatsApp message
   * @param contact - The WhatsApp contact info
   * @param webhookMetadata - Webhook metadata (phone number ID, etc.)
   * @returns The canonical message
   */
  private toCanonicalFormat(
    whatsapp: WhatsAppMessage,
    contact: { profile: { name: string }; wa_id: string } | undefined,
    webhookMetadata: { phone_number_id: string; display_phone_number: string }
  ): CanonicalMessage {
    const now = new Date()

    // Determine content type and extract content
    const { contentType, content, media, richContent } = this.extractContent(whatsapp)

    // Build channel metadata
    const channelMetadata: WhatsAppChannelMetadata = {
      phoneNumber: whatsapp.from,
      profileName: contact?.profile?.name,
      phoneNumberId: webhookMetadata.phone_number_id,
      waId: contact?.wa_id
    }

    return {
      // Identity
      id: this.generateMessageId(),
      conversationId: '', // To be filled by the webhook processor

      // Channel information
      channelType: ChannelType.WHATSAPP,
      channelMessageId: whatsapp.id,

      // Direction and sender
      direction: 'inbound',
      senderType: 'contact',
      senderId: whatsapp.from,

      // Content
      contentType,
      content,
      media,
      richContent,

      // Threading
      replyToMessageId: whatsapp.context?.id,

      // Status
      status: 'delivered',

      // Metadata
      channelMetadata,

      // Timestamps
      timestamp: new Date(parseInt(whatsapp.timestamp) * 1000),
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Extracts content from a WhatsApp message into canonical format.
   */
  private extractContent(whatsapp: WhatsAppMessage): {
    contentType: ContentType
    content: string
    media?: MediaContent
    richContent?: RichContent
  } {
    switch (whatsapp.type) {
      case 'text':
        return {
          contentType: 'text',
          content: whatsapp.text?.body || ''
        }

      case 'image':
        return {
          contentType: 'media',
          content: whatsapp.image?.caption || '',
          media: this.extractMediaContent(whatsapp.image, 'image')
        }

      case 'video':
        return {
          contentType: 'media',
          content: whatsapp.video?.caption || '',
          media: this.extractMediaContent(whatsapp.video, 'video')
        }

      case 'audio':
        return {
          contentType: 'media',
          content: '',
          media: this.extractMediaContent(whatsapp.audio, 'audio')
        }

      case 'document':
        return {
          contentType: 'media',
          content: whatsapp.document?.caption || '',
          media: this.extractMediaContent(whatsapp.document, 'document')
        }

      case 'location':
        return {
          contentType: 'rich',
          content: whatsapp.location?.name || whatsapp.location?.address || 'Location shared',
          richContent: {
            type: 'location',
            payload: {
              latitude: whatsapp.location?.latitude,
              longitude: whatsapp.location?.longitude,
              name: whatsapp.location?.name,
              address: whatsapp.location?.address
            }
          }
        }

      case 'contacts':
        return {
          contentType: 'rich',
          content: whatsapp.contacts?.[0]?.name?.formatted_name || 'Contact shared',
          richContent: {
            type: 'contact',
            payload: {
              contacts: whatsapp.contacts
            }
          }
        }

      case 'button':
        return {
          contentType: 'rich',
          content: whatsapp.button?.text || '',
          richContent: {
            type: 'button',
            payload: {
              text: whatsapp.button?.text,
              payload: whatsapp.button?.payload
            }
          }
        }

      case 'interactive':
        return this.extractInteractiveContent(whatsapp)

      case 'sticker':
        return {
          contentType: 'media',
          content: 'Sticker',
          media: this.extractMediaContent(
            { id: '', mimeType: 'image/webp' },
            'image'
          )
        }

      default:
        return {
          contentType: 'text',
          content: `[Unsupported message type: ${whatsapp.type}]`
        }
    }
  }

  /**
   * Extracts media content from WhatsApp media object.
   */
  private extractMediaContent(
    media: { id: string; url?: string; mimeType: string; filename?: string; caption?: string; sha256?: string; fileSize?: number } | undefined,
    type: MediaType
  ): MediaContent | undefined {
    if (!media) return undefined

    return {
      type,
      url: media.url || `whatsapp://media/${media.id}`, // URL or reference
      mimeType: media.mimeType,
      filename: media.filename,
      size: media.fileSize
    }
  }

  /**
   * Extracts interactive content (button/list replies).
   */
  private extractInteractiveContent(whatsapp: WhatsAppMessage): {
    contentType: ContentType
    content: string
    richContent: RichContent
  } {
    if (whatsapp.interactive?.type === 'button_reply') {
      return {
        contentType: 'rich',
        content: whatsapp.interactive.button_reply?.title || '',
        richContent: {
          type: 'button',
          payload: {
            id: whatsapp.interactive.button_reply?.id,
            title: whatsapp.interactive.button_reply?.title
          }
        }
      }
    }

    if (whatsapp.interactive?.type === 'list_reply') {
      return {
        contentType: 'rich',
        content: whatsapp.interactive.list_reply?.title || '',
        richContent: {
          type: 'list',
          payload: {
            id: whatsapp.interactive.list_reply?.id,
            title: whatsapp.interactive.list_reply?.title,
            description: whatsapp.interactive.list_reply?.description
          }
        }
      }
    }

    return {
      contentType: 'text',
      content: '[Interactive message]',
      richContent: {
        type: 'button',
        payload: {}
      }
    }
  }

  /**
   * Parses and validates a WhatsApp webhook payload.
   *
   * @param payload - The raw webhook payload
   * @returns Parsed message, contact, and metadata
   */
  private parseWebhookPayload(payload: unknown): {
    message: WhatsAppMessage
    contact: { profile: { name: string }; wa_id: string } | undefined
    metadata: { phone_number_id: string; display_phone_number: string }
  } {
    // Validate basic structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: not an object')
    }

    const webhookPayload = payload as WhatsAppWebhookPayload

    if (webhookPayload.object !== 'whatsapp_business_account') {
      throw new Error(`Invalid webhook object type: ${webhookPayload.object}`)
    }

    if (!webhookPayload.entry || !Array.isArray(webhookPayload.entry) || webhookPayload.entry.length === 0) {
      throw new Error('Invalid webhook payload: missing entry array')
    }

    const entry = webhookPayload.entry[0]
    if (!entry.changes || !Array.isArray(entry.changes) || entry.changes.length === 0) {
      throw new Error('Invalid webhook payload: missing changes array')
    }

    const change = entry.changes[0]
    if (!change.value) {
      throw new Error('Invalid webhook payload: missing value object')
    }

    const value = change.value

    // Extract message
    if (!value.messages || !Array.isArray(value.messages) || value.messages.length === 0) {
      throw new Error('Invalid webhook payload: no messages found')
    }

    const message = value.messages[0]

    // Extract contact (optional)
    const contact = value.contacts?.[0]

    // Extract metadata
    const metadata = {
      phone_number_id: value.metadata.phone_number_id,
      display_phone_number: value.metadata.display_phone_number
    }

    return { message, contact, metadata }
  }

  // ============================================================================
  // Status Update Handling
  // ============================================================================

  /**
   * Parses a status update from WhatsApp webhook.
   *
   * @param payload - The raw webhook payload containing status updates
   * @returns Array of status updates
   */
  parseStatusUpdates(payload: unknown): Array<{
    channelMessageId: string
    status: MessageStatus
    timestamp: Date
    recipientId: string
    error?: { code: number; message: string }
  }> {
    const webhookPayload = payload as WhatsAppWebhookPayload

    if (!webhookPayload?.entry?.[0]?.changes?.[0]?.value?.statuses) {
      return []
    }

    const statuses = webhookPayload.entry[0].changes[0].value.statuses

    return statuses.map((status) => ({
      channelMessageId: status.id,
      status: this.mapWhatsAppStatus(status.status),
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      recipientId: status.recipient_id,
      error: status.errors?.[0]
        ? {
            code: status.errors[0].code,
            message: status.errors[0].message
          }
        : undefined
    }))
  }

  /**
   * Maps WhatsApp status to canonical message status.
   */
  private mapWhatsAppStatus(whatsappStatus: string): MessageStatus {
    switch (whatsappStatus) {
      case 'sent':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'read':
        return 'read'
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }
}
