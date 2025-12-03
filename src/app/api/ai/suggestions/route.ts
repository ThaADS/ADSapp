/**
 * API Route: AI Reply Suggestions
 * Generate AI-powered reply suggestions for messages
 */

import { createClient } from '@/lib/supabase/server'
import { generateDraftSuggestions } from '@/lib/ai/drafts'
import type { ConversationContext, DraftSuggestion } from '@/lib/ai/types'

export async function POST(request: Request) {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { conversationId, organizationId, messages, customerPhone, tone, count = 3 } = body

    // Validate organizationId matches user's organization
    if (organizationId !== profile.organization_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate input
    if (!conversationId || !messages || !Array.isArray(messages)) {
      return Response.json(
        { error: 'Invalid request: conversationId and messages are required' },
        { status: 400 }
      )
    }

    // Check if AI is enabled for organization (use type assertion for dynamic query)
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    const settings = aiSettings as { enabled?: boolean; draft_suggestions_enabled?: boolean } | null
    if (!settings?.enabled || !settings?.draft_suggestions_enabled) {
      return Response.json({ error: 'AI suggestions are not enabled' }, { status: 403 })
    }

    // Build conversation context
    const context: ConversationContext = {
      organizationId,
      conversationId,
      customerPhone: customerPhone || 'unknown',
      messages: messages.map((m: { sender?: string; is_from_contact?: boolean; content: string; timestamp?: string; created_at?: string }) => ({
        sender: (m.sender || (m.is_from_contact ? 'customer' : 'agent')) as 'customer' | 'agent',
        content: m.content,
        timestamp: m.timestamp || m.created_at || new Date().toISOString(),
      })),
    }

    // Generate drafts
    const drafts = await generateDraftSuggestions(context, count)

    // Transform to suggestions format
    const suggestions = drafts.map((draft: DraftSuggestion, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      text: draft.content,
      tone: draft.tone || tone || 'professional',
      confidence: draft.confidence,
      reasoning: draft.reasoning,
    }))

    return Response.json({
      success: true,
      suggestions,
      metadata: {
        conversationId,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('AI suggestions error:', error)
    return Response.json(
      {
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
