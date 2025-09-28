import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'

export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')
    const { setAsDefault = false, usage = 'off_session' } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const paymentMethodManager = new PaymentMethodManager()
    const setupIntent = await paymentMethodManager.createSetupIntent(organizationId, {
      setAsDefault,
      usage,
    })

    return NextResponse.json(setupIntent)
  } catch (error) {
    console.error('Setup intent API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}