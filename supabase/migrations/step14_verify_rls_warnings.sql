-- STEP 14: Verify remaining auth_rls_initplan warnings
-- Run this to see how many RLS policies still need optimization

SELECT
    schemaname,
    tablename,
    policyname,
    CASE
        WHEN qual::text LIKE '%(SELECT auth.uid())%' THEN '✅ Optimized'
        WHEN qual::text LIKE '%auth.uid()%' THEN '⚠️ Needs optimization'
        ELSE '✅ No auth.uid()'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND qual::text LIKE '%auth.uid()%'
ORDER BY
    CASE
        WHEN qual::text LIKE '%(SELECT auth.uid())%' THEN 2
        ELSE 1
    END,
    tablename;
