-- ============================================================================
-- COMPLETE CLEANUP - Remove all team invitation objects
-- ============================================================================
-- Run this FIRST to clean up broken state from previous attempts

-- Drop table (CASCADE removes all dependent objects)
DROP TABLE IF EXISTS team_invitations CASCADE;

-- Drop all functions (even if CASCADE already removed them)
DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_invitations() CASCADE;
DROP FUNCTION IF EXISTS log_invitation_event(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_pending_invitation() CASCADE;
DROP FUNCTION IF EXISTS update_team_member_count() CASCADE;
DROP FUNCTION IF EXISTS expire_old_invitations() CASCADE;
DROP FUNCTION IF EXISTS check_available_licenses(UUID) CASCADE;
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT, UUID) CASCADE;

-- Drop any triggers that might exist
-- Note: Triggers are automatically dropped with CASCADE on table drop
-- But we include these for completeness if table exists
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_check_duplicate_pending ON team_invitations;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_generate_token ON team_invitations;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_log_invitation ON team_invitations;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- This one is on profiles table, so it should work
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON profiles;

-- Verify cleanup success
SELECT
  CASE
    WHEN NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations')
    THEN '✅ team_invitations table removed'
    ELSE '❌ team_invitations still exists'
  END as cleanup_status;

SELECT '✅ Cleanup complete - ready for fresh migration' as status;
