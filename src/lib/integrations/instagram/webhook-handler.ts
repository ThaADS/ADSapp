/**
 * Instagram Webhook Handler
 * Purpose: Process incoming Instagram DM webhooks with idempotency
 * Date: 2026-01-28
 */

import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getInstagramConnectionByUserId } from './client'
import type {
  InstagramWebhookPayload,
  InstagramWebhookEntry,
  InstagramMessagingEvent,
  InstagramChangeEvent,
  InstagramConnection
} from '@/types/instagram'

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verifies Instagram webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('META_APP_SECRET not configured')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex')

  // Signature format: "sha256=<hash>"
  const providedHash = signature.replace('sha256=', '')

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedHash)
  )
}

/**
 * Handles webhook verification challenge (GET request)
 */
export function handleVerificationChallenge(
  mode: string,
  token: string,
  challenge: string
): string | null {
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return challenge
  }

  return null
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Checks if webhook event has already been processed
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('instagram_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single()

  return !!data
}

/**
 * Records webhook event for idempotency
 */
async function recordWebhookEvent(
  eventId: string,
  eventType: string,
  connectionId: string | null,
  payloadHash: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('instagram_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      instagram_connection_id: connectionId,
      payload_hash: payloadHash,
      status: 'pending'
    })
}

/**
 * Marks webhook event as processed
 */
async function markEventProcessed(
  eventId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('instagram_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      status: success ? 'processed' : 'failed',
      error_message: errorMessage
    })
    .eq('event_id', eventId)
}

// =============================================================================
// Main Webhook Handler
// =============================================================================

export interface WebhookProcessingResult {
  success: boolean
  processed: number
  errors: string[]
}

/**
 * Processes Instagram webhook payload
 */
export async function processInstagramWebhook(
  payload: InstagramWebhookPayload
): Promise<WebhookProcessingResult> {
  const results: WebhookProcessingResult = {
    success: true,
    processed: 0,
    errors: []
  }

  if (payload.object !== 'instagram') {
    results.errors.push('Invalid webhook object type')
    results.success = false
    return results
  }

  for (const entry of payload.entry) {
    try {
      await processWebhookEntry(entry, results)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`Entry ${entry.id}: ${message}`)
    }
  }

  results.success = results.errors.length === 0
  return results
}

/**
 * Processes a single webhook entry
 */
async function processWebhookEntry(
  entry: InstagramWebhookEntry,
  results: WebhookProcessingResult
): Promise<void> {
  const instagramUserId = entry.id

  // Get connection for this Instagram account
  const connection = await getInstagramConnectionByUserId(instagramUserId)
  if (!connection) {
    results.errors.push(`No connection found for Instagram user ${instagramUserId}`)
    return
  }

  // Process messaging events (DMs)
  if (entry.messaging) {
    for (const event of entry.messaging) {
      await processMessagingEvent(event, connection, entry.time, results)
    }
  }

  // Process change events (comments, mentions)
  if (entry.changes) {
    for (const change of entry.changes) {
      await processChangeEvent(change, connection, entry.time, results)
    }
  }
}

// =============================================================================
// Messaging Event Handlers
// =============================================================================

/**
 * Processes a messaging event (DM)
 */
async function processMessagingEvent(
  event: InstagramMessagingEvent,
  connection: InstagramConnection,
  entryTime: number,
  results: WebhookProcessingResult
): Promise<void> {
  // Generate unique event ID
  const eventId = event.message?.mid ||
    `${event.sender.id}_${event.timestamp}_${event.read ? 'read' : 'msg'}`

  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return
  }

  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')

  await recordWebhookEvent(eventId, 'messaging', connection.id, payloadHash)

  try {
    if (event.message) {
      // Skip echo messages (our own outbound messages)
      if (event.message.is_echo) {
        await markEventProcessed(eventId, true)
        return
      }

      // Skip deleted messages
      if (event.message.is_deleted) {
        await markEventProcessed(eventId, true)
        return
      }

      await handleIncomingMessage(event, connection)
    } else if (event.read) {
      await handleReadReceipt(event, connection)
    } else if (event.postback) {
      await handlePostback(event, connection)
    }

    await markEventProcessed(eventId, true)
    results.processed++
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await markEventProcessed(eventId, false, message)
    results.errors.push(`Message ${eventId}: ${message}`)
  }
}

/**
 * Handles incoming DM message
 */
async function handleIncomingMessage(
  event: InstagramMessagingEvent,
  connection: InstagramConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const message = event.message!

  // Find or create Instagram conversation
  const { data: igConversation } = await supabase
    .from('instagram_conversations')
    .select('*')
    .eq('instagram_connection_id', connection.id)
    .eq('participant_id', event.sender.id)
    .single()

  let conversationId = igConversation?.id

  if (!igConversation) {
    // Create new Instagram conversation
    const { data: newConvo, error } = await supabase
      .from('instagram_conversations')
      .insert({
        instagram_connection_id: connection.id,
        organization_id: connection.organization_id,
        thread_id: `${connection.instagram_user_id}_${event.sender.id}`,
        participant_id: event.sender.id,
        last_message_at: new Date(event.timestamp).toISOString(),
        unread_count: 1
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    conversationId = newConvo.id

    // Create unified conversation
    const { data: unifiedConvo } = await supabase
      .from('conversations')
      .insert({
        organization_id: connection.organization_id,
        channel: 'instagram',
        status: 'open',
        last_message_at: new Date(event.timestamp).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (unifiedConvo) {
      await supabase
        .from('instagram_conversations')
        .update({ conversation_id: unifiedConvo.id })
        .eq('id', conversationId)
    }
  } else {
    // Update existing conversation
    await supabase
      .from('instagram_conversations')
      .update({
        last_message_at: new Date(event.timestamp).toISOString(),
        unread_count: igConversation.unread_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
  }

  // Determine message type and extract content
  let messageType = 'text'
  let text = message.text || null
  let mediaUrl = null
  let mediaType = null
  let storyId = null
  let storyUrl = null

  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0]
    messageType = attachment.type

    if (attachment.type === 'image' || attachment.type === 'video' ||
        attachment.type === 'audio' || attachment.type === 'sticker') {
      mediaType = attachment.type
      mediaUrl = attachment.payload.url
    } else if (attachment.type === 'story_mention') {
      messageType = 'story_mention'
      storyId = attachment.payload.id
      storyUrl = attachment.payload.link
    } else if (attachment.type === 'share') {
      messageType = 'share'
      text = attachment.payload.title || '[Shared content]'
      mediaUrl = attachment.payload.url
    }
  }

  if (message.story_mention) {
    messageType = 'story_mention'
    storyId = message.story_mention.id
    storyUrl = message.story_mention.link
  }

  // Save message
  await supabase
    .from('instagram_messages')
    .insert({
      instagram_conversation_id: conversationId,
      instagram_message_id: message.mid,
      direction: 'inbound',
      sender_id: event.sender.id,
      recipient_id: event.recipient.id,
      message_type: messageType,
      text,
      media_url: mediaUrl,
      media_type: mediaType,
      story_id: storyId,
      story_url: storyUrl,
      reply_to_message_id: message.reply_to?.mid || null,
      status: 'delivered',
      instagram_timestamp: new Date(event.timestamp).toISOString()
    })

  // Also create a unified message if linked to unified conversation
  if (igConversation?.conversation_id) {
    await supabase
      .from('messages')
      .insert({
        conversation_id: igConversation.conversation_id,
        organization_id: connection.organization_id,
        direction: 'inbound',
        content: text || `[${messageType}]`,
        message_type: messageType === 'text' ? 'text' : 'media',
        channel: 'instagram',
        channel_message_id: message.mid,
        status: 'delivered',
        created_at: new Date(event.timestamp).toISOString()
      })
  }
}

/**
 * Handles read receipt
 */
async function handleReadReceipt(
  event: InstagramMessagingEvent,
  connection: InstagramConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const readWatermark = event.read!.watermark

  // Update all messages before the watermark as read
  const { data: conversation } = await supabase
    .from('instagram_conversations')
    .select('id')
    .eq('instagram_connection_id', connection.id)
    .eq('participant_id', event.sender.id)
    .single()

  if (conversation) {
    await supabase
      .from('instagram_messages')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('instagram_conversation_id', conversation.id)
      .eq('direction', 'outbound')
      .lte('instagram_timestamp', new Date(readWatermark).toISOString())

    // Reset unread count
    await supabase
      .from('instagram_conversations')
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id)
  }
}

/**
 * Handles postback (button click)
 */
async function handlePostback(
  event: InstagramMessagingEvent,
  connection: InstagramConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const postback = event.postback!

  // Log postback event
  console.log(`Instagram postback from ${event.sender.id}: ${postback.payload}`)

  // You could trigger automation here based on payload
  // For now, just log it
}

// =============================================================================
// Change Event Handlers (Comments, Mentions)
// =============================================================================

/**
 * Processes a change event
 */
async function processChangeEvent(
  change: InstagramChangeEvent,
  connection: InstagramConnection,
  entryTime: number,
  results: WebhookProcessingResult
): Promise<void> {
  const eventId = `change_${connection.id}_${entryTime}_${change.field}`

  if (await isEventProcessed(eventId)) {
    return
  }

  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(change))
    .digest('hex')

  await recordWebhookEvent(eventId, `change_${change.field}`, connection.id, payloadHash)

  try {
    switch (change.field) {
      case 'comments':
        await handleCommentEvent(change, connection)
        break
      case 'mentions':
        await handleMentionEvent(change, connection)
        break
      default:
        // Log but don't fail
        console.log(`Unhandled change field: ${change.field}`)
    }

    await markEventProcessed(eventId, true)
    results.processed++
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await markEventProcessed(eventId, false, message)
    results.errors.push(`Change ${change.field}: ${message}`)
  }
}

/**
 * Handles comment event (for comment-to-DM automation)
 */
async function handleCommentEvent(
  change: InstagramChangeEvent,
  connection: InstagramConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const value = change.value

  if (!value.id || !value.text || !value.from) {
    return
  }

  // Check for active comment rules that match
  const { data: rules } = await supabase
    .from('instagram_comment_rules')
    .select('*')
    .eq('instagram_connection_id', connection.id)
    .eq('is_active', true)

  if (!rules || rules.length === 0) {
    return
  }

  const commentText = value.text.toLowerCase()

  for (const rule of rules) {
    // Check if comment matches keywords
    const matchesKeyword = rule.trigger_keywords.some((keyword: string) =>
      commentText.includes(keyword.toLowerCase())
    )

    if (!matchesKeyword) {
      continue
    }

    // Check if media matches (if specified)
    if (rule.trigger_media_ids && rule.trigger_media_ids.length > 0) {
      if (!value.media?.id || !rule.trigger_media_ids.includes(value.media.id)) {
        continue
      }
    }

    // Check daily limit for this user
    const { count } = await supabase
      .from('instagram_comment_dm_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('instagram_comment_rule_id', rule.id)
      .eq('user_id', value.from.id)
      .gte('dm_sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if ((count || 0) >= rule.max_per_user_per_day) {
      continue
    }

    // Queue DM to be sent (with optional delay)
    // For now, just track that we would send a DM
    await supabase
      .from('instagram_comment_dm_tracking')
      .insert({
        instagram_comment_rule_id: rule.id,
        user_id: value.from.id,
        comment_id: value.id,
        dm_sent_at: new Date().toISOString()
      })

    // Update rule stats
    await supabase
      .from('instagram_comment_rules')
      .update({
        trigger_count: rule.trigger_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rule.id)

    // The actual DM sending would be handled by a background job
    // that respects the dm_delay_seconds setting
  }
}

/**
 * Handles story mention event
 */
async function handleMentionEvent(
  change: InstagramChangeEvent,
  connection: InstagramConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const value = change.value

  if (!value.story_id || !value.mentioned_by) {
    return
  }

  // Record story mention
  await supabase
    .from('instagram_story_mentions')
    .upsert({
      instagram_connection_id: connection.id,
      organization_id: connection.organization_id,
      story_id: value.story_id,
      mentioned_by_id: value.mentioned_by.id,
      mentioned_by_username: value.mentioned_by.username,
      mentioned_at: new Date().toISOString(),
      responded: false
    }, {
      onConflict: 'instagram_connection_id,story_id,mentioned_by_id'
    })
}
