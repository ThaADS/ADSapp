-- STEP 2: Check which columns exist in each table
-- This will help us create the correct RLS policies

SELECT
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
AND t.table_name IN (
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
    'deletion_audit_log',
    'payment_intents',
    'refunds'
)
ORDER BY t.table_name, c.ordinal_position;
