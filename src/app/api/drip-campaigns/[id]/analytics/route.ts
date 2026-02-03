/**
 * Drip Campaign Analytics API
 * GET /api/drip-campaigns/[id]/analytics
 *
 * Provides comprehensive analytics for drip campaigns:
 * - Funnel analytics with step-by-step metrics
 * - Cohort analysis
 * - Time series data
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
import { DripFunnelAnalytics } from '@/lib/drip-campaigns/funnel-analytics'

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
      .from('drip_campaigns')
      .select('id, name, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'funnel' // funnel, cohort, timeseries
    const days = parseInt(searchParams.get('days') || '30', 10)

    const analytics = new DripFunnelAnalytics(supabase)

    switch (type) {
      case 'funnel': {
        const funnelData = await analytics.getCampaignFunnel(id)
        if (!funnelData) {
          return NextResponse.json(
            { error: 'Failed to calculate funnel analytics' },
            { status: 500 }
          )
        }
        return createSuccessResponse({ analytics: funnelData })
      }

      case 'cohort': {
        const cohortData = await analytics.getCohortAnalysis(id, days)
        return createSuccessResponse({
          campaignId: id,
          campaignName: campaign.name,
          period: { days },
          cohorts: cohortData,
        })
      }

      case 'timeseries': {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const timeseriesData = await analytics.getTimeSeriesMetrics(id, startDate, endDate)
        return createSuccessResponse({
          campaignId: id,
          campaignName: campaign.name,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            days,
          },
          metrics: timeseriesData,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type. Use: funnel, cohort, or timeseries' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Drip campaign analytics error:', error)
    return createErrorResponse(error)
  }
}
