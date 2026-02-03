/**
 * Shopify Product Sync
 *
 * Handles product catalog synchronization from Shopify stores
 */

import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { shopifyAdminRequest, decryptAccessToken } from './client'
import type {
  ShopifyIntegration,
  ShopifyProduct,
  ShopifySyncProductsResponse,
} from '@/types/shopify'

// =============================================================================
// Product Fetching
// =============================================================================

interface ShopifyProductsResponse {
  products: Array<{
    id: number
    title: string
    body_html: string | null
    vendor: string | null
    product_type: string | null
    handle: string | null
    status: string
    tags: string
    created_at: string
    updated_at: string
    images: Array<{
      id: number
      src: string
      alt: string | null
      position: number
      width: number
      height: number
    }>
    variants: Array<{
      id: number
      title: string
      price: string
      compare_at_price: string | null
      sku: string | null
      inventory_quantity: number | null
      inventory_management: string | null
      weight: number | null
      weight_unit: string | null
      option1: string | null
      option2: string | null
      option3: string | null
    }>
  }>
}

/**
 * Fetch products from Shopify with pagination
 */
async function fetchProductsFromShopify(
  integration: ShopifyIntegration,
  sinceId?: string,
  limit: number = 250
): Promise<ShopifyProductsResponse['products']> {
  const params = new URLSearchParams({
    limit: String(limit),
    status: 'active',
  })

  if (sinceId) {
    params.set('since_id', sinceId)
  }

  const response = await shopifyAdminRequest<ShopifyProductsResponse>(
    integration,
    `/products.json?${params.toString()}`
  )

  return response?.products || []
}

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Sync products for a specific integration
 */
export async function syncProducts(
  integrationId: string,
  fullSync: boolean = false
): Promise<ShopifySyncProductsResponse> {
  const supabase = createServiceRoleClient()

  // Get integration
  const { data: integration, error: integrationError } = await supabase
    .from('shopify_integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('is_active', true)
    .single()

  if (integrationError || !integration) {
    return {
      success: false,
      products_synced: 0,
      products_updated: 0,
      products_deleted: 0,
      errors: ['Integration not found or inactive'],
    }
  }

  let productsSynced = 0
  let productsUpdated = 0
  const errors: string[] = []
  let lastProductId: string | undefined

  try {
    // Fetch all products with pagination
    let hasMore = true

    while (hasMore) {
      const products = await fetchProductsFromShopify(
        integration as ShopifyIntegration,
        lastProductId
      )

      if (products.length === 0) {
        hasMore = false
        break
      }

      // Process batch
      for (const product of products) {
        try {
          const prices = product.variants.map((v) => parseFloat(v.price))
          const priceRange = {
            min: Math.min(...prices).toFixed(2),
            max: Math.max(...prices).toFixed(2),
            currency: 'EUR',
          }

          const { error: upsertError } = await supabase
            .from('shopify_products')
            .upsert(
              {
                shopify_integration_id: integrationId,
                organization_id: integration.organization_id,
                shopify_product_id: String(product.id),
                title: product.title,
                description: product.body_html,
                product_type: product.product_type,
                handle: product.handle,
                status: product.status as 'active' | 'archived' | 'draft',
                vendor: product.vendor,
                tags: product.tags ? product.tags.split(',').map((t) => t.trim()) : [],
                images: product.images.map((img) => ({
                  id: String(img.id),
                  src: img.src,
                  alt: img.alt,
                  position: img.position,
                  width: img.width,
                  height: img.height,
                })),
                variants: product.variants.map((v) => ({
                  id: String(v.id),
                  title: v.title,
                  price: v.price,
                  compare_at_price: v.compare_at_price,
                  sku: v.sku,
                  inventory_quantity: v.inventory_quantity,
                  inventory_management: v.inventory_management,
                  weight: v.weight,
                  weight_unit: v.weight_unit,
                  option1: v.option1,
                  option2: v.option2,
                  option3: v.option3,
                })),
                price_range: priceRange,
                shopify_updated_at: product.updated_at,
                synced_at: new Date().toISOString(),
              },
              {
                onConflict: 'shopify_integration_id,shopify_product_id',
              }
            )

          if (upsertError) {
            errors.push(`Failed to sync product ${product.id}: ${upsertError.message}`)
          } else {
            productsSynced++
          }
        } catch (productError) {
          errors.push(`Error processing product ${product.id}: ${productError}`)
        }
      }

      // Get last ID for pagination
      lastProductId = String(products[products.length - 1].id)

      // If we got less than limit, we're done
      if (products.length < 250) {
        hasMore = false
      }
    }

    // Update last sync time
    await supabase
      .from('shopify_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId)

    return {
      success: errors.length === 0,
      products_synced: productsSynced,
      products_updated: productsUpdated,
      products_deleted: 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Product sync error:', error)
    return {
      success: false,
      products_synced: productsSynced,
      products_updated: 0,
      products_deleted: 0,
      errors: [error instanceof Error ? error.message : 'Unknown sync error'],
    }
  }
}

/**
 * Sync all products for an organization
 */
export async function syncAllProducts(
  organizationId: string
): Promise<ShopifySyncProductsResponse> {
  const supabase = await createClient()

  // Get active integration
  const { data: integration } = await supabase
    .from('shopify_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!integration) {
    return {
      success: false,
      products_synced: 0,
      products_updated: 0,
      products_deleted: 0,
      errors: ['No active Shopify integration found'],
    }
  }

  return syncProducts(integration.id, true)
}

// =============================================================================
// Product Queries
// =============================================================================

/**
 * Get products for organization with pagination
 */
export async function getProducts(
  organizationId: string,
  options: {
    limit?: number
    offset?: number
    search?: string
    productType?: string
    status?: 'active' | 'archived' | 'draft'
  } = {}
): Promise<{ products: ShopifyProduct[]; total: number }> {
  const { limit = 50, offset = 0, search, productType, status = 'active' } = options

  const supabase = await createClient()

  let query = supabase
    .from('shopify_products')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('status', status)
    .order('title', { ascending: true })

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  if (productType) {
    query = query.eq('product_type', productType)
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to get products:', error)
    return { products: [], total: 0 }
  }

  return {
    products: data as ShopifyProduct[],
    total: count || 0,
  }
}

/**
 * Get single product by ID
 */
export async function getProductById(
  organizationId: string,
  productId: string
): Promise<ShopifyProduct | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shopify_products')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .single()

  if (error) {
    return null
  }

  return data as ShopifyProduct
}

/**
 * Get product types for filter dropdown
 */
export async function getProductTypes(organizationId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shopify_products')
    .select('product_type')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .not('product_type', 'is', null)

  if (!data) return []

  // Get unique types
  const types = [...new Set(data.map((p) => p.product_type).filter(Boolean))]
  return types.sort() as string[]
}
