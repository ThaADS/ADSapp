/**
 * Workflow Executions API
 *
 * GET /api/workflows/[id]/executions - Get all executions for a workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    // Validate workflow ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('workflow_executions')
      .select(`
        id,
        workflow_id,
        contact_id,
        status,
        current_node_id,
        execution_path,
        error_message,
        error_node_id,
        retry_count,
        trigger_type,
        started_at,
        completed_at,
        created_at,
        contacts:contact_id (
          id,
          name,
          phone_number
        )
      `, { count: 'exact' })
      .eq('workflow_id', id)
      .eq('organization_id', profile.organization_id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: executions, error, count } = await query

    if (error) {
      console.error('Failed to fetch executions:', error)
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 })
    }

    // Calculate stats
    const { data: stats } = await supabase
      .from('workflow_executions')
      .select('status')
      .eq('workflow_id', id)
      .eq('organization_id', profile.organization_id)

    const statusCounts = (stats || []).reduce((acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      executions,
      total: count || 0,
      limit,
      offset,
      stats: {
        total: count || 0,
        pending: statusCounts.pending || 0,
        running: statusCounts.running || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0,
        waiting: statusCounts.waiting || 0,
        cancelled: statusCounts.cancelled || 0,
      },
    })
  } catch (error) {
    console.error('Workflow executions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
