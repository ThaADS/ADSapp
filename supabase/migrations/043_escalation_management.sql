-- Migration: Escalation Management & SLA Tracking
-- Purpose: Automated escalation rules and SLA monitoring
-- Version: 043
-- Created: 2025-01-05

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ESCALATION RULES TABLE
-- ============================================================================
-- Configurable escalation rules with multiple trigger types
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rule Configuration
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100 CHECK (priority > 0), -- Higher = checked first

  -- Trigger Conditions
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'time_based',        -- No response in X minutes
    'priority_based',    -- Auto-escalate high/urgent conversations
    'keyword_based',     -- Specific words trigger escalation
    'sentiment_based',   -- Negative sentiment detected
    'agent_unavailable', -- Assigned agent offline
    'sla_breach',        -- SLA threshold exceeded
    'manual'             -- Manual escalation trigger
  )),

  trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example for time_based: {"no_response_minutes": 30, "apply_to_priorities": ["high", "urgent"]}
  -- Example for keyword_based: {"keywords": ["refund", "complaint", "manager", "cancel subscription"]}
  -- Example for sentiment_based: {"sentiment_threshold": -0.5, "consecutive_negative": 3}

  -- Escalation Path
  escalation_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"level": 1, "agent_ids": ["uuid1", "uuid2"], "wait_minutes": 15},
  --   {"level": 2, "agent_ids": ["uuid3"], "wait_minutes": 30},
  --   {"level": 3, "role": "admin", "notify_all": true}
  -- ]

  -- SLA Configuration
  sla_threshold_minutes INTEGER, -- Max time before escalation
  sla_applies_to TEXT[] DEFAULT ARRAY['all'], -- ['all', 'high', 'urgent', 'vip']

  -- Notification Configuration
  notification_config JSONB DEFAULT '{
    "email": true,
    "sms": false,
    "push": true,
    "in_app": true,
    "slack": false,
    "webhook": false
  }'::jsonb,

  notification_template JSONB DEFAULT '{
    "subject": "Escalation Required: {{conversation_id}}",
    "body": "Conversation {{conversation_id}} has been escalated due to {{reason}}. Priority: {{priority}}",
    "webhook_url": null
  }'::jsonb,

  -- Auto-Actions
  auto_actions JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"action": "add_tag", "value": "escalated"}, {"action": "set_priority", "value": "urgent"}]

  -- Business Hours
  apply_during_business_hours_only BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalation_rules_organization_id ON escalation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_is_active ON escalation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_priority ON escalation_rules(priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_trigger_type ON escalation_rules(trigger_type) WHERE is_active = true;

-- RLS Policies
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY escalation_rules_tenant_isolation ON escalation_rules
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ESCALATION HISTORY TABLE
-- ============================================================================
-- Complete audit trail of all escalations
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  escalation_rule_id UUID REFERENCES escalation_rules(id),

  -- Escalation Details
  escalation_level INTEGER DEFAULT 1 CHECK (escalation_level > 0),
  escalation_reason TEXT NOT NULL,
  trigger_type TEXT NOT NULL,

  -- Assignment
  escalated_from UUID REFERENCES profiles(id), -- Previous agent (NULL if unassigned)
  escalated_to UUID REFERENCES profiles(id), -- New agent
  escalation_path JSONB DEFAULT '[]'::jsonb, -- Full path taken

  -- Timing
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ, -- When new agent acknowledged
  resolved_at TIMESTAMPTZ, -- When issue was resolved
  resolution_time_minutes INTEGER,

  -- Resolution
  resolution_notes TEXT,
  resolution_status TEXT CHECK (resolution_status IN ('resolved', 'cancelled', 'pending', 'escalated_further')),

  -- Notifications Sent
  notifications_sent JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "email", "to": "agent@example.com", "sent_at": "2025-01-05T10:30:00Z", "status": "delivered"}]

  -- Performance Metrics
  sla_breached BOOLEAN DEFAULT false,
  sla_breach_minutes INTEGER,
  customer_satisfaction_impact NUMERIC(3,2), -- How much did escalation affect CSAT?

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalation_history_conversation_id ON escalation_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_organization_id ON escalation_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_escalated_from ON escalation_history(escalated_from);
CREATE INDEX IF NOT EXISTS idx_escalation_history_escalated_to ON escalation_history(escalated_to);
CREATE INDEX IF NOT EXISTS idx_escalation_history_escalated_at ON escalation_history(escalated_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalation_history_rule_id ON escalation_history(escalation_rule_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_sla_breached ON escalation_history(sla_breached) WHERE sla_breached = true;

-- RLS Policies
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY escalation_history_tenant_isolation ON escalation_history
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- SLA CONFIGURATIONS TABLE
-- ============================================================================
-- Service Level Agreement configurations per organization
CREATE TABLE IF NOT EXISTS sla_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- SLA Tiers
  sla_tier TEXT NOT NULL DEFAULT 'standard' CHECK (sla_tier IN ('basic', 'standard', 'premium', 'vip', 'custom')),
  name TEXT NOT NULL,
  description TEXT,

  -- First Response SLA
  first_response_target_minutes INTEGER NOT NULL DEFAULT 60,
  first_response_warning_minutes INTEGER, -- Warning threshold (e.g., 80% of target)

  -- Resolution SLA
  resolution_target_minutes INTEGER NOT NULL DEFAULT 1440, -- 24 hours
  resolution_warning_minutes INTEGER,

  -- Priority Multipliers
  priority_multipliers JSONB DEFAULT '{
    "urgent": 0.25,
    "high": 0.5,
    "medium": 1.0,
    "low": 2.0
  }'::jsonb,

  -- Business Hours
  business_hours_only BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',
  working_hours JSONB DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false}
  }'::jsonb,

  holidays JSONB DEFAULT '[]'::jsonb, -- Array of date strings

  -- Auto-Escalation
  auto_escalate_on_breach BOOLEAN DEFAULT true,
  escalation_rule_id UUID REFERENCES escalation_rules(id),

  -- Notification Thresholds
  notify_at_percentages INTEGER[] DEFAULT ARRAY[50, 75, 90, 100], -- Notify when 50%, 75%, 90%, 100% of SLA consumed

  -- Applies To
  applies_to_tags TEXT[] DEFAULT ARRAY['all'],
  applies_to_priorities TEXT[] DEFAULT ARRAY['all'],

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(organization_id, sla_tier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sla_configurations_organization_id ON sla_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_configurations_is_active ON sla_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sla_configurations_tier ON sla_configurations(sla_tier);

-- RLS Policies
ALTER TABLE sla_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_configurations_tenant_isolation ON sla_configurations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- SLA TRACKING TABLE
-- ============================================================================
-- Real-time SLA tracking per conversation
CREATE TABLE IF NOT EXISTS sla_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sla_config_id UUID REFERENCES sla_configurations(id),

  -- First Response Tracking
  first_response_target_at TIMESTAMPTZ,
  first_response_occurred_at TIMESTAMPTZ,
  first_response_sla_met BOOLEAN,
  first_response_breach_minutes INTEGER,

  -- Resolution Tracking
  resolution_target_at TIMESTAMPTZ,
  resolution_occurred_at TIMESTAMPTZ,
  resolution_sla_met BOOLEAN,
  resolution_breach_minutes INTEGER,

  -- Pause/Resume (for business hours only SLAs)
  total_paused_minutes INTEGER DEFAULT 0,
  currently_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,

  -- Warnings Sent
  warnings_sent JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"threshold": 75, "sent_at": "2025-01-05T10:30:00Z"}]

  -- Status
  overall_sla_status TEXT DEFAULT 'on_track' CHECK (overall_sla_status IN ('on_track', 'at_risk', 'breached')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sla_tracking_conversation_id ON sla_tracking(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_organization_id ON sla_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_sla_config_id ON sla_tracking(sla_config_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_status ON sla_tracking(overall_sla_status);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_first_response_target ON sla_tracking(first_response_target_at) WHERE first_response_occurred_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sla_tracking_resolution_target ON sla_tracking(resolution_target_at) WHERE resolution_occurred_at IS NULL;

-- RLS Policies
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_tracking_tenant_isolation ON sla_tracking
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_escalation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER escalation_rules_updated_at
  BEFORE UPDATE ON escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_updated_at();

CREATE TRIGGER sla_configurations_updated_at
  BEFORE UPDATE ON sla_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_updated_at();

CREATE TRIGGER sla_tracking_updated_at
  BEFORE UPDATE ON sla_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Initialize SLA tracking for new conversation
CREATE OR REPLACE FUNCTION initialize_sla_tracking()
RETURNS TRIGGER AS $$
DECLARE
  sla_config RECORD;
  first_response_minutes INTEGER;
  resolution_minutes INTEGER;
BEGIN
  -- Get applicable SLA configuration
  SELECT * INTO sla_config
  FROM sla_configurations
  WHERE organization_id = NEW.organization_id
    AND is_active = true
  ORDER BY
    CASE
      WHEN NEW.priority = 'urgent' AND 'urgent' = ANY(applies_to_priorities) THEN 1
      WHEN NEW.priority = 'high' AND 'high' = ANY(applies_to_priorities) THEN 2
      WHEN 'all' = ANY(applies_to_priorities) THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF sla_config.id IS NOT NULL THEN
    -- Calculate target times based on priority
    first_response_minutes := sla_config.first_response_target_minutes *
      (sla_config.priority_multipliers->>(NEW.priority))::NUMERIC;

    resolution_minutes := sla_config.resolution_target_minutes *
      (sla_config.priority_multipliers->>(NEW.priority))::NUMERIC;

    -- Insert SLA tracking record
    INSERT INTO sla_tracking (
      conversation_id,
      organization_id,
      sla_config_id,
      first_response_target_at,
      resolution_target_at
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      sla_config.id,
      NOW() + (first_response_minutes || ' minutes')::INTERVAL,
      NOW() + (resolution_minutes || ' minutes')::INTERVAL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create SLA tracking
CREATE TRIGGER conversations_initialize_sla
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION initialize_sla_tracking();

-- Update SLA tracking on conversation events
CREATE OR REPLACE FUNCTION update_sla_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update first response time
  IF NEW.last_message_at IS NOT NULL AND OLD.last_message_at IS NULL THEN
    UPDATE sla_tracking
    SET
      first_response_occurred_at = NEW.last_message_at,
      first_response_sla_met = (NEW.last_message_at <= first_response_target_at),
      first_response_breach_minutes = CASE
        WHEN NEW.last_message_at > first_response_target_at
        THEN EXTRACT(EPOCH FROM (NEW.last_message_at - first_response_target_at)) / 60
        ELSE NULL
      END,
      overall_sla_status = CASE
        WHEN NEW.last_message_at > first_response_target_at THEN 'breached'
        ELSE overall_sla_status
      END
    WHERE conversation_id = NEW.id;
  END IF;

  -- Update resolution time
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    UPDATE sla_tracking
    SET
      resolution_occurred_at = NOW(),
      resolution_sla_met = (NOW() <= resolution_target_at),
      resolution_breach_minutes = CASE
        WHEN NOW() > resolution_target_at
        THEN EXTRACT(EPOCH FROM (NOW() - resolution_target_at)) / 60
        ELSE NULL
      END,
      overall_sla_status = CASE
        WHEN NOW() > resolution_target_at THEN 'breached'
        WHEN overall_sla_status != 'breached' THEN 'on_track'
        ELSE overall_sla_status
      END
    WHERE conversation_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for SLA updates
CREATE TRIGGER conversations_update_sla
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_tracking();

-- ============================================================================
-- DEFAULT SLA CONFIGURATION
-- ============================================================================
-- Create default SLA config for new organizations
CREATE OR REPLACE FUNCTION create_default_sla_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sla_configurations (
    organization_id,
    sla_tier,
    name,
    description,
    first_response_target_minutes,
    resolution_target_minutes,
    is_active
  ) VALUES (
    NEW.id,
    'standard',
    'Standard SLA',
    'Default service level agreement for all conversations',
    60,  -- 1 hour first response
    1440, -- 24 hours resolution
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new organizations
CREATE TRIGGER organizations_create_default_sla
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_sla_config();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE escalation_rules IS 'Configurable escalation rules with multiple trigger types and notification options';
COMMENT ON TABLE escalation_history IS 'Complete audit trail of all escalations for analytics and compliance';
COMMENT ON TABLE sla_configurations IS 'Service Level Agreement configurations with business hours support';
COMMENT ON TABLE sla_tracking IS 'Real-time SLA tracking per conversation with breach detection';

COMMENT ON FUNCTION initialize_sla_tracking IS 'Automatically creates SLA tracking record for new conversations';
COMMENT ON FUNCTION update_sla_tracking IS 'Updates SLA metrics when conversations receive responses or are resolved';
