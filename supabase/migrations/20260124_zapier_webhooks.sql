-- =====================================================
-- Migration: Zapier Integration - Webhook Subscriptions
-- Description: Create REST Hook webhook subscription tables
--              for real-time event delivery to Zapier
-- Created: 2026-01-24
-- =====================================================

BEGIN;

-- =====================================================
-- Zapier Subscriptions Table
-- REST Hook webhook subscriptions
-- =====================================================
CREATE TABLE zapier_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE SET NULL,

  -- Event configuration
  event_type TEXT NOT NULL,  -- e.g., 'message.received', 'contact.created'
  target_url TEXT NOT NULL,

  -- Filtering support (ZAP-06)
  filter_tags TEXT[],
  filter_segments TEXT[],
  filter_operator TEXT DEFAULT 'any_of' CHECK (filter_operator IN ('any_of', 'all_of', 'none_of')),

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Webhook Delivery Log Table
-- Track delivery status for debugging and analytics
-- =====================================================
CREATE TABLE zapier_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES zapier_subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event data
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,  -- Original event ID
  payload JSONB NOT NULL,

  -- Delivery tracking
  attempt_count INTEGER DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'abandoned')),
  response_status INTEGER,
  response_body TEXT,

  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Subscriptions: Fast lookup by organization
CREATE INDEX idx_zapier_subs_org
  ON zapier_subscriptions(organization_id);

-- Subscriptions: Fast lookup by event type
CREATE INDEX idx_zapier_subs_event
  ON zapier_subscriptions(event_type);

-- Subscriptions: Fast lookup of active subscriptions
CREATE INDEX idx_zapier_subs_active
  ON zapier_subscriptions(is_active)
  WHERE is_active = true;

-- Deliveries: Fast lookup by subscription
CREATE INDEX idx_zapier_deliveries_sub
  ON zapier_webhook_deliveries(subscription_id);

-- Deliveries: Fast lookup of pending retries
CREATE INDEX idx_zapier_deliveries_pending
  ON zapier_webhook_deliveries(next_retry_at)
  WHERE status = 'pending';

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on webhook tables
ALTER TABLE zapier_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Organization members can view
CREATE POLICY "Organization members can view subscriptions"
  ON zapier_subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Subscriptions: Admins and owners can manage
CREATE POLICY "Admins can manage subscriptions"
  ON zapier_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = zapier_subscriptions.organization_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Deliveries: Organization members can view
CREATE POLICY "Organization members can view deliveries"
  ON zapier_webhook_deliveries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Database Functions
-- =====================================================

-- Extended cleanup function to include webhook deliveries
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes (older than 1 hour)
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < now() - INTERVAL '1 hour';

  -- Delete expired and revoked access tokens (keep 7 days for audit)
  DELETE FROM oauth_access_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');

  -- Delete expired and used refresh tokens (keep 7 days for audit)
  DELETE FROM oauth_refresh_tokens
  WHERE (expires_at < now() - INTERVAL '7 days')
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days');

  -- Delete old webhook deliveries (keep 30 days)
  DELETE FROM zapier_webhook_deliveries
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Updated At Trigger
-- =====================================================

-- Add updated_at trigger to subscriptions
CREATE TRIGGER update_zapier_subscriptions_updated_at
  BEFORE UPDATE ON zapier_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE zapier_subscriptions IS 'REST Hook webhook subscriptions for Zapier integration';
COMMENT ON TABLE zapier_webhook_deliveries IS 'Webhook delivery logs for debugging and analytics';

COMMENT ON COLUMN zapier_subscriptions.event_type IS 'Event type: message.received, contact.created, etc.';
COMMENT ON COLUMN zapier_subscriptions.filter_tags IS 'Filter events by contact tags';
COMMENT ON COLUMN zapier_subscriptions.filter_segments IS 'Filter events by contact segments';
COMMENT ON COLUMN zapier_subscriptions.filter_operator IS 'Filtering logic: any_of, all_of, none_of';

COMMENT ON COLUMN zapier_webhook_deliveries.status IS 'Delivery status: pending, delivered, failed, abandoned';
COMMENT ON COLUMN zapier_webhook_deliveries.next_retry_at IS 'Next retry timestamp for failed deliveries';

COMMIT;
