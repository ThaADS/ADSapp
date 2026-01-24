-- STEP 13 v2: Optimize ALL remaining RLS policies with correct column mappings
-- Based on actual table structure analysis

-- ============================================
-- ADMIN-ONLY TABLES (no organization_id)
-- ============================================

-- webhook_events (admin only)
DROP POLICY IF EXISTS "webhook_events_admin_policy" ON webhook_events;
CREATE POLICY "webhook_events_admin_policy" ON webhook_events FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- webhook_processing_errors (admin only, links to webhook_events)
DROP POLICY IF EXISTS "webhook_processing_errors_admin_policy" ON webhook_processing_errors;
CREATE POLICY "webhook_processing_errors_admin_policy" ON webhook_processing_errors FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_invalidation_logs (admin only)
DROP POLICY IF EXISTS "cache_invalidation_logs_policy" ON cache_invalidation_logs;
CREATE POLICY "cache_invalidation_logs_policy" ON cache_invalidation_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_metadata (admin only)
DROP POLICY IF EXISTS "cache_metadata_admin_policy" ON cache_metadata;
CREATE POLICY "cache_metadata_admin_policy" ON cache_metadata FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- cache_stats_daily (admin only)
DROP POLICY IF EXISTS "cache_stats_daily_admin_policy" ON cache_stats_daily;
CREATE POLICY "cache_stats_daily_admin_policy" ON cache_stats_daily FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- default_retention_policies (admin only)
DROP POLICY IF EXISTS "default_retention_policies_admin_policy" ON default_retention_policies;
CREATE POLICY "default_retention_policies_admin_policy" ON default_retention_policies FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- deletion_audit_log (admin only, links to deletion_requests)
DROP POLICY IF EXISTS "deletion_audit_log_admin_policy" ON deletion_audit_log;
CREATE POLICY "deletion_audit_log_admin_policy" ON deletion_audit_log FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- TABLES WITH organization_id
-- ============================================

-- team_invitations
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON team_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;

CREATE POLICY "Users can view invitations for their organization" ON team_invitations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Admins can create invitations" ON team_invitations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));
CREATE POLICY "Admins can update invitations" ON team_invitations FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));
CREATE POLICY "Admins can delete invitations" ON team_invitations FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- agent_capacity (has organization_id)
DROP POLICY IF EXISTS "tenant_isolation_agent_capacity" ON agent_capacity;
CREATE POLICY "tenant_isolation_agent_capacity" ON agent_capacity FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_rules (has organization_id)
DROP POLICY IF EXISTS "tenant_isolation_routing_rules" ON routing_rules;
CREATE POLICY "tenant_isolation_routing_rules" ON routing_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversation_queue (has organization_id)
DROP POLICY IF EXISTS "tenant_isolation_conversation_queue" ON conversation_queue;
CREATE POLICY "tenant_isolation_conversation_queue" ON conversation_queue FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- routing_history (has organization_id)
DROP POLICY IF EXISTS "tenant_isolation_routing_history" ON routing_history;
CREATE POLICY "tenant_isolation_routing_history" ON routing_history FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflows (has organization_id)
DROP POLICY IF EXISTS "Users can view workflows in their organization" ON workflows;
DROP POLICY IF EXISTS "Users can insert workflows in their organization" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their organization" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their organization" ON workflows;

CREATE POLICY "Users can view workflows in their organization" ON workflows FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can insert workflows in their organization" ON workflows FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can update workflows in their organization" ON workflows FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can delete workflows in their organization" ON workflows FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- workflow_executions (has organization_id)
DROP POLICY IF EXISTS "Users can view executions in their organization" ON workflow_executions;
DROP POLICY IF EXISTS "Users can insert executions in their organization" ON workflow_executions;
DROP POLICY IF EXISTS "Users can update executions in their organization" ON workflow_executions;

CREATE POLICY "Users can view executions in their organization" ON workflow_executions FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can insert executions in their organization" ON workflow_executions FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can update executions in their organization" ON workflow_executions FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- crm_connections (has organization_id)
DROP POLICY IF EXISTS "Organizations can view their own CRM connections" ON crm_connections;
DROP POLICY IF EXISTS "Organization admins can manage CRM connections" ON crm_connections;

CREATE POLICY "Organizations can view their own CRM connections" ON crm_connections FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Organization admins can manage CRM connections" ON crm_connections FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- bulk_campaigns (has organization_id)
DROP POLICY IF EXISTS "Users can access bulk campaigns in their org" ON bulk_campaigns;
CREATE POLICY "Users can access bulk campaigns in their org" ON bulk_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_lists (has organization_id)
DROP POLICY IF EXISTS "Users can access contact lists in their org" ON contact_lists;
CREATE POLICY "Users can access contact lists in their org" ON contact_lists FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- drip_campaigns (has organization_id)
DROP POLICY IF EXISTS "Users can access drip campaigns in their org" ON drip_campaigns;
CREATE POLICY "Users can access drip campaigns in their org" ON drip_campaigns FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- email_accounts (has organization_id)
DROP POLICY IF EXISTS "Users can view their organization email accounts" ON email_accounts;
CREATE POLICY "Users can view their organization email accounts" ON email_accounts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- contact_segments (has organization_id)
DROP POLICY IF EXISTS "Users can access contact segments in their org" ON contact_segments;
CREATE POLICY "Users can access contact segments in their org" ON contact_segments FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- deletion_requests (has organization_id and user_id)
DROP POLICY IF EXISTS "Users can view their own deletion requests" ON deletion_requests;
CREATE POLICY "Users can view their own deletion requests" ON deletion_requests FOR SELECT
USING (user_id = (SELECT auth.uid()) OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- template_usage_analytics (has organization_id)
DROP POLICY IF EXISTS "Users can view template analytics in their org" ON template_usage_analytics;
CREATE POLICY "Users can view template analytics in their org" ON template_usage_analytics FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- TABLES LINKED VIA FOREIGN KEYS (no organization_id)
-- ============================================

-- workflow_versions (links via workflow_id to workflows)
DROP POLICY IF EXISTS "Users can view workflow versions in their organization" ON workflow_versions;
DROP POLICY IF EXISTS "Users can insert workflow versions in their organization" ON workflow_versions;

CREATE POLICY "Users can view workflow versions in their organization" ON workflow_versions FOR SELECT
USING (workflow_id IN (SELECT id FROM workflows WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Users can insert workflow versions in their organization" ON workflow_versions FOR INSERT
WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_sync_logs (links via connection_id to crm_connections)
DROP POLICY IF EXISTS "View sync logs for own organization" ON crm_sync_logs;
DROP POLICY IF EXISTS "Admins can manage sync logs" ON crm_sync_logs;

CREATE POLICY "View sync logs for own organization" ON crm_sync_logs FOR SELECT
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Admins can manage sync logs" ON crm_sync_logs FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner'))));

-- crm_field_mappings (links via connection_id to crm_connections)
DROP POLICY IF EXISTS "View field mappings for own organization" ON crm_field_mappings;
DROP POLICY IF EXISTS "Admins can manage field mappings" ON crm_field_mappings;

CREATE POLICY "View field mappings for own organization" ON crm_field_mappings FOR SELECT
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Admins can manage field mappings" ON crm_field_mappings FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner'))));

-- crm_sync_state (links via connection_id to crm_connections)
DROP POLICY IF EXISTS "View sync state for own organization" ON crm_sync_state;
DROP POLICY IF EXISTS "System can manage sync state" ON crm_sync_state;

CREATE POLICY "View sync state for own organization" ON crm_sync_state FOR SELECT
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "System can manage sync state" ON crm_sync_state FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- crm_webhooks (links via connection_id to crm_connections)
DROP POLICY IF EXISTS "View webhooks for own organization" ON crm_webhooks;
DROP POLICY IF EXISTS "Admins can manage webhooks" ON crm_webhooks;

CREATE POLICY "View webhooks for own organization" ON crm_webhooks FOR SELECT
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Admins can manage webhooks" ON crm_webhooks FOR ALL
USING (connection_id IN (SELECT id FROM crm_connections WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner'))));

-- bulk_message_jobs (links via campaign_id to bulk_campaigns)
DROP POLICY IF EXISTS "Users can access bulk message jobs in their org" ON bulk_message_jobs;
CREATE POLICY "Users can access bulk message jobs in their org" ON bulk_message_jobs FOR ALL
USING (campaign_id IN (SELECT id FROM bulk_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_campaign_steps (links via campaign_id to drip_campaigns)
DROP POLICY IF EXISTS "Users can access drip campaign steps in their org" ON drip_campaign_steps;
CREATE POLICY "Users can access drip campaign steps in their org" ON drip_campaign_steps FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_enrollments (links via campaign_id to drip_campaigns)
DROP POLICY IF EXISTS "Users can access drip enrollments in their org" ON drip_enrollments;
CREATE POLICY "Users can access drip enrollments in their org" ON drip_enrollments FOR ALL
USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- drip_message_logs (links via enrollment_id to drip_enrollments)
DROP POLICY IF EXISTS "Users can view drip message logs in their org" ON drip_message_logs;
CREATE POLICY "Users can view drip message logs in their org" ON drip_message_logs FOR SELECT
USING (enrollment_id IN (SELECT id FROM drip_enrollments WHERE campaign_id IN (SELECT id FROM drip_campaigns WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))));

-- contact_segment_members (links via segment_id to contact_segments)
DROP POLICY IF EXISTS "Users can access contact segment members in their org" ON contact_segment_members;
CREATE POLICY "Users can access contact segment members in their org" ON contact_segment_members FOR ALL
USING (segment_id IN (SELECT id FROM contact_segments WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- sla_tracking (links via conversation_id to conversations)
DROP POLICY IF EXISTS "Users can view their organization SLA tracking" ON sla_tracking;
CREATE POLICY "Users can view their organization SLA tracking" ON sla_tracking FOR SELECT
USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))));

SELECT 'Step 13 v2 complete: All RLS policies optimized with correct column mappings!' AS status;
