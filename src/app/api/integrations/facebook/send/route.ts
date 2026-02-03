/**
 * Facebook Messenger Send Message Endpoint
 *
 * POST /api/integrations/facebook/send - Send a message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getFacebookConnection,
  sendTextMessage,
  sendTemplateMessage,
  sendQuickReplyMessage
} from '@/lib/integrations/facebook'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get Facebook connection
    const connection = await getFacebookConnection(profile.organization_id)
    if (!connection) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }

    // Parse body
    const body = await request.json()

    // Validate required fields
    if (!body.psid) {
      return NextResponse.json(
        { error: 'Missing required field: psid' },
        { status: 400 }
      )
    }

    // Determine message type and send
    let result

    if (body.template_id) {
      // Send template by ID
      const { data: template } = await supabase
        .from('messenger_templates')
        .select('*')
        .eq('id', body.template_id)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .single()

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      result = await sendTemplateMessage(
        connection,
        body.psid,
        template.template_payload
      )
    } else if (body.template) {
      // Send inline template
      result = await sendTemplateMessage(
        connection,
        body.psid,
        body.template
      )
    } else if (body.quick_replies && body.text) {
      // Send quick reply message
      result = await sendQuickReplyMessage(
        connection,
        body.psid,
        body.text,
        body.quick_replies
      )
    } else if (body.text) {
      // Send text message
      result = await sendTextMessage(
        connection,
        body.psid,
        body.text,
        body.messaging_type || 'RESPONSE',
        body.tag
      )
    } else {
      return NextResponse.json(
        { error: 'Missing message content: text, template, or template_id required' },
        { status: 400 }
      )
    }

    // Get conversation and save outbound message
    const { data: fbConversation } = await supabase
      .from('facebook_conversations')
      .select('id, conversation_id')
      .eq('facebook_connection_id', connection.id)
      .eq('psid', body.psid)
      .single()

    if (fbConversation) {
      // Save to facebook_messages
      await supabase
        .from('facebook_messages')
        .insert({
          facebook_conversation_id: fbConversation.id,
          facebook_message_id: result.message_id,
          direction: 'outbound',
          sender_id: connection.page_id,
          recipient_id: body.psid,
          message_type: body.template || body.template_id ? 'template' : 'text',
          text: body.text || null,
          template_type: body.template?.template_type || null,
          template_payload: body.template || null,
          status: 'sent',
          facebook_timestamp: new Date().toISOString()
        })

      // Update conversation
      await supabase
        .from('facebook_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', fbConversation.id)

      // Also save to unified messages if linked
      if (fbConversation.conversation_id) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: fbConversation.conversation_id,
            organization_id: profile.organization_id,
            direction: 'outbound',
            content: body.text || '[Template message]',
            message_type: body.template || body.template_id ? 'template' : 'text',
            channel: 'facebook',
            channel_message_id: result.message_id,
            status: 'sent',
            sender_id: user.id,
            created_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({
      success: true,
      message_id: result.message_id,
      recipient_id: result.recipient_id
    })
  } catch (error) {
    console.error('Facebook send message error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
