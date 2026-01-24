-- Check columns for problematic tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'webhook_events', 'webhook_processing_errors', 'cache_invalidation_logs',
    'cache_metadata', 'cache_stats_daily', 'default_retention_policies',
    'deletion_audit_log', 'agent_capacity', 'routing_rules', 'conversation_queue',
    'routing_history', 'workflows', 'workflow_executions', 'workflow_versions',
    'crm_connections', 'crm_sync_logs', 'crm_field_mappings', 'crm_sync_state',
    'crm_webhooks', 'bulk_campaigns', 'bulk_message_jobs', 'contact_lists',
    'drip_campaigns', 'drip_campaign_steps', 'drip_enrollments', 'email_accounts',
    'sla_configurations', 'sla_tracking', 'payment_links', 'subscriptions',
    'invoices', 'contact_segments', 'contact_segment_members', 'deletion_requests',
    'template_usage_analytics', 'drip_message_logs', 'contact_list_members'
)
ORDER BY table_name, column_name;
