-- ============================================================================
-- CLEANUP & DIAGNOSE - Run this FIRST before any migration
-- ============================================================================
-- This will clean up any partial/broken state from previous attempts

-- ============================================================================
-- STEP 1: Check what exists currently
-- ============================================================================

-- Check if team_invitations table exists
SELECT 'team_invitations table exists: ' || EXISTS(
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'team_invitations'
)::text as diagnosis;

-- Check what columns exist if table exists
SELECT 'Columns in team_invitations:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_invitations'
ORDER BY ordinal_position;

-- Check for existing triggers on team_invitations
SELECT 'Triggers on team_invitations:' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'team_invitations';

-- Check for existing functions related to team
SELECT 'Functions related to team:' as info;
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%team%' OR proname LIKE '%invitation%';

-- ============================================================================
-- STEP 2: COMPLETE CLEANUP (only run if you want to start fresh)
-- ============================================================================

-- DROP everything related to team invitations
DROP TABLE IF EXISTS team_invitations CASCADE;

-- Drop all related functions
DROP FUNCTION IF EXISTS check_duplicate_pending_invitation() CASCADE;
DROP FUNCTION IF EXISTS update_team_member_count() CASCADE;
DROP FUNCTION IF EXISTS expire_old_invitations() CASCADE;
DROP FUNCTION IF EXISTS check_available_licenses(UUID) CASCADE;
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT, UUID) CASCADE;

-- Remove license columns from organizations (if you want clean slate)
-- CAREFUL: Uncomment only if you want to remove these columns
-- ALTER TABLE organizations DROP COLUMN IF EXISTS max_team_members;
-- ALTER TABLE organizations DROP COLUMN IF EXISTS used_team_members;

-- ============================================================================
-- STEP 3: Verify cleanup
-- ============================================================================

SELECT 'Cleanup complete. Verify:' as status;

SELECT
  CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations')
    THEN '❌ team_invitations still exists'
    ELSE '✅ team_invitations removed'
  END as table_status;

SELECT
  CASE
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname LIKE '%team%' OR proname LIKE '%invitation%')
    THEN '❌ team functions still exist'
    ELSE '✅ team functions removed'
  END as function_status;
