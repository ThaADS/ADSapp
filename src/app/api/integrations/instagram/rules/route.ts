/**
 * Instagram Comment Rules Endpoint
 *
 * GET /api/integrations/instagram/rules - List all rules
 * POST /api/integrations/instagram/rules - Create new rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCommentRules, createCommentRule } from '@/lib/integrations/instagram'

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get rules
    const rules = await getCommentRules(profile.organization_id)

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Get Instagram rules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins and owners can create rules
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.trigger_keywords || !body.dm_template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger_keywords, dm_template' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.trigger_keywords) || body.trigger_keywords.length === 0) {
      return NextResponse.json(
        { error: 'trigger_keywords must be a non-empty array' },
        { status: 400 }
      )
    }

    // Create rule
    const rule = await createCommentRule(profile.organization_id, {
      name: body.name,
      triggerKeywords: body.trigger_keywords,
      triggerMediaIds: body.trigger_media_ids,
      dmTemplate: body.dm_template,
      dmDelaySeconds: body.dm_delay_seconds || 0,
      maxPerUserPerDay: body.max_per_user_per_day || 1
    })

    if (!rule) {
      return NextResponse.json(
        { error: 'Failed to create rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Create Instagram rule error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
