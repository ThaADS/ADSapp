-- ============================================================================
-- AUDIT LOGGING SYSTEM
-- Phase 1.4: Comprehensive audit trail for security compliance
-- ============================================================================

-- Create audit_logs table for tracking all security-relevant operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'general',

  -- Actor information
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,

  -- Resource being acted upon
  resource_type text,
  resource_id text,

  -- Action details
  action text NOT NULL,
  action_result text DEFAULT 'success',

  -- Request context
  ip_address inet,
  user_agent text,
  request_id text,

  -- Detailed metadata (sanitized - no PII in raw form)
  metadata jsonb DEFAULT '{}',

  -- Error information if applicable
  error_message text,
  error_code text,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON audit_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created
  ON audit_logs(event_category, created_at DESC);

-- Composite index for common security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_query
  ON audit_logs(event_category, action_result, created_at DESC)
  WHERE event_category IN ('authentication', 'authorization', 'credential_access');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read audit logs
CREATE POLICY audit_logs_super_admin_read ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Organization admins can read their own org's audit logs
CREATE POLICY audit_logs_org_admin_read ON audit_logs
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY audit_logs_system_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed - audit logs are immutable
-- (No UPDATE or DELETE policies)

-- ============================================================================
-- AUDIT EVENT TYPES REFERENCE
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for security and compliance tracking';

COMMENT ON COLUMN audit_logs.event_type IS 'Specific event type: LOGIN, LOGOUT, CREDENTIAL_ACCESS, DATA_EXPORT, ROLE_CHANGE, etc.';
COMMENT ON COLUMN audit_logs.event_category IS 'Category: authentication, authorization, credential_access, data_access, configuration, billing';
COMMENT ON COLUMN audit_logs.action IS 'The action performed: create, read, update, delete, export, decrypt, etc.';
COMMENT ON COLUMN audit_logs.action_result IS 'Result: success, failure, denied, error';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (sanitized - no raw PII or credentials)';

-- ============================================================================
-- HELPER FUNCTION FOR AUDIT LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type text,
  p_event_category text,
  p_action text,
  p_user_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_action_result text DEFAULT 'success',
  p_metadata jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_error_code text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO audit_logs (
    event_type,
    event_category,
    action,
    user_id,
    organization_id,
    resource_type,
    resource_id,
    action_result,
    metadata,
    ip_address,
    user_agent,
    error_message,
    error_code
  ) VALUES (
    p_event_type,
    p_event_category,
    p_action,
    p_user_id,
    p_organization_id,
    p_resource_type,
    p_resource_id,
    p_action_result,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_error_message,
    p_error_code
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Grant execute to authenticated users (they can log their own events)
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;

-- ============================================================================
-- RLS HELPER FUNCTIONS (Phase 1.1)
-- ============================================================================

-- Safe organization ID retrieval without recursion
CREATE OR REPLACE FUNCTION auth.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Check if user has specific role in their org
CREATE OR REPLACE FUNCTION auth.has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
$$;

-- ============================================================================
-- STANDARDIZED RLS POLICY TEMPLATE
-- ============================================================================

-- This function generates standard RLS policies for tables with organization_id
CREATE OR REPLACE FUNCTION create_org_isolation_policies(
  target_table text,
  allow_select_roles text[] DEFAULT ARRAY['owner', 'admin', 'agent', 'viewer'],
  allow_insert_roles text[] DEFAULT ARRAY['owner', 'admin', 'agent'],
  allow_update_roles text[] DEFAULT ARRAY['owner', 'admin', 'agent'],
  allow_delete_roles text[] DEFAULT ARRAY['owner', 'admin']
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies if any
  EXECUTE format('DROP POLICY IF EXISTS %I_org_select ON %I', target_table, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_org_insert ON %I', target_table, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_org_update ON %I', target_table, target_table);
  EXECUTE format('DROP POLICY IF EXISTS %I_org_delete ON %I', target_table, target_table);

  -- Create SELECT policy
  EXECUTE format(
    'CREATE POLICY %I_org_select ON %I FOR SELECT USING (
      organization_id = auth.get_user_org_id()
      AND auth.has_role($1)
    )',
    target_table, target_table
  ) USING allow_select_roles;

  -- Create INSERT policy
  EXECUTE format(
    'CREATE POLICY %I_org_insert ON %I FOR INSERT WITH CHECK (
      organization_id = auth.get_user_org_id()
      AND auth.has_role($1)
    )',
    target_table, target_table
  ) USING allow_insert_roles;

  -- Create UPDATE policy
  EXECUTE format(
    'CREATE POLICY %I_org_update ON %I FOR UPDATE USING (
      organization_id = auth.get_user_org_id()
      AND auth.has_role($1)
    )',
    target_table, target_table
  ) USING allow_update_roles;

  -- Create DELETE policy
  EXECUTE format(
    'CREATE POLICY %I_org_delete ON %I FOR DELETE USING (
      organization_id = auth.get_user_org_id()
      AND auth.has_role($1)
    )',
    target_table, target_table
  ) USING allow_delete_roles;
END;
$$;

-- ============================================================================
-- CREDENTIAL ACCESS TRIGGER
-- ============================================================================

-- Automatically log when encrypted credentials are accessed
CREATE OR REPLACE FUNCTION audit_credential_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the credential access
  PERFORM log_audit_event(
    'CREDENTIAL_ACCESS',
    'credential_access',
    TG_OP,
    auth.uid(),
    NEW.organization_id,
    TG_TABLE_NAME,
    NEW.id::text,
    'success',
    jsonb_build_object(
      'credential_type', NEW.credential_type,
      'accessed_at', now()
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- DATA RETENTION POLICY
-- ============================================================================

-- Function to clean old audit logs (keep 2 years for compliance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - interval '2 years'
  RETURNING count(*) INTO deleted_count;

  -- Log the cleanup itself
  PERFORM log_audit_event(
    'AUDIT_CLEANUP',
    'maintenance',
    'delete',
    NULL,
    NULL,
    'audit_logs',
    NULL,
    'success',
    jsonb_build_object('deleted_count', deleted_count)
  );

  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.has_role(text[]) TO authenticated;
