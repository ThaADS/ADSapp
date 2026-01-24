-- STEP 3: RLS Policies based on actual table structures
-- Run after step1_enable_rls.sql succeeds

-- =====================================================
-- TABLES WITH organization_id COLUMN (direct tenant isolation)
-- =====================================================

-- key_rotation_log (has organization_id)
DROP POLICY IF EXISTS key_rotation_log_tenant_policy ON key_rotation_log;
CREATE POLICY key_rotation_log_tenant_policy ON key_rotation_log
    FOR ALL USING (
        organization_id IN (
            SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
        )
    );

-- job_schedules (has organization_id)
DROP POLICY IF EXISTS job_schedules_tenant_policy ON job_schedules;
CREATE POLICY job_schedules_tenant_policy ON job_schedules
    FOR ALL USING (
        organization_id IN (
            SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
        )
    );

-- =====================================================
-- TABLES WITH FK RELATIONSHIPS (indirect tenant isolation)
-- =====================================================

-- payment_authentication_events (via payment_intents.organization_id)
DROP POLICY IF EXISTS payment_auth_events_tenant_policy ON payment_authentication_events;
CREATE POLICY payment_auth_events_tenant_policy ON payment_authentication_events
    FOR ALL USING (
        payment_intent_id IN (
            SELECT pi.id FROM payment_intents pi
            WHERE pi.organization_id IN (
                SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
            )
        )
    );

-- payment_compliance_logs (via payment_intents.organization_id)
DROP POLICY IF EXISTS payment_compliance_logs_tenant_policy ON payment_compliance_logs;
CREATE POLICY payment_compliance_logs_tenant_policy ON payment_compliance_logs
    FOR ALL USING (
        payment_intent_id IN (
            SELECT pi.id FROM payment_intents pi
            WHERE pi.organization_id IN (
                SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
            )
        )
    );

-- refund_notifications (via refunds.organization_id)
DROP POLICY IF EXISTS refund_notifications_tenant_policy ON refund_notifications;
CREATE POLICY refund_notifications_tenant_policy ON refund_notifications
    FOR ALL USING (
        refund_id IN (
            SELECT r.id FROM refunds r
            WHERE r.organization_id IN (
                SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
            )
        )
    );

-- webhook_processing_errors (via webhook_events - admin only since no org link)
DROP POLICY IF EXISTS webhook_processing_errors_admin_policy ON webhook_processing_errors;
CREATE POLICY webhook_processing_errors_admin_policy ON webhook_processing_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true)
        )
    );

-- =====================================================
-- TABLES WITHOUT ORG LINK (admin/super-admin only)
-- =====================================================

-- webhook_events (no org_id - admin only)
DROP POLICY IF EXISTS webhook_events_admin_policy ON webhook_events;
CREATE POLICY webhook_events_admin_policy ON webhook_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true)
        )
    );

-- cache_invalidation_logs (has invalidated_by - user can see their own)
DROP POLICY IF EXISTS cache_invalidation_logs_policy ON cache_invalidation_logs;
CREATE POLICY cache_invalidation_logs_policy ON cache_invalidation_logs
    FOR ALL USING (
        invalidated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.is_super_admin = true
        )
    );

-- cache_metadata (global cache - super admin only)
DROP POLICY IF EXISTS cache_metadata_admin_policy ON cache_metadata;
CREATE POLICY cache_metadata_admin_policy ON cache_metadata
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.is_super_admin = true
        )
    );

-- cache_stats_daily (global stats - super admin only)
DROP POLICY IF EXISTS cache_stats_daily_admin_policy ON cache_stats_daily;
CREATE POLICY cache_stats_daily_admin_policy ON cache_stats_daily
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.is_super_admin = true
        )
    );

-- default_retention_policies (global config - super admin only)
DROP POLICY IF EXISTS default_retention_policies_admin_policy ON default_retention_policies;
CREATE POLICY default_retention_policies_admin_policy ON default_retention_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.is_super_admin = true
        )
    );

-- deletion_audit_log (has deletion_request_id - need to check deletion_requests table)
-- For now, make it admin/super-admin only
DROP POLICY IF EXISTS deletion_audit_log_admin_policy ON deletion_audit_log;
CREATE POLICY deletion_audit_log_admin_policy ON deletion_audit_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true)
        )
    );

-- =====================================================
-- CHECK: Does refund_history table exist?
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = 'refund_history'
    ) THEN
        -- Check if it has refund_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = 'refund_history'
            AND c.column_name = 'refund_id'
        ) THEN
            EXECUTE '
                DROP POLICY IF EXISTS refund_history_tenant_policy ON refund_history;
                CREATE POLICY refund_history_tenant_policy ON refund_history
                    FOR ALL USING (
                        refund_id IN (
                            SELECT r.id FROM refunds r
                            WHERE r.organization_id IN (
                                SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
                            )
                        )
                    )
            ';
            RAISE NOTICE 'Created refund_history_tenant_policy';
        ELSE
            RAISE NOTICE 'refund_history exists but has no refund_id column';
        END IF;
    ELSE
        RAISE NOTICE 'refund_history table does not exist';
    END IF;
END $$;

-- =====================================================
-- CHECK: Does job_logs table exist?
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = 'job_logs'
    ) THEN
        -- Check if it has organization_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = 'job_logs'
            AND c.column_name = 'organization_id'
        ) THEN
            EXECUTE '
                DROP POLICY IF EXISTS job_logs_tenant_policy ON job_logs;
                CREATE POLICY job_logs_tenant_policy ON job_logs
                    FOR ALL USING (
                        organization_id IN (
                            SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
                        )
                    )
            ';
            RAISE NOTICE 'Created job_logs_tenant_policy with organization_id';
        ELSE
            -- No org_id, make it admin only
            EXECUTE '
                DROP POLICY IF EXISTS job_logs_admin_policy ON job_logs;
                CREATE POLICY job_logs_admin_policy ON job_logs
                    FOR ALL USING (
                        EXISTS (
                            SELECT 1 FROM profiles p
                            WHERE p.id = auth.uid()
                            AND (p.role IN (''admin'', ''owner'') OR p.is_super_admin = true)
                        )
                    )
            ';
            RAISE NOTICE 'Created job_logs_admin_policy (no organization_id)';
        END IF;
    ELSE
        RAISE NOTICE 'job_logs table does not exist';
    END IF;
END $$;
