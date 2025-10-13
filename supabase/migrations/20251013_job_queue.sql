-- Job Queue System Database Migration
-- Date: 2025-10-13
-- Purpose: Create tables for BullMQ job tracking and history

-- =====================================================
-- Job Logs Table
-- =====================================================
-- Stores persistent job execution history and results
-- Used for monitoring, debugging, and analytics

CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL, -- BullMQ job ID
  job_type TEXT NOT NULL, -- bulk_message, contact_import, template_processing, email_notification
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- completed, failed, partial_success, partial_failure
  result JSONB, -- Job result data (success/failure counts, etc.)
  error_details JSONB, -- Error information if failed
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_job_logs_organization_id ON job_logs(organization_id);
CREATE INDEX idx_job_logs_user_id ON job_logs(user_id);
CREATE INDEX idx_job_logs_job_type ON job_logs(job_type);
CREATE INDEX idx_job_logs_status ON job_logs(status);
CREATE INDEX idx_job_logs_created_at ON job_logs(created_at DESC);
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);

-- Composite indexes for common queries
CREATE INDEX idx_job_logs_org_type_status ON job_logs(organization_id, job_type, status);
CREATE INDEX idx_job_logs_org_created ON job_logs(organization_id, created_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see job logs for their organization
CREATE POLICY job_logs_select_policy ON job_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Only the user who created the job or admins can insert logs
CREATE POLICY job_logs_insert_policy ON job_logs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_logs.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- Admins can update job logs
CREATE POLICY job_logs_update_policy ON job_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_logs.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- Admins can delete job logs
CREATE POLICY job_logs_delete_policy ON job_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_logs.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Job Schedules Table (Optional)
-- =====================================================
-- Stores scheduled/recurring jobs
-- Used for campaigns and automated messaging

CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_name TEXT NOT NULL,
  job_data JSONB NOT NULL, -- Job configuration
  schedule_type TEXT NOT NULL, -- once, recurring, cron
  schedule_config JSONB NOT NULL, -- Schedule configuration (time, frequency, etc.)
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job schedules
CREATE INDEX idx_job_schedules_organization_id ON job_schedules(organization_id);
CREATE INDEX idx_job_schedules_next_run_at ON job_schedules(next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_job_schedules_is_active ON job_schedules(is_active);

-- RLS for job schedules
ALTER TABLE job_schedules ENABLE ROW LEVEL SECURITY;

-- Users can only see schedules for their organization
CREATE POLICY job_schedules_select_policy ON job_schedules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Only admins can manage schedules
CREATE POLICY job_schedules_insert_policy ON job_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_schedules.organization_id
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY job_schedules_update_policy ON job_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_schedules.organization_id
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY job_schedules_delete_policy ON job_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = job_schedules.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Updated_at Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_logs_updated_at
  BEFORE UPDATE ON job_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_schedules_updated_at
  BEFORE UPDATE ON job_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get job statistics for an organization
CREATE OR REPLACE FUNCTION get_organization_job_stats(org_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  job_type TEXT,
  total_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  avg_duration_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jl.job_type,
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE jl.status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE jl.status = 'failed') as failed_jobs,
    AVG(EXTRACT(EPOCH FROM (jl.completed_at - jl.started_at)) * 1000)::NUMERIC as avg_duration_ms
  FROM job_logs jl
  WHERE
    jl.organization_id = org_id
    AND jl.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY jl.job_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old job logs
CREATE OR REPLACE FUNCTION cleanup_old_job_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE job_logs IS 'Persistent storage for BullMQ job execution history and results';
COMMENT ON TABLE job_schedules IS 'Scheduled and recurring job configurations';
COMMENT ON COLUMN job_logs.job_id IS 'BullMQ job identifier';
COMMENT ON COLUMN job_logs.job_type IS 'Type of job: bulk_message, contact_import, template_processing, email_notification';
COMMENT ON COLUMN job_logs.status IS 'Job execution status: completed, failed, partial_success, partial_failure';
COMMENT ON COLUMN job_logs.result IS 'JSONB containing job result data (counts, IDs, etc.)';
COMMENT ON COLUMN job_logs.error_details IS 'JSONB containing error information if job failed';
COMMENT ON FUNCTION get_organization_job_stats IS 'Calculate job statistics for an organization over a time period';
COMMENT ON FUNCTION cleanup_old_job_logs IS 'Remove job logs older than specified number of days';
