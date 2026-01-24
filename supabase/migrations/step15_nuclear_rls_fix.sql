-- STEP 15: NUCLEAR FIX - Drop ALL existing policies and recreate with optimization
-- This ensures no duplicate policies exist

-- ============================================
-- PART 1: DROP ALL EXISTING POLICIES
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- PART 2: RECREATE ALL POLICIES WITH (SELECT auth.uid())
-- ============================================

-- profiles
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
USING (id = (SELECT auth.uid()) OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
USING (id = (SELECT auth.uid()));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
WITH CHECK (id = (SELECT auth.uid()));

-- organizations
CREATE POLICY "organizations_select" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "organizations_update" ON organizations FOR UPDATE
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- contacts
CREATE POLICY "contacts_select" ON contacts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversations
CREATE POLICY "conversations_select" ON conversations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "conversations_delete" ON conversations FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "messages_insert" ON messages FOR INSERT
WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "messages_update" ON messages FOR UPDATE
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- message_templates
CREATE POLICY "message_templates_all" ON message_templates FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- automation_rules
CREATE POLICY "automation_rules_all" ON automation_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT
USING (user_id = (SELECT auth.uid()));
CREATE POLICY "sessions_delete" ON sessions FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- api_keys
CREATE POLICY "api_keys_all" ON api_keys FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- key_rotation_log
CREATE POLICY "key_rotation_log_all" ON key_rotation_log FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- tags
CREATE POLICY "tags_select" ON tags FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "tags_manage" ON tags FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- tag_categories
CREATE POLICY "tag_categories_select" ON tag_categories FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "tag_categories_manage" ON tag_categories FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- contact_tags
CREATE POLICY "contact_tags_all" ON contact_tags FOR ALL
USING (contact_id IN (SELECT id FROM contacts WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- team_invitations
CREATE POLICY "team_invitations_select" ON team_invitations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "team_invitations_manage" ON team_invitations FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- agent_capacity
CREATE POLICY "agent_capacity_all" ON agent_capacity FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- agent_skills
CREATE POLICY "agent_skills_all" ON agent_skills FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- agent_performance_metrics
CREATE POLICY "agent_performance_metrics_all" ON agent_performance_metrics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_rules
CREATE POLICY "routing_rules_all" ON routing_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_history
CREATE POLICY "routing_history_all" ON routing_history FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_queue
CREATE POLICY "conversation_queue_all" ON conversation_queue FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_metrics
CREATE POLICY "conversation_metrics_all" ON conversation_metrics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflows
CREATE POLICY "workflows_all" ON workflows FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflow_executions
CREATE POLICY "workflow_executions_all" ON workflow_executions FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflow_versions (via workflow_id)
CREATE POLICY "workflow_versions_all" ON workflow_versions FOR ALL
USING (workflow_id IN (SELECT id FROM workflows WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_connections
CREATE POLICY "crm_connections_all" ON crm_connections FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- crm_sync_logs (via connection_id)
CREATE POLICY "crm_sync_logs_all" ON crm_sync_logs FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_field_mappings (via connection_id)
CREATE POLICY "crm_field_mappings_all" ON crm_field_mappings FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_sync_state (via connection_id)
CREATE POLICY "crm_sync_state_all" ON crm_sync_state FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_webhooks (via connection_id)
CREATE POLICY "crm_webhooks_all" ON crm_webhooks FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- bulk_campaigns
CREATE POLICY "bulk_campaigns_all" ON bulk_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- bulk_message_jobs (via campaign_id)
CREATE POLICY "bulk_message_jobs_all" ON bulk_message_jobs FOR ALL
USING (campaign_id IN (SELECT id FROM bulk_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- contact_lists
CREATE POLICY "contact_lists_all" ON contact_lists FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_list_members (via list_id)
CREATE POLICY "contact_list_members_all" ON contact_list_members FOR ALL
USING (list_id IN (SELECT id FROM contact_lists WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_campaigns
CREATE POLICY "drip_campaigns_all" ON drip_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- drip_campaign_steps (via campaign_id)
CREATE POLICY "drip_campaign_steps_all" ON drip_campaign_steps FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_enrollments (via campaign_id)
CREATE POLICY "drip_enrollments_all" ON drip_enrollments FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_message_logs (via enrollment_id)
CREATE POLICY "drip_message_logs_all" ON drip_message_logs FOR ALL
USING (enrollment_id IN (SELECT id FROM drip_enrollments WHERE campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))));

-- contact_segments
CREATE POLICY "contact_segments_all" ON contact_segments FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_segment_members (via segment_id)
CREATE POLICY "contact_segment_members_all" ON contact_segment_members FOR ALL
USING (segment_id IN (SELECT id FROM contact_segments WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- email_accounts
CREATE POLICY "email_accounts_all" ON email_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sms_accounts
CREATE POLICY "sms_accounts_all" ON sms_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- instagram_accounts
CREATE POLICY "instagram_accounts_all" ON instagram_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- webchat_widgets
CREATE POLICY "webchat_widgets_all" ON webchat_widgets FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- channel_sources
CREATE POLICY "channel_sources_all" ON channel_sources FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sla_rules
CREATE POLICY "sla_rules_all" ON sla_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sla_tracking (via conversation_id)
CREATE POLICY "sla_tracking_all" ON sla_tracking FOR ALL
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- campaign_analytics
CREATE POLICY "campaign_analytics_all" ON campaign_analytics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- template_usage_analytics
CREATE POLICY "template_usage_analytics_all" ON template_usage_analytics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ai_settings
CREATE POLICY "ai_settings_all" ON ai_settings FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ai_responses
CREATE POLICY "ai_responses_all" ON ai_responses FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_ai_metadata
CREATE POLICY "conversation_ai_metadata_all" ON conversation_ai_metadata FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- payment_links
CREATE POLICY "payment_links_all" ON payment_links FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- payment_intents
CREATE POLICY "payment_intents_all" ON payment_intents FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- subscriptions
CREATE POLICY "subscriptions_all" ON subscriptions FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- invoices
CREATE POLICY "invoices_all" ON invoices FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- refunds
CREATE POLICY "refunds_all" ON refunds FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- refund_history (via refund_id)
CREATE POLICY "refund_history_all" ON refund_history FOR ALL
USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- refund_notifications (via refund_id)
CREATE POLICY "refund_notifications_all" ON refund_notifications FOR ALL
USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- payment_authentication_events (via payment_intent_id)
CREATE POLICY "payment_auth_events_all" ON payment_authentication_events FOR ALL
USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- payment_compliance_logs (via payment_intent_id)
CREATE POLICY "payment_compliance_logs_all" ON payment_compliance_logs FOR ALL
USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- deletion_requests
CREATE POLICY "deletion_requests_all" ON deletion_requests FOR ALL
USING (user_id = (SELECT auth.uid()) OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- webhook_logs
CREATE POLICY "webhook_logs_all" ON webhook_logs FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- ADMIN-ONLY TABLES (no organization_id filtering)
-- ============================================

-- webhook_events
CREATE POLICY "webhook_events_admin" ON webhook_events FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- webhook_processing_errors
CREATE POLICY "webhook_processing_errors_admin" ON webhook_processing_errors FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_invalidation_logs
CREATE POLICY "cache_invalidation_logs_admin" ON cache_invalidation_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_metadata
CREATE POLICY "cache_metadata_admin" ON cache_metadata FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_stats_daily
CREATE POLICY "cache_stats_daily_admin" ON cache_stats_daily FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- default_retention_policies
CREATE POLICY "default_retention_policies_admin" ON default_retention_policies FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- deletion_audit_log
CREATE POLICY "deletion_audit_log_admin" ON deletion_audit_log FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- job_schedules
CREATE POLICY "job_schedules_admin" ON job_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- job_logs
CREATE POLICY "job_logs_admin" ON job_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

SELECT 'Step 15 NUCLEAR FIX complete: All policies dropped and recreated with (SELECT auth.uid())!' AS status;
