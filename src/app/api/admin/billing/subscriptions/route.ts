/**
 * Admin Billing Subscriptions API
 * Provides detailed subscription list for super admin billing dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()

    // Define subscription tier pricing
    const tierPricing = {
      starter: 29,
      professional: 99,
      enterprise: 299,
    }

    // Get all organizations with subscription details
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        slug,
        subscription_tier,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        trial_ends_at,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`)
    }

    // Transform data for frontend
    const subscriptions = (organizations || []).map(org => {
      const tier = org.subscription_tier as keyof typeof tierPricing
      const mrr = tierPricing[tier] || tierPricing.starter

      // Calculate next billing date (30 days from last update for active subscriptions)
      let nextBillingDate: string | null = null
      if (org.subscription_status === 'active' && org.updated_at) {
        try {
          const lastUpdate = new Date(org.updated_at)
          if (!isNaN(lastUpdate.getTime())) {
            const billingDate = new Date(lastUpdate)
            billingDate.setDate(billingDate.getDate() + 30)
            nextBillingDate = billingDate.toISOString()
          }
        } catch (e) {
          console.error(`Date calculation error for org ${org.id}:`, e)
        }
      }

      // Determine start date (safely handle null values)
      const startDate = org.subscription_status === 'trial' ? org.created_at : org.updated_at

      return {
        id: org.id,
        organization_id: org.id,
        organization_name: org.name,
        plan: org.subscription_tier || 'starter',
        status: org.subscription_status || 'trial',
        amount: mrr,
        currency: 'USD',
        current_period_start: startDate || org.created_at,
        current_period_end: nextBillingDate || org.trial_ends_at,
        cancel_at_period_end: false,
        // Additional fields for detailed view
        organizationSlug: org.slug,
        stripeCustomerId: org.stripe_customer_id,
        stripeSubscriptionId: org.stripe_subscription_id,
        trialEndsAt: org.trial_ends_at,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
      }
    })

    // Sort by amount (MRR) descending
    subscriptions.sort((a, b) => b.amount - a.amount)

    // Calculate summary statistics
    const summary = {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
      trialSubscriptions: subscriptions.filter(s => s.status === 'trial').length,
      cancelledSubscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
      totalMRR: subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + s.amount, 0),
      byTier: {
        starter: subscriptions.filter(s => s.plan === 'starter' && s.status === 'active').length,
        professional: subscriptions.filter(s => s.plan === 'professional' && s.status === 'active')
          .length,
        enterprise: subscriptions.filter(s => s.plan === 'enterprise' && s.status === 'active')
          .length,
      },
    }

    return NextResponse.json({
      data: subscriptions,
      summary,
    })
  } catch (error) {
    // FORCE console logging
    console.log('========== BILLING SUBSCRIPTIONS ERROR ==========')
    console.log('Error type:', typeof error)
    console.log('Error:', error)
    console.log('Error message:', error instanceof Error ? error.message : String(error))
    console.log('Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.log('==================================================')

    return NextResponse.json(
      {
        error: 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
