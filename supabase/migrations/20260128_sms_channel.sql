-- Phase 15: SMS Channel
-- Database schema for Twilio SMS integration
-- Supports bidirectional SMS messaging with opt-out compliance

-- =============================================================================
-- SMS CONNECTIONS TABLE
-- =============================================================================
-- Stores Twilio account credentials per organization

CREATE TABLE IF NOT EXISTS sms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Twilio credentials (encrypted)
  twilio_account_sid TEXT NOT NULL,
  twilio_auth_token_hash TEXT NOT NULL, -- Encrypted auth token
  -- Phone number configuration
  phone_number TEXT NOT NULL, -- E.164 format (+1234567890)
  phone_number_sid TEXT NOT NULL, -- Twilio Phone Number SID
  friendly_name TEXT,
  -- Capabilities
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  mms_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Messaging service (optional)
  messaging_service_sid TEXT,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each org can have multiple phone numbers, but each number is unique
  UNIQUE(phone_number),
  UNIQUE(phone_number_sid)
);

-- Indexes
CREATE INDEX idx_sms_connections_org ON sms_connections(organization_id);
CREATE INDEX idx_sms_connections_phone ON sms_connections(phone_number);
CREATE INDEX idx_sms_connections_active ON sms_connections(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE sms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sms connections"
  ON sms_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage sms connections"
  ON sms_connections FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- SMS CONVERSATIONS TABLE
-- =============================================================================
-- Tracks SMS threads with contacts

CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_connection_id UUID NOT NULL REFERENCES sms_connections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Remote party
  remote_phone_number TEXT NOT NULL, -- E.164 format
  remote_name TEXT,
  remote_country TEXT, -- ISO country code
  remote_carrier TEXT,
  -- Conversation state
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Opt-out status
  opted_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  opt_out_keyword TEXT, -- STOP, UNSUBSCRIBE, etc.
  -- Link to unified conversation system
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(sms_connection_id, remote_phone_number)
);

-- Indexes
CREATE INDEX idx_sms_convos_org ON sms_conversations(organization_id);
CREATE INDEX idx_sms_convos_connection ON sms_conversations(sms_connection_id);
CREATE INDEX idx_sms_convos_phone ON sms_conversations(remote_phone_number);
CREATE INDEX idx_sms_convos_conversation ON sms_conversations(conversation_id);
CREATE INDEX idx_sms_convos_last_msg ON sms_conversations(last_message_at DESC);
CREATE INDEX idx_sms_convos_opted_out ON sms_conversations(opted_out) WHERE opted_out = true;

-- RLS
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sms conversations"
  ON sms_conversations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- SMS MESSAGES TABLE
-- =============================================================================
-- Individual SMS/MMS messages

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_conversation_id UUID NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  -- Twilio message identifiers
  twilio_message_sid TEXT NOT NULL,
  twilio_account_sid TEXT NOT NULL,
  -- Direction and parties
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  -- Content
  body TEXT,
  num_segments INTEGER NOT NULL DEFAULT 1,
  -- MMS media
  num_media INTEGER NOT NULL DEFAULT 0,
  media_urls TEXT[], -- Array of media URLs
  media_content_types TEXT[], -- Corresponding content types
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received'
  )),
  error_code TEXT,
  error_message TEXT,
  -- Pricing (in USD cents)
  price_cents INTEGER,
  price_unit TEXT DEFAULT 'USD',
  -- Timestamps
  twilio_created_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(twilio_message_sid)
);

-- Indexes
CREATE INDEX idx_sms_messages_convo ON sms_messages(sms_conversation_id);
CREATE INDEX idx_sms_messages_sid ON sms_messages(twilio_message_sid);
CREATE INDEX idx_sms_messages_timestamp ON sms_messages(twilio_created_at DESC);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);

-- RLS (inherit from conversation)
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sms messages"
  ON sms_messages FOR SELECT
  USING (sms_conversation_id IN (
    SELECT id FROM sms_conversations
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- =============================================================================
-- SMS OPT-OUTS TABLE
-- =============================================================================
-- Global opt-out tracking for compliance (TCPA, CTIA)

CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- E.164 format
  -- Opt-out details
  keyword TEXT NOT NULL, -- STOP, UNSUBSCRIBE, CANCEL, END, QUIT
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Opt back in
  opted_in_at TIMESTAMPTZ,
  opt_in_keyword TEXT, -- START, YES, UNSTOP
  -- Source tracking
  source_message_sid TEXT,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Track opt-outs per organization per phone
  UNIQUE(organization_id, phone_number)
);

-- Indexes
CREATE INDEX idx_sms_opt_outs_org ON sms_opt_outs(organization_id);
CREATE INDEX idx_sms_opt_outs_phone ON sms_opt_outs(phone_number);
CREATE INDEX idx_sms_opt_outs_active ON sms_opt_outs(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sms opt-outs"
  ON sms_opt_outs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage sms opt-outs"
  ON sms_opt_outs FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- SMS TEMPLATES TABLE
-- =============================================================================
-- Reusable SMS message templates

CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  -- Content (supports {{variable}} placeholders)
  body TEXT NOT NULL,
  -- Variables metadata
  variables JSONB DEFAULT '[]', -- [{name: 'first_name', required: true, default: ''}]
  -- Categorization
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  -- Usage tracking
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_templates_org ON sms_templates(organization_id);
CREATE INDEX idx_sms_templates_active ON sms_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_sms_templates_category ON sms_templates(category);

-- RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sms templates"
  ON sms_templates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage sms templates"
  ON sms_templates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- SMS WEBHOOK EVENTS TABLE (Idempotency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_connection_id UUID REFERENCES sms_connections(id) ON DELETE CASCADE,
  -- Event identification
  message_sid TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'message', 'status'
  payload_hash TEXT,
  -- Processing
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_sid, event_type)
);

-- Index
CREATE INDEX idx_sms_webhook_events_status ON sms_webhook_events(status) WHERE status = 'pending';

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_connections_updated_at
  BEFORE UPDATE ON sms_connections
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_conversations_updated_at
  BEFORE UPDATE ON sms_conversations
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_opt_outs_updated_at
  BEFORE UPDATE ON sms_opt_outs
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE sms_conversations;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE sms_connections IS 'Twilio account connections per organization';
COMMENT ON TABLE sms_conversations IS 'SMS conversation threads with contacts';
COMMENT ON TABLE sms_messages IS 'Individual SMS/MMS messages';
COMMENT ON TABLE sms_opt_outs IS 'TCPA/CTIA compliant opt-out tracking';
COMMENT ON TABLE sms_templates IS 'Reusable SMS message templates';
COMMENT ON TABLE sms_webhook_events IS 'Webhook event log for idempotency';
