/**
 * Zapier Messages Polling Trigger
 *
 * Returns recent messages for Zapier trigger preview/polling fallback.
 * Used when REST Hooks are not available or for Zap editor preview.
 *
 * GET /api/integrations/zapier/triggers/messages
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  createSuccessResponse,
  createErrorResponse,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'

async function handler(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)

  const supabase = createServiceRoleClient()

  // Get recent incoming messages for this organization
  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      message_type,
      direction,
      status,
      created_at,
      conversation:conversations!inner (
        id,
        channel,
        contact:contacts!inner (
          id,
          name,
          phone_number,
          email,
          tags
        )
      )
    `)
    .eq('conversation.organization_id', context.organizationId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching messages:', error)
    return createErrorResponse('database_error', 'Failed to fetch messages', 500)
  }

  // Transform to Zapier webhook payload format
  const transformed = (messages || []).map((msg) => {
    const conv = msg.conversation as {
      id: string
      channel: string
      contact: {
        id: string
        name: string
        phone_number: string
        email: string | null
        tags: string[]
      }
    }

    return {
      id: `msg_${msg.id}`,
      event: 'message.received',
      timestamp: msg.created_at,
      organization_id: context.organizationId,
      data: {
        message_id: msg.id,
        conversation_id: conv.id,
        contact: {
          id: conv.contact.id,
          name: conv.contact.name,
          phone: conv.contact.phone_number,
          email: conv.contact.email,
          tags: conv.contact.tags,
        },
        content: {
          type: msg.message_type || 'text',
          text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        },
        channel: conv.channel,
        received_at: msg.created_at,
      },
    }
  })

  return createSuccessResponse({
    messages: transformed,
  })
}

export const GET = withZapierMiddleware(handler, {
  rateLimitType: 'actions',
  requiredScopes: ['messages:read'],
})
