import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);
    const { expiryMonth, expiryYear, metadata } = await request.json();
    const { id } = await params;

    const paymentMethodManager = new PaymentMethodManager();
    await paymentMethodManager.updatePaymentMethod(organizationId, id, {
      expiryMonth,
      expiryYear,
      metadata,
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update payment method API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);
    const { id } = await params;

    const paymentMethodManager = new PaymentMethodManager();
    await paymentMethodManager.detachPaymentMethod(organizationId, id);

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete payment method API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}