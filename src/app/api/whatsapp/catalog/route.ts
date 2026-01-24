/**
 * WhatsApp Catalog Configuration API
 *
 * Purpose: Configure and manage WhatsApp product catalogs
 * Date: 2026-01-24
 *
 * Endpoints:
 * - GET: List configured catalogs or get linked catalogs from Meta
 * - POST: Configure a catalog for the organization
 * - DELETE: Remove a catalog configuration
 */

import { NextResponse } from 'next/server'
import { createClient, QueryValidators } from '@/lib/supabase/server'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import {
  getCatalog,
  configureCatalog,
  deleteCatalog,
} from '@/lib/whatsapp/catalog-sync'
import type { CatalogConfigRequest } from '@/types/whatsapp-catalog'

// ============================================================================
// GET - List catalogs
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

    // Get user's organization and WhatsApp config
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Check role - only owner/admin can manage catalogs
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'meta' or 'local' (default)
    const catalogId = searchParams.get('catalog_id')

    // If requesting from Meta, fetch linked catalogs
    if (source === 'meta') {
      try {
        // Get organization's WhatsApp Business Account ID
        const { data: org } = await supabase
          .from('organizations')
          .select('whatsapp_business_account_id')
          .eq('id', profile.organization_id)
          .single()

        if (!org?.whatsapp_business_account_id) {
          return NextResponse.json(
            { error: 'WhatsApp not configured for this organization' },
            { status: 400 }
          )
        }

        const whatsappClient = await getWhatsAppClient(profile.organization_id)
        const linkedCatalogs = await whatsappClient.getLinkedCatalogs(
          org.whatsapp_business_account_id
        )

        return NextResponse.json({
          source: 'meta',
          catalogs: linkedCatalogs,
        })
      } catch (error) {
        console.error('Error fetching Meta catalogs:', error)
        return NextResponse.json(
          { error: 'Failed to fetch catalogs from Meta' },
          { status: 500 }
        )
      }
    }

    // Get configured catalogs from database
    if (catalogId) {
      const validation = QueryValidators.text(catalogId, 100)
      if (!validation.isValid) {
        return NextResponse.json({ error: 'Invalid catalog ID' }, { status: 400 })
      }

      const catalog = await getCatalog(profile.organization_id, catalogId)
      if (!catalog) {
        return NextResponse.json({ error: 'Catalog not found' }, { status: 404 })
      }

      return NextResponse.json({ catalog })
    }

    const catalogs = await getCatalog(profile.organization_id)
    return NextResponse.json({
      source: 'local',
      catalogs: Array.isArray(catalogs) ? catalogs : catalogs ? [catalogs] : [],
    })
  } catch (error) {
    console.error('Catalog API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Configure catalog
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

    // Check role
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: CatalogConfigRequest = await request.json()

    // Validate catalog_id
    if (!body.catalog_id) {
      return NextResponse.json(
        { error: 'catalog_id is required' },
        { status: 400 }
      )
    }

    const catalogIdValidation = QueryValidators.text(body.catalog_id, 100)
    if (!catalogIdValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid catalog_id format' },
        { status: 400 }
      )
    }

    // Validate catalog_name if provided
    if (body.catalog_name) {
      const nameValidation = QueryValidators.text(body.catalog_name, 255)
      if (!nameValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid catalog_name format' },
          { status: 400 }
        )
      }
    }

    // Configure catalog
    const catalog = await configureCatalog(
      profile.organization_id,
      body.catalog_id,
      body.catalog_name
    )

    if (!catalog) {
      return NextResponse.json(
        { error: 'Failed to configure catalog' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        catalog,
        message: 'Catalog configured successfully. Trigger sync to import products.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Catalog API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Remove catalog configuration
// ============================================================================

export async function DELETE(request: Request) {
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

    // Check role - only owner can delete catalogs
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can delete catalog configurations' },
        { status: 403 }
      )
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

    // Delete catalog
    const success = await deleteCatalog(profile.organization_id, catalogId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete catalog' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Catalog configuration removed. Products have been deactivated.',
    })
  } catch (error) {
    console.error('Catalog API DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
