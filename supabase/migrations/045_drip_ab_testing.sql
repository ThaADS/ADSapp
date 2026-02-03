-- Migration: Drip Campaign A/B Testing
-- Purpose: Add support for A/B testing within drip campaigns
-- Author: System
-- Date: 2026-02-03

-- ============================================================================
-- A/B TESTS TABLE
-- ============================================================================

CREATE TABLE drip_ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES drip_campaign_steps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Test configuration
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  winning_metric TEXT NOT NULL DEFAULT 'read_rate' CHECK (winning_metric IN ('delivery_rate', 'read_rate', 'reply_rate', 'click_rate')),
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.95,
  min_sample_size INTEGER NOT NULL DEFAULT 100,

  -- Results
  winner_id UUID,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active test per step
  CONSTRAINT unique_active_test_per_step UNIQUE (step_id) WHERE status = 'running'
);

-- ============================================================================
-- A/B VARIANTS TABLE
-- ============================================================================

CREATE TABLE drip_ab_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES drip_ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Message content (variant of the step's message)
  message_content TEXT,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  template_variables JSONB DEFAULT '{}',

  -- Traffic allocation (percentage, should sum to 100 across variants in a test)
  traffic_allocation INTEGER NOT NULL CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),

  -- Metrics (updated as messages are sent/delivered/read)
  metrics JSONB NOT NULL DEFAULT '{
    "impressions": 0,
    "delivered": 0,
    "read": 0,
    "replied": 0,
    "clicked": 0,
    "deliveryRate": 0,
    "readRate": 0,
    "replyRate": 0,
    "clickRate": 0
  }',

  -- Flags
  is_control BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONTACT VARIANT ASSIGNMENTS (tracks which variant a contact received)
-- ============================================================================

CREATE TABLE drip_variant_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES drip_ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES drip_ab_variants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES drip_enrollments(id) ON DELETE CASCADE,

  -- Status tracking
  message_sent BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each contact can only be assigned to one variant per test
  UNIQUE(test_id, contact_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_drip_ab_tests_campaign ON drip_ab_tests(campaign_id);
CREATE INDEX idx_drip_ab_tests_step ON drip_ab_tests(step_id);
CREATE INDEX idx_drip_ab_tests_status ON drip_ab_tests(status);

CREATE INDEX idx_drip_ab_variants_test ON drip_ab_variants(test_id);

CREATE INDEX idx_drip_variant_assignments_test ON drip_variant_assignments(test_id);
CREATE INDEX idx_drip_variant_assignments_variant ON drip_variant_assignments(variant_id);
CREATE INDEX idx_drip_variant_assignments_contact ON drip_variant_assignments(contact_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_drip_ab_tests_updated_at
  BEFORE UPDATE ON drip_ab_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE drip_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_variant_assignments ENABLE ROW LEVEL SECURITY;

-- Users can access A/B tests in their organization's campaigns
CREATE POLICY "Users can access drip ab tests in their org" ON drip_ab_tests
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM drip_campaigns WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can access drip ab variants in their org" ON drip_ab_variants
  FOR ALL USING (
    test_id IN (
      SELECT id FROM drip_ab_tests WHERE campaign_id IN (
        SELECT id FROM drip_campaigns WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can access drip variant assignments in their org" ON drip_variant_assignments
  FOR ALL USING (
    test_id IN (
      SELECT id FROM drip_ab_tests WHERE campaign_id IN (
        SELECT id FROM drip_campaigns WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Update variant metrics on assignment events
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ab_variant_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  -- Get current metrics
  SELECT metrics INTO v_metrics
  FROM drip_ab_variants
  WHERE id = NEW.variant_id;

  -- Update delivery
  IF NEW.delivered_at IS NOT NULL AND (OLD IS NULL OR OLD.delivered_at IS NULL) THEN
    v_metrics = jsonb_set(v_metrics, '{delivered}', to_jsonb((v_metrics->>'delivered')::int + 1));
  END IF;

  -- Update read
  IF NEW.read_at IS NOT NULL AND (OLD IS NULL OR OLD.read_at IS NULL) THEN
    v_metrics = jsonb_set(v_metrics, '{read}', to_jsonb((v_metrics->>'read')::int + 1));
  END IF;

  -- Update replied
  IF NEW.replied_at IS NOT NULL AND (OLD IS NULL OR OLD.replied_at IS NULL) THEN
    v_metrics = jsonb_set(v_metrics, '{replied}', to_jsonb((v_metrics->>'replied')::int + 1));
  END IF;

  -- Update clicked
  IF NEW.clicked_at IS NOT NULL AND (OLD IS NULL OR OLD.clicked_at IS NULL) THEN
    v_metrics = jsonb_set(v_metrics, '{clicked}', to_jsonb((v_metrics->>'clicked')::int + 1));
  END IF;

  -- Recalculate rates
  IF (v_metrics->>'impressions')::int > 0 THEN
    v_metrics = jsonb_set(v_metrics, '{deliveryRate}',
      to_jsonb(ROUND(((v_metrics->>'delivered')::numeric / (v_metrics->>'impressions')::numeric) * 100, 2)));
  END IF;

  IF (v_metrics->>'delivered')::int > 0 THEN
    v_metrics = jsonb_set(v_metrics, '{readRate}',
      to_jsonb(ROUND(((v_metrics->>'read')::numeric / (v_metrics->>'delivered')::numeric) * 100, 2)));
    v_metrics = jsonb_set(v_metrics, '{replyRate}',
      to_jsonb(ROUND(((v_metrics->>'replied')::numeric / (v_metrics->>'delivered')::numeric) * 100, 2)));
    v_metrics = jsonb_set(v_metrics, '{clickRate}',
      to_jsonb(ROUND(((v_metrics->>'clicked')::numeric / (v_metrics->>'delivered')::numeric) * 100, 2)));
  END IF;

  -- Update the variant
  UPDATE drip_ab_variants
  SET metrics = v_metrics
  WHERE id = NEW.variant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variant_metrics_on_assignment
  AFTER INSERT OR UPDATE ON drip_variant_assignments
  FOR EACH ROW EXECUTE FUNCTION update_ab_variant_metrics();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE drip_ab_tests IS 'A/B tests for drip campaign message variants';
COMMENT ON TABLE drip_ab_variants IS 'Individual variants (message versions) within an A/B test';
COMMENT ON TABLE drip_variant_assignments IS 'Tracks which variant each contact received in a test';
