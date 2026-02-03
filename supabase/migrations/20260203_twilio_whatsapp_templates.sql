/**
 * Twilio WhatsApp Templates Schema
 * Purpose: Store and cache Twilio Content API templates
 * Date: 2026-02-03
 */

-- =============================================================================
-- Twilio WhatsApp Templates Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS twilio_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES twilio_whatsapp_connections(id) ON DELETE CASCADE,

  -- Twilio Content API fields
  content_sid TEXT NOT NULL,           -- Twilio Content SID (HXxxxxxxx)
  friendly_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',

  -- Template content
  template_type TEXT NOT NULL,         -- twilio/text, twilio/media, twilio/quick-reply, etc.
  body TEXT,                           -- Template body text
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names/positions

  -- Media (if applicable)
  media_url TEXT,
  media_type TEXT,

  -- Quick replies / buttons (if applicable)
  actions JSONB DEFAULT '[]'::jsonb,

  -- Status
  approval_status TEXT DEFAULT 'approved', -- approved, pending, rejected

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  raw_response JSONB,                  -- Full Twilio API response for debugging

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one template per content_sid per connection
  UNIQUE(connection_id, content_sid)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast lookup by organization
CREATE INDEX idx_twilio_whatsapp_templates_org
  ON twilio_whatsapp_templates(organization_id);

-- Fast lookup by connection
CREATE INDEX idx_twilio_whatsapp_templates_connection
  ON twilio_whatsapp_templates(connection_id);

-- Search by friendly name
CREATE INDEX idx_twilio_whatsapp_templates_name
  ON twilio_whatsapp_templates(friendly_name);

-- Filter by language
CREATE INDEX idx_twilio_whatsapp_templates_language
  ON twilio_whatsapp_templates(language);

-- Filter by type
CREATE INDEX idx_twilio_whatsapp_templates_type
  ON twilio_whatsapp_templates(template_type);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE twilio_whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates for their organization
CREATE POLICY "Users can view own org templates"
  ON twilio_whatsapp_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only admins/owners can manage templates (sync operations)
CREATE POLICY "Admins can manage templates"
  ON twilio_whatsapp_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_twilio_whatsapp_templates_updated_at
  BEFORE UPDATE ON twilio_whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Template Send Log (for analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS twilio_whatsapp_template_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES twilio_whatsapp_templates(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Variable values used
  variables_used JSONB DEFAULT '{}'::jsonb,

  -- Result
  twilio_message_sid TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  error_code TEXT,
  error_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_twilio_template_sends_org
  ON twilio_whatsapp_template_sends(organization_id);

CREATE INDEX idx_twilio_template_sends_template
  ON twilio_whatsapp_template_sends(template_id);

CREATE INDEX idx_twilio_template_sends_sent_at
  ON twilio_whatsapp_template_sends(sent_at);

-- RLS for template sends
ALTER TABLE twilio_whatsapp_template_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org template sends"
  ON twilio_whatsapp_template_sends FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert template sends"
  ON twilio_whatsapp_template_sends FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
