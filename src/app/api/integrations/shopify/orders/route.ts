/**
 * Shopify Orders API
 *
 * GET /api/integrations/shopify/orders - List orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const contactId = searchParams.get('contact_id')
    const status = searchParams.get('status')
    const fulfillmentStatus = searchParams.get('fulfillment_status')

    // Build query
    let query = supabase
      .from('shopify_orders')
      .select(
        `
        *,
        shopify_fulfillments (
          id,
          status,
          tracking_company,
          tracking_number,
          tracking_url,
          shipment_status
        ),
        contacts (
          id,
          name,
          phone_number
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', profile.organization_id)
      .order('shopify_created_at', { ascending: false })

    // Apply filters
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    if (status) {
      query = query.eq('order_status', status)
    }

    if (fulfillmentStatus) {
      query = query.eq('fulfillment_status', fulfillmentStatus)
    }

    // Apply pagination
    const { data, count, error } = await query.range(
      offset,
      offset + Math.min(limit, 100) - 1
    )

    if (error) {
      console.error('Failed to get orders:', error)
      return NextResponse.json(
        { error: 'Failed to get orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orders: data,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
