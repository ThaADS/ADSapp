import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/stripe/server'
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Apply strict API middleware (tenant validation + strict rate limiting)
  const middlewareResponse = await strictApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userRole } = getTenantContext(request)
    const supabase = await createClient()

    // Check if user is owner or admin
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized - Owner or Admin role required' },
        { status: 403 }
      )
    }

    // Get organization stripe customer ID
    const { data: organization } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!organization?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    // Create portal session
    const session = await StripeService.createPortalSession(organization.stripe_customer_id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
