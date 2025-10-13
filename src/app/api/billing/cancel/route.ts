import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionLifecycleManager } from '@/lib/billing/subscription-lifecycle'
import { isBuildTime } from '@/lib/build-safe-init'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Check if we're in build mode and return early
  if (isBuildTime()) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable during build' },
      { status: 503 }
    )
  }

  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);
    const { immediate = false, reason, feedback } = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    const lifecycleManager = new SubscriptionLifecycleManager()

    const result = await lifecycleManager.cancelSubscription(organizationId, {
      immediate,
      reason,
      feedback,
      offerRetention: false,
      downgradeToFree: true,
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status,
      },
      effectiveDate: result.effectiveDate.toISOString(),
      immediate,
    })
  } catch (error) {
    console.error('Cancel API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}