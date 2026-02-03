// Phase 14: Facebook Messenger Channel
// TypeScript types for Facebook Messenger integration via Meta Graph API

/**
 * Facebook Page connection stored in database
 */
export interface FacebookConnection {
  id: string
  organization_id: string
  page_id: string // Facebook Page ID
  page_name: string
  page_access_token_hash: string // Encrypted Page Access Token
  user_access_token_hash?: string // Encrypted User Access Token (for token refresh)
  token_expires_at: string | null
  scopes: string[]
  is_active: boolean
  webhook_subscribed: boolean
  // Handover protocol settings
  app_id: string // Meta App ID for handover
  secondary_receivers: string[] // App IDs that can receive thread control
  created_at: string
  updated_at: string
}

/**
 * Facebook Messenger conversation
 */
export interface FacebookConversation {
  id: string
  facebook_connection_id: string
  organization_id: string
  psid: string // Page-Scoped User ID
  user_name: string | null
  user_profile_pic: string | null
  last_message_at: string
  unread_count: number
  is_active: boolean
  // Thread control
  thread_owner: 'app' | 'page_inbox' | 'secondary_app'
  thread_owner_app_id: string | null
  // Link to unified conversation
  conversation_id: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Facebook Messenger message
 */
export interface FacebookMessage {
  id: string
  facebook_conversation_id: string
  facebook_message_id: string
  direction: 'inbound' | 'outbound'
  sender_id: string
  recipient_id: string
  // Content
  message_type: FacebookMessageType
  text: string | null
  // Media
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | 'file' | null
  // Template (for outbound)
  template_type: string | null
  template_payload: Record<string, unknown> | null
  // Quick replies
  quick_reply_payload: string | null
  // Postback
  postback_payload: string | null
  postback_title: string | null
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_code: string | null
  error_message: string | null
  // Timestamps
  facebook_timestamp: string
  delivered_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export type FacebookMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'template'
  | 'quick_reply'
  | 'postback'
  | 'sticker'
  | 'location'
  | 'referral'

/**
 * Messenger template stored for organization
 */
export interface MessengerTemplate {
  id: string
  organization_id: string
  facebook_connection_id: string
  name: string
  template_type: 'generic' | 'button' | 'media' | 'receipt' | 'airline_boardingpass'
  template_payload: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// Meta Graph API Types
// =============================================================================

/**
 * Webhook message payload from Meta
 */
export interface FacebookWebhookPayload {
  object: 'page'
  entry: FacebookWebhookEntry[]
}

export interface FacebookWebhookEntry {
  id: string // Page ID
  time: number
  messaging?: FacebookMessagingEvent[]
  standby?: FacebookMessagingEvent[] // Messages when not thread owner
  changes?: FacebookChangeEvent[]
}

export interface FacebookMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: FacebookIncomingMessage
  delivery?: { mids: string[]; watermark: number }
  read?: { watermark: number }
  postback?: { payload: string; title: string }
  referral?: { ref: string; source: string; type: string }
  pass_thread_control?: { new_owner_app_id: string; metadata?: string }
  take_thread_control?: { previous_owner_app_id: string; metadata?: string }
  request_thread_control?: { requested_owner_app_id: string; metadata?: string }
}

export interface FacebookIncomingMessage {
  mid: string
  text?: string
  attachments?: FacebookAttachment[]
  quick_reply?: { payload: string }
  reply_to?: { mid: string }
  is_echo?: boolean
  app_id?: number // Present in echoes
  is_deleted?: boolean
  sticker_id?: number
}

export interface FacebookAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'fallback' | 'template'
  payload: {
    url?: string
    sticker_id?: number
    coordinates?: { lat: number; long: number }
    title?: string
    // Template payload
    template_type?: string
    elements?: unknown[]
  }
}

export interface FacebookChangeEvent {
  field: string
  value: Record<string, unknown>
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Send Messenger message request
 */
export interface SendFacebookMessageRequest {
  recipient: { id: string }
  message: {
    text?: string
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file' | 'template'
      payload: Record<string, unknown>
    }
    quick_replies?: Array<{
      content_type: 'text' | 'user_phone_number' | 'user_email'
      title?: string
      payload?: string
      image_url?: string
    }>
  }
  messaging_type: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG'
  tag?: string // Required for MESSAGE_TAG
}

/**
 * Send Messenger message response
 */
export interface SendFacebookMessageResponse {
  recipient_id: string
  message_id: string
}

/**
 * User profile from Graph API
 */
export interface FacebookUserProfile {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  profile_pic?: string
  locale?: string
  timezone?: number
  gender?: string
}

// =============================================================================
// Handover Protocol Types
// =============================================================================

/**
 * Thread control operation types
 */
export type ThreadControlAction = 'pass' | 'take' | 'request'

/**
 * Pass thread control request
 */
export interface PassThreadControlRequest {
  recipient: { id: string }
  target_app_id: string
  metadata?: string
}

/**
 * Take thread control request
 */
export interface TakeThreadControlRequest {
  recipient: { id: string }
  metadata?: string
}

/**
 * Thread owner info
 */
export interface ThreadOwnerInfo {
  app_id: string
  is_secondary_receiver: boolean
}

// =============================================================================
// Template Types
// =============================================================================

/**
 * Generic template for product cards, articles, etc.
 */
export interface GenericTemplate {
  template_type: 'generic'
  elements: Array<{
    title: string
    subtitle?: string
    image_url?: string
    default_action?: {
      type: 'web_url'
      url: string
      webview_height_ratio?: 'compact' | 'tall' | 'full'
    }
    buttons?: TemplateButton[]
  }>
}

/**
 * Button template for text with buttons
 */
export interface ButtonTemplate {
  template_type: 'button'
  text: string
  buttons: TemplateButton[]
}

/**
 * Media template for images/videos with buttons
 */
export interface MediaTemplate {
  template_type: 'media'
  elements: Array<{
    media_type: 'image' | 'video'
    url?: string
    attachment_id?: string
    buttons?: TemplateButton[]
  }>
}

export type TemplateButton =
  | { type: 'web_url'; title: string; url: string; webview_height_ratio?: string }
  | { type: 'postback'; title: string; payload: string }
  | { type: 'phone_number'; title: string; payload: string }
  | { type: 'account_link'; url: string }
  | { type: 'account_unlink' }
