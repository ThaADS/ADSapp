/**
 * A/B Test Variants API
 * GET /api/drip-campaigns/[id]/ab-tests/[testId]/variants - List variants
 * POST /api/drip-campaigns/[id]/ab-tests/[testId]/variants - Add a variant
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
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  try {
    const { id, testId } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Validate IDs
    const campaignIdValidation = QueryValidators.uuid(id)
    const testIdValidation = QueryValidators.uuid(testId)
    if (!campaignIdValidation.isValid || !testIdValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Verify test belongs to this campaign
    const { data: test, error: testError } = await supabase
      .from('drip_ab_tests')
      .select('id')
      .eq('id', testId)
      .eq('campaign_id', id)
      .single()

    if (testError || !test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Get all variants
    const { data: variants, error: variantsError } = await supabase
      .from('drip_ab_variants')
      .select('*')
      .eq('test_id', testId)
      .order('traffic_allocation', { ascending: false })

    if (variantsError) {
      throw variantsError
    }

    return createSuccessResponse({
      testId,
      variants: variants || [],
    })
  } catch (error) {
    console.error('Drip A/B variants list error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  try {
    const { id, testId } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Validate IDs
    const campaignIdValidation = QueryValidators.uuid(id)
    const testIdValidation = QueryValidators.uuid(testId)
    if (!campaignIdValidation.isValid || !testIdValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Verify test belongs to this campaign and is not running
    const { data: test, error: testError } = await supabase
      .from('drip_ab_tests')
      .select('id, status')
      .eq('id', testId)
      .eq('campaign_id', id)
      .single()

    if (testError || !test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    if (test.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot add variants to a test that is not in draft status' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.trafficAllocation !== 'number') {
      return NextResponse.json(
        { error: 'name and trafficAllocation are required' },
        { status: 400 }
      )
    }

    if (body.trafficAllocation < 0 || body.trafficAllocation > 100) {
      return NextResponse.json(
        { error: 'trafficAllocation must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Check current total allocation
    const { data: existingVariants } = await supabase
      .from('drip_ab_variants')
      .select('traffic_allocation')
      .eq('test_id', testId)

    const currentTotal = (existingVariants || []).reduce((sum, v) => sum + v.traffic_allocation, 0)
    if (currentTotal + body.trafficAllocation > 100) {
      return NextResponse.json(
        { error: `Total traffic allocation would exceed 100%. Current total: ${currentTotal}%` },
        { status: 400 }
      )
    }

    const abService = new DripABTestingService(supabase)
    const variant = await abService.addVariant(testId, {
      name: body.name,
      messageContent: body.messageContent,
      templateId: body.templateId,
      templateVariables: body.templateVariables,
      trafficAllocation: body.trafficAllocation,
      isControl: body.isControl,
    })

    if (!variant) {
      return NextResponse.json(
        { error: 'Failed to add variant' },
        { status: 500 }
      )
    }

    return createSuccessResponse({ variant }, 201)
  } catch (error) {
    console.error('Drip A/B variant creation error:', error)
    return createErrorResponse(error)
  }
}
