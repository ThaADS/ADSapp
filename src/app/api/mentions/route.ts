import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mentions
 * Fetch mentions for the current user
 * Query params:
 * - unread: "true" to fetch only unread mentions
 * - limit: number of mentions to fetch (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('mentions')
      .select(`
        id,
        note_id,
        conversation_id,
        organization_id,
        mentioned_user_id,
        mentioning_user_id,
        viewed_at,
        email_sent_at,
        created_at,
        conversation_notes!inner (
          content_plain,
          conversation_id
        ),
        mentioning_user:profiles!mentions_mentioning_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('mentioned_user_id', user.id)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.is('viewed_at', null)
    }

    const { data: mentions, error } = await query

    if (error) {
      console.error('Error fetching mentions:', error)
      throw error
    }

    // Transform to MentionNotification format
    const notifications = (mentions || []).map((m: any) => ({
      id: m.id,
      type: 'mention' as const,
      title: `${m.mentioning_user?.full_name || 'Someone'} mentioned you`,
      message: m.conversation_notes?.content_plain?.slice(0, 100) || '',
      conversation_id: m.conversation_id,
      note_id: m.note_id,
      mentioning_user: {
        id: m.mentioning_user?.id || m.mentioning_user_id,
        full_name: m.mentioning_user?.full_name || null,
        avatar_url: m.mentioning_user?.avatar_url || null,
      },
      created_at: m.created_at,
      viewed: !!m.viewed_at,
    }))

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('mentions')
      .select('id', { count: 'exact', head: true })
      .eq('mentioned_user_id', user.id)
      .eq('organization_id', organizationId)
      .is('viewed_at', null)

    return createSuccessResponse({
      mentions: notifications,
      unread_count: unreadCount || 0,
    })
  } catch (error) {
    console.error('Error fetching mentions:', error)
    return createErrorResponse(error)
  }
}

/**
 * POST /api/mentions/mark-all-read
 * Mark all mentions as read for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Mark all unread mentions as viewed
    const { error } = await supabase
      .from('mentions')
      .update({ viewed_at: new Date().toISOString() })
      .eq('mentioned_user_id', user.id)
      .eq('organization_id', organizationId)
      .is('viewed_at', null)

    if (error) {
      console.error('Error marking all mentions as read:', error)
      throw error
    }

    return createSuccessResponse({ message: 'All mentions marked as read' })
  } catch (error) {
    console.error('Error marking all mentions as read:', error)
    return createErrorResponse(error)
  }
}
