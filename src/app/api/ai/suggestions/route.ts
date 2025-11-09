/**
 * API Route: AI Reply Suggestions
 * Generate AI-powered reply suggestions for messages
 */

import { createClient } from '@/lib/supabase/server'
import { generateDrafts } from '@/lib/ai/drafts'
import type { ConversationContext } from '@/lib/ai/types'

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
    const { conversationId, organizationId, messages, tone, count = 3 } = body

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

    // Check if AI is enabled for organization
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('enabled, draft_suggestions_enabled')
      .eq('organization_id', organizationId)
      .single()

    if (!aiSettings?.enabled || !aiSettings?.draft_suggestions_enabled) {
      return Response.json({ error: 'AI suggestions are not enabled' }, { status: 403 })
    }

    // Build conversation context
    const context: ConversationContext = {
      organizationId,
      conversationId,
      messages: messages.map((m: any) => ({
        sender: m.sender || (m.is_from_contact ? 'customer' : 'agent'),
        content: m.content,
        timestamp: m.timestamp || m.created_at,
      })),
    }

    // Generate drafts
    const draftsResult = await generateDrafts(context, count, tone)

    // Transform to suggestions format
    const suggestions = draftsResult.drafts.map((draft, index) => ({
      id: `suggestion-${Date.now()}-${index}`,
      text: draft.text,
      tone: draft.tone,
      confidence: draft.confidence,
      reasoning: draft.reasoning,
    }))

    return Response.json({
      success: true,
      suggestions,
      metadata: {
        conversationId,
        generatedAt: new Date().toISOString(),
        model: draftsResult.model,
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
