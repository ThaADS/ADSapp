/**
 * A/B Test Management API
 * GET /api/drip-campaigns/[id]/ab-tests/[testId] - Get test details
 * PATCH /api/drip-campaigns/[id]/ab-tests/[testId] - Update test (start, pause, declare winner)
 * DELETE /api/drip-campaigns/[id]/ab-tests/[testId] - Delete test
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

    const abService = new DripABTestingService(supabase)
    const test = await abService.getTest(testId)

    if (!test || test.campaignId !== id) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Calculate statistical significance
    const statistics = await abService.calculateStatisticalSignificance(testId)

    return createSuccessResponse({
      test,
      statistics,
    })
  } catch (error) {
    console.error('Drip A/B test get error:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(
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

    const body = await request.json()
    const abService = new DripABTestingService(supabase)

    // Verify test belongs to this campaign
    const test = await abService.getTest(testId)
    if (!test || test.campaignId !== id) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Handle different actions
    if (body.action === 'start') {
      const success = await abService.startTest(testId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to start test. Ensure test has at least 2 variants and traffic allocation sums to 100%' },
          { status: 400 }
        )
      }
    } else if (body.action === 'pause') {
      const success = await abService.pauseTest(testId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to pause test' },
          { status: 500 }
        )
      }
    } else if (body.action === 'declare_winner' && body.winnerId) {
      // Validate winner ID
      const winnerValidation = QueryValidators.uuid(body.winnerId)
      if (!winnerValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid winner ID format' },
          { status: 400 }
        )
      }

      const success = await abService.declareWinner(testId, body.winnerId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to declare winner' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: start, pause, or declare_winner' },
        { status: 400 }
      )
    }

    // Return updated test
    const updatedTest = await abService.getTest(testId)
    const statistics = await abService.calculateStatisticalSignificance(testId)

    return createSuccessResponse({
      test: updatedTest,
      statistics,
    })
  } catch (error) {
    console.error('Drip A/B test update error:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
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

    // Delete the test (cascades to variants and assignments)
    const { error: deleteError } = await supabase
      .from('drip_ab_tests')
      .delete()
      .eq('id', testId)
      .eq('campaign_id', id)

    if (deleteError) {
      throw deleteError
    }

    return createSuccessResponse({ deleted: true })
  } catch (error) {
    console.error('Drip A/B test delete error:', error)
    return createErrorResponse(error)
  }
}
