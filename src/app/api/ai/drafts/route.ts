/**
 * AI Draft Suggestions API
 * Generate intelligent response suggestions for WhatsApp conversations
 */

// @ts-nocheck - Type definitions need review
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDraftSuggestions, improveDraft } from '@/lib/ai/drafts'
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
    const { conversationId, count = 3, action } = body

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Handle improvement action
    if (action === 'improve' && body.existingDraft && body.feedback) {
      const improvedDraft = await improveDraft(
        body.existingDraft,
        body.feedback,
        profile.organization_id
      )

      return Response.json({
        success: true,
        improvedDraft,
        conversationId,
      })
    }

    // Verify conversation access (RLS will enforce this, but extra check)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, organization_id, contact_id, status')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== profile.organization_id) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get conversation history (last 10 messages)
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!messages || messages.length === 0) {
      return Response.json(
        {
          error: 'No conversation history found',
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
      messages: messages.reverse().map(m => ({
        sender: m.sender_type === 'contact' ? 'customer' : 'agent',
        content: m.content,
        timestamp: m.created_at,
      })),
      customerName: contact?.name,
      customerPhone: contact?.phone_number ?? '',
    }

    // Generate draft suggestions
    const suggestions = await generateDraftSuggestions(context, count)

    return Response.json({
      success: true,
      suggestions,
      conversationId,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Draft generation error:', error)
    return Response.json(
      {
        error: 'Failed to generate draft suggestions',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
