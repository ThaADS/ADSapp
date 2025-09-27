/**
 * Tenant Usage Limits API Routes
 *
 * Handles usage limit management:
 * - GET: Get usage limits
 * - POST: Create usage limit
 * - PUT: Update usage limit
 * - DELETE: Remove usage limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import UsageTracker from '@/lib/usage-tracking';
import { tenantUtils } from '@/middleware/tenant-routing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/usage/limits - Get usage limits
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

    const usageTracker = new UsageTracker(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      tenantContext.organizationId
    );

    const limits = await usageTracker.getUsageLimits();

    return NextResponse.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/usage/limits - Create usage limit
export async function POST(request: NextRequest) {
  try {
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError ||
        profile.organization_id !== tenantContext.organizationId ||
        !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const {
      limitType,
      periodType,
      softLimit,
      hardLimit,
      alertThreshold
    } = await request.json();

    if (!limitType || !periodType) {
      return NextResponse.json(
        { error: 'Limit type and period type are required' },
        { status: 400 }
      );
    }

    const usageTracker = new UsageTracker(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      tenantContext.organizationId
    );

    const limit = await usageTracker.setUsageLimit(
      limitType,
      periodType,
      softLimit,
      hardLimit,
      alertThreshold
    );

    if (!limit) {
      return NextResponse.json(
        { error: 'Failed to create usage limit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: limit,
    });
  } catch (error) {
    console.error('Error creating usage limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}