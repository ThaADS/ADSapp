-- ============================================================================
-- WORKFLOW SYSTEM MIGRATION
-- ============================================================================
-- Description: Complete workflow builder system with execution tracking
-- Created: 2025-11-09
-- Purpose: Enable visual workflow automation for WhatsApp campaigns
-- ============================================================================

-- ============================================================================
-- WORKFLOWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'automation', 'drip_campaign', 'broadcast', 'custom'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'

  -- Workflow definition
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',

  -- Settings
  settings JSONB NOT NULL DEFAULT '{
    "allowReentry": false,
    "stopOnError": true,
    "trackConversions": false,
    "maxExecutionsPerContact": null,
    "timezone": "UTC"
  }'::jsonb,

  -- Statistics
  stats JSONB DEFAULT '{
    "totalExecutions": 0,
    "activeExecutions": 0,
    "completedExecutions": 0,
    "failedExecutions": 0,
    "conversionRate": 0
  }'::jsonb,

  -- Version control
  version INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_workflow_type CHECK (type IN ('automation', 'drip_campaign', 'broadcast', 'custom')),
  CONSTRAINT valid_workflow_status CHECK (status IN ('draft', 'active', 'paused', 'archived'))
);

-- Indexes for workflows
CREATE INDEX idx_workflows_organization ON workflows(organization_id, status);
CREATE INDEX idx_workflows_type ON workflows(type);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);

-- ============================================================================
-- WORKFLOW EXECUTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'waiting', 'completed', 'failed', 'cancelled'

  -- Execution tracking
  current_node_id TEXT,
  execution_path JSONB DEFAULT '[]', -- Array of node IDs visited

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ, -- For delayed nodes

  -- Error handling
  error_message TEXT,
  error_node_id TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Context data (persisted across execution)
  context JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_execution_status CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'cancelled'))
);

-- Indexes for workflow_executions
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id, status);
CREATE INDEX idx_executions_contact ON workflow_executions(contact_id);
CREATE INDEX idx_executions_organization ON workflow_executions(organization_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_next_at ON workflow_executions(next_execution_at) WHERE next_execution_at IS NOT NULL;

-- ============================================================================
-- WORKFLOW VERSIONS TABLE (for version history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Snapshot of workflow at this version
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  settings JSONB NOT NULL,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_note TEXT,

  -- Constraints
  UNIQUE(workflow_id, version)
);

CREATE INDEX idx_workflow_versions ON workflow_versions(workflow_id, version DESC);

-- ============================================================================
-- WORKFLOW TEMPLATES TABLE (pre-built templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template information
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'onboarding', 'nurturing', 'support', 'marketing', etc.
  preview_image_url TEXT,

  -- Template definition
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  default_settings JSONB DEFAULT '{}',

  -- Metadata
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_featured ON workflow_templates(is_featured) WHERE is_featured = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Workflows RLS policies
CREATE POLICY "Users can view workflows in their organization"
  ON workflows FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert workflows in their organization"
  ON workflows FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflows in their organization"
  ON workflows FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workflows in their organization"
  ON workflows FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workflow Executions RLS policies
CREATE POLICY "Users can view executions in their organization"
  ON workflow_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert executions in their organization"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update executions in their organization"
  ON workflow_executions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workflow Versions RLS policies
CREATE POLICY "Users can view workflow versions in their organization"
  ON workflow_versions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert workflow versions in their organization"
  ON workflow_versions FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Workflow Templates RLS policies (public read, admin write)
CREATE POLICY "Anyone can view public templates"
  ON workflow_templates FOR SELECT
  USING (is_public = true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflows
CREATE TRIGGER set_workflow_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- Trigger for workflow_executions
CREATE TRIGGER set_execution_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- Function to create workflow version on update
CREATE OR REPLACE FUNCTION create_workflow_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if nodes or edges changed
  IF (OLD.nodes IS DISTINCT FROM NEW.nodes) OR (OLD.edges IS DISTINCT FROM NEW.edges) THEN
    INSERT INTO workflow_versions (
      workflow_id,
      version,
      name,
      description,
      nodes,
      edges,
      settings,
      created_by,
      change_note
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.name,
      OLD.description,
      OLD.nodes,
      OLD.edges,
      OLD.settings,
      auth.uid(),
      'Auto-save before update'
    );

    -- Increment version number
    NEW.version = OLD.version + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-version workflows
CREATE TRIGGER auto_version_workflow
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_version();

-- Function to update workflow stats
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats in workflows table
  UPDATE workflows
  SET stats = jsonb_set(
    COALESCE(stats, '{}'::jsonb),
    CASE
      WHEN NEW.status = 'running' THEN '{activeExecutions}'
      WHEN NEW.status = 'completed' THEN '{completedExecutions}'
      WHEN NEW.status = 'failed' THEN '{failedExecutions}'
      ELSE '{totalExecutions}'
    END,
    to_jsonb(COALESCE((stats->>CASE
      WHEN NEW.status = 'running' THEN 'activeExecutions'
      WHEN NEW.status = 'completed' THEN 'completedExecutions'
      WHEN NEW.status = 'failed' THEN 'failedExecutions'
      ELSE 'totalExecutions'
    END)::int, 0) + 1)
  )
  WHERE id = NEW.workflow_id;

  -- Also increment totalExecutions
  UPDATE workflows
  SET stats = jsonb_set(
    COALESCE(stats, '{}'::jsonb),
    '{totalExecutions}',
    to_jsonb(COALESCE((stats->>'totalExecutions')::int, 0) + 1)
  )
  WHERE id = NEW.workflow_id AND NEW.status = 'running';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats on execution status change
CREATE TRIGGER update_stats_on_execution
  AFTER INSERT OR UPDATE OF status ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflows IS 'Visual workflow builder configurations';
COMMENT ON TABLE workflow_executions IS 'Workflow execution tracking for individual contacts';
COMMENT ON TABLE workflow_versions IS 'Version history for workflows';
COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates';

COMMENT ON COLUMN workflows.nodes IS 'JSON array of workflow nodes (React Flow format)';
COMMENT ON COLUMN workflows.edges IS 'JSON array of workflow edges/connections';
COMMENT ON COLUMN workflows.settings IS 'Workflow execution settings and configuration';
COMMENT ON COLUMN workflows.stats IS 'Execution statistics and metrics';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
