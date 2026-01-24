-- STEP 4 CONTINUE: Continue from validate_business_hours
-- Run this if previous execution failed partway through

-- validate_business_hours: Drop constraint first, then function, then recreate both
ALTER TABLE IF EXISTS organizations DROP CONSTRAINT IF EXISTS valid_business_hours_format;

DROP FUNCTION IF EXISTS public.validate_business_hours(JSONB);

CREATE FUNCTION public.validate_business_hours(p_hours JSONB)
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

-- Recreate the constraint
ALTER TABLE organizations ADD CONSTRAINT valid_business_hours_format
    CHECK (validate_business_hours(business_hours));

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

-- Fix update_workflow_stats function
CREATE OR REPLACE FUNCTION public.update_workflow_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Drop and recreate get_organization_logo_url
DROP FUNCTION IF EXISTS public.get_organization_logo_url(UUID);

CREATE FUNCTION public.get_organization_logo_url(p_organization_id UUID)
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

-- Drop and recreate accept_team_invitation
DROP FUNCTION IF EXISTS public.accept_team_invitation(VARCHAR);

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

    SELECT * INTO v_invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    UPDATE profiles
    SET
        organization_id = v_invitation.organization_id,
        role = v_invitation.role
    WHERE id = v_user_id;

    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

-- Conditional functions (only if tables exist)

-- create_workflow_version
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_versions') THEN
        DROP FUNCTION IF EXISTS public.create_workflow_version(UUID, JSONB);
        EXECUTE $ex$
            CREATE FUNCTION public.create_workflow_version(
                p_workflow_id UUID,
                p_changes JSONB DEFAULT '{}'
            )
            RETURNS UUID
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
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
            $func$
        $ex$;
    END IF;
END $$;

-- get_crm_connection_status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_connections') THEN
        DROP FUNCTION IF EXISTS public.get_crm_connection_status(UUID);
        EXECUTE $ex$
            CREATE FUNCTION public.get_crm_connection_status(p_organization_id UUID)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
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
            $func$
        $ex$;
    END IF;
END $$;

-- cleanup_old_sync_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_sync_logs') THEN
        DROP FUNCTION IF EXISTS public.cleanup_old_sync_logs(INTEGER);
        EXECUTE $ex$
            CREATE FUNCTION public.cleanup_old_sync_logs(p_days INTEGER DEFAULT 30)
            RETURNS INTEGER
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
            DECLARE
                v_deleted INTEGER;
            BEGIN
                DELETE FROM crm_sync_logs
                WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;

                GET DIAGNOSTICS v_deleted = ROW_COUNT;
                RETURN v_deleted;
            END;
            $func$
        $ex$;
    END IF;
END $$;

-- detect_sync_conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_sync_conflicts') THEN
        DROP FUNCTION IF EXISTS public.detect_sync_conflicts(UUID);
        EXECUTE $ex$
            CREATE FUNCTION public.detect_sync_conflicts(p_organization_id UUID)
            RETURNS TABLE (
                contact_id UUID,
                field_name TEXT,
                local_value TEXT,
                remote_value TEXT
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
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
            $func$
        $ex$;
    END IF;
END $$;

-- update_drip_campaign_statistics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drip_campaigns') THEN
        EXECUTE $ex$
            CREATE OR REPLACE FUNCTION public.update_drip_campaign_statistics()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
            BEGIN
                IF TG_TABLE_NAME = 'drip_campaign_enrollments' THEN
                    UPDATE drip_campaigns
                    SET
                        total_enrolled = (SELECT COUNT(*) FROM drip_campaign_enrollments WHERE campaign_id = NEW.campaign_id),
                        updated_at = NOW()
                    WHERE id = NEW.campaign_id;
                END IF;
                RETURN NEW;
            END;
            $func$
        $ex$;
    END IF;
END $$;

-- schedule_next_drip_message
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drip_campaign_enrollments') THEN
        DROP FUNCTION IF EXISTS public.schedule_next_drip_message(UUID);
        EXECUTE $ex$
            CREATE FUNCTION public.schedule_next_drip_message(p_enrollment_id UUID)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
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
            $func$
        $ex$;
    END IF;
END $$;

-- log_invitation_event
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitation_audit_log') THEN
        DROP FUNCTION IF EXISTS public.log_invitation_event(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB);
        EXECUTE $ex$
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
            AS $func$
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
            $func$
        $ex$;
    END IF;
END $$;

-- log_api_key_event
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_logs') THEN
        DROP FUNCTION IF EXISTS public.log_api_key_event(UUID, VARCHAR, JSONB);
        EXECUTE $ex$
            CREATE FUNCTION public.log_api_key_event(
                p_api_key_id UUID,
                p_event_type VARCHAR,
                p_metadata JSONB DEFAULT '{}'
            )
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $func$
            BEGIN
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
                NULL;
            END;
            $func$
        $ex$;
    END IF;
END $$;

-- refresh_ai_usage_analytics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'ai_usage_analytics') THEN
        EXECUTE $ex$
            CREATE OR REPLACE FUNCTION public.refresh_ai_usage_analytics()
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
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

-- check_ai_budget
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_settings') THEN
        DROP FUNCTION IF EXISTS public.check_ai_budget(UUID);
        EXECUTE $ex$
            CREATE FUNCTION public.check_ai_budget(p_organization_id UUID)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
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
            $func$
        $ex$;
    END IF;
END $$;

SELECT 'All remaining function search_path fixes applied!' AS status;
