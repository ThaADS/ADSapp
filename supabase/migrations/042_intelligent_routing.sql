-- Migration: Intelligent Routing & Load Balancing
-- Purpose: Agent capacity tracking and smart conversation routing
-- Version: 042
-- Created: 2025-01-05

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AGENT CAPACITY TABLE
-- ============================================================================
-- Real-time tracking of agent workload and availability
CREATE TABLE IF NOT EXISTS agent_capacity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Capacity Configuration
  max_concurrent_conversations INTEGER DEFAULT 10 CHECK (max_concurrent_conversations > 0),
  current_active_conversations INTEGER DEFAULT 0 CHECK (current_active_conversations >= 0),

  -- Status
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'away', 'offline', 'break')),
  status_message TEXT, -- Custom status message (e.g., "In meeting until 3 PM")

  -- Availability Schedule
  availability_schedule JSONB DEFAULT '{
    "timezone": "UTC",
    "working_hours": {
      "monday": {"start": "09:00", "end": "17:00", "enabled": true},
      "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
      "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
      "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
      "friday": {"start": "09:00", "end": "17:00", "enabled": true},
      "saturday": {"enabled": false},
      "sunday": {"enabled": false}
    },
    "breaks": [],
    "holidays": []
  }'::jsonb,

  -- Skills & Expertise
  skills JSONB DEFAULT '[]'::jsonb, -- ['sales', 'technical_support', 'billing']
  languages JSONB DEFAULT '["nl"]'::jsonb, -- ['nl', 'en', 'de']
  expertise_level TEXT DEFAULT 'intermediate' CHECK (expertise_level IN ('junior', 'intermediate', 'senior', 'expert')),

  -- Performance Metrics
  avg_response_time_seconds INTEGER DEFAULT 60,
  avg_resolution_time_minutes INTEGER DEFAULT 30,
  customer_satisfaction_score NUMERIC(3,2) DEFAULT 4.5 CHECK (customer_satisfaction_score >= 0 AND customer_satisfaction_score <= 5),
  total_conversations_handled INTEGER DEFAULT 0,

  -- Activity Tracking
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  last_status_change_at TIMESTAMPTZ DEFAULT NOW(),
  total_online_minutes_today INTEGER DEFAULT 0,

  -- Preferences
  auto_assign_enabled BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "sms": false,
    "desktop": true
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one capacity record per agent per organization
  UNIQUE(agent_id, organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_capacity_agent_id ON agent_capacity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_organization_id ON agent_capacity(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_status ON agent_capacity(status) WHERE auto_assign_enabled = true;
CREATE INDEX IF NOT EXISTS idx_agent_capacity_workload ON agent_capacity(current_active_conversations, max_concurrent_conversations);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_skills ON agent_capacity USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_languages ON agent_capacity USING GIN(languages);

-- RLS Policies
ALTER TABLE agent_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_capacity_tenant_isolation ON agent_capacity
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- CONVERSATION QUEUE TABLE
-- ============================================================================
-- Priority queue for unassigned conversations
CREATE TABLE IF NOT EXISTS conversation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Queue Priority
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest, 10 = lowest
  priority_reason TEXT, -- Why this priority was assigned

  -- Routing Requirements
  required_skills JSONB DEFAULT '[]'::jsonb,
  required_language TEXT,
  preferred_agent_id UUID REFERENCES profiles(id),

  -- Queue Metadata
  queue_position INTEGER, -- Position in queue (1 = first)
  estimated_wait_time_minutes INTEGER,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,

  -- Assignment Info
  assigned_to UUID REFERENCES profiles(id),
  assignment_method TEXT CHECK (assignment_method IN ('manual', 'auto_round_robin', 'auto_least_loaded', 'auto_skill_based', 'auto_priority')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_queue_conversation_id ON conversation_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_queue_organization_id ON conversation_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_queue_priority ON conversation_queue(priority) WHERE assigned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_queue_queued_at ON conversation_queue(queued_at) WHERE assigned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_queue_assigned_to ON conversation_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversation_queue_skills ON conversation_queue USING GIN(required_skills);

-- RLS Policies
ALTER TABLE conversation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_queue_tenant_isolation ON conversation_queue
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ROUTING RULES TABLE
-- ============================================================================
-- Configurable routing strategies per organization
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rule Configuration
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100 CHECK (priority > 0), -- Higher = executed first

  -- Routing Strategy
  strategy TEXT NOT NULL CHECK (strategy IN ('round_robin', 'least_loaded', 'skill_based', 'priority_based', 'custom')),
  strategy_config JSONB DEFAULT '{}'::jsonb,

  -- Conditions
  conditions JSONB DEFAULT '{}'::jsonb, -- When to apply this rule
  -- Example: {"contact_tags": ["vip"], "message_contains": ["urgent"], "time_of_day": "business_hours"}

  -- Fallback
  fallback_strategy TEXT DEFAULT 'round_robin',
  fallback_agent_id UUID REFERENCES profiles(id), -- Fallback to specific agent if no one available

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routing_rules_organization_id ON routing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_is_active ON routing_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules(priority DESC) WHERE is_active = true;

-- RLS Policies
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY routing_rules_tenant_isolation ON routing_rules
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ROUTING HISTORY TABLE
-- ============================================================================
-- Track all routing decisions for analytics
CREATE TABLE IF NOT EXISTS routing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Routing Details
  assigned_to UUID REFERENCES profiles(id),
  routing_strategy TEXT NOT NULL,
  routing_rule_id UUID REFERENCES routing_rules(id),

  -- Decision Info
  available_agents JSONB DEFAULT '[]'::jsonb, -- List of agent IDs considered
  workload_scores JSONB DEFAULT '{}'::jsonb, -- {agent_id: workload_score}
  selection_reason TEXT,

  -- Timing
  queue_time_seconds INTEGER, -- Time spent in queue before assignment
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Outcome
  accepted BOOLEAN, -- Did agent accept the assignment?
  accepted_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routing_history_conversation_id ON routing_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_organization_id ON routing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_assigned_to ON routing_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routing_history_assigned_at ON routing_history(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_history_routing_strategy ON routing_history(routing_strategy);

-- RLS Policies
ALTER TABLE routing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY routing_history_tenant_isolation ON routing_history
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
CREATE OR REPLACE FUNCTION update_routing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER agent_capacity_updated_at
  BEFORE UPDATE ON agent_capacity
  FOR EACH ROW
  EXECUTE FUNCTION update_routing_updated_at();

CREATE TRIGGER routing_rules_updated_at
  BEFORE UPDATE ON routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_routing_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get available agents for routing
CREATE OR REPLACE FUNCTION get_available_agents(org_id UUID)
RETURNS TABLE (
  agent_id UUID,
  current_load INTEGER,
  max_load INTEGER,
  load_percentage NUMERIC,
  skills JSONB,
  languages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.agent_id,
    ac.current_active_conversations,
    ac.max_concurrent_conversations,
    ROUND((ac.current_active_conversations::NUMERIC / ac.max_concurrent_conversations::NUMERIC) * 100, 2) AS load_percentage,
    ac.skills,
    ac.languages
  FROM agent_capacity ac
  WHERE ac.organization_id = org_id
    AND ac.status = 'available'
    AND ac.auto_assign_enabled = true
    AND ac.current_active_conversations < ac.max_concurrent_conversations
  ORDER BY load_percentage ASC, ac.avg_response_time_seconds ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update agent workload after assignment
CREATE OR REPLACE FUNCTION update_agent_workload()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization_id from conversation
  SELECT organization_id INTO org_id FROM conversations WHERE id = NEW.id;

  -- If conversation is assigned, increment agent's active count
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    UPDATE agent_capacity
    SET
      current_active_conversations = current_active_conversations + 1,
      last_activity_at = NOW(),
      status = CASE
        WHEN current_active_conversations + 1 >= max_concurrent_conversations THEN 'busy'
        ELSE status
      END
    WHERE agent_id = NEW.assigned_to AND organization_id = org_id;

    -- Decrement previous agent if reassigned
    IF OLD.assigned_to IS NOT NULL THEN
      UPDATE agent_capacity
      SET
        current_active_conversations = GREATEST(current_active_conversations - 1, 0),
        status = CASE
          WHEN current_active_conversations - 1 < max_concurrent_conversations THEN 'available'
          ELSE status
        END
      WHERE agent_id = OLD.assigned_to AND organization_id = org_id;
    END IF;
  END IF;

  -- If conversation is closed/resolved, decrement agent's active count
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') AND NEW.assigned_to IS NOT NULL THEN
    UPDATE agent_capacity
    SET
      current_active_conversations = GREATEST(current_active_conversations - 1, 0),
      total_conversations_handled = total_conversations_handled + 1,
      status = CASE
        WHEN current_active_conversations - 1 < max_concurrent_conversations THEN 'available'
        ELSE status
      END
    WHERE agent_id = NEW.assigned_to AND organization_id = org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update agent workload
CREATE TRIGGER conversations_update_agent_workload
  AFTER INSERT OR UPDATE OF assigned_to, status ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_workload();

-- ============================================================================
-- DEFAULT ROUTING RULE
-- ============================================================================
-- Create default round-robin routing rule for each organization
CREATE OR REPLACE FUNCTION create_default_routing_rule()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO routing_rules (
    organization_id,
    name,
    description,
    strategy,
    is_active,
    priority
  ) VALUES (
    NEW.id,
    'Default Round-Robin Routing',
    'Automatically distribute conversations evenly across available agents',
    'round_robin',
    true,
    1000
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default routing rule for new organizations
CREATE TRIGGER organizations_create_default_routing
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_routing_rule();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE agent_capacity IS 'Real-time tracking of agent workload, availability, skills, and performance metrics';
COMMENT ON TABLE conversation_queue IS 'Priority queue for unassigned conversations with routing requirements';
COMMENT ON TABLE routing_rules IS 'Configurable routing strategies with conditions and fallbacks';
COMMENT ON TABLE routing_history IS 'Complete audit trail of all routing decisions for analytics and optimization';

COMMENT ON FUNCTION get_available_agents IS 'Returns list of available agents sorted by workload for smart routing';
COMMENT ON FUNCTION update_agent_workload IS 'Automatically maintains accurate agent workload counts based on conversation assignments';
