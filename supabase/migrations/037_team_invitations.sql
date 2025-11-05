-- Migration: Team Invitations & API Keys Management
-- Created: 2025-10-20
-- Purpose: Enable team member invitations and API key management

-- =============================================
-- 1. TEAM INVITATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'viewer')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT not_expired CHECK (expires_at > created_at),
  CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email, accepted_at, cancelled_at)
);

-- Indexes for team_invitations
CREATE INDEX idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_expires ON team_invitations(expires_at);
CREATE INDEX idx_team_invitations_pending ON team_invitations(organization_id, accepted_at, cancelled_at)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Updated_at trigger for team_invitations
CREATE TRIGGER set_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. API KEYS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_name CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
  CONSTRAINT valid_prefix CHECK (key_prefix ~ '^adp_[a-z0-9]{8}$')
);

-- Indexes for api_keys
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(organization_id, revoked_at) WHERE revoked_at IS NULL;

-- Updated_at trigger for api_keys
CREATE TRIGGER set_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Team Invitations Policies
-- Allow users to view invitations for their organization
CREATE POLICY team_invitations_select ON team_invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow admins/owners to create invitations
CREATE POLICY team_invitations_insert ON team_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Allow admins/owners to cancel invitations
CREATE POLICY team_invitations_update ON team_invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Allow admins/owners to delete invitations
CREATE POLICY team_invitations_delete ON team_invitations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- API Keys Policies
-- Allow users to view API keys for their organization
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow admins/owners to create API keys
CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Allow admins/owners to update API keys (revoke)
CREATE POLICY api_keys_update ON api_keys
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Allow admins/owners to delete API keys
CREATE POLICY api_keys_delete ON api_keys
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =============================================
-- 4. HELPER FUNCTIONS
-- =============================================

-- Function to generate unique invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random token (32 characters)
    token := encode(gen_random_bytes(24), 'base64');
    token := REPLACE(token, '/', '_');
    token := REPLACE(token, '+', '-');
    token := REPLACE(token, '=', '');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM team_invitations WHERE team_invitations.token = token)
    INTO token_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations (to be run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM team_invitations
  WHERE expires_at < NOW()
    AND accepted_at IS NULL
    AND cancelled_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. AUDIT LOGGING
-- =============================================

-- Add audit log entries for invitation events
CREATE OR REPLACE FUNCTION log_invitation_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      NEW.organization_id,
      'invitation.created',
      'team_invitation',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'expires_at', NEW.expires_at
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
      INSERT INTO audit_log (
        user_id,
        organization_id,
        action,
        resource_type,
        resource_id,
        details
      ) VALUES (
        auth.uid(),
        NEW.organization_id,
        'invitation.accepted',
        'team_invitation',
        NEW.id,
        jsonb_build_object('email', NEW.email, 'role', NEW.role)
      );
    ELSIF NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL THEN
      INSERT INTO audit_log (
        user_id,
        organization_id,
        action,
        resource_type,
        resource_id,
        details
      ) VALUES (
        auth.uid(),
        NEW.organization_id,
        'invitation.cancelled',
        'team_invitation',
        NEW.id,
        jsonb_build_object('email', NEW.email)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER team_invitations_audit_log
  AFTER INSERT OR UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION log_invitation_event();

-- Add audit log entries for API key events
CREATE OR REPLACE FUNCTION log_api_key_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      NEW.organization_id,
      'api_key.created',
      'api_key',
      NEW.id,
      jsonb_build_object('name', NEW.name, 'prefix', NEW.key_prefix)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
      INSERT INTO audit_log (
        user_id,
        organization_id,
        action,
        resource_type,
        resource_id,
        details
      ) VALUES (
        auth.uid(),
        NEW.organization_id,
        'api_key.revoked',
        'api_key',
        NEW.id,
        jsonb_build_object('name', NEW.name)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      OLD.organization_id,
      'api_key.deleted',
      'api_key',
      OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER api_keys_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION log_api_key_event();

-- =============================================
-- 6. COMMENTS
-- =============================================

COMMENT ON TABLE team_invitations IS 'Stores pending team member invitations';
COMMENT ON COLUMN team_invitations.token IS 'Unique token for accepting invitation via email link';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expiry timestamp (typically 7 days from creation)';
COMMENT ON COLUMN team_invitations.accepted_at IS 'Timestamp when invitation was accepted (creates profile)';
COMMENT ON COLUMN team_invitations.cancelled_at IS 'Timestamp when invitation was cancelled by admin';

COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access to the platform';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (only hash stored, never plaintext)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of key for identification (e.g., adp_abc12345)';
COMMENT ON COLUMN api_keys.last_used_at IS 'Last time this API key was used for authentication';
COMMENT ON COLUMN api_keys.revoked_at IS 'Timestamp when key was revoked (soft delete)';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Tables: team_invitations, api_keys
-- RLS: Enabled with organization-level isolation
-- Audit: All events logged to audit_log table
-- Functions: Token generation, expired invitation cleanup
