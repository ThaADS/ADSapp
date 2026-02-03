/**
 * Drip Campaign A/B Tests API
 * GET /api/drip-campaigns/[id]/ab-tests - List all A/B tests for a campaign
 * POST /api/drip-campaigns/[id]/ab-tests - Create a new A/B test
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
import { DripABTestingService } from '@/lib/drip-campaigns/ab-testing'

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
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get all A/B tests for this campaign
    const { data: tests, error: testsError } = await supabase
      .from('drip_ab_tests')
      .select(`
        *,
        variants:drip_ab_variants(*)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })

    if (testsError) {
      throw testsError
    }

    // Calculate statistical significance for running tests
    const abService = new DripABTestingService(supabase)
    const testsWithStats = await Promise.all(
      (tests || []).map(async (test) => {
        let statistics = null
        if (test.status === 'running') {
          statistics = await abService.calculateStatisticalSignificance(test.id)
        }
        return {
          ...test,
          statistics,
        }
      })
    )

    return createSuccessResponse({
      campaignId: id,
      tests: testsWithStats,
    })
  } catch (error) {
    console.error('Drip A/B tests list error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(
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
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.stepId || !body.name) {
      return NextResponse.json(
        { error: 'stepId and name are required' },
        { status: 400 }
      )
    }

    // Validate step belongs to this campaign
    const { data: step, error: stepError } = await supabase
      .from('drip_campaign_steps')
      .select('id')
      .eq('id', body.stepId)
      .eq('campaign_id', id)
      .single()

    if (stepError || !step) {
      return NextResponse.json(
        { error: 'Step not found in this campaign' },
        { status: 404 }
      )
    }

    // Check if there's already a running test for this step
    const { data: existingTest } = await supabase
      .from('drip_ab_tests')
      .select('id')
      .eq('step_id', body.stepId)
      .eq('status', 'running')
      .single()

    if (existingTest) {
      return NextResponse.json(
        { error: 'There is already a running A/B test for this step' },
        { status: 400 }
      )
    }

    const abService = new DripABTestingService(supabase)
    const test = await abService.createTest(id, body.stepId, {
      name: body.name,
      winningMetric: body.winningMetric,
      confidenceThreshold: body.confidenceThreshold,
      minSampleSize: body.minSampleSize,
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Failed to create A/B test' },
        { status: 500 }
      )
    }

    return createSuccessResponse({ test }, 201)
  } catch (error) {
    console.error('Drip A/B test creation error:', error)
    return createErrorResponse(error)
  }
}
