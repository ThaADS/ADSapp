import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { WhatsAppService } from '@/lib/whatsapp/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: conversationId } = await params;

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, organization:organizations(*)')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== conversation.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get messages for this conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: conversationId } = await params;

    const body = await request.json()
    const { content, type = 'text' } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, organization:organizations(*)')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== conversation.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Send message via WhatsApp
    const whatsappService = await WhatsAppService.createFromOrganization(conversation.organization_id)
    const message = await whatsappService.sendMessage(
      conversationId,
      content,
      user.id,
      type
    )

    // Return the created message
    const { data: messageWithSender } = await supabase
      .from('messages')
      .select('*, sender:profiles(full_name, avatar_url)')
      .eq('id', message.id)
      .single()

    return NextResponse.json({ message: messageWithSender }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)

    if (error instanceof Error && error.message.includes('WhatsApp')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: conversationId } = await params;

    const body = await request.json()
    const { action, messageId } = body

    if (action !== 'mark_read' || !messageId) {
      return NextResponse.json({ error: 'Invalid action or missing messageId' }, { status: 400 })
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, organization:organizations(*)')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check if user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== conversation.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mark message as read via WhatsApp
    const whatsappService = await WhatsAppService.createFromOrganization(conversation.organization_id)
    await whatsappService.markMessageAsRead(messageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}