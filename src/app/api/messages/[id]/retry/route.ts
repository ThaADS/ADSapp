/**
 * Message Retry API
 * Purpose: Retry sending a failed message
 * Phase: 23 - Status & Delivery
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getTwilioWhatsAppClient } from '@/lib/integrations/twilio-whatsapp/client'
import { isRetryableError, getErrorInfoSync } from '@/lib/integrations/twilio-whatsapp/error-codes'
import type { RetryMessageResponse } from '@/types/twilio-whatsapp'

/**
 * POST /api/messages/[id]/retry
 * Retry sending a failed message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate message ID
    const validation = QueryValidators.uuid(id)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      )
    }

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get the original message with full details
    const { data: originalMessage, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        organization_id,
        direction,
        content,
        message_type,
        media_url,
        media_type,
        status,
        error_code,
        channel_message_id,
        metadata
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (messageError || !originalMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Validate message can be retried
    if (originalMessage.direction !== 'outbound') {
      return NextResponse.json(
        { error: 'Only outbound messages can be retried' },
        { status: 400 }
      )
    }

    if (!['failed', 'undelivered'].includes(originalMessage.status)) {
      return NextResponse.json(
        { error: 'Only failed or undelivered messages can be retried' },
        { status: 400 }
      )
    }

    // Check if error is retryable
    if (originalMessage.error_code) {
      const isRetryable = isRetryableError(originalMessage.error_code)
      if (!isRetryable) {
        const errorInfo = getErrorInfoSync(originalMessage.error_code)
        return NextResponse.json(
          {
            error: 'This error cannot be retried',
            details: errorInfo.userMessage,
          },
          { status: 400 }
        )
      }
    }

    // Get conversation to find recipient
    const { data: conversation } = await supabase
      .from('conversations')
      .select('contact_id, channel')
      .eq('id', originalMessage.conversation_id)
      .single()

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get contact phone number
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone')
      .eq('id', conversation.contact_id)
      .single()

    if (!contact?.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 404 }
      )
    }

    // Get Twilio client for organization
    let twilioClient
    try {
      twilioClient = await getTwilioWhatsAppClient(profile.organization_id)
    } catch (error) {
      return NextResponse.json(
        { error: 'WhatsApp connection not configured' },
        { status: 400 }
      )
    }

    // Create new message record (preserve original for history)
    const { data: newMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: originalMessage.conversation_id,
        organization_id: originalMessage.organization_id,
        direction: 'outbound',
        content: originalMessage.content,
        message_type: originalMessage.message_type,
        media_url: originalMessage.media_url,
        media_type: originalMessage.media_type,
        status: 'pending',
        sender_id: user.id,
        metadata: {
          ...(typeof originalMessage.metadata === 'object' ? originalMessage.metadata : {}),
          retry_of: originalMessage.id,
          retry_count: ((originalMessage.metadata as Record<string, unknown>)?.retry_count as number || 0) + 1,
        },
      })
      .select('id')
      .single()

    if (createError || !newMessage) {
      console.error('Failed to create retry message:', createError)
      return NextResponse.json(
        { error: 'Failed to create retry message' },
        { status: 500 }
      )
    }

    // Send message via Twilio
    const twilioResponse = await twilioClient.sendMessage({
      to: contact.phone,
      body: originalMessage.content || undefined,
      mediaUrl: originalMessage.media_url || undefined,
    })

    // Update new message with Twilio response
    if (twilioResponse.sid) {
      await supabase
        .from('messages')
        .update({
          channel_message_id: twilioResponse.sid,
          status: twilioResponse.status === 'failed' ? 'failed' : 'queued',
          error_code: twilioResponse.errorCode?.toString() || null,
          error_message: twilioResponse.errorMessage || null,
        })
        .eq('id', newMessage.id)

      // Update original message metadata with retry reference
      await supabase
        .from('messages')
        .update({
          metadata: {
            ...(typeof originalMessage.metadata === 'object' ? originalMessage.metadata : {}),
            retried_with: newMessage.id,
            retried_at: new Date().toISOString(),
          },
        })
        .eq('id', originalMessage.id)
    } else {
      // Sending failed immediately
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_code: twilioResponse.errorCode?.toString() || null,
          error_message: twilioResponse.errorMessage || null,
        })
        .eq('id', newMessage.id)
    }

    // Update conversation last activity
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', originalMessage.conversation_id)

    const response: RetryMessageResponse = {
      success: !!twilioResponse.sid,
      newMessageId: newMessage.id,
      newChannelMessageId: twilioResponse.sid || undefined,
      error: twilioResponse.errorMessage || undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Message retry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
