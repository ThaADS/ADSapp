/**
 * Shopify Products API
 *
 * GET /api/integrations/shopify/products - List products
 * POST /api/integrations/shopify/products/sync - Sync products from Shopify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProducts, getProductTypes } from '@/lib/integrations/shopify/product-sync'

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
    const search = searchParams.get('search') || undefined
    const productType = searchParams.get('type') || undefined
    const status = (searchParams.get('status') as 'active' | 'archived' | 'draft') || 'active'

    // Get products
    const { products, total } = await getProducts(profile.organization_id, {
      limit: Math.min(limit, 100),
      offset,
      search,
      productType,
      status,
    })

    // Get product types for filtering
    const productTypes = await getProductTypes(profile.organization_id)

    return NextResponse.json({
      products,
      total,
      limit,
      offset,
      product_types: productTypes,
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
