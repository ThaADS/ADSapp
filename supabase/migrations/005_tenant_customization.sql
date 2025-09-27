-- Migration 005: Tenant Customization and White-label Features
-- This migration adds comprehensive tenant customization capabilities including:
-- 1. White-label branding configuration
-- 2. Custom domain support
-- 3. Resource usage tracking
-- 4. Tenant-specific settings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenant branding configuration table
CREATE TABLE tenant_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Logo and visual branding
  logo_url TEXT,
  logo_dark_url TEXT, -- For dark mode
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  accent_color VARCHAR(7) DEFAULT '#10B981',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#1F2937',

  -- Typography settings
  font_family VARCHAR(100) DEFAULT 'Inter',
  font_size_base INTEGER DEFAULT 14, -- Base font size in px

  -- Company information
  company_name TEXT,
  company_tagline TEXT,
  company_description TEXT,
  support_email TEXT,
  support_phone TEXT,
  website_url TEXT,

  -- Custom CSS
  custom_css TEXT,
  custom_js TEXT,

  -- Theme settings
  theme_mode VARCHAR(10) DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  border_radius INTEGER DEFAULT 8, -- Border radius in px

  -- White-label settings
  hide_powered_by BOOLEAN DEFAULT false,
  custom_footer_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Custom domains table
CREATE TABLE tenant_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100), -- For subdomain.adsapp.com
  domain_type VARCHAR(20) DEFAULT 'custom' CHECK (domain_type IN ('custom', 'subdomain')),

  -- SSL and verification
  ssl_certificate_id TEXT,
  ssl_status VARCHAR(20) DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'expired', 'failed')),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_token TEXT,
  verification_method VARCHAR(20) DEFAULT 'dns' CHECK (verification_method IN ('dns', 'file', 'email')),

  -- DNS records for verification
  dns_records JSONB DEFAULT '[]',

  -- Domain status
  is_active BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,

  -- Certificate management
  certificate_expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(domain),
  UNIQUE(subdomain) WHERE subdomain IS NOT NULL
);

-- Email template customization
CREATE TABLE tenant_email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- welcome, password_reset, invoice, etc.

  -- Template content
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,

  -- Template variables
  variables JSONB DEFAULT '[]', -- Array of available variables

  -- Branding
  use_custom_branding BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, template_type)
);

-- Resource usage tracking
CREATE TABLE tenant_usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metric_date DATE NOT NULL,

  -- API usage
  api_calls_total INTEGER DEFAULT 0,
  api_calls_whatsapp INTEGER DEFAULT 0,
  api_calls_internal INTEGER DEFAULT 0,
  api_calls_webhook INTEGER DEFAULT 0,

  -- Message metrics
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  messages_total INTEGER DEFAULT 0,

  -- Storage metrics (in bytes)
  storage_used BIGINT DEFAULT 0,
  storage_media BIGINT DEFAULT 0,
  storage_documents BIGINT DEFAULT 0,
  storage_backups BIGINT DEFAULT 0,

  -- Bandwidth metrics (in bytes)
  bandwidth_in BIGINT DEFAULT 0,
  bandwidth_out BIGINT DEFAULT 0,

  -- Contact and conversation metrics
  contacts_total INTEGER DEFAULT 0,
  conversations_active INTEGER DEFAULT 0,
  conversations_total INTEGER DEFAULT 0,

  -- Team metrics
  users_active INTEGER DEFAULT 0,
  users_total INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time INTERVAL,
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, metric_date)
);

-- Real-time usage tracking
CREATE TABLE tenant_usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- api_call, message_sent, storage_upload, etc.
  event_category VARCHAR(30) NOT NULL, -- api, messaging, storage, bandwidth

  -- Resource consumption
  resource_amount INTEGER DEFAULT 1, -- Count of resource used
  bytes_consumed BIGINT DEFAULT 0, -- For storage/bandwidth events

  -- Context
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT, -- For API calls
  metadata JSONB DEFAULT '{}',

  -- Billing
  billable BOOLEAN DEFAULT true,
  cost_cents INTEGER DEFAULT 0, -- Cost in cents

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage alerts and limits
CREATE TABLE tenant_usage_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Limit type and period
  limit_type VARCHAR(50) NOT NULL, -- api_calls, messages, storage, bandwidth
  period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),

  -- Limits
  soft_limit BIGINT, -- Warning threshold
  hard_limit BIGINT, -- Blocking threshold
  current_usage BIGINT DEFAULT 0,

  -- Alert settings
  alert_enabled BOOLEAN DEFAULT true,
  alert_threshold_percentage INTEGER DEFAULT 80, -- Alert at 80% of soft limit
  last_alert_sent_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, limit_type, period_type)
);

-- Tenant feature flags
CREATE TABLE tenant_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Feature settings
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{}',

  -- Billing and limits
  requires_subscription BOOLEAN DEFAULT false,
  minimum_tier VARCHAR(20), -- starter, professional, enterprise

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, feature_key)
);

-- Add new columns to organizations table for enhanced tenant management
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  custom_domain TEXT,
  subdomain VARCHAR(100) UNIQUE,
  whitelabel_enabled BOOLEAN DEFAULT false,
  api_key_hash TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(10) DEFAULT '12h';

-- Indexes for performance optimization
CREATE INDEX idx_tenant_branding_organization_id ON tenant_branding(organization_id);
CREATE INDEX idx_tenant_domains_organization_id ON tenant_domains(organization_id);
CREATE INDEX idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX idx_tenant_domains_subdomain ON tenant_domains(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX idx_tenant_domains_active ON tenant_domains(is_active) WHERE is_active = true;

CREATE INDEX idx_tenant_email_templates_org_type ON tenant_email_templates(organization_id, template_type);

CREATE INDEX idx_tenant_usage_metrics_org_date ON tenant_usage_metrics(organization_id, metric_date);
CREATE INDEX idx_tenant_usage_metrics_date ON tenant_usage_metrics(metric_date);

CREATE INDEX idx_tenant_usage_events_org_created ON tenant_usage_events(organization_id, created_at);
CREATE INDEX idx_tenant_usage_events_type ON tenant_usage_events(event_type);
CREATE INDEX idx_tenant_usage_events_category ON tenant_usage_events(event_category);
CREATE INDEX idx_tenant_usage_events_created_at ON tenant_usage_events(created_at);

CREATE INDEX idx_tenant_usage_limits_org_type ON tenant_usage_limits(organization_id, limit_type);

CREATE INDEX idx_tenant_features_org_key ON tenant_features(organization_id, feature_key);

-- Updated at triggers
CREATE TRIGGER update_tenant_branding_updated_at
  BEFORE UPDATE ON tenant_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON tenant_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_email_templates_updated_at
  BEFORE UPDATE ON tenant_email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_usage_limits_updated_at
  BEFORE UPDATE ON tenant_usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_features_updated_at
  BEFORE UPDATE ON tenant_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_branding
CREATE POLICY "Users can view branding in their organization" ON tenant_branding
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage branding in their organization" ON tenant_branding
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for tenant_domains
CREATE POLICY "Users can view domains in their organization" ON tenant_domains
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage domains in their organization" ON tenant_domains
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for tenant_email_templates
CREATE POLICY "Users can view email templates in their organization" ON tenant_email_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage email templates in their organization" ON tenant_email_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for usage metrics (view only for users)
CREATE POLICY "Users can view usage metrics in their organization" ON tenant_usage_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view usage events in their organization" ON tenant_usage_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view usage limits in their organization" ON tenant_usage_limits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage usage limits in their organization" ON tenant_usage_limits
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for tenant_features
CREATE POLICY "Users can view features in their organization" ON tenant_features
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage features in their organization" ON tenant_features
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Functions for usage tracking
CREATE OR REPLACE FUNCTION track_usage_event(
  org_id UUID,
  event_type_param VARCHAR(50),
  event_category_param VARCHAR(30),
  resource_amount_param INTEGER DEFAULT 1,
  bytes_consumed_param BIGINT DEFAULT 0,
  user_id_param UUID DEFAULT NULL,
  endpoint_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO tenant_usage_events (
    organization_id,
    event_type,
    event_category,
    resource_amount,
    bytes_consumed,
    user_id,
    endpoint,
    metadata
  ) VALUES (
    org_id,
    event_type_param,
    event_category_param,
    resource_amount_param,
    bytes_consumed_param,
    user_id_param,
    endpoint_param,
    metadata_param
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily usage metrics
CREATE OR REPLACE FUNCTION aggregate_daily_usage_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  org RECORD;
BEGIN
  -- Aggregate metrics for each organization
  FOR org IN SELECT DISTINCT organization_id FROM tenant_usage_events WHERE DATE(created_at) = target_date
  LOOP
    INSERT INTO tenant_usage_metrics (
      organization_id,
      period_start,
      period_end,
      metric_date,
      api_calls_total,
      api_calls_whatsapp,
      api_calls_internal,
      api_calls_webhook,
      messages_sent,
      messages_received,
      storage_used,
      bandwidth_in,
      bandwidth_out
    )
    SELECT
      org.organization_id,
      target_date::TIMESTAMPTZ,
      (target_date + INTERVAL '1 day')::TIMESTAMPTZ,
      target_date,
      COUNT(*) FILTER (WHERE event_category = 'api'),
      COUNT(*) FILTER (WHERE event_category = 'api' AND event_type = 'whatsapp_api'),
      COUNT(*) FILTER (WHERE event_category = 'api' AND event_type = 'internal_api'),
      COUNT(*) FILTER (WHERE event_category = 'api' AND event_type = 'webhook'),
      COUNT(*) FILTER (WHERE event_category = 'messaging' AND event_type = 'message_sent'),
      COUNT(*) FILTER (WHERE event_category = 'messaging' AND event_type = 'message_received'),
      COALESCE(SUM(bytes_consumed) FILTER (WHERE event_category = 'storage'), 0),
      COALESCE(SUM(bytes_consumed) FILTER (WHERE event_category = 'bandwidth' AND event_type = 'bandwidth_in'), 0),
      COALESCE(SUM(bytes_consumed) FILTER (WHERE event_category = 'bandwidth' AND event_type = 'bandwidth_out'), 0)
    FROM tenant_usage_events
    WHERE organization_id = org.organization_id
      AND DATE(created_at) = target_date
    ON CONFLICT (organization_id, metric_date)
    DO UPDATE SET
      api_calls_total = EXCLUDED.api_calls_total,
      api_calls_whatsapp = EXCLUDED.api_calls_whatsapp,
      api_calls_internal = EXCLUDED.api_calls_internal,
      api_calls_webhook = EXCLUDED.api_calls_webhook,
      messages_sent = EXCLUDED.messages_sent,
      messages_received = EXCLUDED.messages_received,
      storage_used = EXCLUDED.storage_used,
      bandwidth_in = EXCLUDED.bandwidth_in,
      bandwidth_out = EXCLUDED.bandwidth_out;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limits(org_id UUID, limit_type_param VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
  limit_record RECORD;
  current_usage_value BIGINT;
  result JSONB;
BEGIN
  -- Get the limit configuration
  SELECT * INTO limit_record
  FROM tenant_usage_limits
  WHERE organization_id = org_id
    AND limit_type = limit_type_param
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN '{"status": "no_limit", "message": "No limit configured"}'::JSONB;
  END IF;

  -- Get current usage based on period type
  CASE limit_record.period_type
    WHEN 'daily' THEN
      SELECT COALESCE(SUM(resource_amount), 0) INTO current_usage_value
      FROM tenant_usage_events
      WHERE organization_id = org_id
        AND event_type = limit_type_param
        AND DATE(created_at) = CURRENT_DATE;
    WHEN 'monthly' THEN
      SELECT COALESCE(SUM(resource_amount), 0) INTO current_usage_value
      FROM tenant_usage_events
      WHERE organization_id = org_id
        AND event_type = limit_type_param
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
    ELSE
      current_usage_value := 0;
  END CASE;

  -- Update current usage
  UPDATE tenant_usage_limits
  SET current_usage = current_usage_value
  WHERE id = limit_record.id;

  -- Check limits
  IF limit_record.hard_limit IS NOT NULL AND current_usage_value >= limit_record.hard_limit THEN
    result := jsonb_build_object(
      'status', 'exceeded',
      'limit_type', 'hard',
      'current_usage', current_usage_value,
      'limit', limit_record.hard_limit,
      'message', 'Hard limit exceeded'
    );
  ELSIF limit_record.soft_limit IS NOT NULL AND current_usage_value >= limit_record.soft_limit THEN
    result := jsonb_build_object(
      'status', 'warning',
      'limit_type', 'soft',
      'current_usage', current_usage_value,
      'limit', limit_record.soft_limit,
      'message', 'Soft limit exceeded'
    );
  ELSE
    result := jsonb_build_object(
      'status', 'ok',
      'current_usage', current_usage_value,
      'soft_limit', limit_record.soft_limit,
      'hard_limit', limit_record.hard_limit
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant by domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_name TEXT)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First check custom domains
  SELECT organization_id INTO org_id
  FROM tenant_domains
  WHERE domain = domain_name
    AND is_active = true
    AND verification_status = 'verified';

  IF FOUND THEN
    RETURN org_id;
  END IF;

  -- Check subdomains (extract subdomain from domain_name)
  SELECT organization_id INTO org_id
  FROM tenant_domains
  WHERE subdomain = SPLIT_PART(domain_name, '.', 1)
    AND domain_type = 'subdomain'
    AND is_active = true;

  IF FOUND THEN
    RETURN org_id;
  END IF;

  -- Check organizations table for legacy support
  SELECT id INTO org_id
  FROM organizations
  WHERE custom_domain = domain_name OR subdomain = SPLIT_PART(domain_name, '.', 1);

  RETURN org_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default branding for existing organizations
INSERT INTO tenant_branding (organization_id, company_name)
SELECT id, name FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_branding WHERE organization_id = organizations.id
);

-- Insert default usage limits for existing organizations
INSERT INTO tenant_usage_limits (organization_id, limit_type, period_type, soft_limit, hard_limit)
SELECT
  o.id,
  unnest(ARRAY['api_calls', 'messages', 'storage']),
  'monthly',
  CASE
    WHEN o.subscription_tier = 'starter' THEN unnest(ARRAY[10000, 1000, 1073741824]) -- 1GB
    WHEN o.subscription_tier = 'professional' THEN unnest(ARRAY[50000, 10000, 10737418240]) -- 10GB
    WHEN o.subscription_tier = 'enterprise' THEN unnest(ARRAY[500000, 100000, 107374182400]) -- 100GB
    ELSE unnest(ARRAY[1000, 100, 104857600]) -- 100MB for trial
  END,
  CASE
    WHEN o.subscription_tier = 'starter' THEN unnest(ARRAY[12000, 1200, 1288490188])
    WHEN o.subscription_tier = 'professional' THEN unnest(ARRAY[60000, 12000, 12884901888])
    WHEN o.subscription_tier = 'enterprise' THEN unnest(ARRAY[600000, 120000, 128849018880])
    ELSE unnest(ARRAY[1200, 120, 125829120])
  END
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_usage_limits
  WHERE organization_id = o.id
);