-- STEP 12 v2: Optimize ALL remaining tables with correct column names
-- Based on actual table structure from information_schema

-- ============================================
-- sessions (has: user_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT
USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================
-- api_keys (has: organization_id)
-- ============================================
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- key_rotation_log (has: organization_id)
-- ============================================
DROP POLICY IF EXISTS "key_rotation_log_tenant_policy" ON key_rotation_log;
CREATE POLICY "key_rotation_log_tenant_policy" ON key_rotation_log FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- job_schedules (NO organization_id - admin only)
-- ============================================
DROP POLICY IF EXISTS "job_schedules_admin_policy" ON job_schedules;
CREATE POLICY "job_schedules_admin_policy" ON job_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- job_logs (has: job_id, links to job_schedules)
-- ============================================
DROP POLICY IF EXISTS "job_logs_admin_policy" ON job_logs;
CREATE POLICY "job_logs_admin_policy" ON job_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- payment_authentication_events (has: payment_intent_id)
-- ============================================
DROP POLICY IF EXISTS "payment_auth_events_tenant_policy" ON payment_authentication_events;
CREATE POLICY "payment_auth_events_tenant_policy" ON payment_authentication_events FOR ALL
USING (payment_intent_id IN (
    SELECT id FROM payment_intents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- payment_compliance_logs (has: payment_intent_id, NOT organization_id)
-- ============================================
DROP POLICY IF EXISTS "payment_compliance_logs_tenant_policy" ON payment_compliance_logs;
CREATE POLICY "payment_compliance_logs_tenant_policy" ON payment_compliance_logs FOR ALL
USING (payment_intent_id IN (
    SELECT id FROM payment_intents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- refund_notifications (has: refund_id)
-- ============================================
DROP POLICY IF EXISTS "refund_notifications_tenant_policy" ON refund_notifications;
CREATE POLICY "refund_notifications_tenant_policy" ON refund_notifications FOR ALL
USING (refund_id IN (
    SELECT id FROM refunds WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- refund_history (has: refund_id)
-- ============================================
DROP POLICY IF EXISTS "refund_history_tenant_policy" ON refund_history;
CREATE POLICY "refund_history_tenant_policy" ON refund_history FOR ALL
USING (refund_id IN (
    SELECT id FROM refunds WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- tags (has: organization_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view tags in their organization" ON tags;
DROP POLICY IF EXISTS "Admins and owners can manage tags" ON tags;
CREATE POLICY "Users can view tags in their organization" ON tags FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Admins and owners can manage tags" ON tags FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- contact_tags (has: contact_id, tag_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view contact tags in their organization" ON contact_tags;
DROP POLICY IF EXISTS "Users can manage contact tags in their organization" ON contact_tags;
CREATE POLICY "Users can view contact tags in their organization" ON contact_tags FOR SELECT
USING (contact_id IN (
    SELECT id FROM contacts WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));
CREATE POLICY "Users can manage contact tags in their organization" ON contact_tags FOR ALL
USING (contact_id IN (
    SELECT id FROM contacts WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- tag_categories (has: organization_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view tag categories in their organization" ON tag_categories;
DROP POLICY IF EXISTS "Admins and owners can manage tag categories" ON tag_categories;
CREATE POLICY "Users can view tag categories in their organization" ON tag_categories FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Admins and owners can manage tag categories" ON tag_categories FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- ai_settings (has: organization_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization AI settings" ON ai_settings;
DROP POLICY IF EXISTS "Admins can manage their organization AI settings" ON ai_settings;
CREATE POLICY "Users can view their organization AI settings" ON ai_settings FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Admins can manage their organization AI settings" ON ai_settings FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- ai_responses (has: organization_id, conversation_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization AI responses" ON ai_responses;
DROP POLICY IF EXISTS "System can insert AI responses" ON ai_responses;
CREATE POLICY "Users can view their organization AI responses" ON ai_responses FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "System can insert AI responses" ON ai_responses FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversation_ai_metadata (has: conversation_id, organization_id)
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization conversation AI metadata" ON conversation_ai_metadata;
DROP POLICY IF EXISTS "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata;
CREATE POLICY "Users can view their organization conversation AI metadata" ON conversation_ai_metadata FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

SELECT 'Step 12 v2 complete: All remaining tables optimized!' AS status;
