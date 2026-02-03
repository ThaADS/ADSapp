/**
 * Shopify Webhook Handler
 *
 * Processes incoming Shopify webhooks with:
 * - HMAC signature verification
 * - Idempotency tracking
 * - Event routing to handlers
 */

import { createHash, timingSafeEqual } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getIntegrationByShop } from './client'
import type {
  ShopifyWebhookTopic,
  ShopifyOrderWebhookPayload,
  ShopifyFulfillmentWebhookPayload,
  ShopifyCheckoutWebhookPayload,
  ShopifyProductWebhookPayload,
  ShopifyIntegration,
} from '@/types/shopify'

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyWebhookSignature(
  body: string,
  hmac: string,
  secret: string
): boolean {
  const computedHmac = createHash('sha256')
    .update(body, 'utf8')
    .digest('base64')

  try {
    return timingSafeEqual(
      Buffer.from(hmac, 'base64'),
      Buffer.from(computedHmac, 'base64')
    )
  } catch {
    return false
  }
}

/**
 * Extract webhook headers from request
 */
export function extractWebhookHeaders(headers: Headers): {
  topic: ShopifyWebhookTopic | null
  hmac: string | null
  shopDomain: string | null
  webhookId: string | null
  apiVersion: string | null
} {
  return {
    topic: headers.get('x-shopify-topic') as ShopifyWebhookTopic | null,
    hmac: headers.get('x-shopify-hmac-sha256'),
    shopDomain: headers.get('x-shopify-shop-domain'),
    webhookId: headers.get('x-shopify-webhook-id'),
    apiVersion: headers.get('x-shopify-api-version'),
  }
}

// =============================================================================
// Idempotency
// =============================================================================

/**
 * Check if webhook has already been processed
 */
async function isWebhookProcessed(
  integrationId: string,
  webhookId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('shopify_webhook_events')
    .select('status')
    .eq('shopify_integration_id', integrationId)
    .eq('webhook_id', webhookId)
    .single()

  return data?.status === 'processed'
}

/**
 * Record webhook event for idempotency
 */
async function recordWebhookEvent(
  integrationId: string,
  webhookId: string,
  topic: string,
  shopDomain: string,
  payload: string
): Promise<string> {
  const supabase = createServiceRoleClient()

  const payloadHash = createHash('sha256').update(payload).digest('hex')

  const { data, error } = await supabase
    .from('shopify_webhook_events')
    .upsert(
      {
        shopify_integration_id: integrationId,
        webhook_id: webhookId,
        topic,
        shop_domain: shopDomain,
        payload_hash: payloadHash,
        status: 'pending',
      },
      {
        onConflict: 'shopify_integration_id,webhook_id',
      }
    )
    .select('id')
    .single()

  if (error) {
    console.error('Failed to record webhook event:', error)
    throw error
  }

  return data.id
}

/**
 * Mark webhook as processed
 */
async function markWebhookProcessed(
  integrationId: string,
  webhookId: string,
  status: 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('shopify_webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('shopify_integration_id', integrationId)
    .eq('webhook_id', webhookId)
}

// =============================================================================
// Main Webhook Processor
// =============================================================================

export interface WebhookResult {
  success: boolean
  error?: string
}

/**
 * Process incoming Shopify webhook
 */
export async function processWebhook(
  headers: Headers,
  body: string
): Promise<WebhookResult> {
  // Extract headers
  const { topic, hmac, shopDomain, webhookId, apiVersion } =
    extractWebhookHeaders(headers)

  // Validate required headers
  if (!topic || !hmac || !shopDomain || !webhookId) {
    return { success: false, error: 'Missing required webhook headers' }
  }

  // Get integration for shop
  const integration = await getIntegrationByShop(shopDomain)
  if (!integration) {
    console.warn(`No integration found for shop: ${shopDomain}`)
    // Return success to prevent Shopify retries for unconnected shops
    return { success: true }
  }

  // Verify signature
  if (!integration.webhook_secret) {
    return { success: false, error: 'Webhook secret not configured' }
  }

  if (!verifyWebhookSignature(body, hmac, integration.webhook_secret)) {
    return { success: false, error: 'Invalid webhook signature' }
  }

  // Check idempotency
  if (await isWebhookProcessed(integration.id, webhookId)) {
    // Already processed, return success
    return { success: true }
  }

  // Record event
  try {
    await recordWebhookEvent(integration.id, webhookId, topic, shopDomain, body)
  } catch (error) {
    console.error('Failed to record webhook:', error)
  }

  // Parse payload
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    await markWebhookProcessed(integration.id, webhookId, 'failed', 'Invalid JSON')
    return { success: false, error: 'Invalid JSON payload' }
  }

  // Route to handler
  try {
    await routeWebhook(topic, payload, integration)
    await markWebhookProcessed(integration.id, webhookId, 'processed')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await markWebhookProcessed(integration.id, webhookId, 'failed', errorMessage)
    console.error(`Webhook processing error for ${topic}:`, error)
    return { success: false, error: errorMessage }
  }
}

// =============================================================================
// Event Router
// =============================================================================

/**
 * Route webhook to appropriate handler
 */
async function routeWebhook(
  topic: ShopifyWebhookTopic,
  payload: unknown,
  integration: ShopifyIntegration
): Promise<void> {
  switch (topic) {
    case 'orders/create':
      await handleOrderCreate(payload as ShopifyOrderWebhookPayload, integration)
      break

    case 'orders/updated':
      await handleOrderUpdate(payload as ShopifyOrderWebhookPayload, integration)
      break

    case 'orders/cancelled':
      await handleOrderCancelled(payload as ShopifyOrderWebhookPayload, integration)
      break

    case 'fulfillments/create':
    case 'fulfillments/update':
      await handleFulfillment(payload as ShopifyFulfillmentWebhookPayload, integration)
      break

    case 'checkouts/create':
    case 'checkouts/update':
      await handleCheckout(payload as ShopifyCheckoutWebhookPayload, integration)
      break

    case 'products/create':
    case 'products/update':
      await handleProductUpdate(payload as ShopifyProductWebhookPayload, integration)
      break

    case 'products/delete':
      await handleProductDelete(payload as { id: number }, integration)
      break

    case 'app/uninstalled':
      await handleAppUninstalled(integration)
      break

    default:
      console.log(`Unhandled webhook topic: ${topic}`)
  }
}

// =============================================================================
// Order Handlers
// =============================================================================

async function handleOrderCreate(
  payload: ShopifyOrderWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Find or create contact
  const contactId = await findOrCreateContact(
    integration.organization_id,
    payload.customer?.phone || payload.phone,
    payload.customer?.email || payload.email,
    payload.customer
  )

  // Create order record
  const { error } = await supabase.from('shopify_orders').upsert(
    {
      shopify_integration_id: integration.id,
      organization_id: integration.organization_id,
      shopify_order_id: String(payload.id),
      order_number: payload.name.replace('#', ''),
      customer_email: payload.email,
      customer_phone: payload.phone,
      customer_name: payload.customer
        ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim()
        : null,
      shopify_customer_id: payload.customer ? String(payload.customer.id) : null,
      total_price: parseFloat(payload.current_total_price),
      subtotal_price: parseFloat(payload.current_subtotal_price),
      total_tax: parseFloat(payload.current_total_tax),
      currency: payload.currency,
      financial_status: payload.financial_status,
      fulfillment_status: payload.fulfillment_status,
      order_status: 'open',
      line_items: payload.line_items.map((item) => ({
        id: String(item.id),
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        product_id: item.product_id ? String(item.product_id) : null,
        variant_id: item.variant_id ? String(item.variant_id) : null,
        fulfillment_status: item.fulfillment_status,
      })),
      shipping_address: payload.shipping_address,
      billing_address: payload.billing_address,
      note: payload.note,
      tags: payload.tags ? payload.tags.split(',').map((t) => t.trim()) : [],
      shopify_created_at: payload.created_at,
      shopify_updated_at: payload.updated_at,
      contact_id: contactId,
    },
    {
      onConflict: 'shopify_integration_id,shopify_order_id',
    }
  )

  if (error) {
    console.error('Failed to create order:', error)
    throw error
  }

  // Mark any matching abandoned cart as converted
  if (payload.email || payload.phone) {
    await supabase
      .from('shopify_carts')
      .update({
        converted_at: new Date().toISOString(),
        shopify_order_id: String(payload.id),
        recovery_status: 'converted',
      })
      .eq('shopify_integration_id', integration.id)
      .or(`customer_email.eq.${payload.email},customer_phone.eq.${payload.phone}`)
      .is('converted_at', null)
  }

  console.log(`Order created: ${payload.name}`)
}

async function handleOrderUpdate(
  payload: ShopifyOrderWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('shopify_orders')
    .update({
      financial_status: payload.financial_status,
      fulfillment_status: payload.fulfillment_status,
      order_status: payload.cancelled_at ? 'cancelled' : payload.closed_at ? 'closed' : 'open',
      cancelled_at: payload.cancelled_at,
      closed_at: payload.closed_at,
      shopify_updated_at: payload.updated_at,
      note: payload.note,
      tags: payload.tags ? payload.tags.split(',').map((t) => t.trim()) : [],
    })
    .eq('shopify_integration_id', integration.id)
    .eq('shopify_order_id', String(payload.id))

  console.log(`Order updated: ${payload.name}`)
}

async function handleOrderCancelled(
  payload: ShopifyOrderWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('shopify_orders')
    .update({
      order_status: 'cancelled',
      cancelled_at: payload.cancelled_at,
      shopify_updated_at: payload.updated_at,
    })
    .eq('shopify_integration_id', integration.id)
    .eq('shopify_order_id', String(payload.id))

  console.log(`Order cancelled: ${payload.name}`)
}

// =============================================================================
// Fulfillment Handlers
// =============================================================================

async function handleFulfillment(
  payload: ShopifyFulfillmentWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Find the order
  const { data: order } = await supabase
    .from('shopify_orders')
    .select('id')
    .eq('shopify_integration_id', integration.id)
    .eq('shopify_order_id', String(payload.order_id))
    .single()

  if (!order) {
    console.warn(`Order not found for fulfillment: ${payload.order_id}`)
    return
  }

  // Upsert fulfillment
  await supabase.from('shopify_fulfillments').upsert(
    {
      shopify_order_id: order.id,
      shopify_fulfillment_id: String(payload.id),
      status: payload.status,
      tracking_company: payload.tracking_company,
      tracking_number: payload.tracking_number,
      tracking_url: payload.tracking_url,
      tracking_numbers: payload.tracking_numbers || [],
      line_items: payload.line_items.map((item) => ({
        id: String(item.id),
        title: item.title,
        quantity: item.quantity,
      })),
      shipment_status: payload.shipment_status,
      shopify_created_at: payload.created_at,
      shopify_updated_at: payload.updated_at,
    },
    {
      onConflict: 'shopify_order_id,shopify_fulfillment_id',
    }
  )

  console.log(`Fulfillment processed: ${payload.id}`)
}

// =============================================================================
// Checkout/Cart Handlers
// =============================================================================

async function handleCheckout(
  payload: ShopifyCheckoutWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase.from('shopify_carts').upsert(
    {
      shopify_integration_id: integration.id,
      organization_id: integration.organization_id,
      shopify_checkout_id: String(payload.id),
      shopify_checkout_token: payload.token,
      customer_email: payload.email,
      customer_phone: payload.phone,
      shopify_customer_id: payload.customer_id ? String(payload.customer_id) : null,
      line_items: payload.line_items.map((item) => ({
        id: String(item.id),
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
      })),
      total_price: parseFloat(payload.total_price),
      subtotal_price: parseFloat(payload.subtotal_price),
      currency: payload.currency,
      checkout_url: payload.abandoned_checkout_url,
      shopify_created_at: payload.created_at,
      shopify_updated_at: payload.updated_at,
    },
    {
      onConflict: 'shopify_integration_id,shopify_checkout_id',
    }
  )

  console.log(`Checkout tracked: ${payload.id}`)
}

// =============================================================================
// Product Handlers
// =============================================================================

async function handleProductUpdate(
  payload: ShopifyProductWebhookPayload,
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Calculate price range from variants
  const prices = payload.variants.map((v) => parseFloat(v.price))
  const priceRange = {
    min: Math.min(...prices).toFixed(2),
    max: Math.max(...prices).toFixed(2),
    currency: 'EUR', // Get from shop settings in production
  }

  await supabase.from('shopify_products').upsert(
    {
      shopify_integration_id: integration.id,
      organization_id: integration.organization_id,
      shopify_product_id: String(payload.id),
      title: payload.title,
      description: payload.body_html,
      product_type: payload.product_type,
      handle: payload.handle,
      status: payload.status as 'active' | 'archived' | 'draft',
      vendor: payload.vendor,
      tags: payload.tags ? payload.tags.split(',').map((t) => t.trim()) : [],
      images: payload.images.map((img) => ({
        id: String(img.id),
        src: img.src,
        alt: img.alt,
        position: img.position,
        width: img.width,
        height: img.height,
      })),
      variants: payload.variants.map((v) => ({
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
      shopify_updated_at: payload.updated_at,
    },
    {
      onConflict: 'shopify_integration_id,shopify_product_id',
    }
  )

  console.log(`Product updated: ${payload.title}`)
}

async function handleProductDelete(
  payload: { id: number },
  integration: ShopifyIntegration
): Promise<void> {
  const supabase = createServiceRoleClient()

  await supabase
    .from('shopify_products')
    .delete()
    .eq('shopify_integration_id', integration.id)
    .eq('shopify_product_id', String(payload.id))

  console.log(`Product deleted: ${payload.id}`)
}

// =============================================================================
// App Lifecycle Handlers
// =============================================================================

async function handleAppUninstalled(integration: ShopifyIntegration): Promise<void> {
  const supabase = createServiceRoleClient()

  // Mark integration as inactive
  await supabase
    .from('shopify_integrations')
    .update({ is_active: false })
    .eq('id', integration.id)

  console.log(`App uninstalled for shop: ${integration.shop_domain}`)
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find or create a contact from customer data
 */
async function findOrCreateContact(
  organizationId: string,
  phone: string | null | undefined,
  email: string | null | undefined,
  customer: { first_name?: string | null; last_name?: string | null } | null
): Promise<string | null> {
  if (!phone && !email) return null

  const supabase = createServiceRoleClient()

  // Try to find existing contact by phone
  if (phone) {
    const { data: existingByPhone } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('phone_number', phone)
      .single()

    if (existingByPhone) return existingByPhone.id
  }

  // Try to find by email
  if (email) {
    const { data: existingByEmail } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .single()

    if (existingByEmail) return existingByEmail.id
  }

  // Create new contact if we have a phone number
  if (phone) {
    const name = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : null

    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        organization_id: organizationId,
        phone_number: phone,
        email: email || null,
        name: name || null,
        source: 'shopify',
      })
      .select('id')
      .single()

    return newContact?.id || null
  }

  return null
}
