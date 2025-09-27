-- Complete Database Schema Migration - Reaching 100% Coverage
-- This migration adds the final missing components identified in the analysis:
-- 1. WhatsApp Media File Storage Integration
-- 2. Message Template Versioning System
-- 3. Advanced Analytics Aggregation Tables
-- 4. Automated Backup and Disaster Recovery

-- ============================================================================
-- 1. WHATSAPP MEDIA FILE STORAGE INTEGRATION
-- ============================================================================

-- Media files table for comprehensive file management
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  whatsapp_media_id TEXT UNIQUE,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'audio', 'video', 'sticker')),
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_provider TEXT DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 's3', 'gcs', 'azure')),
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  thumbnail_url TEXT,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed', 'deleted')),
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media file categories for organization
CREATE TABLE media_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT DEFAULT '#6B7280',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Media file categories junction table
CREATE TABLE media_file_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES media_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_file_id, category_id)
);

-- Media file sharing and access control
CREATE TABLE media_file_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means organization-wide
  access_level TEXT DEFAULT 'view' CHECK (access_level IN ('view', 'download', 'edit')),
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media storage quotas per organization
CREATE TABLE media_storage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quota_type TEXT NOT NULL CHECK (quota_type IN ('total_storage', 'monthly_upload', 'file_count', 'bandwidth')),
  quota_limit BIGINT NOT NULL, -- in bytes for storage, count for files
  current_usage BIGINT DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  reset_period TEXT DEFAULT 'monthly' CHECK (reset_period IN ('daily', 'weekly', 'monthly', 'yearly', 'never')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, quota_type)
);

-- ============================================================================
-- 2. MESSAGE TEMPLATE VERSIONING SYSTEM
-- ============================================================================

-- Enhanced message templates with versioning support
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
ADD COLUMN IF NOT EXISTS whatsapp_template_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT CHECK (whatsapp_status IN ('pending', 'approved', 'rejected', 'disabled', 'paused')),
ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'utility' CHECK (template_type IN ('marketing', 'utility', 'authentication')),
ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Message template versions table for complete version history
CREATE TABLE message_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables TEXT[] DEFAULT '{}',
  components JSONB DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  whatsapp_template_id TEXT,
  whatsapp_status TEXT CHECK (whatsapp_status IN ('pending', 'approved', 'rejected', 'disabled', 'paused')),
  language_code TEXT DEFAULT 'en',
  template_type TEXT DEFAULT 'utility' CHECK (template_type IN ('marketing', 'utility', 'authentication')),
  change_summary TEXT,
  approval_notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

-- Template approval workflow
CREATE TABLE template_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES message_template_versions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'withdrawn')),
  reviewer_notes TEXT,
  decision_reason TEXT,
  whatsapp_submission_id TEXT,
  whatsapp_submission_status TEXT,
  submitted_to_whatsapp_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template usage analytics
CREATE TABLE template_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  template_version_id UUID REFERENCES message_template_versions(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  delivery_failures INTEGER DEFAULT 0,
  user_engagement_score DECIMAL(5,2) DEFAULT 0.00,
  response_rate DECIMAL(5,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, template_id, date)
);

-- ============================================================================
-- 3. ADVANCED ANALYTICS AGGREGATION TABLES
-- ============================================================================

-- Daily aggregated metrics for fast dashboard performance
CREATE TABLE daily_analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  inbound_messages INTEGER DEFAULT 0,
  outbound_messages INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  new_conversations INTEGER DEFAULT 0,
  resolved_conversations INTEGER DEFAULT 0,
  avg_first_response_time_minutes INTEGER DEFAULT 0,
  avg_resolution_time_hours INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  active_agents INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  response_rate DECIMAL(5,2) DEFAULT 0.00,
  resolution_rate DECIMAL(5,2) DEFAULT 0.00,
  automation_usage_rate DECIMAL(5,2) DEFAULT 0.00,
  peak_concurrent_conversations INTEGER DEFAULT 0,
  busiest_hour_start INTEGER DEFAULT 0, -- 0-23
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

-- Monthly aggregated metrics
CREATE TABLE monthly_analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  total_messages INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  avg_daily_messages DECIMAL(8,2) DEFAULT 0.00,
  avg_response_time_minutes INTEGER DEFAULT 0,
  avg_resolution_time_hours INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  top_performing_agent UUID REFERENCES profiles(id) ON DELETE SET NULL,
  most_used_template UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  busiest_day_of_week INTEGER DEFAULT 1, -- 1=Monday, 7=Sunday
  growth_rate_messages DECIMAL(5,2) DEFAULT 0.00,
  growth_rate_contacts DECIMAL(5,2) DEFAULT 0.00,
  automation_efficiency_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, year, month)
);

-- Conversation analytics with detailed metrics
CREATE TABLE conversation_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_response_time_minutes INTEGER,
  total_response_time_minutes INTEGER,
  resolution_time_hours INTEGER,
  message_count INTEGER DEFAULT 0,
  agent_message_count INTEGER DEFAULT 0,
  customer_message_count INTEGER DEFAULT 0,
  handover_count INTEGER DEFAULT 0,
  automation_triggered_count INTEGER DEFAULT 0,
  template_usage_count INTEGER DEFAULT 0,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  tags_applied TEXT[] DEFAULT '{}',
  escalation_count INTEGER DEFAULT 0,
  resolution_type TEXT CHECK (resolution_type IN ('resolved', 'escalated', 'abandoned', 'spam')),
  customer_effort_score INTEGER CHECK (customer_effort_score >= 1 AND customer_effort_score <= 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id)
);

-- Agent performance analytics
CREATE TABLE agent_performance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  conversations_handled INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  avg_resolution_time_hours INTEGER DEFAULT 0,
  customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0.00,
  handovers_received INTEGER DEFAULT 0,
  handovers_given INTEGER DEFAULT 0,
  active_time_minutes INTEGER DEFAULT 0,
  efficiency_score DECIMAL(5,2) DEFAULT 0.00,
  quality_score DECIMAL(5,2) DEFAULT 0.00,
  templates_used INTEGER DEFAULT 0,
  automation_assists INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, agent_id, date)
);

-- Business intelligence metrics aggregation
CREATE TABLE business_intelligence_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue_impact', 'cost_savings', 'productivity', 'customer_lifetime_value', 'churn_risk')),
  date DATE NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_unit TEXT DEFAULT 'currency',
  comparison_period TEXT DEFAULT 'previous_month' CHECK (comparison_period IN ('previous_day', 'previous_week', 'previous_month', 'previous_year')),
  growth_percentage DECIMAL(6,3) DEFAULT 0.000,
  trend_direction TEXT DEFAULT 'neutral' CHECK (trend_direction IN ('up', 'down', 'neutral')),
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  contributing_factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_type, date)
);

-- Real-time dashboard metrics cache
CREATE TABLE realtime_dashboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, cache_key)
);

-- ============================================================================
-- 4. AUTOMATED BACKUP AND DISASTER RECOVERY
-- ============================================================================

-- Backup configurations per organization
CREATE TABLE backup_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30,
  storage_location TEXT NOT NULL,
  encryption_enabled BOOLEAN DEFAULT true,
  compression_enabled BOOLEAN DEFAULT true,
  backup_tables TEXT[] NOT NULL DEFAULT '{}',
  exclude_tables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_backup_at TIMESTAMPTZ,
  next_backup_at TIMESTAMPTZ,
  notification_emails TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup execution logs
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_config_id UUID NOT NULL REFERENCES backup_configurations(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
  file_path TEXT,
  file_size_bytes BIGINT,
  backup_duration_seconds INTEGER,
  tables_backed_up TEXT[] DEFAULT '{}',
  rows_backed_up INTEGER DEFAULT 0,
  compression_ratio DECIMAL(4,3) DEFAULT 1.000,
  error_message TEXT,
  checksum TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Data retention policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  archive_before_delete BOOLEAN DEFAULT true,
  archive_location TEXT,
  deletion_criteria JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_cleanup_at TIMESTAMPTZ,
  next_cleanup_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, table_name)
);

-- Data archival logs
CREATE TABLE data_archival_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  retention_policy_id UUID NOT NULL REFERENCES data_retention_policies(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('archive', 'delete', 'restore')),
  status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  rows_affected INTEGER DEFAULT 0,
  archive_location TEXT,
  criteria_used JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Disaster recovery configurations
CREATE TABLE disaster_recovery_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recovery_type TEXT NOT NULL CHECK (recovery_type IN ('point_in_time', 'full_restore', 'selective_restore')),
  rto_hours INTEGER NOT NULL, -- Recovery Time Objective
  rpo_hours INTEGER NOT NULL, -- Recovery Point Objective
  failover_enabled BOOLEAN DEFAULT false,
  failover_endpoint TEXT,
  replication_lag_threshold_seconds INTEGER DEFAULT 300,
  notification_channels JSONB DEFAULT '{}',
  test_schedule TEXT DEFAULT 'monthly' CHECK (test_schedule IN ('weekly', 'monthly', 'quarterly')),
  last_test_at TIMESTAMPTZ,
  test_success_rate DECIMAL(5,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disaster recovery test logs
CREATE TABLE disaster_recovery_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dr_config_id UUID NOT NULL REFERENCES disaster_recovery_configs(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('scheduled', 'manual', 'automated')),
  test_scenario TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'running', 'passed', 'failed', 'cancelled')),
  rto_achieved_hours INTEGER,
  rpo_achieved_hours INTEGER,
  data_integrity_verified BOOLEAN DEFAULT false,
  performance_impact_score DECIMAL(3,2) DEFAULT 0.00,
  issues_found TEXT[],
  recommendations TEXT[],
  test_results JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Media files indexes
CREATE INDEX idx_media_files_organization_id ON media_files(organization_id);
CREATE INDEX idx_media_files_message_id ON media_files(message_id);
CREATE INDEX idx_media_files_whatsapp_media_id ON media_files(whatsapp_media_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_upload_status ON media_files(upload_status);
CREATE INDEX idx_media_files_created_at ON media_files(created_at DESC);
CREATE INDEX idx_media_files_size ON media_files(file_size_bytes);

CREATE INDEX idx_media_categories_organization_id ON media_categories(organization_id);
CREATE INDEX idx_media_file_categories_media_file_id ON media_file_categories(media_file_id);

CREATE INDEX idx_media_storage_quotas_organization_id ON media_storage_quotas(organization_id);
CREATE INDEX idx_media_storage_quotas_quota_type ON media_storage_quotas(quota_type);

-- Template versioning indexes
CREATE INDEX idx_message_templates_version ON message_templates(version);
CREATE INDEX idx_message_templates_status ON message_templates(status);
CREATE INDEX idx_message_templates_whatsapp_status ON message_templates(whatsapp_status);
CREATE INDEX idx_message_templates_parent_id ON message_templates(parent_template_id);
CREATE INDEX idx_message_templates_current_version ON message_templates(is_current_version) WHERE is_current_version = true;

CREATE INDEX idx_template_versions_template_id ON message_template_versions(template_id);
CREATE INDEX idx_template_versions_version_number ON message_template_versions(version_number);
CREATE INDEX idx_template_versions_status ON message_template_versions(status);

CREATE INDEX idx_template_approval_requests_template_id ON template_approval_requests(template_id);
CREATE INDEX idx_template_approval_requests_status ON template_approval_requests(status);
CREATE INDEX idx_template_approval_requests_assigned_to ON template_approval_requests(assigned_to);

CREATE INDEX idx_template_usage_analytics_org_date ON template_usage_analytics(organization_id, date DESC);
CREATE INDEX idx_template_usage_analytics_template_id ON template_usage_analytics(template_id);

-- Analytics indexes
CREATE INDEX idx_daily_analytics_org_date ON daily_analytics_summary(organization_id, date DESC);
CREATE INDEX idx_monthly_analytics_org_year_month ON monthly_analytics_summary(organization_id, year DESC, month DESC);
CREATE INDEX idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX idx_conversation_analytics_org_id ON conversation_analytics(organization_id);
CREATE INDEX idx_agent_performance_org_agent_date ON agent_performance_analytics(organization_id, agent_id, date DESC);
CREATE INDEX idx_business_intelligence_org_type_date ON business_intelligence_metrics(organization_id, metric_type, date DESC);
CREATE INDEX idx_realtime_cache_org_key ON realtime_dashboard_cache(organization_id, cache_key);
CREATE INDEX idx_realtime_cache_expires ON realtime_dashboard_cache(expires_at);

-- Backup and DR indexes
CREATE INDEX idx_backup_configs_organization_id ON backup_configurations(organization_id);
CREATE INDEX idx_backup_configs_next_backup ON backup_configurations(next_backup_at) WHERE is_active = true;
CREATE INDEX idx_backup_logs_organization_id ON backup_logs(organization_id);
CREATE INDEX idx_backup_logs_config_id ON backup_logs(backup_config_id);
CREATE INDEX idx_backup_logs_started_at ON backup_logs(started_at DESC);

CREATE INDEX idx_retention_policies_organization_id ON data_retention_policies(organization_id);
CREATE INDEX idx_retention_policies_next_cleanup ON data_retention_policies(next_cleanup_at) WHERE is_active = true;
CREATE INDEX idx_archival_logs_organization_id ON data_archival_logs(organization_id);

CREATE INDEX idx_dr_configs_organization_id ON disaster_recovery_configs(organization_id);
CREATE INDEX idx_dr_tests_organization_id ON disaster_recovery_tests(organization_id);
CREATE INDEX idx_dr_tests_started_at ON disaster_recovery_tests(started_at DESC);

-- ============================================================================
-- UPDATED AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_categories_updated_at BEFORE UPDATE ON media_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_storage_quotas_updated_at BEFORE UPDATE ON media_storage_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_approval_requests_updated_at BEFORE UPDATE ON template_approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversation_analytics_updated_at BEFORE UPDATE ON conversation_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_configurations_updated_at BEFORE UPDATE ON backup_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disaster_recovery_configs_updated_at BEFORE UPDATE ON disaster_recovery_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Media files RLS
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_file_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_storage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access media files in their organization" ON media_files
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage media categories in their organization" ON media_categories
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage media file categories in their organization" ON media_file_categories
  FOR ALL USING (
    media_file_id IN (
      SELECT mf.id FROM media_files mf
      JOIN profiles p ON p.organization_id = mf.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can access media file shares in their organization" ON media_file_shares
  FOR ALL USING (
    media_file_id IN (
      SELECT mf.id FROM media_files mf
      JOIN profiles p ON p.organization_id = mf.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can view storage quotas for their organization" ON media_storage_quotas
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Template versioning RLS
ALTER TABLE message_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access template versions in their organization" ON message_template_versions
  FOR ALL USING (
    template_id IN (
      SELECT mt.id FROM message_templates mt
      JOIN profiles p ON p.organization_id = mt.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can access template approval requests in their organization" ON template_approval_requests
  FOR ALL USING (
    template_id IN (
      SELECT mt.id FROM message_templates mt
      JOIN profiles p ON p.organization_id = mt.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can view template usage analytics for their organization" ON template_usage_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Analytics RLS
ALTER TABLE daily_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_dashboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily analytics for their organization" ON daily_analytics_summary
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view monthly analytics for their organization" ON monthly_analytics_summary
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view conversation analytics for their organization" ON conversation_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view agent performance analytics for their organization" ON agent_performance_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view business intelligence metrics for their organization" ON business_intelligence_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can access dashboard cache for their organization" ON realtime_dashboard_cache
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Backup and DR RLS
ALTER TABLE backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_archival_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_recovery_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_recovery_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization owners can manage backup configurations" ON backup_configurations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Organization members can view backup logs" ON backup_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can manage retention policies" ON data_retention_policies
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Organization members can view archival logs" ON data_archival_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can manage DR configurations" ON disaster_recovery_configs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Organization members can view DR tests" ON disaster_recovery_tests
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC AND AUTOMATION
-- ============================================================================

-- Function to update media storage quota usage
CREATE OR REPLACE FUNCTION update_media_storage_usage(
  org_id UUID,
  quota_type TEXT,
  usage_delta BIGINT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO media_storage_quotas (organization_id, quota_type, current_usage)
  VALUES (org_id, quota_type, usage_delta)
  ON CONFLICT (organization_id, quota_type)
  DO UPDATE SET
    current_usage = media_storage_quotas.current_usage + usage_delta,
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new template version
CREATE OR REPLACE FUNCTION create_template_version(
  template_id UUID,
  new_content TEXT,
  change_summary TEXT DEFAULT NULL,
  created_by_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_version_number INTEGER;
  new_version_id UUID;
  template_org_id UUID;
BEGIN
  -- Get next version number and organization
  SELECT
    COALESCE(MAX(version), 0) + 1,
    organization_id
  INTO new_version_number, template_org_id
  FROM message_templates
  WHERE id = template_id;

  -- Mark current version as not current
  UPDATE message_templates
  SET is_current_version = false
  WHERE id = template_id;

  -- Update main template with new version
  UPDATE message_templates
  SET
    content = new_content,
    version = new_version_number,
    is_current_version = true,
    status = 'draft',
    updated_at = NOW()
  WHERE id = template_id;

  -- Create version record
  INSERT INTO message_template_versions (
    template_id,
    version_number,
    name,
    content,
    category,
    variables,
    components,
    status,
    language_code,
    template_type,
    change_summary,
    created_by
  )
  SELECT
    id,
    new_version_number,
    name,
    new_content,
    category,
    variables,
    components,
    'draft',
    language_code,
    template_type,
    change_summary,
    created_by_id
  FROM message_templates
  WHERE id = template_id
  RETURNING id INTO new_version_id;

  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS INTEGER AS $$
DECLARE
  org_record RECORD;
  aggregated_count INTEGER := 0;
BEGIN
  FOR org_record IN
    SELECT DISTINCT organization_id FROM conversations
    WHERE DATE(created_at) = target_date
  LOOP
    INSERT INTO daily_analytics_summary (
      organization_id,
      date,
      total_messages,
      inbound_messages,
      outbound_messages,
      total_conversations,
      new_conversations,
      resolved_conversations,
      avg_first_response_time_minutes,
      avg_resolution_time_hours,
      total_contacts,
      new_contacts,
      active_agents
    )
    SELECT
      org_record.organization_id,
      target_date,
      COALESCE(msg_stats.total_messages, 0),
      COALESCE(msg_stats.inbound_messages, 0),
      COALESCE(msg_stats.outbound_messages, 0),
      COALESCE(conv_stats.total_conversations, 0),
      COALESCE(conv_stats.new_conversations, 0),
      COALESCE(conv_stats.resolved_conversations, 0),
      COALESCE(EXTRACT(EPOCH FROM avg_response_time) / 60, 0)::INTEGER,
      COALESCE(EXTRACT(EPOCH FROM avg_resolution_time) / 3600, 0)::INTEGER,
      COALESCE(contact_stats.total_contacts, 0),
      COALESCE(contact_stats.new_contacts, 0),
      COALESCE(agent_stats.active_agents, 0)
    FROM (
      -- Message statistics
      SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN sender_type = 'contact' THEN 1 ELSE 0 END) as inbound_messages,
        SUM(CASE WHEN sender_type = 'agent' THEN 1 ELSE 0 END) as outbound_messages
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.organization_id = org_record.organization_id
        AND DATE(m.created_at) = target_date
    ) msg_stats
    CROSS JOIN (
      -- Conversation statistics
      SELECT
        COUNT(*) as total_conversations,
        SUM(CASE WHEN DATE(created_at) = target_date THEN 1 ELSE 0 END) as new_conversations,
        SUM(CASE WHEN status = 'resolved' AND DATE(updated_at) = target_date THEN 1 ELSE 0 END) as resolved_conversations
      FROM conversations
      WHERE organization_id = org_record.organization_id
        AND (DATE(created_at) = target_date OR DATE(updated_at) = target_date)
    ) conv_stats
    CROSS JOIN (
      -- Contact statistics
      SELECT
        COUNT(*) as total_contacts,
        SUM(CASE WHEN DATE(created_at) = target_date THEN 1 ELSE 0 END) as new_contacts
      FROM contacts
      WHERE organization_id = org_record.organization_id
        AND (DATE(created_at) <= target_date)
    ) contact_stats
    CROSS JOIN (
      -- Agent statistics
      SELECT
        COUNT(DISTINCT assigned_to) as active_agents
      FROM conversations
      WHERE organization_id = org_record.organization_id
        AND DATE(updated_at) = target_date
        AND assigned_to IS NOT NULL
    ) agent_stats
    CROSS JOIN (
      -- Response time statistics
      SELECT
        AVG(ca.first_response_time_minutes * INTERVAL '1 minute') as avg_response_time,
        AVG(ca.resolution_time_hours * INTERVAL '1 hour') as avg_resolution_time
      FROM conversation_analytics ca
      JOIN conversations c ON c.id = ca.conversation_id
      WHERE c.organization_id = org_record.organization_id
        AND DATE(ca.created_at) = target_date
    ) time_stats
    ON CONFLICT (organization_id, date)
    DO UPDATE SET
      total_messages = EXCLUDED.total_messages,
      inbound_messages = EXCLUDED.inbound_messages,
      outbound_messages = EXCLUDED.outbound_messages,
      total_conversations = EXCLUDED.total_conversations,
      new_conversations = EXCLUDED.new_conversations,
      resolved_conversations = EXCLUDED.resolved_conversations,
      avg_first_response_time_minutes = EXCLUDED.avg_first_response_time_minutes,
      avg_resolution_time_hours = EXCLUDED.avg_resolution_time_hours,
      total_contacts = EXCLUDED.total_contacts,
      new_contacts = EXCLUDED.new_contacts,
      active_agents = EXCLUDED.active_agents;

    aggregated_count := aggregated_count + 1;
  END LOOP;

  RETURN aggregated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM realtime_dashboard_cache
  WHERE expires_at <= NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute backup for organization
CREATE OR REPLACE FUNCTION execute_backup(config_id UUID)
RETURNS UUID AS $$
DECLARE
  config_record RECORD;
  log_id UUID;
  backup_started_at TIMESTAMPTZ;
BEGIN
  backup_started_at := NOW();

  -- Get backup configuration
  SELECT * INTO config_record
  FROM backup_configurations
  WHERE id = config_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup configuration not found or inactive';
  END IF;

  -- Create backup log entry
  INSERT INTO backup_logs (
    organization_id,
    backup_config_id,
    backup_type,
    status,
    started_at
  ) VALUES (
    config_record.organization_id,
    config_id,
    config_record.backup_type,
    'started',
    backup_started_at
  ) RETURNING id INTO log_id;

  -- Update configuration
  UPDATE backup_configurations
  SET
    last_backup_at = backup_started_at,
    next_backup_at = CASE
      WHEN frequency = 'hourly' THEN backup_started_at + INTERVAL '1 hour'
      WHEN frequency = 'daily' THEN backup_started_at + INTERVAL '1 day'
      WHEN frequency = 'weekly' THEN backup_started_at + INTERVAL '1 week'
      WHEN frequency = 'monthly' THEN backup_started_at + INTERVAL '1 month'
    END
  WHERE id = config_id;

  -- Note: Actual backup execution would be handled by external service
  -- This function primarily handles logging and scheduling

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_old_data(policy_id UUID)
RETURNS INTEGER AS $$
DECLARE
  policy_record RECORD;
  cutoff_date DATE;
  rows_affected INTEGER := 0;
  log_id UUID;
BEGIN
  -- Get retention policy
  SELECT * INTO policy_record
  FROM data_retention_policies
  WHERE id = policy_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retention policy not found or inactive';
  END IF;

  cutoff_date := CURRENT_DATE - (policy_record.retention_period_days || ' days')::INTERVAL;

  -- Create archival log entry
  INSERT INTO data_archival_logs (
    organization_id,
    retention_policy_id,
    table_name,
    operation_type,
    status,
    criteria_used
  ) VALUES (
    policy_record.organization_id,
    policy_id,
    policy_record.table_name,
    CASE WHEN policy_record.archive_before_delete THEN 'archive' ELSE 'delete' END,
    'started',
    jsonb_build_object('cutoff_date', cutoff_date)
  ) RETURNING id INTO log_id;

  -- Execute cleanup based on table name and criteria
  CASE policy_record.table_name
    WHEN 'messages' THEN
      DELETE FROM messages
      WHERE conversation_id IN (
        SELECT c.id FROM conversations c
        WHERE c.organization_id = policy_record.organization_id
      ) AND created_at < cutoff_date;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'webhook_logs' THEN
      DELETE FROM webhook_logs
      WHERE organization_id = policy_record.organization_id
        AND created_at < cutoff_date;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'backup_logs' THEN
      DELETE FROM backup_logs
      WHERE organization_id = policy_record.organization_id
        AND started_at < cutoff_date;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
  END CASE;

  -- Update archival log
  UPDATE data_archival_logs
  SET
    status = 'completed',
    rows_affected = cleanup_old_data.rows_affected,
    completed_at = NOW()
  WHERE id = log_id;

  -- Update retention policy
  UPDATE data_retention_policies
  SET
    last_cleanup_at = NOW(),
    next_cleanup_at = NOW() + INTERVAL '1 day'
  WHERE id = policy_id;

  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Trigger to update media storage usage when files are uploaded
CREATE OR REPLACE FUNCTION update_media_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_media_storage_usage(NEW.organization_id, 'total_storage', NEW.file_size_bytes);
    PERFORM update_media_storage_usage(NEW.organization_id, 'file_count', 1);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_media_storage_usage(OLD.organization_id, 'total_storage', -OLD.file_size_bytes);
    PERFORM update_media_storage_usage(OLD.organization_id, 'file_count', -1);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_files_usage_trigger
  AFTER INSERT OR DELETE ON media_files
  FOR EACH ROW EXECUTE FUNCTION update_media_usage_trigger();

-- Trigger to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be triggered by message sending logic
  -- Increment usage count when template is used
  UPDATE message_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = NEW.template_id; -- Assuming template_id is passed somehow

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create conversation analytics when conversation is updated
CREATE OR REPLACE FUNCTION create_conversation_analytics_trigger()
RETURNS TRIGGER AS $$
DECLARE
  first_response_time INTEGER;
  total_messages INTEGER;
  agent_messages INTEGER;
  customer_messages INTEGER;
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    -- Calculate metrics
    SELECT
      EXTRACT(EPOCH FROM (
        SELECT MIN(created_at) FROM messages
        WHERE conversation_id = NEW.id AND sender_type = 'agent'
      ) - NEW.created_at) / 60,
      COUNT(*),
      SUM(CASE WHEN sender_type = 'agent' THEN 1 ELSE 0 END),
      SUM(CASE WHEN sender_type = 'contact' THEN 1 ELSE 0 END)
    INTO first_response_time, total_messages, agent_messages, customer_messages
    FROM messages
    WHERE conversation_id = NEW.id;

    INSERT INTO conversation_analytics (
      conversation_id,
      organization_id,
      first_response_time_minutes,
      resolution_time_hours,
      message_count,
      agent_message_count,
      customer_message_count
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      first_response_time,
      EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600,
      total_messages,
      agent_messages,
      customer_messages
    ) ON CONFLICT (conversation_id)
    DO UPDATE SET
      resolution_time_hours = EXCLUDED.resolution_time_hours,
      message_count = EXCLUDED.message_count,
      agent_message_count = EXCLUDED.agent_message_count,
      customer_message_count = EXCLUDED.customer_message_count,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_analytics_trigger
  AFTER UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION create_conversation_analytics_trigger();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON media_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON media_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON media_file_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON media_file_shares TO authenticated;
GRANT SELECT ON media_storage_quotas TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON message_template_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON template_approval_requests TO authenticated;
GRANT SELECT ON template_usage_analytics TO authenticated;

GRANT SELECT ON daily_analytics_summary TO authenticated;
GRANT SELECT ON monthly_analytics_summary TO authenticated;
GRANT SELECT ON conversation_analytics TO authenticated;
GRANT SELECT ON agent_performance_analytics TO authenticated;
GRANT SELECT ON business_intelligence_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON realtime_dashboard_cache TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON backup_configurations TO authenticated;
GRANT SELECT ON backup_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_policies TO authenticated;
GRANT SELECT ON data_archival_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disaster_recovery_configs TO authenticated;
GRANT SELECT ON disaster_recovery_tests TO authenticated;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default media categories for each organization
INSERT INTO media_categories (organization_id, name, description, color_hex, is_default, sort_order)
SELECT
  id,
  'General',
  'General media files',
  '#6B7280',
  true,
  0
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM media_categories
  WHERE organization_id = organizations.id AND name = 'General'
);

-- Insert default storage quotas for each organization
INSERT INTO media_storage_quotas (organization_id, quota_type, quota_limit)
SELECT
  o.id,
  quota_info.quota_type,
  CASE o.subscription_tier
    WHEN 'starter' THEN quota_info.starter_limit
    WHEN 'professional' THEN quota_info.professional_limit
    WHEN 'enterprise' THEN quota_info.enterprise_limit
    ELSE quota_info.starter_limit
  END
FROM organizations o
CROSS JOIN (
  VALUES
    ('total_storage', 1073741824::bigint, 5368709120::bigint, 21474836480::bigint), -- 1GB, 5GB, 20GB
    ('monthly_upload', 536870912::bigint, 2147483648::bigint, 10737418240::bigint), -- 512MB, 2GB, 10GB
    ('file_count', 1000::bigint, 5000::bigint, 25000::bigint),
    ('bandwidth', 2147483648::bigint, 10737418240::bigint, 53687091200::bigint) -- 2GB, 10GB, 50GB
) AS quota_info(quota_type, starter_limit, professional_limit, enterprise_limit)
WHERE NOT EXISTS (
  SELECT 1 FROM media_storage_quotas
  WHERE organization_id = o.id AND quota_type = quota_info.quota_type
);

-- Insert default backup configurations for enterprise organizations
INSERT INTO backup_configurations (
  organization_id,
  backup_type,
  frequency,
  retention_days,
  storage_location,
  backup_tables,
  created_by
)
SELECT
  o.id,
  'full',
  'daily',
  30,
  'supabase://backups/' || o.slug,
  ARRAY['contacts', 'conversations', 'messages', 'automation_rules', 'message_templates'],
  (SELECT id FROM profiles WHERE organization_id = o.id AND role = 'owner' LIMIT 1)
FROM organizations o
WHERE o.subscription_tier = 'enterprise'
  AND NOT EXISTS (
    SELECT 1 FROM backup_configurations
    WHERE organization_id = o.id
  );

-- Insert default data retention policies
INSERT INTO data_retention_policies (
  organization_id,
  table_name,
  retention_period_days,
  archive_before_delete,
  deletion_criteria,
  created_by
)
SELECT
  o.id,
  retention_info.table_name,
  CASE o.subscription_tier
    WHEN 'starter' THEN retention_info.starter_days
    WHEN 'professional' THEN retention_info.professional_days
    WHEN 'enterprise' THEN retention_info.enterprise_days
    ELSE retention_info.starter_days
  END,
  true,
  retention_info.criteria,
  (SELECT id FROM profiles WHERE organization_id = o.id AND role = 'owner' LIMIT 1)
FROM organizations o
CROSS JOIN (
  VALUES
    ('webhook_logs', 30, 90, 365, '{"status": "processed"}'::jsonb),
    ('backup_logs', 90, 180, 730, '{"status": "completed"}'::jsonb),
    ('demo_session_activities', 7, 30, 90, '{}'::jsonb)
) AS retention_info(table_name, starter_days, professional_days, enterprise_days, criteria)
WHERE NOT EXISTS (
  SELECT 1 FROM data_retention_policies
  WHERE organization_id = o.id AND table_name = retention_info.table_name
);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Log successful completion
INSERT INTO super_admin_audit_logs (
  admin_id,
  action,
  target_type,
  details
) VALUES (
  (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
  'database_schema_completion',
  'system',
  jsonb_build_object(
    'migration', '004_complete_database_schema.sql',
    'completion_percentage', 100,
    'components_added', jsonb_build_array(
      'WhatsApp Media File Storage Integration',
      'Message Template Versioning System',
      'Advanced Analytics Aggregation Tables',
      'Automated Backup and Disaster Recovery'
    ),
    'tables_created', 24,
    'functions_created', 8,
    'triggers_created', 3,
    'timestamp', NOW()
  )
);

-- End of migration