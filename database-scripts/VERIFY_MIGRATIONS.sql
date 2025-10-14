-- ============================================================================
-- MIGRATION VERIFICATION SCRIPT
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Comprehensive verification of all Week 1-2 migrations
-- Date: 2025-10-13
-- Usage: Run after applying APPLY_ALL_MIGRATIONS.sql
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'ADSapp Migration Verification Suite'
\echo 'Started at:' `date`
\echo '============================================================================'
\echo ''

-- ============================================================================
-- TEST 1: RLS COVERAGE
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 1: Row Level Security (RLS) Coverage'
\echo '============================================================================'

-- List all tables with RLS enabled
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY rowsecurity DESC, tablename;

-- Count RLS-enabled tables
SELECT
  COUNT(*) FILTER (WHERE rowsecurity = true) AS tables_with_rls,
  COUNT(*) AS total_tables,
  ROUND(100.0 * COUNT(*) FILTER (WHERE rowsecurity = true) / COUNT(*), 2) AS rls_coverage_pct
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%';

-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

\echo '✓ TEST 1 Complete: RLS Coverage'
\echo ''

-- ============================================================================
-- TEST 2: MFA IMPLEMENTATION
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 2: Multi-Factor Authentication (MFA)'
\echo '============================================================================'

-- Check MFA columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_enrolled_at')
ORDER BY column_name;

-- Check MFA indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%mfa%';

-- Check MFA functions
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%mfa%'
ORDER BY routine_name;

-- Check MFA constraints
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'profiles'
  AND conname LIKE '%mfa%';

-- Check MFA statistics view
SELECT
  users_with_mfa,
  users_without_mfa,
  total_users,
  mfa_adoption_percentage
FROM mfa_statistics;

\echo '✓ TEST 2 Complete: MFA Implementation'
\echo ''

-- ============================================================================
-- TEST 3: SESSION MANAGEMENT
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 3: Session Management'
\echo '============================================================================'

-- Check sessions table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- Check session indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'sessions';

-- Check session management functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'cleanup_expired_sessions',
    'revoke_all_user_sessions',
    'get_user_session_stats',
    'check_privilege_change'
  )
ORDER BY routine_name;

-- Check active_sessions view
\d active_sessions

-- Count current sessions (should be 0 on fresh install)
SELECT
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE revoked = false AND expires_at > NOW()) AS active_sessions,
  COUNT(*) FILTER (WHERE revoked = true) AS revoked_sessions
FROM sessions;

\echo '✓ TEST 3 Complete: Session Management'
\echo ''

-- ============================================================================
-- TEST 4: WEBHOOK INFRASTRUCTURE
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 4: Webhook Infrastructure'
\echo '============================================================================'

-- Check webhook tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('webhook_events', 'webhook_processing_errors')
ORDER BY table_name;

-- Check webhook indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('webhook_events', 'webhook_processing_errors')
ORDER BY tablename, indexname;

-- Check webhook functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%webhook%'
ORDER BY routine_name;

-- Check webhook_event_stats view
\d webhook_event_stats

-- Count webhook events (should be 0 on fresh install)
SELECT
  status,
  COUNT(*) AS event_count
FROM webhook_events
GROUP BY status;

\echo '✓ TEST 4 Complete: Webhook Infrastructure'
\echo ''

-- ============================================================================
-- TEST 5: PAYMENT INFRASTRUCTURE
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 5: Payment Infrastructure (Payment Intents & Refunds)'
\echo '============================================================================'

-- Check payment tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'payment_intents',
    'payment_authentication_events',
    'payment_compliance_logs',
    'refunds',
    'refund_history',
    'refund_notifications'
  )
ORDER BY table_name;

-- Check payment indexes
SELECT
  tablename,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'payment_intents',
    'payment_authentication_events',
    'payment_compliance_logs',
    'refunds',
    'refund_history',
    'refund_notifications'
  )
GROUP BY tablename
ORDER BY tablename;

-- Check payment functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%payment%'
    OR routine_name LIKE '%refund%'
    OR routine_name LIKE '%authentication%'
  )
ORDER BY routine_name;

-- Check payment views
SELECT
  table_name AS view_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND (table_name LIKE '%payment%' OR table_name LIKE '%refund%')
ORDER BY table_name;

\echo '✓ TEST 5 Complete: Payment Infrastructure'
\echo ''

-- ============================================================================
-- TEST 6: JOB QUEUE SYSTEM
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 6: Job Queue System'
\echo '============================================================================'

-- Check job queue tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('job_logs', 'job_schedules')
ORDER BY table_name;

-- Check job queue indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('job_logs', 'job_schedules')
ORDER BY tablename, indexname;

-- Check job queue functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%job%'
ORDER BY routine_name;

-- Count job logs (should be 0 on fresh install)
SELECT
  job_type,
  status,
  COUNT(*) AS job_count
FROM job_logs
GROUP BY job_type, status;

\echo '✓ TEST 6 Complete: Job Queue System'
\echo ''

-- ============================================================================
-- TEST 7: CACHE INFRASTRUCTURE
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 7: Cache Infrastructure'
\echo '============================================================================'

-- Check cache tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily')
ORDER BY table_name;

-- Check cache indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily')
ORDER BY tablename, indexname;

-- Check cache functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%cache%'
ORDER BY routine_name;

-- Check cache views
SELECT
  table_name AS view_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND table_name LIKE '%cache%'
ORDER BY table_name;

\echo '✓ TEST 7 Complete: Cache Infrastructure'
\echo ''

-- ============================================================================
-- TEST 8: HELPER FUNCTIONS
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 8: Helper Functions'
\echo '============================================================================'

-- Check critical helper functions
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_super_admin',
    'get_user_organization',
    'user_has_mfa_enabled',
    'cleanup_expired_sessions',
    'mark_webhook_event_processing',
    'is_webhook_event_processed'
  )
ORDER BY routine_name;

\echo '✓ TEST 8 Complete: Helper Functions'
\echo ''

-- ============================================================================
-- TEST 9: FOREIGN KEY RELATIONSHIPS
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 9: Foreign Key Relationships'
\echo '============================================================================'

-- Check foreign keys for new tables
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'sessions',
    'webhook_events',
    'webhook_processing_errors',
    'payment_intents',
    'payment_authentication_events',
    'payment_compliance_logs',
    'refunds',
    'refund_history',
    'refund_notifications',
    'job_logs',
    'job_schedules',
    'cache_metadata',
    'cache_invalidation_logs',
    'cache_stats_daily'
  )
ORDER BY tc.table_name, kcu.column_name;

\echo '✓ TEST 9 Complete: Foreign Key Relationships'
\echo ''

-- ============================================================================
-- TEST 10: COMPREHENSIVE SUMMARY
-- ============================================================================

\echo '============================================================================'
\echo 'TEST 10: Comprehensive Summary'
\echo '============================================================================'

SELECT
  'Total Tables' AS metric,
  COUNT(*)::text AS value
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  'Tables with RLS',
  COUNT(*)::text
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true

UNION ALL

SELECT
  'Total RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Total Indexes',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Total Functions',
  COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'

UNION ALL

SELECT
  'Total Views',
  COUNT(*)::text
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'

UNION ALL

SELECT
  'Total Triggers',
  COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT
  'Foreign Key Constraints',
  COUNT(*)::text
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'

ORDER BY metric;

\echo ''
\echo '✓ TEST 10 Complete: Comprehensive Summary'
\echo ''

-- ============================================================================
-- FINAL VERIFICATION REPORT
-- ============================================================================

\echo '============================================================================'
\echo 'FINAL VERIFICATION REPORT'
\echo '============================================================================'

DO $$
DECLARE
  v_all_checks_passed BOOLEAN := true;
  v_tables_with_rls INTEGER;
  v_total_policies INTEGER;
  v_mfa_columns INTEGER;
  v_sessions_exists BOOLEAN;
  v_webhook_tables INTEGER;
  v_payment_tables INTEGER;
  v_job_tables INTEGER;
  v_cache_tables INTEGER;
BEGIN
  -- Check 1: RLS Coverage
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  IF v_tables_with_rls < 24 THEN
    RAISE WARNING 'FAIL: Expected at least 24 tables with RLS, found %', v_tables_with_rls;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: RLS enabled on % tables', v_tables_with_rls;
  END IF;

  -- Check 2: RLS Policies
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  IF v_total_policies < 96 THEN
    RAISE WARNING 'FAIL: Expected at least 96 RLS policies, found %', v_total_policies;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: % RLS policies created', v_total_policies;
  END IF;

  -- Check 3: MFA Columns
  SELECT COUNT(*) INTO v_mfa_columns
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_enrolled_at');

  IF v_mfa_columns != 4 THEN
    RAISE WARNING 'FAIL: Expected 4 MFA columns, found %', v_mfa_columns;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: All 4 MFA columns present';
  END IF;

  -- Check 4: Sessions Table
  v_sessions_exists := EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions'
  );

  IF NOT v_sessions_exists THEN
    RAISE WARNING 'FAIL: Sessions table not found';
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: Sessions table exists';
  END IF;

  -- Check 5: Webhook Tables
  SELECT COUNT(*) INTO v_webhook_tables
  FROM information_schema.tables
  WHERE table_name IN ('webhook_events', 'webhook_processing_errors');

  IF v_webhook_tables != 2 THEN
    RAISE WARNING 'FAIL: Expected 2 webhook tables, found %', v_webhook_tables;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: All 2 webhook tables present';
  END IF;

  -- Check 6: Payment Tables
  SELECT COUNT(*) INTO v_payment_tables
  FROM information_schema.tables
  WHERE table_name IN (
    'payment_intents', 'payment_authentication_events', 'payment_compliance_logs',
    'refunds', 'refund_history', 'refund_notifications'
  );

  IF v_payment_tables != 6 THEN
    RAISE WARNING 'FAIL: Expected 6 payment tables, found %', v_payment_tables;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: All 6 payment tables present';
  END IF;

  -- Check 7: Job Queue Tables
  SELECT COUNT(*) INTO v_job_tables
  FROM information_schema.tables
  WHERE table_name IN ('job_logs', 'job_schedules');

  IF v_job_tables != 2 THEN
    RAISE WARNING 'FAIL: Expected 2 job queue tables, found %', v_job_tables;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: All 2 job queue tables present';
  END IF;

  -- Check 8: Cache Tables
  SELECT COUNT(*) INTO v_cache_tables
  FROM information_schema.tables
  WHERE table_name IN ('cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily');

  IF v_cache_tables != 3 THEN
    RAISE WARNING 'FAIL: Expected 3 cache tables, found %', v_cache_tables;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE 'PASS: All 3 cache tables present';
  END IF;

  -- Final Result
  RAISE NOTICE '';
  IF v_all_checks_passed THEN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✓✓✓ ALL VERIFICATION CHECKS PASSED ✓✓✓';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Migrations applied successfully. Database is ready for use.';
  ELSE
    RAISE WARNING '============================================================================';
    RAISE WARNING '✗✗✗ SOME VERIFICATION CHECKS FAILED ✗✗✗';
    RAISE WARNING '============================================================================';
    RAISE WARNING 'Review the warnings above and check migration logs.';
  END IF;
  RAISE NOTICE '';

END $$;

\echo ''
\echo 'Verification completed at:' `date`
\echo '============================================================================'
