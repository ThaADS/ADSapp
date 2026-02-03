/**
 * Campaign Progress API
 * GET /api/bulk/campaigns/[id]/progress
 *
 * Provides real-time progress tracking for bulk campaigns including:
 * - Job status breakdown (pending, sent, delivered, read, failed)
 * - Performance metrics (messages/min, ETA)
 * - Error categorization
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'

interface JobStatusCount {
  status: string
  count: number
}

interface ErrorCategory {
  error: string
  count: number
}

interface ProgressMetrics {
  totalJobs: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
  percentComplete: number
  messagesPerMinute: number
  estimatedTimeRemaining: number | null
  errors: ErrorCategory[]
  lastUpdated: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Validate campaign ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify campaign belongs to user's organization
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_campaigns')
      .select('id, status, started_at, statistics, updated_at')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get job status counts using RPC or aggregation
    const { data: jobStats, error: statsError } = await supabase
      .from('bulk_message_jobs')
      .select('status')
      .eq('campaign_id', id)

    if (statsError) {
      throw statsError
    }

    // Calculate status counts
    const statusCounts = (jobStats || []).reduce((acc, job) => {
      const status = job.status as string
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalJobs = jobStats?.length || 0
    const pending = statusCounts['pending'] || 0
    const sent = statusCounts['sent'] || 0
    const delivered = statusCounts['delivered'] || 0
    const read = statusCounts['read'] || 0
    const failed = statusCounts['failed'] || 0

    const completed = sent + delivered + read + failed
    const percentComplete = totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0

    // Calculate messages per minute
    let messagesPerMinute = 0
    let estimatedTimeRemaining: number | null = null

    if (campaign.started_at && completed > 0) {
      const startTime = new Date(campaign.started_at).getTime()
      const now = Date.now()
      const minutesElapsed = (now - startTime) / (1000 * 60)

      if (minutesElapsed > 0) {
        messagesPerMinute = Math.round(completed / minutesElapsed)

        if (messagesPerMinute > 0 && pending > 0) {
          estimatedTimeRemaining = Math.ceil(pending / messagesPerMinute)
        }
      }
    }

    // Get error categories (top 5)
    const { data: errorData, error: errorFetchError } = await supabase
      .from('bulk_message_jobs')
      .select('error')
      .eq('campaign_id', id)
      .eq('status', 'failed')
      .not('error', 'is', null)

    if (errorFetchError) {
      console.error('Error fetching error categories:', errorFetchError)
    }

    const errorCounts = (errorData || []).reduce((acc, job) => {
      const error = job.error as string
      if (error) {
        acc[error] = (acc[error] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const errors: ErrorCategory[] = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const progress: ProgressMetrics = {
      totalJobs,
      pending,
      sent,
      delivered,
      read,
      failed,
      percentComplete,
      messagesPerMinute,
      estimatedTimeRemaining,
      errors,
      lastUpdated: new Date().toISOString(),
    }

    return createSuccessResponse({
      campaign: {
        id: campaign.id,
        status: campaign.status,
        startedAt: campaign.started_at,
        statistics: campaign.statistics,
      },
      progress,
    })
  } catch (error) {
    console.error('Campaign progress error:', error)
    return createErrorResponse(error)
  }
}
