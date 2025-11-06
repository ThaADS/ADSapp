/**
 * Payment Intent Create API (S-002)
 * ===================================
 * Create payment intent with 3D Secure authentication for subscription payments.
 *
 * POST /api/billing/payment-intent/create - Create new payment intent
 *
 * Security: Authenticated users only
 * Compliance: PCI DSS, PSD2 SCA requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentIntentManager } from '@/lib/billing/payment-intent-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. Parse and validate request body
    const body = await request.json()

    const {
      amount,
      currency = 'USD',
      purpose = 'subscription_payment',
      relatedSubscriptionId,
      relatedInvoiceId,
      metadata = {},
      returnUrl,
    } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // Validate purpose
    const validPurposes = [
      'subscription_payment',
      'subscription_upgrade',
      'additional_charge',
      'invoice_payment',
      'setup_payment_method',
    ]
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
    }

    // 4. Extract user agent and IP address
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined

    // 5. Create payment intent
    const paymentIntentManager = new PaymentIntentManager()

    const result = await paymentIntentManager.createPaymentIntentWithSCA({
      organizationId: profile.organization_id,
      amount,
      currency,
      purpose,
      relatedSubscriptionId,
      relatedInvoiceId,
      metadata,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
      userAgent,
      ipAddress,
    })

    // 6. Return result
    if (result.clientSecret) {
      return NextResponse.json(
        {
          success: true,
          paymentIntent: {
            id: result.paymentIntentId,
            clientSecret: result.clientSecret,
            status: result.status,
            authenticationRequired: result.authenticationRequired,
            nextAction: result.nextAction,
          },
        },
        { status: 201 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    const err = error as Error
    console.error('Payment intent creation API error:', err)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    )
  }
}
