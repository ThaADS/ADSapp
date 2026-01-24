-- STEP 16: FINAL NUCLEAR FIX - Based on actual table structure from screenshots
-- 70 tables total - each with correct column mapping

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
-- PART 2: TABLES WITH organization_id (YES)
-- ============================================

-- agent_capacity (YES org_id)
CREATE POLICY "agent_capacity_policy" ON agent_capacity FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- agent_performance_metrics (YES org_id)
CREATE POLICY "agent_performance_metrics_policy" ON agent_performance_metrics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ai_responses (YES org_id)
CREATE POLICY "ai_responses_policy" ON ai_responses FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ai_settings (YES org_id)
CREATE POLICY "ai_settings_policy" ON ai_settings FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- api_keys (YES org_id)
CREATE POLICY "api_keys_policy" ON api_keys FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- automation_rules (YES org_id)
CREATE POLICY "automation_rules_policy" ON automation_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- bulk_campaigns (YES org_id)
CREATE POLICY "bulk_campaigns_policy" ON bulk_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- campaign_analytics (YES org_id)
CREATE POLICY "campaign_analytics_policy" ON campaign_analytics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- channel_sources (YES org_id)
CREATE POLICY "channel_sources_policy" ON channel_sources FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_lists (YES org_id)
CREATE POLICY "contact_lists_policy" ON contact_lists FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_segments (YES org_id)
CREATE POLICY "contact_segments_policy" ON contact_segments FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contacts (YES org_id)
CREATE POLICY "contacts_policy" ON contacts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_ai_metadata (YES org_id)
CREATE POLICY "conversation_ai_metadata_policy" ON conversation_ai_metadata FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_metrics (YES org_id)
CREATE POLICY "conversation_metrics_policy" ON conversation_metrics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_queue (YES org_id)
CREATE POLICY "conversation_queue_policy" ON conversation_queue FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversations (YES org_id)
CREATE POLICY "conversations_policy" ON conversations FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- crm_connections (YES org_id)
CREATE POLICY "crm_connections_policy" ON crm_connections FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- data_retention_policies (YES org_id)
CREATE POLICY "data_retention_policies_policy" ON data_retention_policies FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- deletion_requests (YES org_id, YES user_id)
CREATE POLICY "deletion_requests_policy" ON deletion_requests FOR ALL
USING (user_id = (SELECT auth.uid()) OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- drip_campaigns (YES org_id)
CREATE POLICY "drip_campaigns_policy" ON drip_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- email_accounts (YES org_id)
CREATE POLICY "email_accounts_policy" ON email_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- encryption_keys (YES org_id)
CREATE POLICY "encryption_keys_policy" ON encryption_keys FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- instagram_accounts (YES org_id)
CREATE POLICY "instagram_accounts_policy" ON instagram_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- key_rotation_log (YES org_id)
CREATE POLICY "key_rotation_log_policy" ON key_rotation_log FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- message_templates (YES org_id)
CREATE POLICY "message_templates_policy" ON message_templates FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- payment_intents (YES org_id)
CREATE POLICY "payment_intents_policy" ON payment_intents FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- profiles (YES org_id) - special case
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT
USING (id = (SELECT auth.uid()) OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
USING (id = (SELECT auth.uid()));
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT
WITH CHECK (id = (SELECT auth.uid()));

-- refunds (YES org_id)
CREATE POLICY "refunds_policy" ON refunds FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_history (YES org_id)
CREATE POLICY "routing_history_policy" ON routing_history FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_rules (YES org_id)
CREATE POLICY "routing_rules_policy" ON routing_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sla_rules (YES org_id)
CREATE POLICY "sla_rules_policy" ON sla_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- sms_accounts (YES org_id)
CREATE POLICY "sms_accounts_policy" ON sms_accounts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- tag_categories (YES org_id)
CREATE POLICY "tag_categories_policy" ON tag_categories FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- tags (YES org_id)
CREATE POLICY "tags_policy" ON tags FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- team_invitations (YES org_id)
CREATE POLICY "team_invitations_policy" ON team_invitations FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- template_usage_analytics (YES org_id)
CREATE POLICY "template_usage_analytics_policy" ON template_usage_analytics FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- webchat_widgets (YES org_id)
CREATE POLICY "webchat_widgets_policy" ON webchat_widgets FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- webhook_logs (YES org_id)
CREATE POLICY "webhook_logs_policy" ON webhook_logs FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflow_executions (YES org_id)
CREATE POLICY "workflow_executions_policy" ON workflow_executions FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflows (YES org_id)
CREATE POLICY "workflows_policy" ON workflows FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- organizations (NO org_id - special: id IS the org)
CREATE POLICY "organizations_policy" ON organizations FOR ALL
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- PART 3: TABLES WITH user_id ONLY (NO org_id)
-- ============================================

-- sessions (NO org_id, YES user_id)
CREATE POLICY "sessions_policy" ON sessions FOR ALL
USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 4: TABLES LINKED VIA FOREIGN KEYS (NO org_id)
-- ============================================

-- agent_skills (NO org_id - has only id) - linked via agent profiles
CREATE POLICY "agent_skills_policy" ON agent_skills FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid())));

-- bulk_message_jobs (NO org_id - has campaign_id)
CREATE POLICY "bulk_message_jobs_policy" ON bulk_message_jobs FOR ALL
USING (campaign_id IN (SELECT id FROM bulk_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- contact_segment_members (NO org_id - has segment_id)
CREATE POLICY "contact_segment_members_policy" ON contact_segment_members FOR ALL
USING (segment_id IN (SELECT id FROM contact_segments WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- contact_tags (NO org_id - has contact_id)
CREATE POLICY "contact_tags_policy" ON contact_tags FOR ALL
USING (contact_id IN (SELECT id FROM contacts WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_field_mappings (NO org_id - has connection_id)
CREATE POLICY "crm_field_mappings_policy" ON crm_field_mappings FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_sync_logs (NO org_id - has connection_id)
CREATE POLICY "crm_sync_logs_policy" ON crm_sync_logs FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_sync_state (NO org_id - has connection_id)
CREATE POLICY "crm_sync_state_policy" ON crm_sync_state FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_webhooks (NO org_id - has connection_id)
CREATE POLICY "crm_webhooks_policy" ON crm_webhooks FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_campaign_steps (NO org_id - has campaign_id)
CREATE POLICY "drip_campaign_steps_policy" ON drip_campaign_steps FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_enrollments (NO org_id - has campaign_id)
CREATE POLICY "drip_enrollments_policy" ON drip_enrollments FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_message_logs (NO org_id - has enrollment_id)
CREATE POLICY "drip_message_logs_policy" ON drip_message_logs FOR ALL
USING (enrollment_id IN (SELECT id FROM drip_enrollments WHERE campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))));

-- messages (NO org_id - has conversation_id)
CREATE POLICY "messages_policy" ON messages FOR ALL
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- payment_authentication_events (NO org_id - has payment_intent_id)
CREATE POLICY "payment_authentication_events_policy" ON payment_authentication_events FOR ALL
USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- payment_compliance_logs (NO org_id - has payment_intent_id)
CREATE POLICY "payment_compliance_logs_policy" ON payment_compliance_logs FOR ALL
USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- refund_history (NO org_id - has refund_id)
CREATE POLICY "refund_history_policy" ON refund_history FOR ALL
USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- refund_notifications (NO org_id - has refund_id)
CREATE POLICY "refund_notifications_policy" ON refund_notifications FOR ALL
USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- sla_tracking (NO org_id - has conversation_id)
CREATE POLICY "sla_tracking_policy" ON sla_tracking FOR ALL
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- workflow_versions (NO org_id - has workflow_id)
CREATE POLICY "workflow_versions_policy" ON workflow_versions FOR ALL
USING (workflow_id IN (SELECT id FROM workflows WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- ============================================
-- PART 5: ADMIN-ONLY TABLES (NO org_id, NO user_id, NO FK)
-- ============================================

-- cache_invalidation_logs (NO org_id)
CREATE POLICY "cache_invalidation_logs_policy" ON cache_invalidation_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_metadata (NO org_id)
CREATE POLICY "cache_metadata_policy" ON cache_metadata FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_stats_daily (NO org_id)
CREATE POLICY "cache_stats_daily_policy" ON cache_stats_daily FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- default_retention_policies (NO org_id)
CREATE POLICY "default_retention_policies_policy" ON default_retention_policies FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- deletion_audit_log (NO org_id)
CREATE POLICY "deletion_audit_log_policy" ON deletion_audit_log FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- job_logs (NO org_id)
CREATE POLICY "job_logs_policy" ON job_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- job_schedules (NO org_id)
CREATE POLICY "job_schedules_policy" ON job_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- webhook_events (NO org_id)
CREATE POLICY "webhook_events_policy" ON webhook_events FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- webhook_processing_errors (NO org_id)
CREATE POLICY "webhook_processing_errors_policy" ON webhook_processing_errors FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- workflow_templates (NO org_id) - system templates
CREATE POLICY "workflow_templates_policy" ON workflow_templates FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

SELECT 'Step 16 FINAL NUCLEAR FIX complete: All 70 tables have optimized policies!' AS status;
