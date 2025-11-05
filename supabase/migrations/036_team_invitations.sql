-- Team Invitations Table
-- Manages email invitations for team members with token-based acceptance

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  permissions JSONB DEFAULT '{}',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate pending invitations for same email in organization
CREATE UNIQUE INDEX idx_pending_invitation
  ON team_invitations(organization_id, email)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Performance indexes
CREATE INDEX idx_team_invitations_org_id ON team_invitations(organization_id);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_expires ON team_invitations(expires_at);

-- Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for their organization
CREATE POLICY team_invitations_select ON team_invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users with team.manage permission can insert invitations
CREATE POLICY team_invitations_insert ON team_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND (
        role IN ('owner', 'admin')
        OR permissions->>'team.manage' = 'true'
      )
    )
  );

-- Users can update invitations they created or have team.manage permission
CREATE POLICY team_invitations_update ON team_invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND (
        role IN ('owner', 'admin')
        OR permissions->>'team.manage' = 'true'
        OR id = team_invitations.invited_by
      )
    )
  );

-- Users with team.manage permission can delete invitations
CREATE POLICY team_invitations_delete ON team_invitations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND (
        role IN ('owner', 'admin')
        OR permissions->>'team.manage' = 'true'
      )
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invitations_updated_at();

-- Function to clean up expired invitations (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM team_invitations
  WHERE expires_at < NOW() - INTERVAL '30 days'
  AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_invitations TO authenticated;

-- Comments
COMMENT ON TABLE team_invitations IS 'Stores team member invitation requests with token-based acceptance';
COMMENT ON COLUMN team_invitations.token IS 'Secure random token for invitation acceptance link';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expiration timestamp (typically 7 days from creation)';
COMMENT ON COLUMN team_invitations.accepted_at IS 'Timestamp when invitation was accepted (NULL = pending)';
COMMENT ON COLUMN team_invitations.cancelled_at IS 'Timestamp when invitation was cancelled (NULL = active)';
