/**
 * Drip Campaign Processor Cron Job
 * POST /api/cron/drip-processor
 *
 * Processes due drip campaign messages for all organizations.
 * Should be called by a cron job (e.g., every 1-5 minutes).
 *
 * Also handles:
 * - Cleaning up completed enrollments
 * - Updating campaign statistics
 * - Processing A/B test auto-winners
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { processAllOrganizations } from '@/lib/schedulers/drip-message-scheduler'
import { DripABTestingService } from '@/lib/drip-campaigns/ab-testing'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const headersList = headers()
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no secret configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = Date.now()
    const supabase = createServiceRoleClient()

    // 1. Process due drip messages
    let dripResults
    try {
      dripResults = await processAllOrganizations()
    } catch (error) {
      console.error('[DripCron] Error processing drip messages:', error)
      dripResults = {
        totalOrganizations: 0,
        totalProcessed: 0,
        totalFailed: 0,
        organizationResults: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // 2. Update campaign statistics
    let statsUpdated = 0
    try {
      // Get all active campaigns
      const { data: campaigns } = await supabase
        .from('drip_campaigns')
        .select('id')
        .eq('status', 'active')

      if (campaigns) {
        for (const campaign of campaigns) {
          // Update statistics from enrollments
          const { data: enrollmentStats } = await supabase
            .from('drip_enrollments')
            .select('status')
            .eq('campaign_id', campaign.id)

          if (enrollmentStats) {
            const stats = {
              totalEnrolled: enrollmentStats.length,
              activeContacts: enrollmentStats.filter(e => e.status === 'active').length,
              completedContacts: enrollmentStats.filter(e => e.status === 'completed').length,
              droppedContacts: enrollmentStats.filter(e => e.status === 'dropped' || e.status === 'opted_out').length,
            }

            const completionRate = stats.totalEnrolled > 0
              ? (stats.completedContacts / stats.totalEnrolled) * 100
              : 0

            await supabase
              .from('drip_campaigns')
              .update({
                statistics: {
                  ...stats,
                  averageCompletionRate: Math.round(completionRate * 100) / 100,
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', campaign.id)

            statsUpdated++
          }
        }
      }
    } catch (error) {
      console.error('[DripCron] Error updating campaign statistics:', error)
    }

    // 3. Check A/B tests for auto-winner declaration
    let abTestsChecked = 0
    let winnersDeclosed = 0
    try {
      // Get running A/B tests
      const { data: runningTests } = await supabase
        .from('drip_ab_tests')
        .select('id')
        .eq('status', 'running')

      if (runningTests) {
        const abService = new DripABTestingService(supabase)

        for (const test of runningTests) {
          abTestsChecked++
          const stats = await abService.calculateStatisticalSignificance(test.id)

          // Auto-declare winner if statistically significant
          if (stats.isSignificant && stats.winnerId && stats.recommendedAction === 'declare_winner') {
            await abService.declareWinner(test.id, stats.winnerId)
            winnersDeclosed++
            console.log(`[DripCron] Auto-declared winner for A/B test ${test.id}`)
          }
        }
      }
    } catch (error) {
      console.error('[DripCron] Error checking A/B tests:', error)
    }

    // 4. Clean up old message logs (retention: 90 days)
    let logsDeleted = 0
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      const { data: deleted } = await supabase
        .from('drip_message_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      logsDeleted = deleted?.length || 0
    } catch (error) {
      console.error('[DripCron] Error cleaning up old logs:', error)
    }

    // 5. Mark stale pending messages as failed (older than 24 hours)
    let staleMarked = 0
    try {
      const staleDate = new Date()
      staleDate.setHours(staleDate.getHours() - 24)

      const { data: stale } = await supabase
        .from('drip_message_logs')
        .update({
          status: 'failed',
          error: 'Message exceeded 24-hour delivery window',
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'pending')
        .lt('scheduled_at', staleDate.toISOString())
        .select('id')

      staleMarked = stale?.length || 0
    } catch (error) {
      console.error('[DripCron] Error marking stale messages:', error)
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        dripMessages: {
          organizations: dripResults.totalOrganizations,
          processed: dripResults.totalProcessed,
          failed: dripResults.totalFailed,
        },
        statistics: {
          campaignsUpdated: statsUpdated,
        },
        abTesting: {
          testsChecked: abTestsChecked,
          winnersDeclosed,
        },
        cleanup: {
          oldLogsDeleted: logsDeleted,
          staleMessagesMarked: staleMarked,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[DripCron] Critical error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also allow GET for simple health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'drip-processor',
    status: 'ready',
    timestamp: new Date().toISOString(),
  })
}
