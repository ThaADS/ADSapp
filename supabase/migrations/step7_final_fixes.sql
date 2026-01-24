-- STEP 7: Final fixes for remaining Security Advisor issues
-- 4 Errors: Security Definer Views still showing
-- 5 Warnings: Functions still without search_path

-- ============================================
-- PART 1: Force recreate views with SECURITY INVOKER
-- ============================================

-- Drop with CASCADE to remove any dependencies
DROP VIEW IF EXISTS public.performance_cache_hit_rate CASCADE;
DROP VIEW IF EXISTS public.performance_index_usage CASCADE;
DROP VIEW IF EXISTS public.performance_slow_queries CASCADE;
DROP VIEW IF EXISTS public.performance_table_sizes CASCADE;

-- Recreate with explicit SECURITY INVOKER (default but being explicit)
CREATE VIEW public.performance_index_usage
WITH (security_invoker = true) AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

CREATE VIEW public.performance_cache_hit_rate
WITH (security_invoker = true) AS
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

-- Check if pg_stat_statements exists before creating slow_queries view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        EXECUTE $v$
            CREATE VIEW public.performance_slow_queries
            WITH (security_invoker = true) AS
            SELECT query, calls, total_exec_time, mean_exec_time, rows
            FROM pg_stat_statements
            WHERE mean_exec_time > 100
            ORDER BY mean_exec_time DESC
            LIMIT 20
        $v$;
    ELSE
        EXECUTE $v$
            CREATE VIEW public.performance_slow_queries
            WITH (security_invoker = true) AS
            SELECT ''::text as query, 0::bigint as calls,
                   0::double precision as total_exec_time,
                   0::double precision as mean_exec_time,
                   0::bigint as rows
            WHERE false
        $v$;
    END IF;
END $$;

CREATE VIEW public.performance_table_sizes
WITH (security_invoker = true) AS
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
-- PART 2: Force recreate remaining functions
-- ============================================

-- Drop the functions that still have issues
DROP FUNCTION IF EXISTS public.log_invitation_event(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB);
DROP FUNCTION IF EXISTS public.log_api_key_event(UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.create_workflow_version(UUID, JSONB);
DROP FUNCTION IF EXISTS public.accept_team_invitation(VARCHAR);
DROP FUNCTION IF EXISTS public.get_crm_connection_status(UUID);

-- Recreate with search_path
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
    INSERT INTO invitation_audit_log (invitation_id, event_type, old_status, new_status, performed_by, metadata)
    VALUES (p_invitation_id, p_event_type, p_old_status, p_new_status, COALESCE(p_performed_by, auth.uid()), p_metadata);
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

    UPDATE profiles
    SET organization_id = v_invitation.organization_id, role = v_invitation.role
    WHERE id = v_user_id;

    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

CREATE FUNCTION public.get_crm_connection_status(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_connection RECORD;
BEGIN
    SELECT * INTO v_connection FROM crm_connections
    WHERE organization_id = p_organization_id AND status = 'active' LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('connected', false);
    END IF;

    RETURN jsonb_build_object(
        'connected', true,
        'provider', v_connection.provider,
        'last_sync_at', v_connection.last_sync_at
    );
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('connected', false);
END;
$$;

SELECT 'Step 7 complete: Final security fixes applied!' AS status;
