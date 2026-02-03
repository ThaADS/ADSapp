/**
 * Message Status API
 * Purpose: Get message status and history
 * Phase: 23 - Status & Delivery
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getErrorInfo } from '@/lib/integrations/twilio-whatsapp/error-codes'
import type {
  MessageStatusResponse,
  TwilioWhatsAppMessageStatus,
  TwilioMessageStatusHistoryRow,
} from '@/types/twilio-whatsapp'

/**
 * GET /api/messages/[id]/status
 * Get detailed status information for a message
 */
export async function GET(
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get message with status
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        channel_message_id,
        status,
        created_at,
        sent_at,
        delivered_at,
        read_at,
        error_code,
        error_message,
        organization_id
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Get status history
    const { data: historyRows } = await supabase
      .from('twilio_whatsapp_message_status_history')
      .select('*')
      .eq('message_id', id)
      .order('created_at', { ascending: true })

    const history = (historyRows || []).map((row: TwilioMessageStatusHistoryRow) => ({
      status: row.status as TwilioWhatsAppMessageStatus,
      timestamp: row.twilio_timestamp || row.created_at,
      errorCode: row.error_code || undefined,
    }))

    // Get error info if message failed
    let errorInfo = null
    if (message.error_code) {
      const info = await getErrorInfo(message.error_code)
      errorInfo = {
        code: info.code,
        message: info.message,
        userMessage: info.userMessage,
        retryable: info.retryable,
      }
    }

    const response: MessageStatusResponse = {
      messageId: message.id,
      channelMessageId: message.channel_message_id || '',
      currentStatus: message.status as TwilioWhatsAppMessageStatus,
      timestamps: {
        created: message.created_at,
        sent: message.sent_at,
        delivered: message.delivered_at,
        read: message.read_at,
      },
      error: errorInfo,
      history,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Message status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
