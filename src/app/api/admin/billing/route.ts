/**
 * Admin Billing Management API
 * Provides comprehensive billing oversight, revenue tracking, and subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const view = searchParams.get('view') || 'overview';

    if (view === 'overview') {
      // Get billing overview and metrics
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const [
        currentMonthEvents,
        lastMonthEvents,
        subscriptionDistribution,
        recentEvents,
        trialOrganizations,
        churnedOrganizations
      ] = await Promise.all([
        // Current month billing events
        supabase
          .from('billing_events')
          .select('event_type, amount, currency, created_at')
          .gte('created_at', startOfMonth.toISOString()),

        // Last month billing events
        supabase
          .from('billing_events')
          .select('event_type, amount, currency, created_at')
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString()),

        // Subscription distribution
        supabase
          .from('organizations')
          .select('subscription_tier, subscription_status')
          .neq('status', 'cancelled' as any),

        // Recent billing events
        supabase
          .from('billing_events')
          .select(`
            *,
            organizations(name, slug)
          `)
          .order('created_at', { ascending: false })
          .limit(20),

        // Trial organizations
        supabase
          .from('organizations')
          .select('id, name, trial_ends_at, created_at')
          .eq('subscription_status', 'trial')
          .order('trial_ends_at', { ascending: true }),

        // Churned organizations (cancelled this month)
        supabase
          .from('organizations')
          .select('id, name, subscription_status, updated_at')
          .eq('subscription_status', 'cancelled')
          .gte('updated_at', startOfMonth.toISOString())
      ]);

      // Calculate metrics
      const currentMonthRevenue = (currentMonthEvents.data || [])
        .filter(e => e.event_type === 'payment_succeeded')
        .reduce((sum, e) => sum + (e.amount || 0), 0) / 100;

      const lastMonthRevenue = (lastMonthEvents.data || [])
        .filter(e => e.event_type === 'payment_succeeded')
        .reduce((sum, e) => sum + (e.amount || 0), 0) / 100;

      const revenueGrowth = lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Subscription distribution
      const subDistribution = (subscriptionDistribution.data || []).reduce((acc, org) => {
        const tier = org.subscription_tier;
        const status = org.subscription_status;

        acc.byTier[tier] = (acc.byTier[tier] || 0) + 1;
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;

        return acc;
      }, { byTier: {} as Record<string, number>, byStatus: {} as Record<string, number> });

      // Active subscriptions
      const activeSubscriptions = (subscriptionDistribution.data || [])
        .filter(org => org.subscription_status === 'active').length;

      // Calculate MRR (Monthly Recurring Revenue)
      const tierPricing = { starter: 29, professional: 99, enterprise: 299 }; // Default pricing
      const mrr = (subscriptionDistribution.data || [])
        .filter(org => org.subscription_status === 'active')
        .reduce((sum, org) => {
          return sum + (tierPricing[org.subscription_tier as keyof typeof tierPricing] || 0);
        }, 0);

      // ARPU (Average Revenue Per User)
      const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

      // Churn rate
      const totalActiveLastMonth = activeSubscriptions + (churnedOrganizations.data?.length || 0);
      const churnRate = totalActiveLastMonth > 0
        ? ((churnedOrganizations.data?.length || 0) / totalActiveLastMonth) * 100
        : 0;

      // Trial conversion (organizations that converted from trial to paid in the last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: conversions } = await supabase
        .from('billing_events')
        .select('organization_id')
        .eq('event_type', 'subscription_created')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const trialConversions = conversions?.length || 0;
      const trialsStarted30Days = (trialOrganizations.data || [])
        .filter(org => new Date(org.created_at) >= thirtyDaysAgo).length;

      const trialConversionRate = trialsStarted30Days > 0
        ? (trialConversions / trialsStarted30Days) * 100
        : 0;

      const overview = {
        revenue: {
          currentMonth: currentMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
          mrr,
          arpu,
        },
        subscriptions: {
          active: activeSubscriptions,
          distribution: subDistribution,
          churnRate,
          trialConversionRate,
        },
        trials: {
          count: trialOrganizations.data?.length || 0,
          expiringSoon: (trialOrganizations.data || [])
            .filter(org => {
              if (!org.trial_ends_at) return false;
              const expiryDate = new Date(org.trial_ends_at);
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return daysUntilExpiry <= 7;
            }).length,
        },
        recentActivity: {
          events: (recentEvents.data || []).map(event => ({
            id: event.id,
            eventType: event.event_type,
            amount: event.amount ? event.amount / 100 : null,
            currency: event.currency,
            organization: event.organizations ? {
              name: event.organizations.name,
              slug: event.organizations.slug,
            } : null,
            createdAt: event.created_at,
          })),
        },
      };

      // Note: Audit logging removed - system_audit_logs table doesn't exist yet

      return NextResponse.json({ overview });

    } else if (view === 'events') {
      // Get billing events with pagination and filtering
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const eventType = searchParams.get('eventType');
      const organizationId = searchParams.get('organizationId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      let query = supabase
        .from('billing_events')
        .select(`
          *,
          organizations(id, name, slug)
        `, { count: 'exact' });

      // Apply filters
      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching billing events:', error);
        return NextResponse.json({ error: 'Failed to fetch billing events' }, { status: 500 });
      }

      const events = (data || []).map(event => ({
        id: event.id,
        eventType: event.event_type,
        amount: event.amount ? event.amount / 100 : null,
        currency: event.currency,
        organization: event.organizations ? {
          id: event.organizations.id,
          name: event.organizations.name,
          slug: event.organizations.slug,
        } : null,
        createdAt: event.created_at,
      }));

      // Note: Audit logging removed - system_audit_logs table doesn't exist yet

      return NextResponse.json({
        events,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        filters: {
          available: {
            eventTypes: [
              'subscription_created', 'subscription_updated', 'subscription_cancelled',
              'payment_succeeded', 'payment_failed', 'trial_started', 'trial_ended'
            ],
          },
          applied: { eventType, organizationId, startDate, endDate },
        },
      });

    } else {
      return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin billing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}