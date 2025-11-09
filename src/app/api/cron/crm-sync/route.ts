/**
 * CRM Sync Cron Job Endpoint
 *
 * Vercel Cron endpoint for scheduled CRM synchronization
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/crm-sync",
 *       "schedule": "0,15,30,45 * * * *"
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  runScheduledDeltaSync,
  cleanupOldSyncLogs,
  detectSyncConflicts,
  retryFailedSyncs,
  healthCheckConnections,
} from '@/lib/jobs/crm-sync'

/**
 * GET /api/cron/crm-sync
 * Runs scheduled CRM sync jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const jobType = searchParams.get('job') || 'delta-sync'

    console.log(`[Cron] Running CRM sync job: ${jobType}`)

    let result: any

    switch (jobType) {
      case 'delta-sync':
        // Run every 15 minutes
        result = await runScheduledDeltaSync()
        break

      case 'health-check':
        // Run every 5 minutes
        await healthCheckConnections()
        result = { message: 'Health check completed' }
        break

      case 'detect-conflicts':
        // Run every hour
        await detectSyncConflicts()
        result = { message: 'Conflict detection completed' }
        break

      case 'retry-failed':
        // Run every hour
        result = await retryFailedSyncs()
        break

      case 'cleanup':
        // Run daily
        const cleanedCount = await cleanupOldSyncLogs()
        result = { message: `Cleaned up ${cleanedCount} old logs` }
        break

      default:
        return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      jobType,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] CRM sync job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/crm-sync
 * Manual trigger for testing
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
