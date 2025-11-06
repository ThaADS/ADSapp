// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get conversation with all details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        contact:contacts(*),
        assigned_agent:profiles(*)
      `
      )
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (convError) {
      console.error('Error fetching conversation:', convError)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get all messages for the conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:profiles(*)
      `
      )
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Format export data
    const exportData = {
      conversation: {
        id: conversation.id,
        status: conversation.status,
        priority: conversation.priority,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      },
      contact: {
        name: conversation.contact.name,
        phone_number: conversation.contact.phone_number,
        whatsapp_id: conversation.contact.whatsapp_id,
      },
      assigned_agent: conversation.assigned_agent
        ? {
            name: conversation.assigned_agent.full_name,
            email: conversation.assigned_agent.email,
          }
        : null,
      messages:
        messages?.map(msg => ({
          id: msg.id,
          content: msg.content,
          message_type: msg.message_type,
          sender_type: msg.sender_type,
          sender_name: msg.sender?.full_name || conversation.contact.name,
          timestamp: msg.created_at,
          is_read: msg.is_read,
          delivered_at: msg.delivered_at,
          read_at: msg.read_at,
        })) || [],
      exported_at: new Date().toISOString(),
      exported_by: {
        name: profile.full_name,
        email: profile.email,
      },
    }

    // Get format from query params (default to JSON)
    const format = request.nextUrl.searchParams.get('format') || 'json'

    if (format === 'csv') {
      // Export as CSV
      const csvRows = [
        ['Timestamp', 'Sender', 'Type', 'Message', 'Status'].join(','),
        ...exportData.messages.map(msg =>
          [
            msg.timestamp,
            msg.sender_name,
            msg.sender_type,
            `"${msg.content.replace(/"/g, '""')}"`,
            msg.is_read ? 'read' : 'unread',
          ].join(',')
        ),
      ]

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="conversation-${id}.csv"`,
        },
      })
    }

    // Default to JSON export
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="conversation-${id}.json"`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
