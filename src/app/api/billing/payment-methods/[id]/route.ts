import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentMethodManager } from '@/lib/billing/payment-methods'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')
    const { expiryMonth, expiryYear, metadata } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const paymentMethodManager = new PaymentMethodManager()
    await paymentMethodManager.updatePaymentMethod(organizationId, params.id, {
      expiryMonth,
      expiryYear,
      metadata,
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = request.headers.get('X-Organization-ID')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const paymentMethodManager = new PaymentMethodManager()
    await paymentMethodManager.detachPaymentMethod(organizationId, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete payment method API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}