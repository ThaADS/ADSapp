-- ============================================================================
-- Team Invitations & License Management - PART 2: Functions & Triggers
-- ============================================================================
-- Migration: 20251105_team_invitations_part2_functions
-- Purpose: Create functions and triggers (run AFTER part1_tables.sql)
-- Author: AI Assistant
-- Date: 2025-11-05
-- Prerequisites: part1_tables.sql must be applied first
-- Strategy: Split migration to avoid function body validation issues

-- ============================================================================
-- IMPORTANT: Run Part 1 first!
-- ============================================================================
-- This migration will FAIL if you haven't run part1_tables.sql first.
-- Part 1 creates the team_invitations table and columns.
-- Part 2 (this file) creates functions and triggers that reference those columns.

-- ============================================================================
-- STEP 1: Create Functions
-- ============================================================================

-- Function: Check for duplicate pending invitations
-- Prevents multiple pending invitations for same email/organization
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
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'A pending invitation already exists for this email in this organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update team member count
-- Auto-increments/decrements used_team_members when profiles are added/removed
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

-- Function: Auto-expire invitations
-- Utility function to mark expired invitations (can be called by cron job)
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

-- Function: Check available licenses
-- Returns license seat availability for an organization
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

-- Function: Accept team invitation
-- Processes invitation acceptance with license validation
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
-- STEP 2: Create Triggers
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_check_duplicate_pending ON team_invitations;
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON profiles;

-- Trigger: Check for duplicate pending invitations
CREATE TRIGGER trigger_check_duplicate_pending
  BEFORE INSERT OR UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_pending_invitation();

-- Trigger: Update team member count when profiles change
CREATE TRIGGER trigger_update_team_member_count
  AFTER INSERT OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- ============================================================================
-- STEP 3: Add Function Documentation
-- ============================================================================

COMMENT ON FUNCTION update_team_member_count() IS
'Auto-update used_team_members when profiles are added/removed. Enforces license limits.';

COMMENT ON FUNCTION check_available_licenses(UUID) IS
'Check if organization has available license seats for new team members.';

COMMENT ON FUNCTION accept_team_invitation(TEXT, UUID) IS
'Process invitation acceptance with license validation and profile updates.';

COMMENT ON FUNCTION expire_old_invitations() IS
'Mark all pending invitations past their expiration date as expired. Call periodically via cron.';

COMMENT ON FUNCTION check_duplicate_pending_invitation() IS
'Prevent duplicate pending invitations for the same email/organization combination.';

-- ============================================================================
-- STEP 4: Initialize Existing Organizations (Optional but Recommended)
-- ============================================================================

-- Update existing organizations to reflect actual team member counts
-- This ensures data consistency for organizations created before this migration
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
-- Migration Complete
-- ============================================================================
-- Part 2 complete. Team invitations system is now fully functional.
--
-- Next steps:
-- 1. Test invitation creation via API
-- 2. Test invitation acceptance flow
-- 3. Verify license seat counting
-- 4. Set up cron job to call expire_old_invitations() daily
