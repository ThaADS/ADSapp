/**
 * Twilio WhatsApp Types
 * Purpose: Type definitions for Twilio WhatsApp integration
 * Date: 2026-02-03
 */

// =============================================================================
// Webhook Payload Types
// =============================================================================

export interface TwilioWhatsAppWebhookPayload {
  // Message identification
  MessageSid: string
  SmsSid?: string
  AccountSid: string

  // Parties
  From: string // whatsapp:+1234567890
  To: string // whatsapp:+0987654321

  // Content
  Body?: string
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
  MediaUrl1?: string
  MediaContentType1?: string
  MediaUrl2?: string
  MediaContentType2?: string
  MediaUrl3?: string
  MediaContentType3?: string
  MediaUrl4?: string
  MediaContentType4?: string
  MediaUrl5?: string
  MediaContentType5?: string
  MediaUrl6?: string
  MediaContentType6?: string
  MediaUrl7?: string
  MediaContentType7?: string
  MediaUrl8?: string
  MediaContentType8?: string
  MediaUrl9?: string
  MediaContentType9?: string

  // Status callback fields
  MessageStatus?: TwilioWhatsAppMessageStatus
  ErrorCode?: string
  ErrorMessage?: string

  // Additional metadata
  ProfileName?: string
  WaId?: string // WhatsApp ID (phone without prefix)
  Forwarded?: string
  FrequentlyForwarded?: string

  // Button response (for interactive messages)
  ButtonText?: string
  ButtonPayload?: string

  // Location message
  Latitude?: string
  Longitude?: string
  Address?: string

  // Twilio metadata
  ApiVersion?: string
  SmsStatus?: string
}

// =============================================================================
// Message Types
// =============================================================================

export interface TwilioWhatsAppOutboundMessage {
  to: string
  body?: string
  mediaUrl?: string
  contentSid?: string
  contentVariables?: Record<string, string>
}

export interface TwilioWhatsAppInboundMessage {
  messageSid: string
  accountSid: string
  from: string // Phone number without whatsapp: prefix
  to: string // Phone number without whatsapp: prefix
  body: string
  numMedia: number
  mediaUrls: string[]
  mediaContentTypes: string[]
  profileName?: string
  waId?: string
  timestamp: Date
  // Location message fields
  latitude?: number
  longitude?: number
  address?: string
  // Button response fields
  buttonText?: string
  buttonPayload?: string
}

// =============================================================================
// Status Types
// =============================================================================

export type TwilioWhatsAppMessageStatus =
  | 'accepted'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'undelivered'

export interface TwilioWhatsAppStatusUpdate {
  messageSid: string
  status: TwilioWhatsAppMessageStatus
  errorCode?: string
  errorMessage?: string
  timestamp: Date
}

// =============================================================================
// Connection Types
// =============================================================================

export interface TwilioWhatsAppConnection {
  id: string
  organizationId: string
  twilioAccountSid: string
  whatsappNumber: string
  whatsappNumberSid?: string
  friendlyName?: string
  isActive: boolean
  webhookConfigured: boolean
  lastVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Database row type (snake_case for Supabase)
export interface TwilioWhatsAppConnectionRow {
  id: string
  organization_id: string
  twilio_account_sid: string
  twilio_auth_token_hash: string
  whatsapp_number: string
  whatsapp_number_sid?: string | null
  friendly_name?: string | null
  is_active: boolean
  webhook_configured: boolean
  last_verified_at?: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Webhook Event Types (Idempotency)
// =============================================================================

export type TwilioWebhookEventType = 'message' | 'status'

export type TwilioWebhookEventStatus = 'pending' | 'processed' | 'failed'

export interface TwilioWhatsAppWebhookEvent {
  id: string
  connectionId: string
  messageSid: string
  eventType: TwilioWebhookEventType
  payloadHash?: string
  processedAt?: Date
  status: TwilioWebhookEventStatus
  errorMessage?: string
  createdAt: Date
}

// Database row type (snake_case for Supabase)
export interface TwilioWhatsAppWebhookEventRow {
  id: string
  connection_id: string
  message_sid: string
  event_type: TwilioWebhookEventType
  payload_hash?: string | null
  processed_at?: string | null
  status: TwilioWebhookEventStatus
  error_message?: string | null
  created_at: string
}

// =============================================================================
// Error Types
// =============================================================================

export interface TwilioWhatsAppError {
  code: number
  message: string
  moreInfo?: string
  status?: number
}

// Common Twilio WhatsApp error codes
export const TWILIO_WHATSAPP_ERROR_CODES = {
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 63016,

  // Number/recipient issues
  INVALID_TO_NUMBER: 21211,
  UNVERIFIED_DESTINATION: 21608,
  NUMBER_NOT_WHATSAPP: 63003,
  RECIPIENT_OPTED_OUT: 21610,

  // Template issues
  TEMPLATE_NOT_FOUND: 63005,
  TEMPLATE_NOT_APPROVED: 63006,
  TEMPLATE_REJECTED: 63007,
  OUTSIDE_SESSION_WINDOW: 63032,

  // Content issues
  MEDIA_NOT_ACCESSIBLE: 63001,
  MEDIA_TOO_LARGE: 63002,
  MESSAGE_TOO_LONG: 21617,

  // Account/configuration
  INSUFFICIENT_PERMISSIONS: 20003,
  ACCOUNT_SUSPENDED: 20005,
  AUTHENTICATION_FAILED: 20001,
} as const

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Helper to parse webhook payload media URLs
 */
export function parseMediaFromWebhook(payload: TwilioWhatsAppWebhookPayload): {
  urls: string[]
  contentTypes: string[]
  count: number
} {
  const numMedia = parseInt(payload.NumMedia || '0', 10)
  const urls: string[] = []
  const contentTypes: string[] = []

  for (let i = 0; i < numMedia && i < 10; i++) {
    const urlKey = `MediaUrl${i}` as keyof TwilioWhatsAppWebhookPayload
    const typeKey = `MediaContentType${i}` as keyof TwilioWhatsAppWebhookPayload

    const url = payload[urlKey]
    const contentType = payload[typeKey]

    if (typeof url === 'string') {
      urls.push(url)
      contentTypes.push(typeof contentType === 'string' ? contentType : 'application/octet-stream')
    }
  }

  return { urls, contentTypes, count: urls.length }
}

/**
 * Parse phone number from Twilio whatsapp: format
 */
export function parseWhatsAppNumber(twilioNumber: string): string {
  // Remove "whatsapp:" prefix if present
  return twilioNumber.replace(/^whatsapp:/, '')
}

/**
 * Convert webhook payload to inbound message
 */
export function webhookToInboundMessage(
  payload: TwilioWhatsAppWebhookPayload
): TwilioWhatsAppInboundMessage {
  const media = parseMediaFromWebhook(payload)

  return {
    messageSid: payload.MessageSid,
    accountSid: payload.AccountSid,
    from: parseWhatsAppNumber(payload.From),
    to: parseWhatsAppNumber(payload.To),
    body: payload.Body || '',
    numMedia: media.count,
    mediaUrls: media.urls,
    mediaContentTypes: media.contentTypes,
    profileName: payload.ProfileName,
    waId: payload.WaId,
    timestamp: new Date(),
    // Location fields
    latitude: payload.Latitude ? parseFloat(payload.Latitude) : undefined,
    longitude: payload.Longitude ? parseFloat(payload.Longitude) : undefined,
    address: payload.Address,
    // Button response
    buttonText: payload.ButtonText,
    buttonPayload: payload.ButtonPayload,
  }
}

/**
 * Check if message status is terminal (no more updates expected)
 */
export function isTerminalStatus(status: TwilioWhatsAppMessageStatus): boolean {
  return ['delivered', 'read', 'failed', 'undelivered'].includes(status)
}

/**
 * Check if message was successfully delivered
 */
export function isSuccessStatus(status: TwilioWhatsAppMessageStatus): boolean {
  return ['sent', 'delivered', 'read'].includes(status)
}

/**
 * Check if message delivery failed
 */
export function isFailureStatus(status: TwilioWhatsAppMessageStatus): boolean {
  return ['failed', 'undelivered'].includes(status)
}

// =============================================================================
// Template Types
// =============================================================================

export interface TwilioWhatsAppTemplate {
  id: string
  organizationId: string
  connectionId: string
  contentSid: string
  friendlyName: string
  language: string
  templateType: TwilioTemplateType
  body: string | null
  variables: TwilioTemplateVariable[]
  mediaUrl: string | null
  mediaType: string | null
  actions: TwilioTemplateAction[]
  approvalStatus: 'approved' | 'pending' | 'rejected'
  lastSyncedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type TwilioTemplateType =
  | 'twilio/text'
  | 'twilio/media'
  | 'twilio/quick-reply'
  | 'twilio/call-to-action'
  | 'twilio/list-picker'
  | 'twilio/card'

export interface TwilioTemplateVariable {
  key: string        // e.g., "1", "2", "3"
  name?: string      // Optional friendly name
  defaultValue?: string
}

export interface TwilioTemplateAction {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  title: string
  url?: string
  phoneNumber?: string
}

export interface TwilioTemplateSend {
  id: string
  organizationId: string
  templateId: string
  messageId: string | null
  conversationId: string | null
  contactId: string | null
  variablesUsed: Record<string, string>
  twilioMessageSid: string | null
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  errorCode: string | null
  errorMessage: string | null
  sentAt: Date
  deliveredAt: Date | null
  createdAt: Date
}

// Database row types
export interface TwilioWhatsAppTemplateRow {
  id: string
  organization_id: string
  connection_id: string
  content_sid: string
  friendly_name: string
  language: string
  template_type: string
  body: string | null
  variables: TwilioTemplateVariable[]
  media_url: string | null
  media_type: string | null
  actions: TwilioTemplateAction[]
  approval_status: string
  last_synced_at: string
  raw_response: unknown
  created_at: string
  updated_at: string
}

export interface TwilioTemplateSendRow {
  id: string
  organization_id: string
  template_id: string
  message_id: string | null
  conversation_id: string | null
  contact_id: string | null
  variables_used: Record<string, string>
  twilio_message_sid: string | null
  status: string
  error_code: string | null
  error_message: string | null
  sent_at: string
  delivered_at: string | null
  created_at: string
}

// Content API response types
export interface TwilioContentApiTemplate {
  sid: string
  account_sid: string
  friendly_name: string
  language: string
  variables: Record<string, string>
  types: Record<string, TwilioContentType>
  url: string
  date_created: string
  date_updated: string
}

export interface TwilioContentType {
  body?: string
  media?: string[]
  actions?: TwilioContentAction[]
}

export interface TwilioContentAction {
  type: string
  title: string
  url?: string
  phone?: string
}

// =============================================================================
// Message Status Types (Phase 23)
// =============================================================================

/**
 * Message status history entry
 */
export interface TwilioMessageStatusHistory {
  id: string
  organizationId: string
  messageId: string | null
  channelMessageId: string
  status: TwilioWhatsAppMessageStatus
  previousStatus: TwilioWhatsAppMessageStatus | null
  errorCode: string | null
  errorMessage: string | null
  twilioTimestamp: Date | null
  createdAt: Date
}

/**
 * Database row for status history
 */
export interface TwilioMessageStatusHistoryRow {
  id: string
  organization_id: string
  message_id: string | null
  channel_message_id: string
  status: string
  previous_status: string | null
  error_code: string | null
  error_message: string | null
  twilio_timestamp: string | null
  raw_payload: unknown
  created_at: string
}

/**
 * Twilio error code information
 */
export interface TwilioErrorInfo {
  code: string
  message: string
  userMessage: string
  retryable: boolean
  retryAfterSeconds: number | null
  category: 'invalid_number' | 'rate_limit' | 'policy' | 'network' | 'unknown'
}

/**
 * Database row for error codes
 */
export interface TwilioErrorCodeRow {
  code: string
  message: string
  user_message: string
  retryable: boolean
  retry_after_seconds: number | null
  category: string
  created_at: string
  updated_at: string
}

/**
 * Message status response for API
 */
export interface MessageStatusResponse {
  messageId: string
  channelMessageId: string
  currentStatus: TwilioWhatsAppMessageStatus
  timestamps: {
    created: string
    sent: string | null
    delivered: string | null
    read: string | null
  }
  error: {
    code: string
    message: string
    userMessage: string
    retryable: boolean
  } | null
  history: Array<{
    status: TwilioWhatsAppMessageStatus
    timestamp: string
    errorCode?: string
  }>
}

/**
 * Retry message request
 */
export interface RetryMessageRequest {
  messageId: string
}

/**
 * Retry message response
 */
export interface RetryMessageResponse {
  success: boolean
  newMessageId?: string
  newChannelMessageId?: string
  error?: string
}

/**
 * Bulk retry response
 */
export interface BulkRetryResponse {
  retried: number
  failed: number
  skipped: number
  results: Array<{
    originalMessageId: string
    newMessageId?: string
    success: boolean
    error?: string
  }>
}

/**
 * Convert status history row to object
 */
export function rowToStatusHistory(row: TwilioMessageStatusHistoryRow): TwilioMessageStatusHistory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    messageId: row.message_id,
    channelMessageId: row.channel_message_id,
    status: row.status as TwilioWhatsAppMessageStatus,
    previousStatus: row.previous_status as TwilioWhatsAppMessageStatus | null,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    twilioTimestamp: row.twilio_timestamp ? new Date(row.twilio_timestamp) : null,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Convert error code row to object
 */
export function rowToErrorInfo(row: TwilioErrorCodeRow): TwilioErrorInfo {
  return {
    code: row.code,
    message: row.message,
    userMessage: row.user_message,
    retryable: row.retryable,
    retryAfterSeconds: row.retry_after_seconds,
    category: row.category as TwilioErrorInfo['category'],
  }
}
