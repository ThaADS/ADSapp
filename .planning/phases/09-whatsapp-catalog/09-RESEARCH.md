# Phase 9: WhatsApp Catalog - Research Document

**Created:** 2026-01-24
**Phase Goal:** Enable e-commerce product catalog sync and product messaging through WhatsApp

## Requirements Summary

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| CAT-01 | Organization can sync product catalog to WhatsApp | Catalog appears in UI after sync, products show name/price/image |
| CAT-02 | User can send single product messages | Product picker in composer, message renders as interactive product card |
| CAT-03 | User can send multi-product messages (up to 30 items) | Multi-select up to 30, sends as product list message type |
| CAT-06 | Catalog status and sync errors are visible | Settings page shows last sync time, sync button, error messages |

---

## Part 1: Existing Architecture Analysis

### Current WhatsApp Infrastructure

#### 1. WhatsApp Client Classes

**Location:** `src/lib/whatsapp/`

| File | Purpose |
|------|---------|
| `client.ts` | Basic WhatsApp client with send/receive methods |
| `enhanced-client.ts` | Extended client with media handling, templates, business profile |

**EnhancedWhatsAppClient Methods:**
- `sendMessage(phoneNumberId, to, message)` - Generic message sending
- `downloadMedia(mediaId)` - Download media files
- `uploadMedia(file, type, filename)` - Upload media to WhatsApp
- `markAsRead(phoneNumberId, messageId)` - Mark messages as read
- `getBusinessProfile(phoneNumberId)` - Get business profile info
- `createTemplate(businessAccountId, template)` - Create message templates
- `getTemplates(businessAccountId)` - List message templates
- `deleteTemplate(businessAccountId, templateName)` - Delete template

**Factory Function:**
```typescript
getWhatsAppClient(organizationId): Promise<EnhancedWhatsAppClient>
```
- Retrieves encrypted credentials from `organizations` table
- Decrypts using `decryptWhatsAppCredentials()`
- Returns configured client instance

#### 2. Channel Abstraction Layer (Phase 8)

**Location:** `src/lib/channels/`

| File | Purpose |
|------|---------|
| `router.ts` | UnifiedMessageRouter for all channels |
| `health.ts` | Channel health monitoring |
| `adapters/base.ts` | BaseChannelAdapter abstract class |
| `adapters/whatsapp.ts` | WhatsAppAdapter implementing ChannelAdapter |

**WhatsAppAdapter Features:**
- Implements `ChannelAdapter` interface
- Supports: `RICH_CONTENT`, `MEDIA`, `READ_RECEIPTS`, `LOCATION_SHARING`, `CONTACT_CARDS`, `REACTIONS`
- Converts between WhatsApp format and CanonicalMessage format
- Static factory: `WhatsAppAdapter.createForOrganization(organizationId)`

**Supported Content Types:**
- Text messages
- Media messages (image, video, audio, document)
- Interactive messages (buttons, lists)
- Location sharing
- Contact cards

#### 3. Existing Interactive Message Support

The WhatsAppAdapter already supports rich content types via `convertRichContentToWhatsApp()`:

```typescript
// Button messages
{
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { text: bodyText },
    action: { buttons: [...] }
  }
}

// List messages
{
  type: 'interactive',
  interactive: {
    type: 'list',
    body: { text: bodyText },
    action: { button: 'Select', sections: [...] }
  }
}
```

This same pattern will be extended for product messages.

#### 4. Organization Credentials Storage

WhatsApp credentials are stored in the `organizations` table:
- `whatsapp_access_token` (encrypted)
- `whatsapp_phone_number_id`
- `whatsapp_business_account_id`
- `whatsapp_webhook_verify_token` (encrypted)

---

## Part 2: WhatsApp Business API Catalog Research

### API Overview

WhatsApp Business Cloud API supports catalog messaging through the Graph API. Products are managed in Meta Commerce Manager and linked to WhatsApp Business Account (WABA).

**Key Constraints:**
- Only 1 catalog can be linked to a WABA
- Catalogs are managed in Meta Commerce Manager, not via API
- Product messages are interactive messages (session-based, no approval needed)
- Can only send within 24-hour conversation window

### Sources

- [360Dialog - Products & Catalogs](https://docs.360dialog.com/docs/waba-messaging/products-and-catalogs)
- [360Dialog - Single & Multi-Product Messages](https://docs.360dialog.com/docs/waba-messaging/interactive-messages/single-and-multi-product-messages)
- [WhatsApp Node.js SDK - Interactive Messages](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/interactive/)
- [Gupshup - WhatsApp Interactive Messages](https://support.gupshup.io/hc/en-us/articles/4413103335705-WhatsApp-Interactive-Single-Multi-Product-Messages)
- [Interakt - Product Catalog WhatsApp API](https://www.interakt.shop/whatsapp-business-api/product-catalog-whatsapp-api/)
- [Flexify - Meta Catalog Fields](https://www.flexify.net/meta-catalog-docs)

### Single Product Message (SPM)

Displays one product from the catalog in a Product Detail Page (PDP) format.

**API Endpoint:** `POST /{phone_number_id}/messages`

**Request Format:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{recipient_phone}}",
  "type": "interactive",
  "interactive": {
    "type": "product",
    "body": {
      "text": "Check out this product!"
    },
    "footer": {
      "text": "Reply to order"
    },
    "action": {
      "catalog_id": "{{catalog_id}}",
      "product_retailer_id": "{{product_sku}}"
    }
  }
}
```

**TypeScript Interface:**
```typescript
interface SingleProductMessage {
  type: "product"
  body?: {
    text: string  // Max 1024 chars
  }
  footer?: {
    text: string  // Max 60 chars
  }
  action: {
    catalog_id: string
    product_retailer_id: string  // SKU/Content ID
  }
}
```

### Multi-Product Message (MPM)

Displays up to 30 products organized in sections.

**Request Format:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{recipient_phone}}",
  "type": "interactive",
  "interactive": {
    "type": "product_list",
    "header": {
      "type": "text",
      "text": "Our Products"
    },
    "body": {
      "text": "Browse our selection"
    },
    "footer": {
      "text": "Tap to view details"
    },
    "action": {
      "catalog_id": "{{catalog_id}}",
      "sections": [
        {
          "title": "Popular Items",
          "product_items": [
            { "product_retailer_id": "SKU-001" },
            { "product_retailer_id": "SKU-002" },
            { "product_retailer_id": "SKU-003" }
          ]
        },
        {
          "title": "New Arrivals",
          "product_items": [
            { "product_retailer_id": "SKU-004" },
            { "product_retailer_id": "SKU-005" }
          ]
        }
      ]
    }
  }
}
```

**TypeScript Interface:**
```typescript
interface MultiProductMessage {
  type: "product_list"
  header: {
    type: "text"
    text: string  // Required for product_list
  }
  body: {
    text: string
  }
  footer: {
    text: string
  }
  action: {
    catalog_id: string
    sections: ProductSection[]  // Max 10 sections
  }
}

interface ProductSection {
  title: string
  product_items: ProductItem[]
}

interface ProductItem {
  product_retailer_id: string  // Max 30 items total
}
```

### Catalog Message (Storefront)

Displays button that opens full catalog storefront.

**Request Format:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{recipient_phone}}",
  "type": "interactive",
  "interactive": {
    "type": "catalog_message",
    "body": {
      "text": "Browse our full catalog"
    },
    "footer": {
      "text": "Tap the button below"
    },
    "action": {
      "name": "catalog_message",
      "parameters": {
        "thumbnail_product_retailer_id": "SKU-001"
      }
    }
  }
}
```

**Note:** Catalog messages are NOT available in India.

### Getting Catalog ID

The catalog ID must be obtained from Meta Commerce Manager:
1. Go to Commerce Manager (business.facebook.com/commerce)
2. Select your catalog
3. Catalog ID is in the URL: `commerce/catalogs/{catalog_id}`

Alternatively, via Graph API:
```
GET /{business_id}/owned_product_catalogs
```

### Getting Products from Catalog

**Endpoint:** `GET /{catalog_id}/products`

**Query Parameters:**
- `fields`: `id,name,description,price,currency,image_url,url,retailer_id,availability`
- `limit`: Number of products to return (pagination)
- `after`/`before`: Pagination cursors

**Response:**
```json
{
  "data": [
    {
      "id": "1234567890",
      "retailer_id": "SKU-001",
      "name": "Product Name",
      "description": "Product description",
      "price": "1999",
      "currency": "USD",
      "availability": "in stock",
      "image_url": "https://example.com/product.jpg",
      "url": "https://example.com/product"
    }
  ],
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    },
    "next": "https://graph.facebook.com/..."
  }
}
```

### Product Fields (Meta Catalog)

Core fields from [Meta Product Catalog Documentation](https://www.flexify.net/meta-catalog-docs):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Auto | Meta product ID |
| `retailer_id` | string | Yes | SKU/Content ID (used in messages) |
| `name` | string | Yes | Product title |
| `description` | string | No | Product description |
| `price` | string | Yes | Price in smallest currency unit (e.g., cents) |
| `currency` | string | Yes | ISO 4217 currency code |
| `availability` | enum | Yes | `in stock`, `out of stock`, `preorder`, etc. |
| `image_url` | string | Yes | Main product image URL |
| `url` | string | No | Product page URL |
| `brand` | string | No | Product brand |
| `condition` | enum | No | `new`, `refurbished`, `used` |
| `category` | string | No | Product category path |

### Customer Actions on Product Messages

Users can:
1. **View products** - See product details in-app
2. **Add to cart** - Add up to 99 units per item
3. **Send cart** - Submit cart to business for checkout

When cart is sent, webhook delivers order details to business for processing.

### Rate Limits and Constraints

| Constraint | Limit |
|------------|-------|
| Products per multi-product message | 30 |
| Sections per multi-product message | 10 |
| Units per cart item | 99 |
| Body text length | 1024 characters |
| Footer text length | 60 characters |
| Catalogs per WABA | 1 |

---

## Part 3: Database Schema Design

### New Tables

#### 1. `whatsapp_catalogs`

Stores catalog configuration and sync status per organization.

```sql
CREATE TABLE whatsapp_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Catalog identification
  catalog_id TEXT NOT NULL,
  catalog_name TEXT,

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error TEXT,
  product_count INTEGER DEFAULT 0,

  -- Settings
  is_enabled BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  auto_sync_interval_hours INTEGER DEFAULT 24,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(organization_id)  -- One catalog per organization
);

-- RLS Policy
ALTER TABLE whatsapp_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's catalog"
  ON whatsapp_catalogs FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their organization's catalog"
  ON whatsapp_catalogs FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Indexes
CREATE INDEX idx_whatsapp_catalogs_org ON whatsapp_catalogs(organization_id);
```

#### 2. `whatsapp_products`

Caches product data from Meta Commerce Manager.

```sql
CREATE TABLE whatsapp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES whatsapp_catalogs(id) ON DELETE CASCADE,

  -- Product identification (from Meta)
  meta_product_id TEXT NOT NULL,
  retailer_id TEXT NOT NULL,  -- SKU used in messages

  -- Product details
  name TEXT NOT NULL,
  description TEXT,
  price_amount INTEGER,  -- In smallest currency unit
  price_currency TEXT DEFAULT 'USD',
  availability TEXT DEFAULT 'in stock',
  image_url TEXT,
  product_url TEXT,
  brand TEXT,
  category TEXT,

  -- Additional metadata
  raw_data JSONB,  -- Store complete API response

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(catalog_id, retailer_id)
);

-- RLS Policy
ALTER TABLE whatsapp_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's products"
  ON whatsapp_products FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage products"
  ON whatsapp_products FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Indexes
CREATE INDEX idx_whatsapp_products_org ON whatsapp_products(organization_id);
CREATE INDEX idx_whatsapp_products_catalog ON whatsapp_products(catalog_id);
CREATE INDEX idx_whatsapp_products_retailer ON whatsapp_products(retailer_id);
CREATE INDEX idx_whatsapp_products_active ON whatsapp_products(is_active) WHERE is_active = true;
CREATE INDEX idx_whatsapp_products_search ON whatsapp_products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

#### 3. `whatsapp_product_messages`

Tracks product messages sent for analytics.

```sql
CREATE TABLE whatsapp_product_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Message type
  message_type TEXT NOT NULL CHECK (message_type IN ('single', 'multi', 'catalog')),

  -- Products included
  product_ids UUID[] NOT NULL,  -- References whatsapp_products.id
  retailer_ids TEXT[] NOT NULL,  -- SKUs for quick reference

  -- Message metadata
  catalog_id TEXT NOT NULL,
  header_text TEXT,
  body_text TEXT,
  footer_text TEXT,
  sections JSONB,  -- For multi-product: [{title, product_ids}]

  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Cart/Order tracking
  cart_received BOOLEAN DEFAULT false,
  cart_received_at TIMESTAMPTZ,
  cart_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy
ALTER TABLE whatsapp_product_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's product messages"
  ON whatsapp_product_messages FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_product_messages_org ON whatsapp_product_messages(organization_id);
CREATE INDEX idx_product_messages_conversation ON whatsapp_product_messages(conversation_id);
CREATE INDEX idx_product_messages_sent ON whatsapp_product_messages(sent_at DESC);
```

---

## Part 4: API Routes Design

### Catalog Management Routes

#### `GET /api/whatsapp/catalog`
Get organization's catalog configuration and status.

**Response:**
```typescript
{
  catalog: {
    id: string
    catalog_id: string
    catalog_name: string | null
    last_sync_at: string | null
    sync_status: 'pending' | 'syncing' | 'success' | 'error'
    sync_error: string | null
    product_count: number
    is_enabled: boolean
  } | null
}
```

#### `POST /api/whatsapp/catalog`
Configure catalog for organization.

**Request:**
```typescript
{
  catalog_id: string  // From Commerce Manager
  catalog_name?: string
}
```

#### `POST /api/whatsapp/catalog/sync`
Trigger catalog product sync.

**Response:**
```typescript
{
  success: boolean
  products_synced: number
  errors?: string[]
}
```

#### `DELETE /api/whatsapp/catalog`
Remove catalog configuration.

### Product Routes

#### `GET /api/whatsapp/products`
List products from cached catalog.

**Query Parameters:**
- `search`: Text search in name/description
- `availability`: Filter by availability status
- `limit`: Number of results (default 50)
- `offset`: Pagination offset

**Response:**
```typescript
{
  products: WhatsAppProduct[]
  total: number
  hasMore: boolean
}
```

#### `GET /api/whatsapp/products/:id`
Get single product details.

### Message Routes

#### `POST /api/whatsapp/messages/product`
Send a single product message.

**Request:**
```typescript
{
  conversation_id: string
  product_retailer_id: string
  body_text?: string
  footer_text?: string
}
```

#### `POST /api/whatsapp/messages/product-list`
Send a multi-product message.

**Request:**
```typescript
{
  conversation_id: string
  header_text: string
  body_text: string
  footer_text?: string
  sections: {
    title: string
    product_retailer_ids: string[]
  }[]
}
```

---

## Part 5: UI Components Design

### 1. ProductPicker Component

**Location:** `src/components/messaging/ProductPicker.tsx`

**Features:**
- Search products by name
- Grid/list view toggle
- Product cards with image, name, price
- Single select mode (for SPM)
- Multi-select mode with section grouping (for MPM)
- Selected products counter (max 30)

**Props:**
```typescript
interface ProductPickerProps {
  mode: 'single' | 'multi'
  onSelect: (products: WhatsAppProduct[]) => void
  onCancel: () => void
  selectedProducts?: WhatsAppProduct[]
  maxProducts?: number  // Default 30
}
```

**State:**
- Products list (from API)
- Search query
- Selected products
- View mode (grid/list)
- Loading/error states

### 2. ProductCard Component

**Location:** `src/components/messaging/ProductCard.tsx`

**Features:**
- Product image with fallback
- Name (truncated)
- Price with currency formatting
- Availability badge
- Selection checkbox/radio

**Props:**
```typescript
interface ProductCardProps {
  product: WhatsAppProduct
  selected: boolean
  selectionMode: 'single' | 'multi'
  onToggle: () => void
}
```

### 3. ProductMessageComposer Component

**Location:** `src/components/messaging/ProductMessageComposer.tsx`

**Features:**
- Message type selector (single/multi/catalog)
- Product picker trigger
- Preview of selected products
- Header/body/footer text inputs
- Section editor (for multi-product)
- Send button with validation

### 4. CatalogSettings Component

**Location:** `src/components/settings/CatalogSettings.tsx`

**Features:**
- Catalog ID input
- Connection status indicator
- Last sync timestamp
- Sync now button
- Error message display
- Auto-sync toggle
- Product count display

---

## Part 6: Integration with Existing Infrastructure

### Extending EnhancedWhatsAppClient

Add new methods to `src/lib/whatsapp/enhanced-client.ts`:

```typescript
// Get products from catalog
async getCatalogProducts(
  catalogId: string,
  limit?: number,
  after?: string
): Promise<CatalogProductsResponse>

// Send single product message
async sendProductMessage(
  phoneNumberId: string,
  to: string,
  catalogId: string,
  productRetailerId: string,
  options?: {
    bodyText?: string
    footerText?: string
  }
): Promise<string>

// Send multi-product message
async sendProductListMessage(
  phoneNumberId: string,
  to: string,
  catalogId: string,
  sections: ProductSection[],
  options: {
    headerText: string
    bodyText: string
    footerText?: string
  }
): Promise<string>
```

### Extending WhatsAppAdapter

Add product message support to rich content handling:

```typescript
// New rich content types
type ProductRichContentType = 'product' | 'product_list' | 'catalog_message'

// Extended RichContent for products
interface ProductRichContent extends RichContent {
  type: 'product'
  payload: {
    catalog_id: string
    product_retailer_id: string
  }
}

interface ProductListRichContent extends RichContent {
  type: 'product_list'
  payload: {
    catalog_id: string
    sections: ProductSection[]
  }
}
```

### Webhook Handling for Cart Orders

When a customer sends their cart, WhatsApp sends an `order` webhook event. This needs to be handled in the existing webhook route:

```typescript
// In webhook handler
if (message.type === 'order') {
  // Extract order details
  const order = {
    catalog_id: message.order.catalog_id,
    product_items: message.order.product_items,
    text: message.order.text
  }

  // Store order in whatsapp_product_messages
  // Create conversation message
  // Notify agent
}
```

---

## Part 7: Implementation Plan

### Plan 09-01: Database Schema and API Foundation
**Deliverables:**
1. Migration for `whatsapp_catalogs`, `whatsapp_products`, `whatsapp_product_messages` tables
2. RLS policies for organization isolation
3. TypeScript types for catalog entities

### Plan 09-02: Catalog Sync Service
**Deliverables:**
1. Extend `EnhancedWhatsAppClient` with catalog methods
2. Create `CatalogSyncService` in `src/lib/whatsapp/catalog-sync.ts`
3. API routes: `/api/whatsapp/catalog`, `/api/whatsapp/catalog/sync`
4. Background job for auto-sync

### Plan 09-03: Product Messaging API
**Deliverables:**
1. Extend `EnhancedWhatsAppClient` with product message methods
2. Extend `WhatsAppAdapter` with product rich content types
3. API routes: `/api/whatsapp/products`, `/api/whatsapp/messages/product`, `/api/whatsapp/messages/product-list`

### Plan 09-04: Product Picker UI
**Deliverables:**
1. `ProductCard` component
2. `ProductPicker` component (single and multi-select modes)
3. `ProductMessageComposer` component
4. Integration with message composer

### Plan 09-05: Catalog Settings UI
**Deliverables:**
1. `CatalogSettings` component
2. Integration with organization settings page
3. Sync status and error display
4. Manual sync trigger

### Plan 09-06: Order/Cart Webhook Handling
**Deliverables:**
1. Extend webhook handler for `order` message type
2. Store cart data in `whatsapp_product_messages`
3. Create conversation message for cart receipt
4. Agent notification for new orders

---

## Part 8: Testing Strategy

### Unit Tests
- `EnhancedWhatsAppClient` catalog methods
- `CatalogSyncService` sync logic
- Product message format generation
- ProductPicker selection logic

### Integration Tests
- API route authentication and authorization
- Database operations with RLS
- Webhook handling for orders

### E2E Tests
- Configure catalog in settings
- Trigger sync and verify products appear
- Send single product message
- Send multi-product message
- Verify message renders correctly

---

## Part 9: Dependencies and Risks

### Dependencies
1. **Phase 8 Complete** - Foundation Layer with ChannelAdapter pattern
2. **Meta Commerce Manager** - External catalog setup required
3. **WhatsApp Business Account** - Must have catalog linked

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta API rate limits | Sync failures | Implement exponential backoff, cache products locally |
| Catalog changes not detected | Stale product data | Auto-sync on configurable interval, manual sync button |
| Large catalogs (10k+ products) | Slow sync, high memory | Paginated sync, incremental updates |
| Product not found errors | Message send failures | Validate product exists before sending, handle gracefully |
| Region restrictions (India) | Catalog messages unavailable | Detect region, hide unavailable features |

---

## Part 10: Success Metrics

| Metric | Target |
|--------|--------|
| Catalog sync time (100 products) | < 30 seconds |
| Product search latency | < 200ms |
| Product message send success rate | > 99% |
| UI product picker load time | < 1 second |
| Cart order processing time | < 5 seconds |

---

## References

### Official Documentation
- [Meta Marketing API - Product Catalog](https://developers.facebook.com/docs/marketing-api/reference/product-catalog/)
- [WhatsApp Cloud API - Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [WhatsApp Business API - Sell Products](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/sell-products-and-services)

### Third-Party Documentation
- [360Dialog - Products & Catalogs](https://docs.360dialog.com/docs/waba-messaging/products-and-catalogs)
- [360Dialog - Single & Multi-Product Messages](https://docs.360dialog.com/docs/waba-messaging/interactive-messages/single-and-multi-product-messages)
- [Gupshup - WhatsApp Interactive Messages](https://support.gupshup.io/hc/en-us/articles/4413103335705-WhatsApp-Interactive-Single-Multi-Product-Messages)
- [WhatsApp Node.js SDK](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/interactive/)
- [Flexify - Meta Catalog Fields](https://www.flexify.net/meta-catalog-docs)
- [Interakt - Product Catalog API Guide](https://www.interakt.shop/whatsapp-business-api/product-catalog-whatsapp-api/)

---

*Research completed: 2026-01-24*
*Ready for planning phase*
