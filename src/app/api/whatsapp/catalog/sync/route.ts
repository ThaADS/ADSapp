/**
 * WhatsApp Catalog Sync API
 *
 * Purpose: Trigger product sync from Meta Commerce Manager
 * Date: 2026-01-24
 *
 * Endpoints:
 * - POST: Trigger sync for a catalog
 */

import { NextResponse } from 'next/server'
import { createClient, QueryValidators } from '@/lib/supabase/server'
import { syncCatalog, getCatalog } from '@/lib/whatsapp/catalog-sync'
import type { CatalogSyncResponse } from '@/types/whatsapp-catalog'

// ============================================================================
// POST - Trigger catalog sync
// ============================================================================

export async function POST(request: Request) {
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Check role - only owner/admin can trigger sync
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { catalog_id, force = false } = body

    // Validate catalog_id
    if (!catalog_id) {
      return NextResponse.json(
        { error: 'catalog_id is required' },
        { status: 400 }
      )
    }

    const catalogIdValidation = QueryValidators.text(catalog_id, 100)
    if (!catalogIdValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid catalog_id format' },
        { status: 400 }
      )
    }

    // Verify catalog exists and belongs to organization
    const catalog = await getCatalog(profile.organization_id, catalog_id)
    if (!catalog || Array.isArray(catalog)) {
      return NextResponse.json(
        { error: 'Catalog not found. Configure the catalog first.' },
        { status: 404 }
      )
    }

    // Check if catalog is enabled
    if (!catalog.is_enabled) {
      return NextResponse.json(
        { error: 'Catalog is disabled. Enable it before syncing.' },
        { status: 400 }
      )
    }

    // Check if sync is already in progress
    if (catalog.sync_status === 'syncing' && !force) {
      return NextResponse.json(
        {
          error: 'Sync already in progress. Use force=true to override.',
          sync_status: catalog.sync_status,
        },
        { status: 409 }
      )
    }

    // Trigger sync
    console.log(
      `Triggering catalog sync for org ${profile.organization_id}, catalog ${catalog_id}`
    )

    const result: CatalogSyncResponse = await syncCatalog(
      profile.organization_id,
      catalog_id,
      { force }
    )

    // Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        products_synced: result.products_synced,
        message: `Successfully synced ${result.products_synced} products`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          products_synced: result.products_synced,
          errors: result.errors,
          message: 'Sync completed with errors',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Catalog sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Get sync status
// ============================================================================

export async function GET(request: Request) {
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const catalogId = searchParams.get('catalog_id')

    if (!catalogId) {
      return NextResponse.json(
        { error: 'catalog_id query parameter is required' },
        { status: 400 }
      )
    }

    const validation = QueryValidators.text(catalogId, 100)
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Invalid catalog_id' }, { status: 400 })
    }

    // Get catalog sync status
    const catalog = await getCatalog(profile.organization_id, catalogId)
    if (!catalog || Array.isArray(catalog)) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 })
    }

    return NextResponse.json({
      catalog_id: catalog.catalog_id,
      catalog_name: catalog.catalog_name,
      sync_status: catalog.sync_status,
      last_sync_at: catalog.last_sync_at,
      sync_error: catalog.sync_error,
      product_count: catalog.product_count,
      is_enabled: catalog.is_enabled,
      auto_sync_enabled: catalog.auto_sync_enabled,
      auto_sync_interval_hours: catalog.auto_sync_interval_hours,
    })
  } catch (error) {
    console.error('Catalog sync status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
