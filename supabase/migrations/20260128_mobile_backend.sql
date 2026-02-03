-- Phase 16: Mobile Backend
-- Database schema for mobile app support: push notifications, device registration
-- Date: 2026-01-28

-- =============================================================================
-- DEVICE REGISTRATIONS TABLE
-- =============================================================================
-- Stores mobile device info and push notification tokens

CREATE TABLE IF NOT EXISTS device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Device info
  device_id TEXT NOT NULL, -- Unique device identifier
  device_name TEXT,
  device_model TEXT,
  device_os TEXT NOT NULL CHECK (device_os IN ('ios', 'android', 'web')),
  device_os_version TEXT,
  app_version TEXT,
  -- Push notification tokens
  fcm_token TEXT, -- Firebase Cloud Messaging token
  apns_token TEXT, -- Apple Push Notification Service token (for direct APNs)
  expo_push_token TEXT, -- Expo push token (if using Expo)
  -- Token management
  token_updated_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Notification preferences
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sound BOOLEAN NOT NULL DEFAULT true,
  notification_vibrate BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One device per user per device_id
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX idx_device_registrations_user ON device_registrations(user_id);
CREATE INDEX idx_device_registrations_org ON device_registrations(organization_id);
CREATE INDEX idx_device_registrations_fcm ON device_registrations(fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX idx_device_registrations_active ON device_registrations(is_active) WHERE is_active = true;
CREATE INDEX idx_device_registrations_last_active ON device_registrations(last_active_at DESC);

-- RLS Policies
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON device_registrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own devices"
  ON device_registrations FOR ALL
  USING (user_id = auth.uid());

-- =============================================================================
-- PUSH NOTIFICATIONS TABLE
-- =============================================================================
-- Log of sent push notifications (for debugging and analytics)

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registration_id UUID NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Custom data payload
  -- Source tracking
  source_type TEXT NOT NULL, -- 'message', 'mention', 'assignment', 'system'
  source_id UUID, -- ID of the source entity (message_id, mention_id, etc.)
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'opened', 'failed', 'expired'
  )),
  provider TEXT NOT NULL DEFAULT 'fcm' CHECK (provider IN ('fcm', 'apns', 'expo')),
  provider_message_id TEXT, -- Message ID from push provider
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_push_notifications_device ON push_notifications(device_registration_id);
CREATE INDEX idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX idx_push_notifications_org ON push_notifications(organization_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);
CREATE INDEX idx_push_notifications_source ON push_notifications(source_type, source_id);
CREATE INDEX idx_push_notifications_created ON push_notifications(created_at DESC);

-- RLS
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push notifications"
  ON push_notifications FOR SELECT
  USING (user_id = auth.uid());

-- =============================================================================
-- PUSH NOTIFICATION QUEUE TABLE
-- =============================================================================
-- Queue for pending push notifications (for batch processing)

CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registration_id UUID NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  source_type TEXT NOT NULL,
  source_id UUID,
  -- Priority (higher = more urgent)
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_push_queue_pending ON push_notification_queue(status, priority DESC, scheduled_for ASC)
  WHERE status = 'pending';
CREATE INDEX idx_push_queue_device ON push_notification_queue(device_registration_id);

-- =============================================================================
-- API SESSIONS TABLE
-- =============================================================================
-- Track active API sessions for mobile apps (for token refresh tracking)

CREATE TABLE IF NOT EXISTS mobile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_registration_id UUID REFERENCES device_registrations(id) ON DELETE SET NULL,
  -- Session info
  session_token_hash TEXT NOT NULL, -- Hashed session token
  refresh_token_hash TEXT, -- Hashed refresh token
  -- Token management
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  -- Timestamps
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mobile_sessions_user ON mobile_sessions(user_id);
CREATE INDEX idx_mobile_sessions_device ON mobile_sessions(device_registration_id);
CREATE INDEX idx_mobile_sessions_active ON mobile_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_mobile_sessions_token ON mobile_sessions(session_token_hash);

-- RLS
ALTER TABLE mobile_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON mobile_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions"
  ON mobile_sessions FOR ALL
  USING (user_id = auth.uid());

-- =============================================================================
-- OFFLINE MESSAGE QUEUE TABLE
-- =============================================================================
-- Messages queued on device while offline (tracked for sync)

CREATE TABLE IF NOT EXISTS offline_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_registration_id UUID NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  -- Message content
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  -- Sync status
  client_message_id TEXT NOT NULL, -- Client-generated ID for deduplication
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  server_message_id UUID REFERENCES messages(id), -- After sync
  -- Timestamps
  client_timestamp TIMESTAMPTZ NOT NULL, -- When created on device
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate syncs
  UNIQUE(device_registration_id, client_message_id)
);

-- Indexes
CREATE INDEX idx_offline_queue_user ON offline_message_queue(user_id);
CREATE INDEX idx_offline_queue_device ON offline_message_queue(device_registration_id);
CREATE INDEX idx_offline_queue_pending ON offline_message_queue(sync_status) WHERE sync_status = 'pending';

-- RLS
ALTER TABLE offline_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offline queue"
  ON offline_message_queue FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own offline queue"
  ON offline_message_queue FOR ALL
  USING (user_id = auth.uid());

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_mobile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_registrations_updated_at
  BEFORE UPDATE ON device_registrations
  FOR EACH ROW EXECUTE FUNCTION update_mobile_updated_at();

-- =============================================================================
-- CLEAN UP OLD SESSIONS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_mobile_sessions()
RETURNS void AS $$
BEGIN
  -- Revoke expired sessions
  UPDATE mobile_sessions
  SET is_active = false, revoked_at = NOW(), revoked_reason = 'expired'
  WHERE is_active = true
    AND access_token_expires_at < NOW()
    AND (refresh_token_expires_at IS NULL OR refresh_token_expires_at < NOW());

  -- Delete very old revoked sessions (30 days)
  DELETE FROM mobile_sessions
  WHERE is_active = false AND revoked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE device_registrations IS 'Mobile device registrations with push notification tokens';
COMMENT ON TABLE push_notifications IS 'Log of sent push notifications for analytics';
COMMENT ON TABLE push_notification_queue IS 'Queue for batch processing push notifications';
COMMENT ON TABLE mobile_sessions IS 'Active mobile app sessions for token management';
COMMENT ON TABLE offline_message_queue IS 'Messages queued while device was offline';
