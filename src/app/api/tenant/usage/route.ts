/**
 * Tenant Usage Tracking API Routes
 *
 * Handles usage tracking and monitoring endpoints:
 * - GET: Get usage metrics and reports
 * - POST: Track usage events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import UsageTracker from '@/lib/usage-tracking';
import { tenantUtils } from '@/middleware/tenant-routing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/usage - Get usage metrics
export async function GET(request: NextRequest) {
  try {
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user belongs to organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.organization_id !== tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'monthly';
    const reportType = searchParams.get('type') || 'current';
    const days = parseInt(searchParams.get('days') || '30');

    const usageTracker = new UsageTracker(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      tenantContext.organizationId
    );

    let data;

    switch (reportType) {
      case 'current':
        data = await usageTracker.getCurrentUsage(period);
        break;

      case 'history':
        data = await usageTracker.getUsageHistory(days);
        break;

      case 'limits':
        data = await usageTracker.getUsageLimits();
        break;

      case 'alerts':
        data = await usageTracker.checkLimits();
        break;

      case 'realtime':
        data = await usageTracker.getRealTimeStats();
        break;

      case 'report':
        const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());
        data = await usageTracker.generateUsageReport(startDate, endDate);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/usage - Track usage event
export async function POST(request: NextRequest) {
  try {
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user belongs to organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.organization_id !== tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const {
      eventType,
      resourceAmount,
      bytesConsumed,
      endpoint,
      metadata,
      billable,
      costCents
    } = await request.json();

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Track the usage event
    const usageTracker = new UsageTracker(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      tenantContext.organizationId
    );

    const event = await usageTracker.trackEvent(eventType, {
      resourceAmount,
      bytesConsumed,
      userId: user.id,
      endpoint,
      metadata,
      billable,
      costCents,
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to track usage event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error tracking usage event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}