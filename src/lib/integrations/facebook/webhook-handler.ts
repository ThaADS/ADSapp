/**
 * Facebook Messenger Webhook Handler
 * Purpose: Process incoming Facebook Messenger webhooks with idempotency
 * Date: 2026-01-28
 */

import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFacebookConnectionByPageId, getUserProfile } from './client'
import type {
  FacebookWebhookPayload,
  FacebookWebhookEntry,
  FacebookMessagingEvent,
  FacebookConnection
} from '@/types/facebook'

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verifies Facebook webhook signature (sha256)
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

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedHash)
    )
  } catch {
    return false
  }
}

/**
 * Handles webhook verification challenge (GET request)
 */
export function handleVerificationChallenge(
  mode: string,
  token: string,
  challenge: string
): string | null {
  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN

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
    .from('facebook_webhook_events')
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
    .from('facebook_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      facebook_connection_id: connectionId,
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
    .from('facebook_webhook_events')
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
 * Processes Facebook webhook payload
 */
export async function processFacebookWebhook(
  payload: FacebookWebhookPayload
): Promise<WebhookProcessingResult> {
  const results: WebhookProcessingResult = {
    success: true,
    processed: 0,
    errors: []
  }

  if (payload.object !== 'page') {
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
  entry: FacebookWebhookEntry,
  results: WebhookProcessingResult
): Promise<void> {
  const pageId = entry.id

  // Get connection for this Page
  const connection = await getFacebookConnectionByPageId(pageId)
  if (!connection) {
    results.errors.push(`No connection found for Page ${pageId}`)
    return
  }

  // Process messaging events (direct messages)
  if (entry.messaging) {
    for (const event of entry.messaging) {
      await processMessagingEvent(event, connection, entry.time, results, false)
    }
  }

  // Process standby events (messages when not thread owner)
  if (entry.standby) {
    for (const event of entry.standby) {
      await processMessagingEvent(event, connection, entry.time, results, true)
    }
  }
}

// =============================================================================
// Messaging Event Handlers
// =============================================================================

/**
 * Processes a messaging event
 */
async function processMessagingEvent(
  event: FacebookMessagingEvent,
  connection: FacebookConnection,
  entryTime: number,
  results: WebhookProcessingResult,
  isStandby: boolean
): Promise<void> {
  // Generate unique event ID
  const eventId = event.message?.mid ||
    event.delivery?.watermark?.toString() ||
    event.read?.watermark?.toString() ||
    `${event.sender.id}_${event.timestamp}_${getEventType(event)}`

  // Check idempotency
  if (await isEventProcessed(eventId)) {
    return
  }

  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')

  const eventType = getEventType(event)
  await recordWebhookEvent(eventId, eventType, connection.id, payloadHash)

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

      await handleIncomingMessage(event, connection, isStandby)
    } else if (event.delivery) {
      await handleDeliveryReceipt(event, connection)
    } else if (event.read) {
      await handleReadReceipt(event, connection)
    } else if (event.postback) {
      await handlePostback(event, connection)
    } else if (event.referral) {
      await handleReferral(event, connection)
    } else if (event.pass_thread_control) {
      await handlePassThreadControl(event, connection)
    } else if (event.take_thread_control) {
      await handleTakeThreadControl(event, connection)
    } else if (event.request_thread_control) {
      await handleRequestThreadControl(event, connection)
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
 * Determines the event type from the messaging event
 */
function getEventType(event: FacebookMessagingEvent): string {
  if (event.message) return 'message'
  if (event.delivery) return 'delivery'
  if (event.read) return 'read'
  if (event.postback) return 'postback'
  if (event.referral) return 'referral'
  if (event.pass_thread_control) return 'pass_thread_control'
  if (event.take_thread_control) return 'take_thread_control'
  if (event.request_thread_control) return 'request_thread_control'
  return 'unknown'
}

/**
 * Handles incoming message
 */
async function handleIncomingMessage(
  event: FacebookMessagingEvent,
  connection: FacebookConnection,
  isStandby: boolean
): Promise<void> {
  const supabase = createServiceRoleClient()
  const message = event.message!
  const senderPsid = event.sender.id

  // Find or create Facebook conversation
  const { data: fbConversation } = await supabase
    .from('facebook_conversations')
    .select('*')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', senderPsid)
    .single()

  let conversationId = fbConversation?.id

  if (!fbConversation) {
    // Try to get user profile
    let userName = null
    let profilePic = null

    try {
      const profile = await getUserProfile(connection, senderPsid)
      userName = profile.name || null
      profilePic = profile.profile_pic || null
    } catch {
      // Profile fetch may fail due to permissions, continue without it
    }

    // Create new Facebook conversation
    const { data: newConvo, error } = await supabase
      .from('facebook_conversations')
      .insert({
        facebook_connection_id: connection.id,
        organization_id: connection.organization_id,
        psid: senderPsid,
        user_name: userName,
        user_profile_pic: profilePic,
        last_message_at: new Date(event.timestamp).toISOString(),
        unread_count: 1,
        thread_owner: isStandby ? 'page_inbox' : 'app',
        thread_owner_app_id: isStandby ? null : connection.app_id
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
        channel: 'facebook',
        status: 'open',
        last_message_at: new Date(event.timestamp).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (unifiedConvo) {
      await supabase
        .from('facebook_conversations')
        .update({ conversation_id: unifiedConvo.id })
        .eq('id', conversationId)
    }
  } else {
    // Update existing conversation
    await supabase
      .from('facebook_conversations')
      .update({
        last_message_at: new Date(event.timestamp).toISOString(),
        unread_count: fbConversation.unread_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
  }

  // Determine message type and extract content
  let messageType = 'text'
  let text = message.text || null
  let mediaUrl = null
  let mediaType = null
  let templateType = null
  let templatePayload = null
  let quickReplyPayload = message.quick_reply?.payload || null

  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0]
    messageType = attachment.type

    switch (attachment.type) {
      case 'image':
        mediaType = 'image'
        mediaUrl = attachment.payload.url
        break
      case 'video':
        mediaType = 'video'
        mediaUrl = attachment.payload.url
        break
      case 'audio':
        mediaType = 'audio'
        mediaUrl = attachment.payload.url
        break
      case 'file':
        mediaType = 'file'
        mediaUrl = attachment.payload.url
        break
      case 'location':
        messageType = 'location'
        text = `Location: ${attachment.payload.coordinates?.lat}, ${attachment.payload.coordinates?.long}`
        break
      case 'template':
        messageType = 'template'
        templateType = attachment.payload.template_type
        templatePayload = attachment.payload
        break
      case 'fallback':
        messageType = 'fallback'
        text = attachment.payload.title || '[Shared content]'
        break
    }
  }

  if (message.sticker_id) {
    messageType = 'sticker'
    mediaType = 'image'
    // Sticker URL would need to be looked up
  }

  // Save message
  await supabase
    .from('facebook_messages')
    .insert({
      facebook_conversation_id: conversationId,
      facebook_message_id: message.mid,
      direction: 'inbound',
      sender_id: event.sender.id,
      recipient_id: event.recipient.id,
      message_type: messageType,
      text,
      media_url: mediaUrl,
      media_type: mediaType,
      template_type: templateType,
      template_payload: templatePayload,
      quick_reply_payload: quickReplyPayload,
      status: 'delivered',
      facebook_timestamp: new Date(event.timestamp).toISOString()
    })

  // Also create a unified message if linked to unified conversation
  if (fbConversation?.conversation_id) {
    await supabase
      .from('messages')
      .insert({
        conversation_id: fbConversation.conversation_id,
        organization_id: connection.organization_id,
        direction: 'inbound',
        content: text || `[${messageType}]`,
        message_type: messageType === 'text' ? 'text' : 'media',
        channel: 'facebook',
        channel_message_id: message.mid,
        status: 'delivered',
        created_at: new Date(event.timestamp).toISOString()
      })
  }
}

/**
 * Handles delivery receipt
 */
async function handleDeliveryReceipt(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const delivery = event.delivery!

  // Get conversation
  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (!conversation) return

  // Update delivered status for all messages in mids array
  for (const mid of delivery.mids || []) {
    await supabase
      .from('facebook_messages')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('facebook_conversation_id', conversation.id)
      .eq('facebook_message_id', mid)
  }
}

/**
 * Handles read receipt
 */
async function handleReadReceipt(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const readWatermark = event.read!.watermark

  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (conversation) {
    // Update all outbound messages before the watermark as read
    await supabase
      .from('facebook_messages')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('facebook_conversation_id', conversation.id)
      .eq('direction', 'outbound')
      .lte('facebook_timestamp', new Date(readWatermark).toISOString())

    // Reset unread count
    await supabase
      .from('facebook_conversations')
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
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const postback = event.postback!

  // Find conversation
  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (!conversation) return

  // Save postback as a message
  await supabase
    .from('facebook_messages')
    .insert({
      facebook_conversation_id: conversation.id,
      facebook_message_id: `postback_${event.timestamp}`,
      direction: 'inbound',
      sender_id: event.sender.id,
      recipient_id: event.recipient.id,
      message_type: 'postback',
      text: postback.title,
      postback_payload: postback.payload,
      postback_title: postback.title,
      status: 'delivered',
      facebook_timestamp: new Date(event.timestamp).toISOString()
    })

  // Log postback event
  console.log(`Facebook postback from ${event.sender.id}: ${postback.payload}`)

  // Postback handling can trigger automation
}

/**
 * Handles referral (m.me link, ads, etc.)
 */
async function handleReferral(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const referral = event.referral!

  // Log referral for analytics
  console.log(`Facebook referral from ${event.sender.id}:`, {
    ref: referral.ref,
    source: referral.source,
    type: referral.type
  })

  // Referral handling can trigger automation or personalized responses
}

// =============================================================================
// Handover Protocol Handlers
// =============================================================================

/**
 * Handles pass_thread_control event
 */
async function handlePassThreadControl(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const pass = event.pass_thread_control!

  // Get conversation
  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (!conversation) return

  // Determine new owner type
  let newOwner: 'app' | 'page_inbox' | 'secondary_app' = 'secondary_app'
  if (pass.new_owner_app_id === connection.app_id) {
    newOwner = 'app'
  } else if (pass.new_owner_app_id === '263902037430900') {
    // Meta's Page Inbox app ID
    newOwner = 'page_inbox'
  }

  // Update conversation thread owner
  await supabase
    .from('facebook_conversations')
    .update({
      thread_owner: newOwner,
      thread_owner_app_id: pass.new_owner_app_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // Log thread control event
  await supabase
    .from('facebook_thread_control_log')
    .insert({
      facebook_conversation_id: conversation.id,
      action: 'pass',
      from_app_id: connection.app_id,
      to_app_id: pass.new_owner_app_id,
      metadata: pass.metadata
    })
}

/**
 * Handles take_thread_control event
 */
async function handleTakeThreadControl(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const take = event.take_thread_control!

  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id, thread_owner_app_id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (!conversation) return

  // Update conversation thread owner (we now have control)
  await supabase
    .from('facebook_conversations')
    .update({
      thread_owner: 'app',
      thread_owner_app_id: connection.app_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // Log thread control event
  await supabase
    .from('facebook_thread_control_log')
    .insert({
      facebook_conversation_id: conversation.id,
      action: 'take',
      from_app_id: take.previous_owner_app_id,
      to_app_id: connection.app_id,
      metadata: take.metadata
    })
}

/**
 * Handles request_thread_control event
 */
async function handleRequestThreadControl(
  event: FacebookMessagingEvent,
  connection: FacebookConnection
): Promise<void> {
  const supabase = createServiceRoleClient()
  const request = event.request_thread_control!

  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', event.sender.id)
    .single()

  if (!conversation) return

  // Log the request
  await supabase
    .from('facebook_thread_control_log')
    .insert({
      facebook_conversation_id: conversation.id,
      action: 'request',
      from_app_id: request.requested_owner_app_id,
      to_app_id: connection.app_id,
      metadata: request.metadata
    })

  // The app should decide whether to pass control or not
  // This could trigger a notification to human agents
  console.log(`Thread control requested by ${request.requested_owner_app_id} for conversation ${conversation.id}`)
}
