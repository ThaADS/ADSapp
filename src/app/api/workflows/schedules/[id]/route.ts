/**
 * Workflow Schedule Detail API
 *
 * GET /api/workflows/schedules/[id] - Get schedule details
 * PATCH /api/workflows/schedules/[id] - Update schedule
 * DELETE /api/workflows/schedules/[id] - Delete schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowScheduler } from '@/lib/workflow/scheduler'
import { QueryValidators } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Validate ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid schedule ID format' }, { status: 400 })
    }

    // Get schedule
    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .select(`
        *,
        workflows:workflow_id (
          id,
          name,
          status,
          description
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Get schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Validate ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid schedule ID format' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { isActive, scheduleConfig, timezone, maxExecutions } = body

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof isActive === 'boolean') {
      updates.is_active = isActive
    }

    if (scheduleConfig) {
      updates.schedule_config = scheduleConfig
    }

    if (timezone) {
      updates.timezone = timezone
    }

    if (typeof maxExecutions === 'number') {
      updates.max_executions = maxExecutions
    }

    // Update schedule
    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update schedule:', error)
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Schedule updated successfully',
      schedule,
    })
  } catch (error) {
    console.error('Update schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Validate ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid schedule ID format' }, { status: 400 })
    }

    // Delete schedule
    const { error } = await supabase
      .from('workflow_schedules')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('Failed to delete schedule:', error)
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Delete schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
