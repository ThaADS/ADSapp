// Phase 13: Instagram DM Channel
// TypeScript types for Instagram integration via Meta Graph API

/**
 * Instagram connection stored in database
 */
export interface InstagramConnection {
  id: string
  organization_id: string
  instagram_user_id: string
  instagram_username: string
  page_id: string // Connected Facebook Page ID
  page_name: string
  access_token_hash: string // Encrypted long-lived token
  token_expires_at: string | null
  scopes: string[]
  is_active: boolean
  webhook_subscribed: boolean
  created_at: string
  updated_at: string
}

/**
 * Instagram conversation/thread
 */
export interface InstagramConversation {
  id: string
  instagram_connection_id: string
  organization_id: string
  thread_id: string // Instagram conversation thread ID
  participant_id: string // Instagram user ID of the customer
  participant_username: string | null
  participant_name: string | null
  participant_profile_pic: string | null
  last_message_at: string
  unread_count: number
  is_active: boolean
  // Link to unified conversation
  conversation_id: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Instagram DM message
 */
export interface InstagramMessage {
  id: string
  instagram_conversation_id: string
  instagram_message_id: string
  direction: 'inbound' | 'outbound'
  sender_id: string
  recipient_id: string
  // Content
  message_type: InstagramMessageType
  text: string | null
  // Media (for images, videos, stickers)
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | 'sticker' | null
  // Story reference
  story_id: string | null
  story_url: string | null
  // Reply reference
  reply_to_message_id: string | null
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_code: string | null
  error_message: string | null
  // Timestamps
  instagram_timestamp: string
  delivered_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export type InstagramMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'story_mention'
  | 'story_reply'
  | 'share' // Shared post/reel
  | 'like' // Heart reaction

/**
 * Instagram webhook event types
 */
export type InstagramWebhookEvent =
  | 'messages' // New DM received
  | 'messaging_seen' // Message read receipt
  | 'messaging_postbacks' // Button click
  | 'comments' // Comment on media
  | 'mentions' // @mention in story

/**
 * Comment-to-DM automation rule
 */
export interface InstagramCommentRule {
  id: string
  organization_id: string
  instagram_connection_id: string
  name: string
  is_active: boolean
  // Trigger conditions
  trigger_keywords: string[] // Keywords to match in comments
  trigger_media_ids: string[] | null // Specific posts/reels, null = all
  // Response
  dm_template: string // Message template to send
  dm_delay_seconds: number // Delay before sending (0 = immediate)
  // Limits
  max_per_user_per_day: number // Prevent spam
  // Stats
  trigger_count: number
  dm_sent_count: number
  created_at: string
  updated_at: string
}

/**
 * Story mention notification
 */
export interface InstagramStoryMention {
  id: string
  instagram_connection_id: string
  organization_id: string
  story_id: string
  story_url: string
  mentioned_by_id: string
  mentioned_by_username: string
  mentioned_at: string
  // Response tracking
  responded: boolean
  response_conversation_id: string | null
  created_at: string
}

// =============================================================================
// Meta Graph API Types
// =============================================================================

/**
 * Instagram Business Account info from Graph API
 */
export interface InstagramBusinessAccount {
  id: string
  username: string
  name: string
  profile_picture_url: string
  followers_count: number
  media_count: number
}

/**
 * Webhook message payload from Meta
 */
export interface InstagramWebhookPayload {
  object: 'instagram'
  entry: InstagramWebhookEntry[]
}

export interface InstagramWebhookEntry {
  id: string // Instagram Business Account ID
  time: number
  messaging?: InstagramMessagingEvent[]
  changes?: InstagramChangeEvent[]
}

export interface InstagramMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: InstagramIncomingMessage
  read?: { watermark: number }
  postback?: { payload: string }
}

export interface InstagramIncomingMessage {
  mid: string
  text?: string
  attachments?: InstagramAttachment[]
  reply_to?: { mid: string }
  is_echo?: boolean
  is_deleted?: boolean
  // Story mentions
  story_mention?: {
    id: string
    link: string
  }
}

export interface InstagramAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'story_mention' | 'share'
  payload: {
    url?: string
    sticker_id?: number
    // For story_mention
    id?: string
    link?: string
    // For share
    title?: string
  }
}

export interface InstagramChangeEvent {
  field: 'comments' | 'mentions' | 'story_insights'
  value: {
    // Comments
    id?: string
    text?: string
    from?: { id: string; username: string }
    media?: { id: string }
    // Mentions
    story_id?: string
    mentioned_by?: { id: string; username: string }
  }
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Connect Instagram request
 */
export interface ConnectInstagramRequest {
  access_token: string
  page_id: string
}

/**
 * Send Instagram DM request
 */
export interface SendInstagramMessageRequest {
  recipient_id: string
  message: {
    text?: string
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file'
      payload: {
        url: string
        is_reusable?: boolean
      }
    }
  }
}

/**
 * Send Instagram DM response
 */
export interface SendInstagramMessageResponse {
  recipient_id: string
  message_id: string
}

/**
 * Instagram conversation list response
 */
export interface InstagramConversationsResponse {
  data: Array<{
    id: string
    participants: {
      data: Array<{
        id: string
        username: string
        name: string
        profile_pic: string
      }>
    }
    messages: {
      data: Array<{
        id: string
        message: string
        from: { id: string; username: string }
        created_time: string
      }>
    }
    updated_time: string
  }>
  paging?: {
    cursors: { before: string; after: string }
    next?: string
  }
}

/**
 * Rate limit tracking
 */
export interface InstagramRateLimitInfo {
  organization_id: string
  messages_sent_this_hour: number
  hour_window_start: string
  limit: number // 200 messages/hour for most accounts
}
