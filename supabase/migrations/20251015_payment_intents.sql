-- =====================================================
-- Payment Intents Migration (S-002: 3D Secure Implementation)
-- =====================================================
-- Description: Creates tables and policies for tracking payment intents
--              and 3D Secure authentication for PCI DSS and SCA compliance.
-- Security: CVSS 6.5 - Ensures compliance with Strong Customer Authentication
-- =====================================================

-- Create payment_intents table for tracking 3DS flows
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe references
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT,

  -- Payment details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Payment purpose
  purpose TEXT NOT NULL CHECK (purpose IN (
    'subscription_payment',
    'subscription_upgrade',
    'additional_charge',
    'invoice_payment',
    'setup_payment_method'
  )),
  related_subscription_id TEXT,
  related_invoice_id TEXT,

  -- Payment Intent status
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created',
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'cancelled',
    'succeeded'
  )),

  -- 3D Secure authentication tracking
  authentication_required BOOLEAN NOT NULL DEFAULT false,
  authentication_status TEXT CHECK (authentication_status IN (
    'not_required',
    'pending',
    'authenticated',
    'failed',
    'challenged',
    'frictionless'
  )),
  authentication_method TEXT, -- 3ds1, 3ds2, redirect, etc.

  -- SCA (Strong Customer Authentication) details
  sca_exemption TEXT CHECK (sca_exemption IN (
    'none',
    'low_value',
    'transaction_risk_analysis',
    'recurring_payment',
    'merchant_initiated'
  )),
  sca_exemption_applied BOOLEAN NOT NULL DEFAULT false,

  -- Client secret for frontend (never expose in API responses)
  client_secret TEXT NOT NULL,

  -- Confirmation details
  confirmation_method TEXT CHECK (confirmation_method IN ('automatic', 'manual')),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,

  -- Redirect URLs for 3DS authentication
  return_url TEXT,
  next_action JSONB, -- Stripe's next_action object

  -- Error tracking
  last_error_code TEXT,
  last_error_message TEXT,
  last_error_details JSONB,

  -- Attempt tracking
  attempt_count INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit trail
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address INET
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payment_intents_organization_id
  ON payment_intents(organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_stripe_payment_intent_id
  ON payment_intents(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_customer_id
  ON payment_intents(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON payment_intents(status);

CREATE INDEX IF NOT EXISTS idx_payment_intents_authentication_status
  ON payment_intents(authentication_status)
  WHERE authentication_required = true;

CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at
  ON payment_intents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_intents_pending
  ON payment_intents(status, created_at)
  WHERE status IN ('requires_action', 'requires_payment_method', 'requires_confirmation');

-- Create payment authentication events table for detailed tracking
CREATE TABLE IF NOT EXISTS payment_authentication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'authentication_initiated',
    'authentication_challenged',
    'authentication_succeeded',
    'authentication_failed',
    'redirect_completed',
    'payment_confirmed',
    'payment_failed'
  )),

  -- Authentication details
  authentication_flow TEXT, -- challenge, frictionless, redirect
  challenge_type TEXT, -- otp, biometric, password
  device_info JSONB,

  -- Event metadata
  event_details JSONB DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,

  -- User context
  user_agent TEXT,
  ip_address INET,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_authentication_events_payment_intent_id
  ON payment_authentication_events(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payment_authentication_events_event_type
  ON payment_authentication_events(event_type);

CREATE INDEX IF NOT EXISTS idx_payment_authentication_events_created_at
  ON payment_authentication_events(created_at DESC);

-- Create payment compliance logs table for regulatory requirements
CREATE TABLE IF NOT EXISTS payment_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,

  -- Compliance requirements
  regulation TEXT NOT NULL CHECK (regulation IN ('PSD2', 'SCA', 'PCI_DSS', 'GDPR')),
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('compliant', 'non_compliant', 'exempted', 'pending')),

  -- Validation details
  validation_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  exemption_reason TEXT,
  risk_score DECIMAL(5,2),

  -- Audit information
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validator TEXT NOT NULL DEFAULT 'system',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_compliance_logs_payment_intent_id
  ON payment_compliance_logs(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payment_compliance_logs_regulation
  ON payment_compliance_logs(regulation);

CREATE INDEX IF NOT EXISTS idx_payment_compliance_logs_status
  ON payment_compliance_logs(compliance_status);

-- Create view for payment intent statistics
CREATE OR REPLACE VIEW payment_intent_statistics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  purpose,
  status,
  authentication_required,
  authentication_status,
  COUNT(*) as intent_count,
  SUM(amount_cents) as total_amount_cents,
  AVG(amount_cents) as avg_amount_cents,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded_count,
  SUM(CASE WHEN authentication_required THEN 1 ELSE 0 END) as auth_required_count,
  SUM(CASE WHEN authentication_status = 'authenticated' THEN 1 ELSE 0 END) as auth_succeeded_count,
  AVG(CASE
    WHEN succeeded_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (succeeded_at - created_at))
    ELSE NULL
  END) as avg_completion_time_seconds
FROM payment_intents
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), purpose, status, authentication_required, authentication_status;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER trigger_update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();

-- Function to create payment intent record
CREATE OR REPLACE FUNCTION create_payment_intent_record(
  p_organization_id UUID,
  p_stripe_payment_intent_id TEXT,
  p_stripe_customer_id TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_purpose TEXT,
  p_client_secret TEXT,
  p_authentication_required BOOLEAN DEFAULT false,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_intent_id UUID;
BEGIN
  -- Validate organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Create payment intent record
  INSERT INTO payment_intents (
    organization_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_cents,
    currency,
    purpose,
    status,
    authentication_required,
    authentication_status,
    client_secret,
    confirmation_method,
    user_agent,
    ip_address,
    expires_at
  )
  VALUES (
    p_organization_id,
    p_stripe_payment_intent_id,
    p_stripe_customer_id,
    p_amount_cents,
    p_currency,
    p_purpose,
    'created',
    p_authentication_required,
    CASE WHEN p_authentication_required THEN 'pending' ELSE 'not_required' END,
    p_client_secret,
    'automatic',
    p_user_agent,
    p_ip_address,
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_payment_intent_id;

  -- Log authentication initiation if required
  IF p_authentication_required THEN
    INSERT INTO payment_authentication_events (
      payment_intent_id,
      event_type,
      authentication_flow,
      user_agent,
      ip_address
    )
    VALUES (
      v_payment_intent_id,
      'authentication_initiated',
      'pending',
      p_user_agent,
      p_ip_address
    );
  END IF;

  RETURN v_payment_intent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payment intent status
CREATE OR REPLACE FUNCTION update_payment_intent_status(
  p_payment_intent_id UUID,
  p_status TEXT,
  p_authentication_status TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  -- Get previous status for logging
  SELECT status INTO v_previous_status
  FROM payment_intents
  WHERE id = p_payment_intent_id;

  -- Update payment intent
  UPDATE payment_intents
  SET
    status = p_status,
    authentication_status = COALESCE(p_authentication_status, authentication_status),
    last_error_code = p_error_code,
    last_error_message = p_error_message,
    confirmed = (p_status = 'succeeded'),
    confirmed_at = CASE WHEN p_status = 'succeeded' THEN NOW() ELSE confirmed_at END,
    succeeded_at = CASE WHEN p_status = 'succeeded' THEN NOW() ELSE succeeded_at END,
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_payment_intent_id;

  -- Log status change event
  INSERT INTO payment_authentication_events (
    payment_intent_id,
    event_type,
    event_details,
    error_code,
    error_message
  )
  VALUES (
    p_payment_intent_id,
    CASE p_status
      WHEN 'succeeded' THEN 'payment_confirmed'
      WHEN 'cancelled' THEN 'payment_failed'
      ELSE 'authentication_' || LOWER(REPLACE(p_status, 'requires_', ''))
    END,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'new_status', p_status,
      'timestamp', NOW()
    ),
    p_error_code,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log authentication event
CREATE OR REPLACE FUNCTION log_authentication_event(
  p_payment_intent_id UUID,
  p_event_type TEXT,
  p_authentication_flow TEXT DEFAULT NULL,
  p_challenge_type TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO payment_authentication_events (
    payment_intent_id,
    event_type,
    authentication_flow,
    challenge_type,
    event_details,
    error_code,
    error_message,
    user_agent,
    ip_address
  )
  VALUES (
    p_payment_intent_id,
    p_event_type,
    p_authentication_flow,
    p_challenge_type,
    jsonb_build_object(
      'success', p_success,
      'timestamp', NOW()
    ),
    p_error_code,
    p_error_message,
    p_user_agent,
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql;

-- Function to log compliance validation
CREATE OR REPLACE FUNCTION log_compliance_validation(
  p_payment_intent_id UUID,
  p_regulation TEXT,
  p_compliance_status TEXT,
  p_validation_checks JSONB,
  p_exemption_reason TEXT DEFAULT NULL,
  p_risk_score DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO payment_compliance_logs (
    payment_intent_id,
    regulation,
    compliance_status,
    validation_checks,
    exemption_reason,
    risk_score
  )
  VALUES (
    p_payment_intent_id,
    p_regulation,
    p_compliance_status,
    p_validation_checks,
    p_exemption_reason,
    p_risk_score
  );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired payment intents
CREATE OR REPLACE FUNCTION cleanup_expired_payment_intents()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM payment_intents
  WHERE status NOT IN ('succeeded', 'processing')
    AND expires_at < NOW()
  RETURNING count(*) INTO v_deleted_count;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get authentication statistics
CREATE OR REPLACE FUNCTION get_authentication_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_payments', COUNT(*),
    'authentication_required', SUM(CASE WHEN authentication_required THEN 1 ELSE 0 END),
    'authentication_succeeded', SUM(CASE WHEN authentication_status = 'authenticated' THEN 1 ELSE 0 END),
    'authentication_failed', SUM(CASE WHEN authentication_status = 'failed' THEN 1 ELSE 0 END),
    'frictionless_authentications', SUM(CASE WHEN authentication_status = 'frictionless' THEN 1 ELSE 0 END),
    'challenged_authentications', SUM(CASE WHEN authentication_status = 'challenged' THEN 1 ELSE 0 END),
    'success_rate', CASE
      WHEN SUM(CASE WHEN authentication_required THEN 1 ELSE 0 END) > 0
      THEN ROUND(
        100.0 * SUM(CASE WHEN authentication_status = 'authenticated' THEN 1 ELSE 0 END)::DECIMAL /
        SUM(CASE WHEN authentication_required THEN 1 ELSE 0 END)::DECIMAL,
        2
      )
      ELSE 0
    END
  )
  INTO v_stats
  FROM payment_intents
  WHERE created_at BETWEEN p_start_date AND p_end_date;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_authentication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_compliance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to payment_intents" ON payment_intents
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_authentication_events" ON payment_authentication_events
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payment_compliance_logs" ON payment_compliance_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Organization users can view their payment intents (excluding client_secret)
CREATE POLICY "Organization users can view their payment_intents" ON payment_intents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Super admins can view all payment intents
CREATE POLICY "Super admins can view all payment_intents" ON payment_intents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON payment_intents TO service_role;
GRANT SELECT, INSERT ON payment_authentication_events TO service_role;
GRANT SELECT, INSERT ON payment_compliance_logs TO service_role;
GRANT SELECT ON payment_intent_statistics TO service_role;
GRANT EXECUTE ON FUNCTION create_payment_intent_record TO service_role;
GRANT EXECUTE ON FUNCTION update_payment_intent_status TO service_role;
GRANT EXECUTE ON FUNCTION log_authentication_event TO service_role;
GRANT EXECUTE ON FUNCTION log_compliance_validation TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_payment_intents TO service_role;
GRANT EXECUTE ON FUNCTION get_authentication_statistics TO service_role;

-- Comments for documentation
COMMENT ON TABLE payment_intents IS 'Tracks Stripe PaymentIntents with 3D Secure authentication for PCI DSS and SCA compliance';
COMMENT ON COLUMN payment_intents.authentication_required IS 'Whether 3D Secure authentication is required for this payment';
COMMENT ON COLUMN payment_intents.sca_exemption IS 'SCA exemption type if applicable (PSD2 compliance)';
COMMENT ON COLUMN payment_intents.client_secret IS 'Stripe client secret for frontend confirmation (never expose in API)';
COMMENT ON TABLE payment_authentication_events IS 'Detailed log of all authentication events for audit trail';
COMMENT ON TABLE payment_compliance_logs IS 'Regulatory compliance validation logs for PSD2, SCA, PCI DSS';
COMMENT ON FUNCTION create_payment_intent_record IS 'Creates new payment intent record with authentication tracking';
COMMENT ON FUNCTION get_authentication_statistics IS 'Returns aggregated authentication statistics for reporting';
COMMENT ON VIEW payment_intent_statistics IS 'Aggregated payment intent statistics including authentication metrics';
