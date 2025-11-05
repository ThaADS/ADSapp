-- ============================================================================
-- Migration Verification Queries
-- ============================================================================
-- Run these queries to verify all team invitations & WhatsApp migrations
-- Expected results are documented below each query

-- ============================================================================
-- 1. Verify team_invitations table structure
-- ============================================================================
-- Expected: 12 columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'team_invitations'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid), organization_id (uuid), email (text), role (text),
-- invited_by (uuid), status (text), token (text), expires_at (timestamp),
-- accepted_at (timestamp), accepted_by (uuid), created_at (timestamp), updated_at (timestamp)

-- ============================================================================
-- 2. Verify team_invitations indexes
-- ============================================================================
-- Expected: 5 indexes (including primary key)
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'team_invitations'
ORDER BY indexname;

-- Expected indexes:
-- team_invitations_pkey (PRIMARY KEY on id)
-- idx_team_invitations_organization
-- idx_team_invitations_email
-- idx_team_invitations_token
-- idx_team_invitations_status

-- ============================================================================
-- 3. Verify foreign key constraints
-- ============================================================================
-- Expected: 3 foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'team_invitations'
ORDER BY tc.constraint_name;

-- Expected foreign keys:
-- team_invitations_organization_id_fkey -> organizations(id) ON DELETE CASCADE
-- team_invitations_invited_by_fkey -> profiles(id) ON DELETE CASCADE
-- team_invitations_accepted_by_fkey -> profiles(id) ON DELETE SET NULL

-- ============================================================================
-- 4. Verify CHECK constraints
-- ============================================================================
-- Expected: 4 CHECK constraints
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'team_invitations'::regclass
    AND contype = 'c'
ORDER BY conname;

-- Expected CHECK constraints:
-- team_invitations_role_check: role IN ('admin', 'member')
-- team_invitations_status_check: status IN ('pending', 'accepted', 'expired', 'revoked')
-- team_invitations_expires_at_check: expires_at > created_at
-- team_invitations_accepted_at_check: accepted_at IS NULL OR accepted_at >= created_at

-- ============================================================================
-- 5. Verify RLS policies on team_invitations
-- ============================================================================
-- Expected: 4 RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'team_invitations'
ORDER BY policyname;

-- Expected policies:
-- "Users can view invitations for their organization" (SELECT)
-- "Admins can create invitations" (INSERT)
-- "Admins can update invitations" (UPDATE)
-- "Admins can delete invitations" (DELETE)

-- ============================================================================
-- 6. Verify organizations table has license management columns
-- ============================================================================
-- Expected: 2 new columns (max_team_members, used_team_members)
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND column_name IN ('max_team_members', 'used_team_members')
ORDER BY column_name;

-- Expected:
-- max_team_members: integer, DEFAULT 1, NOT NULL
-- used_team_members: integer, DEFAULT 1, NOT NULL

-- ============================================================================
-- 7. Verify organizations CHECK constraints
-- ============================================================================
-- Expected: 2 CHECK constraints
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
    AND contype = 'c'
    AND conname LIKE '%team_members%'
ORDER BY conname;

-- Expected:
-- check_max_team_members: max_team_members > 0
-- check_used_within_max: used_team_members <= max_team_members

-- ============================================================================
-- 8. Verify all 5 functions exist
-- ============================================================================
-- Expected: 5 functions
SELECT
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'check_duplicate_pending_invitation',
        'update_team_member_count',
        'expire_old_invitations',
        'check_available_licenses',
        'accept_team_invitation'
    )
ORDER BY routine_name;

-- Expected functions:
-- check_duplicate_pending_invitation() -> trigger
-- update_team_member_count() -> trigger
-- expire_old_invitations() -> void
-- check_available_licenses(uuid) -> TABLE
-- accept_team_invitation(text, uuid) -> json

-- ============================================================================
-- 9. Verify triggers exist
-- ============================================================================
-- Expected: 2 triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table IN ('team_invitations', 'profiles')
    AND trigger_name IN (
        'check_duplicate_before_insert',
        'update_team_count_trigger'
    )
ORDER BY trigger_name;

-- Expected triggers:
-- check_duplicate_before_insert on team_invitations (BEFORE INSERT)
-- update_team_count_trigger on profiles (AFTER INSERT OR DELETE)

-- ============================================================================
-- 10. Verify WhatsApp credentials columns
-- ============================================================================
-- Expected: 4 WhatsApp columns in organizations
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND column_name LIKE 'whatsapp%'
ORDER BY column_name;

-- Expected columns:
-- whatsapp_access_token: text, nullable
-- whatsapp_business_account_id: text, nullable
-- whatsapp_phone_number_id: text, nullable
-- whatsapp_webhook_verify_token: text, nullable

-- ============================================================================
-- 11. Test check_available_licenses function
-- ============================================================================
-- This tests if the license checking function works correctly
-- Replace 'your-org-id' with an actual organization ID
-- SELECT * FROM check_available_licenses('your-org-id');

-- Expected result format:
-- available_seats | max_seats | used_seats | can_invite
-- 2               | 5         | 3          | true

-- ============================================================================
-- 12. Verify current organization license status
-- ============================================================================
-- Shows current license usage for all organizations
SELECT
    id,
    name,
    max_team_members,
    used_team_members,
    (max_team_members - used_team_members) as available_seats,
    CASE
        WHEN used_team_members < max_team_members THEN '✅ Can invite'
        ELSE '⚠️ License limit reached'
    END as status
FROM organizations
ORDER BY name;

-- ============================================================================
-- 13. Summary counts
-- ============================================================================
SELECT
    'team_invitations columns' as check_type,
    COUNT(*)::text as result,
    '12' as expected
FROM information_schema.columns
WHERE table_name = 'team_invitations'

UNION ALL

SELECT
    'team_invitations indexes',
    COUNT(*)::text,
    '5'
FROM pg_indexes
WHERE tablename = 'team_invitations'

UNION ALL

SELECT
    'team_invitations foreign keys',
    COUNT(*)::text,
    '3'
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'team_invitations'

UNION ALL

SELECT
    'team_invitations CHECK constraints',
    COUNT(*)::text,
    '4'
FROM pg_constraint
WHERE conrelid = 'team_invitations'::regclass
    AND contype = 'c'

UNION ALL

SELECT
    'team_invitations RLS policies',
    COUNT(*)::text,
    '4'
FROM pg_policies
WHERE tablename = 'team_invitations'

UNION ALL

SELECT
    'team management functions',
    COUNT(*)::text,
    '5'
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'check_duplicate_pending_invitation',
        'update_team_member_count',
        'expire_old_invitations',
        'check_available_licenses',
        'accept_team_invitation'
    )

UNION ALL

SELECT
    'team management triggers',
    COUNT(*)::text,
    '2'
FROM information_schema.triggers
WHERE trigger_name IN (
        'check_duplicate_before_insert',
        'update_team_count_trigger'
    )

UNION ALL

SELECT
    'organizations WhatsApp columns',
    COUNT(*)::text,
    '4'
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND column_name LIKE 'whatsapp%'

ORDER BY check_type;

-- ============================================================================
-- Verification Complete
-- ============================================================================
-- If all counts match expected values, migrations were successful! ✅
