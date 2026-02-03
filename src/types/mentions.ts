// Phase 11: Team Collaboration - @Mentions System
// TypeScript types for the mentions system

/**
 * Conversation note stored in database
 * Notes are internal team comments on conversations with @mention support
 */
export interface ConversationNote {
  id: string
  conversation_id: string
  organization_id: string
  content: string // HTML with mention data attributes
  content_plain: string // Plain text for search/preview
  created_by: string
  created_at: string
  updated_at: string
  // Joined data from profiles
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * Mention record tracking notification state
 * One record per mentioned user per note
 */
export interface Mention {
  id: string
  note_id: string
  conversation_id: string
  organization_id: string
  mentioned_user_id: string
  mentioning_user_id: string
  viewed_at: string | null // null = unread
  email_sent_at: string | null // null = email not sent
  created_at: string
}

/**
 * Mention with joined note and user data
 * Used for displaying notifications
 */
export interface MentionWithDetails extends Mention {
  conversation_notes?: {
    content_plain: string
    conversation_id: string
  }
  mentioning_user?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  conversations?: {
    id: string
    contact: {
      name: string | null
      phone_number: string
    }
  }
}

/**
 * Notification payload for real-time updates
 * Sent via Supabase Realtime when a new mention is created
 */
export interface MentionNotification {
  id: string
  type: 'mention'
  title: string
  message: string // Truncated note content
  conversation_id: string
  note_id: string
  mentioning_user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  created_at: string
  viewed: boolean
}

/**
 * Team member for mention suggestions (@autocomplete)
 */
export interface MentionSuggestion {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
}

/**
 * Create note request body
 */
export interface CreateNoteRequest {
  conversation_id: string
  content: string // HTML from Tiptap editor
}

/**
 * Create note response
 */
export interface CreateNoteResponse {
  note: ConversationNote
  mentions_created: number
}

/**
 * Update note request body
 */
export interface UpdateNoteRequest {
  content: string // HTML from Tiptap editor
}

/**
 * Mark mention as read request
 */
export interface MarkMentionReadRequest {
  mention_id: string
}

/**
 * Unread mentions count response
 */
export interface UnreadMentionsCount {
  count: number
}

/**
 * Parsed mention from HTML content
 * Used internally when processing note content
 */
export interface ParsedMention {
  user_id: string
  display_name: string
}

/**
 * Note with mentions expanded
 * Used when fetching notes with their associated mentions
 */
export interface NoteWithMentions extends ConversationNote {
  mentions: Mention[]
}
