import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionLifecycleManager } from '@/lib/billing/subscription-lifecycle'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/server'

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')
    const { newPlanId, prorate = true } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    if (!newPlanId || !SUBSCRIPTION_PLANS[newPlanId as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    const lifecycleManager = new SubscriptionLifecycleManager()

    const result = await lifecycleManager.downgradeSubscription(
      organizationId,
      newPlanId,
      { prorate }
    )

    return NextResponse.json({
      success: true,
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status,
        planId: newPlanId,
      },
      prorationAmount: result.prorationAmount,
    })
  } catch (error) {
    console.error('Downgrade API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}