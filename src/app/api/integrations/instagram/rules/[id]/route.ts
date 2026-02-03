/**
 * Instagram Comment Rule Management Endpoint
 *
 * GET /api/integrations/instagram/rules/:id - Get rule details with stats
 * PUT /api/integrations/instagram/rules/:id - Update rule
 * DELETE /api/integrations/instagram/rules/:id - Delete rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  updateCommentRule,
  deleteCommentRule,
  getCommentRuleStats
} from '@/lib/integrations/instagram'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ruleId } = await params

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

    // Get rule with organization check
    const { data: rule, error: ruleError } = await supabase
      .from('instagram_comment_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Get stats
    const stats = await getCommentRuleStats(ruleId, profile.organization_id)

    return NextResponse.json({
      rule,
      stats
    })
  } catch (error) {
    console.error('Get Instagram rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ruleId } = await params

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

    // Only admins and owners can update rules
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json()

    // Build update object
    const updates: Parameters<typeof updateCommentRule>[2] = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.trigger_keywords !== undefined) updates.triggerKeywords = body.trigger_keywords
    if (body.trigger_media_ids !== undefined) updates.triggerMediaIds = body.trigger_media_ids
    if (body.dm_template !== undefined) updates.dmTemplate = body.dm_template
    if (body.dm_delay_seconds !== undefined) updates.dmDelaySeconds = body.dm_delay_seconds
    if (body.max_per_user_per_day !== undefined) updates.maxPerUserPerDay = body.max_per_user_per_day
    if (body.is_active !== undefined) updates.isActive = body.is_active

    // Update rule
    const rule = await updateCommentRule(ruleId, profile.organization_id, updates)

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Update Instagram rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ruleId } = await params

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

    // Only admins and owners can delete rules
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete rule
    const success = await deleteCommentRule(ruleId, profile.organization_id)

    if (!success) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Instagram rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
