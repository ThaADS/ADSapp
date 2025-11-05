-- Migration: Team Invitations & API Keys Management (FIXED)
-- Created: 2025-10-20
-- Purpose: Enable team member invitations and API key management
-- NOTE: Fixed to match actual database schema (text IDs if needed)

-- =============================================
-- 0. CHECK EXISTING SCHEMA
-- =============================================
-- First, let's check what type organization_id actually is

DO $$
DECLARE
  org_id_type TEXT;
BEGIN
  SELECT data_type INTO org_id_type
  FROM information_schema.columns
  WHERE table_name = 'organizations'
  AND column_name = 'id';

  RAISE NOTICE 'organizations.id type: %', org_id_type;
END $$;

-- =============================================
-- 1. TEAM INVITATIONS TABLE
-- =============================================

-- Drop if exists (for clean retry)
DROP TABLE IF EXISTS team_invitations CASCADE;

CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'viewer')),
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Add foreign keys after we know the types work
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT not_expired CHECK (expires_at > created_at)
);

-- Add foreign key constraints (will fail with helpful error if types don't match)
ALTER TABLE team_invitations
  ADD CONSTRAINT team_invitations_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE team_invitations
  ADD CONSTRAINT team_invitations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add unique constraint for pending invitations
CREATE UNIQUE INDEX idx_team_invitations_unique_pending
  ON team_invitations(organization_id, email)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Other indexes
CREATE INDEX idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_expires ON team_invitations(expires_at);

-- Updated_at trigger
CREATE TRIGGER set_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. API KEYS TABLE
-- =============================================

DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_name CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
  CONSTRAINT valid_prefix CHECK (key_prefix ~ '^adp_[a-z0-9]{8}$')
);

-- Add foreign keys
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Indexes
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(organization_id, revoked_at) WHERE revoked_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER set_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Team Invitations Policies
CREATE POLICY team_invitations_select ON team_invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY team_invitations_insert ON team_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY team_invitations_update ON team_invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

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
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY api_keys_update ON api_keys
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

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

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(24), 'base64');
    token := REPLACE(token, '/', '_');
    token := REPLACE(token, '+', '-');
    token := REPLACE(token, '=', '');

    SELECT EXISTS(SELECT 1 FROM team_invitations WHERE team_invitations.token = token)
    INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

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
      NEW.organization_id::TEXT,
      'invitation.created',
      'team_invitation',
      NEW.id::TEXT,
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
        NEW.organization_id::TEXT,
        'invitation.accepted',
        'team_invitation',
        NEW.id::TEXT,
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
        NEW.organization_id::TEXT,
        'invitation.cancelled',
        'team_invitation',
        NEW.id::TEXT,
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
      NEW.organization_id::TEXT,
      'api_key.created',
      'api_key',
      NEW.id::TEXT,
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
        NEW.organization_id::TEXT,
        'api_key.revoked',
        'api_key',
        NEW.id::TEXT,
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
      OLD.organization_id::TEXT,
      'api_key.deleted',
      'api_key',
      OLD.id::TEXT,
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

COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access to the platform';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (only hash stored, never plaintext)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of key for identification';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Verify tables created
SELECT 'team_invitations created' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations');

SELECT 'api_keys created' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys');
