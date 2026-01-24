-- STEP 10: Optimize remaining RLS policies
-- Fix policies that still use auth.uid() without SELECT wrapper

-- ============================================
-- contacts - additional policies
-- ============================================
DROP POLICY IF EXISTS "Users can create contacts in own organization" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in own organization" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in own organization" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in own organization" ON contacts;

-- ============================================
-- conversations - additional policies
-- ============================================
DROP POLICY IF EXISTS "Users can create conversations in own organization" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations in own organization" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations in own organization" ON conversations;

-- ============================================
-- messages - additional policies
-- ============================================
DROP POLICY IF EXISTS "Users can create messages in own organization" ON messages;
DROP POLICY IF EXISTS "Users can view messages in own organization" ON messages;

-- ============================================
-- organizations - additional policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

-- ============================================
-- profiles - additional policies
-- ============================================
DROP POLICY IF EXISTS "Enable read for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in own organization" ON profiles;

-- Now recreate with optimized auth.uid() calls

-- contacts
CREATE POLICY "Users can create contacts in own organization" ON contacts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can delete contacts in own organization" ON contacts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can update contacts in own organization" ON contacts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can view contacts in own organization" ON contacts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- conversations
CREATE POLICY "Users can create conversations in own organization" ON conversations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can update conversations in own organization" ON conversations FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can view conversations in own organization" ON conversations FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- messages
CREATE POLICY "Users can create messages in own organization" ON messages FOR INSERT
WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

CREATE POLICY "Users can view messages in own organization" ON messages FOR SELECT
USING (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- organizations
CREATE POLICY "Users can view own organization" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- profiles
CREATE POLICY "Enable read for authenticated users" ON profiles FOR SELECT
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users can view profiles in own organization" ON profiles FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles p2 WHERE p2.id = (SELECT auth.uid())));

SELECT 'Step 10 complete: Remaining policies optimized!' AS status;
