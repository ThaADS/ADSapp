-- ============================================================================
-- Team Invitations & License Management
-- ============================================================================
-- Migration: 20251105_team_invitations_licenses
-- Purpose: Enable team member invitations and license seat management
-- Author: AI Assistant
-- Date: 2025-11-05

-- ============================================================================
-- Team Invitations Table
-- ============================================================================
-- Tracks pending invitations to join organizations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  token TEXT NOT NULL UNIQUE, -- Secure token for invitation link

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Acceptance tracking
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (expires_at > created_at),
  CHECK (accepted_at IS NULL OR accepted_at >= created_at)
);

-- Basic indexes for performance (create immediately after table)
CREATE INDEX IF NOT EXISTS idx_team_invitations_organization ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- RLS Policies for team_invitations (enable RLS before policies)
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
-- Add License Management Columns to Organizations
-- ============================================================================
-- Track available and used license seats per organization

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS used_team_members INTEGER DEFAULT 1 NOT NULL;

-- Add constraints
ALTER TABLE organizations ADD CONSTRAINT check_max_team_members CHECK (max_team_members > 0);
ALTER TABLE organizations ADD CONSTRAINT check_used_within_max CHECK (used_team_members <= max_team_members);

-- Create index for license queries
CREATE INDEX IF NOT EXISTS idx_organizations_license_usage ON organizations(used_team_members, max_team_members);

-- ============================================================================
-- Function: Update Used Team Members Count
-- ============================================================================
-- Automatically update used_team_members when profiles are added/removed

CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment used count
    UPDATE organizations
    SET used_team_members = used_team_members + 1,
        updated_at = NOW()
    WHERE id = NEW.organization_id;

    -- Check if we exceeded the limit
    IF (SELECT used_team_members > max_team_members FROM organizations WHERE id = NEW.organization_id) THEN
      RAISE EXCEPTION 'License limit exceeded. Upgrade your plan to add more team members.';
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement used count
    UPDATE organizations
    SET used_team_members = GREATEST(used_team_members - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.organization_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON profiles;
CREATE TRIGGER trigger_update_team_member_count
  AFTER INSERT OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- ============================================================================
-- Function: Auto-expire Invitations
-- ============================================================================
-- Mark expired invitations as expired

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
-- Check if organization has available licenses for new members

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
-- Process invitation acceptance with license validation

CREATE OR REPLACE FUNCTION accept_team_invitation(
  invitation_token TEXT,
  user_id UUID
)
RETURNS JSON AS $$
DECLARE
  invitation RECORD;
  org_licenses RECORD;
  result JSON;
BEGIN
  -- Get invitation details
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

  -- Check license availability
  SELECT * INTO org_licenses
  FROM check_available_licenses(invitation.organization_id);

  IF NOT org_licenses.can_invite THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No available licenses. Organization must upgrade.'
    );
  END IF;

  -- Update user's profile
  UPDATE profiles
  SET organization_id = invitation.organization_id,
      role = invitation.role,
      updated_at = NOW()
  WHERE id = user_id;

  -- Mark invitation as accepted
  UPDATE team_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = user_id,
      updated_at = NOW()
  WHERE id = invitation.id;

  -- Return success
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
-- Set used_team_members based on actual profile count

UPDATE organizations o
SET used_team_members = (
  SELECT COUNT(*)
  FROM profiles p
  WHERE p.organization_id = o.id
),
updated_at = NOW()
WHERE used_team_members = 1; -- Only update if still at default

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN team_invitations.token IS 'Secure random token for invitation URL';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expires 7 days after creation';

COMMENT ON COLUMN organizations.max_team_members IS 'Maximum team members allowed by subscription plan';
COMMENT ON COLUMN organizations.used_team_members IS 'Current number of team members (auto-updated)';

COMMENT ON FUNCTION update_team_member_count() IS 'Auto-update used_team_members when profiles are added/removed';
COMMENT ON FUNCTION check_available_licenses(UUID) IS 'Check if organization has available license seats';
COMMENT ON FUNCTION accept_team_invitation(TEXT, UUID) IS 'Process invitation acceptance with license validation';

-- ============================================================================
-- Unique Constraint via Function (Workaround for partial index issues)
-- ============================================================================
-- Supabase has issues with partial indexes on TEXT columns with WHERE clauses
-- Solution: Use a trigger-based approach to enforce uniqueness

-- Function to check for duplicate pending invitations
CREATE OR REPLACE FUNCTION check_duplicate_pending_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for pending status
  IF NEW.status = 'pending' THEN
    -- Check if another pending invitation exists for this org/email combo
    IF EXISTS (
      SELECT 1 FROM team_invitations
      WHERE organization_id = NEW.organization_id
        AND email = NEW.email
        AND status = 'pending'
        AND id != NEW.id  -- Exclude current row for updates
    ) THEN
      RAISE EXCEPTION 'A pending invitation already exists for this email in this organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS trigger_check_duplicate_pending ON team_invitations;
CREATE TRIGGER trigger_check_duplicate_pending
  BEFORE INSERT OR UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_pending_invitation();

-- Composite index for pending invitations queries (no WHERE clause)
-- Includes status in the index to help queries filter by pending status
CREATE INDEX IF NOT EXISTS idx_team_invitations_org_email_status
  ON team_invitations(organization_id, email, status);

-- Composite index for expires_at queries with status
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_status
  ON team_invitations(expires_at, status);

-- ============================================================================
-- Migration Complete
-- ============================================================================
