-- =============================================================================
-- Migration: Twilio WhatsApp Message Status Enhancement
-- Purpose: Track message status history and timestamps from Twilio
-- Phase: 23 - Status & Delivery
-- Date: 2026-02-03
-- =============================================================================

-- =============================================================================
-- Message Status History Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS twilio_whatsapp_message_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  channel_message_id TEXT NOT NULL, -- Twilio MessageSid
  status TEXT NOT NULL,
  previous_status TEXT,
  error_code TEXT,
  error_message TEXT,
  twilio_timestamp TIMESTAMPTZ, -- Timestamp from Twilio webhook
  raw_payload JSONB, -- Full Twilio payload for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE twilio_whatsapp_message_status_history IS 'Audit trail of all message status changes from Twilio';
COMMENT ON COLUMN twilio_whatsapp_message_status_history.channel_message_id IS 'Twilio MessageSid';
COMMENT ON COLUMN twilio_whatsapp_message_status_history.twilio_timestamp IS 'Timestamp from Twilio webhook payload';
COMMENT ON COLUMN twilio_whatsapp_message_status_history.raw_payload IS 'Full Twilio webhook payload for debugging';

-- =============================================================================
-- Indexes for Message Status History
-- =============================================================================

CREATE INDEX idx_message_status_history_message
  ON twilio_whatsapp_message_status_history(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX idx_message_status_history_channel_message
  ON twilio_whatsapp_message_status_history(channel_message_id);

CREATE INDEX idx_message_status_history_org_created
  ON twilio_whatsapp_message_status_history(organization_id, created_at DESC);

CREATE INDEX idx_message_status_history_status
  ON twilio_whatsapp_message_status_history(status);

-- =============================================================================
-- RLS Policies for Message Status History
-- =============================================================================

ALTER TABLE twilio_whatsapp_message_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view status history for their organization
CREATE POLICY "Users can view own org status history"
  ON twilio_whatsapp_message_status_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert/update
CREATE POLICY "Service role full access to status history"
  ON twilio_whatsapp_message_status_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- Add sent_at column to messages table if not exists
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN sent_at TIMESTAMPTZ;
    COMMENT ON COLUMN messages.sent_at IS 'Timestamp when message was actually sent (from Twilio)';
  END IF;
END $$;

-- Index for sent_at queries
CREATE INDEX IF NOT EXISTS idx_messages_sent_at
  ON messages(sent_at)
  WHERE sent_at IS NOT NULL;

-- =============================================================================
-- Twilio Error Codes Reference Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS twilio_error_codes (
  code TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  user_message TEXT NOT NULL,
  retryable BOOLEAN NOT NULL DEFAULT false,
  retry_after_seconds INTEGER,
  category TEXT, -- 'invalid_number', 'rate_limit', 'policy', 'network', 'unknown'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE twilio_error_codes IS 'Reference table for Twilio error codes and user-friendly messages';

-- Populate common error codes
INSERT INTO twilio_error_codes (code, message, user_message, retryable, retry_after_seconds, category)
VALUES
  ('63001', 'Invalid destination number', 'The recipient phone number is invalid or not registered on WhatsApp.', false, NULL, 'invalid_number'),
  ('63003', 'Rate limit exceeded', 'Too many messages sent. Please wait a moment and try again.', true, 60, 'rate_limit'),
  ('63007', 'WhatsApp policy violation', 'This message violates WhatsApp''s messaging policy.', false, NULL, 'policy'),
  ('63016', 'Message content policy violation', 'The message content violates WhatsApp''s content policy.', false, NULL, 'policy'),
  ('63024', 'Session window expired', 'The 24-hour messaging window has expired. Use a template message instead.', false, NULL, 'policy'),
  ('63025', 'Recipient has opted out', 'The recipient has opted out of receiving messages.', false, NULL, 'policy'),
  ('30003', 'Unreachable destination handset', 'The recipient''s phone is unreachable. They may have their phone off.', true, 300, 'network'),
  ('30005', 'Unknown destination handset', 'The recipient''s phone number could not be found.', false, NULL, 'invalid_number'),
  ('30006', 'Landline or unreachable carrier', 'This number appears to be a landline or is not reachable.', false, NULL, 'invalid_number'),
  ('30007', 'Carrier violation', 'The message was blocked by the carrier.', false, NULL, 'policy'),
  ('30008', 'Unknown error', 'An unknown error occurred. Please try again.', true, 30, 'unknown'),
  ('21211', 'Invalid phone number format', 'The phone number format is invalid.', false, NULL, 'invalid_number'),
  ('21610', 'Message body required', 'The message must contain text or media content.', false, NULL, 'policy'),
  ('21612', 'Body exceeds 1600 chars', 'The message is too long. Maximum 1600 characters allowed.', false, NULL, 'policy')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Function to get error info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_twilio_error_info(p_error_code TEXT)
RETURNS TABLE (
  code TEXT,
  message TEXT,
  user_message TEXT,
  retryable BOOLEAN,
  retry_after_seconds INTEGER,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.code,
    e.message,
    e.user_message,
    e.retryable,
    e.retry_after_seconds,
    e.category
  FROM twilio_error_codes e
  WHERE e.code = p_error_code;

  -- If no specific error found, return generic
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_error_code::TEXT,
      'Unknown error'::TEXT,
      'An unexpected error occurred. Please try again or contact support.'::TEXT,
      true::BOOLEAN,
      30::INTEGER,
      'unknown'::TEXT;
  END IF;
END;
$$;

-- =============================================================================
-- Trigger to update timestamps on error code changes
-- =============================================================================

CREATE OR REPLACE FUNCTION update_twilio_error_codes_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_twilio_error_codes_timestamp ON twilio_error_codes;
CREATE TRIGGER trigger_update_twilio_error_codes_timestamp
  BEFORE UPDATE ON twilio_error_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_twilio_error_codes_timestamp();

-- =============================================================================
-- Grant permissions
-- =============================================================================

GRANT SELECT ON twilio_error_codes TO authenticated;
GRANT SELECT ON twilio_whatsapp_message_status_history TO authenticated;
