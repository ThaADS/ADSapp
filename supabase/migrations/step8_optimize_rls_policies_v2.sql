-- STEP 8 v2: Optimize RLS policies for performance
-- Fix auth.uid() to (SELECT auth.uid()) to prevent re-evaluation per row
-- Only includes core tables that definitely exist

-- ============================================
-- organizations
-- ============================================
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners can update their organization" ON organizations FOR UPDATE
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'owner'));

-- ============================================
-- profiles
-- ============================================
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Enable update for users own profile" ON profiles;
CREATE POLICY "Enable update for users own profile" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
USING ((SELECT auth.uid()) = id OR organization_id IN (SELECT organization_id FROM profiles p2 WHERE p2.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
USING ((SELECT auth.uid()) = id);

-- ============================================
-- contacts
-- ============================================
DROP POLICY IF EXISTS "Users can access contacts in their organization" ON contacts;
CREATE POLICY "Users can access contacts in their organization" ON contacts FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversations
-- ============================================
DROP POLICY IF EXISTS "Users can access conversations in their organization" ON conversations;
CREATE POLICY "Users can access conversations in their organization" ON conversations FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- messages
-- ============================================
DROP POLICY IF EXISTS "Users can access messages in their organization conversations" ON messages;
CREATE POLICY "Users can access messages in their organization conversations" ON messages FOR ALL
USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- automation_rules
-- ============================================
DROP POLICY IF EXISTS "Users can access automation rules in their organization" ON automation_rules;
CREATE POLICY "Users can access automation rules in their organization" ON automation_rules FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- message_templates
-- ============================================
DROP POLICY IF EXISTS "Users can access templates in their organization" ON message_templates;
CREATE POLICY "Users can access templates in their organization" ON message_templates FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- webhook_logs
-- ============================================
DROP POLICY IF EXISTS "Users can view webhook logs in their organization" ON webhook_logs;
CREATE POLICY "Users can view webhook logs in their organization" ON webhook_logs FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversation_metrics
-- ============================================
DROP POLICY IF EXISTS "Users can view metrics in their organization" ON conversation_metrics;
CREATE POLICY "Users can view metrics in their organization" ON conversation_metrics FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

SELECT 'Step 8 v2 complete: Core RLS policies optimized!' AS status;
