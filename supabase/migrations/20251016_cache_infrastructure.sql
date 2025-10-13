/**
 * Cache Infrastructure Migration
 *
 * Creates database tables and functions for cache analytics and monitoring
 * - cache_metadata: Track cache performance metrics
 * - cache_invalidation_logs: Log cache invalidation events
 * - cache_stats_daily: Aggregated daily statistics
 * - Helper functions for cache management
 */

-- =====================================================
-- Cache Metadata Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cache_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    last_miss_at TIMESTAMPTZ,
    average_latency_ms NUMERIC(10, 2),
    total_requests INTEGER DEFAULT 0,
    cache_size_bytes INTEGER DEFAULT 0,
    ttl_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_counts CHECK (hit_count >= 0 AND miss_count >= 0),
    CONSTRAINT valid_latency CHECK (average_latency_ms >= 0)
);

-- Indexes for cache_metadata
CREATE INDEX idx_cache_metadata_tenant ON public.cache_metadata(tenant_id);
CREATE INDEX idx_cache_metadata_resource ON public.cache_metadata(resource_type);
CREATE INDEX idx_cache_metadata_key ON public.cache_metadata(cache_key);
CREATE INDEX idx_cache_metadata_updated ON public.cache_metadata(updated_at DESC);

-- =====================================================
-- Cache Invalidation Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cache_invalidation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'manual')),
    keys_invalidated INTEGER DEFAULT 0,
    cascade_invalidated BOOLEAN DEFAULT FALSE,
    related_resources TEXT[],
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_keys_count CHECK (keys_invalidated >= 0)
);

-- Indexes for cache_invalidation_logs
CREATE INDEX idx_cache_invalidation_tenant ON public.cache_invalidation_logs(tenant_id);
CREATE INDEX idx_cache_invalidation_resource ON public.cache_invalidation_logs(resource_type);
CREATE INDEX idx_cache_invalidation_created ON public.cache_invalidation_logs(created_at DESC);

-- =====================================================
-- Cache Statistics Daily Aggregation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cache_stats_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    total_hits INTEGER DEFAULT 0,
    total_misses INTEGER DEFAULT 0,
    hit_rate_percentage NUMERIC(5, 2),
    average_latency_ms NUMERIC(10, 2),
    l1_hits INTEGER DEFAULT 0,
    l2_hits INTEGER DEFAULT 0,
    l3_hits INTEGER DEFAULT 0,
    total_invalidations INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_tenant_date UNIQUE(tenant_id, date),
    CONSTRAINT valid_hit_rate CHECK (hit_rate_percentage >= 0 AND hit_rate_percentage <= 100)
);

-- Indexes for cache_stats_daily
CREATE INDEX idx_cache_stats_daily_tenant ON public.cache_stats_daily(tenant_id);
CREATE INDEX idx_cache_stats_daily_date ON public.cache_stats_daily(date DESC);

-- =====================================================
-- Cache Performance View
-- =====================================================
CREATE OR REPLACE VIEW public.cache_performance_view AS
SELECT
    cm.tenant_id,
    cm.resource_type,
    COUNT(*) as total_keys,
    SUM(cm.hit_count) as total_hits,
    SUM(cm.miss_count) as total_misses,
    CASE
        WHEN SUM(cm.hit_count + cm.miss_count) > 0
        THEN ROUND((SUM(cm.hit_count)::NUMERIC / SUM(cm.hit_count + cm.miss_count)) * 100, 2)
        ELSE 0
    END as hit_rate_percentage,
    AVG(cm.average_latency_ms) as avg_latency_ms,
    SUM(cm.cache_size_bytes) as total_cache_size_bytes,
    MAX(cm.updated_at) as last_updated
FROM public.cache_metadata cm
GROUP BY cm.tenant_id, cm.resource_type;

-- =====================================================
-- Function: Update Cache Metadata
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_cache_metadata(
    p_tenant_id UUID,
    p_resource_type TEXT,
    p_cache_key TEXT,
    p_hit BOOLEAN,
    p_latency_ms NUMERIC,
    p_size_bytes INTEGER DEFAULT NULL,
    p_ttl_seconds INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_existing_record RECORD;
BEGIN
    -- Get existing record
    SELECT * INTO v_existing_record
    FROM public.cache_metadata
    WHERE tenant_id = p_tenant_id
      AND resource_type = p_resource_type
      AND cache_key = p_cache_key;

    IF FOUND THEN
        -- Update existing record
        UPDATE public.cache_metadata
        SET
            hit_count = CASE WHEN p_hit THEN hit_count + 1 ELSE hit_count END,
            miss_count = CASE WHEN NOT p_hit THEN miss_count + 1 ELSE miss_count END,
            last_hit_at = CASE WHEN p_hit THEN NOW() ELSE last_hit_at END,
            last_miss_at = CASE WHEN NOT p_hit THEN NOW() ELSE last_miss_at END,
            average_latency_ms = (
                (average_latency_ms * total_requests + p_latency_ms) /
                (total_requests + 1)
            ),
            total_requests = total_requests + 1,
            cache_size_bytes = COALESCE(p_size_bytes, cache_size_bytes),
            ttl_seconds = COALESCE(p_ttl_seconds, ttl_seconds),
            updated_at = NOW()
        WHERE tenant_id = p_tenant_id
          AND resource_type = p_resource_type
          AND cache_key = p_cache_key;
    ELSE
        -- Insert new record
        INSERT INTO public.cache_metadata (
            tenant_id,
            resource_type,
            cache_key,
            hit_count,
            miss_count,
            last_hit_at,
            last_miss_at,
            average_latency_ms,
            total_requests,
            cache_size_bytes,
            ttl_seconds
        ) VALUES (
            p_tenant_id,
            p_resource_type,
            p_cache_key,
            CASE WHEN p_hit THEN 1 ELSE 0 END,
            CASE WHEN NOT p_hit THEN 1 ELSE 0 END,
            CASE WHEN p_hit THEN NOW() ELSE NULL END,
            CASE WHEN NOT p_hit THEN NOW() ELSE NULL END,
            p_latency_ms,
            1,
            COALESCE(p_size_bytes, 0),
            p_ttl_seconds
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: Log Cache Invalidation
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_cache_invalidation(
    p_tenant_id UUID,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_operation TEXT DEFAULT 'manual',
    p_keys_invalidated INTEGER DEFAULT 1,
    p_cascade BOOLEAN DEFAULT FALSE,
    p_related_resources TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_triggered_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.cache_invalidation_logs (
        tenant_id,
        resource_type,
        resource_id,
        operation,
        keys_invalidated,
        cascade_invalidated,
        related_resources,
        triggered_by,
        metadata
    ) VALUES (
        p_tenant_id,
        p_resource_type,
        p_resource_id,
        p_operation,
        p_keys_invalidated,
        p_cascade,
        p_related_resources,
        COALESCE(p_triggered_by, auth.uid()),
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: Aggregate Daily Cache Stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.aggregate_cache_stats_daily()
RETURNS VOID AS $$
BEGIN
    -- Aggregate yesterday's statistics
    INSERT INTO public.cache_stats_daily (
        tenant_id,
        date,
        total_requests,
        total_hits,
        total_misses,
        hit_rate_percentage,
        average_latency_ms,
        total_invalidations
    )
    SELECT
        cm.tenant_id,
        CURRENT_DATE - INTERVAL '1 day' as date,
        SUM(cm.total_requests) as total_requests,
        SUM(cm.hit_count) as total_hits,
        SUM(cm.miss_count) as total_misses,
        CASE
            WHEN SUM(cm.hit_count + cm.miss_count) > 0
            THEN ROUND((SUM(cm.hit_count)::NUMERIC / SUM(cm.hit_count + cm.miss_count)) * 100, 2)
            ELSE 0
        END as hit_rate_percentage,
        AVG(cm.average_latency_ms) as average_latency_ms,
        COUNT(cil.id) as total_invalidations
    FROM public.cache_metadata cm
    LEFT JOIN public.cache_invalidation_logs cil
        ON cil.tenant_id = cm.tenant_id
        AND DATE(cil.created_at) = CURRENT_DATE - INTERVAL '1 day'
    WHERE DATE(cm.updated_at) >= CURRENT_DATE - INTERVAL '1 day'
    GROUP BY cm.tenant_id
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_hits = EXCLUDED.total_hits,
        total_misses = EXCLUDED.total_misses,
        hit_rate_percentage = EXCLUDED.hit_rate_percentage,
        average_latency_ms = EXCLUDED.average_latency_ms,
        total_invalidations = EXCLUDED.total_invalidations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: Get Cache Health Report
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cache_health_report(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_report JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tenant_id', p_tenant_id,
        'overall_hit_rate', COALESCE(
            ROUND((SUM(hit_count)::NUMERIC / NULLIF(SUM(hit_count + miss_count), 0)) * 100, 2),
            0
        ),
        'total_cache_keys', COUNT(*),
        'average_latency_ms', COALESCE(ROUND(AVG(average_latency_ms), 2), 0),
        'total_requests_24h', SUM(CASE
            WHEN updated_at >= NOW() - INTERVAL '24 hours'
            THEN total_requests
            ELSE 0
        END),
        'cache_size_mb', COALESCE(ROUND(SUM(cache_size_bytes)::NUMERIC / 1048576, 2), 0),
        'top_resources', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'resource_type', resource_type,
                    'hit_rate', ROUND((SUM(hit_count)::NUMERIC / NULLIF(SUM(hit_count + miss_count), 0)) * 100, 2),
                    'requests', SUM(total_requests)
                )
            )
            FROM (
                SELECT
                    resource_type,
                    SUM(hit_count) as hit_count,
                    SUM(miss_count) as miss_count,
                    SUM(total_requests) as total_requests
                FROM public.cache_metadata
                WHERE tenant_id = p_tenant_id
                GROUP BY resource_type
                ORDER BY SUM(total_requests) DESC
                LIMIT 10
            ) top
        )
    ) INTO v_report
    FROM public.cache_metadata
    WHERE tenant_id = p_tenant_id;

    RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on cache_metadata
ALTER TABLE public.cache_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY cache_metadata_tenant_isolation ON public.cache_metadata
    FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on cache_invalidation_logs
ALTER TABLE public.cache_invalidation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cache_invalidation_tenant_isolation ON public.cache_invalidation_logs
    FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on cache_stats_daily
ALTER TABLE public.cache_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY cache_stats_tenant_isolation ON public.cache_stats_daily
    FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE public.cache_metadata IS 'Tracks cache performance metrics per cache key';
COMMENT ON TABLE public.cache_invalidation_logs IS 'Logs all cache invalidation events for audit and analysis';
COMMENT ON TABLE public.cache_stats_daily IS 'Daily aggregated cache statistics for long-term analysis';
COMMENT ON FUNCTION public.update_cache_metadata IS 'Updates cache metadata for a specific cache key';
COMMENT ON FUNCTION public.log_cache_invalidation IS 'Logs a cache invalidation event';
COMMENT ON FUNCTION public.aggregate_cache_stats_daily IS 'Aggregates daily cache statistics (run via cron)';
COMMENT ON FUNCTION public.get_cache_health_report IS 'Generates a comprehensive cache health report for a tenant';
