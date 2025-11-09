-- Migration: Advanced Features - Multi-Channel Support
-- Description: Add tables and fields for email, SMS, web chat, Instagram, and advanced features
-- Created: 2025-11-09

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- MULTI-CHANNEL SUPPORT
-- ============================================================================

-- Add channel field to conversations (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'conversations' AND column_name = 'channel') THEN
    ALTER TABLE conversations ADD COLUMN channel TEXT DEFAULT 'whatsapp'
      CHECK (channel IN ('whatsapp', 'email', 'sms', 'webchat', 'instagram'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'conversations' AND column_name = 'channel_metadata') THEN
    ALTER TABLE conversations ADD COLUMN channel_metadata JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

-- Add channel field to messages (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'messages' AND column_name = 'channel') THEN
    ALTER TABLE messages ADD COLUMN channel TEXT DEFAULT 'whatsapp'
      CHECK (channel IN ('whatsapp', 'email', 'sms', 'webchat', 'instagram'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'messages' AND column_name = 'channel_message_id') THEN
    ALTER TABLE messages ADD COLUMN channel_message_id TEXT; -- External message ID
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'messages' AND column_name = 'channel_metadata') THEN
    ALTER TABLE messages ADD COLUMN channel_metadata JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

-- Create indexes for channel filtering
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_channel_message_id ON messages(channel_message_id);

-- ============================================================================
-- EMAIL CHANNEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Account details
  email TEXT NOT NULL,
  display_name TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap')),

  -- Connection settings
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,

  -- Encrypted credentials (using field-level encryption)
  encrypted_password TEXT,
  encrypted_access_token TEXT, -- For OAuth (Gmail, Outlook)
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Configuration
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  sync_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  error_message TEXT,

  -- Signature
  email_signature TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, email)
);

CREATE INDEX idx_email_accounts_org ON email_accounts(organization_id);
CREATE INDEX idx_email_accounts_status ON email_accounts(status);

-- RLS for email_accounts
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization email accounts"
  ON email_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization email accounts"
  ON email_accounts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- SMS CHANNEL (Twilio)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Twilio credentials
  phone_number TEXT NOT NULL, -- E.164 format
  twilio_account_sid TEXT NOT NULL,
  encrypted_twilio_auth_token TEXT NOT NULL,

  -- Configuration
  enabled BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  error_message TEXT,
  last_verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, phone_number)
);

CREATE INDEX idx_sms_accounts_org ON sms_accounts(organization_id);
CREATE INDEX idx_sms_accounts_phone ON sms_accounts(phone_number);

-- RLS for sms_accounts
ALTER TABLE sms_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization SMS accounts"
  ON sms_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization SMS accounts"
  ON sms_accounts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- WEB CHAT WIDGET
-- ============================================================================

CREATE TABLE IF NOT EXISTS webchat_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Widget configuration
  widget_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,

  -- Appearance
  primary_color TEXT DEFAULT '#10b981',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  greeting_message TEXT DEFAULT 'Hi! How can we help you?',
  offline_message TEXT DEFAULT 'We are offline. Leave a message and we''ll get back to you.',

  -- Behavior
  show_agent_names BOOLEAN DEFAULT true,
  show_agent_avatars BOOLEAN DEFAULT true,
  allow_file_uploads BOOLEAN DEFAULT true,
  require_name BOOLEAN DEFAULT false,
  require_email BOOLEAN DEFAULT false,

  -- Business hours integration
  respect_business_hours BOOLEAN DEFAULT true,

  -- Allowed domains (for CORS)
  allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Analytics
  total_conversations INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webchat_widgets_org ON webchat_widgets(organization_id);

-- RLS for webchat_widgets
ALTER TABLE webchat_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization webchat widgets"
  ON webchat_widgets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization webchat widgets"
  ON webchat_widgets FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- INSTAGRAM DM CHANNEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Instagram Business Account
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,

  -- Facebook Page connection
  facebook_page_id TEXT NOT NULL,

  -- Access tokens (encrypted)
  encrypted_access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Configuration
  enabled BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  error_message TEXT,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, instagram_user_id)
);

CREATE INDEX idx_instagram_accounts_org ON instagram_accounts(organization_id);
CREATE INDEX idx_instagram_accounts_user_id ON instagram_accounts(instagram_user_id);

-- RLS for instagram_accounts
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization Instagram accounts"
  ON instagram_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization Instagram accounts"
  ON instagram_accounts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CONTACT SCORING & SEGMENTATION
-- ============================================================================

-- Add scoring fields to contacts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'contacts' AND column_name = 'lead_score') THEN
    ALTER TABLE contacts ADD COLUMN lead_score INTEGER DEFAULT 0
      CHECK (lead_score >= 0 AND lead_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'contacts' AND column_name = 'engagement_score') THEN
    ALTER TABLE contacts ADD COLUMN engagement_score INTEGER DEFAULT 0
      CHECK (engagement_score >= 0 AND engagement_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'contacts' AND column_name = 'customer_lifetime_value') THEN
    ALTER TABLE contacts ADD COLUMN customer_lifetime_value NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'contacts' AND column_name = 'last_engagement_at') THEN
    ALTER TABLE contacts ADD COLUMN last_engagement_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'contacts' AND column_name = 'enrichment_data') THEN
    ALTER TABLE contacts ADD COLUMN enrichment_data JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON contacts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_last_engagement ON contacts(last_engagement_at DESC NULLS LAST);

-- Contact segments
CREATE TABLE IF NOT EXISTS contact_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Segment details
  name TEXT NOT NULL,
  description TEXT,

  -- Segment rules (JSON query)
  rules JSONB NOT NULL,

  -- Type
  segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('dynamic', 'static')),

  -- Cached count (updated periodically)
  contact_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_contact_segments_org ON contact_segments(organization_id);
CREATE INDEX idx_contact_segments_type ON contact_segments(segment_type);

-- RLS for contact_segments
ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization contact segments"
  ON contact_segments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization contact segments"
  ON contact_segments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Static segment membership
CREATE TABLE IF NOT EXISTS contact_segment_members (
  segment_id UUID NOT NULL REFERENCES contact_segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  PRIMARY KEY (segment_id, contact_id)
);

CREATE INDEX idx_segment_members_segment ON contact_segment_members(segment_id);
CREATE INDEX idx_segment_members_contact ON contact_segment_members(contact_id);

-- RLS for contact_segment_members
ALTER TABLE contact_segment_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization segment members"
  ON contact_segment_members FOR SELECT
  USING (
    segment_id IN (
      SELECT id FROM contact_segments WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- SLA MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS sla_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rule details
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Rule type
  rule_type TEXT NOT NULL CHECK (rule_type IN ('first_response', 'resolution', 'customer_satisfaction')),

  -- Target metrics
  target_minutes INTEGER, -- For response/resolution time
  target_score NUMERIC(3,2), -- For satisfaction

  -- Conditions (when this rule applies)
  conditions JSONB DEFAULT '{}'::JSONB, -- e.g., {"priority": "high", "channel": "whatsapp"}

  -- Priority
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Escalation
  escalate_on_breach BOOLEAN DEFAULT false,
  escalate_to_role TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_sla_rules_org ON sla_rules(organization_id);
CREATE INDEX idx_sla_rules_type ON sla_rules(rule_type);
CREATE INDEX idx_sla_rules_enabled ON sla_rules(enabled) WHERE enabled = true;

-- RLS for sla_rules
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization SLA rules"
  ON sla_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization SLA rules"
  ON sla_rules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- SLA tracking per conversation
CREATE TABLE IF NOT EXISTS sla_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sla_rule_id UUID NOT NULL REFERENCES sla_rules(id) ON DELETE CASCADE,

  -- Tracking
  target_time TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  breached BOOLEAN DEFAULT false,
  breach_duration_minutes INTEGER,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'met', 'breached', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sla_tracking_conversation ON sla_tracking(conversation_id);
CREATE INDEX idx_sla_tracking_rule ON sla_tracking(sla_rule_id);
CREATE INDEX idx_sla_tracking_status ON sla_tracking(status);
CREATE INDEX idx_sla_tracking_breached ON sla_tracking(breached) WHERE breached = true;
CREATE INDEX idx_sla_tracking_target_time ON sla_tracking(target_time);

-- RLS for sla_tracking
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization SLA tracking"
  ON sla_tracking FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- AGENT SKILLS (for smart assignment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Skill details
  skill_name TEXT NOT NULL,
  skill_level INTEGER DEFAULT 5 CHECK (skill_level >= 1 AND skill_level <= 10),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, skill_name)
);

CREATE INDEX idx_agent_skills_profile ON agent_skills(profile_id);
CREATE INDEX idx_agent_skills_name ON agent_skills(skill_name);
CREATE INDEX idx_agent_skills_level ON agent_skills(skill_level DESC);

-- RLS for agent_skills
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization agent skills"
  ON agent_skills FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own skills"
  ON agent_skills FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage all agent skills"
  ON agent_skills FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- ADVANCED SEARCH INDEXES
-- ============================================================================

-- Full-text search on messages (conversations search removed - column doesn't exist)
CREATE INDEX IF NOT EXISTS idx_messages_search
  ON messages USING gin(to_tsvector('english', COALESCE(content, '')));

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_trgm ON contacts USING gin(phone_number gin_trgm_ops);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_accounts_updated_at BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sms_accounts_updated_at BEFORE UPDATE ON sms_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webchat_widgets_updated_at BEFORE UPDATE ON webchat_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER instagram_accounts_updated_at BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contact_segments_updated_at BEFORE UPDATE ON contact_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sla_rules_updated_at BEFORE UPDATE ON sla_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sla_tracking_updated_at BEFORE UPDATE ON sla_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agent_skills_updated_at BEFORE UPDATE ON agent_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate contact lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(contact_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  conversation_count INTEGER;
  avg_response_time INTERVAL;
  days_since_last_engagement INTEGER;
BEGIN
  -- Get conversation metrics
  SELECT COUNT(*), AVG(
    EXTRACT(EPOCH FROM (first_agent_response_at - created_at)) / 60
  )
  INTO conversation_count, avg_response_time
  FROM conversations
  WHERE contact_id = contact_id_param;

  -- Score based on engagement
  score := score + LEAST(conversation_count * 5, 30);

  -- Score based on recency
  SELECT EXTRACT(DAY FROM NOW() - last_engagement_at)
  INTO days_since_last_engagement
  FROM contacts
  WHERE id = contact_id_param;

  IF days_since_last_engagement IS NULL THEN
    days_since_last_engagement := 999;
  END IF;

  IF days_since_last_engagement < 7 THEN
    score := score + 30;
  ELSIF days_since_last_engagement < 30 THEN
    score := score + 20;
  ELSIF days_since_last_engagement < 90 THEN
    score := score + 10;
  END IF;

  -- Cap at 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Check SLA breach
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as breached if target time passed and not completed
  IF NEW.completed_at IS NULL AND NOW() > NEW.target_time AND OLD.breached = false THEN
    NEW.breached := true;
    NEW.status := 'breached';
    NEW.breach_duration_minutes := EXTRACT(EPOCH FROM (NOW() - NEW.target_time)) / 60;
  ELSIF NEW.completed_at IS NOT NULL AND NEW.completed_at <= NEW.target_time THEN
    NEW.status := 'met';
    NEW.breached := false;
  ELSIF NEW.completed_at IS NOT NULL AND NEW.completed_at > NEW.target_time THEN
    NEW.status := 'breached';
    NEW.breached := true;
    NEW.breach_duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.target_time)) / 60;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sla_tracking_check_breach
  BEFORE UPDATE ON sla_tracking
  FOR EACH ROW
  EXECUTE FUNCTION check_sla_breach();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON email_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webchat_widgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_segment_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sla_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sla_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_skills TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_lead_score(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_accounts IS 'Email channel integration accounts (Gmail, Outlook, IMAP)';
COMMENT ON TABLE sms_accounts IS 'SMS channel integration via Twilio';
COMMENT ON TABLE webchat_widgets IS 'Embeddable web chat widget configuration';
COMMENT ON TABLE instagram_accounts IS 'Instagram DM integration accounts';
COMMENT ON TABLE contact_segments IS 'Dynamic and static contact segmentation';
COMMENT ON TABLE sla_rules IS 'Service Level Agreement rules for response times';
COMMENT ON TABLE sla_tracking IS 'SLA tracking per conversation';
COMMENT ON TABLE agent_skills IS 'Agent skills for smart assignment routing';

-- Migration complete
