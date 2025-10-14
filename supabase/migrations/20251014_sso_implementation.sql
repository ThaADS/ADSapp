-- =====================================================
-- ADSapp SSO Implementation Migration
-- Phase 4 Week 23-24: Enterprise Single Sign-On
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SSO Configurations Table
-- =====================================================
-- Stores SSO configuration for each organization
-- Supports SAML 2.0 and OAuth 2.0/OIDC providers
CREATE TABLE IF NOT EXISTS sso_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider Information
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oauth', 'oidc')),
  provider_name TEXT NOT NULL CHECK (provider_name IN (
    'azure_ad', 'okta', 'google_workspace', 'onelogin',
    'google', 'microsoft', 'github', 'gitlab', 'custom'
  )),
  display_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,

  -- SAML 2.0 Configuration
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_slo_url TEXT, -- Single Logout URL
  saml_certificate TEXT, -- X.509 certificate for signature verification
  saml_sign_requests BOOLEAN DEFAULT false,
  saml_want_assertions_signed BOOLEAN DEFAULT true,
  saml_name_id_format TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

  -- OAuth 2.0 / OIDC Configuration
  oauth_client_id TEXT,
  oauth_client_secret TEXT, -- Will be encrypted at application level
  oauth_authorization_url TEXT,
  oauth_token_url TEXT,
  oauth_userinfo_url TEXT,
  oauth_jwks_url TEXT, -- For OIDC token validation
  oauth_scopes TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'],
  oauth_pkce_enabled BOOLEAN DEFAULT true,

  -- Attribute Mapping
  -- Maps IdP attributes to application user fields
  attribute_mappings JSONB DEFAULT '{
    "email": "email",
    "firstName": "given_name",
    "lastName": "family_name",
    "displayName": "name"
  }'::jsonb,

  -- Role Mapping
  -- Maps IdP groups/roles to application roles
  role_mappings JSONB DEFAULT '{
    "default": "agent",
    "rules": []
  }'::jsonb,

  -- Just-in-Time Provisioning
  jit_provisioning_enabled BOOLEAN DEFAULT true,
  auto_create_users BOOLEAN DEFAULT true,
  auto_update_users BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'agent' CHECK (default_role IN ('owner', 'admin', 'agent')),

  -- Security Settings
  session_duration_minutes INTEGER DEFAULT 480, -- 8 hours
  force_authn BOOLEAN DEFAULT false, -- Force re-authentication
  allow_idp_initiated BOOLEAN DEFAULT false, -- Allow IdP-initiated SSO

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_tested_at TIMESTAMPTZ,
  last_test_result JSONB,

  -- Constraints
  UNIQUE(organization_id, provider_name),
  CHECK (
    (provider_type = 'saml' AND saml_entity_id IS NOT NULL AND saml_sso_url IS NOT NULL) OR
    (provider_type IN ('oauth', 'oidc') AND oauth_client_id IS NOT NULL AND oauth_client_secret IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_sso_config_org ON sso_configurations(organization_id);
CREATE INDEX idx_sso_config_enabled ON sso_configurations(enabled) WHERE enabled = true;
CREATE INDEX idx_sso_config_provider ON sso_configurations(provider_type, provider_name);

-- =====================================================
-- SSO Sessions Table
-- =====================================================
-- Tracks active SSO sessions with provider information
CREATE TABLE IF NOT EXISTS sso_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Session Information
  provider_session_id TEXT, -- IdP session identifier
  session_index TEXT, -- SAML SessionIndex for SLO
  name_id TEXT, -- SAML NameID for SLO

  -- Token Information (OAuth/OIDC)
  access_token_hash TEXT, -- Hashed access token
  refresh_token_hash TEXT, -- Hashed refresh token
  id_token_hash TEXT, -- Hashed ID token (OIDC)

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  login_method TEXT CHECK (login_method IN ('sp_initiated', 'idp_initiated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  is_active BOOLEAN DEFAULT true,
  logout_at TIMESTAMPTZ,
  logout_reason TEXT
);

-- Indexes for session management
CREATE INDEX idx_sso_session_user ON sso_sessions(user_id);
CREATE INDEX idx_sso_session_config ON sso_sessions(sso_config_id);
CREATE INDEX idx_sso_session_active ON sso_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_sso_session_expires ON sso_sessions(expires_at);
CREATE INDEX idx_sso_session_provider_id ON sso_sessions(provider_session_id);

-- =====================================================
-- SSO Audit Logs Table
-- =====================================================
-- Comprehensive audit trail for SSO events
CREATE TABLE IF NOT EXISTS sso_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sso_config_id UUID REFERENCES sso_configurations(id) ON DELETE SET NULL,

  -- Event Information
  event_type TEXT NOT NULL CHECK (event_type IN (
    'config_created', 'config_updated', 'config_deleted', 'config_tested',
    'login_initiated', 'login_success', 'login_failed',
    'logout_initiated', 'logout_success', 'logout_failed',
    'token_refreshed', 'session_expired',
    'user_provisioned', 'user_updated', 'role_mapped',
    'assertion_validated', 'signature_verified',
    'error_occurred'
  )),

  -- User Information
  user_email TEXT,
  user_name TEXT,

  -- Provider Information
  provider_type TEXT,
  provider_name TEXT,

  -- Result
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,

  -- Details
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Request Context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit querying
CREATE INDEX idx_sso_audit_org ON sso_audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_sso_audit_user ON sso_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_sso_audit_config ON sso_audit_logs(sso_config_id, created_at DESC);
CREATE INDEX idx_sso_audit_event ON sso_audit_logs(event_type, created_at DESC);
CREATE INDEX idx_sso_audit_success ON sso_audit_logs(success, created_at DESC);
CREATE INDEX idx_sso_audit_created ON sso_audit_logs(created_at DESC);

-- =====================================================
-- SAML Requests Table
-- =====================================================
-- Temporary storage for SAML request state (SP-initiated flow)
CREATE TABLE IF NOT EXISTS sso_saml_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL UNIQUE, -- SAML Request ID
  relay_state TEXT, -- RelayState parameter
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,

  -- Request Details
  assertion_consumer_service_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),

  -- Security
  nonce TEXT NOT NULL,

  -- Status
  consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ
);

-- Indexes for request validation
CREATE INDEX idx_saml_request_id ON sso_saml_requests(request_id);
CREATE INDEX idx_saml_request_expires ON sso_saml_requests(expires_at);

-- Cleanup old requests automatically
CREATE INDEX idx_saml_request_cleanup ON sso_saml_requests(expires_at) WHERE NOT consumed;

-- =====================================================
-- OAuth State Table
-- =====================================================
-- Temporary storage for OAuth state parameter (CSRF protection)
CREATE TABLE IF NOT EXISTS sso_oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT NOT NULL UNIQUE,
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,

  -- PKCE
  code_verifier TEXT, -- For PKCE flow
  code_challenge TEXT,
  code_challenge_method TEXT DEFAULT 'S256',

  -- Redirect
  redirect_uri TEXT NOT NULL,

  -- Security
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),

  -- Status
  consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ
);

-- Indexes for state validation
CREATE INDEX idx_oauth_state ON sso_oauth_states(state);
CREATE INDEX idx_oauth_state_expires ON sso_oauth_states(expires_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all SSO tables
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_saml_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_oauth_states ENABLE ROW LEVEL SECURITY;

-- SSO Configurations: Only organization owners/admins can manage
CREATE POLICY sso_config_select ON sso_configurations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY sso_config_insert ON sso_configurations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY sso_config_update ON sso_configurations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY sso_config_delete ON sso_configurations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- SSO Sessions: Users can view their own sessions
CREATE POLICY sso_session_select ON sso_sessions
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- SSO Sessions: System can manage all sessions
CREATE POLICY sso_session_manage ON sso_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- SSO Audit Logs: Admins can view organization logs
CREATE POLICY sso_audit_select ON sso_audit_logs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- SSO Audit Logs: System can insert logs
CREATE POLICY sso_audit_insert ON sso_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- SAML Requests and OAuth States: System-only access
CREATE POLICY saml_request_system ON sso_saml_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY oauth_state_system ON sso_oauth_states FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_sso_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sso_config_updated_at
  BEFORE UPDATE ON sso_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_config_updated_at();

-- Update last_activity_at on session access
CREATE OR REPLACE FUNCTION update_sso_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sso_session_activity
  BEFORE UPDATE ON sso_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_session_activity();

-- Audit log function for SSO configuration changes
CREATE OR REPLACE FUNCTION audit_sso_config_changes()
RETURNS TRIGGER AS $$
DECLARE
  event_type_val TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'config_created';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type_val := 'config_updated';
  ELSIF TG_OP = 'DELETE' THEN
    event_type_val := 'config_deleted';
  END IF;

  INSERT INTO sso_audit_logs (
    organization_id,
    sso_config_id,
    event_type,
    provider_type,
    provider_name,
    success,
    metadata
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    COALESCE(NEW.id, OLD.id),
    event_type_val,
    COALESCE(NEW.provider_type, OLD.provider_type),
    COALESCE(NEW.provider_name, OLD.provider_name),
    true,
    jsonb_build_object(
      'operation', TG_OP,
      'enabled', COALESCE(NEW.enabled, OLD.enabled)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_sso_config
  AFTER INSERT OR UPDATE OR DELETE ON sso_configurations
  FOR EACH ROW
  EXECUTE FUNCTION audit_sso_config_changes();

-- Clean up expired SAML requests and OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_sso_data()
RETURNS void AS $$
BEGIN
  -- Clean up expired SAML requests
  DELETE FROM sso_saml_requests
  WHERE expires_at < NOW() OR (consumed = true AND consumed_at < NOW() - INTERVAL '1 hour');

  -- Clean up expired OAuth states
  DELETE FROM sso_oauth_states
  WHERE expires_at < NOW() OR (consumed = true AND consumed_at < NOW() - INTERVAL '1 hour');

  -- Clean up expired inactive sessions
  UPDATE sso_sessions
  SET is_active = false, logout_at = NOW(), logout_reason = 'expired'
  WHERE is_active = true AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get active SSO configuration for organization
CREATE OR REPLACE FUNCTION get_active_sso_config(org_id UUID)
RETURNS TABLE (
  id UUID,
  provider_type TEXT,
  provider_name TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.id, sc.provider_type, sc.provider_name, sc.display_name
  FROM sso_configurations sc
  WHERE sc.organization_id = org_id
    AND sc.enabled = true
  ORDER BY sc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Validate SSO session
CREATE OR REPLACE FUNCTION validate_sso_session(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  SELECT
    is_active AND expires_at > NOW()
  INTO is_valid
  FROM sso_sessions
  WHERE id = session_id;

  RETURN COALESCE(is_valid, false);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Views for Reporting
-- =====================================================

-- SSO Login Statistics View
CREATE OR REPLACE VIEW sso_login_stats AS
SELECT
  organization_id,
  provider_name,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) FILTER (WHERE success = true AND event_type = 'login_success') as successful_logins,
  COUNT(*) FILTER (WHERE success = false AND event_type = 'login_failed') as failed_logins,
  COUNT(DISTINCT user_id) FILTER (WHERE success = true) as unique_users
FROM sso_audit_logs
WHERE event_type IN ('login_success', 'login_failed')
GROUP BY organization_id, provider_name, DATE_TRUNC('day', created_at);

-- Active SSO Sessions View
CREATE OR REPLACE VIEW active_sso_sessions AS
SELECT
  ss.id,
  ss.user_id,
  ss.organization_id,
  p.email,
  p.full_name,
  sc.provider_name,
  sc.display_name as provider_display_name,
  ss.expires_at,
  ss.created_at,
  ss.last_activity_at,
  ss.ip_address
FROM sso_sessions ss
JOIN profiles p ON ss.user_id = p.id
JOIN sso_configurations sc ON ss.sso_config_id = sc.id
WHERE ss.is_active = true
  AND ss.expires_at > NOW();

-- =====================================================
-- Initial Data / Default Configurations
-- =====================================================

-- Add SSO permission to organizations settings
DO $$
BEGIN
  -- Check if we need to add SSO feature flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'features'
  ) THEN
    ALTER TABLE organizations ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE sso_configurations IS 'Stores SSO provider configurations for multi-tenant organizations';
COMMENT ON TABLE sso_sessions IS 'Tracks active SSO sessions with provider integration';
COMMENT ON TABLE sso_audit_logs IS 'Comprehensive audit trail for all SSO-related events';
COMMENT ON TABLE sso_saml_requests IS 'Temporary storage for SAML authentication requests';
COMMENT ON TABLE sso_oauth_states IS 'Temporary storage for OAuth state parameters and PKCE codes';

COMMENT ON COLUMN sso_configurations.provider_type IS 'Type of SSO provider: saml, oauth, or oidc';
COMMENT ON COLUMN sso_configurations.jit_provisioning_enabled IS 'Enable Just-in-Time user provisioning';
COMMENT ON COLUMN sso_configurations.role_mappings IS 'Maps IdP groups/roles to application roles';
COMMENT ON COLUMN sso_sessions.session_index IS 'SAML SessionIndex required for Single Logout';
COMMENT ON COLUMN sso_audit_logs.event_type IS 'Type of SSO event for audit trail';

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant necessary permissions for service role
GRANT ALL ON sso_configurations TO service_role;
GRANT ALL ON sso_sessions TO service_role;
GRANT ALL ON sso_audit_logs TO service_role;
GRANT ALL ON sso_saml_requests TO service_role;
GRANT ALL ON sso_oauth_states TO service_role;

-- Grant read permissions for authenticated users (filtered by RLS)
GRANT SELECT ON sso_configurations TO authenticated;
GRANT SELECT ON sso_sessions TO authenticated;
GRANT SELECT ON sso_audit_logs TO authenticated;

-- Grant access to views
GRANT SELECT ON sso_login_stats TO authenticated;
GRANT SELECT ON active_sso_sessions TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'SSO Implementation Migration Completed Successfully';
  RAISE NOTICE 'Created tables: sso_configurations, sso_sessions, sso_audit_logs, sso_saml_requests, sso_oauth_states';
  RAISE NOTICE 'Created views: sso_login_stats, active_sso_sessions';
  RAISE NOTICE 'Applied Row Level Security policies for tenant isolation';
END $$;
