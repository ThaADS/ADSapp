/**
 * Admin Billing Metrics API
 * Provides high-level billing metrics for super admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const supabase = await createClient();

    // Define subscription tier pricing (should match actual Stripe prices)
    const tierPricing = {
      starter: 29,
      professional: 99,
      enterprise: 299
    };

    // Get all organizations with subscription data
    const { data: organizations } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status, created_at, updated_at')
      .neq('status', 'cancelled' as any);

    const orgs = organizations || [];

    // Calculate active subscriptions
    const activeSubscriptions = orgs.filter(
      org => org.subscription_status === 'active'
    );

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = activeSubscriptions.reduce((sum, org) => {
      const tier = org.subscription_tier as keyof typeof tierPricing;
      const price = tierPricing[tier] || tierPricing.starter;
      return sum + price;
    }, 0);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Calculate churn rate (organizations that cancelled in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: cancelledOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('subscription_status', 'cancelled')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    const totalActiveLastMonth = activeSubscriptions.length + (cancelledOrgs?.length || 0);
    const churnRate = totalActiveLastMonth > 0
      ? ((cancelledOrgs?.length || 0) / totalActiveLastMonth) * 100
      : 0;

    // Calculate average revenue per organization
    const avgRevenuePerOrg = activeSubscriptions.length > 0
      ? mrr / activeSubscriptions.length
      : 0;

    // Note: billing_events table may not exist yet, skip for now
    // TODO: Re-enable when billing_events table is created
    const actualMonthlyRevenue = 0;

    return NextResponse.json({
      data: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        activeSubscriptions: activeSubscriptions.length,
        churnRate: Math.round(churnRate * 100) / 100,
        avgRevenuePerOrg: Math.round(avgRevenuePerOrg * 100) / 100,
        actualMonthlyRevenue: Math.round(actualMonthlyRevenue * 100) / 100,
        metrics: {
          totalOrganizations: orgs.length,
          activeOrganizations: activeSubscriptions.length,
          trialOrganizations: orgs.filter(org => org.subscription_status === 'trial').length,
          cancelledThisMonth: cancelledOrgs?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Admin billing metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
