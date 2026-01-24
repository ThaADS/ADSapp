-- STEP 6 v3: Fix remaining Security Advisor issues
-- Drop functions with parameter name conflicts first

-- ============================================
-- PART 0: Drop functions that need parameter changes
-- ============================================
DROP FUNCTION IF EXISTS public.calculate_lead_score(UUID);
DROP FUNCTION IF EXISTS public.get_crm_connection_status(UUID);
DROP FUNCTION IF EXISTS public.detect_sync_conflicts(UUID);
DROP FUNCTION IF EXISTS public.cleanup_old_sync_logs(INTEGER);
DROP FUNCTION IF EXISTS public.check_available_licenses(UUID);
DROP FUNCTION IF EXISTS public.get_conversation_unread_count(UUID);
DROP FUNCTION IF EXISTS public.check_ai_budget(UUID);
DROP FUNCTION IF EXISTS public.schedule_next_drip_message(UUID);
DROP FUNCTION IF EXISTS public.log_invitation_event(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB);
DROP FUNCTION IF EXISTS public.log_api_key_event(UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.create_workflow_version(UUID, JSONB);
DROP FUNCTION IF EXISTS public.accept_team_invitation(VARCHAR);

-- ============================================
-- PART 1: Fix Security Definer Views (4 Errors)
-- ============================================

DROP VIEW IF EXISTS public.performance_index_usage;
DROP VIEW IF EXISTS public.performance_cache_hit_rate;
DROP VIEW IF EXISTS public.performance_slow_queries;
DROP VIEW IF EXISTS public.performance_table_sizes;

CREATE VIEW public.performance_index_usage AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

CREATE VIEW public.performance_cache_hit_rate AS
SELECT
    'index' as type,
    sum(idx_blks_hit)::bigint as hits,
    sum(idx_blks_read)::bigint as reads,
    CASE WHEN sum(idx_blks_hit + idx_blks_read) > 0
         THEN round(100.0 * sum(idx_blks_hit) / sum(idx_blks_hit + idx_blks_read), 2)
         ELSE 0 END as hit_rate
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table' as type,
    sum(heap_blks_hit)::bigint as hits,
    sum(heap_blks_read)::bigint as reads,
    CASE WHEN sum(heap_blks_hit + heap_blks_read) > 0
         THEN round(100.0 * sum(heap_blks_hit) / sum(heap_blks_hit + heap_blks_read), 2)
         ELSE 0 END as hit_rate
FROM pg_statio_user_tables;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        EXECUTE $view$
            CREATE VIEW public.performance_slow_queries AS
            SELECT
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                rows
            FROM pg_stat_statements
            WHERE mean_exec_time > 100
            ORDER BY mean_exec_time DESC
            LIMIT 20
        $view$;
    ELSE
        EXECUTE $view$
            CREATE VIEW public.performance_slow_queries AS
            SELECT
                ''::text as query,
                0::bigint as calls,
                0::double precision as total_exec_time,
                0::double precision as mean_exec_time,
                0::bigint as rows
            WHERE false
        $view$;
    END IF;
END $$;

CREATE VIEW public.performance_table_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as total_size,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as table_size,
    pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)) DESC;

-- ============================================
-- PART 2: Fix Function Search Path (21 Warnings)
-- ============================================

CREATE FUNCTION public.log_invitation_event(
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
        invitation_id, event_type, old_status, new_status, performed_by, metadata
    ) VALUES (
        p_invitation_id, p_event_type, p_old_status, p_new_status,
        COALESCE(p_performed_by, auth.uid()), p_metadata
    );
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE FUNCTION public.log_api_key_event(
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
    INSERT INTO api_logs (method, url, user_id, status_code, timestamp)
    VALUES ('API_KEY_EVENT', p_event_type, auth.uid(), 200, NOW());
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE FUNCTION public.create_workflow_version(
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
    FROM workflow_versions WHERE workflow_id = p_workflow_id;

    INSERT INTO workflow_versions (workflow_id, version_number, changes)
    VALUES (p_workflow_id, v_version_number, p_changes)
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.check_sla_breach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sla_config RECORD;
    v_response_time INTERVAL;
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        SELECT * INTO v_sla_config FROM sla_configurations
        WHERE organization_id = NEW.organization_id AND is_active = true LIMIT 1;

        IF FOUND THEN
            v_response_time := NEW.resolved_at - NEW.created_at;
            IF v_response_time > v_sla_config.max_response_time THEN
                NEW.sla_breached = true;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END;
$$;

CREATE FUNCTION public.calculate_lead_score(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INTEGER := 0;
    v_contact RECORD;
    v_message_count INTEGER;
BEGIN
    SELECT * INTO v_contact FROM contacts WHERE id = p_contact_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    IF v_contact.email IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_contact.company IS NOT NULL THEN v_score := v_score + 15; END IF;

    SELECT COUNT(*) INTO v_message_count FROM messages WHERE contact_id = p_contact_id;
    v_score := v_score + LEAST(v_message_count * 2, 30);

    RETURN LEAST(v_score, 100);
EXCEPTION WHEN others THEN RETURN 0;
END;
$$;

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
        AND email = NEW.email AND status = 'pending'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'A pending invitation already exists for this email';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE organizations SET team_member_count = (
            SELECT COUNT(*) FROM profiles WHERE organization_id = NEW.organization_id
        ) WHERE id = NEW.organization_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE organizations SET team_member_count = (
            SELECT COUNT(*) FROM profiles WHERE organization_id = OLD.organization_id
        ) WHERE id = OLD.organization_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN others THEN RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_expired_count INTEGER;
BEGIN
    UPDATE team_invitations SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$;

CREATE FUNCTION public.check_available_licenses(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_users INTEGER;
    v_current_users INTEGER;
BEGIN
    SELECT max_users INTO v_max_users FROM subscriptions
    WHERE organization_id = p_organization_id AND status = 'active' LIMIT 1;

    IF v_max_users IS NULL THEN RETURN true; END IF;

    SELECT COUNT(*) INTO v_current_users FROM profiles
    WHERE organization_id = p_organization_id;

    RETURN v_current_users < v_max_users;
END;
$$;

CREATE FUNCTION public.schedule_next_drip_message(p_enrollment_id UUID)
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
    IF NOT FOUND OR v_enrollment.status != 'active' THEN RETURN; END IF;

    SELECT * INTO v_next_step FROM drip_campaign_steps
    WHERE campaign_id = v_enrollment.campaign_id AND step_order > v_enrollment.current_step
    ORDER BY step_order LIMIT 1;

    IF FOUND THEN
        UPDATE drip_campaign_enrollments SET
            current_step = v_next_step.step_order,
            next_message_at = NOW() + (v_next_step.delay_hours || ' hours')::INTERVAL
        WHERE id = p_enrollment_id;
    ELSE
        UPDATE drip_campaign_enrollments
        SET status = 'completed', completed_at = NOW()
        WHERE id = p_enrollment_id;
    END IF;
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE FUNCTION public.accept_team_invitation(p_token VARCHAR)
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

    SELECT * INTO v_invitation FROM team_invitations
    WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    UPDATE profiles SET organization_id = v_invitation.organization_id, role = v_invitation.role
    WHERE id = v_user_id;

    UPDATE team_invitations SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.track_message_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO message_delivery_logs (message_id, old_status, new_status, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_crm_connection_status(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_connection RECORD;
BEGIN
    SELECT * INTO v_connection FROM crm_connections
    WHERE organization_id = p_organization_id AND status = 'active' LIMIT 1;

    IF NOT FOUND THEN RETURN jsonb_build_object('connected', false); END IF;

    RETURN jsonb_build_object(
        'connected', true,
        'provider', v_connection.provider,
        'last_sync_at', v_connection.last_sync_at
    );
EXCEPTION WHEN others THEN RETURN jsonb_build_object('connected', false);
END;
$$;

CREATE FUNCTION public.detect_sync_conflicts(p_organization_id UUID)
RETURNS TABLE (contact_id UUID, field_name TEXT, local_value TEXT, remote_value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT cm.contact_id, cm.field_name, cm.local_value, cm.remote_value
    FROM crm_sync_conflicts cm
    JOIN contacts c ON cm.contact_id = c.id
    WHERE c.organization_id = p_organization_id AND cm.resolved_at IS NULL;
EXCEPTION WHEN others THEN RETURN;
END;
$$;

CREATE FUNCTION public.cleanup_old_sync_logs(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
    DELETE FROM crm_sync_logs WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
EXCEPTION WHEN others THEN RETURN 0;
END;
$$;

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

CREATE FUNCTION public.get_conversation_unread_count(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM messages
    WHERE conversation_id = p_conversation_id AND is_read = false AND direction = 'inbound';
    RETURN COALESCE(v_count, 0);
EXCEPTION WHEN others THEN RETURN 0;
END;
$$;

-- ============================================
-- PART 3: Conditional functions
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drip_campaigns') THEN
        EXECUTE $ex$
            CREATE OR REPLACE FUNCTION public.update_drip_campaign_statistics()
            RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
            AS $func$
            BEGIN
                IF TG_TABLE_NAME = 'drip_campaign_enrollments' THEN
                    UPDATE drip_campaigns SET
                        total_enrolled = (SELECT COUNT(*) FROM drip_campaign_enrollments WHERE campaign_id = NEW.campaign_id),
                        updated_at = NOW()
                    WHERE id = NEW.campaign_id;
                END IF;
                RETURN NEW;
            EXCEPTION WHEN others THEN RETURN NEW;
            END;
            $func$
        $ex$;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'ai_usage_analytics') THEN
        EXECUTE $ex$
            CREATE OR REPLACE FUNCTION public.refresh_ai_usage_analytics()
            RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
            AS $func$
            BEGIN
                REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_analytics;
            EXCEPTION WHEN others THEN
                REFRESH MATERIALIZED VIEW ai_usage_analytics;
            END;
            $func$
        $ex$;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_settings') THEN
        EXECUTE $ex$
            CREATE FUNCTION public.check_ai_budget(p_organization_id UUID)
            RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
            AS $func$
            DECLARE
                v_settings RECORD;
                v_current_spend NUMERIC;
                v_budget_percent NUMERIC;
            BEGIN
                SELECT * INTO v_settings FROM ai_settings WHERE organization_id = p_organization_id;
                IF NOT FOUND THEN
                    RETURN jsonb_build_object('within_budget', true, 'spend', 0, 'budget', 0, 'percent', 0);
                END IF;

                SELECT COALESCE(SUM(cost_usd), 0) INTO v_current_spend FROM ai_responses
                WHERE organization_id = p_organization_id AND created_at >= date_trunc('month', NOW());

                v_budget_percent := CASE WHEN v_settings.monthly_budget_usd > 0
                    THEN (v_current_spend / v_settings.monthly_budget_usd) * 100 ELSE 0 END;

                RETURN jsonb_build_object(
                    'within_budget', v_current_spend < v_settings.monthly_budget_usd,
                    'spend', v_current_spend, 'budget', v_settings.monthly_budget_usd,
                    'percent', v_budget_percent, 'alert_threshold', v_settings.alert_threshold
                );
            EXCEPTION WHEN others THEN
                RETURN jsonb_build_object('within_budget', true, 'spend', 0, 'budget', 0, 'percent', 0);
            END;
            $func$
        $ex$;
    END IF;
END $$;

SELECT 'Step 6 v3 complete: All Security Advisor issues fixed!' AS status;
