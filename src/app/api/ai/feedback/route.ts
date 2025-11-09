/**
 * API Route: AI Feedback
 * Track user feedback on AI suggestions and responses
 */

import { createClient } from '@/lib/supabase/server'

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
    const { conversationId, feature, action, suggestionId, responseId, metadata } = body

    // Validate input
    if (!conversationId || !feature || !action) {
      return Response.json(
        { error: 'Invalid request: conversationId, feature, and action are required' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['accepted', 'rejected', 'modified', 'ignored']
    if (!validActions.includes(action)) {
      return Response.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // If responseId provided, update existing AI response
    if (responseId) {
      const { error: updateError } = await supabase
        .from('ai_responses')
        .update({
          user_feedback: action,
          metadata: {
            ...metadata,
            feedback_at: new Date().toISOString(),
            feedback_by: user.id,
          },
        })
        .eq('id', responseId)
        .eq('organization_id', profile.organization_id)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new feedback entry
      const { error: insertError } = await supabase.from('ai_responses').insert({
        organization_id: profile.organization_id,
        conversation_id: conversationId,
        feature,
        model_used: 'feedback-only',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        response_data: {
          suggestionId,
          action,
          ...metadata,
        },
        latency_ms: 0,
        cost_usd: 0,
        user_feedback: action,
      })

      if (insertError) {
        throw insertError
      }
    }

    return Response.json({
      success: true,
      message: 'Feedback recorded',
    })
  } catch (error) {
    console.error('AI feedback error:', error)
    return Response.json(
      {
        error: 'Failed to record feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
