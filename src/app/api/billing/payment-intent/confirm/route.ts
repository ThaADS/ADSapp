/**
 * Payment Intent Confirm API (S-002)
 * ====================================
 * Confirm payment intent after 3D Secure authentication completion.
 *
 * POST /api/billing/payment-intent/confirm - Confirm payment intent
 *
 * Security: Authenticated users only
 * Compliance: PCI DSS, PSD2 SCA requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentIntentManager } from '@/lib/billing/payment-intent-manager';

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

    // 2. Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();

    const {
      paymentIntentId,
      paymentMethodId,
      returnUrl,
    } = body;

    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    // 4. Verify payment intent belongs to user's organization
    const { data: paymentIntent, error: piError } = await supabase
      .from('payment_intents')
      .select('organization_id')
      .eq('id', paymentIntentId)
      .single();

    if (piError || !paymentIntent) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }

    if (paymentIntent.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden: Payment intent belongs to different organization' },
        { status: 403 }
      );
    }

    // 5. Confirm payment intent
    const paymentIntentManager = new PaymentIntentManager();

    const result = await paymentIntentManager.confirmPaymentIntent({
      paymentIntentId,
      paymentMethodId,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });

    // 6. Return result
    if (result.status === 'succeeded' || result.status === 'requires_action') {
      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: result.paymentIntentId,
          status: result.status,
          authenticationRequired: result.authenticationRequired,
          nextAction: result.nextAction,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      }, { status: 400 });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Payment intent confirmation API error:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
