-- WhatsApp Catalog System for Product Messaging
-- Enables syncing product catalogs and sending product messages via WhatsApp
-- Phase 9: WhatsApp Catalog Feature

-- =====================================================
-- 1. WHATSAPP CATALOGS TABLE
-- Stores catalog configuration and sync status per organization
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Catalog identification (from Meta Commerce Manager)
    catalog_id TEXT NOT NULL,
    catalog_name TEXT,

    -- Sync status
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
    sync_error TEXT,
    product_count INTEGER NOT NULL DEFAULT 0,

    -- Settings
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_sync_interval_hours INTEGER NOT NULL DEFAULT 24,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: One catalog per organization (WhatsApp Business limitation)
    UNIQUE(organization_id)
);

-- Indexes for whatsapp_catalogs
CREATE INDEX IF NOT EXISTS idx_whatsapp_catalogs_org ON whatsapp_catalogs(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_catalogs_catalog_id ON whatsapp_catalogs(catalog_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_catalogs_sync_status ON whatsapp_catalogs(sync_status);

-- =====================================================
-- 2. WHATSAPP PRODUCTS TABLE
-- Caches product data from Meta Commerce Manager
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    catalog_id UUID NOT NULL REFERENCES whatsapp_catalogs(id) ON DELETE CASCADE,

    -- Product identification (from Meta)
    meta_product_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,  -- SKU/Content ID used in messages

    -- Product details
    name TEXT NOT NULL,
    description TEXT,
    price_amount INTEGER,  -- In smallest currency unit (cents)
    price_currency TEXT NOT NULL DEFAULT 'USD',
    availability TEXT NOT NULL DEFAULT 'in stock' CHECK (availability IN ('in stock', 'out of stock', 'preorder', 'available for order')),
    image_url TEXT,
    product_url TEXT,
    brand TEXT,
    category TEXT,

    -- Additional metadata (complete API response)
    raw_data JSONB,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(catalog_id, retailer_id)
);

-- Indexes for whatsapp_products
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_org ON whatsapp_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_catalog ON whatsapp_products(catalog_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_retailer ON whatsapp_products(retailer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_meta_id ON whatsapp_products(meta_product_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_active ON whatsapp_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_availability ON whatsapp_products(availability);

-- Full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_whatsapp_products_search ON whatsapp_products
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =====================================================
-- 3. WHATSAPP PRODUCT MESSAGES TABLE
-- Tracks product messages sent for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_product_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- Message type
    message_type TEXT NOT NULL CHECK (message_type IN ('single', 'multi', 'catalog')),

    -- Products included
    product_ids UUID[] NOT NULL DEFAULT '{}',  -- References whatsapp_products.id
    retailer_ids TEXT[] NOT NULL DEFAULT '{}',  -- SKUs for quick reference

    -- Message metadata
    catalog_id TEXT NOT NULL,
    header_text TEXT,
    body_text TEXT,
    footer_text TEXT,
    sections JSONB,  -- For multi-product: [{title, product_items: [{product_retailer_id}]}]

    -- Tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,

    -- Cart/Order tracking (when customer sends cart back)
    cart_received BOOLEAN NOT NULL DEFAULT false,
    cart_received_at TIMESTAMPTZ,
    cart_data JSONB,  -- {catalog_id, product_items: [{product_retailer_id, quantity, item_price, currency}], text}

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for whatsapp_product_messages
CREATE INDEX IF NOT EXISTS idx_product_messages_org ON whatsapp_product_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_messages_conversation ON whatsapp_product_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_product_messages_message ON whatsapp_product_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_product_messages_sent ON whatsapp_product_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_messages_type ON whatsapp_product_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_product_messages_cart ON whatsapp_product_messages(cart_received) WHERE cart_received = true;

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to update catalog sync status
CREATE OR REPLACE FUNCTION update_catalog_sync_status(
    p_catalog_id UUID,
    p_status TEXT,
    p_product_count INTEGER DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE whatsapp_catalogs
    SET
        sync_status = p_status,
        last_sync_at = CASE WHEN p_status = 'success' THEN NOW() ELSE last_sync_at END,
        product_count = COALESCE(p_product_count, product_count),
        sync_error = CASE WHEN p_status = 'error' THEN p_error ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_catalog_id;
END;
$$;

-- Function to search products with full-text search
CREATE OR REPLACE FUNCTION search_whatsapp_products(
    p_organization_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_availability TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    catalog_id UUID,
    meta_product_id TEXT,
    retailer_id TEXT,
    name TEXT,
    description TEXT,
    price_amount INTEGER,
    price_currency TEXT,
    availability TEXT,
    image_url TEXT,
    product_url TEXT,
    brand TEXT,
    category TEXT,
    is_active BOOLEAN,
    synced_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT
            wp.*,
            COUNT(*) OVER() as total_count
        FROM whatsapp_products wp
        WHERE wp.organization_id = p_organization_id
          AND wp.is_active = true
          AND (p_availability IS NULL OR wp.availability = p_availability)
          AND (
              p_search_query IS NULL
              OR to_tsvector('english', wp.name || ' ' || COALESCE(wp.description, ''))
                 @@ plainto_tsquery('english', p_search_query)
              OR wp.name ILIKE '%' || p_search_query || '%'
              OR wp.retailer_id ILIKE '%' || p_search_query || '%'
          )
        ORDER BY wp.name ASC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT
        fp.id,
        fp.organization_id,
        fp.catalog_id,
        fp.meta_product_id,
        fp.retailer_id,
        fp.name,
        fp.description,
        fp.price_amount,
        fp.price_currency,
        fp.availability,
        fp.image_url,
        fp.product_url,
        fp.brand,
        fp.category,
        fp.is_active,
        fp.synced_at,
        fp.total_count
    FROM filtered_products fp;
END;
$$;

-- Function to get product message analytics
CREATE OR REPLACE FUNCTION get_product_message_analytics(
    p_organization_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_messages BIGINT,
    single_product_messages BIGINT,
    multi_product_messages BIGINT,
    catalog_messages BIGINT,
    total_products_sent BIGINT,
    carts_received BIGINT,
    delivery_rate NUMERIC,
    read_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_messages,
        COUNT(*) FILTER (WHERE message_type = 'single')::BIGINT as single_product_messages,
        COUNT(*) FILTER (WHERE message_type = 'multi')::BIGINT as multi_product_messages,
        COUNT(*) FILTER (WHERE message_type = 'catalog')::BIGINT as catalog_messages,
        COALESCE(SUM(array_length(product_ids, 1)), 0)::BIGINT as total_products_sent,
        COUNT(*) FILTER (WHERE cart_received = true)::BIGINT as carts_received,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
            ELSE 0
        END::NUMERIC as delivery_rate,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE read_at IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
            ELSE 0
        END::NUMERIC as read_rate
    FROM whatsapp_product_messages
    WHERE organization_id = p_organization_id
      AND (p_start_date IS NULL OR sent_at >= p_start_date)
      AND (p_end_date IS NULL OR sent_at <= p_end_date);
END;
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE whatsapp_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_product_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_catalogs
-- All users can view their organization's catalog
CREATE POLICY whatsapp_catalogs_select ON whatsapp_catalogs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only admins/owners can manage catalogs
CREATE POLICY whatsapp_catalogs_insert ON whatsapp_catalogs
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY whatsapp_catalogs_update ON whatsapp_catalogs
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY whatsapp_catalogs_delete ON whatsapp_catalogs
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for whatsapp_products
-- All users can view their organization's products
CREATE POLICY whatsapp_products_select ON whatsapp_products
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only admins/owners can manage products (typically via sync)
CREATE POLICY whatsapp_products_insert ON whatsapp_products
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY whatsapp_products_update ON whatsapp_products
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY whatsapp_products_delete ON whatsapp_products
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for whatsapp_product_messages
-- All users can view their organization's product messages
CREATE POLICY whatsapp_product_messages_select ON whatsapp_product_messages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- All authenticated users in org can create product messages (agents need to send products)
CREATE POLICY whatsapp_product_messages_insert ON whatsapp_product_messages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow updates for tracking (delivered_at, read_at, cart_received)
CREATE POLICY whatsapp_product_messages_update ON whatsapp_product_messages
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger function for updated_at (reuse if exists)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to whatsapp_catalogs
DROP TRIGGER IF EXISTS set_whatsapp_catalogs_updated_at ON whatsapp_catalogs;
CREATE TRIGGER set_whatsapp_catalogs_updated_at
    BEFORE UPDATE ON whatsapp_catalogs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply trigger to whatsapp_products
DROP TRIGGER IF EXISTS set_whatsapp_products_updated_at ON whatsapp_products;
CREATE TRIGGER set_whatsapp_products_updated_at
    BEFORE UPDATE ON whatsapp_products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- 7. GRANTS FOR AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_catalogs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON whatsapp_product_messages TO authenticated;

GRANT EXECUTE ON FUNCTION update_catalog_sync_status(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_whatsapp_products(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_message_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE whatsapp_catalogs IS 'Stores WhatsApp catalog configuration per organization. One catalog per org (WhatsApp Business limitation).';
COMMENT ON TABLE whatsapp_products IS 'Cached product data from Meta Commerce Manager for fast product picker access.';
COMMENT ON TABLE whatsapp_product_messages IS 'Tracks product messages sent via WhatsApp for analytics and cart/order tracking.';

COMMENT ON COLUMN whatsapp_products.retailer_id IS 'SKU/Content ID used to identify products in WhatsApp messages. Must match Commerce Manager.';
COMMENT ON COLUMN whatsapp_products.price_amount IS 'Price in smallest currency unit (e.g., cents for USD/EUR).';
COMMENT ON COLUMN whatsapp_product_messages.sections IS 'JSON array of sections for multi-product messages: [{title, product_items: [{product_retailer_id}]}]';
COMMENT ON COLUMN whatsapp_product_messages.cart_data IS 'Customer cart data when order is received: {catalog_id, product_items, text}';
