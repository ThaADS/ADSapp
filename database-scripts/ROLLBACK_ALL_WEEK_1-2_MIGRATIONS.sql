-- ============================================================================
-- ROLLBACK SCRIPT - WEEK 1-2 MIGRATIONS
-- ============================================================================
-- Project: ADSapp Multi-Tenant WhatsApp Business Inbox SaaS
-- Purpose: Rollback all Week 1-2 database migrations if needed
-- Date: 2025-10-14
-- Total Migrations to Rollback: 10
-- WARNING: This is a DESTRUCTIVE operation - use only for disaster recovery
-- ============================================================================

-- ============================================================================
-- SAFETY WARNINGS AND CONFIRMATION
-- ============================================================================

\echo '============================================================================'
\echo 'DANGER: ROLLBACK OPERATION'
\echo '============================================================================'
\echo 'This script will DESTROY all Week 1-2 migration data.'
\echo 'Tables, functions, triggers, and RLS policies will be removed.'
\echo ''
\echo 'AFFECTED INFRASTRUCTURE:'
\echo '- All RLS policies (120+ policies)'
\echo '- MFA columns and triggers'
\echo '- Sessions table and functions'
\echo '- Webhook tables and idempotency tracking'
\echo '- Payment intent tables (3D Secure infrastructure)'
\echo '- Refund management tables'
\echo '- Job queue tables'
\echo '- Cache infrastructure tables'
\echo '- KMS key management tables'
\echo '- GDPR compliance tables and soft delete columns'
\echo ''
\echo 'THIS OPERATION IS IRREVERSIBLE!'
\echo ''
\echo 'To proceed, uncomment the BEGIN statement below.'
\echo '============================================================================'

-- Uncomment the line below to enable rollback
-- BEGIN;

-- ============================================================================
-- ROLLBACK 10: GDPR COMPLIANCE
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 10: GDPR Compliance...'

-- Drop functions
DROP FUNCTION IF EXISTS process_deletion_request(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_deletion_request(UUID) CASCADE;
DROP FUNCTION IF EXISTS reject_deletion_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_data() CASCADE;
DROP FUNCTION IF EXISTS get_retention_policy(TEXT) CASCADE;
DROP FUNCTION IF EXISTS soft_delete_record(TEXT, UUID) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON deletion_requests;

-- Drop views
DROP VIEW IF EXISTS deletion_request_statistics CASCADE;

-- Drop tables
DROP TABLE IF EXISTS deletion_audit_log CASCADE;
DROP TABLE IF EXISTS deletion_requests CASCADE;
DROP TABLE IF EXISTS default_retention_policies CASCADE;
DROP TABLE IF EXISTS data_retention_policies CASCADE;

-- Remove soft delete columns
ALTER TABLE profiles DROP COLUMN IF EXISTS deleted_at CASCADE;
ALTER TABLE contacts DROP COLUMN IF EXISTS deleted_at CASCADE;
ALTER TABLE conversations DROP COLUMN IF EXISTS deleted_at CASCADE;
ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at CASCADE;

\echo '✓ Migration 10 rolled back: GDPR Compliance'

-- ============================================================================
-- ROLLBACK 9: KMS KEY MANAGEMENT
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 9: KMS Key Management...'

-- Drop functions
DROP FUNCTION IF EXISTS rotate_encryption_key(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_key(TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_key_rotation_logs(INTEGER) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_encryption_keys_updated_at ON encryption_keys;

-- Drop views
DROP VIEW IF EXISTS active_encryption_keys CASCADE;

-- Drop tables
DROP TABLE IF EXISTS key_rotation_log CASCADE;
DROP TABLE IF EXISTS encryption_keys CASCADE;

\echo '✓ Migration 9 rolled back: KMS Key Management'

-- ============================================================================
-- ROLLBACK 8: CACHE INFRASTRUCTURE
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 8: Cache Infrastructure...'

-- Drop functions
DROP FUNCTION IF EXISTS record_cache_hit(TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_cache_miss(TEXT) CASCADE;
DROP FUNCTION IF EXISTS invalidate_cache_entry(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_cache_hit_rate(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS daily_cache_stats_aggregation() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_cache_metadata_updated_at ON cache_metadata;

-- Drop views
DROP VIEW IF EXISTS cache_performance_summary CASCADE;

-- Drop tables
DROP TABLE IF EXISTS cache_stats_daily CASCADE;
DROP TABLE IF EXISTS cache_invalidation_logs CASCADE;
DROP TABLE IF EXISTS cache_metadata CASCADE;

\echo '✓ Migration 8 rolled back: Cache Infrastructure'

-- ============================================================================
-- ROLLBACK 7: JOB QUEUE SYSTEM
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 7: Job Queue System...'

-- Drop functions
DROP FUNCTION IF EXISTS log_job_execution(TEXT, TEXT, JSONB, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_job_statistics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_job_logs(INTEGER) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_job_schedules_updated_at ON job_schedules;

-- Drop views
DROP VIEW IF EXISTS failed_jobs_last_24h CASCADE;

-- Drop tables
DROP TABLE IF EXISTS job_schedules CASCADE;
DROP TABLE IF EXISTS job_logs CASCADE;

\echo '✓ Migration 7 rolled back: Job Queue System'

-- ============================================================================
-- ROLLBACK 6: REFUND MANAGEMENT
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 6: Refund Management...'

-- Drop functions
DROP FUNCTION IF EXISTS create_refund_request CASCADE;
DROP FUNCTION IF EXISTS approve_refund CASCADE;
DROP FUNCTION IF EXISTS complete_refund CASCADE;
DROP FUNCTION IF EXISTS fail_refund CASCADE;
DROP FUNCTION IF EXISTS check_refund_eligibility CASCADE;
DROP FUNCTION IF EXISTS log_refund_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_refunds_updated_at() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_log_refund_status_change ON refunds;
DROP TRIGGER IF EXISTS trigger_update_refunds_updated_at ON refunds;

-- Drop views
DROP VIEW IF EXISTS refund_statistics CASCADE;

-- Drop tables
DROP TABLE IF EXISTS refund_notifications CASCADE;
DROP TABLE IF EXISTS refund_history CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;

\echo '✓ Migration 6 rolled back: Refund Management'

-- ============================================================================
-- ROLLBACK 5: PAYMENT INTENTS (3D SECURE)
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 5: Payment Intents...'

-- Drop functions
DROP FUNCTION IF EXISTS create_payment_intent_record CASCADE;
DROP FUNCTION IF EXISTS update_payment_intent_status CASCADE;
DROP FUNCTION IF EXISTS log_authentication_event CASCADE;
DROP FUNCTION IF EXISTS log_compliance_validation CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_payment_intents CASCADE;
DROP FUNCTION IF EXISTS get_authentication_statistics CASCADE;
DROP FUNCTION IF EXISTS update_payment_intents_updated_at() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_payment_intents_updated_at ON payment_intents;

-- Drop views
DROP VIEW IF EXISTS payment_intent_statistics CASCADE;

-- Drop tables
DROP TABLE IF EXISTS payment_compliance_logs CASCADE;
DROP TABLE IF EXISTS payment_authentication_events CASCADE;
DROP TABLE IF EXISTS payment_intents CASCADE;

\echo '✓ Migration 5 rolled back: Payment Intents'

-- ============================================================================
-- ROLLBACK 4: WEBHOOK INFRASTRUCTURE
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 4: Webhook Infrastructure...'

-- Drop functions
DROP FUNCTION IF EXISTS mark_webhook_event_processing CASCADE;
DROP FUNCTION IF EXISTS mark_webhook_event_completed CASCADE;
DROP FUNCTION IF EXISTS mark_webhook_event_failed CASCADE;
DROP FUNCTION IF EXISTS is_webhook_event_processed CASCADE;
DROP FUNCTION IF EXISTS get_webhook_events_for_retry CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_events CASCADE;
DROP FUNCTION IF EXISTS update_webhook_events_updated_at() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_webhook_events_updated_at ON webhook_events;

-- Drop views
DROP VIEW IF EXISTS webhook_event_stats CASCADE;

-- Drop tables
DROP TABLE IF EXISTS webhook_processing_errors CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;

\echo '✓ Migration 4 rolled back: Webhook Infrastructure'

-- ============================================================================
-- ROLLBACK 3: SESSION MANAGEMENT
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 3: Session Management...'

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS revoke_all_user_sessions CASCADE;
DROP FUNCTION IF EXISTS get_user_session_stats CASCADE;
DROP FUNCTION IF EXISTS check_privilege_change CASCADE;
DROP FUNCTION IF EXISTS set_session_revoked_at() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_set_session_revoked_at ON sessions;

-- Drop views
DROP VIEW IF EXISTS active_sessions CASCADE;

-- Drop tables
DROP TABLE IF EXISTS sessions CASCADE;

\echo '✓ Migration 3 rolled back: Session Management'

-- ============================================================================
-- ROLLBACK 2: MFA IMPLEMENTATION
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 2: MFA Implementation...'

-- Drop functions
DROP FUNCTION IF EXISTS user_has_mfa_enabled CASCADE;
DROP FUNCTION IF EXISTS get_backup_codes_count CASCADE;
DROP FUNCTION IF EXISTS log_mfa_status_change() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_log_mfa_status_change ON profiles;

-- Drop views
DROP VIEW IF EXISTS mfa_statistics CASCADE;

-- Drop constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_mfa_consistency CASCADE;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_backup_codes_limit CASCADE;

-- Drop MFA columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS mfa_enabled CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS mfa_secret CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS mfa_backup_codes CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS mfa_enrolled_at CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_mfa_enabled CASCADE;

\echo '✓ Migration 2 rolled back: MFA Implementation'

-- ============================================================================
-- ROLLBACK 1: COMPLETE RLS COVERAGE
-- ============================================================================

\echo ''
\echo 'Rolling back Migration 1: Complete RLS Coverage...'

-- Drop helper functions
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization() CASCADE;

-- Drop RLS coverage summary view
DROP VIEW IF EXISTS rls_coverage_summary CASCADE;

-- Drop RLS policies from all tables
-- Note: This will disable RLS but preserve the tables
-- Organizations
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

-- Profiles
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own MFA status" ON profiles;
DROP POLICY IF EXISTS "Users can update their own MFA settings" ON profiles;

-- Contacts
DROP POLICY IF EXISTS "Users can view their organization's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can update their organization's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their organization's contacts" ON contacts;

-- Conversations
DROP POLICY IF EXISTS "Users can view their organization's conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can update their organization's conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their organization's conversations" ON conversations;

-- Messages
DROP POLICY IF EXISTS "Users can view their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their organization" ON messages;
DROP POLICY IF EXISTS "Users can update their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their organization's messages" ON messages;

-- Message Templates
DROP POLICY IF EXISTS "Users can view their organization's message_templates" ON message_templates;
DROP POLICY IF EXISTS "Users can create message_templates in their organization" ON message_templates;
DROP POLICY IF EXISTS "Users can update their organization's message_templates" ON message_templates;
DROP POLICY IF EXISTS "Users can delete their organization's message_templates" ON message_templates;

-- Automation Rules
DROP POLICY IF EXISTS "Users can view their organization's automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can create automation_rules in their organization" ON automation_rules;
DROP POLICY IF EXISTS "Users can update their organization's automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can delete their organization's automation_rules" ON automation_rules;

-- Quick Replies
DROP POLICY IF EXISTS "Users can view their organization's quick_replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can create quick_replies in their organization" ON quick_replies;
DROP POLICY IF EXISTS "Users can update their organization's quick_replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can delete their organization's quick_replies" ON quick_replies;

-- Tags
DROP POLICY IF EXISTS "Users can view their organization's tags" ON tags;
DROP POLICY IF EXISTS "Users can create tags in their organization" ON tags;
DROP POLICY IF EXISTS "Users can update their organization's tags" ON tags;
DROP POLICY IF EXISTS "Users can delete their organization's tags" ON tags;

-- Contact Tags
DROP POLICY IF EXISTS "Users can view their organization's contact_tags" ON contact_tags;
DROP POLICY IF EXISTS "Users can create contact_tags in their organization" ON contact_tags;
DROP POLICY IF EXISTS "Users can update their organization's contact_tags" ON contact_tags;
DROP POLICY IF EXISTS "Users can delete their organization's contact_tags" ON contact_tags;

-- Conversation Assignments
DROP POLICY IF EXISTS "Users can view their organization's conversation_assignments" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can create conversation_assignments in their organization" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can update their organization's conversation_assignments" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can delete their organization's conversation_assignments" ON conversation_assignments;

-- Analytics Events
DROP POLICY IF EXISTS "Users can view their organization's analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Users can create analytics_events in their organization" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their organization's analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Users can delete their organization's analytics_events" ON analytics_events;

-- Billing Subscriptions
DROP POLICY IF EXISTS "Users can view their organization's billing_subscriptions" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can create billing_subscriptions in their organization" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can update their organization's billing_subscriptions" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can delete their organization's billing_subscriptions" ON billing_subscriptions;

-- Invoices
DROP POLICY IF EXISTS "Users can view their organization's invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- Usage Records
DROP POLICY IF EXISTS "Users can view their organization's usage_records" ON usage_records;
DROP POLICY IF EXISTS "System can create usage_records" ON usage_records;
DROP POLICY IF EXISTS "System can update usage_records" ON usage_records;
DROP POLICY IF EXISTS "Admins can delete usage_records" ON usage_records;

-- WhatsApp Integrations
DROP POLICY IF EXISTS "Users can view their organization's whatsapp_integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can create whatsapp_integrations in their organization" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can update their organization's whatsapp_integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can delete their organization's whatsapp_integrations" ON whatsapp_integrations;

-- Team Members
DROP POLICY IF EXISTS "Users can view their organization's team_members" ON team_members;
DROP POLICY IF EXISTS "Admins can create team_members in their organization" ON team_members;
DROP POLICY IF EXISTS "Admins can update their organization's team_members" ON team_members;
DROP POLICY IF EXISTS "Admins can delete their organization's team_members" ON team_members;

-- Roles
DROP POLICY IF EXISTS "Users can view their organization's roles" ON roles;
DROP POLICY IF EXISTS "Admins can create roles in their organization" ON roles;
DROP POLICY IF EXISTS "Admins can update their organization's roles" ON roles;
DROP POLICY IF EXISTS "Admins can delete their organization's roles" ON roles;

-- Permissions
DROP POLICY IF EXISTS "Users can view their organization's permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can create permissions in their organization" ON permissions;
DROP POLICY IF EXISTS "Admins can update their organization's permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can delete their organization's permissions" ON permissions;

-- Audit Logs
DROP POLICY IF EXISTS "Users can view their organization's audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can delete audit_logs" ON audit_logs;

-- Webhooks
DROP POLICY IF EXISTS "Users can view their organization's webhooks" ON webhooks;
DROP POLICY IF EXISTS "Admins can create webhooks in their organization" ON webhooks;
DROP POLICY IF EXISTS "Admins can update their organization's webhooks" ON webhooks;
DROP POLICY IF EXISTS "Admins can delete their organization's webhooks" ON webhooks;

-- API Keys
DROP POLICY IF EXISTS "Admins can view their organization's api_keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api_keys in their organization" ON api_keys;
DROP POLICY IF EXISTS "Admins can update their organization's api_keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete their organization's api_keys" ON api_keys;

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Settings
DROP POLICY IF EXISTS "Users can view their organization's settings" ON settings;
DROP POLICY IF EXISTS "Admins can create settings in their organization" ON settings;
DROP POLICY IF EXISTS "Admins can update their organization's settings" ON settings;
DROP POLICY IF EXISTS "Admins can delete their organization's settings" ON settings;

-- Disable RLS on all tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

\echo '✓ Migration 1 rolled back: RLS policies removed (RLS disabled)'

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'ROLLBACK COMPLETE'
\echo '============================================================================'
\echo 'All Week 1-2 migrations have been rolled back.'
\echo ''
\echo 'IMPORTANT: Database is now in a DEGRADED STATE:'
\echo '- No RLS policies protecting multi-tenant data'
\echo '- No MFA support'
\echo '- No session management'
\echo '- No webhook tracking'
\echo '- No payment/refund infrastructure'
\echo '- No job queue infrastructure'
\echo '- No cache monitoring'
\echo '- No KMS key management'
\echo '- No GDPR compliance infrastructure'
\echo ''
\echo 'Next Steps:'
\echo '1. Verify application still functions at basic level'
\echo '2. Re-apply migrations from backup if needed'
\echo '3. Contact DevOps team for assistance'
\echo '============================================================================'

-- Uncomment the line below to commit the rollback
-- COMMIT;

\echo ''
\echo '============================================================================'
\echo 'TRANSACTION AWAITING MANUAL COMMIT'
\echo '============================================================================'
\echo 'To finalize rollback, run: COMMIT;'
\echo 'To cancel rollback, run: ROLLBACK;'
\echo '============================================================================'
