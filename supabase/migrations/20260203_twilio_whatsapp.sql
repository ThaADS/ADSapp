-- Phase 21: Twilio WhatsApp Channel
-- Database schema for Twilio WhatsApp integration
-- Supports bidirectional WhatsApp messaging via Twilio API
-- Plan: 21-01 | Date: 2026-02-03

-- =============================================================================
-- TWILIO WHATSAPP CONNECTIONS TABLE
-- =============================================================================
-- Stores Twilio WhatsApp account credentials per organization

CREATE TABLE IF NOT EXISTS twilio_whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Twilio credentials (encrypted)
  twilio_account_sid TEXT NOT NULL,
  twilio_auth_token_hash TEXT NOT NULL, -- Encrypted auth token

  -- WhatsApp number configuration
  whatsapp_number TEXT NOT NULL, -- E.164 format (+1234567890)
  whatsapp_number_sid TEXT, -- Twilio Phone Number SID (optional)
  friendly_name TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each org can have multiple WhatsApp numbers, but each number is unique globally
  UNIQUE(whatsapp_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_twilio_wa_connections_org
  ON twilio_whatsapp_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_twilio_wa_connections_number
  ON twilio_whatsapp_connections(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_twilio_wa_connections_active
  ON twilio_whatsapp_connections(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE twilio_whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view connections in their organization
CREATE POLICY "Users can view own org twilio whatsapp connections"
  ON twilio_whatsapp_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Policy: Only admins and owners can manage connections (insert/update/delete)
CREATE POLICY "Admins can manage twilio whatsapp connections"
  ON twilio_whatsapp_connections FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- TWILIO WHATSAPP WEBHOOK EVENTS TABLE (Idempotency)
-- =============================================================================
-- Tracks webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS twilio_whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES twilio_whatsapp_connections(id) ON DELETE CASCADE,

  -- Event identification
  message_sid TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('message', 'status')),
  payload_hash TEXT,

  -- Processing status
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for idempotency - same message_sid + event_type only once
  UNIQUE(message_sid, event_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_twilio_wa_webhook_events_status
  ON twilio_whatsapp_webhook_events(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_twilio_wa_webhook_events_sid
  ON twilio_whatsapp_webhook_events(message_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_wa_webhook_events_connection
  ON twilio_whatsapp_webhook_events(connection_id);

-- RLS Policies for webhook events (admin access only, primarily for debugging)
ALTER TABLE twilio_whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view webhook events for connections in their organization
CREATE POLICY "Users can view own org twilio webhook events"
  ON twilio_whatsapp_webhook_events FOR SELECT
  USING (connection_id IN (
    SELECT id FROM twilio_whatsapp_connections
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Policy: System can insert webhook events (service role only for webhooks)
-- Note: Webhook handler uses service role client, so no INSERT policy needed for users

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS update_twilio_whatsapp_connections_updated_at ON twilio_whatsapp_connections;
CREATE TRIGGER update_twilio_whatsapp_connections_updated_at
  BEFORE UPDATE ON twilio_whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS (Documentation)
-- =============================================================================

COMMENT ON TABLE twilio_whatsapp_connections IS 'Twilio WhatsApp account connections per organization - stores credentials and configuration';
COMMENT ON COLUMN twilio_whatsapp_connections.twilio_account_sid IS 'Twilio Account SID from console';
COMMENT ON COLUMN twilio_whatsapp_connections.twilio_auth_token_hash IS 'Encrypted/hashed Twilio Auth Token for security';
COMMENT ON COLUMN twilio_whatsapp_connections.whatsapp_number IS 'WhatsApp-enabled phone number in E.164 format (+1234567890)';
COMMENT ON COLUMN twilio_whatsapp_connections.whatsapp_number_sid IS 'Twilio Phone Number SID (PN...) for the WhatsApp number';
COMMENT ON COLUMN twilio_whatsapp_connections.webhook_configured IS 'Whether Twilio webhook URL is configured correctly';
COMMENT ON COLUMN twilio_whatsapp_connections.last_verified_at IS 'Last successful connection verification timestamp';

COMMENT ON TABLE twilio_whatsapp_webhook_events IS 'Webhook event log for idempotency - prevents duplicate message processing';
COMMENT ON COLUMN twilio_whatsapp_webhook_events.message_sid IS 'Twilio Message SID (SM...) for deduplication';
COMMENT ON COLUMN twilio_whatsapp_webhook_events.event_type IS 'Type of webhook event: message (incoming) or status (delivery callback)';
COMMENT ON COLUMN twilio_whatsapp_webhook_events.payload_hash IS 'SHA256 hash of webhook payload for integrity verification';
COMMENT ON COLUMN twilio_whatsapp_webhook_events.status IS 'Processing status: pending (queued), processed (handled), failed (error)';
