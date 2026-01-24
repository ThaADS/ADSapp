/**
 * WhatsApp Products API
 * Purpose: List products from catalog with search and pagination
 * Date: 2026-01-24
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSearchQuery } from '@/lib/supabase/server'
import type { ProductsListResponse } from '@/types/whatsapp-catalog'

// GET - List products from catalog
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const rawSearch = searchParams.get('search') || ''
    const availability = searchParams.get('availability')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Sanitize search query
    const search = validateSearchQuery(rawSearch)

    // Build query
    let query = supabase
      .from('whatsapp_products')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Availability filter
    if (availability) {
      query = query.eq('availability', availability)
    }

    // Pagination
    query = query
      .order('name')
      .range(offset, offset + limit - 1)

    const { data: products, count, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const response: ProductsListResponse = {
      products: products || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
