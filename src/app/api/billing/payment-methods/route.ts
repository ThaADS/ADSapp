import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);

    const paymentMethodManager = new PaymentMethodManager();
    const paymentMethods = await paymentMethodManager.getPaymentMethods(organizationId);

    return NextResponse.json(paymentMethods)
  } catch (error) {
    console.error('Payment methods API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}