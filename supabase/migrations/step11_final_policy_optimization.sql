-- STEP 11: Final policy optimization
-- Fix the remaining policies showing ➖ status

-- ============================================
-- contacts - create policy fix
-- ============================================
DROP POLICY IF EXISTS "Users can create contacts in own organization" ON contacts;
CREATE POLICY "Users can create contacts in own organization" ON contacts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- conversations - create policy fix
-- ============================================
DROP POLICY IF EXISTS "Users can create conversations in own organization" ON conversations;
CREATE POLICY "Users can create conversations in own organization" ON conversations FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())));

-- ============================================
-- messages - create policy fix
-- ============================================
DROP POLICY IF EXISTS "Users can create messages in own organization" ON messages;
CREATE POLICY "Users can create messages in own organization" ON messages FOR INSERT
WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid())
    )
));

-- ============================================
-- profiles - insert policies fix
-- ============================================
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================
-- Note: These policies intentionally don't use auth.uid()
-- They are service-role or super-admin policies
-- ============================================
-- "Enable all access for service role" - uses service role, no auth.uid() needed
-- "Super admins can manage all organizations" - uses is_super_admin check

SELECT 'Step 11 complete: Final policies optimized!' AS status;
