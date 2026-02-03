/**
 * Shopify Abandoned Carts API
 *
 * GET /api/integrations/shopify/carts - List abandoned carts
 * POST /api/integrations/shopify/carts/:id/recover - Send recovery message
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAbandonedCarts,
  getCartRecoveryStats,
} from '@/lib/integrations/shopify/cart-recovery'

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') as
      | 'pending'
      | 'sent'
      | 'converted'
      | 'expired'
      | undefined
    const includeStats = searchParams.get('stats') === 'true'

    // Get abandoned carts
    const { carts, total } = await getAbandonedCarts(profile.organization_id, {
      limit: Math.min(limit, 100),
      offset,
      status,
    })

    // Get stats if requested
    let stats = null
    if (includeStats) {
      stats = await getCartRecoveryStats(profile.organization_id)
    }

    return NextResponse.json({
      carts,
      total,
      limit,
      offset,
      stats,
    })
  } catch (error) {
    console.error('Get abandoned carts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
