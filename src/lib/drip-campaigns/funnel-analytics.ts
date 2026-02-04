/**
 * Drip Campaign Funnel Analytics
 *
 * Provides detailed funnel analytics for drip campaigns:
 * - Step-by-step progression rates
 * - Drop-off analysis
 * - Time-to-completion metrics
 * - Engagement analysis (opens, replies)
 * - Cohort analysis
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface FunnelStep {
  stepId: string
  stepOrder: number
  stepName: string
  totalEntered: number
  completed: number
  failed: number
  pending: number
  dropped: number
  completionRate: number
  dropOffRate: number
  avgTimeToComplete: number | null // milliseconds
  deliveryRate: number
  readRate: number
}

export interface FunnelAnalytics {
  campaignId: string
  campaignName: string
  totalEnrolled: number
  totalCompleted: number
  totalDropped: number
  totalActive: number
  overallCompletionRate: number
  avgCampaignDuration: number | null // milliseconds
  steps: FunnelStep[]
  dropOffReasons: Record<string, number>
  engagementMetrics: {
    totalMessagesSent: number
    totalDelivered: number
    totalRead: number
    totalReplies: number
    deliveryRate: number
    readRate: number
    replyRate: number
  }
}

export interface CohortData {
  enrollmentDate: string
  totalEnrolled: number
  completedInDay1: number
  completedInDay3: number
  completedInDay7: number
  completedInDay14: number
  completedInDay30: number
  stillActive: number
  dropped: number
}

export interface TimeSeriesMetric {
  date: string
  enrollments: number
  completions: number
  drops: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  replies: number
}

// ============================================================================
// FUNNEL ANALYTICS SERVICE
// ============================================================================

export class DripFunnelAnalytics {
  private _supabase: SupabaseClient | null = null
  private _providedSupabase: SupabaseClient | undefined

  constructor(supabase?: SupabaseClient) {
    this._providedSupabase = supabase
  }

  private getSupabase(): SupabaseClient {
    if (!this._supabase) {
      this._supabase = this._providedSupabase || createServiceRoleClient()
    }
    return this._supabase
  }

  /**
   * Get comprehensive funnel analytics for a campaign
   */
  async getCampaignFunnel(campaignId: string): Promise<FunnelAnalytics | null> {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await this.getSupabase()
        .from('drip_campaigns')
        .select('id, name, statistics')
        .eq('id', campaignId)
        .single()

      if (campaignError || !campaign) {
        console.error('[FunnelAnalytics] Campaign not found:', campaignId)
        return null
      }

      // Get all steps for the campaign
      const { data: steps, error: stepsError } = await this.getSupabase()
        .from('drip_campaign_steps')
        .select('id, step_order, name')
        .eq('campaign_id', campaignId)
        .order('step_order', { ascending: true })

      if (stepsError || !steps) {
        console.error('[FunnelAnalytics] Failed to get steps:', stepsError)
        return null
      }

      // Get enrollment statistics
      const { data: enrollments, error: enrollmentError } = await this.getSupabase()
        .from('drip_enrollments')
        .select('id, status, current_step_order, enrolled_at, completed_at, dropped_reason, replied')
        .eq('campaign_id', campaignId)

      if (enrollmentError) {
        console.error('[FunnelAnalytics] Failed to get enrollments:', enrollmentError)
        return null
      }

      // Get message logs for engagement metrics
      const { data: messageLogs, error: logsError } = await this.getSupabase()
        .from('drip_message_logs')
        .select('id, step_id, status, scheduled_at, sent_at, delivered_at, read_at')
        .in('enrollment_id', (enrollments || []).map(e => e.id))

      if (logsError) {
        console.error('[FunnelAnalytics] Failed to get message logs:', logsError)
      }

      // Calculate step-by-step analytics
      const funnelSteps = await this.calculateStepAnalytics(steps, enrollments || [], messageLogs || [])

      // Calculate overall metrics
      const totalEnrolled = enrollments?.length || 0
      const totalCompleted = enrollments?.filter(e => e.status === 'completed').length || 0
      const totalDropped = enrollments?.filter(e => e.status === 'dropped' || e.status === 'opted_out').length || 0
      const totalActive = enrollments?.filter(e => e.status === 'active').length || 0

      // Calculate average campaign duration
      const completedEnrollments = enrollments?.filter(e => e.completed_at && e.enrolled_at) || []
      const avgDuration = completedEnrollments.length > 0
        ? completedEnrollments.reduce((sum, e) => {
            return sum + (new Date(e.completed_at).getTime() - new Date(e.enrolled_at).getTime())
          }, 0) / completedEnrollments.length
        : null

      // Calculate drop-off reasons
      const dropOffReasons = (enrollments || [])
        .filter(e => e.dropped_reason)
        .reduce((acc, e) => {
          acc[e.dropped_reason!] = (acc[e.dropped_reason!] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // Calculate engagement metrics
      const logs = messageLogs || []
      const totalMessagesSent = logs.filter(l => l.status !== 'pending' && l.status !== 'skipped').length
      const totalDelivered = logs.filter(l => l.delivered_at).length
      const totalRead = logs.filter(l => l.read_at).length
      const totalReplies = enrollments?.filter(e => e.replied).length || 0

      return {
        campaignId,
        campaignName: campaign.name,
        totalEnrolled,
        totalCompleted,
        totalDropped,
        totalActive,
        overallCompletionRate: totalEnrolled > 0 ? (totalCompleted / totalEnrolled) * 100 : 0,
        avgCampaignDuration: avgDuration,
        steps: funnelSteps,
        dropOffReasons,
        engagementMetrics: {
          totalMessagesSent,
          totalDelivered,
          totalRead,
          totalReplies,
          deliveryRate: totalMessagesSent > 0 ? (totalDelivered / totalMessagesSent) * 100 : 0,
          readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
          replyRate: totalEnrolled > 0 ? (totalReplies / totalEnrolled) * 100 : 0,
        },
      }
    } catch (error) {
      console.error('[FunnelAnalytics] Error getting campaign funnel:', error)
      return null
    }
  }

  /**
   * Calculate analytics for each step in the funnel
   */
  private async calculateStepAnalytics(
    steps: Array<{ id: string; step_order: number; name: string }>,
    enrollments: Array<{ id: string; status: string; current_step_order: number | null; enrolled_at: string; completed_at: string | null }>,
    messageLogs: Array<{ id: string; step_id: string; status: string; scheduled_at: string; sent_at: string | null; delivered_at: string | null; read_at: string | null }>
  ): Promise<FunnelStep[]> {
    const funnelSteps: FunnelStep[] = []

    for (const step of steps) {
      // Count enrollments that reached this step
      const reachedThisStep = enrollments.filter(e =>
        (e.current_step_order !== null && e.current_step_order >= step.step_order) ||
        e.status === 'completed'
      ).length

      // Count enrollments that completed this step (moved past it)
      const completedThisStep = enrollments.filter(e =>
        (e.current_step_order !== null && e.current_step_order > step.step_order) ||
        e.status === 'completed'
      ).length

      // Get message logs for this step
      const stepLogs = messageLogs.filter(l => l.step_id === step.id)
      const sentLogs = stepLogs.filter(l => l.status !== 'pending' && l.status !== 'skipped')
      const deliveredLogs = stepLogs.filter(l => l.delivered_at)
      const readLogs = stepLogs.filter(l => l.read_at)
      const failedLogs = stepLogs.filter(l => l.status === 'failed')
      const pendingLogs = stepLogs.filter(l => l.status === 'pending')

      // Calculate average time to complete this step
      const completedWithTime = stepLogs.filter(l => l.sent_at)
      let avgTimeToComplete: number | null = null
      if (completedWithTime.length > 0) {
        const times = completedWithTime.map(l => {
          const scheduled = new Date(l.scheduled_at).getTime()
          const sent = new Date(l.sent_at!).getTime()
          return sent - scheduled
        })
        avgTimeToComplete = times.reduce((a, b) => a + b, 0) / times.length
      }

      // Calculate drop-off for this step
      const droppedAtStep = enrollments.filter(e =>
        (e.status === 'dropped' || e.status === 'opted_out') &&
        e.current_step_order === step.step_order
      ).length

      funnelSteps.push({
        stepId: step.id,
        stepOrder: step.step_order,
        stepName: step.name,
        totalEntered: reachedThisStep,
        completed: completedThisStep,
        failed: failedLogs.length,
        pending: pendingLogs.length,
        dropped: droppedAtStep,
        completionRate: reachedThisStep > 0 ? (completedThisStep / reachedThisStep) * 100 : 0,
        dropOffRate: reachedThisStep > 0 ? (droppedAtStep / reachedThisStep) * 100 : 0,
        avgTimeToComplete,
        deliveryRate: sentLogs.length > 0 ? (deliveredLogs.length / sentLogs.length) * 100 : 0,
        readRate: deliveredLogs.length > 0 ? (readLogs.length / deliveredLogs.length) * 100 : 0,
      })
    }

    return funnelSteps
  }

  /**
   * Get cohort analysis for a campaign
   */
  async getCohortAnalysis(campaignId: string, days: number = 30): Promise<CohortData[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get enrollments grouped by date
      const { data: enrollments, error } = await this.getSupabase()
        .from('drip_enrollments')
        .select('id, enrolled_at, completed_at, status')
        .eq('campaign_id', campaignId)
        .gte('enrolled_at', startDate.toISOString())
        .order('enrolled_at', { ascending: true })

      if (error || !enrollments) {
        console.error('[FunnelAnalytics] Failed to get cohort data:', error)
        return []
      }

      // Group by enrollment date
      const cohorts = new Map<string, typeof enrollments>()
      for (const enrollment of enrollments) {
        const date = new Date(enrollment.enrolled_at).toISOString().split('T')[0]
        if (!cohorts.has(date)) {
          cohorts.set(date, [])
        }
        cohorts.get(date)!.push(enrollment)
      }

      // Calculate cohort metrics
      const cohortData: CohortData[] = []
      const now = new Date()

      for (const [date, cohortEnrollments] of cohorts) {
        const enrollmentDate = new Date(date)
        const totalEnrolled = cohortEnrollments.length

        const completedBy = (days: number) => {
          const cutoff = new Date(enrollmentDate)
          cutoff.setDate(cutoff.getDate() + days)
          return cohortEnrollments.filter(e =>
            e.status === 'completed' &&
            e.completed_at &&
            new Date(e.completed_at) <= cutoff
          ).length
        }

        cohortData.push({
          enrollmentDate: date,
          totalEnrolled,
          completedInDay1: completedBy(1),
          completedInDay3: completedBy(3),
          completedInDay7: completedBy(7),
          completedInDay14: completedBy(14),
          completedInDay30: completedBy(30),
          stillActive: cohortEnrollments.filter(e => e.status === 'active').length,
          dropped: cohortEnrollments.filter(e => e.status === 'dropped' || e.status === 'opted_out').length,
        })
      }

      return cohortData
    } catch (error) {
      console.error('[FunnelAnalytics] Error getting cohort analysis:', error)
      return []
    }
  }

  /**
   * Get time series metrics for a campaign
   */
  async getTimeSeriesMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesMetric[]> {
    try {
      // Get daily enrollment counts
      const { data: enrollments, error: enrollError } = await this.getSupabase()
        .from('drip_enrollments')
        .select('enrolled_at, completed_at, status, dropped_reason, replied')
        .eq('campaign_id', campaignId)
        .gte('enrolled_at', startDate.toISOString())
        .lte('enrolled_at', endDate.toISOString())

      if (enrollError) {
        console.error('[FunnelAnalytics] Failed to get time series enrollments:', enrollError)
        return []
      }

      // Get message logs for the same period
      const enrollmentIds = (enrollments || []).map(e => e.enrolled_at) // Need to get IDs differently
      const { data: messageLogs, error: logsError } = await this.getSupabase()
        .from('drip_message_logs')
        .select('scheduled_at, sent_at, delivered_at, read_at, status')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())

      if (logsError) {
        console.error('[FunnelAnalytics] Failed to get time series logs:', logsError)
      }

      // Build daily metrics
      const metrics = new Map<string, TimeSeriesMetric>()

      // Initialize all dates
      const current = new Date(startDate)
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0]
        metrics.set(dateStr, {
          date: dateStr,
          enrollments: 0,
          completions: 0,
          drops: 0,
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          replies: 0,
        })
        current.setDate(current.getDate() + 1)
      }

      // Process enrollments
      for (const enrollment of enrollments || []) {
        const enrollDate = new Date(enrollment.enrolled_at).toISOString().split('T')[0]
        if (metrics.has(enrollDate)) {
          metrics.get(enrollDate)!.enrollments++
          if (enrollment.replied) {
            metrics.get(enrollDate)!.replies++
          }
        }

        if (enrollment.completed_at) {
          const completedDate = new Date(enrollment.completed_at).toISOString().split('T')[0]
          if (metrics.has(completedDate)) {
            metrics.get(completedDate)!.completions++
          }
        }

        if (enrollment.status === 'dropped' || enrollment.status === 'opted_out') {
          // Use enrolled_at as drop date approximation
          if (metrics.has(enrollDate)) {
            metrics.get(enrollDate)!.drops++
          }
        }
      }

      // Process message logs
      for (const log of messageLogs || []) {
        if (log.sent_at) {
          const sentDate = new Date(log.sent_at).toISOString().split('T')[0]
          if (metrics.has(sentDate)) {
            metrics.get(sentDate)!.messagesSent++
          }
        }

        if (log.delivered_at) {
          const deliveredDate = new Date(log.delivered_at).toISOString().split('T')[0]
          if (metrics.has(deliveredDate)) {
            metrics.get(deliveredDate)!.messagesDelivered++
          }
        }

        if (log.read_at) {
          const readDate = new Date(log.read_at).toISOString().split('T')[0]
          if (metrics.has(readDate)) {
            metrics.get(readDate)!.messagesRead++
          }
        }
      }

      return Array.from(metrics.values()).sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error('[FunnelAnalytics] Error getting time series metrics:', error)
      return []
    }
  }

  /**
   * Get step comparison across campaigns (benchmarking)
   */
  async getStepComparison(
    organizationId: string,
    stepPosition: number
  ): Promise<Array<{
    campaignId: string
    campaignName: string
    stepName: string
    completionRate: number
    deliveryRate: number
    readRate: number
  }>> {
    try {
      // Get all active campaigns for the organization
      const { data: campaigns, error: campaignError } = await this.getSupabase()
        .from('drip_campaigns')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (campaignError || !campaigns) {
        return []
      }

      const comparisons = []

      for (const campaign of campaigns) {
        const funnel = await this.getCampaignFunnel(campaign.id)
        if (funnel && funnel.steps[stepPosition - 1]) {
          const step = funnel.steps[stepPosition - 1]
          comparisons.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            stepName: step.stepName,
            completionRate: step.completionRate,
            deliveryRate: step.deliveryRate,
            readRate: step.readRate,
          })
        }
      }

      return comparisons.sort((a, b) => b.completionRate - a.completionRate)
    } catch (error) {
      console.error('[FunnelAnalytics] Error getting step comparison:', error)
      return []
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get funnel analytics for a campaign
 */
export async function getDripCampaignFunnel(campaignId: string): Promise<FunnelAnalytics | null> {
  const analytics = new DripFunnelAnalytics()
  return analytics.getCampaignFunnel(campaignId)
}

/**
 * Get cohort analysis for a campaign
 */
export async function getDripCohortAnalysis(campaignId: string, days?: number): Promise<CohortData[]> {
  const analytics = new DripFunnelAnalytics()
  return analytics.getCohortAnalysis(campaignId, days)
}

/**
 * Get time series metrics
 */
export async function getDripTimeSeriesMetrics(
  campaignId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesMetric[]> {
  const analytics = new DripFunnelAnalytics()
  return analytics.getTimeSeriesMetrics(campaignId, startDate, endDate)
}

// Export singleton
export const dripFunnelAnalytics = new DripFunnelAnalytics()
