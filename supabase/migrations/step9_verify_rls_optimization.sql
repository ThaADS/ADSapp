-- STEP 9: Verify RLS Policy Optimization
-- Check that all policies use (SELECT auth.uid()) instead of auth.uid()

-- ============================================
-- 1. List all RLS policies and their definitions
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    CASE
        WHEN qual LIKE '%SELECT auth.uid()%' THEN '✅ Optimized'
        WHEN qual LIKE '%auth.uid()%' THEN '⚠️ NOT Optimized (uses auth.uid())'
        ELSE '➖ No auth.uid() check'
    END AS optimization_status,
    LEFT(qual::text, 100) AS policy_definition_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 2. Count optimized vs non-optimized policies
-- ============================================
SELECT
    'Summary' AS report,
    COUNT(*) FILTER (WHERE qual LIKE '%SELECT auth.uid()%') AS optimized_policies,
    COUNT(*) FILTER (WHERE qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%') AS needs_optimization,
    COUNT(*) FILTER (WHERE qual NOT LIKE '%auth.uid()%' OR qual IS NULL) AS no_auth_check,
    COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================
-- 3. Find policies that still need optimization
-- ============================================
SELECT
    '⚠️ NEEDS OPTIMIZATION' AS status,
    tablename,
    policyname,
    qual::text AS full_definition
FROM pg_policies
WHERE schemaname = 'public'
    AND qual LIKE '%auth.uid()%'
    AND qual NOT LIKE '%SELECT auth.uid()%'
ORDER BY tablename;

-- ============================================
-- 4. Verify specific tables from step 8
-- ============================================
SELECT
    tablename,
    policyname,
    CASE
        WHEN qual LIKE '%SELECT auth.uid()%' THEN '✅'
        WHEN qual LIKE '%auth.uid()%' THEN '❌'
        ELSE '➖'
    END AS status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'organizations', 'profiles', 'contacts', 'conversations',
        'messages', 'automation_rules', 'message_templates',
        'webhook_logs', 'conversation_metrics'
    )
ORDER BY tablename, policyname;
