-- Advanced Demo Analytics Migration
-- This migration adds comprehensive analytics, A/B testing, and optimization tracking

-- Create advanced analytics tables

-- Demo heat map data for user interaction tracking
CREATE TABLE demo_heatmap_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  click_count INTEGER DEFAULT 0,
  hover_duration_seconds INTEGER DEFAULT 0,
  element_type TEXT NOT NULL,
  element_text TEXT,
  element_metadata JSONB DEFAULT '{}',
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('click', 'hover', 'scroll')),
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User journey tracking for flow analysis
CREATE TABLE demo_user_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  conversion_completed BOOLEAN DEFAULT false,
  drop_off_point TEXT,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictive scoring results
CREATE TABLE demo_predictive_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('conversion_probability', 'engagement_score', 'churn_risk')),
  score NUMERIC(5,2) NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  factors JSONB NOT NULL DEFAULT '[]',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing Tables

-- A/B test definitions
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  business_scenario TEXT NOT NULL CHECK (business_scenario IN ('retail', 'restaurant', 'real_estate', 'healthcare', 'education', 'ecommerce', 'automotive', 'travel', 'fitness', 'generic')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  traffic_allocation NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  variants JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '[]',
  confidence_level NUMERIC(5,2) NOT NULL DEFAULT 95.0,
  minimum_sample_size INTEGER NOT NULL DEFAULT 1000,
  winner_variant_id UUID,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test assignments tracking
CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  conversion_completed BOOLEAN DEFAULT false,
  conversion_value NUMERIC(10,2),
  session_metrics JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, test_id)
);

-- A/B test results storage
CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  results_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test events for tracking test lifecycle
CREATE TABLE ab_test_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion Optimization Tables

-- Conversion funnel analysis results
CREATE TABLE conversion_funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_scenario TEXT NOT NULL CHECK (business_scenario IN ('retail', 'restaurant', 'real_estate', 'healthcare', 'education', 'ecommerce', 'automotive', 'travel', 'fitness', 'generic')),
  steps JSONB NOT NULL DEFAULT '[]',
  overall_conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  bottlenecks JSONB NOT NULL DEFAULT '[]',
  optimization_opportunities JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead scoring and handoff tables

-- Lead records with comprehensive scoring
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  company TEXT,
  phone TEXT,
  business_scenario TEXT NOT NULL CHECK (business_scenario IN ('retail', 'restaurant', 'real_estate', 'healthcare', 'education', 'ecommerce', 'automotive', 'travel', 'fitness', 'generic')),
  lead_score JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'demo_scheduled', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost', 'nurturing')),
  source TEXT NOT NULL DEFAULT 'website_demo' CHECK (source IN ('website_demo', 'landing_page', 'referral', 'advertising', 'social_media', 'content', 'direct')),
  utm_data JSONB DEFAULT '{}',
  session_data JSONB NOT NULL,
  engagement_timeline JSONB NOT NULL DEFAULT '[]',
  sales_notes JSONB NOT NULL DEFAULT '[]',
  follow_up_actions JSONB NOT NULL DEFAULT '[]',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversion_probability NUMERIC(5,2) NOT NULL DEFAULT 0,
  estimated_value NUMERIC(10,2),
  lifecycle_stage TEXT NOT NULL DEFAULT 'visitor' CHECK (lifecycle_stage IN ('visitor', 'lead', 'marketing_qualified_lead', 'sales_qualified_lead', 'opportunity', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead handoff rules for automation
CREATE TABLE lead_handoff_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  trigger_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM integration configurations
CREATE TABLE crm_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('salesforce', 'hubspot', 'pipedrive', 'custom')),
  configuration JSONB NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '[]',
  sync_rules JSONB NOT NULL DEFAULT '[]',
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing automation workflows
CREATE TABLE marketing_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_conditions JSONB NOT NULL DEFAULT '[]',
  workflow_steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  performance_metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimization insights and alerts
CREATE TABLE optimization_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('trend', 'anomaly', 'opportunity', 'alert')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_metrics JSONB DEFAULT '[]',
  time_period TEXT,
  data_points JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  auto_actionable BOOLEAN DEFAULT false,
  business_scenario TEXT CHECK (business_scenario IN ('retail', 'restaurant', 'real_estate', 'healthcare', 'education', 'ecommerce', 'automotive', 'travel', 'fitness', 'generic')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization

-- Heat map data indexes
CREATE INDEX idx_demo_heatmap_session_id ON demo_heatmap_data(session_id);
CREATE INDEX idx_demo_heatmap_page_path ON demo_heatmap_data(page_path);
CREATE INDEX idx_demo_heatmap_element_id ON demo_heatmap_data(element_id);
CREATE INDEX idx_demo_heatmap_timestamp ON demo_heatmap_data(timestamp DESC);
CREATE INDEX idx_demo_heatmap_interaction_type ON demo_heatmap_data(interaction_type);

-- User journey indexes
CREATE INDEX idx_demo_journeys_session_id ON demo_user_journeys(session_id);
CREATE INDEX idx_demo_journeys_journey_id ON demo_user_journeys(journey_id);
CREATE INDEX idx_demo_journeys_conversion ON demo_user_journeys(conversion_completed);
CREATE INDEX idx_demo_journeys_engagement ON demo_user_journeys(engagement_score DESC);

-- Predictive scores indexes
CREATE INDEX idx_demo_scores_session_id ON demo_predictive_scores(session_id);
CREATE INDEX idx_demo_scores_model_type ON demo_predictive_scores(model_type);
CREATE INDEX idx_demo_scores_score ON demo_predictive_scores(score DESC);
CREATE INDEX idx_demo_scores_timestamp ON demo_predictive_scores(timestamp DESC);

-- A/B testing indexes
CREATE INDEX idx_ab_tests_business_scenario ON ab_tests(business_scenario);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_created_by ON ab_tests(created_by);
CREATE INDEX idx_ab_tests_start_date ON ab_tests(start_date DESC);

CREATE INDEX idx_ab_assignments_session_id ON ab_test_assignments(session_id);
CREATE INDEX idx_ab_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX idx_ab_assignments_variant_id ON ab_test_assignments(variant_id);
CREATE INDEX idx_ab_assignments_conversion ON ab_test_assignments(conversion_completed);

CREATE INDEX idx_ab_results_test_id ON ab_test_results(test_id);
CREATE INDEX idx_ab_results_generated_at ON ab_test_results(generated_at DESC);

CREATE INDEX idx_ab_events_test_id ON ab_test_events(test_id);
CREATE INDEX idx_ab_events_type ON ab_test_events(event_type);
CREATE INDEX idx_ab_events_timestamp ON ab_test_events(timestamp DESC);

-- Conversion funnel indexes
CREATE INDEX idx_conversion_funnels_scenario ON conversion_funnels(business_scenario);
CREATE INDEX idx_conversion_funnels_conversion_rate ON conversion_funnels(overall_conversion_rate DESC);
CREATE INDEX idx_conversion_funnels_created_at ON conversion_funnels(created_at DESC);

-- Lead indexes
CREATE INDEX idx_leads_session_id ON leads(session_id);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_business_scenario ON leads(business_scenario);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_conversion_probability ON leads(conversion_probability DESC);
CREATE INDEX idx_leads_lifecycle_stage ON leads(lifecycle_stage);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_last_activity ON leads(last_activity_at DESC);
CREATE INDEX idx_leads_estimated_value ON leads(estimated_value DESC) WHERE estimated_value IS NOT NULL;

-- Lead handoff rules indexes
CREATE INDEX idx_handoff_rules_active ON lead_handoff_rules(is_active, priority DESC) WHERE is_active = true;
CREATE INDEX idx_handoff_rules_trigger_count ON lead_handoff_rules(trigger_count DESC);

-- CRM integration indexes
CREATE INDEX idx_crm_integrations_provider ON crm_integrations(provider);
CREATE INDEX idx_crm_integrations_active ON crm_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_crm_integrations_last_sync ON crm_integrations(last_sync_at DESC);

-- Marketing automation indexes
CREATE INDEX idx_marketing_automations_active ON marketing_automations(is_active) WHERE is_active = true;
CREATE INDEX idx_marketing_automations_created_by ON marketing_automations(created_by);

-- Optimization insights indexes
CREATE INDEX idx_optimization_insights_type ON optimization_insights(type);
CREATE INDEX idx_optimization_insights_severity ON optimization_insights(severity);
CREATE INDEX idx_optimization_insights_scenario ON optimization_insights(business_scenario) WHERE business_scenario IS NOT NULL;
CREATE INDEX idx_optimization_insights_created_at ON optimization_insights(created_at DESC);
CREATE INDEX idx_optimization_insights_actionable ON optimization_insights(auto_actionable) WHERE auto_actionable = true;

-- Add updated_at triggers
CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ab_assignments_updated_at BEFORE UPDATE ON ab_test_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversion_funnels_updated_at BEFORE UPDATE ON conversion_funnels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_handoff_rules_updated_at BEFORE UPDATE ON lead_handoff_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_integrations_updated_at BEFORE UPDATE ON crm_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_automations_updated_at BEFORE UPDATE ON marketing_automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Demo heat map data - users can only access their organization's data
ALTER TABLE demo_heatmap_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their organization heatmap data" ON demo_heatmap_data
  FOR ALL USING (
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can access all heatmap data" ON demo_heatmap_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- User journeys - same pattern
ALTER TABLE demo_user_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their organization journey data" ON demo_user_journeys
  FOR ALL USING (
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can access all journey data" ON demo_user_journeys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Predictive scores
ALTER TABLE demo_predictive_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their organization predictive scores" ON demo_predictive_scores
  FOR ALL USING (
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can access all predictive scores" ON demo_predictive_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- A/B tests - users can manage tests they created or for their organization
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own A/B tests" ON ab_tests
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'analyst'))
    )
  );

-- A/B test assignments
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access test assignments for their organization" ON ab_test_assignments
  FOR ALL USING (
    test_id IN (
      SELECT at.id FROM ab_tests at
      WHERE at.created_by = auth.uid()
    ) OR
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- A/B test results
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their test results" ON ab_test_results
  FOR SELECT USING (
    test_id IN (
      SELECT at.id FROM ab_tests at
      WHERE at.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'analyst'))
    )
  );

-- A/B test events
ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their test events" ON ab_test_events
  FOR SELECT USING (
    test_id IN (
      SELECT at.id FROM ab_tests at
      WHERE at.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'analyst'))
    )
  );

-- Conversion funnels
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access funnel data" ON conversion_funnels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'analyst'))
    )
  );

-- Leads - users can only access leads assigned to them or in their organization
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access assigned leads" ON leads
  FOR ALL USING (
    assigned_to = auth.uid() OR
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'sales_manager'))
    )
  );

-- Lead handoff rules - admins can manage
ALTER TABLE lead_handoff_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage handoff rules" ON lead_handoff_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'sales_manager'))
    )
  );

-- CRM integrations - admins only
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage CRM integrations" ON crm_integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role = 'admin')
    )
  );

-- Marketing automations - marketing team and admins
ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing team can manage automations" ON marketing_automations
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'marketing_manager'))
    )
  );

-- Optimization insights - analysts and admins
ALTER TABLE optimization_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts can view optimization insights" ON optimization_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role IN ('admin', 'analyst', 'marketing_manager'))
    )
  );

-- Grant permissions
GRANT SELECT ON demo_heatmap_data TO authenticated;
GRANT ALL ON demo_heatmap_data TO authenticated;

GRANT SELECT ON demo_user_journeys TO authenticated;
GRANT ALL ON demo_user_journeys TO authenticated;

GRANT SELECT ON demo_predictive_scores TO authenticated;
GRANT ALL ON demo_predictive_scores TO authenticated;

GRANT SELECT ON ab_tests TO authenticated;
GRANT ALL ON ab_tests TO authenticated;

GRANT SELECT ON ab_test_assignments TO authenticated;
GRANT ALL ON ab_test_assignments TO authenticated;

GRANT SELECT ON ab_test_results TO authenticated;
GRANT INSERT ON ab_test_results TO authenticated;

GRANT SELECT ON ab_test_events TO authenticated;
GRANT INSERT ON ab_test_events TO authenticated;

GRANT SELECT ON conversion_funnels TO authenticated;
GRANT INSERT ON conversion_funnels TO authenticated;

GRANT SELECT ON leads TO authenticated;
GRANT ALL ON leads TO authenticated;

GRANT SELECT ON lead_handoff_rules TO authenticated;
GRANT ALL ON lead_handoff_rules TO authenticated;

GRANT SELECT ON crm_integrations TO authenticated;
GRANT ALL ON crm_integrations TO authenticated;

GRANT SELECT ON marketing_automations TO authenticated;
GRANT ALL ON marketing_automations TO authenticated;

GRANT SELECT ON optimization_insights TO authenticated;
GRANT INSERT ON optimization_insights TO authenticated;

-- Create helpful functions for analytics

-- Function to calculate engagement score for a session
CREATE OR REPLACE FUNCTION calculate_session_engagement_score(
  p_session_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_time_score INTEGER := 0;
  v_interaction_score INTEGER := 0;
  v_feature_score INTEGER := 0;
  v_total_score INTEGER := 0;
  v_session_duration INTEGER;
  v_interaction_count INTEGER;
  v_feature_count INTEGER;
BEGIN
  -- Get session duration in seconds
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER
  INTO v_session_duration
  FROM demo_sessions
  WHERE id = p_session_id;

  -- Get interaction count
  SELECT COUNT(*)
  INTO v_interaction_count
  FROM demo_session_activities
  WHERE session_id = p_session_id;

  -- Get unique features used
  SELECT COUNT(DISTINCT activity_data->>'feature')
  INTO v_feature_count
  FROM demo_session_activities
  WHERE session_id = p_session_id
    AND activity_type = 'feature_interaction'
    AND activity_data->>'feature' IS NOT NULL;

  -- Calculate scores (max 30, 40, 30 respectively)
  v_time_score := LEAST((v_session_duration / 300.0 * 30)::INTEGER, 30); -- 5 minutes = 30 points
  v_interaction_score := LEAST((v_interaction_count / 20.0 * 40)::INTEGER, 40); -- 20 interactions = 40 points
  v_feature_score := LEAST((v_feature_count / 5.0 * 30)::INTEGER, 30); -- 5 features = 30 points

  v_total_score := v_time_score + v_interaction_score + v_feature_score;

  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversion rate for a business scenario
CREATE OR REPLACE FUNCTION get_scenario_conversion_rate(
  p_business_scenario TEXT,
  p_days_back INTEGER DEFAULT 30
) RETURNS NUMERIC AS $$
DECLARE
  v_total_sessions INTEGER;
  v_conversions INTEGER;
  v_conversion_rate NUMERIC;
BEGIN
  -- Get total sessions
  SELECT COUNT(*)
  INTO v_total_sessions
  FROM demo_sessions
  WHERE business_scenario = p_business_scenario
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  -- Get conversions (sessions with signup_clicked activity)
  SELECT COUNT(DISTINCT ds.id)
  INTO v_conversions
  FROM demo_sessions ds
  JOIN demo_session_activities dsa ON dsa.session_id = ds.id
  WHERE ds.business_scenario = p_business_scenario
    AND ds.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND dsa.activity_type = 'signup_clicked';

  -- Calculate conversion rate
  IF v_total_sessions > 0 THEN
    v_conversion_rate := (v_conversions::NUMERIC / v_total_sessions::NUMERIC) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;

  RETURN ROUND(v_conversion_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify drop-off points in a funnel
CREATE OR REPLACE FUNCTION analyze_funnel_dropoffs(
  p_business_scenario TEXT,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  step_name TEXT,
  entries INTEGER,
  completions INTEGER,
  drop_off_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT
      step_order,
      step_name,
      required_action
    FROM (VALUES
      (1, 'Landing Page', 'page_view'),
      (2, 'Demo Start', 'demo_session_created'),
      (3, 'Feature Exploration', 'feature_interaction'),
      (4, 'Signup Intent', 'signup_clicked'),
      (5, 'Form Submission', 'form_submission')
    ) AS steps(step_order, step_name, required_action)
  ),
  step_metrics AS (
    SELECT
      fs.step_name,
      fs.step_order,
      COUNT(DISTINCT ds.id) as step_entries,
      COUNT(DISTINCT CASE
        WHEN dsa.activity_type = fs.required_action THEN ds.id
      END) as step_completions
    FROM funnel_steps fs
    CROSS JOIN demo_sessions ds
    LEFT JOIN demo_session_activities dsa ON dsa.session_id = ds.id
    WHERE ds.business_scenario = p_business_scenario
      AND ds.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY fs.step_name, fs.step_order
  )
  SELECT
    sm.step_name,
    sm.step_entries as entries,
    sm.step_completions as completions,
    CASE
      WHEN sm.step_entries > 0
      THEN ROUND(((sm.step_entries - sm.step_completions)::NUMERIC / sm.step_entries::NUMERIC) * 100, 2)
      ELSE 0
    END as drop_off_rate
  FROM step_metrics sm
  ORDER BY sm.step_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time demo metrics
CREATE OR REPLACE FUNCTION get_realtime_demo_metrics()
RETURNS TABLE (
  active_sessions INTEGER,
  sessions_today INTEGER,
  conversions_today INTEGER,
  avg_engagement_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM demo_sessions
     WHERE status = 'active' AND expires_at > NOW())::INTEGER as active_sessions,

    (SELECT COUNT(*) FROM demo_sessions
     WHERE created_at >= CURRENT_DATE)::INTEGER as sessions_today,

    (SELECT COUNT(DISTINCT dsa.session_id) FROM demo_session_activities dsa
     JOIN demo_sessions ds ON ds.id = dsa.session_id
     WHERE dsa.activity_type = 'signup_clicked'
       AND dsa.created_at >= CURRENT_DATE)::INTEGER as conversions_today,

    (SELECT ROUND(AVG(calculate_session_engagement_score(id)), 2)
     FROM demo_sessions
     WHERE created_at >= CURRENT_DATE)::NUMERIC as avg_engagement_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create some sample optimization insights
INSERT INTO optimization_insights (type, severity, title, description, affected_metrics, recommendations, auto_actionable, business_scenario) VALUES
('opportunity', 'warning', 'High Drop-off Rate in Feature Exploration', 'Users are dropping off at a 45% rate when exploring features in the demo',
 '["feature_engagement", "conversion_rate"]',
 '["Add guided tooltips for key features", "Simplify feature navigation", "Create interactive tutorial overlay"]',
 true, 'retail'),

('trend', 'info', 'Increasing Mobile Demo Usage', 'Mobile demo sessions have increased by 23% in the last week',
 '["session_count", "device_distribution"]',
 '["Optimize mobile demo experience", "Test mobile-specific conversion flows"]',
 false, null),

('alert', 'critical', 'A/B Test Statistical Significance Reached', 'Test "CTA Button Color" has reached 95% confidence level with 12% improvement',
 '["conversion_rate", "click_through_rate"]',
 '["Deploy winning variant immediately", "Create follow-up test for further optimization"]',
 true, 'ecommerce'),

('anomaly', 'warning', 'Unusual Spike in Demo Abandonment', 'Demo abandonment rate increased by 35% in the last 24 hours',
 '["abandonment_rate", "session_duration"]',
 '["Check for technical issues", "Review recent changes to demo flow", "Monitor error logs"]',
 false, null);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_session_engagement_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scenario_conversion_rate(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_funnel_dropoffs(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_demo_metrics() TO authenticated;