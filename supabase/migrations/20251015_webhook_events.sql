-- =====================================================
-- Webhook Events Migration (S-003: Webhook Idempotency)
-- =====================================================
-- Description: Creates tables and policies for tracking Stripe webhook events
--              to ensure idempotent processing and prevent duplicate operations.
-- Security: CVSS 6.0 - Prevents duplicate webhook processing
-- =====================================================

-- Create webhook_events table for idempotency tracking
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE, -- Stripe's event ID (idempotency key)
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Processing status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Audit trail
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processing_duration_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by Stripe event ID (idempotency checks)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id
  ON webhook_events(stripe_event_id);

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON webhook_events(status);

-- Create index for event type queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type
  ON webhook_events(event_type);

-- Create index for failed events that need retry
CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_retry
  ON webhook_events(status, retry_count, failed_at)
  WHERE status = 'failed' AND retry_count < max_retries;

-- Create index for processing time queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON webhook_events(processed_at DESC);

-- Create table for webhook processing errors (detailed logging)
CREATE TABLE IF NOT EXISTS webhook_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,

  -- Error details
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_context JSONB DEFAULT '{}'::jsonb,

  -- Retry information
  retry_attempt INTEGER NOT NULL DEFAULT 1,
  will_retry BOOLEAN NOT NULL DEFAULT true,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for webhook error lookups
CREATE INDEX IF NOT EXISTS idx_webhook_processing_errors_webhook_event_id
  ON webhook_processing_errors(webhook_event_id);

-- Create index for retry scheduling
CREATE INDEX IF NOT EXISTS idx_webhook_processing_errors_retry
  ON webhook_processing_errors(will_retry, next_retry_at)
  WHERE will_retry = true AND next_retry_at IS NOT NULL;

-- Create webhook event statistics view for monitoring
CREATE OR REPLACE VIEW webhook_event_stats AS
SELECT
  event_type,
  status,
  COUNT(*) as event_count,
  AVG(processing_duration_ms) as avg_processing_time_ms,
  MAX(processing_duration_ms) as max_processing_time_ms,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  MAX(processed_at) as last_processed_at
FROM webhook_events
WHERE processed_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, status;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_webhook_events_updated_at ON webhook_events;
CREATE TRIGGER trigger_update_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_updated_at();

-- Function to mark event as processing (atomic operation)
CREATE OR REPLACE FUNCTION mark_webhook_event_processing(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Try to insert new event or get existing
  INSERT INTO webhook_events (
    stripe_event_id,
    event_type,
    event_data,
    status,
    processing_started_at,
    signature_verified
  )
  VALUES (
    p_stripe_event_id,
    p_event_type,
    p_event_data,
    'processing',
    NOW(),
    true
  )
  ON CONFLICT (stripe_event_id) DO UPDATE
  SET
    status = CASE
      WHEN webhook_events.status = 'completed' THEN 'completed'
      WHEN webhook_events.status = 'processing' THEN 'processing'
      ELSE 'processing'
    END,
    processing_started_at = CASE
      WHEN webhook_events.status NOT IN ('completed', 'processing') THEN NOW()
      ELSE webhook_events.processing_started_at
    END
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark event as completed
CREATE OR REPLACE FUNCTION mark_webhook_event_completed(
  p_event_id UUID,
  p_processing_duration_ms INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_events
  SET
    status = 'completed',
    processed_at = NOW(),
    processing_duration_ms = p_processing_duration_ms,
    error_message = NULL,
    error_details = NULL
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark event as failed
CREATE OR REPLACE FUNCTION mark_webhook_event_failed(
  p_event_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  -- Update event status
  UPDATE webhook_events
  SET
    status = 'failed',
    failed_at = NOW(),
    retry_count = retry_count + 1,
    error_message = p_error_message,
    error_details = p_error_details
  WHERE id = p_event_id
  RETURNING retry_count, max_retries INTO v_retry_count, v_max_retries;

  -- Log the error
  INSERT INTO webhook_processing_errors (
    webhook_event_id,
    error_type = 'PROCESSING_ERROR',
    error_message,
    error_context,
    retry_attempt,
    will_retry,
    next_retry_at
  )
  VALUES (
    p_event_id,
    'PROCESSING_ERROR',
    p_error_message,
    p_error_details,
    v_retry_count,
    v_retry_count < v_max_retries,
    CASE
      WHEN v_retry_count < v_max_retries
      THEN NOW() + (INTERVAL '1 minute' * POWER(2, v_retry_count)) -- Exponential backoff
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if event is already processed (idempotency check)
CREATE OR REPLACE FUNCTION is_webhook_event_processed(p_stripe_event_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM webhook_events
  WHERE stripe_event_id = p_stripe_event_id;

  -- Event is processed if it's completed or currently processing
  RETURN v_status IN ('completed', 'processing');
END;
$$ LANGUAGE plpgsql;

-- Function to get events that need retry
CREATE OR REPLACE FUNCTION get_webhook_events_for_retry()
RETURNS TABLE (
  event_id UUID,
  stripe_event_id TEXT,
  event_type TEXT,
  event_data JSONB,
  retry_count INTEGER,
  last_error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    we.id,
    we.stripe_event_id,
    we.event_type,
    we.event_data,
    we.retry_count,
    we.error_message
  FROM webhook_events we
  WHERE we.status = 'failed'
    AND we.retry_count < we.max_retries
    AND we.failed_at < NOW() - (INTERVAL '1 minute' * POWER(2, we.retry_count))
  ORDER BY we.failed_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old completed webhook events (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE status = 'completed'
    AND processed_at < NOW() - (INTERVAL '1 day' * p_retention_days)
  RETURNING count(*) INTO v_deleted_count;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
-- Note: Webhook events are system-level data, accessible only via service role

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_processing_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to webhook_events" ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to webhook_processing_errors" ON webhook_processing_errors
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Super admins can view webhook events for debugging
CREATE POLICY "Super admins can view webhook_events" ON webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view webhook_processing_errors" ON webhook_processing_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_processing_errors TO service_role;
GRANT SELECT ON webhook_event_stats TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_event_processing(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_event_completed(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_event_failed(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION is_webhook_event_processed(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_webhook_events_for_retry() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events(INTEGER) TO service_role;

-- Comments for documentation
COMMENT ON TABLE webhook_events IS 'Tracks all Stripe webhook events for idempotent processing and audit trail';
COMMENT ON COLUMN webhook_events.stripe_event_id IS 'Unique Stripe event ID used as idempotency key';
COMMENT ON COLUMN webhook_events.status IS 'Current processing status: pending, processing, completed, failed';
COMMENT ON COLUMN webhook_events.retry_count IS 'Number of retry attempts for failed events';
COMMENT ON COLUMN webhook_events.processing_duration_ms IS 'Time taken to process the event in milliseconds';
COMMENT ON FUNCTION mark_webhook_event_processing IS 'Atomically marks event as processing, preventing duplicate processing';
COMMENT ON FUNCTION is_webhook_event_processed IS 'Checks if event has already been processed (idempotency check)';
COMMENT ON VIEW webhook_event_stats IS 'Aggregated statistics for webhook event monitoring';
