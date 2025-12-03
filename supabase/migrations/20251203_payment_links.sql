-- Payment Links System for WhatsApp Integration
-- Enables sending Stripe payment links via WhatsApp conversations

-- =====================================================
-- 1. PAYMENT LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Link details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'eur',

    -- Stripe integration
    stripe_payment_link_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_payment_link_url TEXT NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,

    -- Status management
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    use_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment_links
CREATE INDEX IF NOT EXISTS idx_payment_links_organization ON payment_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_stripe_id ON payment_links(stripe_payment_link_id);

-- =====================================================
-- 2. PAYMENT LINK SENDS TABLE
-- Tracks when payment links are sent via WhatsApp
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_link_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Send details
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_by UUID REFERENCES profiles(id),
    message_id UUID REFERENCES messages(id),

    -- Tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- Indexes for payment_link_sends
CREATE INDEX IF NOT EXISTS idx_payment_link_sends_link ON payment_link_sends(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_sends_conversation ON payment_link_sends(conversation_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_sends_contact ON payment_link_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_sends_date ON payment_link_sends(sent_at);

-- =====================================================
-- 3. PAYMENT LINK PAYMENTS TABLE
-- Tracks successful payments through payment links
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_link_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,

    -- Stripe details
    stripe_checkout_session_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),

    -- Payment details
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- Timestamps
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment_link_payments
CREATE INDEX IF NOT EXISTS idx_payment_link_payments_link ON payment_link_payments(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_payments_status ON payment_link_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_link_payments_date ON payment_link_payments(paid_at);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to increment payment link usage count
CREATE OR REPLACE FUNCTION increment_payment_link_usage(link_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE payment_links
    SET use_count = use_count + 1,
        updated_at = NOW()
    WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment link analytics
CREATE OR REPLACE FUNCTION get_payment_link_analytics(
    org_id UUID,
    start_date TIMESTAMPTZ DEFAULT NULL,
    end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_links BIGINT,
    active_links BIGINT,
    total_sent BIGINT,
    total_payments BIGINT,
    total_revenue NUMERIC,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM payment_links WHERE organization_id = org_id)::BIGINT as total_links,
        (SELECT COUNT(*) FROM payment_links WHERE organization_id = org_id AND status = 'active')::BIGINT as active_links,
        (SELECT COUNT(*) FROM payment_link_sends pls
         JOIN payment_links pl ON pls.payment_link_id = pl.id
         WHERE pl.organization_id = org_id
         AND (start_date IS NULL OR pls.sent_at >= start_date)
         AND (end_date IS NULL OR pls.sent_at <= end_date))::BIGINT as total_sent,
        (SELECT COUNT(*) FROM payment_link_payments plp
         JOIN payment_links pl ON plp.payment_link_id = pl.id
         WHERE pl.organization_id = org_id
         AND plp.status = 'completed'
         AND (start_date IS NULL OR plp.paid_at >= start_date)
         AND (end_date IS NULL OR plp.paid_at <= end_date))::BIGINT as total_payments,
        COALESCE((SELECT SUM(plp.amount) / 100.0 FROM payment_link_payments plp
         JOIN payment_links pl ON plp.payment_link_id = pl.id
         WHERE pl.organization_id = org_id
         AND plp.status = 'completed'
         AND (start_date IS NULL OR plp.paid_at >= start_date)
         AND (end_date IS NULL OR plp.paid_at <= end_date)), 0)::NUMERIC as total_revenue,
        CASE
            WHEN (SELECT COUNT(*) FROM payment_link_sends pls
                  JOIN payment_links pl ON pls.payment_link_id = pl.id
                  WHERE pl.organization_id = org_id) > 0
            THEN ROUND(
                (SELECT COUNT(*) FROM payment_link_payments plp
                 JOIN payment_links pl ON plp.payment_link_id = pl.id
                 WHERE pl.organization_id = org_id AND plp.status = 'completed')::NUMERIC /
                (SELECT COUNT(*) FROM payment_link_sends pls
                 JOIN payment_links pl ON pls.payment_link_id = pl.id
                 WHERE pl.organization_id = org_id)::NUMERIC * 100, 2)
            ELSE 0
        END::NUMERIC as conversion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_links
CREATE POLICY payment_links_tenant_isolation ON payment_links
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for payment_link_sends
CREATE POLICY payment_link_sends_tenant_isolation ON payment_link_sends
    FOR ALL USING (
        payment_link_id IN (
            SELECT pl.id FROM payment_links pl
            WHERE pl.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for payment_link_payments
CREATE POLICY payment_link_payments_tenant_isolation ON payment_link_payments
    FOR ALL USING (
        payment_link_id IN (
            SELECT pl.id FROM payment_links pl
            WHERE pl.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- =====================================================
-- 6. ADD WIDGET CONFIG TO ORGANIZATIONS
-- =====================================================

-- Add widget_config column to organizations if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'widget_config'
    ) THEN
        ALTER TABLE organizations ADD COLUMN widget_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to payment_links
DROP TRIGGER IF EXISTS set_payment_links_updated_at ON payment_links;
CREATE TRIGGER set_payment_links_updated_at
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- 8. GRANTS FOR AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_link_sends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_link_payments TO authenticated;
GRANT EXECUTE ON FUNCTION increment_payment_link_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_link_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
