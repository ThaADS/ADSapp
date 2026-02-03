/**
 * Knowledge Settings API
 * Purpose: Get and update knowledge base settings
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKnowledgeSettings, updateKnowledgeSettings } from '@/lib/knowledge'

/**
 * GET /api/knowledge/settings
 * Get knowledge base settings for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const settings = await getKnowledgeSettings(profile.organization_id)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Get knowledge settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/settings
 * Update knowledge base settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check role (owner or admin only)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Validate settings
    const allowedFields = [
      'chunk_size_tokens',
      'chunk_overlap_tokens',
      'max_chunks_per_query',
      'similarity_threshold',
      'ai_model',
      'ai_temperature',
      'ai_max_tokens',
      'include_citations',
      'auto_answer_enabled',
      'auto_answer_threshold',
      'draft_suggestions_enabled',
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Validate specific fields
        switch (field) {
          case 'chunk_size_tokens':
            if (typeof body[field] !== 'number' || body[field] < 100 || body[field] > 2000) {
              return NextResponse.json(
                { error: 'chunk_size_tokens must be between 100 and 2000' },
                { status: 400 }
              )
            }
            break

          case 'chunk_overlap_tokens':
            if (typeof body[field] !== 'number' || body[field] < 0 || body[field] > 500) {
              return NextResponse.json(
                { error: 'chunk_overlap_tokens must be between 0 and 500' },
                { status: 400 }
              )
            }
            break

          case 'max_chunks_per_query':
            if (typeof body[field] !== 'number' || body[field] < 1 || body[field] > 20) {
              return NextResponse.json(
                { error: 'max_chunks_per_query must be between 1 and 20' },
                { status: 400 }
              )
            }
            break

          case 'similarity_threshold':
          case 'auto_answer_threshold':
            if (typeof body[field] !== 'number' || body[field] < 0 || body[field] > 1) {
              return NextResponse.json(
                { error: `${field} must be between 0 and 1` },
                { status: 400 }
              )
            }
            break

          case 'ai_model':
            const validModels = [
              'gpt-4-turbo-preview',
              'gpt-4',
              'gpt-3.5-turbo',
              'gpt-4o',
              'gpt-4o-mini',
            ]
            if (!validModels.includes(body[field])) {
              return NextResponse.json(
                { error: `Invalid AI model. Valid options: ${validModels.join(', ')}` },
                { status: 400 }
              )
            }
            break

          case 'ai_temperature':
            if (typeof body[field] !== 'number' || body[field] < 0 || body[field] > 2) {
              return NextResponse.json(
                { error: 'ai_temperature must be between 0 and 2' },
                { status: 400 }
              )
            }
            break

          case 'ai_max_tokens':
            if (typeof body[field] !== 'number' || body[field] < 100 || body[field] > 4000) {
              return NextResponse.json(
                { error: 'ai_max_tokens must be between 100 and 4000' },
                { status: 400 }
              )
            }
            break

          case 'include_citations':
          case 'auto_answer_enabled':
          case 'draft_suggestions_enabled':
            if (typeof body[field] !== 'boolean') {
              return NextResponse.json(
                { error: `${field} must be a boolean` },
                { status: 400 }
              )
            }
            break
        }

        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const settings = await updateKnowledgeSettings(profile.organization_id, updates)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Update knowledge settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
