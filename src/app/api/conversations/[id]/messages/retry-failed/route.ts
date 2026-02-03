/**
 * Conversation Bulk Retry API
 * Purpose: Retry all failed messages in a conversation
 * Phase: 23 - Status & Delivery
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getTwilioWhatsAppClient } from '@/lib/integrations/twilio-whatsapp/client'
import { isRetryableError } from '@/lib/integrations/twilio-whatsapp/error-codes'
import type { BulkRetryResponse } from '@/types/twilio-whatsapp'

interface RetryResult {
  originalMessageId: string
  newMessageId?: string
  success: boolean
  error?: string
}

/**
 * POST /api/conversations/[id]/messages/retry-failed
 * Retry all failed/undelivered messages in a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Parse optional body for filtering
    let maxRetries = 10 // Default max messages to retry at once
    let retryNonRetryable = false // By default, skip non-retryable errors

    try {
      const body = await request.json()
      if (body.maxRetries) maxRetries = Math.min(body.maxRetries, 50)
      if (body.retryNonRetryable) retryNonRetryable = body.retryNonRetryable
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate conversation ID
    const validation = QueryValidators.uuid(id)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    // Get user's organization
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

    // Verify conversation belongs to organization and get contact
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, contact_id, channel')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
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

    // Get all failed outbound messages in conversation
    const { data: failedMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        media_url,
        media_type,
        status,
        error_code,
        metadata
      `)
      .eq('conversation_id', id)
      .eq('direction', 'outbound')
      .in('status', ['failed', 'undelivered'])
      .order('created_at', { ascending: true })
      .limit(maxRetries)

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    if (!failedMessages || failedMessages.length === 0) {
      return NextResponse.json({
        retried: 0,
        failed: 0,
        skipped: 0,
        results: [],
      } as BulkRetryResponse)
    }

    // Process each message
    const results: RetryResult[] = []
    let retried = 0
    let failed = 0
    let skipped = 0

    for (const msg of failedMessages) {
      // Check if error is retryable
      if (!retryNonRetryable && msg.error_code && !isRetryableError(msg.error_code)) {
        skipped++
        results.push({
          originalMessageId: msg.id,
          success: false,
          error: 'Error is not retryable',
        })
        continue
      }

      // Create new message record
      const { data: newMessage, error: createError } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          organization_id: profile.organization_id,
          direction: 'outbound',
          content: msg.content,
          message_type: msg.message_type,
          media_url: msg.media_url,
          media_type: msg.media_type,
          status: 'pending',
          sender_id: user.id,
          metadata: {
            ...(typeof msg.metadata === 'object' ? msg.metadata : {}),
            retry_of: msg.id,
            retry_count: ((msg.metadata as Record<string, unknown>)?.retry_count as number || 0) + 1,
            bulk_retry: true,
          },
        })
        .select('id')
        .single()

      if (createError || !newMessage) {
        failed++
        results.push({
          originalMessageId: msg.id,
          success: false,
          error: 'Failed to create retry message',
        })
        continue
      }

      // Send message via Twilio
      const twilioResponse = await twilioClient.sendMessage({
        to: contact.phone,
        body: msg.content || undefined,
        mediaUrl: msg.media_url || undefined,
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

        // Update original message metadata
        await supabase
          .from('messages')
          .update({
            metadata: {
              ...(typeof msg.metadata === 'object' ? msg.metadata : {}),
              retried_with: newMessage.id,
              retried_at: new Date().toISOString(),
            },
          })
          .eq('id', msg.id)

        retried++
        results.push({
          originalMessageId: msg.id,
          newMessageId: newMessage.id,
          success: true,
        })
      } else {
        // Sending failed
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_code: twilioResponse.errorCode?.toString() || null,
            error_message: twilioResponse.errorMessage || null,
          })
          .eq('id', newMessage.id)

        failed++
        results.push({
          originalMessageId: msg.id,
          newMessageId: newMessage.id,
          success: false,
          error: twilioResponse.errorMessage || 'Failed to send',
        })
      }
    }

    // Update conversation last activity if any messages were retried
    if (retried > 0) {
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    const response: BulkRetryResponse = {
      retried,
      failed,
      skipped,
      results,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Bulk retry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
