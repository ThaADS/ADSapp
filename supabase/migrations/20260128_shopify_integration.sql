-- Phase 12: Shopify Integration
-- Database schema for e-commerce integration with Shopify

-- =============================================================================
-- SHOPIFY INTEGRATIONS TABLE
-- =============================================================================
-- Stores OAuth connection details for each organization's Shopify store

CREATE TABLE IF NOT EXISTS shopify_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL, -- e.g., "store.myshopify.com"
  access_token_hash TEXT NOT NULL, -- Encrypted access token
  scopes TEXT[] NOT NULL DEFAULT '{}', -- Granted OAuth scopes
  api_version TEXT NOT NULL DEFAULT '2025-01', -- Shopify API version
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_secret TEXT, -- For webhook signature verification
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each org can have one Shopify store connected
  UNIQUE(organization_id, shop_domain)
);

-- Indexes
CREATE INDEX idx_shopify_integrations_org ON shopify_integrations(organization_id);
CREATE INDEX idx_shopify_integrations_shop ON shopify_integrations(shop_domain);
CREATE INDEX idx_shopify_integrations_active ON shopify_integrations(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE shopify_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org shopify integrations"
  ON shopify_integrations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage shopify integrations"
  ON shopify_integrations FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- SHOPIFY WEBHOOK SUBSCRIPTIONS TABLE
-- =============================================================================
-- Tracks registered webhooks for each integration

CREATE TABLE IF NOT EXISTS shopify_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_integration_id UUID NOT NULL REFERENCES shopify_integrations(id) ON DELETE CASCADE,
  webhook_topic TEXT NOT NULL, -- e.g., "orders/create", "fulfillments/create"
  shopify_webhook_id TEXT NOT NULL, -- Shopify's webhook ID
  callback_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_integration_id, webhook_topic)
);

-- Index
CREATE INDEX idx_shopify_webhooks_integration ON shopify_webhook_subscriptions(shopify_integration_id);

-- RLS (inherits from parent integration)
ALTER TABLE shopify_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org webhook subscriptions"
  ON shopify_webhook_subscriptions FOR SELECT
  USING (shopify_integration_id IN (
    SELECT id FROM shopify_integrations
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- =============================================================================
-- SHOPIFY PRODUCTS TABLE
-- =============================================================================
-- Cached product catalog from Shopify

CREATE TABLE IF NOT EXISTS shopify_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_integration_id UUID NOT NULL REFERENCES shopify_integrations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL, -- Shopify's product ID (string in API v12)
  title TEXT NOT NULL,
  description TEXT,
  product_type TEXT,
  handle TEXT, -- URL-friendly identifier
  status TEXT DEFAULT 'active', -- active, archived, draft
  vendor TEXT,
  tags TEXT[],
  images JSONB DEFAULT '[]', -- Array of image objects with src, alt
  variants JSONB DEFAULT '[]', -- Product variants with price, sku, inventory
  price_range JSONB, -- { min: "10.00", max: "50.00", currency: "EUR" }
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_integration_id, shopify_product_id)
);

-- Indexes
CREATE INDEX idx_shopify_products_org ON shopify_products(organization_id);
CREATE INDEX idx_shopify_products_integration ON shopify_products(shopify_integration_id);
CREATE INDEX idx_shopify_products_status ON shopify_products(status) WHERE status = 'active';
CREATE INDEX idx_shopify_products_title ON shopify_products USING gin(to_tsvector('english', title));

-- RLS Policies
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org shopify products"
  ON shopify_products FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- SHOPIFY ORDERS TABLE
-- =============================================================================
-- Order data received from webhooks

CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_integration_id UUID NOT NULL REFERENCES shopify_integrations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL, -- Shopify's order ID
  order_number TEXT NOT NULL, -- Display order number (#1001)

  -- Customer info
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  shopify_customer_id TEXT,

  -- Order details
  total_price DECIMAL(10,2) NOT NULL,
  subtotal_price DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  total_shipping DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Status tracking
  financial_status TEXT, -- pending, paid, refunded, partially_refunded
  fulfillment_status TEXT, -- unfulfilled, fulfilled, partial, restocked
  order_status TEXT DEFAULT 'open', -- open, closed, cancelled

  -- Line items and metadata
  line_items JSONB NOT NULL DEFAULT '[]',
  shipping_address JSONB,
  billing_address JSONB,
  note TEXT,
  tags TEXT[],

  -- Timestamps
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- ADSapp linking
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_integration_id, shopify_order_id)
);

-- Indexes
CREATE INDEX idx_shopify_orders_org ON shopify_orders(organization_id);
CREATE INDEX idx_shopify_orders_integration ON shopify_orders(shopify_integration_id);
CREATE INDEX idx_shopify_orders_contact ON shopify_orders(contact_id);
CREATE INDEX idx_shopify_orders_conversation ON shopify_orders(conversation_id);
CREATE INDEX idx_shopify_orders_email ON shopify_orders(customer_email);
CREATE INDEX idx_shopify_orders_phone ON shopify_orders(customer_phone);
CREATE INDEX idx_shopify_orders_status ON shopify_orders(order_status, fulfillment_status);
CREATE INDEX idx_shopify_orders_created ON shopify_orders(shopify_created_at DESC);

-- RLS Policies
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org shopify orders"
  ON shopify_orders FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can manage shopify orders"
  ON shopify_orders FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- SHOPIFY FULFILLMENTS TABLE
-- =============================================================================
-- Tracking shipment/fulfillment status

CREATE TABLE IF NOT EXISTS shopify_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id UUID NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_fulfillment_id TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, open, success, cancelled, error, failure
  tracking_company TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  tracking_numbers TEXT[],
  line_items JSONB DEFAULT '[]', -- Fulfilled line items
  shipment_status TEXT, -- in_transit, delivered, out_for_delivery, etc.
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_order_id, shopify_fulfillment_id)
);

-- Index
CREATE INDEX idx_shopify_fulfillments_order ON shopify_fulfillments(shopify_order_id);
CREATE INDEX idx_shopify_fulfillments_status ON shopify_fulfillments(status);

-- RLS (inherits from order)
ALTER TABLE shopify_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org fulfillments"
  ON shopify_fulfillments FOR SELECT
  USING (shopify_order_id IN (
    SELECT id FROM shopify_orders
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- =============================================================================
-- SHOPIFY CARTS TABLE (Abandoned Cart Recovery)
-- =============================================================================
-- Track checkouts for abandoned cart detection

CREATE TABLE IF NOT EXISTS shopify_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_integration_id UUID NOT NULL REFERENCES shopify_integrations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shopify_checkout_id TEXT NOT NULL,
  shopify_checkout_token TEXT,

  -- Customer info
  customer_email TEXT,
  customer_phone TEXT,
  shopify_customer_id TEXT,

  -- Cart contents
  line_items JSONB NOT NULL DEFAULT '[]',
  total_price DECIMAL(10,2),
  subtotal_price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',

  -- Recovery
  checkout_url TEXT, -- Abandoned checkout recovery URL
  abandoned_at TIMESTAMPTZ, -- When cart was marked as abandoned
  converted_at TIMESTAMPTZ, -- When order was placed (cart converted)
  shopify_order_id TEXT, -- If converted, link to order

  -- Recovery messaging
  recovery_status TEXT DEFAULT 'pending', -- pending, sent, converted, expired
  recovery_message_sent_at TIMESTAMPTZ,
  recovery_attempts INTEGER DEFAULT 0,
  last_recovery_attempt_at TIMESTAMPTZ,

  -- Timestamps
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_integration_id, shopify_checkout_id)
);

-- Indexes
CREATE INDEX idx_shopify_carts_org ON shopify_carts(organization_id);
CREATE INDEX idx_shopify_carts_integration ON shopify_carts(shopify_integration_id);
CREATE INDEX idx_shopify_carts_email ON shopify_carts(customer_email);
CREATE INDEX idx_shopify_carts_phone ON shopify_carts(customer_phone);
CREATE INDEX idx_shopify_carts_recovery ON shopify_carts(recovery_status, abandoned_at)
  WHERE recovery_status = 'pending';
CREATE INDEX idx_shopify_carts_abandoned ON shopify_carts(abandoned_at)
  WHERE abandoned_at IS NOT NULL AND converted_at IS NULL;

-- RLS Policies
ALTER TABLE shopify_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org carts"
  ON shopify_carts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- SHOPIFY WEBHOOK EVENTS TABLE (Idempotency)
-- =============================================================================
-- Track processed webhook events to prevent duplicates

CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_integration_id UUID NOT NULL REFERENCES shopify_integrations(id) ON DELETE CASCADE,
  webhook_id TEXT NOT NULL, -- X-Shopify-Webhook-Id header
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  payload_hash TEXT, -- Hash of payload for deduplication
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(shopify_integration_id, webhook_id)
);

-- Index for quick lookup
CREATE INDEX idx_shopify_webhook_events_lookup
  ON shopify_webhook_events(shopify_integration_id, webhook_id);
CREATE INDEX idx_shopify_webhook_events_status
  ON shopify_webhook_events(status) WHERE status = 'pending';

-- Auto-cleanup old events (keep 30 days)
-- This would be handled by a cron job or scheduled function

-- =============================================================================
-- SHOPIFY SETTINGS TABLE
-- =============================================================================
-- Organization-level Shopify configuration

CREATE TABLE IF NOT EXISTS shopify_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Auto-message settings
  order_confirmation_enabled BOOLEAN DEFAULT true,
  order_confirmation_template_id UUID, -- Reference to message_templates
  shipping_notification_enabled BOOLEAN DEFAULT true,
  shipping_notification_template_id UUID,
  delivery_notification_enabled BOOLEAN DEFAULT true,
  delivery_notification_template_id UUID,

  -- Abandoned cart settings
  cart_recovery_enabled BOOLEAN DEFAULT true,
  cart_recovery_delay_hours INTEGER DEFAULT 1, -- Hours after abandonment
  cart_recovery_template_id UUID,
  cart_recovery_max_attempts INTEGER DEFAULT 3,

  -- Sync settings
  auto_sync_products BOOLEAN DEFAULT true,
  sync_interval_hours INTEGER DEFAULT 24,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE shopify_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org shopify settings"
  ON shopify_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage shopify settings"
  ON shopify_settings FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_shopify_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopify_integrations_updated_at
  BEFORE UPDATE ON shopify_integrations
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_webhook_subscriptions_updated_at
  BEFORE UPDATE ON shopify_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_products_updated_at
  BEFORE UPDATE ON shopify_products
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_orders_updated_at
  BEFORE UPDATE ON shopify_orders
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_fulfillments_updated_at
  BEFORE UPDATE ON shopify_fulfillments
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_carts_updated_at
  BEFORE UPDATE ON shopify_carts
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_settings_updated_at
  BEFORE UPDATE ON shopify_settings
  FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================
-- Enable realtime for order status updates

ALTER PUBLICATION supabase_realtime ADD TABLE shopify_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE shopify_fulfillments;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE shopify_integrations IS 'OAuth connections to Shopify stores per organization';
COMMENT ON TABLE shopify_webhook_subscriptions IS 'Registered webhooks for each Shopify integration';
COMMENT ON TABLE shopify_products IS 'Cached product catalog from Shopify';
COMMENT ON TABLE shopify_orders IS 'Orders received from Shopify webhooks';
COMMENT ON TABLE shopify_fulfillments IS 'Shipment/fulfillment tracking for orders';
COMMENT ON TABLE shopify_carts IS 'Abandoned checkout tracking for cart recovery';
COMMENT ON TABLE shopify_webhook_events IS 'Webhook event log for idempotency';
COMMENT ON TABLE shopify_settings IS 'Organization-level Shopify automation settings';
