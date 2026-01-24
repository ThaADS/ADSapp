-- Check ALL tables and their columns to identify which have organization_id
SELECT
    t.table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'public'
        AND c.column_name = 'organization_id'
    ) THEN 'YES' ELSE 'NO' END as has_org_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'public'
        AND c.column_name = 'user_id'
    ) THEN 'YES' ELSE 'NO' END as has_user_id,
    (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
     FROM information_schema.columns c
     WHERE c.table_name = t.table_name AND c.table_schema = 'public'
     AND c.column_name IN ('id', 'organization_id', 'user_id', 'contact_id', 'conversation_id',
                           'campaign_id', 'connection_id', 'workflow_id', 'segment_id',
                           'list_id', 'refund_id', 'payment_intent_id', 'enrollment_id', 'agent_id')
    ) as key_columns
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
