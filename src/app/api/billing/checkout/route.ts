/**
 * Billing Checkout API
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StripeService, SUBSCRIPTION_PLANS } from '@/lib/stripe/server'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userId, userRole } = getTenantContext(request)
    const supabase = await createClient()

    const body = await request.json()
    const { planId } = body

    // Validate plan
    if (!planId || !SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Check if user is owner or admin
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Owner or Admin role required' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, billing_email')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get user email for Stripe
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Create or get Stripe customer
    const customerId = await StripeService.createCustomer(
      organizationId,
      user.email,
      organization.name
    )

    // Create checkout session
    const session = await StripeService.createCheckoutSession(organizationId, planId, customerId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
