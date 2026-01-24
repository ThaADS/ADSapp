-- STEP 3 SAFE: RLS Policies with column existence checks
-- Each policy checks if the required column exists before creating

-- =====================================================
-- HELPER: Create policy only if column exists
-- =====================================================

-- key_rotation_log
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'key_rotation_log' AND column_name = 'organization_id'
    ) THEN
        DROP POLICY IF EXISTS key_rotation_log_tenant_policy ON key_rotation_log;
        CREATE POLICY key_rotation_log_tenant_policy ON key_rotation_log
            FOR ALL USING (
                organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
            );
        RAISE NOTICE 'Created key_rotation_log_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS key_rotation_log_admin_policy ON key_rotation_log;
        CREATE POLICY key_rotation_log_admin_policy ON key_rotation_log
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created key_rotation_log_admin_policy (no org_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'key_rotation_log does not exist';
END $$;

-- job_schedules
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'job_schedules' AND column_name = 'organization_id'
    ) THEN
        DROP POLICY IF EXISTS job_schedules_tenant_policy ON job_schedules;
        CREATE POLICY job_schedules_tenant_policy ON job_schedules
            FOR ALL USING (
                organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
            );
        RAISE NOTICE 'Created job_schedules_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS job_schedules_admin_policy ON job_schedules;
        CREATE POLICY job_schedules_admin_policy ON job_schedules
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true))
            );
        RAISE NOTICE 'Created job_schedules_admin_policy (no org_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'job_schedules does not exist';
END $$;

-- job_logs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'job_logs' AND column_name = 'organization_id'
    ) THEN
        DROP POLICY IF EXISTS job_logs_tenant_policy ON job_logs;
        CREATE POLICY job_logs_tenant_policy ON job_logs
            FOR ALL USING (
                organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
            );
        RAISE NOTICE 'Created job_logs_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS job_logs_admin_policy ON job_logs;
        CREATE POLICY job_logs_admin_policy ON job_logs
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true))
            );
        RAISE NOTICE 'Created job_logs_admin_policy (no org_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'job_logs does not exist';
END $$;

-- payment_authentication_events (via payment_intents)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_authentication_events' AND column_name = 'payment_intent_id'
    ) THEN
        DROP POLICY IF EXISTS payment_auth_events_tenant_policy ON payment_authentication_events;
        CREATE POLICY payment_auth_events_tenant_policy ON payment_authentication_events
            FOR ALL USING (
                payment_intent_id IN (
                    SELECT pi.id FROM payment_intents pi
                    WHERE pi.organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
                )
            );
        RAISE NOTICE 'Created payment_auth_events_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS payment_auth_events_admin_policy ON payment_authentication_events;
        CREATE POLICY payment_auth_events_admin_policy ON payment_authentication_events
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created payment_auth_events_admin_policy (no payment_intent_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'payment_authentication_events does not exist';
END $$;

-- payment_compliance_logs (via payment_intents)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_compliance_logs' AND column_name = 'payment_intent_id'
    ) THEN
        DROP POLICY IF EXISTS payment_compliance_logs_tenant_policy ON payment_compliance_logs;
        CREATE POLICY payment_compliance_logs_tenant_policy ON payment_compliance_logs
            FOR ALL USING (
                payment_intent_id IN (
                    SELECT pi.id FROM payment_intents pi
                    WHERE pi.organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
                )
            );
        RAISE NOTICE 'Created payment_compliance_logs_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS payment_compliance_logs_admin_policy ON payment_compliance_logs;
        CREATE POLICY payment_compliance_logs_admin_policy ON payment_compliance_logs
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created payment_compliance_logs_admin_policy (no payment_intent_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'payment_compliance_logs does not exist';
END $$;

-- refund_notifications (via refunds)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'refund_notifications' AND column_name = 'refund_id'
    ) THEN
        DROP POLICY IF EXISTS refund_notifications_tenant_policy ON refund_notifications;
        CREATE POLICY refund_notifications_tenant_policy ON refund_notifications
            FOR ALL USING (
                refund_id IN (
                    SELECT r.id FROM refunds r
                    WHERE r.organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
                )
            );
        RAISE NOTICE 'Created refund_notifications_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS refund_notifications_admin_policy ON refund_notifications;
        CREATE POLICY refund_notifications_admin_policy ON refund_notifications
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created refund_notifications_admin_policy (no refund_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'refund_notifications does not exist';
END $$;

-- refund_history (via refunds)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'refund_history' AND column_name = 'refund_id'
    ) THEN
        DROP POLICY IF EXISTS refund_history_tenant_policy ON refund_history;
        CREATE POLICY refund_history_tenant_policy ON refund_history
            FOR ALL USING (
                refund_id IN (
                    SELECT r.id FROM refunds r
                    WHERE r.organization_id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
                )
            );
        RAISE NOTICE 'Created refund_history_tenant_policy';
    ELSE
        DROP POLICY IF EXISTS refund_history_admin_policy ON refund_history;
        CREATE POLICY refund_history_admin_policy ON refund_history
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created refund_history_admin_policy (no refund_id)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'refund_history does not exist';
END $$;

-- webhook_events (admin only - no org link)
DO $$
BEGIN
    DROP POLICY IF EXISTS webhook_events_admin_policy ON webhook_events;
    CREATE POLICY webhook_events_admin_policy ON webhook_events
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true))
        );
    RAISE NOTICE 'Created webhook_events_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'webhook_events does not exist';
END $$;

-- webhook_processing_errors (admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS webhook_processing_errors_admin_policy ON webhook_processing_errors;
    CREATE POLICY webhook_processing_errors_admin_policy ON webhook_processing_errors
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true))
        );
    RAISE NOTICE 'Created webhook_processing_errors_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'webhook_processing_errors does not exist';
END $$;

-- cache_invalidation_logs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cache_invalidation_logs' AND column_name = 'invalidated_by'
    ) THEN
        DROP POLICY IF EXISTS cache_invalidation_logs_policy ON cache_invalidation_logs;
        CREATE POLICY cache_invalidation_logs_policy ON cache_invalidation_logs
            FOR ALL USING (
                invalidated_by = auth.uid()
                OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created cache_invalidation_logs_policy';
    ELSE
        DROP POLICY IF EXISTS cache_invalidation_logs_admin_policy ON cache_invalidation_logs;
        CREATE POLICY cache_invalidation_logs_admin_policy ON cache_invalidation_logs
            FOR ALL USING (
                EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
            );
        RAISE NOTICE 'Created cache_invalidation_logs_admin_policy (no invalidated_by)';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'cache_invalidation_logs does not exist';
END $$;

-- cache_metadata (super admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS cache_metadata_admin_policy ON cache_metadata;
    CREATE POLICY cache_metadata_admin_policy ON cache_metadata
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
        );
    RAISE NOTICE 'Created cache_metadata_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'cache_metadata does not exist';
END $$;

-- cache_stats_daily (super admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS cache_stats_daily_admin_policy ON cache_stats_daily;
    CREATE POLICY cache_stats_daily_admin_policy ON cache_stats_daily
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
        );
    RAISE NOTICE 'Created cache_stats_daily_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'cache_stats_daily does not exist';
END $$;

-- default_retention_policies (super admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS default_retention_policies_admin_policy ON default_retention_policies;
    CREATE POLICY default_retention_policies_admin_policy ON default_retention_policies
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
        );
    RAISE NOTICE 'Created default_retention_policies_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'default_retention_policies does not exist';
END $$;

-- deletion_audit_log (admin only)
DO $$
BEGIN
    DROP POLICY IF EXISTS deletion_audit_log_admin_policy ON deletion_audit_log;
    CREATE POLICY deletion_audit_log_admin_policy ON deletion_audit_log
        FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role IN ('admin', 'owner') OR p.is_super_admin = true))
        );
    RAISE NOTICE 'Created deletion_audit_log_admin_policy';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'deletion_audit_log does not exist';
END $$;
