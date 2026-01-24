-- STEP 5: Verify all security fixes have been applied

-- 1. Check RLS status on all tables
SELECT
    'RLS STATUS' as check_type,
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'webhook_events',
    'webhook_processing_errors',
    'payment_authentication_events',
    'refund_history',
    'refund_notifications',
    'payment_compliance_logs',
    'job_logs',
    'job_schedules',
    'cache_metadata',
    'cache_invalidation_logs',
    'cache_stats_daily',
    'key_rotation_log',
    'default_retention_policies',
    'deletion_audit_log'
)
ORDER BY tablename;

-- 2. Check RLS policies exist
SELECT
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    '✅ Policy exists' as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'webhook_events',
    'webhook_processing_errors',
    'payment_authentication_events',
    'refund_history',
    'refund_notifications',
    'payment_compliance_logs',
    'job_logs',
    'job_schedules',
    'cache_metadata',
    'cache_invalidation_logs',
    'cache_stats_daily',
    'key_rotation_log',
    'default_retention_policies',
    'deletion_audit_log'
)
ORDER BY tablename, policyname;

-- 3. Check functions have search_path set
SELECT
    'FUNCTION SEARCH_PATH' as check_type,
    p.proname as function_name,
    CASE
        WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN '✅ search_path=public'
        WHEN p.proconfig IS NOT NULL THEN '⚠️ Has config: ' || array_to_string(p.proconfig, ', ')
        ELSE '❌ No search_path set'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true  -- SECURITY DEFINER functions only
ORDER BY p.proname;

-- 4. Summary counts
SELECT
    'SUMMARY' as check_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public' AND p.prosecdef = true
     AND p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig)) as functions_with_search_path;
