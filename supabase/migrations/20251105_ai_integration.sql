-- Migration: AI Integration
-- Description: Add tables and policies for AI features
-- Created: 2025-11-05

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AI Settings Table
-- ============================================================================
-- Stores organization-level AI configuration
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Feature toggles
  enabled BOOLEAN DEFAULT false,
  features_enabled JSONB DEFAULT '{
    "draft_suggestions": true,
    "auto_response": false,
    "sentiment_analysis": true,
    "summarization": true,
    "template_generation": true,
    "translation": false
  }'::jsonb,

  -- Model configuration
  default_model TEXT DEFAULT 'anthropic/claude-3.5-sonnet',
  fallback_model TEXT DEFAULT 'anthropic/claude-3-haiku',
  max_tokens INTEGER DEFAULT 1000,
  temperature NUMERIC(3,2) DEFAULT 0.7,

  -- Budget management
  monthly_budget_usd NUMERIC(10,2) DEFAULT 100.00,
  alert_threshold INTEGER DEFAULT 80,

  -- Auto-response configuration
  auto_response_conditions JSONB DEFAULT '{
    "business_hours_only": true,
    "max_response_per_conversation": 3,
    "require_high_confidence": true,
    "excluded_topics": []
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id),
  CHECK (temperature >= 0 AND temperature <= 2),
  CHECK (max_tokens >= 100 AND max_tokens <= 4000),
  CHECK (monthly_budget_usd >= 0),
  CHECK (alert_threshold >= 0 AND alert_threshold <= 100)
);

-- Index for fast organization lookups
CREATE INDEX idx_ai_settings_organization ON ai_settings(organization_id);

-- RLS Policies for ai_settings
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization AI settings"
  ON ai_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their organization AI settings"
  ON ai_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- AI Responses Table
-- ============================================================================
-- Tracks all AI interactions for analytics and auditing
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Request details
  feature TEXT NOT NULL CHECK (feature IN (
    'draft', 'auto_response', 'sentiment', 'summary', 'template', 'translation'
  )),
  model_used TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,

  -- Response details
  response_data JSONB NOT NULL,
  latency_ms INTEGER NOT NULL,

  -- Cost tracking
  cost_usd NUMERIC(10,6) NOT NULL,

  -- Quality metrics
  confidence_score NUMERIC(3,2),
  user_feedback TEXT CHECK (user_feedback IN ('accepted', 'rejected', 'modified', NULL)),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (prompt_tokens > 0),
  CHECK (completion_tokens >= 0),
  CHECK (total_tokens > 0),
  CHECK (latency_ms > 0),
  CHECK (cost_usd >= 0),
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Indexes for analytics queries
CREATE INDEX idx_ai_responses_organization ON ai_responses(organization_id);
CREATE INDEX idx_ai_responses_conversation ON ai_responses(conversation_id);
CREATE INDEX idx_ai_responses_feature ON ai_responses(feature);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at DESC);
CREATE INDEX idx_ai_responses_org_created ON ai_responses(organization_id, created_at DESC);

-- Composite index for common analytics queries
CREATE INDEX idx_ai_responses_analytics ON ai_responses(
  organization_id,
  feature,
  created_at DESC
);

-- RLS Policies for ai_responses
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization AI responses"
  ON ai_responses FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert AI responses"
  ON ai_responses FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Conversation AI Metadata Table
-- ============================================================================
-- Stores AI-generated metadata for conversations
CREATE TABLE IF NOT EXISTS conversation_ai_metadata (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Sentiment analysis results
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL)),
  sentiment_score NUMERIC(3,2),
  sentiment_confidence NUMERIC(3,2),
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical', NULL)),

  -- Conversation summary
  summary TEXT,
  key_points TEXT[],
  next_steps TEXT[],
  topics TEXT[],

  -- Auto-response metadata
  auto_response_count INTEGER DEFAULT 0,
  last_auto_response_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1)),
  CHECK (sentiment_confidence IS NULL OR (sentiment_confidence >= 0 AND sentiment_confidence <= 1)),
  CHECK (auto_response_count >= 0)
);

-- Indexes for fast lookups
CREATE INDEX idx_conv_ai_metadata_organization ON conversation_ai_metadata(organization_id);
CREATE INDEX idx_conv_ai_metadata_sentiment ON conversation_ai_metadata(sentiment);
CREATE INDEX idx_conv_ai_metadata_urgency ON conversation_ai_metadata(urgency_level);
CREATE INDEX idx_conv_ai_metadata_updated ON conversation_ai_metadata(updated_at DESC);

-- RLS Policies for conversation_ai_metadata
ALTER TABLE conversation_ai_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization conversation AI metadata"
  ON conversation_ai_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization conversation AI metadata"
  ON conversation_ai_metadata FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Materialized View for AI Analytics
-- ============================================================================
-- Aggregated AI usage statistics for fast dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_usage_analytics AS
SELECT
  organization_id,
  feature,
  DATE(created_at) as usage_date,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(latency_ms) as avg_latency_ms,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN user_feedback = 'accepted' THEN 1 END) as accepted_count,
  COUNT(CASE WHEN user_feedback = 'rejected' THEN 1 END) as rejected_count
FROM ai_responses
GROUP BY organization_id, feature, DATE(created_at);

-- Index for fast analytics queries
CREATE UNIQUE INDEX idx_ai_usage_analytics_unique ON ai_usage_analytics(
  organization_id,
  feature,
  usage_date
);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_ai_usage_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Functions for AI Budget Management
-- ============================================================================

-- Check if organization is within budget
CREATE OR REPLACE FUNCTION check_ai_budget(org_id UUID)
RETURNS TABLE(
  within_budget BOOLEAN,
  current_spend NUMERIC,
  monthly_budget NUMERIC,
  percent_used NUMERIC,
  alert_threshold INTEGER
) AS $$
DECLARE
  settings_row RECORD;
  current_month_spend NUMERIC;
BEGIN
  -- Get organization settings
  SELECT * INTO settings_row
  FROM ai_settings
  WHERE organization_id = org_id;

  -- If no settings, return safe defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 0.0, 100.0, 0.0, 80;
    RETURN;
  END IF;

  -- Calculate current month spend
  SELECT COALESCE(SUM(cost_usd), 0) INTO current_month_spend
  FROM ai_responses
  WHERE organization_id = org_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP);

  -- Return budget status
  RETURN QUERY SELECT
    current_month_spend <= settings_row.monthly_budget_usd,
    current_month_spend,
    settings_row.monthly_budget_usd,
    CASE
      WHEN settings_row.monthly_budget_usd > 0
      THEN (current_month_spend / settings_row.monthly_budget_usd * 100)
      ELSE 0
    END,
    settings_row.alert_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger to update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER conversation_ai_metadata_updated_at
  BEFORE UPDATE ON conversation_ai_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Create default AI settings for existing organizations
INSERT INTO ai_settings (organization_id, enabled)
SELECT id, false FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON ai_settings TO authenticated;
GRANT SELECT ON ai_responses TO authenticated;
GRANT SELECT ON conversation_ai_metadata TO authenticated;
GRANT SELECT ON ai_usage_analytics TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_ai_budget(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_ai_usage_analytics() TO authenticated;
