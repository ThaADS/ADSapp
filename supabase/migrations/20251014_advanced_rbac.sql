-- ============================================================================
-- Advanced RBAC System Migration
-- Phase 4 Week 27-28: Distributed Tracing & Advanced RBAC
-- ============================================================================

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority INTEGER DEFAULT 0, -- Higher priority = more powerful role
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_roles_organization ON roles(organization_id);
CREATE INDEX idx_roles_system ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_roles_priority ON roles(priority DESC);

COMMENT ON TABLE roles IS 'Defines roles with associated permissions';
COMMENT ON COLUMN roles.is_system_role IS 'System roles cannot be deleted or modified';
COMMENT ON COLUMN roles.priority IS 'Role hierarchy - higher number = more powerful';

-- ============================================================================
-- 2. USER ROLES TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_expiry ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE user_roles IS 'Assigns roles to users with optional expiration';

-- ============================================================================
-- 3. PERMISSION OVERRIDES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  resource_id UUID,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_permission_overrides_user ON permission_overrides(user_id);
CREATE INDEX idx_permission_overrides_resource ON permission_overrides(resource, action);
CREATE INDEX idx_permission_overrides_resource_id ON permission_overrides(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_permission_overrides_expiry ON permission_overrides(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE permission_overrides IS 'Specific permission overrides for individual users';
COMMENT ON COLUMN permission_overrides.resource_id IS 'Specific resource ID for granular permissions';

-- ============================================================================
-- 4. RBAC AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'role_created', 'role_assigned', 'permission_denied', etc.
  actor_id UUID REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  role_id UUID REFERENCES roles(id),
  permission_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rbac_audit_organization ON rbac_audit_log(organization_id);
CREATE INDEX idx_rbac_audit_event_type ON rbac_audit_log(event_type);
CREATE INDEX idx_rbac_audit_actor ON rbac_audit_log(actor_id);
CREATE INDEX idx_rbac_audit_target ON rbac_audit_log(target_user_id);
CREATE INDEX idx_rbac_audit_created ON rbac_audit_log(created_at DESC);

COMMENT ON TABLE rbac_audit_log IS 'Complete audit trail of RBAC changes';

-- ============================================================================
-- 5. INSERT SYSTEM ROLES
-- ============================================================================

-- Super Admin (Platform-wide)
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'super_admin',
    'Platform super administrator with full access',
    true,
    '[
      {"resource": "*", "action": "*", "conditions": {}}
    ]'::jsonb,
    1000
  )
ON CONFLICT DO NOTHING;

-- Organization Owner (Per Organization)
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'organization_owner',
  'Organization owner with full organizational access',
  true,
  '[
    {"resource": "organizations", "action": "*", "conditions": {"organization": true}},
    {"resource": "users", "action": "*", "conditions": {"organization": true}},
    {"resource": "roles", "action": "*", "conditions": {"organization": true}},
    {"resource": "conversations", "action": "*", "conditions": {"organization": true}},
    {"resource": "contacts", "action": "*", "conditions": {"organization": true}},
    {"resource": "templates", "action": "*", "conditions": {"organization": true}},
    {"resource": "automation", "action": "*", "conditions": {"organization": true}},
    {"resource": "analytics", "action": "*", "conditions": {"organization": true}},
    {"resource": "billing", "action": "*", "conditions": {"organization": true}},
    {"resource": "settings", "action": "*", "conditions": {"organization": true}}
  ]'::jsonb,
  900
FROM organizations
ON CONFLICT DO NOTHING;

-- Organization Admin
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'organization_admin',
  'Organization administrator with management access',
  true,
  '[
    {"resource": "users", "action": "read", "conditions": {"organization": true}},
    {"resource": "users", "action": "create", "conditions": {"organization": true}},
    {"resource": "users", "action": "update", "conditions": {"organization": true}},
    {"resource": "conversations", "action": "*", "conditions": {"organization": true}},
    {"resource": "contacts", "action": "*", "conditions": {"organization": true}},
    {"resource": "templates", "action": "*", "conditions": {"organization": true}},
    {"resource": "automation", "action": "*", "conditions": {"organization": true}},
    {"resource": "analytics", "action": "read", "conditions": {"organization": true}},
    {"resource": "settings", "action": "read", "conditions": {"organization": true}}
  ]'::jsonb,
  800
FROM organizations
ON CONFLICT DO NOTHING;

-- Team Lead
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'team_lead',
  'Team lead with team management access',
  true,
  '[
    {"resource": "conversations", "action": "*", "conditions": {"team": true}},
    {"resource": "contacts", "action": "*", "conditions": {"team": true}},
    {"resource": "templates", "action": "read", "conditions": {"organization": true}},
    {"resource": "templates", "action": "use", "conditions": {"organization": true}},
    {"resource": "automation", "action": "read", "conditions": {"team": true}},
    {"resource": "analytics", "action": "read", "conditions": {"team": true}}
  ]'::jsonb,
  700
FROM organizations
ON CONFLICT DO NOTHING;

-- Agent
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'agent',
  'Agent with conversation handling access',
  true,
  '[
    {"resource": "conversations", "action": "read", "conditions": {"organization": true}},
    {"resource": "conversations", "action": "create", "conditions": {"organization": true}},
    {"resource": "conversations", "action": "update", "conditions": {"own": true}},
    {"resource": "conversations", "action": "close", "conditions": {"own": true}},
    {"resource": "contacts", "action": "read", "conditions": {"organization": true}},
    {"resource": "contacts", "action": "create", "conditions": {"organization": true}},
    {"resource": "contacts", "action": "update", "conditions": {"own": true}},
    {"resource": "templates", "action": "read", "conditions": {"organization": true}},
    {"resource": "templates", "action": "use", "conditions": {"organization": true}}
  ]'::jsonb,
  600
FROM organizations
ON CONFLICT DO NOTHING;

-- Supervisor
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'supervisor',
  'Supervisor with monitoring and reporting access',
  true,
  '[
    {"resource": "conversations", "action": "read", "conditions": {"organization": true}},
    {"resource": "contacts", "action": "read", "conditions": {"organization": true}},
    {"resource": "templates", "action": "read", "conditions": {"organization": true}},
    {"resource": "analytics", "action": "read", "conditions": {"organization": true}},
    {"resource": "reports", "action": "*", "conditions": {"organization": true}}
  ]'::jsonb,
  650
FROM organizations
ON CONFLICT DO NOTHING;

-- Billing Manager
INSERT INTO roles (id, organization_id, name, description, is_system_role, permissions, priority)
SELECT
  gen_random_uuid(),
  id,
  'billing_manager',
  'Billing manager with financial access',
  true,
  '[
    {"resource": "billing", "action": "*", "conditions": {"organization": true}},
    {"resource": "analytics", "action": "read", "conditions": {"organization": true}},
    {"resource": "reports", "action": "read", "conditions": {"organization": true}}
  ]'::jsonb,
  500
FROM organizations
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- Roles policies
CREATE POLICY roles_select ON roles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR is_system_role = true
  );

CREATE POLICY roles_insert ON roles
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'organization_owner', 'organization_admin')
    )
  );

CREATE POLICY roles_update ON roles
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'organization_owner', 'organization_admin')
    )
    AND is_system_role = false
  );

CREATE POLICY roles_delete ON roles
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'organization_owner')
    )
    AND is_system_role = false
  );

-- User roles policies
CREATE POLICY user_roles_select ON user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT id FROM profiles
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'organization_owner', 'organization_admin')
      )
    )
  );

-- Permission overrides policies
CREATE POLICY permission_overrides_select ON permission_overrides
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT id FROM profiles
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'organization_owner', 'organization_admin')
      )
    )
  );

-- Audit log policies
CREATE POLICY rbac_audit_select ON rbac_audit_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'organization_owner', 'organization_admin')
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_role_permissions JSONB;
  v_permission JSONB;
BEGIN
  -- Check permission overrides first
  SELECT allowed INTO v_has_permission
  FROM permission_overrides
  WHERE user_id = p_user_id
    AND resource = p_resource
    AND action = p_action
    AND (resource_id IS NULL OR resource_id = p_resource_id)
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY resource_id NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RETURN v_has_permission;
  END IF;

  -- Check role permissions
  FOR v_role_permissions IN
    SELECT r.permissions
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY r.priority DESC
  LOOP
    FOR v_permission IN SELECT * FROM jsonb_array_elements(v_role_permissions)
    LOOP
      -- Check if permission matches
      IF (v_permission->>'resource' = '*' OR v_permission->>'resource' = p_resource)
         AND (v_permission->>'action' = '*' OR v_permission->>'action' = p_action)
      THEN
        RETURN true;
      END IF;
    END LOOP;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_permissions JSONB := '[]'::jsonb;
BEGIN
  -- Aggregate all permissions from user's roles
  SELECT jsonb_agg(DISTINCT perm)
  INTO v_permissions
  FROM (
    SELECT jsonb_array_elements(r.permissions) as perm
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) perms;

  RETURN COALESCE(v_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS FOR AUDIT LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION log_rbac_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO rbac_audit_log (
      organization_id,
      event_type,
      actor_id,
      target_user_id,
      role_id,
      permission_data,
      metadata
    ) VALUES (
      COALESCE(NEW.organization_id, (SELECT organization_id FROM profiles WHERE id = NEW.user_id LIMIT 1)),
      TG_TABLE_NAME || '_created',
      auth.uid(),
      NEW.user_id,
      NEW.role_id,
      to_jsonb(NEW),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO rbac_audit_log (
      organization_id,
      event_type,
      actor_id,
      target_user_id,
      role_id,
      permission_data,
      metadata
    ) VALUES (
      COALESCE(NEW.organization_id, (SELECT organization_id FROM profiles WHERE id = NEW.user_id LIMIT 1)),
      TG_TABLE_NAME || '_updated',
      auth.uid(),
      NEW.user_id,
      NEW.role_id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO rbac_audit_log (
      organization_id,
      event_type,
      actor_id,
      target_user_id,
      role_id,
      permission_data,
      metadata
    ) VALUES (
      COALESCE(OLD.organization_id, (SELECT organization_id FROM profiles WHERE id = OLD.user_id LIMIT 1)),
      TG_TABLE_NAME || '_deleted',
      auth.uid(),
      OLD.user_id,
      OLD.role_id,
      to_jsonb(OLD),
      jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_rbac_change();

CREATE TRIGGER permission_overrides_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON permission_overrides
  FOR EACH ROW EXECUTE FUNCTION log_rbac_change();

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Advanced RBAC system with role hierarchy, permission overrides, and complete audit trail';
