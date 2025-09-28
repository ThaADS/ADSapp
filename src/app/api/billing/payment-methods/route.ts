import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const paymentMethodManager = new PaymentMethodManager()
    const paymentMethods = await paymentMethodManager.getPaymentMethods(organizationId)

    return NextResponse.json(paymentMethods)
  } catch (error) {
    console.error('Payment methods API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}