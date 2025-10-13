-- ============================================================================
-- RLS POLICY AUDIT SCRIPT
-- ============================================================================
-- Purpose: Comprehensive audit of Row Level Security policies
-- Usage: Execute in Supabase SQL Editor or via psql
-- Author: ADSapp Security Team
-- ============================================================================

-- ============================================================================
-- SECTION 1: RLS ENABLEMENT STATUS
-- ============================================================================
-- Check which tables have RLS enabled vs disabled

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY rls_status, tablename;

-- ============================================================================
-- SECTION 2: MULTI-TENANT TABLES WITHOUT RLS
-- ============================================================================
-- Critical security issue: tables with organization_id but no RLS

SELECT
  t.tablename AS "⚠️ VULNERABLE TABLE",
  'HAS organization_id column but RLS is DISABLED' AS security_risk
FROM pg_tables t
JOIN information_schema.columns c
  ON c.table_schema = t.schemaname
  AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
  AND c.column_name = 'organization_id'
  AND t.rowsecurity = false
ORDER BY t.tablename;

-- ============================================================================
-- SECTION 3: EXISTING POLICIES INVENTORY
-- ============================================================================
-- List all current RLS policies with details

SELECT
  schemaname AS schema,
  tablename AS table,
  policyname AS policy_name,
  CASE
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
    ELSE cmd
  END AS operation,
  CASE
    WHEN permissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END AS policy_type,
  roles::text AS applies_to_roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, operation;

-- ============================================================================
-- SECTION 4: POLICY COVERAGE ANALYSIS
-- ============================================================================
-- Check which tables have incomplete CRUD coverage

WITH table_policies AS (
  SELECT
    tablename,
    COUNT(CASE WHEN cmd = 'r' THEN 1 END) AS has_select,
    COUNT(CASE WHEN cmd = 'a' THEN 1 END) AS has_insert,
    COUNT(CASE WHEN cmd = 'w' THEN 1 END) AS has_update,
    COUNT(CASE WHEN cmd = 'd' THEN 1 END) AS has_delete,
    COUNT(*) AS total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
),
all_tables AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
    AND tablename NOT IN ('demo_sessions', 'demo_session_activities', 'demo_lead_scores', 'conversion_funnels')
)
SELECT
  a.tablename AS table_name,
  COALESCE(p.has_select, 0) AS select_policies,
  COALESCE(p.has_insert, 0) AS insert_policies,
  COALESCE(p.has_update, 0) AS update_policies,
  COALESCE(p.has_delete, 0) AS delete_policies,
  COALESCE(p.total_policies, 0) AS total_policies,
  CASE
    WHEN COALESCE(p.has_select, 0) > 0
     AND COALESCE(p.has_insert, 0) > 0
     AND COALESCE(p.has_update, 0) > 0
     AND COALESCE(p.has_delete, 0) > 0
    THEN '✅ COMPLETE'
    WHEN COALESCE(p.total_policies, 0) > 0
    THEN '⚠️ PARTIAL'
    ELSE '❌ NONE'
  END AS coverage_status
FROM all_tables a
LEFT JOIN table_policies p ON a.tablename = p.tablename
ORDER BY coverage_status, table_name;

-- ============================================================================
-- SECTION 5: SUPER ADMIN BYPASS CHECK
-- ============================================================================
-- Verify which policies include super admin bypass logic

SELECT
  tablename AS table,
  policyname AS policy,
  CASE
    WHEN qual::text ILIKE '%is_super_admin%'
      OR with_check::text ILIKE '%is_super_admin%'
    THEN '✅ HAS BYPASS'
    ELSE '❌ NO BYPASS'
  END AS super_admin_support
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY super_admin_support, tablename;

-- ============================================================================
-- SECTION 6: POLICY DEFINITION DETAILS
-- ============================================================================
-- Show actual policy expressions for review

SELECT
  schemaname AS schema,
  tablename AS table,
  policyname AS policy,
  CASE
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
    ELSE cmd
  END AS operation,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, operation;

-- ============================================================================
-- SECTION 7: ORGANIZATION_ID COLUMN PRESENCE
-- ============================================================================
-- Identify all multi-tenant tables (should have RLS)

SELECT
  c.table_name,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  CASE
    WHEN t.rowsecurity AND COUNT(p.policyname) >= 4 THEN '✅ PROTECTED'
    WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN '⚠️ PARTIAL'
    WHEN t.rowsecurity THEN '❌ NO POLICIES'
    ELSE '🚨 RLS DISABLED'
  END AS security_status
FROM information_schema.columns c
LEFT JOIN pg_tables t
  ON t.schemaname = c.table_schema
  AND t.tablename = c.table_name
LEFT JOIN pg_policies p
  ON p.schemaname = c.table_schema
  AND p.tablename = c.table_name
WHERE c.table_schema = 'public'
  AND c.column_name = 'organization_id'
  AND c.table_name NOT IN ('demo_sessions', 'demo_session_activities', 'demo_lead_scores', 'conversion_funnels')
GROUP BY c.table_name, t.rowsecurity
ORDER BY security_status, c.table_name;

-- ============================================================================
-- SECTION 8: SUMMARY STATISTICS
-- ============================================================================
-- Overall RLS implementation metrics

WITH stats AS (
  SELECT
    COUNT(DISTINCT t.tablename) AS total_tables,
    COUNT(DISTINCT t.tablename) FILTER (WHERE t.rowsecurity) AS tables_with_rls,
    COUNT(DISTINCT p.tablename) AS tables_with_policies,
    COUNT(*) AS total_policies
  FROM pg_tables t
  LEFT JOIN pg_policies p
    ON p.schemaname = t.schemaname
    AND p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT IN ('demo_sessions', 'demo_session_activities', 'demo_lead_scores', 'conversion_funnels')
)
SELECT
  total_tables,
  tables_with_rls,
  tables_with_policies,
  total_policies,
  ROUND(100.0 * tables_with_rls / NULLIF(total_tables, 0), 1) AS rls_coverage_pct,
  ROUND(100.0 * tables_with_policies / NULLIF(total_tables, 0), 1) AS policy_coverage_pct,
  CASE
    WHEN tables_with_rls = total_tables
     AND tables_with_policies = total_tables
    THEN '✅ EXCELLENT'
    WHEN tables_with_rls >= total_tables * 0.8
    THEN '⚠️ GOOD'
    WHEN tables_with_rls >= total_tables * 0.5
    THEN '⚠️ NEEDS IMPROVEMENT'
    ELSE '🚨 CRITICAL'
  END AS overall_security_rating
FROM stats;

-- ============================================================================
-- SECTION 9: RECOMMENDED ACTIONS
-- ============================================================================
-- Generate action items based on audit findings

SELECT
  '🔧 RECOMMENDED ACTIONS' AS category,
  action,
  priority
FROM (
  SELECT
    'Enable RLS on table: ' || tablename AS action,
    '🚨 CRITICAL' AS priority,
    1 AS sort_order
  FROM pg_tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.schemaname
    AND c.table_name = t.tablename
  WHERE t.schemaname = 'public'
    AND c.column_name = 'organization_id'
    AND t.rowsecurity = false
    AND t.tablename NOT IN ('demo_sessions', 'demo_session_activities', 'demo_lead_scores', 'conversion_funnels')

  UNION ALL

  SELECT
    'Create policies for table: ' || tablename AS action,
    '⚠️ HIGH' AS priority,
    2 AS sort_order
  FROM pg_tables t
  LEFT JOIN pg_policies p
    ON p.schemaname = t.schemaname
    AND p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.policyname IS NULL
    AND t.tablename NOT IN ('demo_sessions', 'demo_session_activities', 'demo_lead_scores', 'conversion_funnels')

  UNION ALL

  SELECT
    'Add super admin bypass to policies on: ' || DISTINCT tablename AS action,
    '📋 MEDIUM' AS priority,
    3 AS sort_order
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual::text NOT ILIKE '%is_super_admin%'
    AND with_check::text NOT ILIKE '%is_super_admin%'

  UNION ALL

  SELECT
    'Review and test all RLS policies' AS action,
    '📋 MEDIUM' AS priority,
    4 AS sort_order
) actions
ORDER BY sort_order, action;

-- ============================================================================
-- SECTION 10: TEST QUERIES
-- ============================================================================
-- Queries to manually test RLS enforcement

-- Test 1: Verify current user context
SELECT
  'Current User ID: ' || COALESCE(auth.uid()::text, 'NOT AUTHENTICATED') AS test_1;

-- Test 2: Check if current user has organization
SELECT
  'Current User Organization: ' || COALESCE(organization_id::text, 'NONE') AS test_2
FROM profiles
WHERE id = auth.uid();

-- Test 3: Verify RLS is enforced (should only see own org data)
SELECT
  'Visible Organizations: ' || COUNT(*)::text AS test_3
FROM organizations;

-- ============================================================================
-- END OF AUDIT SCRIPT
-- ============================================================================
-- Review output carefully and prioritize fixing CRITICAL issues first
-- Run this audit regularly to maintain security compliance
-- ============================================================================
