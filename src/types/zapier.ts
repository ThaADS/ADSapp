/**
 * Zapier Integration Type Definitions
 *
 * These types define the webhook subscription system and action APIs
 * for Zapier integration with ADSapp.
 */

// =====================================================
// Event Types
// =====================================================

/**
 * Event types that can trigger webhooks
 */
export type ZapierEventType =
  | 'message.received'
  | 'message.status_changed'
  | 'contact.created'
  | 'contact.updated'

/**
 * Filter operator for tag/segment filtering
 */
export type FilterOperator = 'any_of' | 'all_of' | 'none_of'

/**
 * Webhook delivery status
 */
export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'abandoned'

// =====================================================
// Database Entity Types
// =====================================================

/**
 * Webhook subscription (REST Hook)
 */
export interface ZapierSubscription {
  id: string
  organization_id: string
  user_id: string
  access_token_id?: string
  event_type: ZapierEventType
  target_url: string
  filter_tags?: string[]
  filter_segments?: string[]
  filter_operator: FilterOperator
  is_active: boolean
  last_triggered_at?: string
  trigger_count: number
  error_count: number
  last_error?: string
  last_error_at?: string
  created_at: string
  updated_at: string
}

/**
 * Webhook delivery log
 */
export interface ZapierWebhookDelivery {
  id: string
  subscription_id: string
  organization_id: string
  event_type: ZapierEventType
  event_id: string
  payload: WebhookPayload
  attempt_count: number
  status: WebhookDeliveryStatus
  response_status?: number
  response_body?: string
  delivered_at?: string
  next_retry_at?: string
  created_at: string
}

// =====================================================
// Webhook Payload Structures
// =====================================================

/**
 * Base webhook payload structure
 */
export interface WebhookPayload {
  id: string
  event: ZapierEventType
  timestamp: string
  organization_id: string
  data: MessageReceivedData | MessageStatusData | ContactCreatedData | ContactUpdatedData
}

/**
 * Payload for message.received event
 */
export interface MessageReceivedData {
  message_id: string
  conversation_id: string
  contact: {
    id: string
    name: string
    phone: string
  }
  content: {
    type: 'text' | 'media' | 'rich'
    text?: string
    media_url?: string
  }
  channel: string
  received_at: string
}

/**
 * Payload for message.status_changed event
 */
export interface MessageStatusData {
  message_id: string
  conversation_id: string
  old_status: string
  new_status: string
  timestamp: string
}

/**
 * Payload for contact.created event
 */
export interface ContactCreatedData {
  contact_id: string
  name: string
  phone: string
  email?: string
  tags: string[]
  created_at: string
}

/**
 * Payload for contact.updated event
 */
export interface ContactUpdatedData {
  contact_id: string
  changes: Record<string, { old: unknown; new: unknown }>
  updated_at: string
}

// =====================================================
// REST Hook Subscribe/Unsubscribe
// =====================================================

/**
 * Subscribe request (from Zapier)
 * POST /api/zapier/hooks/subscribe
 */
export interface SubscribeRequest {
  event: ZapierEventType
  hookUrl: string
  filters?: {
    tags?: {
      operator?: FilterOperator
      values: string[]
    }
    segments?: string[]
  }
}

/**
 * Subscribe response
 */
export interface SubscribeResponse {
  id: string
  event: ZapierEventType
  hookUrl: string
  active: boolean
  createdAt: string
}

// =====================================================
// Action: Send Message
// =====================================================

/**
 * Send message action request
 * POST /api/zapier/actions/send-message
 */
export interface SendMessageRequest {
  to: string
  channel?: 'whatsapp'
  message?: {
    type: 'text'
    text: string
  }
  template?: {
    name: string
    language: string
    components?: Array<{
      type: string
      parameters: Array<{
        type: string
        text?: string
      }>
    }>
  }
}

/**
 * Send message action response
 */
export interface SendMessageResponse {
  success: boolean
  message_id?: string
  status?: string
  sent_at?: string
  error?: ZapierActionError
}

// =====================================================
// Action: Create Contact
// =====================================================

/**
 * Create contact action request
 * POST /api/zapier/actions/contacts
 */
export interface CreateContactRequest {
  name: string
  phone: string
  email?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

/**
 * Create contact action response
 */
export interface CreateContactResponse {
  success: boolean
  contact?: {
    id: string
    name: string
    phone: string
    email?: string
    tags: string[]
    custom_fields: Record<string, unknown>
    created_at: string
  }
  error?: ZapierActionError
}

// =====================================================
// Action: Update Contact
// =====================================================

/**
 * Update contact action request
 * PUT /api/zapier/actions/contacts/{id}
 */
export interface UpdateContactRequest {
  name?: string
  email?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

/**
 * Update contact action response
 */
export interface UpdateContactResponse {
  success: boolean
  contact?: {
    id: string
    name: string
    phone: string
    email?: string
    tags: string[]
    custom_fields: Record<string, unknown>
    updated_at: string
  }
  error?: ZapierActionError
}

// =====================================================
// Error Handling
// =====================================================

/**
 * Standardized error response for actions
 */
export interface ZapierActionError {
  code: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR'
  message: string
  field?: string
}

// =====================================================
// Rate Limiting
// =====================================================

/**
 * Rate limit information in response headers
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number  // Unix timestamp
}

// =====================================================
// Webhook Configuration
// =====================================================

/**
 * Retry configuration for webhook delivery
 * Delays in milliseconds: 1s, 5s, 30s, 5m, 30m
 */
export const WEBHOOK_RETRY_DELAYS = [1000, 5000, 30000, 300000, 1800000] as const

/**
 * Maximum retry attempts for webhook delivery
 */
export const MAX_WEBHOOK_RETRIES = WEBHOOK_RETRY_DELAYS.length

/**
 * Webhook delivery timeout in milliseconds
 */
export const WEBHOOK_TIMEOUT = 15000  // 15 seconds
