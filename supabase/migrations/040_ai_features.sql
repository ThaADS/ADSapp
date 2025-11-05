-- Migration 040: AI Features Infrastructure
-- OpenRouter AI integration for intelligent message handling
-- Created: 2025-11-05

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AI RESPONSES TRACKING
-- ============================================================================
-- Track all AI-generated responses for analytics and cost tracking
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- AI Model Information
  model VARCHAR(100) NOT NULL,              -- e.g., 'anthropic/claude-3.5-sonnet'
  feature VARCHAR(50) NOT NULL,             -- 'draft', 'auto_response', 'sentiment', 'summary', 'template'

  -- Request/Response Data
  prompt TEXT NOT NULL,                     -- The prompt sent to AI
  response TEXT NOT NULL,                   -- The AI-generated response

  -- Performance Metrics
  tokens_used INTEGER,                      -- Total tokens consumed
  cost_usd DECIMAL(10, 6),                  -- Cost in USD
  latency_ms INTEGER,                       -- Response time in milliseconds

  -- User Feedback
  feedback VARCHAR(20),                     -- 'accepted', 'rejected', 'edited', 'ignored'
  edited_response TEXT,                     -- If user edited the AI response

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB        -- Additional context
);

-- Indexes for performance
CREATE INDEX idx_ai_responses_org_id ON ai_responses(organization_id);
CREATE INDEX idx_ai_responses_conversation_id ON ai_responses(conversation_id);
CREATE INDEX idx_ai_responses_feature ON ai_responses(feature);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at DESC);
CREATE INDEX idx_ai_responses_feedback ON ai_responses(feedback) WHERE feedback IS NOT NULL;

-- ============================================================================
-- AI SETTINGS PER ORGANIZATION
-- ============================================================================
-- Configure AI features and preferences per organization
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Feature Toggles
  enabled BOOLEAN DEFAULT true,
  auto_response_enabled BOOLEAN DEFAULT false,
  draft_suggestions_enabled BOOLEAN DEFAULT true,
  sentiment_analysis_enabled BOOLEAN DEFAULT true,
  translation_enabled BOOLEAN DEFAULT false,
  summarization_enabled BOOLEAN DEFAULT true,

  -- Model Configuration
  preferred_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
  fallback_model VARCHAR(100) DEFAULT 'anthropic/claude-3-haiku',
  max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
  temperature DECIMAL(3, 2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),

  -- Auto-Response Configuration
  auto_response_conditions JSONB DEFAULT '{
    "outsideBusinessHours": true,
    "noAgentAvailable": true,
    "maxQueueTime": 5
  }'::JSONB,

  auto_response_tone VARCHAR(20) DEFAULT 'professional' CHECK (auto_response_tone IN ('professional', 'friendly', 'casual')),
  auto_response_language VARCHAR(10) DEFAULT 'nl',

  -- Cost Management
  monthly_budget_usd DECIMAL(10, 2),        -- Optional monthly spending limit
  current_month_spend_usd DECIMAL(10, 6) DEFAULT 0,
  budget_alert_threshold DECIMAL(3, 2) DEFAULT 0.8, -- Alert at 80% of budget

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_ai_settings_org_id ON ai_settings(organization_id);

-- ============================================================================
-- CONVERSATION AI METADATA
-- ============================================================================
-- Store AI-analyzed metadata about conversations
CREATE TABLE IF NOT EXISTS conversation_ai_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Conversation Analysis
  summary TEXT,                             -- AI-generated summary
  key_points TEXT[],                        -- Important points extracted
  next_steps TEXT[],                        -- Suggested follow-up actions
  resolved_issues TEXT[],                   -- Identified resolved issues
  open_questions TEXT[],                    -- Unresolved questions

  -- Sentiment Analysis
  sentiment VARCHAR(20),                    -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score DECIMAL(3, 2),            -- -1.0 (very negative) to 1.0 (very positive)
  sentiment_confidence DECIMAL(3, 2),       -- 0.0 to 1.0

  -- Language & Intent
  detected_language VARCHAR(10),
  primary_intent VARCHAR(50),               -- 'question', 'complaint', 'request', 'feedback', etc.
  topics TEXT[],                            -- Identified conversation topics

  -- Urgency & Priority
  urgency VARCHAR(20) DEFAULT 'low',        -- 'low', 'medium', 'high', 'critical'
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),

  -- Analysis Metadata
  last_analyzed_at TIMESTAMPTZ,
  analysis_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversation_ai_metadata_conversation_id ON conversation_ai_metadata(conversation_id);
CREATE INDEX idx_conversation_ai_metadata_sentiment ON conversation_ai_metadata(sentiment);
CREATE INDEX idx_conversation_ai_metadata_urgency ON conversation_ai_metadata(urgency);
CREATE INDEX idx_conversation_ai_metadata_last_analyzed ON conversation_ai_metadata(last_analyzed_at DESC);

-- ============================================================================
-- MESSAGE TEMPLATES - AI ENHANCEMENTS
-- ============================================================================
-- Add AI-related columns to existing message_templates table
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'ai_generated') THEN
    ALTER TABLE message_templates ADD COLUMN ai_generated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'ai_prompt') THEN
    ALTER TABLE message_templates ADD COLUMN ai_prompt TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'ai_model') THEN
    ALTER TABLE message_templates ADD COLUMN ai_model VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'usage_count') THEN
    ALTER TABLE message_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'effectiveness_score') THEN
    ALTER TABLE message_templates ADD COLUMN effectiveness_score DECIMAL(3, 2); -- Track template performance
  END IF;
END $$;

-- Index for AI-generated templates
CREATE INDEX IF NOT EXISTS idx_message_templates_ai_generated ON message_templates(ai_generated) WHERE ai_generated = true;

-- ============================================================================
-- AI USAGE ANALYTICS
-- ============================================================================
-- Materialized view for AI usage analytics per organization
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_usage_analytics AS
SELECT
  organization_id,
  DATE_TRUNC('day', created_at) as usage_date,
  feature,
  model,
  COUNT(*) as request_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(latency_ms) as avg_latency_ms,
  COUNT(CASE WHEN feedback = 'accepted' THEN 1 END) as accepted_count,
  COUNT(CASE WHEN feedback = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN feedback = 'edited' THEN 1 END) as edited_count,
  (COUNT(CASE WHEN feedback = 'accepted' THEN 1 END)::FLOAT /
   NULLIF(COUNT(CASE WHEN feedback IS NOT NULL THEN 1 END), 0)) * 100 as acceptance_rate
FROM ai_responses
GROUP BY organization_id, DATE_TRUNC('day', created_at), feature, model;

-- Index for analytics view
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_org_date ON ai_usage_analytics(organization_id, usage_date DESC);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_ai_usage_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ai_responses table
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_responses ON ai_responses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ai_settings table
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_settings ON ai_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- conversation_ai_metadata table
ALTER TABLE conversation_ai_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_conversation_ai_metadata ON conversation_ai_metadata
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update ai_settings.updated_at
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_settings_updated_at();

-- Function to update conversation_ai_metadata.updated_at
CREATE OR REPLACE FUNCTION update_conversation_ai_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_ai_metadata_updated_at
  BEFORE UPDATE ON conversation_ai_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_ai_metadata_updated_at();

-- Function to track monthly AI spending
CREATE OR REPLACE FUNCTION track_ai_spending()
RETURNS TRIGGER AS $$
DECLARE
  current_month_start TIMESTAMPTZ;
BEGIN
  -- Get start of current month
  current_month_start := DATE_TRUNC('month', NOW());

  -- Update current month spend for the organization
  UPDATE ai_settings
  SET current_month_spend_usd = (
    SELECT COALESCE(SUM(cost_usd), 0)
    FROM ai_responses
    WHERE organization_id = NEW.organization_id
    AND created_at >= current_month_start
  )
  WHERE organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_ai_spending
  AFTER INSERT ON ai_responses
  FOR EACH ROW
  EXECUTE FUNCTION track_ai_spending();

-- Function to check budget limits
CREATE OR REPLACE FUNCTION check_ai_budget_limit(
  p_organization_id UUID,
  p_estimated_cost DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_new_spend DECIMAL;
BEGIN
  -- Get AI settings for organization
  SELECT * INTO v_settings
  FROM ai_settings
  WHERE organization_id = p_organization_id;

  -- If no budget set, allow
  IF v_settings.monthly_budget_usd IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Calculate new spend
  v_new_spend := v_settings.current_month_spend_usd + p_estimated_cost;

  -- Check if within budget
  RETURN v_new_spend <= v_settings.monthly_budget_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize AI settings for new organizations
CREATE OR REPLACE FUNCTION initialize_ai_settings_for_org()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_ai_settings
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION initialize_ai_settings_for_org();

-- ============================================================================
-- HELPER FUNCTIONS FOR QUERYING
-- ============================================================================

-- Get AI usage summary for organization
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL,
  avg_latency_ms DECIMAL,
  acceptance_rate DECIMAL,
  by_feature JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    SUM(tokens_used)::BIGINT as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    AVG(latency_ms) as avg_latency_ms,
    (COUNT(CASE WHEN feedback = 'accepted' THEN 1 END)::FLOAT /
     NULLIF(COUNT(CASE WHEN feedback IS NOT NULL THEN 1 END), 0) * 100) as acceptance_rate,
    jsonb_object_agg(
      feature,
      jsonb_build_object(
        'count', COUNT(*),
        'cost', SUM(cost_usd)
      )
    ) as by_feature
  FROM ai_responses
  WHERE organization_id = p_organization_id
  AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ai_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_ai_metadata TO authenticated;
GRANT SELECT ON ai_usage_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION check_ai_budget_limit TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE ai_responses IS 'Tracks all AI-generated responses for analytics, cost tracking, and quality improvement';
COMMENT ON TABLE ai_settings IS 'AI feature configuration and preferences per organization';
COMMENT ON TABLE conversation_ai_metadata IS 'AI-analyzed metadata about conversations (sentiment, summary, topics)';
COMMENT ON MATERIALIZED VIEW ai_usage_analytics IS 'Aggregated AI usage statistics per organization';

COMMENT ON COLUMN ai_responses.feature IS 'Type of AI feature: draft, auto_response, sentiment, summary, template';
COMMENT ON COLUMN ai_responses.feedback IS 'User feedback: accepted, rejected, edited, ignored';
COMMENT ON COLUMN ai_settings.auto_response_conditions IS 'JSON configuration for when to trigger auto-responses';
COMMENT ON COLUMN conversation_ai_metadata.sentiment_score IS 'Sentiment score from -1.0 (very negative) to 1.0 (very positive)';
COMMENT ON COLUMN conversation_ai_metadata.urgency IS 'Conversation urgency level: low, medium, high, critical';

-- Migration complete
-- Run: SELECT * FROM ai_settings WHERE organization_id = '<your-org-id>' to verify
