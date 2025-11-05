-- ============================================================================
-- Team Invitations & License Management (Simplified Version)
-- ============================================================================
-- Migration: 20251105_team_invitations_licenses_simple
-- Purpose: Enable team member invitations and license seat management
-- Author: AI Assistant
-- Date: 2025-11-05
-- Note: This version avoids partial indexes to prevent Supabase import issues

-- ============================================================================
-- Team Invitations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (expires_at > created_at),
  CHECK (accepted_at IS NULL OR accepted_at >= created_at)
);

-- ============================================================================
-- Indexes for team_invitations
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_team_invitations_organization ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org_email_status ON team_invitations(organization_id, email, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_status ON team_invitations(expires_at, status);

-- ============================================================================
-- RLS Policies for team_invitations
-- ============================================================================
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their organization"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- License Management Columns
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS used_team_members INTEGER DEFAULT 1 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_team_members') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_max_team_members CHECK (max_team_members > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_used_within_max') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_used_within_max CHECK (used_team_members <= max_team_members);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_license_usage ON organizations(used_team_members, max_team_members);

-- ============================================================================
-- Function: Update Team Member Count
-- ============================================================================
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations
    SET used_team_members = used_team_members + 1,
        updated_at = NOW()
    WHERE id = NEW.organization_id;

    IF (SELECT used_team_members > max_team_members FROM organizations WHERE id = NEW.organization_id) THEN
      RAISE EXCEPTION 'License limit exceeded. Upgrade your plan to add more team members.';
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations
    SET used_team_members = GREATEST(used_team_members - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.organization_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_team_member_count ON profiles;
CREATE TRIGGER trigger_update_team_member_count
  AFTER INSERT OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- ============================================================================
-- Function: Check Duplicate Pending Invitations
-- ============================================================================
CREATE OR REPLACE FUNCTION check_duplicate_pending_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM team_invitations
      WHERE organization_id = NEW.organization_id
        AND email = NEW.email
        AND status = 'pending'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'A pending invitation already exists for this email in this organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_duplicate_pending ON team_invitations;
CREATE TRIGGER trigger_check_duplicate_pending
  BEFORE INSERT OR UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_pending_invitation();

-- ============================================================================
-- Function: Auto-expire Invitations
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Check Available Licenses
-- ============================================================================
CREATE OR REPLACE FUNCTION check_available_licenses(org_id UUID)
RETURNS TABLE(
  available_seats INTEGER,
  max_seats INTEGER,
  used_seats INTEGER,
  can_invite BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (o.max_team_members - o.used_team_members) as available_seats,
    o.max_team_members as max_seats,
    o.used_team_members as used_seats,
    (o.used_team_members < o.max_team_members) as can_invite
  FROM organizations o
  WHERE o.id = org_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Accept Team Invitation
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_team_invitation(
  invitation_token TEXT,
  user_id UUID
)
RETURNS JSON AS $$
DECLARE
  invitation RECORD;
  org_licenses RECORD;
BEGIN
  SELECT * INTO invitation
  FROM team_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  SELECT * INTO org_licenses
  FROM check_available_licenses(invitation.organization_id);

  IF NOT org_licenses.can_invite THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No available licenses. Organization must upgrade.'
    );
  END IF;

  UPDATE profiles
  SET organization_id = invitation.organization_id,
      role = invitation.role,
      updated_at = NOW()
  WHERE id = user_id;

  UPDATE team_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = user_id,
      updated_at = NOW()
  WHERE id = invitation.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', invitation.organization_id,
    'role', invitation.role
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update Existing Organizations
-- ============================================================================
UPDATE organizations o
SET used_team_members = (
  SELECT COUNT(*)
  FROM profiles p
  WHERE p.organization_id = o.id
),
updated_at = NOW()
WHERE used_team_members = 1;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN team_invitations.token IS 'Secure random token for invitation URL';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expires 7 days after creation';
COMMENT ON COLUMN organizations.max_team_members IS 'Maximum team members allowed by subscription plan';
COMMENT ON COLUMN organizations.used_team_members IS 'Current number of team members (auto-updated)';
COMMENT ON FUNCTION update_team_member_count() IS 'Auto-update used_team_members when profiles are added/removed';
COMMENT ON FUNCTION check_available_licenses(UUID) IS 'Check if organization has available license seats';
COMMENT ON FUNCTION accept_team_invitation(TEXT, UUID) IS 'Process invitation acceptance with license validation';
