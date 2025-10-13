-- =====================================================
-- Refunds Migration (S-001: Stripe Refund Handling)
-- =====================================================
-- Description: Creates tables and policies for managing refunds with
--              comprehensive audit trail and authorization controls.
-- Security: CVSS 6.5 - Financial operations require strict access control
-- =====================================================

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization and subscription references
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_refund_id TEXT UNIQUE,
  stripe_charge_id TEXT,

  -- Refund details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial', 'prorated')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Reason and justification
  reason TEXT NOT NULL CHECK (reason IN (
    'requested_by_customer',
    'duplicate_payment',
    'fraudulent',
    'service_not_provided',
    'technical_issue',
    'billing_error',
    'other'
  )),
  reason_details TEXT,

  -- Admin authorization
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  processed_by UUID REFERENCES profiles(id),

  -- Subscription impact
  cancel_subscription BOOLEAN NOT NULL DEFAULT false,
  subscription_cancelled_at TIMESTAMPTZ,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Audit trail
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_refunds_organization_id
  ON refunds(organization_id);

CREATE INDEX IF NOT EXISTS idx_refunds_stripe_subscription_id
  ON refunds(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id
  ON refunds(stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refunds_status
  ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_refunds_refund_type
  ON refunds(refund_type);

CREATE INDEX IF NOT EXISTS idx_refunds_requested_at
  ON refunds(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_pending
  ON refunds(status, requested_at)
  WHERE status = 'pending';

-- Create refund history table for audit trail
CREATE TABLE IF NOT EXISTS refund_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,

  -- Status change tracking
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,

  -- User who made the change
  changed_by UUID REFERENCES profiles(id),

  -- Change details
  change_reason TEXT,
  change_details JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_history_refund_id
  ON refund_history(refund_id);

CREATE INDEX IF NOT EXISTS idx_refund_history_created_at
  ON refund_history(created_at DESC);

-- Create refund notifications table
CREATE TABLE IF NOT EXISTS refund_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'refund_requested',
    'refund_approved',
    'refund_processed',
    'refund_completed',
    'refund_failed',
    'subscription_cancelled'
  )),

  -- Recipients
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES profiles(id),

  -- Status
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_notifications_refund_id
  ON refund_notifications(refund_id);

CREATE INDEX IF NOT EXISTS idx_refund_notifications_unsent
  ON refund_notifications(sent, created_at)
  WHERE sent = false;

-- Create view for refund statistics
CREATE OR REPLACE VIEW refund_statistics AS
SELECT
  DATE_TRUNC('month', requested_at) as month,
  refund_type,
  reason,
  COUNT(*) as refund_count,
  SUM(amount_cents) as total_amount_cents,
  AVG(amount_cents) as avg_amount_cents,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN cancel_subscription THEN 1 ELSE 0 END) as cancellations_count
FROM refunds
WHERE requested_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', requested_at), refund_type, reason;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_refunds_updated_at ON refunds;
CREATE TRIGGER trigger_update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refunds_updated_at();

-- Function to log refund status changes
CREATE OR REPLACE FUNCTION log_refund_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO refund_history (
      refund_id,
      previous_status,
      new_status,
      changed_by,
      change_reason,
      change_details
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.processed_by, NEW.approved_by, NEW.requested_by),
      CASE NEW.status
        WHEN 'approved' THEN 'Refund approved by admin'
        WHEN 'processing' THEN 'Refund being processed in Stripe'
        WHEN 'completed' THEN 'Refund successfully completed'
        WHEN 'failed' THEN 'Refund processing failed'
        WHEN 'cancelled' THEN 'Refund request cancelled'
        ELSE 'Status changed'
      END,
      jsonb_build_object(
        'error_message', NEW.error_message,
        'stripe_refund_id', NEW.stripe_refund_id,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_refund_status_change ON refunds;
CREATE TRIGGER trigger_log_refund_status_change
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION log_refund_status_change();

-- Function to create refund request
CREATE OR REPLACE FUNCTION create_refund_request(
  p_organization_id UUID,
  p_stripe_subscription_id TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_refund_type TEXT,
  p_reason TEXT,
  p_reason_details TEXT,
  p_cancel_subscription BOOLEAN,
  p_requested_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
BEGIN
  -- Validate organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Validate requester is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_requested_by AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can request refunds';
  END IF;

  -- Create refund request
  INSERT INTO refunds (
    organization_id,
    stripe_subscription_id,
    amount_cents,
    currency,
    refund_type,
    status,
    reason,
    reason_details,
    cancel_subscription,
    requested_by,
    requested_at
  )
  VALUES (
    p_organization_id,
    p_stripe_subscription_id,
    p_amount_cents,
    p_currency,
    p_refund_type,
    'pending',
    p_reason,
    p_reason_details,
    p_cancel_subscription,
    p_requested_by,
    NOW()
  )
  RETURNING id INTO v_refund_id;

  -- Create notification for organization
  INSERT INTO refund_notifications (
    refund_id,
    notification_type,
    recipient_email,
    recipient_user_id
  )
  SELECT
    v_refund_id,
    'refund_requested',
    p.email,
    p.id
  FROM profiles p
  WHERE p.organization_id = p_organization_id
    AND p.role IN ('owner', 'admin')
  LIMIT 1;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve refund
CREATE OR REPLACE FUNCTION approve_refund(
  p_refund_id UUID,
  p_approved_by UUID
)
RETURNS VOID AS $$
BEGIN
  -- Validate approver is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_approved_by AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can approve refunds';
  END IF;

  -- Update refund status
  UPDATE refunds
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW()
  WHERE id = p_refund_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found or not in pending status';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete refund (called after Stripe processing)
CREATE OR REPLACE FUNCTION complete_refund(
  p_refund_id UUID,
  p_stripe_refund_id TEXT,
  p_stripe_charge_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_cancel_subscription BOOLEAN;
  v_stripe_subscription_id TEXT;
  v_organization_id UUID;
BEGIN
  -- Get refund details
  SELECT
    cancel_subscription,
    stripe_subscription_id,
    organization_id
  INTO
    v_cancel_subscription,
    v_stripe_subscription_id,
    v_organization_id
  FROM refunds
  WHERE id = p_refund_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found';
  END IF;

  -- Update refund status
  UPDATE refunds
  SET
    status = 'completed',
    stripe_refund_id = p_stripe_refund_id,
    stripe_charge_id = p_stripe_charge_id,
    completed_at = NOW(),
    processed_at = NOW()
  WHERE id = p_refund_id;

  -- Cancel subscription if requested
  IF v_cancel_subscription AND v_stripe_subscription_id IS NOT NULL THEN
    UPDATE refunds
    SET
      subscription_cancelled_at = NOW()
    WHERE id = p_refund_id;

    UPDATE organizations
    SET
      subscription_status = 'cancelled',
      subscription_tier = 'starter',
      stripe_subscription_id = NULL,
      updated_at = NOW()
    WHERE id = v_organization_id;

    -- Create cancellation notification
    INSERT INTO refund_notifications (
      refund_id,
      notification_type,
      recipient_email,
      recipient_user_id
    )
    SELECT
      p_refund_id,
      'subscription_cancelled',
      p.email,
      p.id
    FROM profiles p
    WHERE p.organization_id = v_organization_id
      AND p.role IN ('owner', 'admin')
    LIMIT 1;
  END IF;

  -- Create completion notification
  INSERT INTO refund_notifications (
    refund_id,
    notification_type,
    recipient_email,
    recipient_user_id
  )
  SELECT
    p_refund_id,
    'refund_completed',
    p.email,
    p.id
  FROM profiles p
  WHERE p.organization_id = v_organization_id
    AND p.role IN ('owner', 'admin')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fail refund
CREATE OR REPLACE FUNCTION fail_refund(
  p_refund_id UUID,
  p_error_message TEXT,
  p_error_code TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE refunds
  SET
    status = 'failed',
    error_message = p_error_message,
    error_code = p_error_code,
    failed_at = NOW()
  WHERE id = p_refund_id;

  -- Create failure notification
  INSERT INTO refund_notifications (
    refund_id,
    notification_type,
    recipient_email,
    recipient_user_id
  )
  SELECT
    p_refund_id,
    'refund_failed',
    p.email,
    p.id
  FROM refunds r
  JOIN profiles p ON p.organization_id = r.organization_id
  WHERE r.id = p_refund_id
    AND p.role IN ('owner', 'admin')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check refund eligibility
CREATE OR REPLACE FUNCTION check_refund_eligibility(
  p_organization_id UUID,
  p_stripe_subscription_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_subscription_status TEXT;
  v_last_payment_date TIMESTAMPTZ;
  v_recent_refunds_count INTEGER;
BEGIN
  -- Get organization subscription status
  SELECT subscription_status INTO v_subscription_status
  FROM organizations
  WHERE id = p_organization_id;

  -- Count recent refunds (last 30 days)
  SELECT COUNT(*) INTO v_recent_refunds_count
  FROM refunds
  WHERE organization_id = p_organization_id
    AND requested_at >= NOW() - INTERVAL '30 days';

  -- Build eligibility result
  v_result := jsonb_build_object(
    'eligible', (
      v_subscription_status IN ('active', 'past_due') AND
      v_recent_refunds_count < 3
    ),
    'subscription_status', v_subscription_status,
    'recent_refunds_count', v_recent_refunds_count,
    'checks', jsonb_build_object(
      'has_active_subscription', v_subscription_status IN ('active', 'past_due'),
      'under_refund_limit', v_recent_refunds_count < 3
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to refunds" ON refunds
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to refund_history" ON refund_history
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to refund_notifications" ON refund_notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Super admins can manage all refunds
CREATE POLICY "Super admins can manage refunds" ON refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: Organization owners can view their refunds
CREATE POLICY "Organization owners can view their refunds" ON refunds
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Super admins can view refund history
CREATE POLICY "Super admins can view refund_history" ON refund_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON refunds TO service_role;
GRANT SELECT, INSERT ON refund_history TO service_role;
GRANT SELECT, INSERT, UPDATE ON refund_notifications TO service_role;
GRANT SELECT ON refund_statistics TO service_role;
GRANT EXECUTE ON FUNCTION create_refund_request TO service_role;
GRANT EXECUTE ON FUNCTION approve_refund TO service_role;
GRANT EXECUTE ON FUNCTION complete_refund TO service_role;
GRANT EXECUTE ON FUNCTION fail_refund TO service_role;
GRANT EXECUTE ON FUNCTION check_refund_eligibility TO service_role;

-- Comments for documentation
COMMENT ON TABLE refunds IS 'Tracks all refund requests with full audit trail and authorization';
COMMENT ON COLUMN refunds.refund_type IS 'Type of refund: full (entire amount), partial (portion), prorated (calculated)';
COMMENT ON COLUMN refunds.cancel_subscription IS 'Whether to cancel subscription after refund';
COMMENT ON FUNCTION create_refund_request IS 'Creates new refund request with admin authorization';
COMMENT ON FUNCTION approve_refund IS 'Approves pending refund request (super admin only)';
COMMENT ON FUNCTION complete_refund IS 'Marks refund as completed after Stripe processing';
COMMENT ON FUNCTION check_refund_eligibility IS 'Validates if organization is eligible for refund';
COMMENT ON VIEW refund_statistics IS 'Aggregated refund statistics for reporting';
