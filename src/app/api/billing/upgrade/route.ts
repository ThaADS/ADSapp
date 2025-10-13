import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionLifecycleManager } from '@/lib/billing/subscription-lifecycle'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/server'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);
    const { newPlanId, prorate = true } = await request.json();

    if (!newPlanId || !SUBSCRIPTION_PLANS[newPlanId as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    const lifecycleManager = new SubscriptionLifecycleManager()

    const result = await lifecycleManager.upgradeSubscription(
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
    console.error('Upgrade API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}