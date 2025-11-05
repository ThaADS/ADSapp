-- ============================================================================
-- Team Invitations - Add Constraints and RLS
-- ============================================================================
-- Run this AFTER the ABSOLUTE_MINIMAL migration
-- Adds: Foreign Keys, CHECK constraints, RLS policies

-- ============================================================================
-- STEP 1: Add Foreign Key Constraints
-- ============================================================================

-- Add foreign key to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_organization_id_fkey'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to profiles (invited_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_invited_by_fkey'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_invited_by_fkey
      FOREIGN KEY (invited_by)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to profiles (accepted_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_accepted_by_fkey'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_accepted_by_fkey
      FOREIGN KEY (accepted_by)
      REFERENCES profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add CHECK Constraints
-- ============================================================================

-- Check role is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_role_check'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_role_check
      CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- Check status is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_status_check'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));
  END IF;
END $$;

-- Check expires_at is in the future
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_expires_at_check'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_expires_at_check
      CHECK (expires_at > created_at);
  END IF;
END $$;

-- Check accepted_at is after created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_accepted_at_check'
  ) THEN
    ALTER TABLE team_invitations
      ADD CONSTRAINT team_invitations_accepted_at_check
      CHECK (accepted_at IS NULL OR accepted_at >= created_at);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Pre-flight Data Fix
-- ============================================================================

-- CRITICAL: Update max_team_members BEFORE adding constraints
-- This prevents constraint violations when we later update used_team_members
UPDATE organizations o
SET max_team_members = GREATEST(
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id),
  max_team_members,
  5
),
updated_at = NOW();

-- ============================================================================
-- STEP 4: Add License Management Constraints
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_team_members') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_max_team_members CHECK (max_team_members > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_used_within_max') THEN
    ALTER TABLE organizations ADD CONSTRAINT check_used_within_max CHECK (used_team_members <= max_team_members);
  END IF;
END $$;

-- Create index for license queries
CREATE INDEX IF NOT EXISTS idx_organizations_license_usage ON organizations(used_team_members, max_team_members);

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON team_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;

-- Create RLS policies
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
-- STEP 5: Update Existing Organizations
-- ============================================================================

-- Update existing organizations to reflect actual team member counts
UPDATE organizations o
SET used_team_members = (
  SELECT COUNT(*)
  FROM profiles p
  WHERE p.organization_id = o.id
),
updated_at = NOW()
WHERE used_team_members = 1  -- Only update if still at default
  OR used_team_members != (    -- Or if count is inaccurate
    SELECT COUNT(*)
    FROM profiles p
    WHERE p.organization_id = o.id
  );

-- ============================================================================
-- STEP 6: Add Documentation Comments
-- ============================================================================

COMMENT ON TABLE team_invitations IS 'Pending invitations for users to join organizations';
COMMENT ON COLUMN team_invitations.token IS 'Secure random token for invitation URL';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expires 7 days after creation';
COMMENT ON COLUMN team_invitations.status IS 'Invitation status: pending, accepted, expired, or revoked';
COMMENT ON COLUMN team_invitations.role IS 'Role to assign when invitation is accepted: admin or member';

COMMENT ON COLUMN organizations.max_team_members IS 'Maximum team members allowed by subscription plan';
COMMENT ON COLUMN organizations.used_team_members IS 'Current number of team members (auto-updated by trigger)';

-- ============================================================================
-- Constraints Complete
-- ============================================================================

SELECT '✅ Constraints, RLS, and documentation added successfully' as status;
