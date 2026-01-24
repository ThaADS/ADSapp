-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fixes Supabase Security Advisor issues:
-- 1. Enable RLS on tables without it
-- 2. Fix function search_path warnings
-- 3. Add missing tables (bulk_campaigns, etc.)
-- =====================================================

-- =====================================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- =====================================================

-- Webhook tables
ALTER TABLE IF EXISTS webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_processing_errors ENABLE ROW LEVEL SECURITY;

-- Payment tables
ALTER TABLE IF EXISTS payment_authentication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refund_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refund_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_compliance_logs ENABLE ROW LEVEL SECURITY;

-- Job tables
ALTER TABLE IF EXISTS job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_schedules ENABLE ROW LEVEL SECURITY;

-- Cache tables
ALTER TABLE IF EXISTS cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cache_invalidation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cache_stats_daily ENABLE ROW LEVEL SECURITY;

-- Security/compliance tables
ALTER TABLE IF EXISTS key_rotation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS default_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: RLS POLICIES FOR TABLES
-- =====================================================

-- Webhook events policies (admin only)
DROP POLICY IF EXISTS webhook_events_admin_policy ON webhook_events;
CREATE POLICY webhook_events_admin_policy ON webhook_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'owner' OR profiles.is_super_admin = true)
        )
    );

DROP POLICY IF EXISTS webhook_processing_errors_admin_policy ON webhook_processing_errors;
CREATE POLICY webhook_processing_errors_admin_policy ON webhook_processing_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'owner' OR profiles.is_super_admin = true)
        )
    );

-- Payment authentication events (tenant isolation via payment_intents)
DROP POLICY IF EXISTS payment_auth_events_tenant_policy ON payment_authentication_events;
CREATE POLICY payment_auth_events_tenant_policy ON payment_authentication_events
    FOR ALL USING (
        payment_intent_id IN (
            SELECT pi.id FROM payment_intents pi
            WHERE pi.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Refund history (tenant isolation via refunds table)
DROP POLICY IF EXISTS refund_history_tenant_policy ON refund_history;
CREATE POLICY refund_history_tenant_policy ON refund_history
    FOR ALL USING (
        refund_id IN (
            SELECT r.id FROM refunds r
            WHERE r.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Refund notifications (tenant isolation via refunds table)
DROP POLICY IF EXISTS refund_notifications_tenant_policy ON refund_notifications;
CREATE POLICY refund_notifications_tenant_policy ON refund_notifications
    FOR ALL USING (
        refund_id IN (
            SELECT r.id FROM refunds r
            WHERE r.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Payment compliance logs (tenant isolation via payment_intents, admin only)
DROP POLICY IF EXISTS payment_compliance_logs_admin_policy ON payment_compliance_logs;
CREATE POLICY payment_compliance_logs_admin_policy ON payment_compliance_logs
    FOR ALL USING (
        payment_intent_id IN (
            SELECT pi.id FROM payment_intents pi
            WHERE pi.organization_id IN (
                SELECT organization_id FROM profiles
                WHERE id = auth.uid()
                AND (role = 'admin' OR role = 'owner' OR is_super_admin = true)
            )
        )
    );

-- Job logs (tenant isolation + admin only)
DROP POLICY IF EXISTS job_logs_admin_policy ON job_logs;
CREATE POLICY job_logs_admin_policy ON job_logs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'owner' OR is_super_admin = true)
        )
    );

-- Job schedules (tenant isolation)
DROP POLICY IF EXISTS job_schedules_tenant_policy ON job_schedules;
CREATE POLICY job_schedules_tenant_policy ON job_schedules
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Cache metadata (tenant isolation via tenant_id column)
DROP POLICY IF EXISTS cache_metadata_service_policy ON cache_metadata;
CREATE POLICY cache_metadata_tenant_policy ON cache_metadata
    FOR ALL USING (
        tenant_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Cache invalidation logs (tenant isolation via tenant_id + admin only)
DROP POLICY IF EXISTS cache_invalidation_logs_admin_policy ON cache_invalidation_logs;
CREATE POLICY cache_invalidation_logs_admin_policy ON cache_invalidation_logs
    FOR ALL USING (
        tenant_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'owner' OR is_super_admin = true)
        )
    );

-- Cache stats daily (tenant isolation via tenant_id + admin only)
DROP POLICY IF EXISTS cache_stats_daily_admin_policy ON cache_stats_daily;
CREATE POLICY cache_stats_daily_admin_policy ON cache_stats_daily
    FOR ALL USING (
        tenant_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'owner' OR is_super_admin = true)
        )
    );

-- Key rotation log (tenant isolation via tenant_id + super admin only)
DROP POLICY IF EXISTS key_rotation_log_superadmin_policy ON key_rotation_log;
CREATE POLICY key_rotation_log_superadmin_policy ON key_rotation_log
    FOR ALL USING (
        tenant_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND is_super_admin = true
        )
    );

-- Default retention policies (super admin only - global config table)
DROP POLICY IF EXISTS default_retention_policies_superadmin_policy ON default_retention_policies;
CREATE POLICY default_retention_policies_superadmin_policy ON default_retention_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_super_admin = true
        )
    );

-- Deletion audit log (tenant isolation + super admin)
DROP POLICY IF EXISTS deletion_audit_log_superadmin_policy ON deletion_audit_log;
CREATE POLICY deletion_audit_log_superadmin_policy ON deletion_audit_log
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'owner' OR is_super_admin = true)
        )
    );

-- =====================================================
-- PART 3: BULK CAMPAIGNS TABLES (missing)
-- =====================================================

CREATE TABLE IF NOT EXISTS bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES message_templates(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    target_segment JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_org ON bulk_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_scheduled ON bulk_campaigns(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE bulk_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bulk_campaigns_tenant_policy ON bulk_campaigns;
CREATE POLICY bulk_campaigns_tenant_policy ON bulk_campaigns
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Bulk message jobs table
CREATE TABLE IF NOT EXISTS bulk_message_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed')),
    whatsapp_message_id VARCHAR(255),
    error_message TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_message_jobs_campaign ON bulk_message_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_message_jobs_contact ON bulk_message_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_bulk_message_jobs_status ON bulk_message_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_message_jobs_scheduled ON bulk_message_jobs(scheduled_at) WHERE status = 'pending';

ALTER TABLE bulk_message_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bulk_message_jobs_tenant_policy ON bulk_message_jobs;
CREATE POLICY bulk_message_jobs_tenant_policy ON bulk_message_jobs
    FOR ALL USING (
        campaign_id IN (
            SELECT bc.id FROM bulk_campaigns bc
            WHERE bc.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- =====================================================
-- PART 4: WEB VITALS TRACKING TABLE (missing)
-- =====================================================

CREATE TABLE IF NOT EXISTS web_vitals_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    session_id VARCHAR(255),
    page_url TEXT NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_rating VARCHAR(20) CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
    user_agent TEXT,
    connection_type VARCHAR(50),
    device_type VARCHAR(50),
    viewport_width INTEGER,
    viewport_height INTEGER,
    navigation_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_org ON web_vitals_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric ON web_vitals_tracking(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created ON web_vitals_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_web_vitals_page ON web_vitals_tracking(page_url);

ALTER TABLE web_vitals_tracking ENABLE ROW LEVEL SECURITY;

-- Web vitals can be inserted by anyone (anonymous tracking), but only read by admins
DROP POLICY IF EXISTS web_vitals_insert_policy ON web_vitals_tracking;
CREATE POLICY web_vitals_insert_policy ON web_vitals_tracking
    FOR INSERT WITH CHECK (true); -- Allow anonymous inserts for tracking

DROP POLICY IF EXISTS web_vitals_select_policy ON web_vitals_tracking;
CREATE POLICY web_vitals_select_policy ON web_vitals_tracking
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true
        )
    );

-- =====================================================
-- PART 5: FIX FUNCTION SEARCH_PATH WARNINGS
-- These functions need SET search_path = public to be secure
-- =====================================================

-- Fix log_invitation_event function
CREATE OR REPLACE FUNCTION public.log_invitation_event(
    p_invitation_id UUID,
    p_event_type VARCHAR,
    p_old_status VARCHAR DEFAULT NULL,
    p_new_status VARCHAR DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO invitation_audit_log (
        invitation_id,
        event_type,
        old_status,
        new_status,
        performed_by,
        metadata
    ) VALUES (
        p_invitation_id,
        p_event_type,
        p_old_status,
        p_new_status,
        COALESCE(p_performed_by, auth.uid()),
        p_metadata
    );
END;
$$;

-- Fix log_api_key_event function
CREATE OR REPLACE FUNCTION public.log_api_key_event(
    p_api_key_id UUID,
    p_event_type VARCHAR,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log to audit system if available
    INSERT INTO api_logs (
        method,
        url,
        user_id,
        status_code,
        timestamp
    ) VALUES (
        'API_KEY_EVENT',
        p_event_type,
        auth.uid(),
        200,
        NOW()
    );
EXCEPTION WHEN others THEN
    -- Silently fail if api_logs table doesn't exist
    NULL;
END;
$$;

-- Fix refresh_ai_usage_analytics function
CREATE OR REPLACE FUNCTION public.refresh_ai_usage_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_analytics;
EXCEPTION WHEN others THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW ai_usage_analytics;
END;
$$;

-- Fix check_ai_budget function
CREATE OR REPLACE FUNCTION public.check_ai_budget(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings RECORD;
    v_current_spend NUMERIC;
    v_budget_percent NUMERIC;
BEGIN
    SELECT * INTO v_settings FROM ai_settings WHERE organization_id = p_organization_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('within_budget', true, 'spend', 0, 'budget', 0, 'percent', 0);
    END IF;

    SELECT COALESCE(SUM(cost_usd), 0) INTO v_current_spend
    FROM ai_responses
    WHERE organization_id = p_organization_id
    AND created_at >= date_trunc('month', NOW());

    v_budget_percent := CASE
        WHEN v_settings.monthly_budget_usd > 0 THEN (v_current_spend / v_settings.monthly_budget_usd) * 100
        ELSE 0
    END;

    RETURN jsonb_build_object(
        'within_budget', v_current_spend < v_settings.monthly_budget_usd,
        'spend', v_current_spend,
        'budget', v_settings.monthly_budget_usd,
        'percent', v_budget_percent,
        'alert_threshold', v_settings.alert_threshold
    );
END;
$$;

-- Fix validate_business_hours function
CREATE OR REPLACE FUNCTION public.validate_business_hours(p_hours JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_day TEXT;
    v_day_config JSONB;
BEGIN
    IF p_hours IS NULL THEN
        RETURN true;
    END IF;

    FOR v_day IN SELECT jsonb_object_keys(p_hours) LOOP
        IF v_day NOT IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') THEN
            RETURN false;
        END IF;

        v_day_config := p_hours->v_day;
        IF v_day_config IS NOT NULL AND v_day_config->>'enabled' = 'true' THEN
            IF NOT (v_day_config ? 'start' AND v_day_config ? 'end') THEN
                RETURN false;
            END IF;
        END IF;
    END LOOP;

    RETURN true;
END;
$$;

-- Fix update_workflow_updated_at function
CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix create_workflow_version function
CREATE OR REPLACE FUNCTION public.create_workflow_version(
    p_workflow_id UUID,
    p_changes JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_version_id UUID;
    v_version_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM workflow_versions
    WHERE workflow_id = p_workflow_id;

    INSERT INTO workflow_versions (workflow_id, version_number, changes)
    VALUES (p_workflow_id, v_version_number, p_changes)
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$$;

-- Fix get_organization_logo_url function
CREATE OR REPLACE FUNCTION public.get_organization_logo_url(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_logo_url TEXT;
BEGIN
    SELECT logo_url INTO v_logo_url
    FROM organizations
    WHERE id = p_organization_id;

    RETURN v_logo_url;
END;
$$;

-- Fix log_logo_change function
CREATE OR REPLACE FUNCTION public.log_logo_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
        INSERT INTO audit_logs (
            organization_id,
            user_id,
            action,
            resource_type,
            resource_id,
            changes
        ) VALUES (
            NEW.id,
            auth.uid(),
            'update',
            'organization_logo',
            NEW.id,
            jsonb_build_object(
                'old_logo_url', OLD.logo_url,
                'new_logo_url', NEW.logo_url
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN others THEN
    -- Silently fail if audit_logs table doesn't exist
    RETURN NEW;
END;
$$;

-- Fix update_workflow_stats function
CREATE OR REPLACE FUNCTION public.update_workflow_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update workflow statistics on execution completion
    IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
        UPDATE workflows
        SET
            executions_count = executions_count + 1,
            last_executed_at = NOW(),
            success_rate = (
                SELECT ROUND(
                    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
                    NULLIF(COUNT(*), 0) * 100, 2
                )
                FROM workflow_executions
                WHERE workflow_id = NEW.workflow_id
            )
        WHERE id = NEW.workflow_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix check_sla_breach function
CREATE OR REPLACE FUNCTION public.check_sla_breach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sla_hours INTEGER := 24; -- Default SLA hours
BEGIN
    -- Check if conversation has breached SLA
    IF NEW.status = 'open' AND NEW.first_response_at IS NULL THEN
        IF NEW.created_at + (v_sla_hours || ' hours')::INTERVAL < NOW() THEN
            NEW.sla_breached = true;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix calculate_lead_score function
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INTEGER := 0;
    v_message_count INTEGER;
    v_response_rate NUMERIC;
    v_last_activity TIMESTAMPTZ;
BEGIN
    -- Count messages
    SELECT COUNT(*) INTO v_message_count
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.contact_id = p_contact_id;

    -- Add points for message volume
    v_score := v_score + LEAST(v_message_count * 2, 30);

    -- Add points for recent activity
    SELECT MAX(c.last_message_at) INTO v_last_activity
    FROM conversations c
    WHERE c.contact_id = p_contact_id;

    IF v_last_activity > NOW() - INTERVAL '7 days' THEN
        v_score := v_score + 20;
    ELSIF v_last_activity > NOW() - INTERVAL '30 days' THEN
        v_score := v_score + 10;
    END IF;

    RETURN LEAST(v_score, 100);
END;
$$;

-- Fix check_duplicate_pending_invitation function
CREATE OR REPLACE FUNCTION public.check_duplicate_pending_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM team_invitations
        WHERE organization_id = NEW.organization_id
        AND email = NEW.email
        AND status = 'pending'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'A pending invitation already exists for this email in this organization';
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_team_member_count function
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE organizations
    SET team_member_count = (
        SELECT COUNT(*) FROM profiles WHERE organization_id = NEW.organization_id
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
EXCEPTION WHEN others THEN
    RETURN NEW;
END;
$$;

-- Fix expire_old_invitations function
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE team_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Fix check_available_licenses function
CREATE OR REPLACE FUNCTION public.check_available_licenses(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_users INTEGER;
    v_current_users INTEGER;
BEGIN
    SELECT max_users INTO v_max_users
    FROM organizations
    WHERE id = p_organization_id;

    SELECT COUNT(*) INTO v_current_users
    FROM profiles
    WHERE organization_id = p_organization_id;

    RETURN v_current_users < COALESCE(v_max_users, 999999);
END;
$$;

-- Fix update_drip_campaign_statistics function
CREATE OR REPLACE FUNCTION public.update_drip_campaign_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update campaign statistics when enrollment changes
    IF TG_TABLE_NAME = 'drip_campaign_enrollments' THEN
        UPDATE drip_campaigns
        SET
            total_enrolled = (SELECT COUNT(*) FROM drip_campaign_enrollments WHERE campaign_id = NEW.campaign_id),
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix schedule_next_drip_message function
CREATE OR REPLACE FUNCTION public.schedule_next_drip_message(p_enrollment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enrollment RECORD;
    v_next_step RECORD;
BEGIN
    SELECT * INTO v_enrollment FROM drip_campaign_enrollments WHERE id = p_enrollment_id;

    IF NOT FOUND OR v_enrollment.status != 'active' THEN
        RETURN;
    END IF;

    SELECT * INTO v_next_step
    FROM drip_campaign_steps
    WHERE campaign_id = v_enrollment.campaign_id
    AND step_order > v_enrollment.current_step
    ORDER BY step_order
    LIMIT 1;

    IF FOUND THEN
        UPDATE drip_campaign_enrollments
        SET
            current_step = v_next_step.step_order,
            next_message_at = NOW() + (v_next_step.delay_hours || ' hours')::INTERVAL
        WHERE id = p_enrollment_id;
    ELSE
        UPDATE drip_campaign_enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE id = p_enrollment_id;
    END IF;
END;
$$;

-- Fix accept_team_invitation function
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT * INTO v_invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    -- Update user's organization
    UPDATE profiles
    SET
        organization_id = v_invitation.organization_id,
        role = v_invitation.role
    WHERE id = v_user_id;

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

-- Fix track_message_delivery function
CREATE OR REPLACE FUNCTION public.track_message_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        NEW.delivered_at := NOW();
    END IF;
    IF NEW.status = 'read' AND OLD.status != 'read' THEN
        NEW.read_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_agent_capacity_updated_at function
CREATE OR REPLACE FUNCTION public.update_agent_capacity_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_routing_rules_updated_at function
CREATE OR REPLACE FUNCTION public.update_routing_rules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_conversation_queue_updated_at function
CREATE OR REPLACE FUNCTION public.update_conversation_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_crm_updated_at function
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix get_crm_connection_status function
CREATE OR REPLACE FUNCTION public.get_crm_connection_status(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_connection RECORD;
BEGIN
    SELECT * INTO v_connection
    FROM crm_connections
    WHERE organization_id = p_organization_id
    AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('connected', false);
    END IF;

    RETURN jsonb_build_object(
        'connected', true,
        'provider', v_connection.provider,
        'last_sync_at', v_connection.last_sync_at
    );
END;
$$;

-- Fix detect_sync_conflicts function
CREATE OR REPLACE FUNCTION public.detect_sync_conflicts(p_organization_id UUID)
RETURNS TABLE (
    contact_id UUID,
    field_name TEXT,
    local_value TEXT,
    remote_value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.contact_id,
        cm.field_name,
        cm.local_value,
        cm.remote_value
    FROM crm_sync_conflicts cm
    JOIN contacts c ON cm.contact_id = c.id
    WHERE c.organization_id = p_organization_id
    AND cm.resolved_at IS NULL;
END;
$$;

-- Fix cleanup_old_sync_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM crm_sync_logs
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix get_conversation_unread_count function
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND sender_type = 'contact'
    AND read_at IS NULL;

    RETURN v_count;
END;
$$;

-- =====================================================
-- PART 6: GRANTS
-- =====================================================

-- Grant access to new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_message_jobs TO authenticated;
GRANT SELECT, INSERT ON web_vitals_tracking TO authenticated;
GRANT SELECT ON web_vitals_tracking TO anon;
GRANT INSERT ON web_vitals_tracking TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.log_invitation_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_api_key_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_ai_usage_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_budget TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_business_hours TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workflow_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_logo_url TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_lead_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_available_licenses TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_next_drip_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_connection_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_sync_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sync_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_old_invitations TO authenticated;

-- =====================================================
-- PART 7: UPDATE TRIGGERS FOR NEW TABLES
-- =====================================================

DROP TRIGGER IF EXISTS set_bulk_campaigns_updated_at ON bulk_campaigns;
CREATE TRIGGER set_bulk_campaigns_updated_at
    BEFORE UPDATE ON bulk_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_bulk_message_jobs_updated_at ON bulk_message_jobs;
CREATE TRIGGER set_bulk_message_jobs_updated_at
    BEFORE UPDATE ON bulk_message_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
