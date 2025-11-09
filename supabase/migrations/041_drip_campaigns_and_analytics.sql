-- Migration: Drip Campaigns and Enhanced Analytics
-- Purpose: Add support for drip campaigns, bulk campaigns, and enhanced analytics
-- Author: System
-- Date: 2025-11-09

-- ============================================================================
-- BULK CAMPAIGNS (Broadcast Messaging)
-- ============================================================================

CREATE TABLE bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('promotional', 'transactional', 'notification', 'survey')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled')),

  -- Message configuration
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  message JSONB, -- {type: 'text'|'template'|'media', content: string, mediaUrl?: string, templateVariables?: {}}

  -- Target audience
  target_audience JSONB NOT NULL, -- {type: 'all'|'tags'|'contacts'|'custom', tags?: [], contactIds?: [], customFilters?: []}

  -- Scheduling
  scheduling JSONB NOT NULL, -- {type: 'immediate'|'scheduled'|'recurring', scheduledAt?: timestamp, timezone?: string, recurringPattern?: {}}

  -- Rate limiting
  rate_limiting JSONB NOT NULL DEFAULT '{"enabled": true, "messagesPerHour": 1000, "messagesPerDay": 10000}',

  -- Statistics
  statistics JSONB DEFAULT '{"totalTargets": 0, "messagesSent": 0, "messagesDelivered": 0, "messagesRead": 0, "messagesFailed": 0, "optOuts": 0, "replies": 0, "deliveryRate": 0, "readRate": 0, "replyRate": 0, "failureRate": 0}',

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Bulk message jobs (individual message tracking)
CREATE TABLE bulk_message_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  whatsapp_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  message_id TEXT, -- WhatsApp message ID

  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error handling
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact lists for targeting
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DRIP CAMPAIGNS (Automated Message Sequences)
-- ============================================================================

CREATE TABLE drip_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'contact_created', 'tag_added', 'custom_event', 'api')),
  trigger_config JSONB DEFAULT '{}', -- {tags?: [], events?: [], conditions?: []}

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  is_active BOOLEAN DEFAULT false,

  -- Settings
  settings JSONB DEFAULT '{"stopOnReply": true, "respectBusinessHours": false, "maxContactsPerDay": 1000}',

  -- Statistics
  statistics JSONB DEFAULT '{"totalEnrolled": 0, "activeContacts": 0, "completedContacts": 0, "droppedContacts": 0, "totalMessagesSent": 0, "averageCompletionRate": 0}',

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drip campaign steps (sequence of messages)
CREATE TABLE drip_campaign_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL, -- 1, 2, 3...
  name TEXT NOT NULL,

  -- Delay configuration
  delay_type TEXT NOT NULL CHECK (delay_type IN ('minutes', 'hours', 'days', 'weeks')),
  delay_value INTEGER NOT NULL, -- How long after previous step (0 for first step)

  -- Message configuration
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'media')),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  message_content TEXT,
  media_url TEXT,
  template_variables JSONB DEFAULT '{}',

  -- Conditions (optional)
  conditions JSONB DEFAULT '[]', -- [{field, operator, value}]

  -- Settings
  settings JSONB DEFAULT '{"sendOnlyDuringBusinessHours": false, "skipWeekends": false}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, step_order)
);

-- Drip enrollment (tracks which contacts are in which campaigns)
CREATE TABLE drip_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped', 'opted_out')),
  current_step_id UUID REFERENCES drip_campaign_steps(id) ON DELETE SET NULL,
  current_step_order INTEGER,

  -- Timing
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_message_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Statistics
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  replied BOOLEAN DEFAULT false,

  -- Metadata
  enrolled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dropped_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

-- Drip message logs (track individual messages sent in drip campaigns)
CREATE TABLE drip_message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES drip_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES drip_campaign_steps(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  whatsapp_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'skipped')),

  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error handling
  error TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED ANALYTICS
-- ============================================================================

-- Campaign analytics (aggregated metrics per campaign per day)
CREATE TABLE campaign_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID, -- Can be bulk_campaign_id or drip_campaign_id
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('bulk', 'drip')),
  date DATE NOT NULL,

  -- Message metrics
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,

  -- Engagement metrics
  replies_received INTEGER DEFAULT 0,
  opt_outs INTEGER DEFAULT 0,

  -- Rates (percentage)
  delivery_rate DECIMAL(5,2) DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  reply_rate DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, campaign_id, campaign_type, date)
);

-- Agent performance metrics (enhanced)
CREATE TABLE agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Conversation metrics
  conversations_handled INTEGER DEFAULT 0,
  conversations_resolved INTEGER DEFAULT 0,
  conversations_transferred INTEGER DEFAULT 0,

  -- Response time metrics
  avg_first_response_time INTERVAL,
  avg_response_time INTERVAL,
  avg_resolution_time INTERVAL,

  -- Message metrics
  messages_sent INTEGER DEFAULT 0,
  templates_used INTEGER DEFAULT 0,

  -- Quality metrics
  customer_satisfaction_score DECIMAL(3,2), -- If CSAT is implemented

  -- Availability
  online_time INTERVAL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, agent_id, date)
);

-- Channel source tracking (where conversations come from)
CREATE TABLE channel_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL CHECK (source_type IN ('direct', 'qr_code', 'web_widget', 'api', 'campaign', 'unknown')),
  source_identifier TEXT, -- e.g., QR code ID, widget ID, campaign ID
  source_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message template usage analytics
CREATE TABLE template_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,

  times_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, template_id, agent_id, date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Bulk campaigns indexes
CREATE INDEX idx_bulk_campaigns_org_id ON bulk_campaigns(organization_id);
CREATE INDEX idx_bulk_campaigns_status ON bulk_campaigns(status);
CREATE INDEX idx_bulk_campaigns_created_at ON bulk_campaigns(created_at DESC);

CREATE INDEX idx_bulk_message_jobs_campaign_id ON bulk_message_jobs(campaign_id);
CREATE INDEX idx_bulk_message_jobs_status ON bulk_message_jobs(status);
CREATE INDEX idx_bulk_message_jobs_scheduled_at ON bulk_message_jobs(scheduled_at);

-- Drip campaigns indexes
CREATE INDEX idx_drip_campaigns_org_id ON drip_campaigns(organization_id);
CREATE INDEX idx_drip_campaigns_status ON drip_campaigns(status);
CREATE INDEX idx_drip_campaigns_trigger_type ON drip_campaigns(trigger_type);

CREATE INDEX idx_drip_steps_campaign_id ON drip_campaign_steps(campaign_id);
CREATE INDEX idx_drip_steps_order ON drip_campaign_steps(campaign_id, step_order);

CREATE INDEX idx_drip_enrollments_campaign_id ON drip_enrollments(campaign_id);
CREATE INDEX idx_drip_enrollments_contact_id ON drip_enrollments(contact_id);
CREATE INDEX idx_drip_enrollments_status ON drip_enrollments(status);
CREATE INDEX idx_drip_enrollments_next_message ON drip_enrollments(next_message_at) WHERE status = 'active';

CREATE INDEX idx_drip_message_logs_enrollment_id ON drip_message_logs(enrollment_id);
CREATE INDEX idx_drip_message_logs_status ON drip_message_logs(status);
CREATE INDEX idx_drip_message_logs_scheduled_at ON drip_message_logs(scheduled_at);

-- Analytics indexes
CREATE INDEX idx_campaign_analytics_org_date ON campaign_analytics(organization_id, date DESC);
CREATE INDEX idx_campaign_analytics_campaign ON campaign_analytics(campaign_id, campaign_type);

CREATE INDEX idx_agent_performance_org_date ON agent_performance_metrics(organization_id, date DESC);
CREATE INDEX idx_agent_performance_agent ON agent_performance_metrics(agent_id, date DESC);

CREATE INDEX idx_channel_sources_org_id ON channel_sources(organization_id);
CREATE INDEX idx_channel_sources_conversation ON channel_sources(conversation_id);
CREATE INDEX idx_channel_sources_type ON channel_sources(source_type);

CREATE INDEX idx_template_usage_org_date ON template_usage_analytics(organization_id, date DESC);
CREATE INDEX idx_template_usage_template ON template_usage_analytics(template_id, date DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_bulk_campaigns_updated_at
  BEFORE UPDATE ON bulk_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_message_jobs_updated_at
  BEFORE UPDATE ON bulk_message_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drip_campaigns_updated_at
  BEFORE UPDATE ON drip_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drip_campaign_steps_updated_at
  BEFORE UPDATE ON drip_campaign_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drip_enrollments_updated_at
  BEFORE UPDATE ON drip_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drip_message_logs_updated_at
  BEFORE UPDATE ON drip_message_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_analytics_updated_at
  BEFORE UPDATE ON campaign_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_performance_metrics_updated_at
  BEFORE UPDATE ON agent_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_usage_analytics_updated_at
  BEFORE UPDATE ON template_usage_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all tables follow same pattern: users access data in their organization)
CREATE POLICY "Users can access bulk campaigns in their org" ON bulk_campaigns
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access bulk message jobs in their org" ON bulk_message_jobs
  FOR ALL USING (
    campaign_id IN (SELECT id FROM bulk_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can access contact lists in their org" ON contact_lists
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access drip campaigns in their org" ON drip_campaigns
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access drip campaign steps in their org" ON drip_campaign_steps
  FOR ALL USING (
    campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can access drip enrollments in their org" ON drip_enrollments
  FOR ALL USING (
    campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can access drip message logs in their org" ON drip_message_logs
  FOR ALL USING (
    enrollment_id IN (
      SELECT id FROM drip_enrollments WHERE campaign_id IN (
        SELECT id FROM drip_campaigns WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view campaign analytics in their org" ON campaign_analytics
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view agent performance in their org" ON agent_performance_metrics
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view channel sources in their org" ON channel_sources
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view template usage in their org" ON template_usage_analytics
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update drip campaign statistics
CREATE OR REPLACE FUNCTION update_drip_campaign_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign statistics when enrollment status changes
  UPDATE drip_campaigns
  SET statistics = jsonb_set(
    statistics,
    '{totalEnrolled}',
    to_jsonb((SELECT COUNT(*) FROM drip_enrollments WHERE campaign_id = NEW.campaign_id))
  )
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drip_stats_on_enrollment
  AFTER INSERT OR UPDATE ON drip_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_drip_campaign_statistics();

-- Function to schedule next drip message
CREATE OR REPLACE FUNCTION schedule_next_drip_message(enrollment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_enrollment drip_enrollments%ROWTYPE;
  v_next_step drip_campaign_steps%ROWTYPE;
  v_next_message_time TIMESTAMPTZ;
BEGIN
  -- Get current enrollment
  SELECT * INTO v_enrollment FROM drip_enrollments WHERE id = enrollment_id;

  IF v_enrollment.status != 'active' THEN
    RETURN;
  END IF;

  -- Get next step
  SELECT * INTO v_next_step
  FROM drip_campaign_steps
  WHERE campaign_id = v_enrollment.campaign_id
    AND step_order > COALESCE(v_enrollment.current_step_order, 0)
  ORDER BY step_order
  LIMIT 1;

  IF v_next_step.id IS NULL THEN
    -- No more steps, mark as completed
    UPDATE drip_enrollments
    SET status = 'completed', completed_at = NOW()
    WHERE id = enrollment_id;
    RETURN;
  END IF;

  -- Calculate next message time
  v_next_message_time := NOW() +
    CASE v_next_step.delay_type
      WHEN 'minutes' THEN v_next_step.delay_value * INTERVAL '1 minute'
      WHEN 'hours' THEN v_next_step.delay_value * INTERVAL '1 hour'
      WHEN 'days' THEN v_next_step.delay_value * INTERVAL '1 day'
      WHEN 'weeks' THEN v_next_step.delay_value * INTERVAL '1 week'
    END;

  -- Update enrollment
  UPDATE drip_enrollments
  SET
    current_step_id = v_next_step.id,
    current_step_order = v_next_step.step_order,
    next_message_at = v_next_message_time
  WHERE id = enrollment_id;

  -- Create message log entry
  INSERT INTO drip_message_logs (
    enrollment_id,
    step_id,
    contact_id,
    scheduled_at
  ) VALUES (
    enrollment_id,
    v_next_step.id,
    v_enrollment.contact_id,
    v_next_message_time
  );
END;
$$ LANGUAGE plpgsql;

-- Function to track message delivery status updates
CREATE OR REPLACE FUNCTION track_message_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation metrics when message is delivered/read
  IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    -- Message just got delivered
    UPDATE campaign_analytics
    SET messages_delivered = messages_delivered + 1
    WHERE date = CURRENT_DATE
      AND organization_id IN (
        SELECT organization_id FROM conversations WHERE id = NEW.conversation_id
      );
  END IF;

  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    -- Message just got read
    UPDATE campaign_analytics
    SET messages_read = messages_read + 1
    WHERE date = CURRENT_DATE
      AND organization_id IN (
        SELECT organization_id FROM conversations WHERE id = NEW.conversation_id
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_message_delivery_trigger
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR NEW.read_at IS DISTINCT FROM OLD.read_at)
  EXECUTE FUNCTION track_message_delivery();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE bulk_campaigns IS 'Broadcast campaigns for sending messages to multiple contacts at once';
COMMENT ON TABLE drip_campaigns IS 'Automated message sequences triggered by events or manually';
COMMENT ON TABLE drip_enrollments IS 'Tracks which contacts are enrolled in which drip campaigns';
COMMENT ON TABLE campaign_analytics IS 'Aggregated analytics for both bulk and drip campaigns';
COMMENT ON TABLE agent_performance_metrics IS 'Daily performance metrics per agent';
COMMENT ON TABLE channel_sources IS 'Tracks the source/channel of each conversation (QR, widget, etc.)';
