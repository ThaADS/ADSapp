-- Migration 045: Escalation Rules Table
-- Creates table for SLA monitoring and automated escalation policies

-- Escalation Rules Table
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rule Configuration
  rule_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),

  -- SLA Configuration
  sla_threshold_minutes INTEGER NOT NULL DEFAULT 30 CHECK (sla_threshold_minutes > 0),

  -- Escalation Target
  escalation_target TEXT NOT NULL CHECK (escalation_target IN ('manager', 'team_lead', 'senior_agent', 'custom')),

  -- Notification Configuration
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],

  -- Conditions (JSON for flexible configuration)
  conditions JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(organization_id, rule_name)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_org ON escalation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(organization_id, priority) WHERE is_active = true;

-- Row Level Security (RLS) Policy
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_escalation_rules ON escalation_rules
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_escalation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_escalation_rules_updated_at
BEFORE UPDATE ON escalation_rules
FOR EACH ROW
EXECUTE FUNCTION update_escalation_rules_updated_at();

-- Comments for Documentation
COMMENT ON TABLE escalation_rules IS 'Automated escalation rules based on SLA thresholds and conversation priority';
COMMENT ON COLUMN escalation_rules.sla_threshold_minutes IS 'Escalate if no response within this many minutes';
COMMENT ON COLUMN escalation_rules.escalation_target IS 'Who to escalate to: manager, team_lead, senior_agent, or custom';
COMMENT ON COLUMN escalation_rules.notification_channels IS 'Array of notification methods: email, sms, in_app, webhook';
COMMENT ON COLUMN escalation_rules.conditions IS 'Additional conditions like min_priority, required_tags, business_hours_only';
COMMENT ON COLUMN escalation_rules.priority IS 'Rule evaluation order (lower number = higher priority)';
