-- CRM Integrations Migration
-- Adds support for Salesforce, HubSpot, and Pipedrive CRM integrations
-- with bi-directional sync, field mappings, and webhook support

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CRM Connections Table
-- Stores CRM connection details and credentials for each organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('salesforce', 'hubspot', 'pipedrive')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'disconnected')),
  credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted credentials (access_token, refresh_token, etc.)
  settings JSONB DEFAULT '{}', -- Sync settings (direction, frequency, conflict resolution, etc.)
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Ensure only one active connection per CRM type per organization
  UNIQUE(organization_id, crm_type)
);

-- Index for faster lookups
CREATE INDEX idx_crm_connections_org_status ON crm_connections(organization_id, status);
CREATE INDEX idx_crm_connections_type ON crm_connections(crm_type);
CREATE INDEX idx_crm_connections_last_sync ON crm_connections(last_sync_at);

-- RLS policies for crm_connections
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their own CRM connections"
  ON crm_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage CRM connections"
  ON crm_connections FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CRM Sync Logs Table
-- Tracks sync history and errors for debugging and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'delta', 'webhook', 'manual')),
  direction TEXT NOT NULL CHECK (direction IN ('to_crm', 'from_crm', 'bidirectional')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  records_processed INT DEFAULT 0,
  records_success INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  errors JSONB DEFAULT '[]', -- Array of error details
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Performance metrics
  duration_ms INT GENERATED ALWAYS AS (
    CASE
      WHEN completed_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED
);

-- Indexes for sync logs
CREATE INDEX idx_crm_sync_logs_connection ON crm_sync_logs(connection_id, started_at DESC);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status, started_at DESC);
CREATE INDEX idx_crm_sync_logs_type ON crm_sync_logs(sync_type);

-- RLS policies for crm_sync_logs
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View sync logs for own organization"
  ON crm_sync_logs FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage sync logs"
  ON crm_sync_logs FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- CRM Field Mappings Table
-- Stores custom field mappings between ADSapp and CRM fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  adsapp_field TEXT NOT NULL,
  crm_field TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('to_crm', 'from_crm', 'bidirectional')),
  transform_rule JSONB, -- Optional transformation logic
  is_custom BOOLEAN DEFAULT false, -- User-defined vs default mapping
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique field pairs per connection
  UNIQUE(connection_id, adsapp_field, crm_field)
);

-- Indexes for field mappings
CREATE INDEX idx_crm_field_mappings_connection ON crm_field_mappings(connection_id);
CREATE INDEX idx_crm_field_mappings_adsapp_field ON crm_field_mappings(adsapp_field);
CREATE INDEX idx_crm_field_mappings_direction ON crm_field_mappings(direction);

-- RLS policies for crm_field_mappings
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View field mappings for own organization"
  ON crm_field_mappings FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage field mappings"
  ON crm_field_mappings FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- CRM Sync State Table
-- Tracks sync state for each contact to enable bi-directional sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  crm_record_id TEXT NOT NULL, -- ID in the CRM system
  crm_record_type TEXT NOT NULL CHECK (crm_record_type IN ('contact', 'lead', 'person', 'deal', 'opportunity')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  adsapp_updated_at TIMESTAMPTZ, -- Last update time in ADSapp
  crm_updated_at TIMESTAMPTZ, -- Last update time in CRM
  sync_direction TEXT, -- Last sync direction
  conflict_detected BOOLEAN DEFAULT false,
  conflict_details JSONB, -- Details of any conflicts
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique mapping between ADSapp contact and CRM record
  UNIQUE(connection_id, contact_id),
  UNIQUE(connection_id, crm_record_id, crm_record_type)
);

-- Indexes for sync state
CREATE INDEX idx_crm_sync_state_connection ON crm_sync_state(connection_id);
CREATE INDEX idx_crm_sync_state_contact ON crm_sync_state(contact_id);
CREATE INDEX idx_crm_sync_state_crm_record ON crm_sync_state(crm_record_id, crm_record_type);
CREATE INDEX idx_crm_sync_state_last_synced ON crm_sync_state(last_synced_at);
CREATE INDEX idx_crm_sync_state_conflicts ON crm_sync_state(conflict_detected) WHERE conflict_detected = true;

-- RLS policies for crm_sync_state
ALTER TABLE crm_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View sync state for own organization"
  ON crm_sync_state FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync state"
  ON crm_sync_state FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- CRM Webhooks Table
-- Stores webhook configurations for each CRM connection
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  webhook_id TEXT, -- Webhook ID in the CRM system
  event_type TEXT NOT NULL, -- Type of event (contact.created, contact.updated, etc.)
  webhook_url TEXT NOT NULL,
  secret TEXT, -- Webhook secret for verification
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(connection_id, event_type)
);

-- Indexes for webhooks
CREATE INDEX idx_crm_webhooks_connection ON crm_webhooks(connection_id);
CREATE INDEX idx_crm_webhooks_status ON crm_webhooks(status);

-- RLS policies for crm_webhooks
ALTER TABLE crm_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View webhooks for own organization"
  ON crm_webhooks FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage webhooks"
  ON crm_webhooks FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_field_mappings_updated_at
  BEFORE UPDATE ON crm_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_sync_state_updated_at
  BEFORE UPDATE ON crm_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get CRM connection status
CREATE OR REPLACE FUNCTION get_crm_connection_status(p_organization_id UUID, p_crm_type TEXT)
RETURNS TABLE (
  connected BOOLEAN,
  last_sync TIMESTAMPTZ,
  total_contacts INT,
  sync_errors INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (c.status = 'active') AS connected,
    c.last_sync_at AS last_sync,
    COUNT(DISTINCT ss.contact_id)::INT AS total_contacts,
    COUNT(sl.id) FILTER (WHERE sl.status = 'failed')::INT AS sync_errors
  FROM crm_connections c
  LEFT JOIN crm_sync_state ss ON ss.connection_id = c.id
  LEFT JOIN crm_sync_logs sl ON sl.connection_id = c.id AND sl.started_at > NOW() - INTERVAL '24 hours'
  WHERE c.organization_id = p_organization_id
    AND c.crm_type = p_crm_type
  GROUP BY c.id, c.status, c.last_sync_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect sync conflicts
CREATE OR REPLACE FUNCTION detect_sync_conflicts(p_connection_id UUID)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  adsapp_updated_at TIMESTAMPTZ,
  crm_updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.contact_id,
    c.name AS contact_name,
    ss.adsapp_updated_at,
    ss.crm_updated_at,
    ss.last_synced_at
  FROM crm_sync_state ss
  JOIN contacts c ON c.id = ss.contact_id
  WHERE ss.connection_id = p_connection_id
    AND ss.adsapp_updated_at > ss.last_synced_at
    AND ss.crm_updated_at > ss.last_synced_at
    AND NOT ss.conflict_detected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old sync logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM crm_sync_logs
  WHERE started_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE crm_connections IS 'Stores CRM connection details and credentials';
COMMENT ON TABLE crm_sync_logs IS 'Tracks sync history and errors for monitoring';
COMMENT ON TABLE crm_field_mappings IS 'Custom field mappings between ADSapp and CRM';
COMMENT ON TABLE crm_sync_state IS 'Tracks sync state for bi-directional sync';
COMMENT ON TABLE crm_webhooks IS 'Webhook configurations for real-time sync';

COMMENT ON COLUMN crm_connections.credentials IS 'Encrypted JSON containing access tokens and secrets';
COMMENT ON COLUMN crm_connections.settings IS 'Sync settings: direction, frequency, conflict resolution';
COMMENT ON COLUMN crm_sync_logs.errors IS 'Array of detailed error messages';
COMMENT ON COLUMN crm_field_mappings.transform_rule IS 'Optional transformation logic for field mapping';
COMMENT ON COLUMN crm_sync_state.conflict_detected IS 'Flag for detected conflicts requiring manual resolution';
