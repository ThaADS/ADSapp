/**
 * AI Conversation Summarization API
 * Generate intelligent summaries of WhatsApp conversations
 */

// @ts-nocheck - Type definitions need review
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { summarizeConversation, generateExecutiveSummary } from '@/lib/ai/summarization'
import type { ConversationContext } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { conversationId, conversationIds, type = 'single' } = body

    // Handle executive summary (multiple conversations)
    if (type === 'executive' && conversationIds && Array.isArray(conversationIds)) {
      if (conversationIds.length === 0) {
        return Response.json(
          {
            error: 'conversationIds array cannot be empty',
          },
          { status: 400 }
        )
      }

      // Verify all conversations belong to user's organization
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, organization_id, contact_id, created_at, updated_at')
        .in('id', conversationIds)

      if (convError || !conversations) {
        return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      const unauthorizedConv = conversations.find(
        c => c.organization_id !== profile.organization_id
      )

      if (unauthorizedConv) {
        return Response.json({ error: 'Access denied to some conversations' }, { status: 403 })
      }

      // Build contexts for all conversations
      const contexts: ConversationContext[] = []

      for (const conv of conversations) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, content, sender_type, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })

        const { data: contact } = await supabase
          .from('contacts')
          .select('name, phone_number')
          .eq('id', conv.contact_id)
          .single()

        if (messages && messages.length > 0) {
          contexts.push({
            conversationId: conv.id,
            organizationId: profile.organization_id,
            messages: messages.map(m => ({
              sender: m.sender_type === 'contact' ? 'customer' : 'agent',
              content: m.content,
              timestamp: m.created_at,
            })),
            customerName: contact?.name,
            customerPhone: contact?.phone_number ?? '',
          })
        }
      }

      // Generate executive summary
      const executiveSummary = await generateExecutiveSummary(contexts, profile.organization_id)

      return Response.json({
        success: true,
        summary: executiveSummary,
        conversationIds,
        type: 'executive',
        generatedAt: new Date().toISOString(),
      })
    }

    // Handle single conversation summary
    if (!conversationId) {
      return Response.json(
        {
          error: 'conversationId is required for single conversation summary',
        },
        { status: 400 }
      )
    }

    // Verify conversation access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, organization_id, contact_id, created_at, updated_at')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== profile.organization_id) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all messages from conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length === 0) {
      return Response.json(
        {
          error: 'No messages found to summarize',
        },
        { status: 400 }
      )
    }

    // Get contact information
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, phone_number')
      .eq('id', conversation.contact_id)
      .single()

    // Build conversation context
    const context: ConversationContext = {
      conversationId,
      organizationId: profile.organization_id,
      messages: messages.map(m => ({
        sender: m.sender_type === 'contact' ? 'customer' : 'agent',
        content: m.content,
        timestamp: m.created_at,
      })),
      customerName: contact?.name,
      customerPhone: contact?.phone_number ?? '',
    }

    // Generate summary
    const summary = await summarizeConversation(context)

    // Store summary in conversation_ai_metadata table
    const { error: updateError } = await supabase.from('conversation_ai_metadata').upsert({
      conversation_id: conversationId,
      organization_id: profile.organization_id,
      summary: summary.summary,
      key_points: summary.keyPoints,
      next_steps: summary.nextSteps,
      last_analyzed_at: new Date().toISOString(),
    })

    if (updateError) {
      console.error('Failed to store summary:', updateError)
    }

    return Response.json({
      success: true,
      summary,
      conversationId,
      type: 'single',
      summarizedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Summarization error:', error)
    return Response.json(
      {
        error: 'Failed to generate summary',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
