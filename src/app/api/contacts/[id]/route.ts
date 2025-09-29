import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .select(`
        *,
        conversations (
          id,
          status,
          priority,
          subject,
          created_at,
          last_message_at,
          assigned_to,
          profiles (
            full_name
          ),
          messages (
            id,
            content,
            sender_type,
            message_type,
            created_at
          )
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Calculate contact statistics
    const conversations = contact.conversations || []
    const allMessages = conversations.flatMap(c => c.messages || [])

    const stats = {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === 'open' || c.status === 'pending').length,
      totalMessages: allMessages.length,
      inboundMessages: allMessages.filter(m => m.sender_type === 'contact').length,
      outboundMessages: allMessages.filter(m => m.sender_type === 'agent').length,
      firstContactDate: conversations.length > 0
        ? conversations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at
        : contact.created_at,
      lastContactDate: contact.last_message_at,
      averageResponseTime: calculateAverageResponseTime(conversations),
      messageFrequency: calculateMessageFrequency(allMessages)
    }

    const contactWithStats = {
      ...contact,
      stats,
      conversations: conversations.map(conv => ({
        ...conv,
        messageCount: conv.messages?.length || 0,
        assignedAgent: conv.profiles?.full_name || null
      }))
    }

    return createSuccessResponse(contactWithStats)

  } catch (error) {
    console.error('Error fetching contact:', error)
    return createErrorResponse(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    const body = await request.json()
    const { name, email, tags, notes, metadata, is_blocked } = body

    const supabase = await createClient()

    // Check if contact exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Update contact
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (tags !== undefined) updateData.tags = tags
    if (notes !== undefined) updateData.notes = notes
    if (is_blocked !== undefined) updateData.is_blocked = is_blocked

    if (metadata !== undefined) {
      // Merge with existing metadata
      const { data: current } = await supabase
        .from('contacts')
        .select('metadata')
        .eq('id', id)
        .single()

      updateData.metadata = {
        ...(current?.metadata || {}),
        ...metadata,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }
    }

    const { data: updatedContact, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(updatedContact)

  } catch (error) {
    console.error('Error updating contact:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    const supabase = await createClient()

    // Check if contact exists
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Check if contact has active conversations
    const { data: activeConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', id)
      .in('status', ['open', 'pending'])

    if (activeConversations && activeConversations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete contact with active conversations. Please close all conversations first.' },
        { status: 400 }
      )
    }

    // Delete the contact (this will cascade to related records)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      id: id,
      message: 'Contact deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting contact:', error)
    return createErrorResponse(error)
  }
}

interface ConversationMessage {
  created_at: string;
  sender_type: string;
}

interface ConversationWithMessages {
  messages?: ConversationMessage[];
}

function calculateAverageResponseTime(conversations: ConversationWithMessages[]): number {
  const responseTimes = []

  for (const conversation of conversations) {
    const messages = conversation.messages || []
    const sortedMessages = messages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const currentMessage = sortedMessages[i]
      const nextMessage = sortedMessages[i + 1]

      // Calculate response time from contact message to agent message
      if (currentMessage.sender_type === 'contact' && nextMessage.sender_type === 'agent') {
        const responseTime = new Date(nextMessage.created_at).getTime() - new Date(currentMessage.created_at).getTime()
        responseTimes.push(responseTime)
      }
    }
  }

  if (responseTimes.length === 0) return 0

  const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  return Math.round(averageMs / (1000 * 60)) // Convert to minutes
}

interface Message {
  created_at: string;
}

function calculateMessageFrequency(messages: Message[]): { daily: number; weekly: number; monthly: number } {
  if (messages.length === 0) {
    return { daily: 0, weekly: 0, monthly: 0 }
  }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const dailyMessages = messages.filter(m => new Date(m.created_at) >= oneDayAgo).length
  const weeklyMessages = messages.filter(m => new Date(m.created_at) >= oneWeekAgo).length
  const monthlyMessages = messages.filter(m => new Date(m.created_at) >= oneMonthAgo).length

  return {
    daily: dailyMessages,
    weekly: weeklyMessages,
    monthly: monthlyMessages
  }
}