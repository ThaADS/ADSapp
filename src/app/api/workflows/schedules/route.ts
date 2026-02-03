/**
 * Workflow Schedules API
 *
 * GET /api/workflows/schedules - List all schedules for organization
 * POST /api/workflows/schedules - Create a new schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowScheduler } from '@/lib/workflow/scheduler'
import { QueryValidators } from '@/lib/supabase/server'

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const isActive = searchParams.get('isActive')

    // Build query
    let query = supabase
      .from('workflow_schedules')
      .select(`
        *,
        workflows:workflow_id (
          id,
          name,
          status
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('next_execution_at', { ascending: true })

    if (workflowId) {
      const validation = QueryValidators.uuid(workflowId)
      if (validation.isValid) {
        query = query.eq('workflow_id', workflowId)
      }
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: schedules, error } = await query

    if (error) {
      console.error('Failed to fetch schedules:', error)
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Schedules API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check permissions
    if (!['owner', 'admin'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { workflowId, scheduleType, scheduleConfig, timezone, maxExecutions } = body

    // Validate required fields
    if (!workflowId || !scheduleType || !scheduleConfig) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, scheduleType, scheduleConfig' },
        { status: 400 }
      )
    }

    // Validate workflowId
    const idValidation = QueryValidators.uuid(workflowId)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 })
    }

    // Validate schedule type
    if (!['once', 'recurring', 'cron'].includes(scheduleType)) {
      return NextResponse.json(
        { error: 'Invalid schedule type. Must be: once, recurring, or cron' },
        { status: 400 }
      )
    }

    // Verify workflow exists and belongs to organization
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, status')
      .eq('id', workflowId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Create schedule
    const scheduleId = await workflowScheduler.createSchedule(
      workflowId,
      profile.organization_id,
      scheduleType,
      scheduleConfig,
      {
        timezone: timezone || 'UTC',
        maxExecutions: maxExecutions || undefined,
        createdBy: user.id,
      }
    )

    if (!scheduleId) {
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
    }

    // Fetch created schedule
    const { data: schedule, error: fetchError } = await supabase
      .from('workflow_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch created schedule:', fetchError)
    }

    return NextResponse.json({
      message: 'Schedule created successfully',
      schedule: schedule || { id: scheduleId },
    })
  } catch (error) {
    console.error('Create schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
