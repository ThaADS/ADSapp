/**
 * AI Settings API
 * Manage AI feature configuration per organization
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AISettings } from '@/types/ai'

export async function GET(request: NextRequest) {
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

    // Get AI settings for organization
    const { data: settings, error: settingsError } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .single()

    if (settingsError) {
      // If no settings exist yet, return defaults
      if (settingsError.code === 'PGRST116') {
        return Response.json({
          success: true,
          settings: {
            enabled: true,
            auto_response_enabled: false,
            draft_suggestions_enabled: true,
            sentiment_analysis_enabled: true,
            translation_enabled: false,
            summarization_enabled: true,
            preferred_model: 'anthropic/claude-3.5-sonnet',
            fallback_model: 'anthropic/claude-3-haiku',
            max_tokens: 1000,
            temperature: 0.7,
            auto_response_tone: 'professional',
            auto_response_language: 'nl',
            monthly_budget_usd: null,
            current_month_spend_usd: 0,
            budget_alert_threshold: 0.8,
          },
          isDefault: true,
        })
      }

      throw settingsError
    }

    return Response.json({
      success: true,
      settings,
      isDefault: false,
    })
  } catch (error) {
    console.error('Get AI settings error:', error)
    return Response.json(
      {
        error: 'Failed to get AI settings',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    // Check if user has admin role
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return Response.json(
        {
          error: 'Only organization owners and admins can update AI settings',
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate settings
    const allowedFields = [
      'enabled',
      'auto_response_enabled',
      'draft_suggestions_enabled',
      'sentiment_analysis_enabled',
      'translation_enabled',
      'summarization_enabled',
      'preferred_model',
      'fallback_model',
      'max_tokens',
      'temperature',
      'auto_response_conditions',
      'auto_response_tone',
      'auto_response_language',
      'monthly_budget_usd',
      'budget_alert_threshold',
    ]

    const updates: any = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        {
          error: 'No valid fields to update',
        },
        { status: 400 }
      )
    }

    // Validate specific fields
    if ('max_tokens' in updates) {
      if (updates.max_tokens < 1 || updates.max_tokens > 4000) {
        return Response.json(
          {
            error: 'max_tokens must be between 1 and 4000',
          },
          { status: 400 }
        )
      }
    }

    if ('temperature' in updates) {
      if (updates.temperature < 0 || updates.temperature > 2) {
        return Response.json(
          {
            error: 'temperature must be between 0 and 2',
          },
          { status: 400 }
        )
      }
    }

    if ('auto_response_tone' in updates) {
      const validTones = ['professional', 'friendly', 'casual']
      if (!validTones.includes(updates.auto_response_tone)) {
        return Response.json(
          {
            error: `auto_response_tone must be one of: ${validTones.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    if ('budget_alert_threshold' in updates) {
      if (updates.budget_alert_threshold < 0 || updates.budget_alert_threshold > 1) {
        return Response.json(
          {
            error: 'budget_alert_threshold must be between 0 and 1',
          },
          { status: 400 }
        )
      }
    }

    // Update or insert settings
    const { data: settings, error: settingsError } = await supabase
      .from('ai_settings')
      .upsert({
        organization_id: profile.organization_id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (settingsError) {
      throw settingsError
    }

    return Response.json({
      success: true,
      settings,
      message: 'AI settings updated successfully',
    })
  } catch (error) {
    console.error('Update AI settings error:', error)
    return Response.json(
      {
        error: 'Failed to update AI settings',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
