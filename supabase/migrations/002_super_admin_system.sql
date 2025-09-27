-- Enhanced Super Admin System Migration
-- Comprehensive super admin functionality for enterprise multi-tenant management
-- Includes audit logging, organization management, support system, billing oversight,
-- and platform-wide analytics and monitoring

-- Add super admin role to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS super_admin_permissions TEXT[] DEFAULT '{}';

-- Create super admin audit log table
CREATE TABLE super_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('organization', 'profile', 'system', 'billing')),
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system settings table for platform-wide configuration
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'billing', 'limits', 'features', 'security')),
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization metrics table for admin dashboard
CREATE TABLE organization_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  webhook_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

-- Create billing events table for detailed billing tracking
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_created', 'subscription_updated', 'subscription_cancelled', 'payment_succeeded', 'payment_failed', 'trial_started', 'trial_ended', 'downgrade', 'upgrade')),
  stripe_event_id TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  details JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support tickets table for customer support
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_customer', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'feature_request', 'bug_report')),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support ticket messages table
CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization status tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'pending_setup')),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_super_admin_audit_logs_admin_id ON super_admin_audit_logs(admin_id);
CREATE INDEX idx_super_admin_audit_logs_action ON super_admin_audit_logs(action);
CREATE INDEX idx_super_admin_audit_logs_target_type ON super_admin_audit_logs(target_type);
CREATE INDEX idx_super_admin_audit_logs_created_at ON super_admin_audit_logs(created_at DESC);

CREATE INDEX idx_organization_metrics_org_date ON organization_metrics(organization_id, date DESC);
CREATE INDEX idx_organization_metrics_date ON organization_metrics(date DESC);

CREATE INDEX idx_billing_events_organization_id ON billing_events(organization_id);
CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at DESC);

CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);

CREATE INDEX idx_profiles_super_admin ON profiles(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX idx_organizations_status ON organizations(status);

-- Updated at triggers
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies for Super Admin tables

-- Super Admin Audit Logs - Only super admins can view
ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all audit logs" ON super_admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- System Settings - Super admins can manage, regular users can read public settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can read public system settings" ON system_settings
  FOR SELECT USING (is_public = true);

-- Organization Metrics - Super admins can view all, organization members can view their own
ALTER TABLE organization_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all organization metrics" ON organization_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view their organization metrics" ON organization_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Billing Events - Super admins can view all, organization owners can view their own
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all billing events" ON billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Organization owners can view their billing events" ON billing_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Support Tickets - Super admins can manage all, organization members can manage their own
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all support tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can manage their organization support tickets" ON support_tickets
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Support Ticket Messages - Follow ticket access rules
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all ticket messages" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view their organization ticket messages" ON support_ticket_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT st.id FROM support_tickets st
      JOIN profiles p ON p.organization_id = st.organization_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their organization tickets" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT st.id FROM support_tickets st
      JOIN profiles p ON p.organization_id = st.organization_id
      WHERE p.id = auth.uid()
    )
  );

-- Update existing organizations RLS to allow super admin access
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    ) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Functions for super admin operations
CREATE OR REPLACE FUNCTION get_organization_metrics_summary(org_id UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_messages INTEGER,
  total_conversations INTEGER,
  active_contacts INTEGER,
  avg_response_time INTERVAL,
  storage_used_mb INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(om.messages_sent + om.messages_received), 0)::INTEGER as total_messages,
    COALESCE(COUNT(DISTINCT c.id), 0)::INTEGER as total_conversations,
    COALESCE(COUNT(DISTINCT ct.id), 0)::INTEGER as active_contacts,
    COALESCE(AVG(cm.avg_response_time), INTERVAL '0')::INTERVAL as avg_response_time,
    COALESCE(MAX(om.storage_used_mb), 0)::INTEGER as storage_used_mb
  FROM organization_metrics om
  LEFT JOIN conversations c ON c.organization_id = org_id
    AND c.created_at >= NOW() - (days || ' days')::INTERVAL
  LEFT JOIN contacts ct ON ct.organization_id = org_id
    AND ct.last_message_at >= NOW() - (days || ' days')::INTERVAL
  LEFT JOIN conversation_metrics cm ON cm.organization_id = org_id
    AND cm.date >= (NOW() - (days || ' days')::INTERVAL)::DATE
  WHERE om.organization_id = org_id
    AND om.date >= (NOW() - (days || ' days')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log super admin actions
CREATE OR REPLACE FUNCTION log_super_admin_action(
  admin_user_id UUID,
  action_name TEXT,
  target_type TEXT,
  target_id UUID DEFAULT NULL,
  action_details JSONB DEFAULT '{}',
  ip_addr INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO super_admin_audit_logs (
    admin_id, action, target_type, target_id, details, ip_address, user_agent
  ) VALUES (
    admin_user_id, action_name, target_type, target_id, action_details, ip_addr, user_agent
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend organization
CREATE OR REPLACE FUNCTION suspend_organization(
  org_id UUID,
  reason TEXT,
  suspended_by_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organizations
  SET
    status = 'suspended',
    suspension_reason = reason,
    suspended_at = NOW(),
    suspended_by = suspended_by_id
  WHERE id = org_id;

  -- Log the action
  PERFORM log_super_admin_action(
    suspended_by_id,
    'suspend_organization',
    'organization',
    org_id,
    jsonb_build_object('reason', reason)
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate organization
CREATE OR REPLACE FUNCTION reactivate_organization(
  org_id UUID,
  reactivated_by_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organizations
  SET
    status = 'active',
    suspension_reason = NULL,
    suspended_at = NULL,
    suspended_by = NULL
  WHERE id = org_id;

  -- Log the action
  PERFORM log_super_admin_action(
    reactivated_by_id,
    'reactivate_organization',
    'organization',
    org_id,
    '{}'::jsonb
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('max_organizations', '1000', 'Maximum number of organizations allowed on the platform', 'limits', false),
('default_trial_days', '14', 'Default trial period in days for new organizations', 'billing', false),
('max_messages_per_day', '10000', 'Maximum messages per day for free tier', 'limits', false),
('max_contacts_per_org', '50000', 'Maximum contacts per organization', 'limits', false),
('maintenance_mode', 'false', 'Enable maintenance mode for the platform', 'general', true),
('signup_enabled', 'true', 'Allow new user signups', 'general', true),
('min_password_length', '8', 'Minimum password length requirement', 'security', true),
('support_email', '"support@yourapp.com"', 'Support contact email', 'general', true),
('platform_name', '"WhatsApp Inbox Pro"', 'Platform display name', 'general', true),
('webhook_timeout_seconds', '30', 'Webhook timeout in seconds', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- Additional tables for comprehensive super admin system

-- System roles table for granular permissions
CREATE TABLE IF NOT EXISTS system_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile system roles junction table
CREATE TABLE IF NOT EXISTS profile_system_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_role_id UUID NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(profile_id, system_role_id)
);

-- Organization limits table
CREATE TABLE IF NOT EXISTS organization_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL,
  limit_value INTEGER NOT NULL,
  current_usage INTEGER DEFAULT 0,
  reset_period TEXT CHECK (reset_period IN ('daily', 'weekly', 'monthly', 'yearly', 'never')),
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, limit_type)
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_organizations UUID[] DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage records for billing
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  billing_period TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_name, period_start)
);

-- System health checks table
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform metrics aggregation
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  total_organizations INTEGER DEFAULT 0,
  active_organizations INTEGER DEFAULT 0,
  new_organizations INTEGER DEFAULT 0,
  suspended_organizations INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date)
);

-- Add ticket number to support tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_system_roles_is_active ON system_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profile_system_roles_profile_id ON profile_system_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_organization_limits_org_id ON organization_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_usage_records_org_id ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period_start ON usage_records(period_start);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date);

-- Additional triggers
CREATE TRIGGER update_system_roles_updated_at BEFORE UPDATE ON system_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_limits_updated_at BEFORE UPDATE ON organization_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for new tables
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Super admins can manage system roles" ON system_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage profile system roles" ON profile_system_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Organization limits access" ON organization_limits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage organization limits" ON organization_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can manage feature flags" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Users can view their usage records" ON usage_records
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can access system health checks" ON system_health_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can access platform metrics" ON platform_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Additional utility functions
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate support ticket number
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('support_ticket_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set ticket number
CREATE OR REPLACE FUNCTION set_support_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for support ticket number generation
CREATE TRIGGER set_support_ticket_number_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_support_ticket_number();

-- Insert additional system roles
INSERT INTO system_roles (name, description, permissions) VALUES
('super_admin', 'Full system administration access', '{
  "system": ["read", "write", "delete"],
  "organizations": ["read", "write", "delete", "suspend", "billing"],
  "users": ["read", "write", "delete", "impersonate"],
  "support": ["read", "write", "delete"],
  "audit": ["read"],
  "settings": ["read", "write"]
}'::JSONB),
('support_admin', 'Customer support administration', '{
  "organizations": ["read", "suspend"],
  "users": ["read"],
  "support": ["read", "write"],
  "audit": ["read"]
}'::JSONB),
('billing_admin', 'Billing and subscription management', '{
  "organizations": ["read", "billing"],
  "users": ["read"],
  "billing": ["read", "write"],
  "audit": ["read"]
}'::JSONB)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions to authenticated users for new tables
GRANT SELECT ON super_admin_audit_logs TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON organization_metrics TO authenticated;
GRANT SELECT ON billing_events TO authenticated;
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_ticket_messages TO authenticated;
GRANT SELECT ON system_roles TO authenticated;
GRANT SELECT ON profile_system_roles TO authenticated;
GRANT SELECT ON organization_limits TO authenticated;
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON usage_records TO authenticated;
GRANT SELECT ON system_health_checks TO authenticated;
GRANT SELECT ON platform_metrics TO authenticated;