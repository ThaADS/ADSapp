-- ============================================================================
-- SIMPLE CLEANUP - Just drop functions and table
-- ============================================================================

-- Drop all functions first (no CASCADE needed, they're standalone)
DROP FUNCTION IF EXISTS generate_invitation_token();
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
DROP FUNCTION IF EXISTS log_invitation_event(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS check_duplicate_pending_invitation();
DROP FUNCTION IF EXISTS update_team_member_count();
DROP FUNCTION IF EXISTS expire_old_invitations();
DROP FUNCTION IF EXISTS check_available_licenses(UUID);
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT, UUID);

-- Drop table last (CASCADE will remove triggers automatically)
DROP TABLE IF EXISTS team_invitations CASCADE;

-- Simple verification
SELECT '✅ Cleanup complete' as status;
