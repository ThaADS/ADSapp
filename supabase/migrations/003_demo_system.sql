-- Demo System Migration
-- This migration adds a comprehensive demo account system for trial/demo purposes

-- Add demo flags to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_template_type TEXT CHECK (demo_template_type IN ('ecommerce', 'restaurant', 'saas', 'healthcare', 'education', 'retail', 'custom')),
ADD COLUMN IF NOT EXISTS auto_reset_demo BOOLEAN DEFAULT true;

-- Create demo organizations table for pre-configured demo templates
CREATE TABLE demo_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type TEXT NOT NULL CHECK (template_type IN ('ecommerce', 'restaurant', 'saas', 'healthcare', 'education', 'retail', 'custom')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  business_type TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_type, slug)
);

-- Create demo sessions table to track active demo sessions
CREATE TABLE demo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_template_id UUID REFERENCES demo_organizations(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  user_email TEXT,
  user_name TEXT,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  conversion_data JSONB DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create demo data templates table for seeding data
CREATE TABLE demo_data_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type TEXT NOT NULL CHECK (template_type IN ('ecommerce', 'restaurant', 'saas', 'healthcare', 'education', 'retail', 'custom')),
  data_type TEXT NOT NULL CHECK (data_type IN ('contacts', 'conversations', 'messages', 'automation_rules', 'templates', 'analytics')),
  name TEXT NOT NULL,
  description TEXT,
  data_content JSONB NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create demo analytics table for pre-computed demo analytics
CREATE TABLE demo_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type TEXT NOT NULL CHECK (template_type IN ('ecommerce', 'restaurant', 'saas', 'healthcare', 'education', 'retail', 'custom')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('conversations', 'response_time', 'resolution_time', 'customer_satisfaction', 'team_performance', 'business_metrics')),
  date_range TEXT NOT NULL CHECK (date_range IN ('24h', '7d', '30d', '90d')),
  metric_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_type, metric_type, date_range)
);

-- Create demo session activities table for tracking user interactions
CREATE TABLE demo_session_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('page_view', 'message_sent', 'contact_viewed', 'conversation_opened', 'automation_triggered', 'template_used', 'analytics_viewed', 'settings_accessed', 'demo_extended', 'signup_clicked')),
  activity_data JSONB DEFAULT '{}',
  page_path TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create demo reset logs table for tracking demo resets
CREATE TABLE demo_reset_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reset_type TEXT NOT NULL CHECK (reset_type IN ('manual', 'scheduled', 'expired', 'converted')),
  reset_reason TEXT,
  data_backup JSONB,
  reset_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_organizations_demo ON organizations(is_demo) WHERE is_demo = true;
CREATE INDEX idx_organizations_demo_expires ON organizations(demo_expires_at) WHERE demo_expires_at IS NOT NULL;
CREATE INDEX idx_organizations_demo_template ON organizations(demo_template_type) WHERE demo_template_type IS NOT NULL;

CREATE INDEX idx_demo_organizations_template_type ON demo_organizations(template_type);
CREATE INDEX idx_demo_organizations_active ON demo_organizations(is_active) WHERE is_active = true;

CREATE INDEX idx_demo_sessions_organization_id ON demo_sessions(organization_id);
CREATE INDEX idx_demo_sessions_token ON demo_sessions(session_token);
CREATE INDEX idx_demo_sessions_status ON demo_sessions(status);
CREATE INDEX idx_demo_sessions_expires_at ON demo_sessions(expires_at);
CREATE INDEX idx_demo_sessions_last_activity ON demo_sessions(last_activity_at);

CREATE INDEX idx_demo_data_templates_type ON demo_data_templates(template_type, data_type);
CREATE INDEX idx_demo_data_templates_active ON demo_data_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_demo_analytics_template_metric ON demo_analytics(template_type, metric_type);

CREATE INDEX idx_demo_activities_session_id ON demo_session_activities(session_id);
CREATE INDEX idx_demo_activities_type ON demo_session_activities(activity_type);
CREATE INDEX idx_demo_activities_created_at ON demo_session_activities(created_at DESC);

CREATE INDEX idx_demo_reset_logs_org_id ON demo_reset_logs(organization_id);
CREATE INDEX idx_demo_reset_logs_created_at ON demo_reset_logs(created_at DESC);

-- Updated at triggers
CREATE TRIGGER update_demo_organizations_updated_at BEFORE UPDATE ON demo_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demo_sessions_updated_at BEFORE UPDATE ON demo_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demo_data_templates_updated_at BEFORE UPDATE ON demo_data_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demo_analytics_updated_at BEFORE UPDATE ON demo_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Demo Organizations - Super admins can manage, authenticated users can view active templates
ALTER TABLE demo_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage demo organizations" ON demo_organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view active demo organization templates" ON demo_organizations
  FOR SELECT USING (is_active = true);

-- Demo Sessions - Users can only access their own sessions, super admins can access all
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all demo sessions" ON demo_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can access their demo organization sessions" ON demo_sessions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Demo Data Templates - Super admins can manage, users can view active templates
ALTER TABLE demo_data_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage demo data templates" ON demo_data_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view active demo data templates" ON demo_data_templates
  FOR SELECT USING (is_active = true);

-- Demo Analytics - Super admins can manage, authenticated users can view
ALTER TABLE demo_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage demo analytics" ON demo_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view demo analytics" ON demo_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Demo Session Activities - Users can only access activities for their sessions
ALTER TABLE demo_session_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all demo session activities" ON demo_session_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can access their demo session activities" ON demo_session_activities
  FOR ALL USING (
    session_id IN (
      SELECT ds.id FROM demo_sessions ds
      JOIN profiles p ON p.organization_id = ds.organization_id
      WHERE p.id = auth.uid()
    )
  );

-- Demo Reset Logs - Super admins can view all, organization members can view their own
ALTER TABLE demo_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all demo reset logs" ON demo_reset_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view their organization demo reset logs" ON demo_reset_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Update existing RLS policies to handle demo organizations
-- Update contacts policy to allow demo data access
DROP POLICY IF EXISTS "Users can access contacts in their organization" ON contacts;
CREATE POLICY "Users can access contacts in their organization" ON contacts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) OR (
      -- Allow access for demo organizations without authentication
      organization_id IN (
        SELECT id FROM organizations WHERE is_demo = true AND demo_expires_at > NOW()
      ) AND auth.role() = 'anon'
    )
  );

-- Update conversations policy for demo access
DROP POLICY IF EXISTS "Users can access conversations in their organization" ON conversations;
CREATE POLICY "Users can access conversations in their organization" ON conversations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) OR (
      -- Allow access for demo organizations without authentication
      organization_id IN (
        SELECT id FROM organizations WHERE is_demo = true AND demo_expires_at > NOW()
      ) AND auth.role() = 'anon'
    )
  );

-- Update messages policy for demo access
DROP POLICY IF EXISTS "Users can access messages in their organization conversations" ON messages;
CREATE POLICY "Users can access messages in their organization conversations" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN profiles p ON p.organization_id = c.organization_id
      WHERE p.id = auth.uid()
    ) OR (
      -- Allow access for demo conversations
      conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN organizations o ON o.id = c.organization_id
        WHERE o.is_demo = true AND o.demo_expires_at > NOW()
      ) AND auth.role() = 'anon'
    )
  );

-- Functions for demo system management

-- Function to create a new demo session
CREATE OR REPLACE FUNCTION create_demo_session(
  template_type TEXT,
  user_email TEXT DEFAULT NULL,
  user_name TEXT DEFAULT NULL,
  session_duration_hours INTEGER DEFAULT 24,
  utm_data JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  session_id UUID,
  organization_id UUID,
  session_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  demo_org_id UUID;
  demo_template_id UUID;
  new_session_id UUID;
  new_session_token TEXT;
  session_expires_at TIMESTAMPTZ;
BEGIN
  -- Get or create demo organization template
  SELECT id INTO demo_template_id
  FROM demo_organizations
  WHERE template_type = create_demo_session.template_type
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF demo_template_id IS NULL THEN
    RAISE EXCEPTION 'No active demo template found for type: %', template_type;
  END IF;

  -- Create new demo organization instance
  INSERT INTO organizations (
    name,
    slug,
    is_demo,
    demo_expires_at,
    demo_template_type,
    auto_reset_demo,
    subscription_status,
    subscription_tier
  ) VALUES (
    'Demo: ' || (SELECT name FROM demo_organizations WHERE id = demo_template_id),
    'demo-' || template_type || '-' || extract(epoch from now())::text,
    true,
    NOW() + (session_duration_hours || ' hours')::INTERVAL,
    template_type,
    true,
    'trial',
    'starter'
  ) RETURNING id INTO demo_org_id;

  -- Generate session token
  new_session_token := encode(gen_random_bytes(32), 'base64');
  session_expires_at := NOW() + (session_duration_hours || ' hours')::INTERVAL;

  -- Create demo session
  INSERT INTO demo_sessions (
    organization_id,
    demo_template_id,
    session_token,
    user_email,
    user_name,
    expires_at,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content
  ) VALUES (
    demo_org_id,
    demo_template_id,
    new_session_token,
    user_email,
    user_name,
    session_expires_at,
    utm_data->>'utm_source',
    utm_data->>'utm_medium',
    utm_data->>'utm_campaign',
    utm_data->>'utm_content'
  ) RETURNING id INTO new_session_id;

  -- Seed demo data
  PERFORM seed_demo_organization_data(demo_org_id, template_type);

  RETURN QUERY SELECT
    new_session_id,
    demo_org_id,
    new_session_token,
    session_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate demo session
CREATE OR REPLACE FUNCTION validate_demo_session(token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  session_id UUID,
  organization_id UUID,
  expires_at TIMESTAMPTZ,
  time_remaining INTERVAL
) AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT
    ds.id,
    ds.organization_id,
    ds.expires_at,
    ds.status,
    o.is_demo,
    o.demo_expires_at
  INTO session_record
  FROM demo_sessions ds
  JOIN organizations o ON o.id = ds.organization_id
  WHERE ds.session_token = token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ, NULL::INTERVAL;
    RETURN;
  END IF;

  -- Check if session is expired
  IF session_record.expires_at <= NOW() OR session_record.status != 'active' THEN
    -- Update session status
    UPDATE demo_sessions SET status = 'expired' WHERE session_token = token;
    RETURN QUERY SELECT false, session_record.id, session_record.organization_id, session_record.expires_at, INTERVAL '0';
    RETURN;
  END IF;

  -- Update last activity
  UPDATE demo_sessions SET last_activity_at = NOW() WHERE session_token = token;

  RETURN QUERY SELECT
    true,
    session_record.id,
    session_record.organization_id,
    session_record.expires_at,
    session_record.expires_at - NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track demo session activity
CREATE OR REPLACE FUNCTION track_demo_activity(
  session_token TEXT,
  activity_type TEXT,
  activity_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT DEFAULT NULL,
  duration_seconds INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Get session ID and validate
  SELECT id INTO session_id
  FROM demo_sessions
  WHERE session_token = track_demo_activity.session_token
    AND status = 'active'
    AND expires_at > NOW();

  IF session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Insert activity record
  INSERT INTO demo_session_activities (
    session_id,
    activity_type,
    activity_data,
    page_path,
    duration_seconds
  ) VALUES (
    session_id,
    activity_type,
    activity_data,
    page_path,
    duration_seconds
  );

  -- Update session last activity
  UPDATE demo_sessions
  SET last_activity_at = NOW()
  WHERE id = session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset demo organization data
CREATE OR REPLACE FUNCTION reset_demo_organization(
  org_id UUID,
  reset_reason TEXT DEFAULT 'manual'
) RETURNS BOOLEAN AS $$
DECLARE
  org_record RECORD;
  backup_data JSONB;
BEGIN
  -- Get organization info
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id AND is_demo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or not a demo organization';
  END IF;

  -- Create backup of current data
  SELECT jsonb_build_object(
    'contacts_count', (SELECT COUNT(*) FROM contacts WHERE organization_id = org_id),
    'conversations_count', (SELECT COUNT(*) FROM conversations WHERE organization_id = org_id),
    'messages_count', (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.organization_id = org_id),
    'reset_timestamp', NOW()
  ) INTO backup_data;

  -- Log the reset
  INSERT INTO demo_reset_logs (
    organization_id,
    reset_type,
    reset_reason,
    data_backup
  ) VALUES (
    org_id,
    'manual',
    reset_reason,
    backup_data
  );

  -- Delete existing data (cascade will handle related records)
  DELETE FROM contacts WHERE organization_id = org_id;
  DELETE FROM conversations WHERE organization_id = org_id;
  DELETE FROM automation_rules WHERE organization_id = org_id;
  DELETE FROM message_templates WHERE organization_id = org_id;
  DELETE FROM conversation_metrics WHERE organization_id = org_id;

  -- Reseed with fresh demo data
  PERFORM seed_demo_organization_data(org_id, org_record.demo_template_type);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired demo sessions
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
  org_record RECORD;
BEGIN
  expired_count := 0;

  -- Update expired sessions
  UPDATE demo_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();

  -- Get expired demo organizations
  FOR org_record IN
    SELECT id FROM organizations
    WHERE is_demo = true
      AND demo_expires_at <= NOW()
  LOOP
    -- Log the cleanup
    INSERT INTO demo_reset_logs (
      organization_id,
      reset_type,
      reset_reason
    ) VALUES (
      org_record.id,
      'expired',
      'Automatic cleanup of expired demo session'
    );

    -- Delete the demo organization (cascade will handle all related data)
    DELETE FROM organizations WHERE id = org_record.id;
    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend demo session
CREATE OR REPLACE FUNCTION extend_demo_session(
  session_token TEXT,
  additional_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  success BOOLEAN,
  new_expires_at TIMESTAMPTZ,
  time_remaining INTERVAL
) AS $$
DECLARE
  session_record RECORD;
  new_expiry TIMESTAMPTZ;
BEGIN
  -- Get session info
  SELECT ds.id, ds.organization_id, ds.expires_at, o.demo_expires_at
  INTO session_record
  FROM demo_sessions ds
  JOIN organizations o ON o.id = ds.organization_id
  WHERE ds.session_token = extend_demo_session.session_token
    AND ds.status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, NULL::INTERVAL;
    RETURN;
  END IF;

  -- Calculate new expiry time
  new_expiry := GREATEST(session_record.expires_at, NOW()) + (additional_hours || ' hours')::INTERVAL;

  -- Update session
  UPDATE demo_sessions
  SET expires_at = new_expiry,
      last_activity_at = NOW()
  WHERE session_token = extend_demo_session.session_token;

  -- Update organization
  UPDATE organizations
  SET demo_expires_at = new_expiry
  WHERE id = session_record.organization_id;

  -- Track the extension activity
  PERFORM track_demo_activity(
    session_token,
    'demo_extended',
    jsonb_build_object('additional_hours', additional_hours)
  );

  RETURN QUERY SELECT
    true,
    new_expiry,
    new_expiry - NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function stub for seeding demo data (to be implemented based on templates)
CREATE OR REPLACE FUNCTION seed_demo_organization_data(
  org_id UUID,
  template_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- This function will be implemented with specific seeding logic
  -- based on the demo data templates
  RAISE NOTICE 'Seeding demo data for organization % with template %', org_id, template_type;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON demo_organizations TO authenticated, anon;
GRANT ALL ON demo_sessions TO authenticated, anon;
GRANT SELECT ON demo_data_templates TO authenticated, anon;
GRANT SELECT ON demo_analytics TO authenticated, anon;
GRANT ALL ON demo_session_activities TO authenticated, anon;
GRANT SELECT ON demo_reset_logs TO authenticated;

-- Insert default demo organization templates
INSERT INTO demo_organizations (template_type, name, slug, description, industry, business_type, configuration) VALUES
('ecommerce', 'StyleHub Fashion Store', 'stylehub-demo', 'Modern online fashion retailer with global shipping', 'Fashion & Retail', 'E-commerce', '{
  "business_hours": {"monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-18:00", "saturday": "10:00-16:00", "sunday": "closed"},
  "features": ["order_tracking", "product_catalog", "customer_support", "returns"],
  "auto_responses": true,
  "team_size": 5
}'),
('restaurant', 'Bella Vista Italian Restaurant', 'bellavista-demo', 'Family-owned Italian restaurant with delivery service', 'Food & Beverage', 'Restaurant', '{
  "business_hours": {"monday": "11:00-22:00", "tuesday": "11:00-22:00", "wednesday": "11:00-22:00", "thursday": "11:00-22:00", "friday": "11:00-23:00", "saturday": "11:00-23:00", "sunday": "12:00-21:00"},
  "features": ["reservations", "delivery", "menu_sharing", "special_offers"],
  "auto_responses": true,
  "team_size": 3
}'),
('saas', 'CloudFlow Project Management', 'cloudflow-demo', 'SaaS platform for team collaboration and project management', 'Technology', 'SaaS', '{
  "business_hours": {"monday": "08:00-20:00", "tuesday": "08:00-20:00", "wednesday": "08:00-20:00", "thursday": "08:00-20:00", "friday": "08:00-20:00", "saturday": "closed", "sunday": "closed"},
  "features": ["customer_onboarding", "technical_support", "billing_inquiries", "feature_requests"],
  "auto_responses": true,
  "team_size": 8
}'),
('healthcare', 'MediCare Family Clinic', 'medicare-demo', 'Family healthcare clinic with appointment booking', 'Healthcare', 'Medical Clinic', '{
  "business_hours": {"monday": "08:00-17:00", "tuesday": "08:00-17:00", "wednesday": "08:00-17:00", "thursday": "08:00-17:00", "friday": "08:00-17:00", "saturday": "09:00-13:00", "sunday": "closed"},
  "features": ["appointment_booking", "prescription_reminders", "health_tips", "emergency_contact"],
  "auto_responses": true,
  "team_size": 4
}'),
('education', 'BrightMinds Online Academy', 'brightminds-demo', 'Online education platform for professional courses', 'Education', 'Online Learning', '{
  "business_hours": {"monday": "07:00-21:00", "tuesday": "07:00-21:00", "wednesday": "07:00-21:00", "thursday": "07:00-21:00", "friday": "07:00-21:00", "saturday": "09:00-17:00", "sunday": "09:00-17:00"},
  "features": ["course_enrollment", "student_support", "assignment_help", "career_guidance"],
  "auto_responses": true,
  "team_size": 6
}'),
('retail', 'TechGear Electronics Store', 'techgear-demo', 'Electronics retail store with warranty services', 'Electronics', 'Retail Store', '{
  "business_hours": {"monday": "10:00-20:00", "tuesday": "10:00-20:00", "wednesday": "10:00-20:00", "thursday": "10:00-20:00", "friday": "10:00-20:00", "saturday": "10:00-18:00", "sunday": "12:00-17:00"},
  "features": ["product_info", "warranty_claims", "technical_support", "store_locator"],
  "auto_responses": true,
  "team_size": 4
}'
)
ON CONFLICT (template_type, slug) DO NOTHING;

-- Create cleanup job function (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION schedule_demo_cleanup()
RETURNS void AS $$
BEGIN
  PERFORM cleanup_expired_demo_sessions();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;