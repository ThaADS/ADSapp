import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')
    const { paymentMethodId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    const paymentMethodManager = new PaymentMethodManager()
    await paymentMethodManager.setDefaultPaymentMethod(organizationId, paymentMethodId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set default payment method API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
