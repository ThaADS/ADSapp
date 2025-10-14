-- =====================================================
-- API Versioning and Event Sourcing Migration
-- Phase 4 Week 25-26: Enterprise scalability
-- =====================================================

-- =====================================================
-- PART 1: EVENT SOURCING INFRASTRUCTURE
-- =====================================================

-- Event Store: Core table for all domain events
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_id UUID NOT NULL,
  aggregate_type TEXT NOT NULL, -- 'conversation', 'message', 'contact', 'template'
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Ensure version uniqueness per aggregate
  CONSTRAINT event_store_version_unique UNIQUE (aggregate_id, version),

  -- Validate event type format
  CONSTRAINT event_type_format CHECK (event_type ~ '^[A-Z][a-zA-Z]+$')
);

-- Indexes for event store performance
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, version);
CREATE INDEX idx_event_store_type ON event_store(aggregate_type, created_at);
CREATE INDEX idx_event_store_organization ON event_store(organization_id, created_at);
CREATE INDEX idx_event_store_event_type ON event_store(event_type);
CREATE INDEX idx_event_store_created_at ON event_store(created_at DESC);

-- Event Snapshots: Performance optimization for event replay
CREATE TABLE event_snapshots (
  aggregate_id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  state JSONB NOT NULL,
  version INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for snapshot queries
CREATE INDEX idx_event_snapshots_organization ON event_snapshots(organization_id);
CREATE INDEX idx_event_snapshots_type ON event_snapshots(aggregate_type);

-- Event Subscriptions: Webhook endpoints for event notifications
CREATE TABLE event_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_types TEXT[] NOT NULL, -- Array of event types to subscribe to
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  retry_policy JSONB DEFAULT '{
    "max_retries": 3,
    "retry_delay_seconds": 60,
    "exponential_backoff": true
  }'::jsonb,
  last_event_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event subscriptions
CREATE INDEX idx_event_subscriptions_organization ON event_subscriptions(organization_id);
CREATE INDEX idx_event_subscriptions_enabled ON event_subscriptions(enabled) WHERE enabled = true;

-- Event Delivery Log: Track webhook delivery attempts
CREATE TABLE event_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES event_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES event_store(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'cancelled')),
  http_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for delivery tracking
CREATE INDEX idx_event_delivery_subscription ON event_delivery_log(subscription_id, created_at DESC);
CREATE INDEX idx_event_delivery_status ON event_delivery_log(status, next_retry_at);
CREATE INDEX idx_event_delivery_event ON event_delivery_log(event_id);

-- Projections: Read models derived from events
CREATE TABLE event_projections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projection_name TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type TEXT NOT NULL,
  projection_data JSONB NOT NULL,
  last_event_version INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_projections_unique UNIQUE (projection_name, aggregate_id)
);

-- Indexes for projections
CREATE INDEX idx_event_projections_name ON event_projections(projection_name, organization_id);
CREATE INDEX idx_event_projections_aggregate ON event_projections(aggregate_id);

-- =====================================================
-- PART 2: API VERSIONING INFRASTRUCTURE
-- =====================================================

-- API Versions: Track supported API versions
CREATE TABLE api_versions (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'sunset')),
  sunset_date DATE,
  release_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial versions
INSERT INTO api_versions (version, status, release_notes) VALUES
('v1', 'active', 'Initial API version with basic functionality'),
('v2', 'active', 'Enhanced API with standardized responses, improved pagination, and HATEOAS links');

-- API Request Log: Track API usage by version
CREATE TABLE api_request_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  api_version TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API analytics
CREATE INDEX idx_api_request_log_organization ON api_request_log(organization_id, created_at DESC);
CREATE INDEX idx_api_request_log_version ON api_request_log(api_version, created_at DESC);
CREATE INDEX idx_api_request_log_endpoint ON api_request_log(endpoint, created_at DESC);
CREATE INDEX idx_api_request_log_status ON api_request_log(status_code, created_at DESC);
CREATE INDEX idx_api_request_log_request_id ON api_request_log(request_id);

-- API Version Usage: Aggregate stats by organization
CREATE TABLE api_version_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_version TEXT NOT NULL,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT api_version_usage_unique UNIQUE (organization_id, api_version, date)
);

-- Indexes for usage analytics
CREATE INDEX idx_api_version_usage_org ON api_version_usage(organization_id, date DESC);
CREATE INDEX idx_api_version_usage_version ON api_version_usage(api_version, date DESC);

-- =====================================================
-- PART 3: CQRS INFRASTRUCTURE
-- =====================================================

-- Command Log: Track all write operations
CREATE TABLE command_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_type TEXT NOT NULL,
  command_data JSONB NOT NULL,
  aggregate_id UUID,
  aggregate_type TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'compensated')),
  result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Indexes for command tracking
CREATE INDEX idx_command_log_aggregate ON command_log(aggregate_id, created_at DESC);
CREATE INDEX idx_command_log_organization ON command_log(organization_id, created_at DESC);
CREATE INDEX idx_command_log_status ON command_log(status, created_at);
CREATE INDEX idx_command_log_type ON command_log(command_type, created_at DESC);

-- Query Cache: Optimize read operations
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL,
  query_type TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  ttl_seconds INTEGER DEFAULT 300,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT query_cache_key_unique UNIQUE (cache_key, organization_id)
);

-- Indexes for query cache
CREATE INDEX idx_query_cache_key ON query_cache(cache_key, organization_id);
CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_query_cache_organization ON query_cache(organization_id, query_type);

-- =====================================================
-- PART 4: ENHANCED WEBHOOK INFRASTRUCTURE
-- =====================================================

-- Webhook Delivery Queue: Retry mechanism
CREATE TABLE webhook_delivery_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES event_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES event_store(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  next_attempt_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook queue
CREATE INDEX idx_webhook_queue_status ON webhook_delivery_queue(status, next_attempt_at);
CREATE INDEX idx_webhook_queue_subscription ON webhook_delivery_queue(subscription_id, created_at DESC);
CREATE INDEX idx_webhook_queue_event ON webhook_delivery_queue(event_id);

-- =====================================================
-- PART 5: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Append event to store and update snapshot
CREATE OR REPLACE FUNCTION append_event(
  p_aggregate_id UUID,
  p_aggregate_type TEXT,
  p_event_type TEXT,
  p_event_data JSONB,
  p_organization_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_version INTEGER;
  v_event_id UUID;
BEGIN
  -- Get next version for aggregate
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM event_store
  WHERE aggregate_id = p_aggregate_id;

  -- Insert event
  INSERT INTO event_store (
    aggregate_id,
    aggregate_type,
    event_type,
    event_data,
    metadata,
    version,
    organization_id,
    created_by
  ) VALUES (
    p_aggregate_id,
    p_aggregate_type,
    p_event_type,
    p_event_data,
    p_metadata,
    v_version,
    p_organization_id,
    p_created_by
  ) RETURNING id INTO v_event_id;

  -- Create snapshot every 100 events
  IF v_version % 100 = 0 THEN
    PERFORM create_snapshot(p_aggregate_id, p_aggregate_type, p_organization_id);
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create snapshot of current aggregate state
CREATE OR REPLACE FUNCTION create_snapshot(
  p_aggregate_id UUID,
  p_aggregate_type TEXT,
  p_organization_id UUID
) RETURNS VOID AS $$
DECLARE
  v_version INTEGER;
  v_state JSONB;
BEGIN
  -- Get latest version
  SELECT MAX(version) INTO v_version
  FROM event_store
  WHERE aggregate_id = p_aggregate_id;

  -- Build state from events (simplified - implement proper replay logic)
  SELECT jsonb_agg(event_data ORDER BY version) INTO v_state
  FROM event_store
  WHERE aggregate_id = p_aggregate_id;

  -- Upsert snapshot
  INSERT INTO event_snapshots (
    aggregate_id,
    aggregate_type,
    state,
    version,
    organization_id
  ) VALUES (
    p_aggregate_id,
    p_aggregate_type,
    v_state,
    v_version,
    p_organization_id
  )
  ON CONFLICT (aggregate_id) DO UPDATE SET
    state = EXCLUDED.state,
    version = EXCLUDED.version,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Get aggregate state from snapshot + events
CREATE OR REPLACE FUNCTION get_aggregate_state(
  p_aggregate_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_snapshot event_snapshots%ROWTYPE;
  v_events JSONB;
BEGIN
  -- Get latest snapshot
  SELECT * INTO v_snapshot
  FROM event_snapshots
  WHERE aggregate_id = p_aggregate_id;

  IF v_snapshot.aggregate_id IS NULL THEN
    -- No snapshot, rebuild from all events
    SELECT jsonb_agg(event_data ORDER BY version) INTO v_events
    FROM event_store
    WHERE aggregate_id = p_aggregate_id;

    RETURN COALESCE(v_events, '{}'::jsonb);
  ELSE
    -- Get events after snapshot
    SELECT jsonb_agg(event_data ORDER BY version) INTO v_events
    FROM event_store
    WHERE aggregate_id = p_aggregate_id
      AND version > v_snapshot.version;

    -- Merge snapshot with newer events
    RETURN v_snapshot.state || COALESCE(v_events, '{}'::jsonb);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Queue event for webhook delivery
CREATE OR REPLACE FUNCTION queue_event_for_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription event_subscriptions%ROWTYPE;
  v_payload JSONB;
  v_signature TEXT;
BEGIN
  -- Find all active subscriptions for this event type
  FOR v_subscription IN
    SELECT * FROM event_subscriptions
    WHERE enabled = true
      AND organization_id = NEW.organization_id
      AND NEW.event_type = ANY(event_types)
  LOOP
    -- Build payload
    v_payload := jsonb_build_object(
      'event_id', NEW.id,
      'event_type', NEW.event_type,
      'aggregate_id', NEW.aggregate_id,
      'aggregate_type', NEW.aggregate_type,
      'data', NEW.event_data,
      'metadata', NEW.metadata,
      'version', NEW.version,
      'created_at', NEW.created_at
    );

    -- Generate signature (simplified - implement proper HMAC)
    v_signature := encode(digest(v_payload::text || v_subscription.webhook_secret, 'sha256'), 'hex');

    -- Queue for delivery
    INSERT INTO webhook_delivery_queue (
      subscription_id,
      event_id,
      payload,
      signature,
      next_attempt_at,
      status
    ) VALUES (
      v_subscription.id,
      NEW.id,
      v_payload,
      v_signature,
      NOW(),
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-queue events for webhooks
CREATE TRIGGER trigger_queue_event_for_webhooks
  AFTER INSERT ON event_store
  FOR EACH ROW
  EXECUTE FUNCTION queue_event_for_webhooks();

-- Function: Log API request
CREATE OR REPLACE FUNCTION log_api_request(
  p_organization_id UUID,
  p_user_id UUID,
  p_api_version TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO api_request_log (
    organization_id,
    user_id,
    api_version,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    user_agent,
    request_id,
    error_code
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_api_version,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address::inet,
    p_user_agent,
    COALESCE(p_request_id, gen_random_uuid()::text),
    p_error_code
  );

  -- Update daily aggregates
  INSERT INTO api_version_usage (
    organization_id,
    api_version,
    date,
    total_requests,
    successful_requests,
    failed_requests,
    avg_response_time_ms
  ) VALUES (
    p_organization_id,
    p_api_version,
    CURRENT_DATE,
    1,
    CASE WHEN p_status_code < 400 THEN 1 ELSE 0 END,
    CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    p_response_time_ms
  )
  ON CONFLICT (organization_id, api_version, date) DO UPDATE SET
    total_requests = api_version_usage.total_requests + 1,
    successful_requests = api_version_usage.successful_requests +
      CASE WHEN p_status_code < 400 THEN 1 ELSE 0 END,
    failed_requests = api_version_usage.failed_requests +
      CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    avg_response_time_ms = (api_version_usage.avg_response_time_ms * api_version_usage.total_requests + p_response_time_ms) /
      (api_version_usage.total_requests + 1),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Clean expired query cache
CREATE OR REPLACE FUNCTION clean_expired_query_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM query_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Event Store RLS
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their organization" ON event_store
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their organization" ON event_store
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Event Snapshots RLS
ALTER TABLE event_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots in their organization" ON event_snapshots
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Event Subscriptions RLS
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage subscriptions in their organization" ON event_subscriptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Event Delivery Log RLS
ALTER TABLE event_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery logs for their subscriptions" ON event_delivery_log
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM event_subscriptions
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- API Request Log RLS
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view API logs for their organization" ON api_request_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Command Log RLS
ALTER TABLE command_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view command logs in their organization" ON command_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert commands in their organization" ON command_log
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Query Cache RLS
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access query cache in their organization" ON query_cache
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PART 7: MAINTENANCE AND MONITORING
-- =====================================================

-- Function: Get event store statistics
CREATE OR REPLACE FUNCTION get_event_store_stats(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_events BIGINT,
  events_by_type JSONB,
  events_by_aggregate_type JSONB,
  avg_events_per_aggregate NUMERIC,
  total_snapshots BIGINT,
  oldest_event TIMESTAMPTZ,
  newest_event TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_events,
    jsonb_object_agg(event_type, count) AS events_by_type,
    jsonb_object_agg(aggregate_type, count) AS events_by_aggregate_type,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT aggregate_id), 0), 2) AS avg_events_per_aggregate,
    (SELECT COUNT(*)::BIGINT FROM event_snapshots
     WHERE p_organization_id IS NULL OR organization_id = p_organization_id) AS total_snapshots,
    MIN(created_at) AS oldest_event,
    MAX(created_at) AS newest_event
  FROM (
    SELECT
      event_type,
      COUNT(*) as count,
      aggregate_type,
      aggregate_id,
      created_at
    FROM event_store
    WHERE p_organization_id IS NULL OR organization_id = p_organization_id
    GROUP BY event_type, aggregate_type, aggregate_id, created_at
  ) subquery;
END;
$$ LANGUAGE plpgsql;

-- Function: Get webhook delivery stats
CREATE OR REPLACE FUNCTION get_webhook_delivery_stats(p_organization_id UUID)
RETURNS TABLE (
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  pending_deliveries BIGINT,
  avg_delivery_attempts NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_deliveries,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT AS successful_deliveries,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_deliveries,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_deliveries,
    ROUND(AVG(attempt_count), 2) AS avg_delivery_attempts,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate
  FROM event_delivery_log edl
  JOIN event_subscriptions es ON edl.subscription_id = es.id
  WHERE es.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_event_snapshots_updated_at
  BEFORE UPDATE ON event_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_subscriptions_updated_at
  BEFORE UPDATE ON event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_versions_updated_at
  BEFORE UPDATE ON api_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_version_usage_updated_at
  BEFORE UPDATE ON api_version_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_delivery_queue_updated_at
  BEFORE UPDATE ON webhook_delivery_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_projections_updated_at
  BEFORE UPDATE ON event_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment for tracking
COMMENT ON TABLE event_store IS 'Core event store for event sourcing - stores all domain events';
COMMENT ON TABLE event_snapshots IS 'Performance optimization snapshots created every 100 events';
COMMENT ON TABLE event_subscriptions IS 'Webhook subscriptions for event notifications';
COMMENT ON TABLE api_versions IS 'Track supported API versions and their lifecycle';
COMMENT ON TABLE command_log IS 'CQRS command log for audit and replay';
COMMENT ON TABLE query_cache IS 'Read model cache for optimized queries';
