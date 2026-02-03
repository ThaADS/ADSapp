-- Phase 13: Instagram DM Channel
-- Database schema for Instagram Direct Messages integration

-- =============================================================================
-- INSTAGRAM CONNECTIONS TABLE
-- =============================================================================
-- Stores OAuth connection details for Instagram Business accounts

CREATE TABLE IF NOT EXISTS instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL, -- Instagram Business Account ID
  instagram_username TEXT NOT NULL,
  page_id TEXT NOT NULL, -- Connected Facebook Page ID
  page_name TEXT,
  access_token_hash TEXT NOT NULL, -- Encrypted long-lived token
  token_expires_at TIMESTAMPTZ, -- Long-lived tokens expire after ~60 days
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each org can have one Instagram account per Business Account
  UNIQUE(organization_id, instagram_user_id)
);

-- Indexes
CREATE INDEX idx_instagram_connections_org ON instagram_connections(organization_id);
CREATE INDEX idx_instagram_connections_user ON instagram_connections(instagram_user_id);
CREATE INDEX idx_instagram_connections_page ON instagram_connections(page_id);
CREATE INDEX idx_instagram_connections_active ON instagram_connections(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram connections"
  ON instagram_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage instagram connections"
  ON instagram_connections FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- INSTAGRAM CONVERSATIONS TABLE
-- =============================================================================
-- Tracks DM threads with Instagram users

CREATE TABLE IF NOT EXISTS instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_connection_id UUID NOT NULL REFERENCES instagram_connections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL, -- Instagram conversation thread ID
  participant_id TEXT NOT NULL, -- Instagram user ID of the customer
  participant_username TEXT,
  participant_name TEXT,
  participant_profile_pic TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Link to unified conversation system
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(instagram_connection_id, thread_id)
);

-- Indexes
CREATE INDEX idx_instagram_convos_org ON instagram_conversations(organization_id);
CREATE INDEX idx_instagram_convos_connection ON instagram_conversations(instagram_connection_id);
CREATE INDEX idx_instagram_convos_participant ON instagram_conversations(participant_id);
CREATE INDEX idx_instagram_convos_conversation ON instagram_conversations(conversation_id);
CREATE INDEX idx_instagram_convos_last_msg ON instagram_conversations(last_message_at DESC);

-- RLS
ALTER TABLE instagram_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram conversations"
  ON instagram_conversations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- INSTAGRAM MESSAGES TABLE
-- =============================================================================
-- Individual DM messages

CREATE TABLE IF NOT EXISTS instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  instagram_message_id TEXT NOT NULL, -- Instagram's message ID (mid)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  -- Content
  message_type TEXT NOT NULL DEFAULT 'text',
  text TEXT,
  -- Media
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'sticker')),
  -- Story reference
  story_id TEXT,
  story_url TEXT,
  -- Reply reference
  reply_to_message_id TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_code TEXT,
  error_message TEXT,
  -- Timestamps
  instagram_timestamp TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(instagram_conversation_id, instagram_message_id)
);

-- Indexes
CREATE INDEX idx_instagram_messages_convo ON instagram_messages(instagram_conversation_id);
CREATE INDEX idx_instagram_messages_timestamp ON instagram_messages(instagram_timestamp DESC);
CREATE INDEX idx_instagram_messages_status ON instagram_messages(status);
CREATE INDEX idx_instagram_messages_direction ON instagram_messages(direction);

-- RLS (inherit from conversation)
ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org instagram messages"
  ON instagram_messages FOR SELECT
  USING (instagram_conversation_id IN (
    SELECT id FROM instagram_conversations
    WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ));

-- =============================================================================
-- INSTAGRAM COMMENT RULES TABLE
-- =============================================================================
-- Automation rules for comment-to-DM

CREATE TABLE IF NOT EXISTS instagram_comment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instagram_connection_id UUID NOT NULL REFERENCES instagram_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Trigger conditions
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}', -- Keywords to match
  trigger_media_ids TEXT[], -- Specific posts/reels (null = all)
  -- Response
  dm_template TEXT NOT NULL, -- Message template
  dm_delay_seconds INTEGER NOT NULL DEFAULT 0,
  -- Limits
  max_per_user_per_day INTEGER NOT NULL DEFAULT 1,
  -- Stats
  trigger_count INTEGER NOT NULL DEFAULT 0,
  dm_sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instagram_comment_rules_org ON instagram_comment_rules(organization_id);
CREATE INDEX idx_instagram_comment_rules_connection ON instagram_comment_rules(instagram_connection_id);
CREATE INDEX idx_instagram_comment_rules_active ON instagram_comment_rules(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE instagram_comment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org comment rules"
  ON instagram_comment_rules FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage comment rules"
  ON instagram_comment_rules FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- INSTAGRAM STORY MENTIONS TABLE
-- =============================================================================
-- Track story mentions for response

CREATE TABLE IF NOT EXISTS instagram_story_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_connection_id UUID NOT NULL REFERENCES instagram_connections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  story_url TEXT,
  mentioned_by_id TEXT NOT NULL,
  mentioned_by_username TEXT,
  mentioned_at TIMESTAMPTZ NOT NULL,
  -- Response tracking
  responded BOOLEAN NOT NULL DEFAULT false,
  response_conversation_id UUID REFERENCES instagram_conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(instagram_connection_id, story_id, mentioned_by_id)
);

-- Indexes
CREATE INDEX idx_instagram_story_mentions_org ON instagram_story_mentions(organization_id);
CREATE INDEX idx_instagram_story_mentions_connection ON instagram_story_mentions(instagram_connection_id);
CREATE INDEX idx_instagram_story_mentions_pending ON instagram_story_mentions(responded) WHERE responded = false;

-- RLS
ALTER TABLE instagram_story_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org story mentions"
  ON instagram_story_mentions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- INSTAGRAM RATE LIMITS TABLE
-- =============================================================================
-- Track rate limits per organization

CREATE TABLE IF NOT EXISTS instagram_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  messages_sent_this_hour INTEGER NOT NULL DEFAULT 0,
  hour_window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  limit_per_hour INTEGER NOT NULL DEFAULT 200, -- Instagram default
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_instagram_rate_limits_org ON instagram_rate_limits(organization_id);

-- RLS
ALTER TABLE instagram_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org rate limits"
  ON instagram_rate_limits FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- INSTAGRAM WEBHOOK EVENTS TABLE (Idempotency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS instagram_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_connection_id UUID REFERENCES instagram_connections(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL, -- From webhook payload
  event_type TEXT NOT NULL,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id)
);

-- Index
CREATE INDEX idx_instagram_webhook_events_status ON instagram_webhook_events(status) WHERE status = 'pending';

-- =============================================================================
-- COMMENT-TO-DM TRACKING TABLE
-- =============================================================================
-- Track sent DMs per user per day for rate limiting

CREATE TABLE IF NOT EXISTS instagram_comment_dm_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_comment_rule_id UUID NOT NULL REFERENCES instagram_comment_rules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Instagram user who commented
  dm_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checking daily limit
CREATE INDEX idx_instagram_dm_tracking_rule_user
  ON instagram_comment_dm_tracking(instagram_comment_rule_id, user_id, dm_sent_at);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_instagram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instagram_connections_updated_at
  BEFORE UPDATE ON instagram_connections
  FOR EACH ROW EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER update_instagram_conversations_updated_at
  BEFORE UPDATE ON instagram_conversations
  FOR EACH ROW EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER update_instagram_messages_updated_at
  BEFORE UPDATE ON instagram_messages
  FOR EACH ROW EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER update_instagram_comment_rules_updated_at
  BEFORE UPDATE ON instagram_comment_rules
  FOR EACH ROW EXECUTE FUNCTION update_instagram_updated_at();

CREATE TRIGGER update_instagram_rate_limits_updated_at
  BEFORE UPDATE ON instagram_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_instagram_updated_at();

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE instagram_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_story_mentions;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE instagram_connections IS 'OAuth connections to Instagram Business accounts';
COMMENT ON TABLE instagram_conversations IS 'DM conversation threads with Instagram users';
COMMENT ON TABLE instagram_messages IS 'Individual Instagram DM messages';
COMMENT ON TABLE instagram_comment_rules IS 'Automation rules for comment-to-DM';
COMMENT ON TABLE instagram_story_mentions IS 'Story mention notifications';
COMMENT ON TABLE instagram_rate_limits IS 'Rate limit tracking per organization';
COMMENT ON TABLE instagram_webhook_events IS 'Webhook event log for idempotency';
