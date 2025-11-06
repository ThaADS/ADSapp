// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request)

    const supabase = await createClient()

    // Get organization subscription data
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!org.stripe_subscription_id) {
      return NextResponse.json({ subscription: null })
    }

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)

    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      planId: org.subscription_tier,
      planName: org.subscription_tier,
      price: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency,
      interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : undefined,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : undefined,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : undefined,
      createdAt: new Date(subscription.created * 1000).toISOString(),
    }

    return NextResponse.json(subscriptionData)
  } catch (error) {
    console.error('Subscription API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
