/**
 * Channel Abstraction Layer Types
 * Purpose: Unified type definitions for multi-channel messaging system
 * Date: 2026-01-24
 */

// ============================================================================
// Enums and Type Literals
// ============================================================================

export enum ChannelType {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  SMS = 'sms'
}

export enum ChannelFeature {
  RICH_CONTENT = 'rich_content',
  MEDIA = 'media',
  READ_RECEIPTS = 'read_receipts',
  TYPING_INDICATORS = 'typing_indicators',
  LOCATION_SHARING = 'location_sharing',
  CONTACT_CARDS = 'contact_cards',
  REACTIONS = 'reactions'
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type MessageDirection = 'inbound' | 'outbound'

export type SenderType = 'contact' | 'agent' | 'system'

export type ContentType = 'text' | 'media' | 'rich' | 'system'

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export type RichContentType = 'button' | 'list' | 'location' | 'contact'

export type SyncStatus = 'active' | 'error' | 'disconnected'

// ============================================================================
// Media and Rich Content Interfaces
// ============================================================================

export interface MediaContent {
  type: MediaType
  url: string
  mimeType: string
  filename?: string
  thumbnailUrl?: string
  size?: number
}

export interface RichContent {
  type: RichContentType
  payload: Record<string, unknown>
}

// ============================================================================
// Canonical Message Interface
// Purpose: Standardized message format across all channels
// ============================================================================

export interface CanonicalMessage {
  // Identity
  id: string
  conversationId: string

  // Channel information
  channelType: ChannelType
  channelMessageId: string

  // Message direction and sender
  direction: MessageDirection
  senderType: SenderType
  senderId?: string

  // Content
  contentType: ContentType
  content: string
  media?: MediaContent
  richContent?: RichContent

  // Threading
  replyToMessageId?: string

  // Status tracking
  status: MessageStatus
  deliveredAt?: Date
  readAt?: Date

  // Error tracking
  failedReason?: string
  errorCode?: string
  errorMessage?: string
  retryCount?: number

  // Metadata
  channelMetadata: Record<string, unknown>

  // Timestamps
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Adapter Interface Results
// ============================================================================

export interface SendResult {
  success: boolean
  channelMessageId?: string
  error?: string
  retryable?: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface HealthStatus {
  isHealthy: boolean
  latency?: number
  rateLimit?: {
    remaining: number
    resetAt: Date
  }
  lastError?: string
}

// ============================================================================
// Channel Adapter Interface
// Purpose: Standard interface all channel adapters must implement
// ============================================================================

export interface ChannelAdapter {
  // Identity
  readonly channelType: ChannelType
  readonly name: string

  // Core operations
  send(message: CanonicalMessage): Promise<SendResult>
  receive(webhookPayload: unknown): Promise<CanonicalMessage>
  getStatus(channelMessageId: string): Promise<MessageStatus>

  // Feature support
  supportsFeature(feature: ChannelFeature): boolean
  getFeatures(): ChannelFeature[]

  // Validation and health
  validateMessage(message: CanonicalMessage): ValidationResult
  healthCheck(): Promise<HealthStatus>
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface ChannelConnection {
  id: string
  organization_id: string
  contact_id: string

  // Channel identity
  channel_type: ChannelType
  channel_identifier: string

  // Display metadata
  display_name?: string
  avatar_url?: string
  is_primary: boolean
  is_active: boolean

  // Channel-specific data
  channel_metadata: Record<string, unknown>

  // Activity tracking
  verified_at?: Date
  last_message_at?: Date
  message_count: number

  // Timestamps
  created_at: Date
  updated_at: Date
}

export interface ChannelMessage {
  id: string
  organization_id: string
  conversation_id: string
  channel_connection_id: string

  // Channel message identity
  channel_message_id: string

  // Message direction and sender
  direction: MessageDirection
  sender_type: SenderType
  sender_id?: string

  // Message content
  content_type: ContentType
  content: string
  media?: MediaContent
  rich_content?: RichContent

  // Threading
  reply_to_message_id?: string

  // Delivery status
  status: MessageStatus
  delivered_at?: Date
  read_at?: Date

  // Error tracking
  failed_reason?: string
  error_code?: string
  error_message?: string
  retry_count: number

  // Channel-specific metadata
  channel_metadata: Record<string, unknown>

  // Timestamps
  created_at: Date
  updated_at: Date
}

export interface ChannelAdapterConfig {
  id: string
  organization_id: string

  // Channel type
  channel_type: ChannelType

  // Authentication (encrypted tokens)
  access_token_encrypted?: string
  refresh_token_encrypted?: string

  // Channel-specific IDs
  phone_number_id?: string
  business_account_id?: string
  page_id?: string
  webhook_verify_token?: string

  // Additional configuration
  config: Record<string, unknown>

  // Status
  is_active: boolean
  last_sync_at?: Date
  sync_status?: SyncStatus
  sync_error?: string

  // Features supported by this configuration
  features: ChannelFeature[]

  // Timestamps
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Adapter Factory and Registry Types
// ============================================================================

export interface AdapterFactory {
  createAdapter(config: ChannelAdapterConfig): ChannelAdapter
  getSupportedChannelType(): ChannelType
}

export interface AdapterRegistry {
  register(factory: AdapterFactory): void
  getAdapter(channelType: ChannelType, organizationId: string): Promise<ChannelAdapter | null>
  getAllAdapters(organizationId: string): Promise<ChannelAdapter[]>
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface WebhookPayload {
  channelType: ChannelType
  organizationId: string
  rawPayload: unknown
  timestamp: Date
}

export interface ProcessedWebhookResult {
  success: boolean
  messages?: CanonicalMessage[]
  statusUpdates?: Array<{
    channelMessageId: string
    status: MessageStatus
    timestamp: Date
  }>
  error?: string
}
