-- Create web_vitals table for Core Web Vitals monitoring
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL CHECK (metric_name IN ('CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB')),
  metric_value NUMERIC NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  delta NUMERIC NOT NULL,
  metric_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT web_vitals_metric_name_idx CHECK (metric_name IS NOT NULL),
  CONSTRAINT web_vitals_created_at_idx CHECK (created_at IS NOT NULL)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON public.web_vitals(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON public.web_vitals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_rating ON public.web_vitals(rating);
CREATE INDEX IF NOT EXISTS idx_web_vitals_page_url ON public.web_vitals(page_url);
CREATE INDEX IF NOT EXISTS idx_web_vitals_organization_id ON public.web_vitals(organization_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_web_vitals_composite ON public.web_vitals(
  metric_name,
  created_at DESC,
  rating
);

-- Enable Row Level Security
ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for web_vitals

-- Admin users can see all web vitals
CREATE POLICY "Admin users can view all web vitals" ON public.web_vitals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Allow insert for authenticated users (for tracking)
CREATE POLICY "Authenticated users can insert web vitals" ON public.web_vitals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own organization's web vitals
CREATE POLICY "Users can view organization web vitals" ON public.web_vitals
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Create a function to aggregate web vitals metrics
CREATE OR REPLACE FUNCTION get_web_vitals_summary(
  p_organization_id UUID DEFAULT NULL,
  p_metric_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  metric_name TEXT,
  avg_value NUMERIC,
  p75_value NUMERIC,
  p95_value NUMERIC,
  good_count BIGINT,
  needs_improvement_count BIGINT,
  poor_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wv.metric_name,
    AVG(wv.metric_value)::NUMERIC AS avg_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY wv.metric_value)::NUMERIC AS p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.metric_value)::NUMERIC AS p95_value,
    COUNT(*) FILTER (WHERE wv.rating = 'good') AS good_count,
    COUNT(*) FILTER (WHERE wv.rating = 'needs-improvement') AS needs_improvement_count,
    COUNT(*) FILTER (WHERE wv.rating = 'poor') AS poor_count,
    COUNT(*) AS total_count
  FROM public.web_vitals wv
  WHERE
    wv.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_organization_id IS NULL OR wv.organization_id = p_organization_id)
    AND (p_metric_name IS NULL OR wv.metric_name = p_metric_name)
  GROUP BY wv.metric_name
  ORDER BY wv.metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_web_vitals_summary TO authenticated;

-- Create a view for easy web vitals monitoring
CREATE OR REPLACE VIEW web_vitals_dashboard AS
SELECT
  metric_name,
  DATE_TRUNC('hour', created_at) AS hour,
  AVG(metric_value) AS avg_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75_value,
  COUNT(*) FILTER (WHERE rating = 'good') AS good_count,
  COUNT(*) FILTER (WHERE rating = 'needs-improvement') AS needs_improvement_count,
  COUNT(*) FILTER (WHERE rating = 'poor') AS poor_count,
  COUNT(*) AS total_count
FROM public.web_vitals
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY metric_name, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, metric_name;

-- Grant select permission on view
GRANT SELECT ON web_vitals_dashboard TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.web_vitals IS 'Stores Core Web Vitals metrics for performance monitoring';
COMMENT ON COLUMN public.web_vitals.metric_name IS 'Web Vital metric name (CLS, FCP, FID, INP, LCP, TTFB)';
COMMENT ON COLUMN public.web_vitals.metric_value IS 'Metric value in milliseconds (or unitless for CLS)';
COMMENT ON COLUMN public.web_vitals.rating IS 'Performance rating: good, needs-improvement, or poor';
COMMENT ON COLUMN public.web_vitals.delta IS 'Change in metric value since last measurement';
COMMENT ON COLUMN public.web_vitals.metric_id IS 'Unique identifier for this specific metric instance';
COMMENT ON COLUMN public.web_vitals.page_url IS 'URL where the metric was measured';
COMMENT ON FUNCTION get_web_vitals_summary IS 'Aggregate web vitals metrics for analysis';
COMMENT ON VIEW web_vitals_dashboard IS 'Hourly aggregated web vitals for monitoring dashboard';
