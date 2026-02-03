/**
 * Cart Recovery API
 *
 * POST /api/integrations/shopify/carts/:id/recover - Send recovery message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCartRecoveryMessage } from '@/lib/integrations/shopify/cart-recovery'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params

    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify cart belongs to organization
    const { data: cart, error: cartError } = await supabase
      .from('shopify_carts')
      .select('id, organization_id')
      .eq('id', cartId)
      .single()

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    if (cart.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse optional body
    let options: { templateId?: string; customMessage?: string } = {}
    try {
      const body = await request.json()
      options = {
        templateId: body.template_id,
        customMessage: body.custom_message,
      }
    } catch {
      // No body provided, use defaults
    }

    // Send recovery message
    const result = await sendCartRecoveryMessage(cartId, options)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart recovery error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
