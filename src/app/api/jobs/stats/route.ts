// @ts-nocheck - Type definitions need review
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQueueManager } from '@/lib/queue/queue-manager'

/**
 * GET /api/jobs/stats
 * Get queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
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
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check permissions (only admins and owners can view stats)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get queue statistics
    const queueManager = getQueueManager()
    const stats = await queueManager.getAllQueueStatistics()

    // Get job history from database
    const { data: jobLogs, error: logsError } = await supabase
      .from('job_logs')
      .select('job_type, status, result, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (logsError) {
      console.error('Error fetching job logs:', logsError)
    }

    // Calculate aggregated statistics
    const aggregatedStats = {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
      byType: {} as Record<string, any>,
    }

    if (jobLogs) {
      jobLogs.forEach(log => {
        aggregatedStats.total++

        if (log.status === 'completed') {
          aggregatedStats.completed++
        } else if (log.status === 'failed') {
          aggregatedStats.failed++
        } else {
          aggregatedStats.running++
        }

        if (!aggregatedStats.byType[log.job_type]) {
          aggregatedStats.byType[log.job_type] = {
            total: 0,
            completed: 0,
            failed: 0,
          }
        }

        aggregatedStats.byType[log.job_type].total++

        if (log.status === 'completed') {
          aggregatedStats.byType[log.job_type].completed++
        } else if (log.status === 'failed') {
          aggregatedStats.byType[log.job_type].failed++
        }
      })
    }

    return NextResponse.json({
      success: true,
      queueStats: stats,
      historicalStats: aggregatedStats,
      recentJobs: jobLogs?.slice(0, 10) || [],
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to get queue statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
