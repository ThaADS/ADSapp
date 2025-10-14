-- ============================================================================
-- CONSOLIDATED MIGRATION SCRIPT
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Apply all accumulated Week 1-2 database migrations
-- Date: 2025-10-13
-- Agent: Database Migration Specialist (Agent 1 of 6)
-- ============================================================================

-- ============================================================================
-- SAFETY AND TRANSACTION CONTROL
-- ============================================================================

-- Ensure we're in a transaction (can be rolled back if any step fails)
BEGIN;

-- Set error handling to stop on first error
\set ON_ERROR_STOP on

-- Show detailed error messages
\set VERBOSITY verbose

-- Display timing information
\timing on

-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ADSapp Database Migration - Week 1-2 Accumulated Migrations';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';

  -- Verify we're in the correct database
  IF current_database() NOT IN ('postgres', 'adsapp') THEN
    RAISE EXCEPTION 'Migration must run on correct database. Current: %', current_database();
  END IF;

  -- Check if baseline tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'Baseline table "organizations" not found. Run baseline migrations first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Baseline table "profiles" not found. Run baseline migrations first.';
  END IF;

  RAISE NOTICE '✓ Pre-migration validation passed';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 1: COMPLETE RLS COVERAGE
-- ============================================================================
-- File: 20251013_complete_rls_coverage.sql
-- Purpose: Implement comprehensive Row Level Security for all multi-tenant tables
-- Impact: All 24 multi-tenant tables
-- Duration: ~15 seconds
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 1/8: Complete RLS Coverage'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251013_complete_rls_coverage.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 1/8 completed: RLS Coverage applied to 24 tables';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 2: MFA IMPLEMENTATION
-- ============================================================================
-- File: 20251013_mfa_implementation.sql
-- Purpose: Multi-Factor Authentication support
-- Impact: profiles table, audit_logs table
-- Duration: ~3 seconds
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 2/8: MFA Implementation'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251013_mfa_implementation.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 2/8 completed: MFA columns added to profiles';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 3: SESSION MANAGEMENT
-- ============================================================================
-- File: 20251014_session_management.sql
-- Purpose: Enterprise session management with Redis integration
-- Impact: Creates sessions table
-- Duration: ~5 seconds
-- Security: CVSS 7.5 vulnerability fix
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 3/8: Session Management'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251014_session_management.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 3/8 completed: Session management infrastructure created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 4: WEBHOOK INFRASTRUCTURE
-- ============================================================================
-- File: 20251015_webhook_events.sql
-- Purpose: Webhook idempotency tracking for Stripe webhooks
-- Impact: Creates webhook_events, webhook_processing_errors tables
-- Duration: ~4 seconds
-- Security: CVSS 6.0 - Prevents duplicate processing
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 4/8: Webhook Infrastructure'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251015_webhook_events.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 4/8 completed: Webhook idempotency system created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 5: PAYMENT INTENTS (3D SECURE)
-- ============================================================================
-- File: 20251015_payment_intents.sql
-- Purpose: Payment intent tracking with 3D Secure authentication
-- Impact: Creates payment_intents, payment_authentication_events, payment_compliance_logs
-- Duration: ~6 seconds
-- Security: CVSS 6.5 - PCI DSS and SCA compliance
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 5/8: Payment Intents (3D Secure)'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251015_payment_intents.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 5/8 completed: Payment intent infrastructure created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 6: REFUND MANAGEMENT
-- ============================================================================
-- File: 20251015_refunds.sql
-- Purpose: Comprehensive refund management with audit trail
-- Impact: Creates refunds, refund_history, refund_notifications tables
-- Duration: ~5 seconds
-- Security: CVSS 6.5 - Financial operations authorization
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 6/8: Refund Management'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251015_refunds.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 6/8 completed: Refund management system created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 7: JOB QUEUE SYSTEM
-- ============================================================================
-- File: 20251013_job_queue.sql
-- Purpose: BullMQ job tracking and history
-- Impact: Creates job_logs, job_schedules tables
-- Duration: ~4 seconds
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 7/8: Job Queue System'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251013_job_queue.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 7/8 completed: Job queue infrastructure created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- MIGRATION 8: CACHE INFRASTRUCTURE
-- ============================================================================
-- File: 20251016_cache_infrastructure.sql
-- Purpose: Redis cache analytics and monitoring
-- Impact: Creates cache_metadata, cache_invalidation_logs, cache_stats_daily
-- Duration: ~5 seconds
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'MIGRATION 8/8: Cache Infrastructure'
\echo '============================================================================'

\i C:/Ai\ Projecten/ADSapp/supabase/migrations/20251016_cache_infrastructure.sql

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 8/8 completed: Cache infrastructure created';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_total_policies INTEGER;
  v_mfa_columns INTEGER;
  v_sessions_exists BOOLEAN;
  v_webhook_tables INTEGER;
  v_payment_tables INTEGER;
  v_job_tables INTEGER;
  v_cache_tables INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'POST-MIGRATION VERIFICATION';
  RAISE NOTICE '============================================================================';

  -- Check RLS coverage
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  RAISE NOTICE '✓ Tables with RLS enabled: % (expected: 24+)', v_tables_with_rls;

  -- Check RLS policies
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '✓ Total RLS policies created: % (expected: 96+)', v_total_policies;

  -- Check MFA columns
  SELECT COUNT(*) INTO v_mfa_columns
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes', 'mfa_enrolled_at');

  RAISE NOTICE '✓ MFA columns in profiles: % (expected: 4)', v_mfa_columns;

  -- Check sessions table
  v_sessions_exists := EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions'
  );

  RAISE NOTICE '✓ Sessions table exists: %', v_sessions_exists;

  -- Check webhook tables
  SELECT COUNT(*) INTO v_webhook_tables
  FROM information_schema.tables
  WHERE table_name IN ('webhook_events', 'webhook_processing_errors');

  RAISE NOTICE '✓ Webhook tables created: % (expected: 2)', v_webhook_tables;

  -- Check payment tables
  SELECT COUNT(*) INTO v_payment_tables
  FROM information_schema.tables
  WHERE table_name IN (
    'payment_intents', 'payment_authentication_events', 'payment_compliance_logs',
    'refunds', 'refund_history', 'refund_notifications'
  );

  RAISE NOTICE '✓ Payment tables created: % (expected: 6)', v_payment_tables;

  -- Check job queue tables
  SELECT COUNT(*) INTO v_job_tables
  FROM information_schema.tables
  WHERE table_name IN ('job_logs', 'job_schedules');

  RAISE NOTICE '✓ Job queue tables created: % (expected: 2)', v_job_tables;

  -- Check cache tables
  SELECT COUNT(*) INTO v_cache_tables
  FROM information_schema.tables
  WHERE table_name IN ('cache_metadata', 'cache_invalidation_logs', 'cache_stats_daily');

  RAISE NOTICE '✓ Cache tables created: % (expected: 3)', v_cache_tables;

  -- Final validation
  IF v_tables_with_rls < 24 OR v_total_policies < 96 OR v_mfa_columns != 4 OR
     NOT v_sessions_exists OR v_webhook_tables != 2 OR v_payment_tables != 6 OR
     v_job_tables != 2 OR v_cache_tables != 3 THEN
    RAISE EXCEPTION 'Verification failed - not all expected objects were created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ALL MIGRATIONS COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'Completed at: %', NOW();
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Run detailed verification queries (see MIGRATION_APPLICATION_REPORT.md)';
  RAISE NOTICE '2. Test RLS policies with authenticated users';
  RAISE NOTICE '3. Test MFA enrollment and verification';
  RAISE NOTICE '4. Test session management functionality';
  RAISE NOTICE '5. Test webhook processing';
  RAISE NOTICE '6. Test payment processing in sandbox';
  RAISE NOTICE '7. Monitor application performance';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
-- If you've reached this point without errors, all migrations succeeded
-- Uncomment the COMMIT below to apply changes permanently

-- COMMIT;

-- ============================================================================
-- IMPORTANT: MANUAL COMMIT REQUIRED
-- ============================================================================
-- The COMMIT statement above is commented out for safety.
-- After reviewing the verification output:
-- 1. If all checks pass, run: COMMIT;
-- 2. If any issues found, run: ROLLBACK;
--
-- This allows you to review the changes before making them permanent.
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'TRANSACTION AWAITING MANUAL COMMIT'
\echo '============================================================================'
\echo 'Review the verification output above.'
\echo 'If all checks pass, run: COMMIT;'
\echo 'If issues found, run: ROLLBACK;'
\echo '============================================================================'
