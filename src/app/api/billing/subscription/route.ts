import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get organization subscription data
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
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
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : undefined,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : undefined,
      createdAt: new Date(subscription.created * 1000).toISOString(),
    }

    return NextResponse.json(subscriptionData)
  } catch (error) {
    console.error('Subscription API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}