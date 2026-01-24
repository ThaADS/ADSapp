/**
 * WhatsApp Catalog Types
 *
 * TypeScript types for WhatsApp product catalog feature including:
 * - Catalog configuration and sync status
 * - Cached product data
 * - Product message tracking
 * - Cart/order handling
 * - Meta API response types
 */

// =====================================================
// ENUMS AND STATUS TYPES
// =====================================================

/** Catalog sync status values */
export type CatalogSyncStatus = 'pending' | 'syncing' | 'success' | 'error'

/** Product availability status from Meta Commerce Manager */
export type ProductAvailability = 'in stock' | 'out of stock' | 'preorder' | 'available for order'

/** Product message type for WhatsApp */
export type ProductMessageType = 'single' | 'multi' | 'catalog'

// =====================================================
// DATABASE ENTITY TYPES
// =====================================================

/**
 * WhatsApp Catalog configuration
 * Stored in whatsapp_catalogs table
 */
export interface WhatsAppCatalog {
  id: string
  organization_id: string
  catalog_id: string
  catalog_name: string | null
  last_sync_at: string | null
  sync_status: CatalogSyncStatus
  sync_error: string | null
  product_count: number
  is_enabled: boolean
  auto_sync_enabled: boolean
  auto_sync_interval_hours: number
  created_at: string
  updated_at: string
}

/**
 * WhatsApp Product cached from Meta Commerce Manager
 * Stored in whatsapp_products table
 */
export interface WhatsAppProduct {
  id: string
  organization_id: string
  catalog_id: string
  meta_product_id: string
  retailer_id: string // SKU used in WhatsApp messages
  name: string
  description: string | null
  price_amount: number | null // In smallest currency unit (cents)
  price_currency: string
  availability: ProductAvailability
  image_url: string | null
  product_url: string | null
  brand: string | null
  category: string | null
  raw_data: Record<string, unknown> | null
  is_active: boolean
  synced_at: string
  created_at: string
  updated_at: string
}

/**
 * WhatsApp Product Message tracking
 * Stored in whatsapp_product_messages table
 */
export interface WhatsAppProductMessage {
  id: string
  organization_id: string
  conversation_id: string
  message_id: string | null
  message_type: ProductMessageType
  product_ids: string[]
  retailer_ids: string[]
  catalog_id: string
  header_text: string | null
  body_text: string | null
  footer_text: string | null
  sections: ProductSection[] | null
  sent_at: string
  delivered_at: string | null
  read_at: string | null
  cart_received: boolean
  cart_received_at: string | null
  cart_data: CartData | null
  created_at: string
}

// =====================================================
// PRODUCT MESSAGE STRUCTURE TYPES
// =====================================================

/**
 * Section for multi-product messages
 * Up to 10 sections allowed per message
 */
export interface ProductSection {
  title: string
  product_items: ProductItem[]
}

/**
 * Product item within a section
 */
export interface ProductItem {
  product_retailer_id: string
}

/**
 * Cart data received from customer order
 */
export interface CartData {
  catalog_id: string
  product_items: CartItem[]
  text?: string
}

/**
 * Individual item in customer cart
 */
export interface CartItem {
  product_retailer_id: string
  quantity: number
  item_price: number
  currency: string
}

// =====================================================
// API REQUEST TYPES
// =====================================================

/**
 * Request to configure catalog for organization
 */
export interface CatalogConfigRequest {
  catalog_id: string
  catalog_name?: string
}

/**
 * Request to send a single product message
 */
export interface SendProductMessageRequest {
  conversation_id: string
  product_retailer_id: string
  body_text?: string
  footer_text?: string
}

/**
 * Request to send a multi-product message
 */
export interface SendProductListMessageRequest {
  conversation_id: string
  header_text: string
  body_text: string
  footer_text?: string
  sections: {
    title: string
    product_retailer_ids: string[]
  }[]
}

/**
 * Request to send a catalog storefront message
 */
export interface SendCatalogMessageRequest {
  conversation_id: string
  body_text: string
  footer_text?: string
  thumbnail_product_retailer_id?: string
}

/**
 * Query parameters for product list
 */
export interface ProductsListQuery {
  search?: string
  availability?: ProductAvailability
  limit?: number
  offset?: number
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * Response from catalog sync operation
 */
export interface CatalogSyncResponse {
  success: boolean
  products_synced: number
  errors?: string[]
}

/**
 * Response from products list endpoint
 */
export interface ProductsListResponse {
  products: WhatsAppProduct[]
  total: number
  hasMore: boolean
}

/**
 * Response from send product message endpoint
 */
export interface SendProductMessageResponse {
  success: boolean
  message_id: string
  product_message_id: string
}

/**
 * Analytics data from get_product_message_analytics function
 */
export interface ProductMessageAnalytics {
  total_messages: number
  single_product_messages: number
  multi_product_messages: number
  catalog_messages: number
  total_products_sent: number
  carts_received: number
  delivery_rate: number
  read_rate: number
}

// =====================================================
// META API TYPES
// =====================================================

/**
 * Product from Meta Graph API catalog endpoint
 */
export interface MetaCatalogProduct {
  id: string
  retailer_id: string
  name: string
  description?: string
  price: string // Price in cents as string
  currency: string
  availability: string
  image_url?: string
  url?: string
  brand?: string
  category?: string
}

/**
 * Response from Meta Graph API catalog products endpoint
 */
export interface MetaCatalogProductsResponse {
  data: MetaCatalogProduct[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
}

/**
 * Response from Meta Graph API owned catalogs endpoint
 */
export interface MetaOwnedCatalogsResponse {
  data: {
    id: string
    name: string
  }[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
  }
}

// =====================================================
// WHATSAPP MESSAGE PAYLOAD TYPES
// =====================================================

/**
 * WhatsApp API single product message payload
 */
export interface WhatsAppSingleProductPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'interactive'
  interactive: {
    type: 'product'
    body?: {
      text: string // Max 1024 chars
    }
    footer?: {
      text: string // Max 60 chars
    }
    action: {
      catalog_id: string
      product_retailer_id: string
    }
  }
}

/**
 * WhatsApp API multi-product message payload
 */
export interface WhatsAppMultiProductPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'interactive'
  interactive: {
    type: 'product_list'
    header: {
      type: 'text'
      text: string
    }
    body: {
      text: string
    }
    footer?: {
      text: string
    }
    action: {
      catalog_id: string
      sections: {
        title: string
        product_items: {
          product_retailer_id: string
        }[]
      }[] // Max 10 sections, max 30 products total
    }
  }
}

/**
 * WhatsApp API catalog storefront message payload
 */
export interface WhatsAppCatalogMessagePayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'interactive'
  interactive: {
    type: 'catalog_message'
    body: {
      text: string
    }
    footer?: {
      text: string
    }
    action: {
      name: 'catalog_message'
      parameters?: {
        thumbnail_product_retailer_id?: string
      }
    }
  }
}

/**
 * Union type for all product message payloads
 */
export type WhatsAppProductMessagePayload =
  | WhatsAppSingleProductPayload
  | WhatsAppMultiProductPayload
  | WhatsAppCatalogMessagePayload

// =====================================================
// WEBHOOK TYPES
// =====================================================

/**
 * Order webhook payload from WhatsApp
 * Received when customer sends their cart
 */
export interface WhatsAppOrderWebhook {
  catalog_id: string
  product_items: {
    product_retailer_id: string
    quantity: number
    item_price: number
    currency: string
  }[]
  text?: string
}

// =====================================================
// UI COMPONENT TYPES
// =====================================================

/**
 * Product picker mode
 */
export type ProductPickerMode = 'single' | 'multi'

/**
 * Product picker props
 */
export interface ProductPickerProps {
  mode: ProductPickerMode
  onSelect: (products: WhatsAppProduct[]) => void
  onCancel: () => void
  selectedProducts?: WhatsAppProduct[]
  maxProducts?: number // Default 30 for multi-product
}

/**
 * Product card props
 */
export interface ProductCardProps {
  product: WhatsAppProduct
  selected: boolean
  selectionMode: ProductPickerMode
  onToggle: () => void
}

/**
 * Formatted price display
 */
export interface FormattedPrice {
  amount: string
  currency: string
  formatted: string
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Create type for WhatsAppCatalog (insert)
 */
export type CreateWhatsAppCatalog = Omit<
  WhatsAppCatalog,
  'id' | 'created_at' | 'updated_at' | 'last_sync_at' | 'sync_error' | 'product_count'
> & {
  sync_status?: CatalogSyncStatus
}

/**
 * Update type for WhatsAppCatalog
 */
export type UpdateWhatsAppCatalog = Partial<
  Omit<WhatsAppCatalog, 'id' | 'organization_id' | 'created_at'>
>

/**
 * Create type for WhatsAppProduct (insert)
 */
export type CreateWhatsAppProduct = Omit<
  WhatsAppProduct,
  'id' | 'created_at' | 'updated_at' | 'synced_at'
>

/**
 * Update type for WhatsAppProduct
 */
export type UpdateWhatsAppProduct = Partial<
  Omit<WhatsAppProduct, 'id' | 'organization_id' | 'catalog_id' | 'created_at'>
>

/**
 * Create type for WhatsAppProductMessage (insert)
 */
export type CreateWhatsAppProductMessage = Omit<
  WhatsAppProductMessage,
  'id' | 'created_at' | 'delivered_at' | 'read_at' | 'cart_received_at'
>

// =====================================================
// CONSTANTS
// =====================================================

/** Maximum products allowed in a multi-product message */
export const MAX_PRODUCTS_PER_MESSAGE = 30

/** Maximum sections allowed in a multi-product message */
export const MAX_SECTIONS_PER_MESSAGE = 10

/** Maximum body text length for product messages */
export const MAX_BODY_TEXT_LENGTH = 1024

/** Maximum footer text length for product messages */
export const MAX_FOOTER_TEXT_LENGTH = 60

/** Maximum quantity per cart item */
export const MAX_CART_ITEM_QUANTITY = 99

/** Default sync interval in hours */
export const DEFAULT_SYNC_INTERVAL_HOURS = 24
