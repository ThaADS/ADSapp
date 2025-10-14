-- ============================================================================
-- ROLLBACK SCRIPT FOR ALL WEEK 1-2 MIGRATIONS
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Rollback all accumulated Week 1-2 database migrations
-- Date: 2025-10-13
-- WARNING: THIS WILL REMOVE ALL SECURITY ENHANCEMENTS FROM WEEK 1-2
-- ============================================================================

-- ============================================================================
-- SAFETY WARNING
-- ============================================================================

DO $$
BEGIN
  RAISE WARNING '============================================================================';
  RAISE WARNING 'WARNING: YOU ARE ABOUT TO ROLLBACK ALL WEEK 1-2 MIGRATIONS';
  RAISE WARNING '============================================================================';
  RAISE WARNING 'This will remove:';
  RAISE WARNING '- All RLS policies from 24 tables';
  RAISE WARNING '- MFA implementation';
  RAISE WARNING '- Session management system';
  RAISE WARNING '- Webhook infrastructure';
  RAISE WARNING '- Payment processing tables';
  RAISE WARNING '- Job queue system';
  RAISE WARNING '- Cache infrastructure';
  RAISE WARNING '';
  RAISE WARNING 'This action is IRREVERSIBLE without re-applying migrations.';
  RAISE WARNING 'Ensure you have a recent backup before proceeding.';
  RAISE WARNING '============================================================================';
END $$;

-- Uncomment the BEGIN below to enable transaction rollback
-- BEGIN;

\set ON_ERROR_STOP on

-- ============================================================================
-- ROLLBACK 8: CACHE INFRASTRUCTURE
-- ============================================================================

\echo ''
\echo 'Rollback 8/8: Cache Infrastructure'

DROP VIEW IF EXISTS cache_performance_view CASCADE;
DROP FUNCTION IF EXISTS get_cache_health_report(UUID) CASCADE;
DROP FUNCTION IF EXISTS aggregate_cache_stats_daily() CASCADE;
DROP FUNCTION IF EXISTS log_cache_invalidation(UUID, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT[], UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_cache_metadata(UUID, TEXT, TEXT, BOOLEAN, NUMERIC, INTEGER, INTEGER) CASCADE;
DROP TABLE IF EXISTS cache_stats_daily CASCADE;
DROP TABLE IF EXISTS cache_invalidation_logs CASCADE;
DROP TABLE IF EXISTS cache_metadata CASCADE;

\echo '✓ Rollback 8/8 complete'

-- ============================================================================
-- ROLLBACK 7: JOB QUEUE SYSTEM
-- ============================================================================

\echo ''
\echo 'Rollback 7/8: Job Queue System'

DROP FUNCTION IF EXISTS cleanup_old_job_logs(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_organization_job_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TABLE IF EXISTS job_schedules CASCADE;
DROP TABLE IF EXISTS job_logs CASCADE;

\echo '✓ Rollback 7/8 complete'

-- ============================================================================
-- ROLLBACK 6: REFUND MANAGEMENT
-- ============================================================================

\echo ''
\echo 'Rollback 6/8: Refund Management'

DROP VIEW IF EXISTS refund_statistics CASCADE;
DROP FUNCTION IF EXISTS check_refund_eligibility(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fail_refund(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS complete_refund(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS approve_refund(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_refund_request(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS log_refund_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_refunds_updated_at() CASCADE;
DROP TABLE IF EXISTS refund_notifications CASCADE;
DROP TABLE IF EXISTS refund_history CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;

\echo '✓ Rollback 6/8 complete'

-- ============================================================================
-- ROLLBACK 5: PAYMENT INTENTS (3D SECURE)
-- ============================================================================

\echo ''
\echo 'Rollback 5/8: Payment Intents (3D Secure)'

DROP VIEW IF EXISTS payment_intent_statistics CASCADE;
DROP FUNCTION IF EXISTS get_authentication_statistics(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_payment_intents() CASCADE;
DROP FUNCTION IF EXISTS log_compliance_validation(UUID, TEXT, TEXT, JSONB, TEXT, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS log_authentication_event(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, INET) CASCADE;
DROP FUNCTION IF EXISTS update_payment_intent_status(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_payment_intent_record(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INET) CASCADE;
DROP FUNCTION IF EXISTS update_payment_intents_updated_at() CASCADE;
DROP TABLE IF EXISTS payment_compliance_logs CASCADE;
DROP TABLE IF EXISTS payment_authentication_events CASCADE;
DROP TABLE IF EXISTS payment_intents CASCADE;

\echo '✓ Rollback 5/8 complete'

-- ============================================================================
-- ROLLBACK 4: WEBHOOK INFRASTRUCTURE
-- ============================================================================

\echo ''
\echo 'Rollback 4/8: Webhook Infrastructure'

DROP VIEW IF EXISTS webhook_event_stats CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_events(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_webhook_events_for_retry() CASCADE;
DROP FUNCTION IF EXISTS is_webhook_event_processed(TEXT) CASCADE;
DROP FUNCTION IF EXISTS mark_webhook_event_failed(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS mark_webhook_event_completed(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS mark_webhook_event_processing(TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_webhook_events_updated_at() CASCADE;
DROP TABLE IF EXISTS webhook_processing_errors CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;

\echo '✓ Rollback 4/8 complete'

-- ============================================================================
-- ROLLBACK 3: SESSION MANAGEMENT
-- ============================================================================

\echo ''
\echo 'Rollback 3/8: Session Management'

DROP VIEW IF EXISTS active_sessions CASCADE;
DROP FUNCTION IF EXISTS check_privilege_change(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_session_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS revoke_all_user_sessions(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS set_session_revoked_at() CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

\echo '✓ Rollback 3/8 complete'

-- ============================================================================
-- ROLLBACK 2: MFA IMPLEMENTATION
-- ============================================================================

\echo ''
\echo 'Rollback 2/8: MFA Implementation'

-- Drop MFA-related objects
DROP VIEW IF EXISTS mfa_statistics CASCADE;
DROP TRIGGER IF EXISTS trigger_log_mfa_status_change ON profiles;
DROP FUNCTION IF EXISTS log_mfa_status_change() CASCADE;
DROP FUNCTION IF EXISTS get_backup_codes_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_mfa_enabled(UUID) CASCADE;

-- Remove MFA constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_backup_codes_limit;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_mfa_consistency;

-- Drop RLS policies created by MFA migration
DROP POLICY IF EXISTS "Users can update their own MFA settings" ON profiles;
DROP POLICY IF EXISTS "Users can view their own MFA status" ON profiles;

-- Remove MFA columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS mfa_enrolled_at,
  DROP COLUMN IF EXISTS mfa_backup_codes,
  DROP COLUMN IF EXISTS mfa_secret,
  DROP COLUMN IF EXISTS mfa_enabled;

-- Drop MFA index
DROP INDEX IF EXISTS idx_profiles_mfa_enabled;

\echo '✓ Rollback 2/8 complete'

-- ============================================================================
-- ROLLBACK 1: COMPLETE RLS COVERAGE
-- ============================================================================

\echo ''
\echo 'Rollback 1/8: Complete RLS Coverage'

-- Drop RLS coverage view
DROP VIEW IF EXISTS rls_coverage_summary CASCADE;

-- Disable RLS on all tables and drop policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
  ) LOOP
    -- Disable RLS
    EXECUTE 'ALTER TABLE ' || r.schemaname || '.' || r.tablename || ' DISABLE ROW LEVEL SECURITY';

    -- Drop all policies for this table
    FOR r_policy IN (
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = r.schemaname
        AND tablename = r.tablename
    ) LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r_policy.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
  END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_organization() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;

\echo '✓ Rollback 1/8 complete'

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'ROLLBACK VERIFICATION'
\echo '============================================================================'

DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_total_policies INTEGER;
  v_mfa_columns INTEGER;
  v_new_tables INTEGER;
BEGIN
  -- Check RLS is disabled
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  RAISE NOTICE 'Tables with RLS: % (expected: 0)', v_tables_with_rls;

  -- Check policies are removed
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'RLS policies remaining: % (expected: 0)', v_total_policies;

  -- Check MFA columns removed
  SELECT COUNT(*) INTO v_mfa_columns
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_enrolled_at');

  RAISE NOTICE 'MFA columns: % (expected: 0)', v_mfa_columns;

  -- Check new tables removed
  SELECT COUNT(*) INTO v_new_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'sessions',
      'webhook_events', 'webhook_processing_errors',
      'payment_intents', 'payment_authentication_events', 'payment_compliance_logs',
      'refunds', 'refund_history', 'refund_notifications',
      'job_logs', 'job_schedules',
      'cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily'
    );

  RAISE NOTICE 'New tables remaining: % (expected: 0)', v_new_tables;

  RAISE NOTICE '';
  IF v_tables_with_rls = 0 AND v_total_policies = 0 AND v_mfa_columns = 0 AND v_new_tables = 0 THEN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✓ ROLLBACK SUCCESSFUL';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'All Week 1-2 migrations have been rolled back.';
    RAISE NOTICE 'Database is now in pre-migration state.';
  ELSE
    RAISE WARNING '============================================================================';
    RAISE WARNING '⚠ ROLLBACK INCOMPLETE';
    RAISE WARNING '============================================================================';
    RAISE WARNING 'Some objects may not have been removed. Review the counts above.';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
-- Uncomment the COMMIT below to make rollback permanent

-- COMMIT;

\echo ''
\echo '============================================================================'
\echo 'TRANSACTION AWAITING MANUAL COMMIT'
\echo '============================================================================'
\echo 'Review the verification output above.'
\echo 'If rollback is correct, run: COMMIT;'
\echo 'To abort rollback, run: ROLLBACK;'
\echo '============================================================================'
