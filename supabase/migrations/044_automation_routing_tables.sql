-- Migration 044: Automation Routing & Load Balancing Tables
-- Creates tables for intelligent conversation routing and agent capacity management

-- Agent Capacity Tracking Table
CREATE TABLE IF NOT EXISTS agent_capacity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Capacity Configuration
  max_concurrent_conversations INTEGER NOT NULL DEFAULT 5,
  auto_assign_enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),

  -- Skills & Languages
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY['nl']::TEXT[],

  -- Real-Time Metrics
  current_active_conversations INTEGER NOT NULL DEFAULT 0,
  avg_response_time_seconds NUMERIC(10,2) DEFAULT 60.0,
  customer_satisfaction_score NUMERIC(3,2) DEFAULT 4.5 CHECK (customer_satisfaction_score >= 0 AND customer_satisfaction_score <= 5),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, agent_id)
);

-- Routing Rules Configuration Table
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rule Configuration
  rule_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  strategy TEXT NOT NULL CHECK (strategy IN ('round_robin', 'least_loaded', 'skill_based', 'priority_based', 'custom')),
  strategy_config JSONB DEFAULT '{}'::JSONB,

  -- Conditions
  conditions JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(organization_id, rule_name)
);

-- Conversation Queue Table
CREATE TABLE IF NOT EXISTS conversation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Queue Management
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),
  assignment_method TEXT,

  -- Routing Requirements
  required_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  required_language TEXT,
  preferred_agent_id UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(conversation_id)
);

-- Routing History Table (Analytics)
CREATE TABLE IF NOT EXISTS routing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Routing Decision
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  routing_strategy TEXT NOT NULL,
  available_agents UUID[] NOT NULL,
  workload_scores JSONB DEFAULT '{}'::JSONB,
  selection_reason TEXT,

  -- Outcome Tracking
  accepted BOOLEAN NOT NULL DEFAULT true,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  routed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for analytics
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_agent_capacity_org ON agent_capacity(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_agent ON agent_capacity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_capacity_status ON agent_capacity(organization_id, status) WHERE auto_assign_enabled = true;

CREATE INDEX IF NOT EXISTS idx_routing_rules_org ON routing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON routing_rules(organization_id, priority) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversation_queue_org ON conversation_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_queue_unassigned ON conversation_queue(organization_id, priority, queued_at) WHERE assigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_routing_history_org ON routing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_agent ON routing_history(assigned_to, created_at);
CREATE INDEX IF NOT EXISTS idx_routing_history_conversation ON routing_history(conversation_id);

-- Row Level Security (RLS) Policies

-- Agent Capacity RLS
ALTER TABLE agent_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agent_capacity ON agent_capacity
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Routing Rules RLS
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_routing_rules ON routing_rules
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Conversation Queue RLS
ALTER TABLE conversation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_conversation_queue ON conversation_queue
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Routing History RLS
ALTER TABLE routing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_routing_history ON routing_history
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Triggers for updated_at

-- Agent Capacity
CREATE OR REPLACE FUNCTION update_agent_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_capacity_updated_at
BEFORE UPDATE ON agent_capacity
FOR EACH ROW
EXECUTE FUNCTION update_agent_capacity_updated_at();

-- Routing Rules
CREATE OR REPLACE FUNCTION update_routing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_routing_rules_updated_at
BEFORE UPDATE ON routing_rules
FOR EACH ROW
EXECUTE FUNCTION update_routing_rules_updated_at();

-- Conversation Queue
CREATE OR REPLACE FUNCTION update_conversation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_queue_updated_at
BEFORE UPDATE ON conversation_queue
FOR EACH ROW
EXECUTE FUNCTION update_conversation_queue_updated_at();

-- Comments for Documentation
COMMENT ON TABLE agent_capacity IS 'Tracks agent availability, capacity, and performance metrics for intelligent routing';
COMMENT ON TABLE routing_rules IS 'Defines organization-specific routing strategies and conditions';
COMMENT ON TABLE conversation_queue IS 'Manages conversation queue when agents are unavailable';
COMMENT ON TABLE routing_history IS 'Audit log of all routing decisions for analytics and optimization';

COMMENT ON COLUMN agent_capacity.max_concurrent_conversations IS 'Maximum number of simultaneous conversations an agent can handle';
COMMENT ON COLUMN agent_capacity.auto_assign_enabled IS 'Whether this agent accepts automatic conversation assignments';
COMMENT ON COLUMN agent_capacity.skills IS 'Array of agent skills (e.g., technical, billing, sales)';
COMMENT ON COLUMN agent_capacity.languages IS 'Languages the agent can communicate in';
COMMENT ON COLUMN agent_capacity.current_active_conversations IS 'Real-time count of active conversations';

COMMENT ON COLUMN routing_rules.strategy IS 'Routing algorithm: round_robin, least_loaded, skill_based, priority_based, or custom';
COMMENT ON COLUMN routing_rules.strategy_config IS 'Additional configuration for the selected strategy';
COMMENT ON COLUMN routing_rules.priority IS 'Rule evaluation order (lower number = higher priority)';

COMMENT ON COLUMN conversation_queue.priority IS 'Queue priority 1=urgent to 10=low';
COMMENT ON COLUMN conversation_queue.assignment_method IS 'How the conversation was assigned (e.g., auto_least_loaded)';

COMMENT ON COLUMN routing_history.workload_scores IS 'Agent workload percentages at time of routing decision';
COMMENT ON COLUMN routing_history.selection_reason IS 'Human-readable explanation of why this agent was selected';
