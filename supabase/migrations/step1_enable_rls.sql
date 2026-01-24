-- STEP 1: Only enable RLS on tables (no policies yet)
-- Run this first to see which tables exist

-- Check which tables exist and enable RLS
DO $$
DECLARE
    tbl TEXT;
    tables_to_enable TEXT[] := ARRAY[
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
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_enable
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND t.table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'RLS enabled on: %', tbl;
        ELSE
            RAISE NOTICE 'Table does not exist: %', tbl;
        END IF;
    END LOOP;
END $$;
