-- STEP 8: Optimize RLS policies for performance
-- Fix auth.uid() to (SELECT auth.uid()) to prevent re-evaluation per row

-- ============================================
-- organizations
-- ============================================
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners can update their organization" ON organizations FOR UPDATE
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'owner'));

-- ============================================
-- profiles
-- ============================================
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Enable update for users own profile" ON profiles;
CREATE POLICY "Enable update for users own profile" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
USING ((SELECT auth.uid()) = id OR organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

-- ============================================
-- contacts
-- ============================================
DROP POLICY IF EXISTS "Users can access contacts in their organization" ON contacts;
CREATE POLICY "Users can access contacts in their organization" ON contacts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversations
-- ============================================
DROP POLICY IF EXISTS "Users can access conversations in their organization" ON conversations;
CREATE POLICY "Users can access conversations in their organization" ON conversations FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- messages
-- ============================================
DROP POLICY IF EXISTS "Users can access messages in their organization conversations" ON messages;
CREATE POLICY "Users can access messages in their organization conversations" ON messages FOR ALL
USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- automation_rules
-- ============================================
DROP POLICY IF EXISTS "Users can access automation rules in their organization" ON automation_rules;
CREATE POLICY "Users can access automation rules in their organization" ON automation_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- message_templates
-- ============================================
DROP POLICY IF EXISTS "Users can access templates in their organization" ON message_templates;
CREATE POLICY "Users can access templates in their organization" ON message_templates FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- webhook_logs
-- ============================================
DROP POLICY IF EXISTS "Users can view webhook logs in their organization" ON webhook_logs;
CREATE POLICY "Users can view webhook logs in their organization" ON webhook_logs FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversation_metrics
-- ============================================
DROP POLICY IF EXISTS "Users can view metrics in their organization" ON conversation_metrics;
CREATE POLICY "Users can view metrics in their organization" ON conversation_metrics FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- sessions
-- ============================================
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================
-- api_keys
-- ============================================
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;
CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- key_rotation_log
-- ============================================
DROP POLICY IF EXISTS "key_rotation_log_tenant_policy" ON key_rotation_log;
CREATE POLICY "key_rotation_log_tenant_policy" ON key_rotation_log FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- job_schedules
-- ============================================
DROP POLICY IF EXISTS "job_schedules_admin_policy" ON job_schedules;
CREATE POLICY "job_schedules_admin_policy" ON job_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- job_logs
-- ============================================
DROP POLICY IF EXISTS "job_logs_admin_policy" ON job_logs;
CREATE POLICY "job_logs_admin_policy" ON job_logs FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- payment_authentication_events
-- ============================================
DROP POLICY IF EXISTS "payment_auth_events_tenant_policy" ON payment_authentication_events;
CREATE POLICY "payment_auth_events_tenant_policy" ON payment_authentication_events FOR ALL
USING (payment_intent_id IN (
    SELECT id FROM payment_intents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- payment_compliance_logs
-- ============================================
DROP POLICY IF EXISTS "payment_compliance_logs_tenant_policy" ON payment_compliance_logs;
CREATE POLICY "payment_compliance_logs_tenant_policy" ON payment_compliance_logs FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- refund_notifications
-- ============================================
DROP POLICY IF EXISTS "refund_notifications_tenant_policy" ON refund_notifications;
CREATE POLICY "refund_notifications_tenant_policy" ON refund_notifications FOR ALL
USING (refund_id IN (
    SELECT id FROM refunds WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- refund_history
-- ============================================
DROP POLICY IF EXISTS "refund_history_tenant_policy" ON refund_history;
CREATE POLICY "refund_history_tenant_policy" ON refund_history FOR ALL
USING (refund_id IN (
    SELECT id FROM refunds WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- tags
-- ============================================
DROP POLICY IF EXISTS "Users can view tags in their organization" ON tags;
CREATE POLICY "Users can view tags in their organization" ON tags FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins and owners can manage tags" ON tags;
CREATE POLICY "Admins and owners can manage tags" ON tags FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- contact_tags
-- ============================================
DROP POLICY IF EXISTS "Users can view contact tags in their organization" ON contact_tags;
CREATE POLICY "Users can view contact tags in their organization" ON contact_tags FOR SELECT
USING (contact_id IN (
    SELECT id FROM contacts WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

DROP POLICY IF EXISTS "Users can manage contact tags in their organization" ON contact_tags;
CREATE POLICY "Users can manage contact tags in their organization" ON contact_tags FOR ALL
USING (contact_id IN (
    SELECT id FROM contacts WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- tag_categories
-- ============================================
DROP POLICY IF EXISTS "Users can view tag categories in their organization" ON tag_categories;
CREATE POLICY "Users can view tag categories in their organization" ON tag_categories FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins and owners can manage tag categories" ON tag_categories;
CREATE POLICY "Admins and owners can manage tag categories" ON tag_categories FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- ai_settings
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization AI settings" ON ai_settings;
CREATE POLICY "Users can view their organization AI settings" ON ai_settings FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can manage their organization AI settings" ON ai_settings;
CREATE POLICY "Admins can manage their organization AI settings" ON ai_settings FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

-- ============================================
-- ai_responses
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization AI responses" ON ai_responses;
CREATE POLICY "Users can view their organization AI responses" ON ai_responses FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "System can insert AI responses" ON ai_responses;
CREATE POLICY "System can insert AI responses" ON ai_responses FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversation_ai_metadata
-- ============================================
DROP POLICY IF EXISTS "Users can view their organization conversation AI metadata" ON conversation_ai_metadata;
CREATE POLICY "Users can view their organization conversation AI metadata" ON conversation_ai_metadata FOR SELECT
USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

DROP POLICY IF EXISTS "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata;
CREATE POLICY "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata FOR ALL
USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- team_invitations
-- ============================================
DROP POLICY IF EXISTS "team_invitations_org_members_select" ON team_invitations;
CREATE POLICY "team_invitations_org_members_select" ON team_invitations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invitations_admins_insert" ON team_invitations;
CREATE POLICY "team_invitations_admins_insert" ON team_invitations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "team_invitations_admins_update" ON team_invitations;
CREATE POLICY "team_invitations_admins_update" ON team_invitations FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "team_invitations_admins_delete" ON team_invitations;
CREATE POLICY "team_invitations_admins_delete" ON team_invitations FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')));

SELECT 'Step 8 complete: RLS policies optimized with (SELECT auth.uid())!' AS status;
