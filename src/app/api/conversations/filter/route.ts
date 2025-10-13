import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const organizationId = searchParams.get('organization_id')
    if (organizationId !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse filter parameters
    const status = searchParams.get('status')?.split(',').filter(Boolean)
    const priority = searchParams.get('priority')?.split(',').filter(Boolean)
    const assignedTo = searchParams.get('assigned_to')?.split(',').filter(Boolean)
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const hasUnread = searchParams.get('has_unread')
    const messageType = searchParams.get('message_type')?.split(',').filter(Boolean)
    const contactId = searchParams.get('contact_id')?.split(',').filter(Boolean)
    const dateField = searchParams.get('date_field') || 'last_message_at'
    const dateStart = searchParams.get('date_start')
    const dateEnd = searchParams.get('date_end')
    const sortField = searchParams.get('sort_field') || 'last_message_at'
    const sortDirection = searchParams.get('sort_direction') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeAggregations = searchParams.get('include_aggregations') === 'true'

    // Build the query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts!conversations_contact_id_fkey (
          id,
          name,
          phone_number,
          profile_picture_url
        ),
        assigned_agent:profiles!conversations_assigned_to_fkey (
          id,
          full_name,
          avatar_url
        ),
        last_message:messages (
          content,
          message_type,
          sender_type
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })

    // Apply filters
    if (status?.length) {
      query = query.in('status', status)
    }

    if (priority?.length) {
      query = query.in('priority', priority)
    }

    if (assignedTo?.length) {
      query = query.in('assigned_to', assignedTo)
    }

    if (tags?.length) {
      query = query.overlaps('tags', tags)
    }

    if (hasUnread === 'true') {
      query = query.gt('unread_count', 0)
    } else if (hasUnread === 'false') {
      query = query.eq('unread_count', 0)
    }

    if (contactId?.length) {
      query = query.in('contact_id', contactId)
    }

    if (dateStart) {
      query = query.gte(dateField, dateStart)
    }

    if (dateEnd) {
      query = query.lte(dateField, dateEnd)
    }

    // Apply sorting
    query = query.order(sortField as any, { ascending: sortDirection === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: conversations, error, count } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response
    const formattedConversations = conversations?.map(conv => ({
      ...conv,
      last_message: conv.last_message?.[0] || null
    })) || []

    const response: any = {
      conversations: formattedConversations,
      totalCount: count || 0
    }

    // Add aggregations if requested
    if (includeAggregations) {
      const { data: allConversations } = await supabase
        .from('conversations')
        .select('status, priority, tags')
        .eq('organization_id', organizationId)

      if (allConversations) {
        const statusCounts: Record<string, number> = {}
        const priorityCounts: Record<string, number> = {}
        const tagCounts: Record<string, number> = {}

        allConversations.forEach(conv => {
          // Count statuses
          statusCounts[conv.status] = (statusCounts[conv.status] || 0) + 1

          // Count priorities
          priorityCounts[conv.priority] = (priorityCounts[conv.priority] || 0) + 1

          // Count tags
          conv.tags?.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        })

        response.aggregations = {
          statusCounts,
          priorityCounts,
          tagCounts
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in conversations filter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
