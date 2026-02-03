// Phase 12: Shopify Integration
// TypeScript types for the Shopify e-commerce integration

/**
 * Shopify integration connection stored in database
 */
export interface ShopifyIntegration {
  id: string
  organization_id: string
  shop_domain: string
  access_token_hash: string
  scopes: string[]
  api_version: string
  is_active: boolean
  webhook_secret: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Shopify webhook subscription
 */
export interface ShopifyWebhookSubscription {
  id: string
  shopify_integration_id: string
  webhook_topic: ShopifyWebhookTopic
  shopify_webhook_id: string
  callback_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Supported webhook topics
 */
export type ShopifyWebhookTopic =
  | 'orders/create'
  | 'orders/updated'
  | 'orders/cancelled'
  | 'orders/fulfilled'
  | 'orders/paid'
  | 'fulfillments/create'
  | 'fulfillments/update'
  | 'checkouts/create'
  | 'checkouts/update'
  | 'products/create'
  | 'products/update'
  | 'products/delete'
  | 'app/uninstalled'

/**
 * Product from Shopify catalog
 */
export interface ShopifyProduct {
  id: string
  shopify_integration_id: string
  organization_id: string
  shopify_product_id: string
  title: string
  description: string | null
  product_type: string | null
  handle: string | null
  status: 'active' | 'archived' | 'draft'
  vendor: string | null
  tags: string[]
  images: ShopifyProductImage[]
  variants: ShopifyProductVariant[]
  price_range: ShopifyPriceRange | null
  synced_at: string
  shopify_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ShopifyProductImage {
  id: string
  src: string
  alt: string | null
  position: number
  width?: number
  height?: number
}

export interface ShopifyProductVariant {
  id: string
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
}

export interface ShopifyPriceRange {
  min: string
  max: string
  currency: string
}

/**
 * Order from Shopify
 */
export interface ShopifyOrder {
  id: string
  shopify_integration_id: string
  organization_id: string
  shopify_order_id: string
  order_number: string

  // Customer
  customer_email: string | null
  customer_phone: string | null
  customer_name: string | null
  shopify_customer_id: string | null

  // Pricing
  total_price: number
  subtotal_price: number | null
  total_tax: number | null
  total_shipping: number | null
  currency: string

  // Status
  financial_status: ShopifyFinancialStatus | null
  fulfillment_status: ShopifyFulfillmentStatus | null
  order_status: 'open' | 'closed' | 'cancelled'

  // Details
  line_items: ShopifyLineItem[]
  shipping_address: ShopifyAddress | null
  billing_address: ShopifyAddress | null
  note: string | null
  tags: string[]

  // Timestamps
  shopify_created_at: string | null
  shopify_updated_at: string | null
  cancelled_at: string | null
  closed_at: string | null

  // ADSapp linking
  contact_id: string | null
  conversation_id: string | null

  synced_at: string
  created_at: string
  updated_at: string
}

export type ShopifyFinancialStatus =
  | 'pending'
  | 'authorized'
  | 'partially_paid'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'voided'

export type ShopifyFulfillmentStatus =
  | 'unfulfilled'
  | 'partial'
  | 'fulfilled'
  | 'restocked'
  | null

export interface ShopifyLineItem {
  id: string
  title: string
  variant_title: string | null
  quantity: number
  price: string
  sku: string | null
  product_id: string | null
  variant_id: string | null
  fulfillment_status: string | null
  image_url: string | null
}

export interface ShopifyAddress {
  first_name: string | null
  last_name: string | null
  company: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  province_code: string | null
  country: string | null
  country_code: string | null
  zip: string | null
  phone: string | null
}

/**
 * Fulfillment tracking
 */
export interface ShopifyFulfillment {
  id: string
  shopify_order_id: string
  shopify_fulfillment_id: string
  status: ShopifyFulfillmentTrackingStatus
  tracking_company: string | null
  tracking_number: string | null
  tracking_url: string | null
  tracking_numbers: string[]
  line_items: ShopifyLineItem[]
  shipment_status: ShopifyShipmentStatus | null
  estimated_delivery_at: string | null
  delivered_at: string | null
  shopify_created_at: string | null
  shopify_updated_at: string | null
  created_at: string
  updated_at: string
}

export type ShopifyFulfillmentTrackingStatus =
  | 'pending'
  | 'open'
  | 'success'
  | 'cancelled'
  | 'error'
  | 'failure'

export type ShopifyShipmentStatus =
  | 'label_printed'
  | 'label_purchased'
  | 'attempted_delivery'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'confirmed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failure'

/**
 * Abandoned cart for recovery
 */
export interface ShopifyCart {
  id: string
  shopify_integration_id: string
  organization_id: string
  shopify_checkout_id: string
  shopify_checkout_token: string | null

  // Customer
  customer_email: string | null
  customer_phone: string | null
  shopify_customer_id: string | null

  // Cart contents
  line_items: ShopifyLineItem[]
  total_price: number | null
  subtotal_price: number | null
  currency: string

  // Recovery
  checkout_url: string | null
  abandoned_at: string | null
  converted_at: string | null
  shopify_order_id: string | null

  // Recovery status
  recovery_status: 'pending' | 'sent' | 'converted' | 'expired'
  recovery_message_sent_at: string | null
  recovery_attempts: number
  last_recovery_attempt_at: string | null

  // Timestamps
  shopify_created_at: string | null
  shopify_updated_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Webhook event for idempotency tracking
 */
export interface ShopifyWebhookEvent {
  id: string
  shopify_integration_id: string
  webhook_id: string
  topic: string
  shop_domain: string
  payload_hash: string | null
  processed_at: string | null
  status: 'pending' | 'processed' | 'failed'
  error_message: string | null
  retry_count: number
  created_at: string
}

/**
 * Organization Shopify settings
 */
export interface ShopifySettings {
  id: string
  organization_id: string

  // Order notifications
  order_confirmation_enabled: boolean
  order_confirmation_template_id: string | null
  shipping_notification_enabled: boolean
  shipping_notification_template_id: string | null
  delivery_notification_enabled: boolean
  delivery_notification_template_id: string | null

  // Cart recovery
  cart_recovery_enabled: boolean
  cart_recovery_delay_hours: number
  cart_recovery_template_id: string | null
  cart_recovery_max_attempts: number

  // Sync settings
  auto_sync_products: boolean
  sync_interval_hours: number

  created_at: string
  updated_at: string
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * OAuth initiation request
 */
export interface ShopifyOAuthInitRequest {
  shop_domain: string
  redirect_uri?: string
}

/**
 * OAuth callback parameters
 */
export interface ShopifyOAuthCallback {
  code: string
  shop: string
  state: string
  hmac: string
  timestamp: string
}

/**
 * Connect Shopify response
 */
export interface ShopifyConnectResponse {
  success: boolean
  integration_id?: string
  shop_domain?: string
  error?: string
}

/**
 * Product sync request
 */
export interface ShopifySyncProductsRequest {
  integration_id: string
  full_sync?: boolean
}

/**
 * Product sync response
 */
export interface ShopifySyncProductsResponse {
  success: boolean
  products_synced: number
  products_updated: number
  products_deleted: number
  errors?: string[]
}

/**
 * Order with expanded details for UI
 */
export interface ShopifyOrderWithDetails extends ShopifyOrder {
  fulfillments?: ShopifyFulfillment[]
  integration?: Pick<ShopifyIntegration, 'shop_domain'>
  contact?: {
    id: string
    name: string | null
    phone_number: string
  }
}

/**
 * Cart recovery message request
 */
export interface CartRecoveryRequest {
  cart_id: string
  template_id?: string
  custom_message?: string
}

/**
 * Cart recovery stats
 */
export interface CartRecoveryStats {
  total_abandoned: number
  recovery_sent: number
  recovered: number
  recovery_rate: number
  revenue_recovered: number
}

// =============================================================================
// Webhook Payload Types (from Shopify)
// =============================================================================

/**
 * Shopify webhook headers
 */
export interface ShopifyWebhookHeaders {
  'x-shopify-topic': string
  'x-shopify-hmac-sha256': string
  'x-shopify-shop-domain': string
  'x-shopify-webhook-id': string
  'x-shopify-api-version': string
}

/**
 * Order webhook payload (simplified)
 */
export interface ShopifyOrderWebhookPayload {
  id: number
  admin_graphql_api_id: string
  name: string // Order number like "#1001"
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
  closed_at: string | null
  currency: string
  current_subtotal_price: string
  current_total_price: string
  current_total_tax: string
  financial_status: string
  fulfillment_status: string | null
  customer: ShopifyCustomerPayload | null
  line_items: ShopifyLineItemPayload[]
  shipping_address: ShopifyAddressPayload | null
  billing_address: ShopifyAddressPayload | null
  note: string | null
  tags: string
}

export interface ShopifyCustomerPayload {
  id: number
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
}

export interface ShopifyLineItemPayload {
  id: number
  title: string
  variant_title: string | null
  quantity: number
  price: string
  sku: string | null
  product_id: number | null
  variant_id: number | null
  fulfillment_status: string | null
}

export interface ShopifyAddressPayload {
  first_name: string | null
  last_name: string | null
  company: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  province_code: string | null
  country: string | null
  country_code: string | null
  zip: string | null
  phone: string | null
}

/**
 * Fulfillment webhook payload
 */
export interface ShopifyFulfillmentWebhookPayload {
  id: number
  order_id: number
  status: string
  created_at: string
  updated_at: string
  tracking_company: string | null
  tracking_number: string | null
  tracking_url: string | null
  tracking_numbers: string[]
  shipment_status: string | null
  line_items: ShopifyLineItemPayload[]
}

/**
 * Checkout/cart webhook payload
 */
export interface ShopifyCheckoutWebhookPayload {
  id: number
  token: string
  cart_token: string | null
  email: string | null
  phone: string | null
  customer_id: number | null
  created_at: string
  updated_at: string
  abandoned_checkout_url: string
  currency: string
  subtotal_price: string
  total_price: string
  line_items: ShopifyLineItemPayload[]
}

/**
 * Product webhook payload
 */
export interface ShopifyProductWebhookPayload {
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
}
