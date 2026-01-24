import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppWebhookPayload } from '@/types'
import {
  EnhancedWhatsAppClient,
  WhatsAppWebhookValue,
  WhatsAppMessage,
  WhatsAppStatus,
  getWhatsAppClient,
} from '@/lib/whatsapp/enhanced-client'
import { MediaStorageService } from '@/lib/media/storage'
import { rateLimit, createErrorResponse } from '@/lib/api-utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateWhatsAppSignature,
  validateWebhookVerification,
} from '@/lib/middleware/whatsapp-webhook-validator'

// Channel abstraction layer imports
import { UnifiedMessageRouter, ChannelType } from '@/lib/channels'
import { createWhatsAppAdapter } from '@/lib/channels/adapters'
import { findOrCreateContact, normalizePhoneNumber } from '@/lib/channels/contact-dedup'

// Define interfaces for better type safety
interface WhatsAppContact {
  profile?: {
    name?: string
  }
  wa_id: string
}

interface WhatsAppMedia {
  id?: string
  caption?: string
  filename?: string
  mimeType: string
  sha256?: string
}

interface ContactData {
  organizationId: string
  whatsappId: string
  phoneNumber: string
  name: string | null
  lastMessageAt: string
}

interface ConversationData {
  organizationId: string
  contactId: string
  lastMessageAt: string
}

interface MessageStatusUpdate {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}

interface ProcessingError extends Error {
  message: string
  stack?: string
}

// Rate limit webhook processing
const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: request => request.headers.get('x-forwarded-for') || 'anonymous',
})

// ============================================================================
// Channel Router Integration (Lazy Singleton)
// ============================================================================

let routerInstance: UnifiedMessageRouter | null = null

/**
 * Gets or creates the unified message router instance.
 * Uses lazy initialization to avoid startup overhead.
 */
function getRouter(): UnifiedMessageRouter {
  if (!routerInstance) {
    routerInstance = new UnifiedMessageRouter({ enableHealthChecks: false })
    console.log('[Channel Router] Initialized new UnifiedMessageRouter instance')
  }
  return routerInstance
}

/**
 * Ensures the WhatsApp adapter is registered for an organization.
 * Registers the adapter if not already present.
 */
async function ensureAdapterRegistered(organizationId: string): Promise<void> {
  const router = getRouter()

  // Check if adapter already registered
  if (router.getAdapter(ChannelType.WHATSAPP)) {
    return
  }

  try {
    const adapter = await createWhatsAppAdapter(organizationId)
    router.registerAdapter(adapter)
    console.log(`[Channel Router] Registered WhatsApp adapter for org ${organizationId}`)
  } catch (error) {
    // Log but don't fail - webhook can still work without adapter
    console.error('[Channel Router] Failed to register WhatsApp adapter:', error)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // 🔒 SECURITY: Webhook verification with constant-time comparison
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
  const verificationChallenge = validateWebhookVerification(mode, token, challenge, expectedToken)

  if (verificationChallenge) {
    console.log('✅ WhatsApp webhook verified successfully')
    return new NextResponse(verificationChallenge)
  }

  console.warn('⚠️ WhatsApp webhook verification failed', { mode, tokenProvided: !!token })
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    await webhookRateLimit(request)

    // 🔒 SECURITY: Verify webhook signature before processing
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.WHATSAPP_APP_SECRET || ''

    // Get raw body for signature verification
    const rawBody = await request.text()

    const validationResult = validateWhatsAppSignature(rawBody, signature, appSecret)

    if (!validationResult.isValid) {
      console.error('🚨 WhatsApp webhook signature verification failed:', validationResult.error)
      await logWebhook({ error: validationResult.error, timestamp: Date.now() }, 'whatsapp_signature_failure')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('✅ WhatsApp webhook signature verified')

    // Parse body after signature validation
    const body: WhatsAppWebhookPayload = JSON.parse(rawBody)

    // Validate webhook payload
    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Log webhook payload for debugging
    await logWebhook(body, 'whatsapp_message')

    // Process each entry in the webhook payload
    const processingPromises = body.entry.map(async entry => {
      return Promise.all(
        entry.changes.map(async change => {
          if (change.field === 'messages') {
            await processMessages(change.value)
          } else if (change.field === 'message_template_status_update') {
            await processTemplateStatusUpdate(change.value)
          } else if (change.field === 'account_alerts') {
            await processAccountAlerts(change.value)
          }
        })
      )
    })

    await Promise.all(processingPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return createErrorResponse(error)
  }
}

async function processMessages(value: WhatsAppWebhookValue) {
  const supabase = await createClient()

  // Find organization by phone number ID
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('whatsapp_phone_number_id', value.metadata.phone_number_id)
    .single()

  if (!organization) {
    console.warn('Organization not found for phone number ID:', value.metadata.phone_number_id)
    return
  }

  // Register WhatsApp adapter for this organization (lazy initialization)
  await ensureAdapterRegistered(organization.id)

  // Process incoming messages
  if (value.messages) {
    for (const message of value.messages) {
      console.log(`[Channel Router] Received ${ChannelType.WHATSAPP} message from ${message.from}`)
      await processIncomingMessage(message, organization.id, value.contacts?.[0])
    }
  }

  // Process status updates
  if (value.statuses) {
    for (const status of value.statuses) {
      await processMessageStatus(status, organization.id)
    }
  }
}

async function processIncomingMessage(
  message: WhatsAppMessage,
  organizationId: string,
  contact?: WhatsAppContact
) {
  const supabase = await createClient()
  const mediaStorage = new MediaStorageService()

  try {
    // Use new contact deduplication with channel abstraction layer
    // This creates/updates both the contact and channel_connection records
    const { contactId, isNew } = await findOrCreateContact(
      supabase,
      organizationId,
      ChannelType.WHATSAPP,
      message.from,
      {
        name: contact?.profile?.name || undefined,
        metadata: { whatsappId: message.from }
      }
    )

    if (isNew) {
      console.log(`[Channel Router] Created new contact ${contactId} for ${normalizePhoneNumber(message.from)}`)
    }

    // BACKWARD COMPATIBILITY: Also upsert to the legacy contacts table format
    // This ensures existing message storage logic continues to work
    const contactData = await upsertContact(supabase, {
      organizationId,
      whatsappId: message.from,
      phoneNumber: message.from,
      name: contact?.profile?.name || null,
      lastMessageAt: message.timestamp,
    })

    if (!contactData) {
      console.error('Failed to upsert contact')
      return
    }

    // Find or create conversation
    const conversation = await findOrCreateConversation(supabase, {
      organizationId,
      contactId: contactData.id,
      lastMessageAt: message.timestamp,
    })

    if (!conversation) {
      console.error('Failed to create conversation')
      return
    }

    // Process message content and media
    const messageData = await processMessageContent(message, organizationId, mediaStorage)

    // Handle message context (replies)
    let contextMessageId: string | null = null
    if (message.context) {
      const { data: contextMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('whatsapp_message_id', message.context.id)
        .single()

      contextMessageId = contextMessage?.id || null
    }

    // Insert message with enhanced data
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      whatsapp_message_id: message.id,
      sender_type: 'contact',
      content: messageData.content,
      message_type: message.type,
      media_url: messageData.mediaUrl,
      media_mime_type: messageData.mediaMimeType,
      media_file_id: messageData.mediaFileId,
      context_message_id: contextMessageId,
      metadata: messageData.metadata,
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })

    if (error) {
      console.error('Failed to insert message:', error)
      return
    }

    // Update conversation and contact timestamps
    await Promise.all([
      updateConversationTimestamp(supabase, conversation.id, message.timestamp),
      updateContactTimestamp(supabase, contactData.id, message.timestamp),
      incrementMessageCount(supabase, organizationId, 'inbound'),
    ])

    // Process any errors in the message
    if (message.errors && message.errors.length > 0) {
      await logMessageErrors(supabase, message.id, message.errors, organizationId)
    }
  } catch (error) {
    console.error('Error processing incoming message:', error)
    await logProcessingError(supabase, message.id, error, organizationId)
  }
}

async function processMessageStatus(status: MessageStatusUpdate, organizationId: string) {
  const supabase = await createClient()

  // Update message delivery/read status
  const updates: Record<string, string | boolean> = {}

  switch (status.status) {
    case 'delivered':
      updates.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
      break
    case 'read':
      updates.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString()
      updates.is_read = true
      break
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('messages').update(updates).eq('whatsapp_message_id', status.id)
  }
}

// Helper functions for enhanced message processing

async function upsertContact(supabase: SupabaseClient, data: ContactData) {
  const { data: contactData } = await supabase
    .from('contacts')
    .upsert(
      {
        organization_id: data.organizationId,
        whatsapp_id: data.whatsappId,
        phone_number: data.phoneNumber,
        name: data.name,
        last_message_at: new Date(parseInt(data.lastMessageAt) * 1000).toISOString(),
      },
      {
        onConflict: 'organization_id,whatsapp_id',
      }
    )
    .select()
    .single()

  return contactData
}

async function findOrCreateConversation(supabase: SupabaseClient, data: ConversationData) {
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', data.organizationId)
    .eq('contact_id', data.contactId)
    .in('status', ['open', 'pending'])
    .maybeSingle()

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        organization_id: data.organizationId,
        contact_id: data.contactId,
        status: 'open',
        last_message_at: new Date(parseInt(data.lastMessageAt) * 1000).toISOString(),
      })
      .select()
      .single()

    conversation = newConversation
  }

  return conversation
}

async function processMessageContent(
  message: WhatsAppMessage,
  organizationId: string,
  mediaStorage: MediaStorageService
) {
  let content = ''
  let mediaUrl: string | null = null
  let mediaMimeType: string | null = null
  let mediaFileId: string | null = null
  let metadata: Record<string, unknown> = {}

  try {
    switch (message.type) {
      case 'text':
        content = message.text?.body || ''
        break

      case 'image':
        content = message.image?.caption || '[Image]'
        if (message.image?.id) {
          const mediaFile = await downloadAndStoreMedia(
            message.image.id,
            organizationId,
            mediaStorage,
            message.image
          )
          if (mediaFile) {
            mediaUrl = mediaFile.url
            mediaMimeType = mediaFile.mimeType
            mediaFileId = mediaFile.id
            metadata = { ...mediaFile.metadata, whatsappMediaId: message.image.id }
          }
        }
        break

      case 'document':
        content = message.document?.caption || message.document?.filename || '[Document]'
        if (message.document?.id) {
          const mediaFile = await downloadAndStoreMedia(
            message.document.id,
            organizationId,
            mediaStorage,
            message.document
          )
          if (mediaFile) {
            mediaUrl = mediaFile.url
            mediaMimeType = mediaFile.mimeType
            mediaFileId = mediaFile.id
            metadata = {
              ...mediaFile.metadata,
              whatsappMediaId: message.document.id,
              filename: message.document.filename,
            }
          }
        }
        break

      case 'audio':
        content = '[Audio Message]'
        if (message.audio?.id) {
          const mediaFile = await downloadAndStoreMedia(
            message.audio.id,
            organizationId,
            mediaStorage,
            message.audio
          )
          if (mediaFile) {
            mediaUrl = mediaFile.url
            mediaMimeType = mediaFile.mimeType
            mediaFileId = mediaFile.id
            metadata = { ...mediaFile.metadata, whatsappMediaId: message.audio.id }
          }
        }
        break

      case 'video':
        content = message.video?.caption || '[Video]'
        if (message.video?.id) {
          const mediaFile = await downloadAndStoreMedia(
            message.video.id,
            organizationId,
            mediaStorage,
            message.video
          )
          if (mediaFile) {
            mediaUrl = mediaFile.url
            mediaMimeType = mediaFile.mimeType
            mediaFileId = mediaFile.id
            metadata = { ...mediaFile.metadata, whatsappMediaId: message.video.id }
          }
        }
        break

      case 'location':
        content = `Location: ${message.location?.latitude}, ${message.location?.longitude}`
        if (message.location?.name) {
          content += ` - ${message.location.name}`
        }
        metadata = {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address,
        }
        break

      case 'contacts':
        content = message.contacts?.map(c => c.name.formatted_name).join(', ') || '[Contact Card]'
        metadata = { contacts: message.contacts }
        break

      case 'button':
        content = message.button?.text || '[Button Response]'
        metadata = { buttonPayload: message.button?.payload }
        break

      case 'interactive':
        if (message.interactive?.type === 'button_reply') {
          content = message.interactive.button_reply?.title || '[Button Reply]'
          metadata = {
            interactiveType: 'button_reply',
            buttonId: message.interactive.button_reply?.id,
          }
        } else if (message.interactive?.type === 'list_reply') {
          content = message.interactive.list_reply?.title || '[List Reply]'
          metadata = {
            interactiveType: 'list_reply',
            listId: message.interactive.list_reply?.id,
            description: message.interactive.list_reply?.description,
          }
        }
        break

      default:
        content = `[${message.type} message]`
        metadata = { unsupportedType: message.type }
    }
  } catch (error) {
    console.error('Error processing message content:', error)
    content = `[Error processing ${message.type} message]`
    metadata = { processingError: error.message }
  }

  return {
    content,
    mediaUrl,
    mediaMimeType,
    mediaFileId,
    metadata,
  }
}

async function downloadAndStoreMedia(
  mediaId: string,
  organizationId: string,
  mediaStorage: MediaStorageService,
  media: WhatsAppMedia
) {
  try {
    // Get WhatsApp client for the organization
    const client = await getWhatsAppClient(organizationId)

    // Download media from WhatsApp
    const mediaBuffer = await client.downloadMedia(mediaId)

    // Store in our media storage
    const mediaFile = await mediaStorage.uploadFile(
      mediaBuffer,
      media.filename || `whatsapp_media_${mediaId}`,
      media.mimeType,
      {
        organizationId,
        uploadedBy: 'system',
        generateThumbnail: media.mimeType.startsWith('image/'),
        maxSize: 16 * 1024 * 1024, // 16MB limit
      }
    )

    return mediaFile
  } catch (error) {
    console.error('Error downloading and storing media:', error)
    return null
  }
}

async function updateConversationTimestamp(
  supabase: SupabaseClient,
  conversationId: string,
  timestamp: string
) {
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
    })
    .eq('id', conversationId)
}

async function updateContactTimestamp(
  supabase: SupabaseClient,
  contactId: string,
  timestamp: string
) {
  await supabase
    .from('contacts')
    .update({
      last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
    })
    .eq('id', contactId)
}

async function incrementMessageCount(
  supabase: SupabaseClient,
  organizationId: string,
  direction: 'inbound' | 'outbound'
) {
  const today = new Date().toISOString().split('T')[0]

  await supabase.from('daily_analytics').upsert(
    {
      organization_id: organizationId,
      date: today,
      messages_received: direction === 'inbound' ? 1 : 0,
      messages_sent: direction === 'outbound' ? 1 : 0,
    },
    {
      onConflict: 'organization_id,date',
      ignoreDuplicates: false,
    }
  )
}

async function logMessageErrors(
  supabase: SupabaseClient,
  messageId: string,
  errors: Array<{
    code: string
    title: string
    message: string
    error_data?: Record<string, unknown>
  }>,
  organizationId: string
) {
  for (const error of errors) {
    await supabase.from('message_errors').insert({
      whatsapp_message_id: messageId,
      organization_id: organizationId,
      error_code: error.code,
      error_title: error.title,
      error_message: error.message,
      error_data: error.error_data || {},
      created_at: new Date().toISOString(),
    })
  }
}

async function logProcessingError(
  supabase: SupabaseClient,
  messageId: string,
  error: ProcessingError,
  organizationId: string
) {
  await supabase.from('processing_errors').insert({
    whatsapp_message_id: messageId,
    organization_id: organizationId,
    error_message: error.message,
    error_stack: error.stack,
    created_at: new Date().toISOString(),
  })
}

async function processTemplateStatusUpdate(value: {
  template_id: string
  status: string
  reason?: string
}) {
  const supabase = await createClient()

  try {
    await supabase.from('message_template_status_updates').insert({
      template_id: value.template_id,
      status: value.status,
      reason: value.reason,
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing template status update:', error)
  }
}

async function processAccountAlerts(value: {
  alert_type: string
  message: string
  severity?: string
  [key: string]: unknown
}) {
  const supabase = await createClient()

  try {
    await supabase.from('account_alerts').insert({
      alert_type: value.alert_type,
      message: value.message,
      severity: value.severity || 'info',
      metadata: value,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing account alert:', error)
  }
}

async function logWebhook(payload: Record<string, unknown>, type: string) {
  const supabase = await createClient()

  await supabase.from('webhook_logs').insert({
    webhook_type: type,
    payload,
    processed_at: new Date().toISOString(),
  })
}
