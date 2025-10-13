-- ============================================================================
-- COMPLETE RLS COVERAGE MIGRATION
-- ============================================================================
-- Migration: 20251013_complete_rls_coverage
-- Purpose: Implement comprehensive Row Level Security for all multi-tenant tables
-- Security Level: CRITICAL
-- Impact: All multi-tenant data access patterns
-- ============================================================================

-- ============================================================================
-- SAFETY CHECKS
-- ============================================================================

-- Ensure migration runs in transaction
BEGIN;

-- Verify we're in the correct database
DO $$
BEGIN
  IF current_database() NOT IN ('postgres', 'adsapp') THEN
    RAISE EXCEPTION 'Migration must run on correct database';
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Super Admin Check
-- ============================================================================
-- Reusable function to check if current user is super admin

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin() IS 'Check if current authenticated user is a super admin';

-- ============================================================================
-- HELPER FUNCTION: Get User Organization
-- ============================================================================
-- Reusable function to get current user's organization

CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_organization() IS 'Get organization ID for current authenticated user';

-- ============================================================================
-- SECTION 1: ORGANIZATIONS TABLE
-- ============================================================================
-- Root tenant table with special policies

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

-- SELECT: Users can view their own organization, super admins can view all
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (
    id = get_user_organization()
    OR is_super_admin()
  );

-- UPDATE: Only organization owners/admins or super admins
CREATE POLICY "Admins can update organization"
  ON organizations FOR UPDATE
  USING (
    (
      id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND organization_id = organizations.id
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

-- INSERT: Only super admins can create organizations
CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (is_super_admin());

-- DELETE: Only super admins can delete organizations
CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  USING (is_super_admin());

COMMENT ON TABLE organizations IS 'Multi-tenant organizations with RLS enforced';

-- ============================================================================
-- SECTION 2: PROFILES TABLE
-- ============================================================================
-- User profiles linked to organizations

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- SELECT: Users can view profiles in their organization
CREATE POLICY "Users can view organization profiles"
  ON profiles FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- INSERT: Service role handles during signup (no user policy needed)
-- This is intentionally handled by service role key during registration

-- UPDATE: Users can update their own profile, admins can update org profiles
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

-- DELETE: Only admins and super admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
      )
      AND id != auth.uid() -- Can't delete yourself
    )
    OR is_super_admin()
  );

COMMENT ON TABLE profiles IS 'User profiles with organization-scoped RLS';

-- ============================================================================
-- SECTION 3: CONTACTS TABLE
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can update their organization's contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their organization's contacts" ON contacts;

CREATE POLICY "Users can view their organization's contacts"
  ON contacts FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create contacts in their organization"
  ON contacts FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's contacts"
  ON contacts FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's contacts"
  ON contacts FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE contacts IS 'WhatsApp contacts with full CRUD RLS';

-- ============================================================================
-- SECTION 4: CONVERSATIONS TABLE
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can update their organization's conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their organization's conversations" ON conversations;

CREATE POLICY "Users can view their organization's conversations"
  ON conversations FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create conversations in their organization"
  ON conversations FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's conversations"
  ON conversations FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's conversations"
  ON conversations FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE conversations IS 'WhatsApp conversations with full CRUD RLS';

-- ============================================================================
-- SECTION 5: MESSAGES TABLE
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their organization" ON messages;
DROP POLICY IF EXISTS "Users can update their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their organization's messages" ON messages;

CREATE POLICY "Users can view their organization's messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can create messages in their organization"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

COMMENT ON TABLE messages IS 'Messages with RLS via conversation relationship';

-- ============================================================================
-- SECTION 6: MESSAGE_TEMPLATES TABLE
-- ============================================================================

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's message_templates" ON message_templates;
DROP POLICY IF EXISTS "Users can create message_templates in their organization" ON message_templates;
DROP POLICY IF EXISTS "Users can update their organization's message_templates" ON message_templates;
DROP POLICY IF EXISTS "Users can delete their organization's message_templates" ON message_templates;

CREATE POLICY "Users can view their organization's message_templates"
  ON message_templates FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create message_templates in their organization"
  ON message_templates FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's message_templates"
  ON message_templates FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's message_templates"
  ON message_templates FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE message_templates IS 'Message templates with full CRUD RLS';

-- ============================================================================
-- SECTION 7: AUTOMATION_RULES TABLE
-- ============================================================================

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can create automation_rules in their organization" ON automation_rules;
DROP POLICY IF EXISTS "Users can update their organization's automation_rules" ON automation_rules;
DROP POLICY IF EXISTS "Users can delete their organization's automation_rules" ON automation_rules;

CREATE POLICY "Users can view their organization's automation_rules"
  ON automation_rules FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create automation_rules in their organization"
  ON automation_rules FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's automation_rules"
  ON automation_rules FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's automation_rules"
  ON automation_rules FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE automation_rules IS 'Automation rules with full CRUD RLS';

-- ============================================================================
-- SECTION 8: QUICK_REPLIES TABLE
-- ============================================================================

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's quick_replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can create quick_replies in their organization" ON quick_replies;
DROP POLICY IF EXISTS "Users can update their organization's quick_replies" ON quick_replies;
DROP POLICY IF EXISTS "Users can delete their organization's quick_replies" ON quick_replies;

CREATE POLICY "Users can view their organization's quick_replies"
  ON quick_replies FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create quick_replies in their organization"
  ON quick_replies FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's quick_replies"
  ON quick_replies FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's quick_replies"
  ON quick_replies FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE quick_replies IS 'Quick replies with full CRUD RLS';

-- ============================================================================
-- SECTION 9: TAGS TABLE
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's tags" ON tags;
DROP POLICY IF EXISTS "Users can create tags in their organization" ON tags;
DROP POLICY IF EXISTS "Users can update their organization's tags" ON tags;
DROP POLICY IF EXISTS "Users can delete their organization's tags" ON tags;

CREATE POLICY "Users can view their organization's tags"
  ON tags FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create tags in their organization"
  ON tags FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's tags"
  ON tags FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's tags"
  ON tags FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE tags IS 'Tags with full CRUD RLS';

-- ============================================================================
-- SECTION 10: CONTACT_TAGS TABLE
-- ============================================================================

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's contact_tags" ON contact_tags;
DROP POLICY IF EXISTS "Users can create contact_tags in their organization" ON contact_tags;
DROP POLICY IF EXISTS "Users can update their organization's contact_tags" ON contact_tags;
DROP POLICY IF EXISTS "Users can delete their organization's contact_tags" ON contact_tags;

CREATE POLICY "Users can view their organization's contact_tags"
  ON contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can create contact_tags in their organization"
  ON contact_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's contact_tags"
  ON contact_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's contact_tags"
  ON contact_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

COMMENT ON TABLE contact_tags IS 'Contact tags with RLS via contact relationship';

-- ============================================================================
-- SECTION 11: CONVERSATION_ASSIGNMENTS TABLE
-- ============================================================================

ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's conversation_assignments" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can create conversation_assignments in their organization" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can update their organization's conversation_assignments" ON conversation_assignments;
DROP POLICY IF EXISTS "Users can delete their organization's conversation_assignments" ON conversation_assignments;

CREATE POLICY "Users can view their organization's conversation_assignments"
  ON conversation_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_assignments.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can create conversation_assignments in their organization"
  ON conversation_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_assignments.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's conversation_assignments"
  ON conversation_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_assignments.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's conversation_assignments"
  ON conversation_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_assignments.conversation_id
      AND conversations.organization_id = get_user_organization()
    )
    OR is_super_admin()
  );

COMMENT ON TABLE conversation_assignments IS 'Assignments with RLS via conversation relationship';

-- ============================================================================
-- SECTION 12: ANALYTICS_EVENTS TABLE
-- ============================================================================

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Users can create analytics_events in their organization" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their organization's analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Users can delete their organization's analytics_events" ON analytics_events;

CREATE POLICY "Users can view their organization's analytics_events"
  ON analytics_events FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can create analytics_events in their organization"
  ON analytics_events FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their organization's analytics_events"
  ON analytics_events FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their organization's analytics_events"
  ON analytics_events FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

COMMENT ON TABLE analytics_events IS 'Analytics events with full CRUD RLS';

-- ============================================================================
-- SECTION 13: BILLING_SUBSCRIPTIONS TABLE
-- ============================================================================

ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's billing_subscriptions" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can create billing_subscriptions in their organization" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can update their organization's billing_subscriptions" ON billing_subscriptions;
DROP POLICY IF EXISTS "Admins can delete their organization's billing_subscriptions" ON billing_subscriptions;

CREATE POLICY "Users can view their organization's billing_subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- Only admins and super admins can modify billing
CREATE POLICY "Admins can create billing_subscriptions in their organization"
  ON billing_subscriptions FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's billing_subscriptions"
  ON billing_subscriptions FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's billing_subscriptions"
  ON billing_subscriptions FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE billing_subscriptions IS 'Billing subscriptions with admin-only modification';

-- ============================================================================
-- SECTION 14: INVOICES TABLE
-- ============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can create invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

CREATE POLICY "Users can view their organization's invoices"
  ON invoices FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- Invoices are created by Stripe webhooks (service role)
-- No user INSERT policy needed

CREATE POLICY "Service role can update invoices"
  ON invoices FOR UPDATE
  USING (
    is_super_admin()
  );

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE invoices IS 'Invoices with read access for users, modification for admins';

-- ============================================================================
-- SECTION 15: USAGE_RECORDS TABLE
-- ============================================================================

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's usage_records" ON usage_records;
DROP POLICY IF EXISTS "System can create usage_records" ON usage_records;
DROP POLICY IF EXISTS "System can update usage_records" ON usage_records;
DROP POLICY IF EXISTS "Admins can delete usage_records" ON usage_records;

CREATE POLICY "Users can view their organization's usage_records"
  ON usage_records FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- Usage records are created by system (service role)
CREATE POLICY "System can create usage_records"
  ON usage_records FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "System can update usage_records"
  ON usage_records FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Admins can delete usage_records"
  ON usage_records FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE usage_records IS 'Usage tracking with system-generated records';

-- ============================================================================
-- SECTION 16: WHATSAPP_INTEGRATIONS TABLE
-- ============================================================================

ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's whatsapp_integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can create whatsapp_integrations in their organization" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can update their organization's whatsapp_integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Admins can delete their organization's whatsapp_integrations" ON whatsapp_integrations;

CREATE POLICY "Users can view their organization's whatsapp_integrations"
  ON whatsapp_integrations FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create whatsapp_integrations in their organization"
  ON whatsapp_integrations FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's whatsapp_integrations"
  ON whatsapp_integrations FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's whatsapp_integrations"
  ON whatsapp_integrations FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE whatsapp_integrations IS 'WhatsApp integrations with admin-only modification';

-- ============================================================================
-- SECTION 17: TEAM_MEMBERS TABLE
-- ============================================================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's team_members" ON team_members;
DROP POLICY IF EXISTS "Admins can create team_members in their organization" ON team_members;
DROP POLICY IF EXISTS "Admins can update their organization's team_members" ON team_members;
DROP POLICY IF EXISTS "Admins can delete their organization's team_members" ON team_members;

CREATE POLICY "Users can view their organization's team_members"
  ON team_members FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create team_members in their organization"
  ON team_members FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's team_members"
  ON team_members FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's team_members"
  ON team_members FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE team_members IS 'Team members with admin-managed access';

-- ============================================================================
-- SECTION 18: ROLES TABLE
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's roles" ON roles;
DROP POLICY IF EXISTS "Admins can create roles in their organization" ON roles;
DROP POLICY IF EXISTS "Admins can update their organization's roles" ON roles;
DROP POLICY IF EXISTS "Admins can delete their organization's roles" ON roles;

CREATE POLICY "Users can view their organization's roles"
  ON roles FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create roles in their organization"
  ON roles FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's roles"
  ON roles FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's roles"
  ON roles FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE roles IS 'Custom roles with admin-only management';

-- ============================================================================
-- SECTION 19: PERMISSIONS TABLE
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can create permissions in their organization" ON permissions;
DROP POLICY IF EXISTS "Admins can update their organization's permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can delete their organization's permissions" ON permissions;

CREATE POLICY "Users can view their organization's permissions"
  ON permissions FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create permissions in their organization"
  ON permissions FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's permissions"
  ON permissions FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's permissions"
  ON permissions FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE permissions IS 'Permissions with admin-only management';

-- ============================================================================
-- SECTION 20: AUDIT_LOGS TABLE
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "No user updates to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can delete audit_logs" ON audit_logs;

-- All users can view logs for transparency
CREATE POLICY "Users can view their organization's audit_logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- Audit logs are system-generated only
CREATE POLICY "System can create audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- System creates via service role

-- Audit logs are immutable (no UPDATE policy)

-- Only super admins can delete for compliance
CREATE POLICY "Super admins can delete audit_logs"
  ON audit_logs FOR DELETE
  USING (is_super_admin());

COMMENT ON TABLE audit_logs IS 'Immutable audit logs with read-only user access';

-- ============================================================================
-- SECTION 21: WEBHOOKS TABLE
-- ============================================================================

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhooks" ON webhooks;
DROP POLICY IF EXISTS "Admins can create webhooks in their organization" ON webhooks;
DROP POLICY IF EXISTS "Admins can update their organization's webhooks" ON webhooks;
DROP POLICY IF EXISTS "Admins can delete their organization's webhooks" ON webhooks;

CREATE POLICY "Users can view their organization's webhooks"
  ON webhooks FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create webhooks in their organization"
  ON webhooks FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's webhooks"
  ON webhooks FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's webhooks"
  ON webhooks FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE webhooks IS 'Webhook configurations with admin-only management';

-- ============================================================================
-- SECTION 22: API_KEYS TABLE
-- ============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their organization's api_keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create api_keys in their organization" ON api_keys;
DROP POLICY IF EXISTS "Admins can update their organization's api_keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete their organization's api_keys" ON api_keys;

-- Only admins can view API keys (sensitive)
CREATE POLICY "Admins can view their organization's api_keys"
  ON api_keys FOR SELECT
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can create api_keys in their organization"
  ON api_keys FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's api_keys"
  ON api_keys FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's api_keys"
  ON api_keys FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE api_keys IS 'API keys with admin-only access (highly sensitive)';

-- ============================================================================
-- SECTION 23: NOTIFICATIONS TABLE
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Users see their own notifications only
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- System creates notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Created by service role

-- Users can mark as read
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- Users can delete their notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

COMMENT ON TABLE notifications IS 'User-specific notifications with personal access only';

-- ============================================================================
-- SECTION 24: SETTINGS TABLE
-- ============================================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's settings" ON settings;
DROP POLICY IF EXISTS "Admins can create settings in their organization" ON settings;
DROP POLICY IF EXISTS "Admins can update their organization's settings" ON settings;
DROP POLICY IF EXISTS "Admins can delete their organization's settings" ON settings;

CREATE POLICY "Users can view their organization's settings"
  ON settings FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

CREATE POLICY "Admins can create settings in their organization"
  ON settings FOR INSERT
  WITH CHECK (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can update their organization's settings"
  ON settings FOR UPDATE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

CREATE POLICY "Admins can delete their organization's settings"
  ON settings FOR DELETE
  USING (
    (
      organization_id = get_user_organization()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
    OR is_super_admin()
  );

COMMENT ON TABLE settings IS 'Organization settings with admin-only modification';

-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

-- Create verification view for RLS coverage
CREATE OR REPLACE VIEW rls_coverage_summary AS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  ARRAY_AGG(
    CASE
      WHEN p.cmd = 'r' THEN 'SELECT'
      WHEN p.cmd = 'a' THEN 'INSERT'
      WHEN p.cmd = 'w' THEN 'UPDATE'
      WHEN p.cmd = 'd' THEN 'DELETE'
    END
  ) FILTER (WHERE p.policyname IS NOT NULL) AS operations_covered
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname
  AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename, rowsecurity
ORDER BY rowsecurity DESC, policy_count DESC;

COMMENT ON VIEW rls_coverage_summary IS 'Summary view of RLS coverage across all tables';

-- ============================================================================
-- COMMIT MIGRATION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- Run these queries after migration to verify success:

-- SELECT * FROM rls_coverage_summary;
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT COUNT(*) AS total_policies FROM pg_policies WHERE schemaname = 'public';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All 24 multi-tenant tables now have comprehensive RLS coverage
-- Super admin bypass implemented for all policies
-- Special cases handled: organizations, profiles, notifications, audit_logs
-- Helper functions created for reusable logic
-- Verification view available for ongoing monitoring
-- ============================================================================
