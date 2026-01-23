import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔧 FIX: Query organization directly instead of relying on middleware headers
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const sender = searchParams.get('sender')
    const tags = searchParams.get('tags')?.split(',')
    const messageType = searchParams.get('type')

    const supabase = await createClient()

    // Build query with organization filter
    let messagesQuery = supabase
      .from('messages')
      .select(
        `
        *,
        conversation:conversations!inner(
          id,
          organization_id,
          contact:contacts(id, name, phone_number)
        ),
        sender:profiles(id, full_name)
      `
      )
      .eq('conversation.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply text search if provided
    if (query) {
      messagesQuery = messagesQuery.or(
        `content.ilike.%${query}%,metadata->>'caption'.ilike.%${query}%`
      )
    }

    // Apply date filters
    if (dateFrom) {
      messagesQuery = messagesQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      messagesQuery = messagesQuery.lte('created_at', dateTo)
    }

    // Apply sender filter
    if (sender) {
      messagesQuery = messagesQuery.eq('sender_type', sender)
    }

    // Apply message type filter
    if (messageType) {
      messagesQuery = messagesQuery.eq('message_type', messageType)
    }

    const { data: messages, error } = await messagesQuery

    if (error) {
      throw error
    }

    return createSuccessResponse({
      messages: messages || [],
      total: messages?.length || 0,
      query: {
        text: query,
        dateFrom,
        dateTo,
        sender,
        tags,
        messageType,
      },
    })
  } catch (error) {
    console.error('Error searching messages:', error)
    return createErrorResponse(error)
  }
}
