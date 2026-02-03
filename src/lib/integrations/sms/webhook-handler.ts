/**
 * SMS Webhook Handler
 * Processes incoming Twilio SMS webhooks with idempotency
 * Date: 2026-01-28
 */

import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  TwilioIncomingSMS,
  TwilioStatusCallback,
  SMSConnection,
  SMSConversation,
  SMSMessage,
  parseMediaFromWebhook,
  isOptOutKeyword,
  isOptInKeyword,
  isHelpKeyword,
  normalizeToE164,
  WebhookProcessingResult,
} from '@/types/sms'
import { validateTwilioSignature, decryptToken, sendSMS } from './client'

// =============================================================================
// WEBHOOK PROCESSING
// =============================================================================

/**
 * Process incoming SMS webhook from Twilio
 */
export async function processIncomingSMS(
  payload: TwilioIncomingSMS,
  signature: string,
  webhookUrl: string
): Promise<WebhookProcessingResult> {
  const supabase = createServiceRoleClient()

  // Find connection by phone number
  const { data: connection, error: connError } = await supabase
    .from('sms_connections')
    .select('*')
    .eq('phone_number', payload.To)
    .eq('is_active', true)
    .single()

  if (connError || !connection) {
    console.error('No SMS connection found for phone:', payload.To)
    return { success: false, error: 'Connection not found' }
  }

  const smsConnection = connection as SMSConnection

  // Validate webhook signature
  const authToken = decryptToken(smsConnection.twilio_auth_token_hash)
  const params = Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined) as [string, string][]
  )

  if (!validateTwilioSignature(signature, webhookUrl, params, authToken)) {
    console.error('Invalid Twilio webhook signature')
    return { success: false, error: 'Invalid signature' }
  }

  // Check for duplicate (idempotency)
  const { data: existingEvent } = await supabase
    .from('sms_webhook_events')
    .select('id')
    .eq('message_sid', payload.MessageSid)
    .eq('event_type', 'message')
    .single()

  if (existingEvent) {
    return { success: true, is_duplicate: true }
  }

  // Record webhook event for idempotency
  const payloadHash = crypto
    .createHash('md5')
    .update(JSON.stringify(payload))
    .digest('hex')

  await supabase.from('sms_webhook_events').insert({
    sms_connection_id: smsConnection.id,
    message_sid: payload.MessageSid,
    event_type: 'message',
    payload_hash: payloadHash,
    status: 'pending',
  })

  try {
    // Get or create conversation
    const conversation = await getOrCreateConversation(
      supabase,
      smsConnection,
      payload.From,
      payload
    )

    // Check for special keywords
    const body = payload.Body?.trim() || ''
    const upperBody = body.toUpperCase()

    // Handle opt-out
    if (isOptOutKeyword(body)) {
      await processOptOut(supabase, smsConnection, conversation, payload)
    }
    // Handle opt-in
    else if (isOptInKeyword(body)) {
      await processOptIn(supabase, smsConnection, conversation, payload)
    }
    // Handle help
    else if (isHelpKeyword(body)) {
      await processHelp(smsConnection, payload.From)
    }

    // Parse media attachments
    const media = parseMediaFromWebhook(payload)

    // Store inbound message
    const { data: message, error: msgError } = await supabase
      .from('sms_messages')
      .insert({
        sms_conversation_id: conversation.id,
        twilio_message_sid: payload.MessageSid,
        twilio_account_sid: payload.AccountSid,
        direction: 'inbound',
        from_number: payload.From,
        to_number: payload.To,
        body: payload.Body || null,
        num_segments: parseInt(payload.NumSegments || '1', 10),
        num_media: media.length,
        media_urls: media.length > 0 ? media.map((m) => m.url) : null,
        media_content_types: media.length > 0 ? media.map((m) => m.contentType) : null,
        status: 'received',
        twilio_created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (msgError) {
      throw new Error(`Failed to store message: ${msgError.message}`)
    }

    // Update conversation
    await supabase
      .from('sms_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: conversation.unread_count + 1,
      })
      .eq('id', conversation.id)

    // Mark webhook event as processed
    await supabase
      .from('sms_webhook_events')
      .update({
        processed_at: new Date().toISOString(),
        status: 'processed',
      })
      .eq('message_sid', payload.MessageSid)
      .eq('event_type', 'message')

    return {
      success: true,
      message_id: message.id,
      conversation_id: conversation.id,
    }
  } catch (error) {
    // Mark webhook event as failed
    await supabase
      .from('sms_webhook_events')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('message_sid', payload.MessageSid)
      .eq('event_type', 'message')

    throw error
  }
}

/**
 * Process SMS status callback from Twilio
 */
export async function processSMSStatusCallback(
  payload: TwilioStatusCallback,
  signature: string,
  webhookUrl: string
): Promise<WebhookProcessingResult> {
  const supabase = createServiceRoleClient()

  // Find the message by SID
  const { data: message, error: msgError } = await supabase
    .from('sms_messages')
    .select('*, sms_conversations!inner(sms_connection_id, organization_id)')
    .eq('twilio_message_sid', payload.MessageSid)
    .single()

  if (msgError || !message) {
    // Message might not exist yet if status callback arrives before we store it
    console.log('Message not found for status callback:', payload.MessageSid)
    return { success: true }
  }

  // Get connection to validate signature
  const { data: connection } = await supabase
    .from('sms_connections')
    .select('*')
    .eq('id', message.sms_conversations.sms_connection_id)
    .single()

  if (connection) {
    const authToken = decryptToken((connection as SMSConnection).twilio_auth_token_hash)
    const params = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined) as [string, string][]
    )

    if (!validateTwilioSignature(signature, webhookUrl, params, authToken)) {
      console.error('Invalid Twilio status callback signature')
      return { success: false, error: 'Invalid signature' }
    }
  }

  // Check for duplicate status update
  const { data: existingEvent } = await supabase
    .from('sms_webhook_events')
    .select('id')
    .eq('message_sid', `${payload.MessageSid}_${payload.MessageStatus}`)
    .eq('event_type', 'status')
    .single()

  if (existingEvent) {
    return { success: true, is_duplicate: true }
  }

  // Record webhook event
  await supabase.from('sms_webhook_events').insert({
    sms_connection_id: message.sms_conversations.sms_connection_id,
    message_sid: `${payload.MessageSid}_${payload.MessageStatus}`,
    event_type: 'status',
    status: 'pending',
  })

  // Update message status
  const updateData: Partial<SMSMessage> = {
    status: payload.MessageStatus,
  }

  if (payload.ErrorCode) {
    updateData.error_code = payload.ErrorCode
  }
  if (payload.ErrorMessage) {
    updateData.error_message = payload.ErrorMessage
  }

  // Set delivery timestamps
  if (payload.MessageStatus === 'sent') {
    updateData.sent_at = new Date().toISOString()
  } else if (payload.MessageStatus === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  await supabase
    .from('sms_messages')
    .update(updateData)
    .eq('twilio_message_sid', payload.MessageSid)

  // Mark event as processed
  await supabase
    .from('sms_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      status: 'processed',
    })
    .eq('message_sid', `${payload.MessageSid}_${payload.MessageStatus}`)
    .eq('event_type', 'status')

  return { success: true, message_id: message.id }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get or create SMS conversation
 */
async function getOrCreateConversation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  connection: SMSConnection,
  remotePhone: string,
  payload: TwilioIncomingSMS
): Promise<SMSConversation> {
  const normalizedPhone = normalizeToE164(remotePhone)

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('*')
    .eq('sms_connection_id', connection.id)
    .eq('remote_phone_number', normalizedPhone)
    .single()

  if (existing) {
    return existing as SMSConversation
  }

  // Create new conversation with location data if available
  const { data: newConversation, error } = await supabase
    .from('sms_conversations')
    .insert({
      sms_connection_id: connection.id,
      organization_id: connection.organization_id,
      remote_phone_number: normalizedPhone,
      remote_country: payload.FromCountry || null,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .select()
    .single()

  if (error || !newConversation) {
    throw new Error(`Failed to create SMS conversation: ${error?.message}`)
  }

  return newConversation as SMSConversation
}

/**
 * Process opt-out request (STOP, CANCEL, etc.)
 */
async function processOptOut(
  supabase: ReturnType<typeof createServiceRoleClient>,
  connection: SMSConnection,
  conversation: SMSConversation,
  payload: TwilioIncomingSMS
): Promise<void> {
  const normalizedPhone = normalizeToE164(payload.From)
  const keyword = (payload.Body?.trim() || 'STOP').toUpperCase()

  // Upsert opt-out record
  await supabase.from('sms_opt_outs').upsert(
    {
      organization_id: connection.organization_id,
      phone_number: normalizedPhone,
      keyword,
      opted_out_at: new Date().toISOString(),
      source_message_sid: payload.MessageSid,
      is_active: true,
      opted_in_at: null,
      opt_in_keyword: null,
    },
    { onConflict: 'organization_id,phone_number' }
  )

  // Update conversation
  await supabase
    .from('sms_conversations')
    .update({
      opted_out: true,
      opted_out_at: new Date().toISOString(),
      opt_out_keyword: keyword,
    })
    .eq('id', conversation.id)

  // Send confirmation (CTIA required)
  const authToken = decryptToken(connection.twilio_auth_token_hash)
  try {
    await sendSMS(connection.twilio_account_sid, authToken, {
      To: normalizedPhone,
      From: connection.phone_number,
      Body: 'You have been unsubscribed and will no longer receive messages. Reply START to resubscribe.',
    })
  } catch (error) {
    console.error('Failed to send opt-out confirmation:', error)
  }
}

/**
 * Process opt-in request (START, YES, etc.)
 */
async function processOptIn(
  supabase: ReturnType<typeof createServiceRoleClient>,
  connection: SMSConnection,
  conversation: SMSConversation,
  payload: TwilioIncomingSMS
): Promise<void> {
  const normalizedPhone = normalizeToE164(payload.From)
  const keyword = (payload.Body?.trim() || 'START').toUpperCase()

  // Update opt-out record to inactive
  await supabase
    .from('sms_opt_outs')
    .update({
      is_active: false,
      opted_in_at: new Date().toISOString(),
      opt_in_keyword: keyword,
    })
    .eq('organization_id', connection.organization_id)
    .eq('phone_number', normalizedPhone)

  // Update conversation
  await supabase
    .from('sms_conversations')
    .update({
      opted_out: false,
      opted_out_at: null,
      opt_out_keyword: null,
    })
    .eq('id', conversation.id)

  // Send confirmation
  const authToken = decryptToken(connection.twilio_auth_token_hash)
  try {
    await sendSMS(connection.twilio_account_sid, authToken, {
      To: normalizedPhone,
      From: connection.phone_number,
      Body: 'You have been resubscribed and will receive messages again. Reply STOP to unsubscribe.',
    })
  } catch (error) {
    console.error('Failed to send opt-in confirmation:', error)
  }
}

/**
 * Process help request (HELP, INFO)
 */
async function processHelp(
  connection: SMSConnection,
  toPhone: string
): Promise<void> {
  const authToken = decryptToken(connection.twilio_auth_token_hash)
  try {
    await sendSMS(connection.twilio_account_sid, authToken, {
      To: normalizeToE164(toPhone),
      From: connection.phone_number,
      Body: 'Reply STOP to unsubscribe. Reply START to resubscribe. Message and data rates may apply.',
    })
  } catch (error) {
    console.error('Failed to send help response:', error)
  }
}

// =============================================================================
// TwiML RESPONSE HELPERS
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
