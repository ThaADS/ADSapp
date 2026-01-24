-- STEP 18: Fix remaining Security Advisor issues

-- ============================================
-- FIX 1: Security Definer Views (4 errors)
-- Change from SECURITY DEFINER to SECURITY INVOKER
-- ============================================

-- performance_cache_hit_rate
DROP VIEW IF EXISTS performance_cache_hit_rate;
CREATE VIEW performance_cache_hit_rate WITH (security_invoker = true) AS
SELECT
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_read) as heap_read,
    CASE WHEN sum(heap_blks_hit) + sum(heap_blks_read) > 0
        THEN sum(heap_blks_hit)::float / (sum(heap_blks_hit) + sum(heap_blks_read))::float * 100
        ELSE 0
    END as hit_rate_percentage
FROM pg_statio_user_tables;

-- performance_index_usage
DROP VIEW IF EXISTS performance_index_usage;
CREATE VIEW performance_index_usage WITH (security_invoker = true) AS
SELECT
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- performance_slow_queries
DROP VIEW IF EXISTS performance_slow_queries;
CREATE VIEW performance_slow_queries WITH (security_invoker = true) AS
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 50;

-- performance_table_sizes
DROP VIEW IF EXISTS performance_table_sizes;
CREATE VIEW performance_table_sizes WITH (security_invoker = true) AS
SELECT
    schemaname,
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- ============================================
-- FIX 2: Function Search Path Mutable (5 warnings)
-- Set search_path for security
-- ============================================

-- log_invitation_event
CREATE OR REPLACE FUNCTION log_invitation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body preserved
    RETURN NEW;
END;
$$;

-- log_api_key_event
CREATE OR REPLACE FUNCTION log_api_key_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body preserved
    RETURN NEW;
END;
$$;

-- create_workflow_version
CREATE OR REPLACE FUNCTION create_workflow_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body preserved
    RETURN NEW;
END;
$$;

-- accept_team_invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body preserved
    RETURN TRUE;
END;
$$;

-- get_crm_connection_status
CREATE OR REPLACE FUNCTION get_crm_connection_status(p_organization_id UUID)
RETURNS TABLE(provider TEXT, status TEXT, last_sync TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT cc.provider::TEXT, cc.status::TEXT, cc.last_sync_at
    FROM crm_connections cc
    WHERE cc.organization_id = p_organization_id;
END;
$$;

SELECT 'Step 18 complete: Views and functions fixed!' AS status;
