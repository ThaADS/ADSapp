/**
 * Simplified Admin Dashboard API
 * Provides basic platform metrics for the super admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

// Type helper to avoid deep instantiation errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAny<T>(val: T): any {
  return val
}

export async function GET(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()

    // Get basic platform metrics
    const totalOrgs = toAny(await supabase.from('organizations').select('id', { count: 'exact' }))
    const activeOrgs = toAny(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference too deep, suppressing false positive
      await supabase.from('organizations').select('id', { count: 'exact' }).eq('is_active', true)
    )
    const totalUsers = toAny(await supabase.from('profiles').select('id', { count: 'exact' }))
    const activeUsers = toAny(
      await supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true)
    )
    const totalMessages = toAny(await supabase.from('messages').select('id', { count: 'exact' }))
    const totalConversations = toAny(
      await supabase.from('conversations').select('id', { count: 'exact' })
    )

    // Get subscription distribution
    const { data: orgsData } = await supabase.from('organizations').select('subscription_tier')

    const subscriptionDistribution = (orgsData || []).reduce(
      (acc, org) => {
        const tier = org.subscription_tier || 'starter'
        acc[tier] = (acc[tier] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate estimated revenue based on subscription tiers
    const tierPricing = {
      starter: 29,
      professional: 99,
      enterprise: 299,
    }

    const estimatedRevenue = Object.entries(subscriptionDistribution).reduce(
      (total, [tier, count]) => {
        const price = tierPricing[tier as keyof typeof tierPricing] || 29
        return total + price * count
      },
      0
    )

    const dashboardData = {
      data: {
        total_organizations: totalOrgs.count || 0,
        active_organizations: activeOrgs.count || 0,
        total_users: totalUsers.count || 0,
        active_users: activeUsers.count || 0,
        total_messages: totalMessages.count || 0,
        total_conversations: totalConversations.count || 0,
        revenue_cents: estimatedRevenue * 100,
        currency: 'USD',
      },
      systemHealth: 'healthy',
      subscriptionDistribution,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Admin dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
