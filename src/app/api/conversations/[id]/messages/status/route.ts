/**
 * Conversation Messages Status API
 * Purpose: Batch status check for messages in a conversation
 * Phase: 23 - Status & Delivery
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getErrorInfoSync } from '@/lib/integrations/twilio-whatsapp/error-codes'
import type { TwilioWhatsAppMessageStatus } from '@/types/twilio-whatsapp'

interface MessageStatusSummary {
  messageId: string
  channelMessageId: string | null
  status: TwilioWhatsAppMessageStatus
  timestamps: {
    created: string
    sent: string | null
    delivered: string | null
    read: string | null
  }
  error: {
    code: string
    userMessage: string
    retryable: boolean
  } | null
}

interface ConversationStatusResponse {
  conversationId: string
  messages: MessageStatusSummary[]
  summary: {
    total: number
    pending: number
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

/**
 * GET /api/conversations/[id]/messages/status
 * Get status for recent outbound messages in conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const direction = searchParams.get('direction') || 'outbound' // 'outbound' | 'all'

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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Verify conversation belongs to organization
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build query for messages
    let query = supabase
      .from('messages')
      .select(`
        id,
        channel_message_id,
        status,
        direction,
        created_at,
        sent_at,
        delivered_at,
        read_at,
        error_code,
        error_message
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by direction if specified
    if (direction === 'outbound') {
      query = query.eq('direction', 'outbound')
    }

    const { data: messages, error: messagesError } = await query

    if (messagesError) {
      console.error('Messages query error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Map messages to status summaries
    const messageStatuses: MessageStatusSummary[] = (messages || []).map((msg) => {
      let errorInfo = null
      if (msg.error_code) {
        const info = getErrorInfoSync(msg.error_code)
        errorInfo = {
          code: info.code,
          userMessage: info.userMessage,
          retryable: info.retryable,
        }
      }

      return {
        messageId: msg.id,
        channelMessageId: msg.channel_message_id,
        status: msg.status as TwilioWhatsAppMessageStatus,
        timestamps: {
          created: msg.created_at,
          sent: msg.sent_at,
          delivered: msg.delivered_at,
          read: msg.read_at,
        },
        error: errorInfo,
      }
    })

    // Calculate summary
    const summary = {
      total: messageStatuses.length,
      pending: messageStatuses.filter((m) =>
        ['pending', 'queued', 'sending', 'accepted'].includes(m.status)
      ).length,
      sent: messageStatuses.filter((m) => m.status === 'sent').length,
      delivered: messageStatuses.filter((m) => m.status === 'delivered').length,
      read: messageStatuses.filter((m) => m.status === 'read').length,
      failed: messageStatuses.filter((m) =>
        ['failed', 'undelivered'].includes(m.status)
      ).length,
    }

    const response: ConversationStatusResponse = {
      conversationId: id,
      messages: messageStatuses,
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Conversation status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
