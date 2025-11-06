import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const body = await request.json()
    const {
      organizationId,
      text,
      type = 'all',
      filters = {},
      sortBy = 'relevance',
      highlight = false,
      limit = 20,
      offset = 0,
    } = body

    if (organizationId !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startTime = Date.now()
    const results: any[] = []

    // Search conversations
    if (type === 'conversations' || type === 'all') {
      let query = supabase
        .from('conversations')
        .select(
          `
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
        `
        )
        .eq('organization_id', organizationId)
        .order('created_at', { foreignTable: 'messages', ascending: false })
        .limit(1, { foreignTable: 'messages' })

      if (text) {
        query = query.or(`subject.ilike.%${text}%,tags.cs.{${text}}`)
      }

      if (filters.status?.length) {
        query = query.in('status', filters.status)
      }

      if (filters.priority?.length) {
        query = query.in('priority', filters.priority)
      }

      if (filters.contactId?.length) {
        query = query.in('contact_id', filters.contactId)
      }

      const { data: conversations } = await query.limit(limit)

      conversations?.forEach(conv => {
        results.push({
          id: conv.id,
          type: 'conversation',
          score: 0.9,
          data: {
            ...conv,
            last_message: conv.last_message?.[0] || null,
          },
          highlights: highlight
            ? [
                {
                  field: 'subject',
                  fragments: [conv.subject || ''],
                },
              ]
            : undefined,
        })
      })
    }

    // Search messages
    if (type === 'messages' || type === 'all') {
      let query = supabase
        .from('messages')
        .select(
          `
          *,
          conversation:conversations!messages_conversation_id_fkey (
            id,
            contact_id
          ),
          contact:contacts!messages_contact_id_fkey (
            id,
            name,
            phone_number
          )
        `
        )
        .eq('organization_id', organizationId)

      if (text) {
        query = query.ilike('content', `%${text}%`)
      }

      if (filters.messageType?.length) {
        query = query.in('message_type', filters.messageType)
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start)
        }
        if (filters.dateRange.end) {
          query = query.lte('created_at', filters.dateRange.end)
        }
      }

      const { data: messages } = await query.limit(limit)

      messages?.forEach(msg => {
        results.push({
          id: msg.id,
          type: 'message',
          score: 0.85,
          data: msg,
          highlights: highlight
            ? [
                {
                  field: 'content',
                  fragments: [msg.content || ''],
                },
              ]
            : undefined,
        })
      })
    }

    // Search contacts
    if (type === 'contacts' || type === 'all') {
      let query = supabase.from('contacts').select('*').eq('organization_id', organizationId)

      if (text) {
        query = query.or(`name.ilike.%${text}%,phone_number.ilike.%${text}%`)
      }

      const { data: contacts } = await query.limit(limit)

      contacts?.forEach(contact => {
        results.push({
          id: contact.id,
          type: 'contact',
          score: 0.8,
          data: contact,
          highlights: highlight
            ? [
                {
                  field: 'name',
                  fragments: [contact.name || ''],
                },
              ]
            : undefined,
        })
      })
    }

    // Sort results
    if (sortBy === 'relevance') {
      results.sort((a, b) => b.score - a.score)
    } else if (sortBy === 'date') {
      results.sort((a, b) => {
        const dateA = new Date(a.data.created_at || 0).getTime()
        const dateB = new Date(b.data.created_at || 0).getTime()
        return dateB - dateA
      })
    }

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      results: results.slice(offset, offset + limit),
      totalCount: results.length,
      suggestions: [],
      facets: {
        status: { open: 0, pending: 0, resolved: 0, closed: 0 },
        priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        messageType: { text: 0, image: 0, document: 0, audio: 0, video: 0 },
      },
      query: { text, type, filters, sortBy, highlight, limit, offset },
      executionTime,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
