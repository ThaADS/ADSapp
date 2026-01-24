-- Check which columns exist in the problematic tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'sessions', 'api_keys', 'key_rotation_log', 'job_schedules', 'job_logs',
    'payment_authentication_events', 'payment_compliance_logs', 'refund_notifications',
    'tags', 'contact_tags', 'tag_categories', 'ai_settings', 'ai_responses',
    'conversation_ai_metadata', 'refund_history', 'payment_intents', 'refunds'
)
ORDER BY table_name, column_name;
