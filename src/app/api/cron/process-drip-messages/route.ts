/**
 * Drip Messages Cron Endpoint
 * POST /api/cron/process-drip-messages
 *
 * This endpoint should be called by a scheduler (e.g., Vercel Cron, external cron job)
 * to process due drip campaign messages.
 *
 * Security: Requires cron secret token
 *
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-drip-messages",
 *     "schedule": "* * * * *"  // Every minute
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { processAllOrganizations } from '@/lib/schedulers/drip-message-scheduler'

export const maxDuration = 300 // 5 minutes max execution time
export const dynamic = 'force-dynamic'

/**
 * Process due drip messages for all organizations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    // Check if request is from Vercel Cron or has valid secret
    const isVercelCron = authHeader?.startsWith('Bearer ') && authHeader.includes('vercel')
    const hasValidSecret = authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !hasValidSecret) {
      console.warn('[Drip Cron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Drip Cron] Starting drip message processing...')

    // Process messages
    const result = await processAllOrganizations()

    const duration = Date.now() - startTime

    // Return result
    return NextResponse.json(
      {
        success: true,
        duration: `${duration}ms`,
        ...result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Drip Cron] Error:', error)

    const duration = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Drip Message Processor',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    info: 'POST to this endpoint with valid auth to process drip messages',
  })
}
