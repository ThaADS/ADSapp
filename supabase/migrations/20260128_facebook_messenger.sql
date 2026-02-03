-- Phase 14: Facebook Messenger Channel
-- Database schema for Facebook Messenger integration

-- =============================================================================
-- FACEBOOK CONNECTIONS TABLE
-- =============================================================================
-- Stores OAuth connection details for Facebook Pages

CREATE TABLE IF NOT EXISTS facebook_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL, -- Facebook Page ID
  page_name TEXT NOT NULL,
  page_access_token_hash TEXT NOT NULL, -- Encrypted Page Access Token
  user_access_token_hash TEXT, -- Encrypted User Access Token (for refresh)
  token_expires_at TIMESTAMPTZ, -- Page tokens can be long-lived
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  -- Handover protocol
  app_id TEXT NOT NULL, -- Meta App ID
  secondary_receivers TEXT[] NOT NULL DEFAULT '{}', -- App IDs that can receive thread control
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each org can have one connection per Page
  UNIQUE(organization_id, page_id)
);

-- Indexes
CREATE INDEX idx_facebook_connections_org ON facebook_connections(organization_id);
CREATE INDEX idx_facebook_connections_page ON facebook_connections(page_id);
CREATE INDEX idx_facebook_connections_active ON facebook_connections(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org facebook connections"
  ON facebook_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage facebook connections"
  ON facebook_connections FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- FACEBOOK CONVERSATIONS TABLE
-- =============================================================================
-- Tracks Messenger threads with Facebook users

CREATE TABLE IF NOT EXISTS facebook_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_connection_id UUID NOT NULL REFERENCES facebook_connections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  psid TEXT NOT NULL, -- Page-Scoped User ID
  user_name TEXT,
  user_profile_pic TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Thread control (Handover Protocol)
  thread_owner TEXT NOT NULL DEFAULT 'app' CHECK (thread_owner IN ('app', 'page_inbox', 'secondary_app')),
  thread_owner_app_id TEXT,
  -- Link to unified conversation system
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(facebook_connection_id, psid)
);

-- Indexes
CREATE INDEX idx_facebook_convos_org ON facebook_conversations(organization_id);
CREATE INDEX idx_facebook_convos_connection ON facebook_conversations(facebook_connection_id);
CREATE INDEX idx_facebook_convos_psid ON facebook_conversations(psid);
CREATE INDEX idx_facebook_convos_conversation ON facebook_conversations(conversation_id);
CREATE INDEX idx_facebook_convos_last_msg ON facebook_conversations(last_message_at DESC);
CREATE INDEX idx_facebook_convos_thread_owner ON facebook_conversations(thread_owner);

-- RLS
ALTER TABLE facebook_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org facebook conversations"
  ON facebook_conversations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- FACEBOOK MESSAGES TABLE
-- =============================================================================
-- Individual Messenger messages

CREATE TABLE IF NOT EXISTS facebook_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_conversation_id UUID NOT NULL REFERENCES facebook_conversations(id) ON DELETE CASCADE,
  facebook_message_id TEXT NOT NULL, -- Meta's message ID (mid)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  -- Content
  message_type TEXT NOT NULL DEFAULT 'text',
  text TEXT,
  -- Media
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  -- Template (outbound)
  template_type TEXT,
  template_payload JSONB,
  -- Quick replies / Postback
  quick_reply_payload TEXT,
  postback_payload TEXT,
  postback_title TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_code TEXT,
  error_message TEXT,
  -- Timestamps
  facebook_timestamp TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(facebook_conversation_id, facebook_message_id)
);

-- Indexes
CREATE INDEX idx_facebook_messages_convo ON facebook_messages(facebook_conversation_id);
CREATE INDEX idx_facebook_messages_timestamp ON facebook_messages(facebook_timestamp DESC);
CREATE INDEX idx_facebook_messages_status ON facebook_messages(status);
CREATE INDEX idx_facebook_messages_direction ON facebook_messages(direction);

-- RLS (inherit from conversation)
ALTER TABLE facebook_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org facebook messages"
  ON facebook_messages FOR SELECT
  USING (facebook_conversation_id IN (
    SELECT id FROM facebook_conversations
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- =============================================================================
-- MESSENGER TEMPLATES TABLE
-- =============================================================================
-- Reusable message templates for Messenger

CREATE TABLE IF NOT EXISTS messenger_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facebook_connection_id UUID NOT NULL REFERENCES facebook_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('generic', 'button', 'media', 'receipt', 'airline_boardingpass')),
  template_payload JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messenger_templates_org ON messenger_templates(organization_id);
CREATE INDEX idx_messenger_templates_connection ON messenger_templates(facebook_connection_id);
CREATE INDEX idx_messenger_templates_active ON messenger_templates(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE messenger_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org messenger templates"
  ON messenger_templates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage messenger templates"
  ON messenger_templates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- FACEBOOK WEBHOOK EVENTS TABLE (Idempotency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS facebook_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_connection_id UUID REFERENCES facebook_connections(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL, -- From webhook payload (mid or generated)
  event_type TEXT NOT NULL,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id)
);

-- Index
CREATE INDEX idx_facebook_webhook_events_status ON facebook_webhook_events(status) WHERE status = 'pending';

-- =============================================================================
-- THREAD CONTROL LOG TABLE
-- =============================================================================
-- Track handover protocol events

CREATE TABLE IF NOT EXISTS facebook_thread_control_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_conversation_id UUID NOT NULL REFERENCES facebook_conversations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('pass', 'take', 'request')),
  from_app_id TEXT,
  to_app_id TEXT,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_fb_thread_control_convo ON facebook_thread_control_log(facebook_conversation_id);
CREATE INDEX idx_fb_thread_control_time ON facebook_thread_control_log(created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_facebook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facebook_connections_updated_at
  BEFORE UPDATE ON facebook_connections
  FOR EACH ROW EXECUTE FUNCTION update_facebook_updated_at();

CREATE TRIGGER update_facebook_conversations_updated_at
  BEFORE UPDATE ON facebook_conversations
  FOR EACH ROW EXECUTE FUNCTION update_facebook_updated_at();

CREATE TRIGGER update_facebook_messages_updated_at
  BEFORE UPDATE ON facebook_messages
  FOR EACH ROW EXECUTE FUNCTION update_facebook_updated_at();

CREATE TRIGGER update_messenger_templates_updated_at
  BEFORE UPDATE ON messenger_templates
  FOR EACH ROW EXECUTE FUNCTION update_facebook_updated_at();

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE facebook_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE facebook_conversations;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE facebook_connections IS 'OAuth connections to Facebook Pages for Messenger';
COMMENT ON TABLE facebook_conversations IS 'Messenger conversation threads with Facebook users';
COMMENT ON TABLE facebook_messages IS 'Individual Messenger messages';
COMMENT ON TABLE messenger_templates IS 'Reusable message templates for Messenger';
COMMENT ON TABLE facebook_webhook_events IS 'Webhook event log for idempotency';
COMMENT ON TABLE facebook_thread_control_log IS 'Handover protocol thread control events';
