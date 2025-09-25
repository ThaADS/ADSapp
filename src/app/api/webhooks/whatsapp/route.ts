import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppWebhookPayload } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Webhook verification
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified')
    return new NextResponse(challenge)
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json()

    // Log webhook payload for debugging
    await logWebhook(body, 'whatsapp_message')

    // Process each entry in the webhook payload
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          await processMessages(change.value)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processMessages(value: any) {
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

  // Process incoming messages
  if (value.messages) {
    for (const message of value.messages) {
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

async function processIncomingMessage(message: any, organizationId: string, contact?: any) {
  const supabase = await createClient()

  // Upsert contact
  const { data: contactData } = await supabase
    .from('contacts')
    .upsert({
      organization_id: organizationId,
      whatsapp_id: message.from,
      phone_number: message.from,
      name: contact?.profile?.name || null,
      last_message_at: message.timestamp,
    }, {
      onConflict: 'organization_id,whatsapp_id',
    })
    .select()
    .single()

  if (!contactData) {
    console.error('Failed to upsert contact')
    return
  }

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactData.id)
    .eq('status', 'open')
    .maybeSingle()

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        contact_id: contactData.id,
        status: 'open',
        last_message_at: message.timestamp,
      })
      .select()
      .single()

    conversation = newConversation
  }

  if (!conversation) {
    console.error('Failed to create conversation')
    return
  }

  // Extract message content based on type
  let content = ''
  let mediaUrl: string | null = null
  let mediaMimeType: string | null = null

  switch (message.type) {
    case 'text':
      content = message.text.body
      break
    case 'image':
      content = message.image.caption || '[Image]'
      mediaUrl = message.image.id // We'll need to fetch the actual URL
      mediaMimeType = message.image.mime_type
      break
    case 'document':
      content = message.document.caption || message.document.filename || '[Document]'
      mediaUrl = message.document.id
      mediaMimeType = message.document.mime_type
      break
    case 'audio':
      content = '[Audio Message]'
      mediaUrl = message.audio.id
      mediaMimeType = message.audio.mime_type
      break
    case 'video':
      content = message.video.caption || '[Video]'
      mediaUrl = message.video.id
      mediaMimeType = message.video.mime_type
      break
    case 'location':
      content = `Location: ${message.location.latitude}, ${message.location.longitude}`
      if (message.location.name) {
        content += ` - ${message.location.name}`
      }
      break
    default:
      content = `[${message.type} message]`
  }

  // Insert message
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      whatsapp_message_id: message.id,
      sender_type: 'contact',
      content,
      message_type: message.type,
      media_url: mediaUrl,
      media_mime_type: mediaMimeType,
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })

  if (error) {
    console.error('Failed to insert message:', error)
    return
  }

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })
    .eq('id', conversation.id)

  // Update contact last_message_at
  await supabase
    .from('contacts')
    .update({
      last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })
    .eq('id', contactData.id)
}

async function processMessageStatus(status: any, organizationId: string) {
  const supabase = await createClient()

  // Update message delivery/read status
  const updates: any = {}

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
    await supabase
      .from('messages')
      .update(updates)
      .eq('whatsapp_message_id', status.id)
  }
}

async function logWebhook(payload: any, type: string) {
  const supabase = await createClient()

  await supabase
    .from('webhook_logs')
    .insert({
      webhook_type: type,
      payload,
      processed_at: new Date().toISOString(),
    })
}