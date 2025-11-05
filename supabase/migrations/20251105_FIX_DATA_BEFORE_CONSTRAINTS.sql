-- ============================================================================
-- Pre-Migration: Fix Existing Data
-- ============================================================================
-- Run this BEFORE ADD_CONSTRAINTS migration
-- Fixes: Organizations with used_team_members > max_team_members

-- Update all organizations to have sufficient max_team_members
UPDATE organizations
SET max_team_members = GREATEST(used_team_members, max_team_members, 5),
    updated_at = NOW()
WHERE used_team_members > max_team_members;

-- Show what was fixed
SELECT
  id,
  name,
  max_team_members,
  used_team_members,
  (max_team_members - used_team_members) as available_seats
FROM organizations
ORDER BY used_team_members DESC;

-- Success message
SELECT '✅ Data fixed - ready for constraints migration' as status;
