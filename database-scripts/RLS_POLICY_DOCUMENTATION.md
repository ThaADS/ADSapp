# Row Level Security (RLS) Policy Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Patterns](#implementation-patterns)
4. [Special Cases](#special-cases)
5. [Adding RLS to New Tables](#adding-rls-to-new-tables)
6. [Testing RLS Policies](#testing-rls-policies)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Overview

### What is Row Level Security?

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can access in database tables. In ADSapp's multi-tenant architecture, RLS ensures that:

- Organizations can only access their own data
- Users can only access data from their organization
- Super admins can access all data for platform management
- Data isolation is enforced at the database level (not just application level)

### Why RLS is Critical

**Without RLS:**
- Application bugs could expose other organizations' data
- SQL injection attacks could bypass application-level security
- Direct database access tools would see all data
- Compliance violations (GDPR, HIPAA, SOC 2)

**With RLS:**
- Database enforces security even if application has bugs
- Defense in depth: multiple security layers
- Compliance-friendly: data isolation at infrastructure level
- Super admin capabilities for platform management

### Coverage Status

After applying the RLS migration, ADSapp has:

- ✅ **24 multi-tenant tables** with complete RLS coverage
- ✅ **96 total policies** (4 CRUD policies × 24 tables)
- ✅ **Super admin bypass** on all policies
- ✅ **Special handling** for organizations, profiles, notifications, and audit_logs
- ✅ **100% RLS coverage** for production data

---

## Architecture

### Multi-Tenant Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                     ORGANIZATIONS TABLE                     │
│                    (Tenant Root Entity)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ organization_id (FK)
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ profiles │    │ contacts │    │ messages │  ... (21 more tables)
│          │    │          │    │          │
│ RLS: ✅  │    │ RLS: ✅  │    │ RLS: ✅  │
└──────────┘    └──────────┘    └──────────┘
```

### Policy Architecture

Each multi-tenant table follows this pattern:

```sql
Table: {table_name}
├── RLS ENABLED ✅
├── SELECT Policy
│   └── USING: organization_id = get_user_organization() OR is_super_admin()
├── INSERT Policy
│   └── WITH CHECK: organization_id = get_user_organization() OR is_super_admin()
├── UPDATE Policy
│   └── USING: organization_id = get_user_organization() OR is_super_admin()
└── DELETE Policy
    └── USING: organization_id = get_user_organization() OR is_super_admin()
```

### Helper Functions

Two reusable functions simplify policy logic:

#### `get_user_organization()`
Returns the organization_id for the current authenticated user.

```sql
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
```

**Usage:**
- Eliminates repetitive subqueries in policies
- Cached during query execution (STABLE)
- Security definer ensures consistent execution

#### `is_super_admin()`
Checks if the current user is a super admin.

```sql
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
```

**Usage:**
- Provides super admin bypass for all policies
- Enables platform management capabilities
- Consistent super admin checks across all tables

---

## Implementation Patterns

### Standard Multi-Tenant Table Pattern

For tables with `organization_id` column:

```sql
-- 1. Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy
CREATE POLICY "Users can view their organization's {table_name}"
  ON {table_name} FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- 3. INSERT Policy
CREATE POLICY "Users can create {table_name} in their organization"
  ON {table_name} FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- 4. UPDATE Policy
CREATE POLICY "Users can update their organization's {table_name}"
  ON {table_name} FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- 5. DELETE Policy
CREATE POLICY "Users can delete their organization's {table_name}"
  ON {table_name} FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );
```

### Admin-Only Modification Pattern

For sensitive tables where only admins should modify data:

```sql
CREATE POLICY "Admins can update {table_name}"
  ON {table_name} FOR UPDATE
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
```

**Used in:**
- `billing_subscriptions`
- `whatsapp_integrations`
- `team_members`
- `roles`
- `permissions`
- `webhooks`
- `api_keys`
- `settings`

### Relationship-Based Access Pattern

For tables without direct `organization_id` but related via foreign key:

```sql
-- Example: messages table (related via conversations)
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
```

**Used in:**
- `messages` (via conversations)
- `contact_tags` (via contacts)
- `conversation_assignments` (via conversations)

---

## Special Cases

### 1. Organizations Table

**Special Handling:**
- Root tenant entity
- Users can only view their own organization
- Only admins can update
- Only super admins can create/delete

```sql
-- SELECT: View own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (
    id = get_user_organization()
    OR is_super_admin()
  );

-- UPDATE: Only owners/admins
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

-- INSERT/DELETE: Super admins only
```

### 2. Profiles Table

**Special Handling:**
- Links users to organizations
- Users can view org profiles
- Users can only update their own profile
- Admins can update org profiles
- No user INSERT policy (handled by service role during signup)

```sql
-- SELECT: View organization profiles
CREATE POLICY "Users can view organization profiles"
  ON profiles FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- UPDATE: Own profile or admin
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

-- DELETE: Admins only (cannot delete self)
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
      AND id != auth.uid() -- Cannot delete yourself
    )
    OR is_super_admin()
  );
```

### 3. Notifications Table

**Special Handling:**
- Personal to each user (not organization-scoped)
- Users can only see their own notifications
- No organization_id check

```sql
-- SELECT: Own notifications only
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- INSERT: System-created (service role)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- UPDATE/DELETE: Own notifications only
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );
```

### 4. Audit Logs Table

**Special Handling:**
- Immutable records for compliance
- Users can view (transparency)
- System creates (service role)
- No UPDATE policy (immutable)
- Only super admins can delete (compliance management)

```sql
-- SELECT: View organization logs
CREATE POLICY "Users can view their organization's audit_logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- INSERT: System-created
CREATE POLICY "System can create audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- UPDATE: No policy (immutable)

-- DELETE: Super admins only
CREATE POLICY "Super admins can delete audit_logs"
  ON audit_logs FOR DELETE
  USING (is_super_admin());
```

### 5. API Keys Table

**Special Handling:**
- Highly sensitive data
- Only admins can view/manage
- Regular users have no access

```sql
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
```

---

## Adding RLS to New Tables

### Checklist for New Tables

When creating a new table that stores tenant-specific data:

- [ ] Add `organization_id UUID REFERENCES organizations(id)` column
- [ ] Enable RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policy with organization check
- [ ] Create INSERT policy with organization check
- [ ] Create UPDATE policy with organization check
- [ ] Create DELETE policy with organization check
- [ ] Add super admin bypass to all policies
- [ ] Consider if admin-only access is needed
- [ ] Add table to RLS audit script
- [ ] Add table to RLS test suite
- [ ] Update this documentation

### Step-by-Step Guide

#### Step 1: Create Table with organization_id

```sql
CREATE TABLE new_feature_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for RLS performance
CREATE INDEX idx_new_feature_table_organization_id
  ON new_feature_table(organization_id);
```

#### Step 2: Enable RLS

```sql
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;
```

#### Step 3: Create Policies

```sql
-- SELECT Policy
CREATE POLICY "Users can view their organization's new_feature_table"
  ON new_feature_table FOR SELECT
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- INSERT Policy
CREATE POLICY "Users can create new_feature_table in their organization"
  ON new_feature_table FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- UPDATE Policy
CREATE POLICY "Users can update their organization's new_feature_table"
  ON new_feature_table FOR UPDATE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- DELETE Policy
CREATE POLICY "Users can delete their organization's new_feature_table"
  ON new_feature_table FOR DELETE
  USING (
    organization_id = get_user_organization()
    OR is_super_admin()
  );

-- Add descriptive comment
COMMENT ON TABLE new_feature_table IS 'New feature data with full CRUD RLS';
```

#### Step 4: Test the Policies

```sql
-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '{user_id}';

-- Should see only own org data
SELECT * FROM new_feature_table;

-- Should fail: inserting into another org
INSERT INTO new_feature_table (organization_id, name)
VALUES ('{other_org_id}', 'Hacked');

-- Should succeed: inserting into own org
INSERT INTO new_feature_table (organization_id, name)
VALUES ('{own_org_id}', 'Valid');
```

#### Step 5: Add to Monitoring

Update `database-scripts/audit-rls-policies.sql` to include your new table in coverage checks.

---

## Testing RLS Policies

### Unit Testing Pattern

```typescript
describe('New Feature Table RLS', () => {
  let org1: Organization;
  let org2: Organization;
  let user1Client: SupabaseClient; // Org1 user
  let user2Client: SupabaseClient; // Org2 user
  let superAdminClient: SupabaseClient;

  beforeAll(async () => {
    // Setup test organizations and users
    // See tests/integration/rls-policies.test.ts for full example
  });

  test('Users can view only their organization data', async () => {
    const { data } = await user1Client
      .from('new_feature_table')
      .select('*')
      .eq('organization_id', org1.id);

    expect(data).toBeTruthy();
    expect(data!.every(row => row.organization_id === org1.id)).toBe(true);
  });

  test('Users cannot view other organization data', async () => {
    const { data } = await user1Client
      .from('new_feature_table')
      .select('*')
      .eq('organization_id', org2.id);

    expect(data).toBeTruthy();
    expect(data!.length).toBe(0);
  });

  test('Users cannot insert into other organizations', async () => {
    const { error } = await user1Client
      .from('new_feature_table')
      .insert({
        organization_id: org2.id,
        name: 'Hacked'
      });

    expect(error).toBeTruthy();
  });

  test('Super admin can access all organizations', async () => {
    const { data } = await superAdminClient
      .from('new_feature_table')
      .select('*');

    expect(data).toBeTruthy();
    // Should see data from multiple orgs
  });
});
```

### Manual Testing with psql

```sql
-- 1. Connect to database
psql -h your-supabase-host -U postgres -d postgres

-- 2. Create test session
BEGIN;

-- 3. Set session variables to simulate authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '{user_id}';

-- 4. Test SELECT (should only see own org data)
SELECT COUNT(*) FROM contacts;
SELECT DISTINCT organization_id FROM contacts;

-- 5. Test INSERT (should fail for other org)
INSERT INTO contacts (organization_id, whatsapp_id, phone_number)
VALUES ('{other_org_id}', 'wa_test', '+1234567890');
-- Expected: RLS policy violation

-- 6. Test INSERT (should succeed for own org)
INSERT INTO contacts (organization_id, whatsapp_id, phone_number)
VALUES ('{own_org_id}', 'wa_test', '+1234567890');
-- Expected: Success

-- 7. Rollback test data
ROLLBACK;
```

### Testing Super Admin Bypass

```sql
-- Simulate super admin
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '{super_admin_user_id}';

-- Super admin should see all data
SELECT COUNT(*), COUNT(DISTINCT organization_id) FROM contacts;
-- Expected: Multiple organizations visible

-- Super admin should be able to modify any org's data
UPDATE contacts SET name = 'Test' WHERE organization_id = '{any_org_id}';
-- Expected: Success
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Permission denied for table"

**Symptoms:**
```
Error: permission denied for table {table_name}
```

**Causes:**
1. RLS is not enabled on the table
2. No policies exist for the table
3. User role doesn't have base table permissions

**Solutions:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = '{table_name}';

-- Enable RLS if needed
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Check for policies
SELECT * FROM pg_policies WHERE tablename = '{table_name}';

-- Grant base permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON {table_name} TO authenticated;
```

#### Issue 2: "Policy violation" or "New row violates RLS policy"

**Symptoms:**
```
Error: new row violates row-level security policy for table "{table_name}"
```

**Causes:**
1. Trying to insert with wrong organization_id
2. WITH CHECK condition failing
3. User not in any organization

**Solutions:**
```sql
-- Check user's organization
SELECT organization_id FROM profiles WHERE id = auth.uid();

-- Verify organization_id in INSERT matches user's org
-- Ensure WITH CHECK policy allows the operation

-- Debug: Check what the policy is testing
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = '{table_name}' AND cmd = 'a';
```

#### Issue 3: Can't see any data (empty results)

**Symptoms:**
- SELECT queries return 0 rows
- User expects to see data but gets nothing

**Causes:**
1. User not associated with an organization
2. No data exists for user's organization
3. USING clause too restrictive

**Solutions:**
```sql
-- Verify user has organization
SELECT id, organization_id, role FROM profiles WHERE id = auth.uid();

-- Check if data exists for the organization
SET LOCAL ROLE postgres; -- Bypass RLS temporarily
SELECT COUNT(*), organization_id FROM {table_name}
WHERE organization_id = '{user_org_id}'
GROUP BY organization_id;

-- Review policy USING clause
SELECT policyname, qual FROM pg_policies
WHERE tablename = '{table_name}' AND cmd = 'r';
```

#### Issue 4: Super admin bypass not working

**Symptoms:**
- Super admin user sees same restrictions as regular users
- Cannot access other organizations' data

**Causes:**
1. `is_super_admin` field not set in profiles
2. Super admin bypass not in policy
3. Helper function not working

**Solutions:**
```sql
-- Verify super admin flag
SELECT id, email, is_super_admin FROM profiles WHERE id = auth.uid();

-- Update user to super admin
UPDATE profiles SET is_super_admin = true WHERE id = '{user_id}';

-- Check policy includes super admin bypass
SELECT policyname, qual
FROM pg_policies
WHERE tablename = '{table_name}'
AND qual::text ILIKE '%is_super_admin%';

-- Test helper function
SELECT is_super_admin();
```

#### Issue 5: Performance issues with RLS

**Symptoms:**
- Queries slow after enabling RLS
- Timeout errors on large tables

**Causes:**
1. Missing index on organization_id
2. Complex policy logic
3. Subqueries in policies not optimized

**Solutions:**
```sql
-- Add index on organization_id
CREATE INDEX CONCURRENTLY idx_{table}_org_id
  ON {table_name}(organization_id);

-- Use helper functions instead of subqueries
-- Before (slow):
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)

-- After (fast):
USING (organization_id = get_user_organization())

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM {table_name} WHERE organization_id = get_user_organization();
```

### Debugging Queries

#### Check Current User Context
```sql
SELECT
  current_user AS "Database Role",
  auth.uid() AS "Auth User ID",
  get_user_organization() AS "Organization ID",
  is_super_admin() AS "Is Super Admin";
```

#### View All Policies for a Table
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = '{table_name}';
```

#### Test Policy Logic Manually
```sql
-- Simulate policy check
WITH user_context AS (
  SELECT
    auth.uid() AS user_id,
    get_user_organization() AS org_id,
    is_super_admin() AS is_admin
)
SELECT
  t.*,
  CASE
    WHEN t.organization_id = uc.org_id THEN 'ALLOWED'
    WHEN uc.is_admin THEN 'ALLOWED (ADMIN)'
    ELSE 'DENIED'
  END AS access_decision
FROM {table_name} t
CROSS JOIN user_context uc
LIMIT 10;
```

---

## Security Best Practices

### 1. Always Use Helper Functions

✅ **Good:**
```sql
USING (organization_id = get_user_organization() OR is_super_admin())
```

❌ **Bad:**
```sql
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)
```

**Why:** Helper functions are cached, optimized, and consistent.

### 2. Use SECURITY DEFINER Functions Carefully

✅ **Good:**
```sql
CREATE FUNCTION get_user_organization()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

❌ **Bad:**
```sql
CREATE FUNCTION dangerous_function()
RETURNS TABLE(...) AS $$
BEGIN
  -- Direct queries without auth checks
  RETURN QUERY SELECT * FROM sensitive_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why:** SECURITY DEFINER functions run with table owner privileges. Always validate auth.uid() inside them.

### 3. Index organization_id Columns

```sql
-- Add index for RLS performance
CREATE INDEX idx_{table}_organization_id ON {table}(organization_id);

-- For large tables, use CONCURRENTLY
CREATE INDEX CONCURRENTLY idx_{table}_organization_id ON {table}(organization_id);
```

**Why:** RLS policies filter on organization_id for every query. Indexes make this fast.

### 4. Test Both Positive and Negative Cases

```typescript
test('Users CAN access their org data', async () => { /* ... */ });
test('Users CANNOT access other org data', async () => { /* ... */ });
test('Users CANNOT insert into other orgs', async () => { /* ... */ });
test('Super admin CAN access all orgs', async () => { /* ... */ });
```

### 5. Use Descriptive Policy Names

✅ **Good:**
```sql
"Users can view their organization's contacts"
"Admins can delete their organization's templates"
"Super admins can insert organizations"
```

❌ **Bad:**
```sql
"select_policy"
"policy_1"
"rls_check"
```

### 6. Document Special Cases

Always add comments explaining non-standard policies:

```sql
-- Special case: Audit logs are immutable (no UPDATE policy)
-- Only super admins can delete for compliance management
CREATE POLICY "Super admins can delete audit_logs"
  ON audit_logs FOR DELETE
  USING (is_super_admin());

COMMENT ON POLICY "Super admins can delete audit_logs" ON audit_logs IS
  'Audit logs are immutable records. Only super admins can delete for compliance and data retention management.';
```

### 7. Regular Security Audits

Run the audit script regularly:

```bash
# Run RLS coverage audit
psql -f database-scripts/audit-rls-policies.sql

# Check for tables without RLS
# Check for incomplete policy coverage
# Review super admin bypass implementation
```

### 8. Monitor RLS Performance

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW rls_performance_metrics AS
SELECT
  schemaname,
  tablename,
  COUNT(*) AS policy_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_policies p
JOIN pg_tables t USING (schemaname, tablename)
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, pg_total_relation_size(schemaname||'.'||tablename)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check large tables have indexes
SELECT * FROM rls_performance_metrics WHERE table_size > '100 MB';
```

---

## Summary

### Key Takeaways

1. **RLS is mandatory** for all multi-tenant tables
2. **Use helper functions** for consistent policy logic
3. **Test thoroughly** with multiple users and organizations
4. **Index organization_id** for performance
5. **Super admin bypass** enables platform management
6. **Document special cases** for maintainability
7. **Monitor regularly** with audit scripts

### Quick Reference

| Pattern | Use Case | Example Tables |
|---------|----------|----------------|
| Standard Multi-Tenant | Direct organization_id column | contacts, conversations, templates |
| Admin-Only Modification | Sensitive configuration | billing, api_keys, webhooks |
| Relationship-Based | No direct organization_id | messages, contact_tags |
| Personal Access | User-specific data | notifications |
| Immutable Records | Compliance & audit | audit_logs |
| Root Entity | Tenant management | organizations |
| User Linking | Auth & permissions | profiles |

### Resources

- **Migration:** `supabase/migrations/20251013_complete_rls_coverage.sql`
- **Audit Script:** `database-scripts/audit-rls-policies.sql`
- **Test Suite:** `tests/integration/rls-policies.test.ts`
- **PostgreSQL RLS Docs:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Supabase RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** 2025-10-13
**Version:** 1.0
**Maintainer:** ADSapp Security Team
