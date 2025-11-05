-- Migration: Workflow Execution Engine
-- Purpose: Add workflow execution tracking and state management
-- Version: 041
-- Created: 2025-01-05

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- WORKFLOW EXECUTIONS TABLE
-- ============================================================================
-- Tracks individual workflow executions with state management
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  workflow_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Execution State
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled')),
  current_node_id TEXT, -- Current node being executed
  execution_path TEXT[], -- Array of node IDs executed so far

  -- Execution Data
  execution_data JSONB DEFAULT '{}'::jsonb, -- Node states, variables, intermediate results
  input_data JSONB DEFAULT '{}'::jsonb, -- Initial trigger data
  output_data JSONB DEFAULT '{}'::jsonb, -- Final workflow results

  -- Error Handling
  error_message TEXT,
  error_node_id TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  triggered_by UUID REFERENCES profiles(id), -- User or system that triggered
  trigger_type TEXT, -- 'manual', 'webhook', 'schedule', 'event'
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_conversation_id ON workflow_executions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_node ON workflow_executions(current_node_id) WHERE status = 'running';

-- RLS Policies
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_executions_tenant_isolation ON workflow_executions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- WORKFLOW EXECUTION LOGS TABLE
-- ============================================================================
-- Detailed logs for each step in workflow execution
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Log Details
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'condition', 'action', 'delay', 'webhook', 'ai_response')),

  -- Execution Info
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,

  -- Error Details
  error_message TEXT,
  error_code TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution_id ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_organization_id ON workflow_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_node_id ON workflow_execution_logs(node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_status ON workflow_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_started_at ON workflow_execution_logs(started_at DESC);

-- RLS Policies
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_execution_logs_tenant_isolation ON workflow_execution_logs
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- WORKFLOW SCHEDULES TABLE
-- ============================================================================
-- Time-based workflow scheduling
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  workflow_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Schedule Configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'recurring', 'cron')),
  schedule_config JSONB NOT NULL, -- {time, date, interval, cron_expression}
  timezone TEXT DEFAULT 'UTC',

  -- Execution Control
  is_active BOOLEAN DEFAULT true,
  next_execution_at TIMESTAMPTZ,
  last_execution_at TIMESTAMPTZ,
  last_execution_status TEXT,

  -- Limits
  max_executions INTEGER, -- NULL = unlimited
  execution_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_organization_id ON workflow_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_execution ON workflow_schedules(next_execution_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_is_active ON workflow_schedules(is_active);

-- RLS Policies
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_schedules_tenant_isolation ON workflow_schedules
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- WORKFLOW VARIABLES TABLE
-- ============================================================================
-- Global variables that can be used across workflows
CREATE TABLE IF NOT EXISTS workflow_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Variable Definition
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'object', 'array')),

  -- Metadata
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per organization
  UNIQUE(organization_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_variables_organization_id ON workflow_variables(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_variables_key ON workflow_variables(key);

-- RLS Policies
ALTER TABLE workflow_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_variables_tenant_isolation ON workflow_variables
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update workflow execution updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_execution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflow_executions
CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_execution_updated_at();

-- Trigger for workflow_schedules
CREATE TRIGGER workflow_schedules_updated_at
  BEFORE UPDATE ON workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_execution_updated_at();

-- Trigger for workflow_variables
CREATE TRIGGER workflow_variables_updated_at
  BEFORE UPDATE ON workflow_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_execution_updated_at();

-- ============================================================================
-- CLEANUP OLD EXECUTIONS FUNCTION
-- ============================================================================
-- Function to clean up old workflow executions (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_workflow_executions(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workflow_executions
  WHERE completed_at < NOW() - INTERVAL '1 day' * retention_days
    AND status IN ('completed', 'failed', 'cancelled');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE workflow_executions IS 'Tracks individual workflow executions with state management and error handling';
COMMENT ON TABLE workflow_execution_logs IS 'Detailed step-by-step logs for workflow execution debugging';
COMMENT ON TABLE workflow_schedules IS 'Time-based scheduling for workflows (once, recurring, cron)';
COMMENT ON TABLE workflow_variables IS 'Global variables accessible across all workflows in an organization';

COMMENT ON COLUMN workflow_executions.execution_path IS 'Array of node IDs showing the path taken through the workflow';
COMMENT ON COLUMN workflow_executions.execution_data IS 'JSONB storing node states, variables, and intermediate results';
COMMENT ON COLUMN workflow_execution_logs.duration_ms IS 'Auto-calculated duration in milliseconds for each node execution';
