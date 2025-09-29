import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionLifecycleManager } from '@/lib/billing/subscription-lifecycle'
import { isBuildTime } from '@/lib/build-safe-init'

export async function POST(request: NextRequest) {
  // Check if we're in build mode and return early
  if (isBuildTime()) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable during build' },
      { status: 503 }
    )
  }
  try {
    const organizationId = request.headers.get('X-Organization-ID')
    const { immediate = false, reason, feedback } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

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