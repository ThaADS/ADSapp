/**
 * Enhanced Admin Dashboard API
 * Provides comprehensive platform metrics and overview data for the super admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SuperAdminPermissions } from '@/lib/super-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get platform overview metrics
    const { data: platformData, error: platformError } = await supabase.rpc('get_platform_overview');

    if (platformError) {
      console.error('Error fetching platform overview:', platformError);
      return NextResponse.json({ error: 'Failed to fetch platform metrics' }, { status: 500 });
    }

    // Get recent activity and growth metrics
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      newOrgsToday,
      newOrgsWeek,
      newOrgsMonth,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      systemHealth,
      recentTickets,
      billingEvents
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact' }).gte('created_at', today),
      supabase.from('organizations').select('id', { count: 'exact' }).gte('created_at', weekAgo),
      supabase.from('organizations').select('id', { count: 'exact' }).gte('created_at', monthAgo),
      supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', today),
      supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', weekAgo),
      supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', monthAgo),
      supabase.from('system_health_checks').select('status').order('checked_at', { ascending: false }).limit(10),
      supabase.from('support_tickets').select('id, status, priority, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
      supabase.from('billing_events').select('amount_cents, event_type, created_at').eq('event_type', 'payment_succeeded').gte('created_at', monthAgo)
    ]);

    // Calculate system health
    const healthChecks = systemHealth.data || [];
    const criticalCount = healthChecks.filter(check => check.status === 'critical').length;
    const warningCount = healthChecks.filter(check => check.status === 'warning').length;

    let systemHealthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      systemHealthStatus = 'critical';
    } else if (warningCount > 2) {
      systemHealthStatus = 'warning';
    }

    // Calculate monthly revenue
    const monthlyRevenue = (billingEvents.data || [])
      .reduce((sum, event) => sum + (event.amount_cents || 0), 0) / 100;

    // Get subscription distribution
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .neq('status', 'deleted');

    const subscriptionDistribution = (orgsData || []).reduce((acc, org) => {
      acc[org.subscription_tier] = (acc[org.subscription_tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dashboardData = {
      overview: {
        ...platformData,
        systemHealth: systemHealthStatus,
        monthlyRevenue,
        subscriptionDistribution,
      },
      growth: {
        newOrganizationsToday: newOrgsToday.count || 0,
        newOrganizationsThisWeek: newOrgsWeek.count || 0,
        newOrganizationsThisMonth: newOrgsMonth.count || 0,
        newUsersToday: newUsersToday.count || 0,
        newUsersThisWeek: newUsersWeek.count || 0,
        newUsersThisMonth: newUsersMonth.count || 0,
      },
      recentActivity: {
        openTickets: recentTickets.data || [],
        systemAlerts: healthChecks.filter(check => check.status !== 'healthy').slice(0, 5),
      },
    };

    // Log the dashboard access
    await permissions.logSystemAuditEvent(
      'view_admin_dashboard',
      undefined,
      undefined,
      { timestamp: new Date().toISOString() },
      'info'
    );

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get historical metrics for charts
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const { timeRange = '30d', metrics = ['organizations', 'users', 'revenue'] } = await request.json();

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get platform metrics for the date range
    const { data: platformMetrics } = await supabase
      .from('platform_metrics')
      .select('*')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    const chartData = (platformMetrics || []).map(metric => ({
      date: metric.metric_date,
      organizations: metric.total_organizations,
      activeOrganizations: metric.active_organizations,
      newOrganizations: metric.new_organizations,
      users: metric.total_users,
      activeUsers: metric.active_users,
      revenue: metric.revenue_cents / 100,
      messages: metric.total_messages,
      conversations: metric.total_conversations,
    }));

    return NextResponse.json({ chartData });

  } catch (error) {
    console.error('Admin dashboard historical data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}