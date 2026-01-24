-- STEP 12: Optimize ALL remaining tables with auth_rls_initplan warnings
-- Tables: sessions, api_keys, key_rotation_log, job_schedules, job_logs,
-- payment_authentication_events, payment_compliance_logs, refund_notifications,
-- tags, contact_tags, tag_categories, ai_settings, ai_responses,
-- conversation_ai_metadata, refund_history

-- ============================================
-- sessions
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own sessions" ON sessions';
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage own sessions" ON sessions';

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id') THEN
            EXECUTE 'CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = (SELECT auth.uid()))';
            EXECUTE 'CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (user_id = (SELECT auth.uid()))';
        END IF;
    END IF;
END $$;

-- ============================================
-- api_keys
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
        EXECUTE 'DROP POLICY IF EXISTS "api_keys_select" ON api_keys';
        EXECUTE 'DROP POLICY IF EXISTS "api_keys_insert" ON api_keys';
        EXECUTE 'DROP POLICY IF EXISTS "api_keys_update" ON api_keys';
        EXECUTE 'DROP POLICY IF EXISTS "api_keys_delete" ON api_keys';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view api keys" ON api_keys';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage api keys" ON api_keys';

        EXECUTE 'CREATE POLICY "api_keys_select" ON api_keys FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
    END IF;
END $$;

-- ============================================
-- key_rotation_log
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'key_rotation_log') THEN
        EXECUTE 'DROP POLICY IF EXISTS "key_rotation_log_tenant_policy" ON key_rotation_log';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view key rotation logs" ON key_rotation_log';

        EXECUTE 'CREATE POLICY "key_rotation_log_tenant_policy" ON key_rotation_log FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
    END IF;
END $$;

-- ============================================
-- job_schedules
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_schedules') THEN
        EXECUTE 'DROP POLICY IF EXISTS "job_schedules_admin_policy" ON job_schedules';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage job schedules" ON job_schedules';

        EXECUTE 'CREATE POLICY "job_schedules_admin_policy" ON job_schedules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN (''admin'', ''owner'')))';
    END IF;
END $$;

-- ============================================
-- job_logs
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_logs') THEN
        EXECUTE 'DROP POLICY IF EXISTS "job_logs_admin_policy" ON job_logs';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view job logs" ON job_logs';

        EXECUTE 'CREATE POLICY "job_logs_admin_policy" ON job_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN (''admin'', ''owner'')))';
    END IF;
END $$;

-- ============================================
-- payment_authentication_events
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_authentication_events') THEN
        EXECUTE 'DROP POLICY IF EXISTS "payment_auth_events_tenant_policy" ON payment_authentication_events';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view payment auth events" ON payment_authentication_events';

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_intents') THEN
            EXECUTE 'CREATE POLICY "payment_auth_events_tenant_policy" ON payment_authentication_events FOR ALL USING (payment_intent_id IN (SELECT id FROM payment_intents WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
        END IF;
    END IF;
END $$;

-- ============================================
-- payment_compliance_logs
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_compliance_logs') THEN
        EXECUTE 'DROP POLICY IF EXISTS "payment_compliance_logs_tenant_policy" ON payment_compliance_logs';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view compliance logs" ON payment_compliance_logs';

        EXECUTE 'CREATE POLICY "payment_compliance_logs_tenant_policy" ON payment_compliance_logs FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
    END IF;
END $$;

-- ============================================
-- refund_notifications
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refund_notifications') THEN
        EXECUTE 'DROP POLICY IF EXISTS "refund_notifications_tenant_policy" ON refund_notifications';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view refund notifications" ON refund_notifications';

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refunds') THEN
            EXECUTE 'CREATE POLICY "refund_notifications_tenant_policy" ON refund_notifications FOR ALL USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
        END IF;
    END IF;
END $$;

-- ============================================
-- refund_history
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refund_history') THEN
        EXECUTE 'DROP POLICY IF EXISTS "refund_history_tenant_policy" ON refund_history';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view refund history" ON refund_history';

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refunds') THEN
            EXECUTE 'CREATE POLICY "refund_history_tenant_policy" ON refund_history FOR ALL USING (refund_id IN (SELECT id FROM refunds WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
        END IF;
    END IF;
END $$;

-- ============================================
-- tags
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view tags in their organization" ON tags';
        EXECUTE 'DROP POLICY IF EXISTS "Admins and owners can manage tags" ON tags';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view tags" ON tags';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage tags" ON tags';

        EXECUTE 'CREATE POLICY "Users can view tags in their organization" ON tags FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "Admins and owners can manage tags" ON tags FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN (''admin'', ''owner'')))';
    END IF;
END $$;

-- ============================================
-- contact_tags
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_tags') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view contact tags in their organization" ON contact_tags';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage contact tags in their organization" ON contact_tags';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view contact tags" ON contact_tags';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage contact tags" ON contact_tags';

        EXECUTE 'CREATE POLICY "Users can view contact tags in their organization" ON contact_tags FOR SELECT USING (contact_id IN (SELECT id FROM contacts WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
        EXECUTE 'CREATE POLICY "Users can manage contact tags in their organization" ON contact_tags FOR ALL USING (contact_id IN (SELECT id FROM contacts WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
    END IF;
END $$;

-- ============================================
-- tag_categories
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tag_categories') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view tag categories in their organization" ON tag_categories';
        EXECUTE 'DROP POLICY IF EXISTS "Admins and owners can manage tag categories" ON tag_categories';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view tag categories" ON tag_categories';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage tag categories" ON tag_categories';

        EXECUTE 'CREATE POLICY "Users can view tag categories in their organization" ON tag_categories FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "Admins and owners can manage tag categories" ON tag_categories FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN (''admin'', ''owner'')))';
    END IF;
END $$;

-- ============================================
-- ai_settings
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_settings') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their organization AI settings" ON ai_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage their organization AI settings" ON ai_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view AI settings" ON ai_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage AI settings" ON ai_settings';

        EXECUTE 'CREATE POLICY "Users can view their organization AI settings" ON ai_settings FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "Admins can manage their organization AI settings" ON ai_settings FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN (''admin'', ''owner'')))';
    END IF;
END $$;

-- ============================================
-- ai_responses
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_responses') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their organization AI responses" ON ai_responses';
        EXECUTE 'DROP POLICY IF EXISTS "System can insert AI responses" ON ai_responses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view AI responses" ON ai_responses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert AI responses" ON ai_responses';

        EXECUTE 'CREATE POLICY "Users can view their organization AI responses" ON ai_responses FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
        EXECUTE 'CREATE POLICY "System can insert AI responses" ON ai_responses FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())))';
    END IF;
END $$;

-- ============================================
-- conversation_ai_metadata
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_ai_metadata') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their organization conversation AI metadata" ON conversation_ai_metadata';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view conversation AI metadata" ON conversation_ai_metadata';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage conversation AI metadata" ON conversation_ai_metadata';

        EXECUTE 'CREATE POLICY "Users can view their organization conversation AI metadata" ON conversation_ai_metadata FOR SELECT USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
        EXECUTE 'CREATE POLICY "Users can manage their organization conversation AI metadata" ON conversation_ai_metadata FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()))))';
    END IF;
END $$;

SELECT 'Step 12 complete: All remaining tables optimized!' AS status;
