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
import { handleCartOrder } from '@/lib/whatsapp/order-handler'
import { processMessageTrigger } from '@/lib/workflow/trigger-service'
import { DripTriggerHandler, DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'

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

// WhatsApp order message from cart submission
interface WhatsAppOrderMessage {
  catalog_id: string
  product_items: {
    product_retailer_id: string
    quantity: number
    item_price: number
    currency: string
  }[]
  text?: string
}

// Extended message type for order handling
interface ExtendedWhatsAppMessage extends WhatsAppMessage {
  order?: WhatsAppOrderMessage
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
      // Cast to ExtendedWhatsAppMessage to handle order messages
      await processIncomingMessage(message as ExtendedWhatsAppMessage, organization.id, value.contacts?.[0])
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
  message: ExtendedWhatsAppMessage,
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

    // Handle order messages (cart submissions) with dedicated handler
    if (message.type === 'order' && message.order) {
      console.log('[WhatsApp Webhook] Processing order from:', message.from)

      const result = await handleCartOrder(
        organizationId,
        contactData.id,
        {
          catalog_id: message.order.catalog_id,
          product_items: message.order.product_items,
          text: message.order.text,
        },
        new Date(parseInt(message.timestamp) * 1000).toISOString()
      )

      if (result.success) {
        console.log('[WhatsApp Webhook] Order processed, conversation:', result.conversationId)
        // Update contact timestamp for order
        await updateContactTimestamp(supabase, contactData.id, message.timestamp)
        await incrementMessageCount(supabase, organizationId, 'inbound')
      } else {
        console.error('[WhatsApp Webhook] Order processing failed:', result.error)
      }

      return // Order handled, exit early
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

    // Track campaign replies - check if this is a reply to a campaign message
    await trackCampaignReply(supabase, contactData.id, organizationId, message.context?.id)

    // Track drip campaign replies (for stop-on-reply feature)
    await trackDripCampaignReply(supabase, contactData.id, organizationId)

    // Trigger workflow automations for incoming messages
    await triggerWorkflowsForMessage(contactData.id, organizationId, messageData.content, message.type)

    // Process any errors in the message
    if (message.errors && message.errors.length > 0) {
      await logMessageErrors(supabase, message.id, message.errors, organizationId)
    }
  } catch (error) {
    console.error('Error processing incoming message:', error)
    await logProcessingError(supabase, message.id, error, organizationId)
  }
}

/**
 * Tracks campaign replies by checking if the incoming message is a response
 * to a campaign message (either directly via context or within a time window)
 */
async function trackCampaignReply(
  supabase: SupabaseClient,
  contactId: string,
  organizationId: string,
  contextMessageId?: string
) {
  try {
    // Check if there's a recent campaign message to this contact
    // that could be the campaign they're replying to
    const replyWindow = 72 * 60 * 60 * 1000 // 72 hours in milliseconds
    const cutoffTime = new Date(Date.now() - replyWindow).toISOString()

    // First, try to find campaign by context message ID (direct reply)
    let campaignJob = null

    if (contextMessageId) {
      const { data: contextJob } = await supabase
        .from('bulk_message_jobs')
        .select('id, campaign_id')
        .eq('message_id', contextMessageId)
        .single()

      campaignJob = contextJob
    }

    // If no direct reply, check for recent campaign messages to this contact
    if (!campaignJob) {
      const { data: recentJob } = await supabase
        .from('bulk_message_jobs')
        .select('id, campaign_id')
        .eq('contact_id', contactId)
        .in('status', ['sent', 'delivered', 'read'])
        .gte('sent_at', cutoffTime)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      campaignJob = recentJob
    }

    if (!campaignJob) {
      return // No campaign to attribute this reply to
    }

    // Mark the job as having received a reply
    await supabase
      .from('bulk_message_jobs')
      .update({
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignJob.id)
      .is('replied_at', null) // Only update if not already marked as replied

    // Update campaign reply statistics
    await updateCampaignReplyStats(supabase, campaignJob.campaign_id)
  } catch (error) {
    console.error('Error tracking campaign reply:', error)
  }
}

/**
 * Updates campaign statistics with reply count
 */
async function updateCampaignReplyStats(
  supabase: SupabaseClient,
  campaignId: string
) {
  try {
    // Count jobs with replies
    const { count: replyCount } = await supabase
      .from('bulk_message_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .not('replied_at', 'is', null)

    // Get current campaign stats
    const { data: campaign } = await supabase
      .from('bulk_campaigns')
      .select('statistics')
      .eq('id', campaignId)
      .single()

    if (!campaign) return

    const statistics = campaign.statistics || {}
    const messagesSent = statistics.messagesSent || 0

    // Update reply stats
    const updatedStats = {
      ...statistics,
      replies: replyCount || 0,
      replyRate: messagesSent > 0 ? ((replyCount || 0) / messagesSent) * 100 : 0,
    }

    await supabase
      .from('bulk_campaigns')
      .update({
        statistics: updatedStats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
  } catch (error) {
    console.error('Error updating campaign reply stats:', error)
  }
}

/**
 * Triggers workflow automations for incoming messages
 * This checks for workflows with 'contact_replied' triggers and executes them
 */
async function triggerWorkflowsForMessage(
  contactId: string,
  organizationId: string,
  messageContent: string | null,
  messageType: string
): Promise<void> {
  try {
    // Fire-and-forget workflow triggers (don't block message processing)
    processMessageTrigger(organizationId, contactId, {
      content: messageContent,
      type: messageType,
      timestamp: new Date().toISOString(),
    }).catch((error) => {
      console.error('[Webhook] Workflow trigger error:', error)
    })
  } catch (error) {
    // Don't fail message processing if workflow triggers fail
    console.error('[Webhook] Failed to trigger workflows:', error)
  }
}

/**
 * Handles drip campaign engagement tracking for incoming messages.
 * This marks active enrollments as "replied" for stop-on-reply feature.
 */
async function trackDripCampaignReply(
  supabase: SupabaseClient,
  contactId: string,
  organizationId: string
): Promise<void> {
  try {
    const engine = new DripCampaignEngine(organizationId)
    const triggerHandler = new DripTriggerHandler(engine)

    // Fire-and-forget - don't block message processing
    triggerHandler.handleMessageReceived(contactId).catch((error) => {
      console.error('[Webhook] Drip campaign reply tracking error:', error)
    })
  } catch (error) {
    // Don't fail message processing if drip tracking fails
    console.error('[Webhook] Failed to track drip campaign reply:', error)
  }
}

async function processMessageStatus(status: MessageStatusUpdate, organizationId: string) {
  const supabase = await createClient()

  // Update message delivery/read status
  const updates: Record<string, string | boolean> = {}
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString()

  switch (status.status) {
    case 'sent':
      updates.sent_at = timestamp
      break
    case 'delivered':
      updates.delivered_at = timestamp
      break
    case 'read':
      updates.read_at = timestamp
      updates.is_read = true
      break
    case 'failed':
      updates.failed_at = timestamp
      break
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('messages').update(updates).eq('whatsapp_message_id', status.id)
  }

  // Update bulk campaign job status if this message belongs to a campaign
  await updateBulkCampaignJobStatus(supabase, status.id, status.status, timestamp)

  // Update drip campaign message logs and A/B variant assignments
  await updateDripMessageStatus(supabase, status.id, status.status, timestamp)
}

/**
 * Updates bulk campaign job status when message status changes
 * Also updates campaign statistics for real-time progress tracking
 */
async function updateBulkCampaignJobStatus(
  supabase: SupabaseClient,
  whatsappMessageId: string,
  status: string,
  timestamp: string
) {
  try {
    // Find the bulk message job by message_id
    const { data: job, error: jobError } = await supabase
      .from('bulk_message_jobs')
      .select('id, campaign_id, status')
      .eq('message_id', whatsappMessageId)
      .single()

    if (jobError || !job) {
      // Not a campaign message, skip
      return
    }

    // Map WhatsApp status to job status
    const jobUpdates: Record<string, string> = {}

    switch (status) {
      case 'sent':
        if (job.status === 'pending') {
          jobUpdates.status = 'sent'
          jobUpdates.sent_at = timestamp
        }
        break
      case 'delivered':
        if (['pending', 'sent'].includes(job.status)) {
          jobUpdates.status = 'delivered'
          jobUpdates.delivered_at = timestamp
        }
        break
      case 'read':
        if (['pending', 'sent', 'delivered'].includes(job.status)) {
          jobUpdates.status = 'read'
          jobUpdates.read_at = timestamp
        }
        break
      case 'failed':
        jobUpdates.status = 'failed'
        jobUpdates.error = 'Message delivery failed'
        break
    }

    if (Object.keys(jobUpdates).length > 0) {
      jobUpdates.updated_at = new Date().toISOString()

      await supabase
        .from('bulk_message_jobs')
        .update(jobUpdates)
        .eq('id', job.id)

      // Trigger campaign statistics recalculation
      await recalculateCampaignStatistics(supabase, job.campaign_id)
    }
  } catch (error) {
    console.error('Error updating bulk campaign job status:', error)
  }
}

/**
 * Recalculates campaign statistics based on current job statuses
 */
async function recalculateCampaignStatistics(
  supabase: SupabaseClient,
  campaignId: string
) {
  try {
    // Get job status counts
    const { data: jobs, error } = await supabase
      .from('bulk_message_jobs')
      .select('status')
      .eq('campaign_id', campaignId)

    if (error || !jobs) return

    const totalTargets = jobs.length
    const messagesSent = jobs.filter(j => ['sent', 'delivered', 'read'].includes(j.status)).length
    const messagesDelivered = jobs.filter(j => ['delivered', 'read'].includes(j.status)).length
    const messagesRead = jobs.filter(j => j.status === 'read').length
    const messagesFailed = jobs.filter(j => j.status === 'failed').length

    const statistics = {
      totalTargets,
      messagesSent,
      messagesDelivered,
      messagesRead,
      messagesFailed,
      optOuts: 0,
      replies: 0, // Will be updated by reply tracking
      deliveryRate: messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0,
      readRate: messagesSent > 0 ? (messagesRead / messagesSent) * 100 : 0,
      replyRate: 0,
      failureRate: totalTargets > 0 ? (messagesFailed / totalTargets) * 100 : 0,
    }

    await supabase
      .from('bulk_campaigns')
      .update({
        statistics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    // Check if campaign is complete
    const pendingJobs = jobs.filter(j => j.status === 'pending').length
    if (pendingJobs === 0 && totalTargets > 0) {
      const { data: campaign } = await supabase
        .from('bulk_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single()

      if (campaign?.status === 'running') {
        await supabase
          .from('bulk_campaigns')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)
      }
    }
  } catch (error) {
    console.error('Error recalculating campaign statistics:', error)
  }
}

/**
 * Updates drip campaign message logs and A/B variant assignments when message status changes.
 * This ensures drip campaign analytics track real delivery/read status from WhatsApp.
 */
async function updateDripMessageStatus(
  supabase: SupabaseClient,
  whatsappMessageId: string,
  status: string,
  timestamp: string
) {
  try {
    // Find the drip message log by message_id
    const { data: messageLog, error: logError } = await supabase
      .from('drip_message_logs')
      .select('id, enrollment_id, step_id, status')
      .eq('message_id', whatsappMessageId)
      .single()

    if (logError || !messageLog) {
      // Not a drip campaign message, skip
      return
    }

    // Map WhatsApp status to drip message log status
    const logUpdates: Record<string, string> = {}

    switch (status) {
      case 'sent':
        if (messageLog.status === 'pending') {
          logUpdates.status = 'sent'
          logUpdates.sent_at = timestamp
        }
        break
      case 'delivered':
        if (['pending', 'sent'].includes(messageLog.status)) {
          logUpdates.status = 'delivered'
          logUpdates.delivered_at = timestamp
        }
        break
      case 'read':
        if (['pending', 'sent', 'delivered'].includes(messageLog.status)) {
          logUpdates.status = 'read'
          logUpdates.read_at = timestamp
        }
        break
      case 'failed':
        logUpdates.status = 'failed'
        logUpdates.error = 'Message delivery failed'
        break
    }

    if (Object.keys(logUpdates).length > 0) {
      logUpdates.updated_at = new Date().toISOString()

      await supabase
        .from('drip_message_logs')
        .update(logUpdates)
        .eq('id', messageLog.id)
    }

    // Update A/B variant assignment if this message is part of an A/B test
    await updateABVariantAssignment(supabase, messageLog.enrollment_id, messageLog.step_id, status, timestamp)
  } catch (error) {
    console.error('Error updating drip message status:', error)
  }
}

/**
 * Updates A/B variant assignment metrics when message status changes.
 * This enables real-time A/B test metrics based on actual delivery/read status.
 */
async function updateABVariantAssignment(
  supabase: SupabaseClient,
  enrollmentId: string,
  stepId: string,
  status: string,
  timestamp: string
) {
  try {
    // Find the variant assignment for this enrollment and step
    const { data: assignment, error: assignmentError } = await supabase
      .from('drip_variant_assignments')
      .select(`
        id,
        test_id,
        variant_id,
        delivered_at,
        read_at,
        replied_at
      `)
      .eq('enrollment_id', enrollmentId)
      .single()

    if (assignmentError || !assignment) {
      // No A/B test assignment for this enrollment
      return
    }

    // Check if the test is for this step
    const { data: test } = await supabase
      .from('drip_ab_tests')
      .select('id, step_id, status')
      .eq('id', assignment.test_id)
      .eq('step_id', stepId)
      .eq('status', 'running')
      .single()

    if (!test) {
      // Test not running or not for this step
      return
    }

    // Update assignment based on status
    const assignmentUpdates: Record<string, string> = {}

    switch (status) {
      case 'delivered':
        if (!assignment.delivered_at) {
          assignmentUpdates.delivered_at = timestamp
        }
        break
      case 'read':
        if (!assignment.read_at) {
          assignmentUpdates.read_at = timestamp
        }
        break
    }

    if (Object.keys(assignmentUpdates).length > 0) {
      // The database trigger will automatically update variant metrics
      await supabase
        .from('drip_variant_assignments')
        .update(assignmentUpdates)
        .eq('id', assignment.id)

      console.log(`[Webhook] Updated A/B variant assignment ${assignment.id} with ${status} status`)
    }
  } catch (error) {
    console.error('Error updating A/B variant assignment:', error)
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
