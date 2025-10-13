/**
 * Admin Refund API - Create Refund (S-001)
 * ==========================================
 * Super admin endpoint for processing refunds with full authorization and validation.
 *
 * POST /api/admin/billing/refunds - Create new refund request
 *
 * Security: Super admin only
 * Compliance: PCI DSS, Financial audit requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RefundManager } from '@/lib/billing/refunds';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify super admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();

    const {
      organizationId,
      subscriptionId,
      chargeId,
      amount,
      currency = 'USD',
      refundType = 'full',
      reason,
      reasonDetails,
      cancelSubscription = false,
    } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Validate refund type
    const validRefundTypes = ['full', 'partial', 'prorated'];
    if (!validRefundTypes.includes(refundType)) {
      return NextResponse.json(
        { error: 'Invalid refund type' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = [
      'requested_by_customer',
      'duplicate_payment',
      'fraudulent',
      'service_not_provided',
      'technical_issue',
      'billing_error',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // 4. Process refund
    const refundManager = new RefundManager();

    const result = await refundManager.processRefund({
      organizationId,
      subscriptionId,
      chargeId,
      amount,
      currency,
      refundType,
      reason,
      reasonDetails,
      cancelSubscription,
      requestedBy: user.id,
    });

    // 5. Return result
    if (result.status === 'completed') {
      return NextResponse.json({
        success: true,
        refund: {
          id: result.refundId,
          stripeRefundId: result.stripeRefundId,
          amount: result.amount,
          currency: result.currency,
          status: result.status,
          subscriptionCancelled: result.subscriptionCancelled,
        },
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      }, { status: 400 });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Refund API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify super admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      organizationId: searchParams.get('organizationId') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // 4. Get refunds
    const refundManager = new RefundManager();
    const { refunds, totalCount } = await refundManager.listRefunds(filters);

    return NextResponse.json({
      success: true,
      refunds,
      pagination: {
        total: totalCount,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < totalCount,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('List refunds API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
