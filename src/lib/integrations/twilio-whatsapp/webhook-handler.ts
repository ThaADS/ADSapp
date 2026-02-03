/**
 * Twilio WhatsApp Webhook Handler
 * Purpose: Process incoming messages and status updates from Twilio
 * Date: 2026-02-03
 */

import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateTwilioSignature, getConnectionByWhatsAppNumber } from './client'
import type {
  TwilioWhatsAppWebhookPayload,
  TwilioWhatsAppInboundMessage,
  TwilioWhatsAppStatusUpdate,
  TwilioWhatsAppMessageStatus,
} from '@/types/twilio-whatsapp'
import { webhookToInboundMessage, parseWhatsAppNumber } from '@/types/twilio-whatsapp'

// =============================================================================
// Types
// =============================================================================

export interface WebhookProcessResult {
  success: boolean
  messageId?: string
  error?: string
  isDuplicate?: boolean
}

// =============================================================================
// Payload Parsing
// =============================================================================

/**
 * Parse Twilio webhook payload into structured format
 */
export function parseWebhookPayload(
  params: Record<string, string>
): TwilioWhatsAppWebhookPayload {
  return {
    MessageSid: params.MessageSid || params.SmsSid || '',
    SmsSid: params.SmsSid,
    AccountSid: params.AccountSid || '',
    From: params.From || '',
    To: params.To || '',
    Body: params.Body,
    NumMedia: params.NumMedia,
    MediaUrl0: params.MediaUrl0,
    MediaContentType0: params.MediaContentType0,
    MediaUrl1: params.MediaUrl1,
    MediaContentType1: params.MediaContentType1,
    MediaUrl2: params.MediaUrl2,
    MediaContentType2: params.MediaContentType2,
    MediaUrl3: params.MediaUrl3,
    MediaContentType3: params.MediaContentType3,
    MediaUrl4: params.MediaUrl4,
    MediaContentType4: params.MediaContentType4,
    MediaUrl5: params.MediaUrl5,
    MediaContentType5: params.MediaContentType5,
    MediaUrl6: params.MediaUrl6,
    MediaContentType6: params.MediaContentType6,
    MediaUrl7: params.MediaUrl7,
    MediaContentType7: params.MediaContentType7,
    MediaUrl8: params.MediaUrl8,
    MediaContentType8: params.MediaContentType8,
    MediaUrl9: params.MediaUrl9,
    MediaContentType9: params.MediaContentType9,
    MessageStatus: params.MessageStatus as TwilioWhatsAppMessageStatus,
    ErrorCode: params.ErrorCode,
    ErrorMessage: params.ErrorMessage,
    ProfileName: params.ProfileName,
    WaId: params.WaId,
    Forwarded: params.Forwarded,
    FrequentlyForwarded: params.FrequentlyForwarded,
    ApiVersion: params.ApiVersion,
    SmsStatus: params.SmsStatus,
    ButtonText: params.ButtonText,
    ButtonPayload: params.ButtonPayload,
    Latitude: params.Latitude,
    Longitude: params.Longitude,
    Address: params.Address,
  }
}

/**
 * Parse status update from payload
 */
function parseStatusUpdate(
  payload: TwilioWhatsAppWebhookPayload
): TwilioWhatsAppStatusUpdate | null {
  if (!payload.MessageStatus) {
    return null
  }

  return {
    messageSid: payload.MessageSid,
    status: payload.MessageStatus,
    errorCode: payload.ErrorCode,
    errorMessage: payload.ErrorMessage,
    timestamp: new Date(),
  }
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Check if webhook event has already been processed
 */
async function checkIdempotency(
  messageSid: string,
  eventType: 'message' | 'status',
  connectionId: string,
  payloadHash: string
): Promise<{ isDuplicate: boolean; eventId?: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_webhook_events')
    .select('id, status')
    .eq('message_sid', messageSid)
    .eq('event_type', eventType)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found, which is expected for new events
    console.error('Error checking idempotency:', error)
  }

  if (data) {
    return { isDuplicate: true, eventId: data.id }
  }

  // Create new event record
  const { data: newEvent, error: insertError } = await supabase
    .from('twilio_whatsapp_webhook_events')
    .insert({
      connection_id: connectionId,
      message_sid: messageSid,
      event_type: eventType,
      payload_hash: payloadHash,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    // Duplicate key error means another request beat us
    if (insertError.code === '23505') {
      return { isDuplicate: true }
    }
    throw insertError
  }

  return { isDuplicate: false, eventId: newEvent.id }
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(
  eventId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('twilio_whatsapp_webhook_events')
    .update({
      status: success ? 'processed' : 'failed',
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', eventId)
}

/**
 * Generate hash of payload for idempotency
 */
function hashPayload(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort()
  const data = sortedKeys.map(k => `${k}=${params[k]}`).join('&')
  return crypto.createHash('sha256').update(data).digest('hex')
}

// =============================================================================
// Conversation Management
// =============================================================================

/**
 * Get or create conversation for incoming message
 */
async function getOrCreateConversation(
  organizationId: string,
  contactPhone: string,
  profileName?: string
): Promise<{ conversationId: string; contactId: string }> {
  const supabase = createServiceRoleClient()

  // First, find or create contact
  let { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', contactPhone)
    .single()

  if (!contact) {
    // Create new contact
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        organization_id: organizationId,
        whatsapp_id: contactPhone,
        phone_number: contactPhone,
        name: profileName || contactPhone,
        source: 'twilio_whatsapp',
      })
      .select('id')
      .single()

    if (contactError) {
      throw new Error(`Failed to create contact: ${contactError.message}`)
    }
    contact = newContact
  }

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('contact_id', contact.id)
    .eq('channel', 'twilio_whatsapp')
    .single()

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        contact_id: contact.id,
        channel: 'twilio_whatsapp',
        status: 'open',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (convError) {
      throw new Error(`Failed to create conversation: ${convError.message}`)
    }
    conversation = newConversation
  }

  return {
    conversationId: conversation.id,
    contactId: contact.id,
  }
}

// =============================================================================
// Message Processing
// =============================================================================

/**
 * Process incoming WhatsApp message
 */
export async function processIncomingMessage(
  message: TwilioWhatsAppInboundMessage,
  connectionId: string,
  organizationId: string
): Promise<WebhookProcessResult> {
  const supabase = createServiceRoleClient()

  try {
    // Get or create conversation
    const { conversationId, contactId } = await getOrCreateConversation(
      organizationId,
      message.from,
      message.profileName
    )

    // Determine content type
    let contentType = 'text'
    let mediaUrl: string | undefined
    let mediaType: string | undefined

    if (message.numMedia > 0 && message.mediaUrls.length > 0) {
      contentType = 'media'
      mediaUrl = message.mediaUrls[0]
      mediaType = message.mediaContentTypes[0]
    }

    // Check for location message
    if (message.latitude && message.longitude) {
      contentType = 'location'
    }

    // Check for button response
    if (message.buttonPayload) {
      contentType = 'button_response'
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        channel: 'twilio_whatsapp',
        channel_message_id: message.messageSid,
        direction: 'inbound',
        content: message.body,
        content_type: contentType,
        media_url: mediaUrl,
        media_type: mediaType,
        sender_type: 'contact',
        sender_id: contactId,
        status: 'delivered',
        metadata: {
          twilio_account_sid: message.accountSid,
          profile_name: message.profileName,
          wa_id: message.waId,
          from: message.from,
          to: message.to,
          num_media: message.numMedia,
          media_urls: message.mediaUrls,
          media_content_types: message.mediaContentTypes,
          // Location data
          latitude: message.latitude,
          longitude: message.longitude,
          address: message.address,
          // Button response
          button_text: message.buttonText,
          button_payload: message.buttonPayload,
        },
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to insert message: ${error.message}`)
    }

    // Update conversation last_message_at and increment unread_count
    const { data: currentConv } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single()

    const currentUnreadCount = currentConv?.unread_count || 0

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: currentUnreadCount + 1,
      })
      .eq('id', conversationId)

    return {
      success: true,
      messageId: newMessage.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process status callback (sent, delivered, read, failed)
 */
export async function processStatusCallback(
  statusUpdate: TwilioWhatsAppStatusUpdate
): Promise<WebhookProcessResult> {
  const supabase = createServiceRoleClient()

  try {
    // Map Twilio status to our status
    const statusMap: Record<TwilioWhatsAppMessageStatus, string> = {
      accepted: 'pending',
      queued: 'pending',
      sending: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      undelivered: 'failed',
    }

    const mappedStatus = statusMap[statusUpdate.status] || 'pending'

    // Update message status
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    }

    if (mappedStatus === 'delivered') {
      updateData.delivered_at = statusUpdate.timestamp.toISOString()
    }

    if (mappedStatus === 'read') {
      updateData.read_at = statusUpdate.timestamp.toISOString()
    }

    if (mappedStatus === 'failed') {
      updateData.error_code = statusUpdate.errorCode
      updateData.error_message = statusUpdate.errorMessage
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('channel_message_id', statusUpdate.messageSid)
      .select('id')
      .single()

    if (error) {
      // Message might not exist yet (race condition) or already deleted
      if (error.code === 'PGRST116') {
        return { success: true } // Ignore, not an error
      }
      throw new Error(`Failed to update message status: ${error.message}`)
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Main webhook handler entry point
 */
export async function handleTwilioWhatsAppWebhook(
  params: Record<string, string>,
  signature: string,
  url: string
): Promise<WebhookProcessResult> {
  // Parse payload
  const payload = parseWebhookPayload(params)

  // Determine which number received this
  const toNumber = parseWhatsAppNumber(payload.To)
  const fromNumber = parseWhatsAppNumber(payload.From)

  // Find connection (for incoming, To is our number; for status callbacks, From is our number)
  let connection = await getConnectionByWhatsAppNumber(toNumber)
  if (!connection) {
    connection = await getConnectionByWhatsAppNumber(fromNumber)
  }

  if (!connection) {
    return {
      success: false,
      error: 'No active connection found for this WhatsApp number',
    }
  }

  // Validate signature
  const isValid = validateTwilioSignature(signature, url, params, connection.authToken)
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid webhook signature',
    }
  }

  // Determine event type
  const isStatusCallback = !!payload.MessageStatus && !payload.Body
  const eventType = isStatusCallback ? 'status' : 'message'

  // Check idempotency
  const payloadHash = hashPayload(params)
  const { isDuplicate, eventId } = await checkIdempotency(
    payload.MessageSid,
    eventType,
    connection.id,
    payloadHash
  )

  if (isDuplicate) {
    return { success: true, isDuplicate: true }
  }

  if (!eventId) {
    return { success: false, error: 'Failed to create event record' }
  }

  try {
    let result: WebhookProcessResult

    if (isStatusCallback) {
      const statusUpdate = parseStatusUpdate(payload)
      if (statusUpdate) {
        result = await processStatusCallback(statusUpdate)
      } else {
        result = { success: true } // No status to process
      }
    } else {
      const inboundMessage = webhookToInboundMessage(payload)
      result = await processIncomingMessage(
        inboundMessage,
        connection.id,
        connection.organizationId
      )
    }

    await markEventProcessed(eventId, result.success, result.error)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await markEventProcessed(eventId, false, errorMessage)
    return { success: false, error: errorMessage }
  }
}

// =============================================================================
// TwiML Response Helpers
// =============================================================================

/**
 * Generate empty TwiML response (acknowledge receipt)
 */
export function generateEmptyTwiML(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
}

/**
 * Generate TwiML response with message
 */
export function generateTwiMLResponse(message: string): string {
  // Escape XML special characters
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}
