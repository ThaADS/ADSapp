/**
 * WhatsApp Catalog Sync Service
 *
 * Purpose: Sync products from Meta Commerce Manager catalogs to local database
 * Date: 2026-01-24
 *
 * Features:
 * - Fetch products from Meta API with pagination
 * - Upsert products to local database
 * - Track sync status and errors
 * - Support incremental and full sync
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import type {
  WhatsAppCatalog,
  WhatsAppProduct,
  CatalogSyncResponse,
  CreateWhatsAppProduct,
  ProductAvailability,
} from '@/types/whatsapp-catalog'

// ============================================================================
// Types
// ============================================================================

export interface SyncOptions {
  /** Maximum products to sync (default: 10000) */
  maxProducts?: number
  /** Force full sync even if recently synced */
  force?: boolean
}

export interface SyncResult {
  success: boolean
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  productsDeactivated: number
  errors: string[]
  duration: number
}

// ============================================================================
// CatalogSyncService
// ============================================================================

export class CatalogSyncService {
  private organizationId: string
  private catalogId: string

  constructor(organizationId: string, catalogId: string) {
    this.organizationId = organizationId
    this.catalogId = catalogId
  }

  /**
   * Sync products from Meta Commerce Manager to local database
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const { maxProducts = 10000, force = false } = options
    const errors: string[] = []
    let productsCreated = 0
    let productsUpdated = 0
    let productsDeactivated = 0

    try {
      // Update catalog status to syncing
      await this.updateCatalogStatus('syncing')

      // Get WhatsApp client for the organization
      const whatsappClient = await getWhatsAppClient(this.organizationId)

      // Fetch all products from Meta
      console.log(`Starting catalog sync for catalog ${this.catalogId}`)
      const metaProducts = await whatsappClient.getAllCatalogProducts(
        this.catalogId,
        maxProducts
      )
      console.log(`Fetched ${metaProducts.length} products from Meta`)

      if (metaProducts.length === 0) {
        await this.updateCatalogStatus('success', 0)
        return {
          success: true,
          productsProcessed: 0,
          productsCreated: 0,
          productsUpdated: 0,
          productsDeactivated: 0,
          errors: [],
          duration: Date.now() - startTime,
        }
      }

      // Get existing products from database
      const supabase = createServiceRoleClient()
      const { data: existingProducts } = await supabase
        .from('whatsapp_products')
        .select('id, meta_product_id, retailer_id')
        .eq('organization_id', this.organizationId)
        .eq('catalog_id', this.catalogId)

      const existingByMetaId = new Map(
        (existingProducts || []).map((p) => [p.meta_product_id, p])
      )
      const existingByRetailerId = new Map(
        (existingProducts || []).map((p) => [p.retailer_id, p])
      )
      const processedMetaIds = new Set<string>()

      // Process products in batches
      const batchSize = 100
      for (let i = 0; i < metaProducts.length; i += batchSize) {
        const batch = metaProducts.slice(i, i + batchSize)
        const productsToUpsert: CreateWhatsAppProduct[] = []

        for (const metaProduct of batch) {
          processedMetaIds.add(metaProduct.id)

          // Check if product exists (by Meta ID or retailer ID)
          const existing =
            existingByMetaId.get(metaProduct.id) ||
            existingByRetailerId.get(metaProduct.retailer_id)

          const productData = this.transformMetaProduct(metaProduct)

          if (existing) {
            productsUpdated++
          } else {
            productsCreated++
          }

          productsToUpsert.push(productData)
        }

        // Upsert batch
        if (productsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('whatsapp_products')
            .upsert(productsToUpsert, {
              onConflict: 'organization_id,catalog_id,meta_product_id',
              ignoreDuplicates: false,
            })

          if (upsertError) {
            console.error('Error upserting products batch:', upsertError)
            errors.push(`Batch upsert error: ${upsertError.message}`)
          }
        }
      }

      // Deactivate products that no longer exist in Meta
      const productsToDeactivate = (existingProducts || [])
        .filter((p) => !processedMetaIds.has(p.meta_product_id))
        .map((p) => p.id)

      if (productsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
          .from('whatsapp_products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', productsToDeactivate)

        if (deactivateError) {
          console.error('Error deactivating products:', deactivateError)
          errors.push(`Deactivation error: ${deactivateError.message}`)
        } else {
          productsDeactivated = productsToDeactivate.length
        }
      }

      // Update catalog status
      await this.updateCatalogStatus(
        errors.length > 0 ? 'error' : 'success',
        metaProducts.length,
        errors.length > 0 ? errors.join('; ') : undefined
      )

      return {
        success: errors.length === 0,
        productsProcessed: metaProducts.length,
        productsCreated,
        productsUpdated,
        productsDeactivated,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during sync'
      console.error('Catalog sync error:', error)

      await this.updateCatalogStatus('error', undefined, errorMessage)

      return {
        success: false,
        productsProcessed: 0,
        productsCreated,
        productsUpdated,
        productsDeactivated,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Transform Meta product to database format
   */
  private transformMetaProduct(
    metaProduct: {
      id: string
      retailer_id: string
      name: string
      description?: string
      price: string
      currency: string
      availability: string
      image_url?: string
      url?: string
      brand?: string
      category?: string
    }
  ): CreateWhatsAppProduct {
    // Parse price (Meta returns price in cents as string)
    const priceAmount = parseInt(metaProduct.price, 10) || null

    // Normalize availability status
    const availability = this.normalizeAvailability(metaProduct.availability)

    return {
      organization_id: this.organizationId,
      catalog_id: this.catalogId,
      meta_product_id: metaProduct.id,
      retailer_id: metaProduct.retailer_id,
      name: metaProduct.name,
      description: metaProduct.description || null,
      price_amount: priceAmount,
      price_currency: metaProduct.currency || 'USD',
      availability,
      image_url: metaProduct.image_url || null,
      product_url: metaProduct.url || null,
      brand: metaProduct.brand || null,
      category: metaProduct.category || null,
      raw_data: metaProduct as unknown as Record<string, unknown>,
      is_active: true,
    }
  }

  /**
   * Normalize availability status from Meta to our enum
   */
  private normalizeAvailability(availability: string): ProductAvailability {
    const normalized = availability.toLowerCase().trim()

    switch (normalized) {
      case 'in stock':
      case 'in_stock':
      case 'available':
        return 'in stock'
      case 'out of stock':
      case 'out_of_stock':
      case 'unavailable':
        return 'out of stock'
      case 'preorder':
      case 'pre_order':
      case 'pre-order':
        return 'preorder'
      case 'available for order':
      case 'available_for_order':
        return 'available for order'
      default:
        return 'in stock' // Default to in stock
    }
  }

  /**
   * Update catalog sync status
   */
  private async updateCatalogStatus(
    status: 'pending' | 'syncing' | 'success' | 'error',
    productCount?: number,
    syncError?: string
  ): Promise<void> {
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      sync_status: status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'success' || status === 'error') {
      updateData.last_sync_at = new Date().toISOString()
    }

    if (productCount !== undefined) {
      updateData.product_count = productCount
    }

    if (syncError) {
      updateData.sync_error = syncError
    } else if (status === 'success') {
      updateData.sync_error = null
    }

    await supabase
      .from('whatsapp_catalogs')
      .update(updateData)
      .eq('organization_id', this.organizationId)
      .eq('catalog_id', this.catalogId)
  }
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Sync a catalog for an organization
 */
export async function syncCatalog(
  organizationId: string,
  catalogId: string,
  options: SyncOptions = {}
): Promise<CatalogSyncResponse> {
  const service = new CatalogSyncService(organizationId, catalogId)
  const result = await service.sync(options)

  return {
    success: result.success,
    products_synced: result.productsCreated + result.productsUpdated,
    errors: result.errors.length > 0 ? result.errors : undefined,
  }
}

/**
 * Get catalog configuration for an organization
 */
export async function getCatalog(
  organizationId: string,
  catalogId?: string
): Promise<WhatsAppCatalog | WhatsAppCatalog[] | null> {
  const supabase = await createClient()

  if (catalogId) {
    const { data, error } = await supabase
      .from('whatsapp_catalogs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('catalog_id', catalogId)
      .single()

    if (error) {
      console.error('Error fetching catalog:', error)
      return null
    }

    return data as WhatsAppCatalog
  }

  const { data, error } = await supabase
    .from('whatsapp_catalogs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching catalogs:', error)
    return []
  }

  return data as WhatsAppCatalog[]
}

/**
 * Configure a catalog for an organization
 */
export async function configureCatalog(
  organizationId: string,
  catalogId: string,
  catalogName?: string
): Promise<WhatsAppCatalog | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('whatsapp_catalogs')
    .upsert(
      {
        organization_id: organizationId,
        catalog_id: catalogId,
        catalog_name: catalogName || null,
        sync_status: 'pending',
        is_enabled: true,
        auto_sync_enabled: true,
        auto_sync_interval_hours: 24,
      },
      {
        onConflict: 'organization_id,catalog_id',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error configuring catalog:', error)
    return null
  }

  return data as WhatsAppCatalog
}

/**
 * Delete a catalog configuration
 */
export async function deleteCatalog(
  organizationId: string,
  catalogId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // First, deactivate all products in the catalog
  await supabase
    .from('whatsapp_products')
    .update({ is_active: false })
    .eq('organization_id', organizationId)
    .eq('catalog_id', catalogId)

  // Then delete the catalog configuration
  const { error } = await supabase
    .from('whatsapp_catalogs')
    .delete()
    .eq('organization_id', organizationId)
    .eq('catalog_id', catalogId)

  if (error) {
    console.error('Error deleting catalog:', error)
    return false
  }

  return true
}

/**
 * Get products from a catalog
 */
export async function getCatalogProducts(
  organizationId: string,
  catalogId: string,
  options: {
    search?: string
    availability?: ProductAvailability
    limit?: number
    offset?: number
    activeOnly?: boolean
  } = {}
): Promise<{ products: WhatsAppProduct[]; total: number }> {
  const supabase = await createClient()
  const { search, availability, limit = 50, offset = 0, activeOnly = true } = options

  let query = supabase
    .from('whatsapp_products')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('catalog_id', catalogId)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (availability) {
    query = query.eq('availability', availability)
  }

  const { data, count, error } = await query
    .order('name')
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching catalog products:', error)
    return { products: [], total: 0 }
  }

  return {
    products: data as WhatsAppProduct[],
    total: count || 0,
  }
}

/**
 * Check if auto-sync is due for any catalogs
 * Called by cron job
 */
export async function syncDueCatalogs(): Promise<void> {
  const supabase = createServiceRoleClient()

  // Find catalogs that need syncing
  const { data: catalogs, error } = await supabase
    .from('whatsapp_catalogs')
    .select('organization_id, catalog_id, auto_sync_interval_hours')
    .eq('is_enabled', true)
    .eq('auto_sync_enabled', true)
    .or(
      `last_sync_at.is.null,last_sync_at.lt.${new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString()}`
    )

  if (error || !catalogs) {
    console.error('Error finding catalogs to sync:', error)
    return
  }

  // Sync each catalog
  for (const catalog of catalogs) {
    try {
      console.log(`Auto-syncing catalog ${catalog.catalog_id}`)
      await syncCatalog(catalog.organization_id, catalog.catalog_id)
    } catch (error) {
      console.error(`Error syncing catalog ${catalog.catalog_id}:`, error)
    }
  }
}
