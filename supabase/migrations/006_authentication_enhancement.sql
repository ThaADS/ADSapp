-- Authentication Enhancement Migration
-- SSO, MFA, Session Management, Password Policies, and Advanced User Management

-- SSO Providers table
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('saml', 'oauth', 'oidc')),
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSO Sessions table
CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSO JIT Configuration table
CREATE TABLE sso_jit_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  default_role TEXT DEFAULT 'agent' CHECK (default_role IN ('agent', 'admin', 'owner')),
  group_role_mapping JSONB DEFAULT '{}',
  auto_assign_to_organization BOOLEAN DEFAULT true,
  require_group_membership BOOLEAN DEFAULT false,
  allowed_groups TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Invitations table
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent')),
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled', 'pending_approval')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  template_id UUID,
  custom_message TEXT,
  metadata JSONB,
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation Templates table
CREATE TABLE invitation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'agent')),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation Settings table
CREATE TABLE invitation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_expiration_days INTEGER DEFAULT 7,
  max_reminders INTEGER DEFAULT 3,
  reminder_interval_days INTEGER DEFAULT 2,
  require_approval BOOLEAN DEFAULT false,
  auto_reminders BOOLEAN DEFAULT true,
  allow_custom_messages BOOLEAN DEFAULT true,
  restricted_domains TEXT[],
  allowed_domains TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Bulk Invitation Operations table
CREATE TABLE bulk_invitation_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_invitations INTEGER NOT NULL,
  successful_invitations INTEGER DEFAULT 0,
  failed_invitations INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  results JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Invitation Activity Logs table
CREATE TABLE invitation_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password Policies table
CREATE TABLE password_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rules JSONB NOT NULL,
  enforcement JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password History table
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login Attempts table
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  failure_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Account Lockouts table
CREATE TABLE account_lockouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('password_failures', 'security_violation', 'manual')),
  attempt_count INTEGER NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- User Sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB NOT NULL,
  location JSONB NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'suspicious')),
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT
);

-- User Devices table
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  is_trusted BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Session Configurations table
CREATE TABLE session_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 480,
  inactivity_timeout_minutes INTEGER DEFAULT 60,
  require_device_authentication BOOLEAN DEFAULT false,
  allow_remote_access BOOLEAN DEFAULT true,
  enable_location_tracking BOOLEAN DEFAULT true,
  enable_suspicious_activity_detection BOOLEAN DEFAULT true,
  auto_terminate_suspicious_sessions BOOLEAN DEFAULT false,
  notify_on_new_device BOOLEAN DEFAULT true,
  notify_on_unusual_location BOOLEAN DEFAULT true,
  trusted_networks TEXT[],
  blocked_countries TEXT[],
  allowed_countries TEXT[],
  max_failed_location_attempts INTEGER DEFAULT 3,
  device_trust_expiration_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Session Flags table
CREATE TABLE session_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('unusual_location', 'new_device', 'suspicious_activity', 'concurrent_sessions', 'security_violation')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Security Events table
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'session_created', 'session_terminated', 'suspicious_activity', 'device_registered', 'location_change')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA Methods table
CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('totp', 'sms', 'email', 'backup_codes')),
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  metadata JSONB NOT NULL,
  last_used TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA Challenges table
CREATE TABLE mfa_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('totp', 'sms', 'email', 'backup_code')),
  method_id UUID NOT NULL REFERENCES mfa_methods(id) ON DELETE CASCADE,
  code TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA Policies table
CREATE TABLE mfa_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  grace_period_days INTEGER DEFAULT 30,
  allowed_methods TEXT[] DEFAULT '{totp,sms,email}',
  require_multiple_methods BOOLEAN DEFAULT false,
  backup_codes_required BOOLEAN DEFAULT true,
  totp_settings JSONB DEFAULT '{"issuerName": "ADSapp", "algorithm": "SHA1", "digits": 6, "period": 30, "window": 1}',
  sms_settings JSONB DEFAULT '{"enabled": true, "provider": "twilio", "maxAttemptsPerDay": 10, "rateLimitMinutes": 1}',
  email_settings JSONB DEFAULT '{"enabled": true, "maxAttemptsPerDay": 10, "rateLimitMinutes": 1}',
  enforcement_rules JSONB DEFAULT '{"requireForAdmins": true, "requireForPrivilegedActions": false, "exemptTrustedDevices": false, "trustedDeviceExpirationDays": 30}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Create indexes for performance
CREATE INDEX idx_sso_providers_organization ON sso_providers(organization_id);
CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at);
CREATE INDEX idx_user_invitations_organization ON user_invitations(organization_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_password_history_user ON password_history(user_id);
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_account_lockouts_user ON account_lockouts(user_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_security_events_organization ON security_events(organization_id);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at);
CREATE INDEX idx_mfa_methods_user ON mfa_methods(user_id);
CREATE INDEX idx_mfa_challenges_user ON mfa_challenges(user_id);
CREATE INDEX idx_mfa_challenges_expires ON mfa_challenges(expires_at);

-- Update triggers for timestamp fields
CREATE TRIGGER update_sso_providers_updated_at BEFORE UPDATE ON sso_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sso_jit_configs_updated_at BEFORE UPDATE ON sso_jit_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_invitations_updated_at BEFORE UPDATE ON user_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitation_templates_updated_at BEFORE UPDATE ON invitation_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitation_settings_updated_at BEFORE UPDATE ON invitation_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_password_policies_updated_at BEFORE UPDATE ON password_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_configurations_updated_at BEFORE UPDATE ON session_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mfa_policies_updated_at BEFORE UPDATE ON mfa_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_jit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_invitation_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-level access
CREATE POLICY "Organization members can manage SSO providers" ON sso_providers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own SSO sessions" ON sso_sessions
  FOR ALL USING (
    user_id = auth.uid()
  );

CREATE POLICY "Organization members can manage JIT configs" ON sso_jit_configs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage invitations" ON user_invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage invitation templates" ON invitation_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage invitation settings" ON invitation_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can view bulk operations" ON bulk_invitation_operations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can view invitation logs" ON invitation_activity_logs
  FOR SELECT USING (
    invitation_id IN (
      SELECT id FROM user_invitations ui
      WHERE ui.organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can manage password policies" ON password_policies
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own password history" ON password_history
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access their own login attempts" ON login_attempts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can view account lockouts" ON account_lockouts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can manage their own devices" ON user_devices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can manage session configs" ON session_configurations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can view session flags" ON session_flags
  FOR ALL USING (
    session_id IN (
      SELECT id FROM user_sessions us
      WHERE us.organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization members can view security events" ON security_events
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own MFA methods" ON mfa_methods
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access their own MFA challenges" ON mfa_challenges
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can manage MFA policies" ON mfa_policies
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Functions for cleanup and maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_mfa_challenges()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  DELETE FROM mfa_challenges
  WHERE expires_at < NOW() AND is_completed = false;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;