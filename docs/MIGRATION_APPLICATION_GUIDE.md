# Database Migration Application Guide

**Date**: 2025-11-05
**Migrations**: Team Invitations + WhatsApp Credentials Enhancement

---

## ✅ Migrations to Apply

### 1. Team Invitations & License Management (V2 - FIXED)

**File**: `supabase/migrations/20251105_team_invitations_licenses_v2.sql`
**Purpose**: Enable team member invitations with license seat management
**Status**: ✅ FIXED - No more "column status does not exist" error

### 2. WhatsApp Credentials Enhancement

**File**: `supabase/migrations/20251105_whatsapp_credentials_enhancement.sql`
**Purpose**: Add access_token and webhook_verify_token columns to organizations
**Status**: ✅ READY

---

## 🗄️ Application Steps

### Option 1: Supabase Dashboard (Recommended)

#### Step 1: Apply Team Invitations Migration

```
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: SQL Editor
4. Click "New Query"
5. Copy ENTIRE contents of:
   supabase/migrations/20251105_team_invitations_licenses_v2.sql
6. Paste into SQL Editor
7. Click "Run" (or Ctrl+Enter)
8. Wait for completion (should take 5-10 seconds)
9. Verify success message appears
```

**Expected output**:

```
Success. No rows returned
```

**Verification**:

```sql
-- Run this query to verify:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_invitations'
ORDER BY ordinal_position;

-- Should return columns: id, organization_id, email, role, invited_by, status, token, expires_at, etc.
```

---

#### Step 2: Apply WhatsApp Credentials Migration

```
1. Still in SQL Editor
2. Click "New Query" (or clear previous)
3. Copy ENTIRE contents of:
   supabase/migrations/20251105_whatsapp_credentials_enhancement.sql
4. Paste into SQL Editor
5. Click "Run"
6. Wait for completion (should take 1-2 seconds)
7. Verify success message
```

**Verification**:

```sql
-- Run this query to verify:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('whatsapp_access_token', 'whatsapp_webhook_verify_token');

-- Should return 2 rows:
-- whatsapp_access_token | text
-- whatsapp_webhook_verify_token | text
```

---

### Option 2: Supabase CLI (If Linked)

#### Prerequisites

```bash
# Check if project is linked
npx supabase status

# If not linked, link your project:
npx supabase link --project-ref YOUR_PROJECT_REF
```

#### Apply Migrations

```bash
# Push all pending migrations
npx supabase db push

# OR apply specific migration files
npx supabase db execute --file supabase/migrations/20251105_team_invitations_licenses_v2.sql
npx supabase db execute --file supabase/migrations/20251105_whatsapp_credentials_enhancement.sql
```

---

## 🧪 Testing After Migration

### Test 1: Verify Team Invitations Table

```sql
-- Should return empty result (no errors)
SELECT * FROM team_invitations LIMIT 1;

-- Check indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'team_invitations';

-- Should show:
-- idx_team_invitations_organization
-- idx_team_invitations_email
-- idx_team_invitations_token
-- idx_team_invitations_status
-- idx_team_invitations_org_email_status
-- idx_team_invitations_expires_status
```

### Test 2: Verify Organizations Columns

```sql
-- Should return your existing organizations with new columns
SELECT
  id,
  name,
  max_team_members,
  used_team_members,
  whatsapp_access_token,
  whatsapp_webhook_verify_token
FROM organizations
LIMIT 5;

-- New columns should exist (values can be NULL)
```

### Test 3: Verify Functions

```sql
-- Test check_available_licenses function
SELECT * FROM check_available_licenses(
  (SELECT id FROM organizations LIMIT 1)
);

-- Should return:
-- available_seats | max_seats | used_seats | can_invite
-- 0               | 1         | 1          | false
```

### Test 4: Test Invitation Creation (via API)

```bash
# Make sure dev server is running
npm run dev

# Test invitation API endpoint
curl -X POST http://localhost:3000/api/team/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "email": "test@example.com",
    "role": "admin"
  }'

# Should return 201 Created or error about license limit (expected if at limit)
```

---

## 🚨 Troubleshooting

### Error: "column status does not exist"

**Cause**: Using old migration file (`20251105_team_invitations_licenses_simple.sql`)
**Solution**: Use V2 file (`20251105_team_invitations_licenses_v2.sql`) instead

---

### Error: "relation already exists"

**Cause**: Migration was partially applied
**Solution**: V2 migration is idempotent - safe to re-run. It will skip existing objects.

---

### Error: "constraint already exists"

**Cause**: Constraint from previous attempt exists
**Solution**: V2 migration checks for existing constraints before adding - safe to re-run.

---

### Error: "permission denied"

**Cause**: Not using service role or proper permissions
**Solution**: Ensure you're logged into Supabase Dashboard with project owner/admin access

---

## 🔄 Rollback (If Needed)

### Rollback Team Invitations

```sql
-- WARNING: This will delete all invitation data
DROP TABLE IF EXISTS team_invitations CASCADE;

-- Remove columns from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS max_team_members;
ALTER TABLE organizations DROP COLUMN IF EXISTS used_team_members;

-- Drop functions
DROP FUNCTION IF EXISTS check_duplicate_pending_invitation() CASCADE;
DROP FUNCTION IF EXISTS update_team_member_count() CASCADE;
DROP FUNCTION IF EXISTS expire_old_invitations();
DROP FUNCTION IF EXISTS check_available_licenses(UUID);
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT, UUID);
```

### Rollback WhatsApp Credentials

```sql
-- WARNING: This will delete access tokens
ALTER TABLE organizations DROP COLUMN IF EXISTS whatsapp_access_token;
ALTER TABLE organizations DROP COLUMN IF EXISTS whatsapp_webhook_verify_token;
```

---

## ✅ Post-Migration Checklist

After applying both migrations:

- [ ] Team invitations table exists
- [ ] Organizations has max_team_members and used_team_members columns
- [ ] Organizations has whatsapp_access_token and whatsapp_webhook_verify_token columns
- [ ] All indexes created successfully
- [ ] All functions created successfully
- [ ] All triggers created successfully
- [ ] RLS policies enabled on team_invitations
- [ ] Test invitation API endpoint works
- [ ] Test onboarding flow works

---

## 📊 Expected Schema After Migration

### team_invitations table

```
- id (UUID, PK)
- organization_id (UUID, FK → organizations)
- email (TEXT)
- role (TEXT, CHECK: admin|member)
- invited_by (UUID, FK → profiles)
- status (TEXT, CHECK: pending|accepted|expired|revoked)
- token (TEXT, UNIQUE)
- expires_at (TIMESTAMP WITH TIME ZONE)
- accepted_at (TIMESTAMP WITH TIME ZONE, nullable)
- accepted_by (UUID, FK → profiles, nullable)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

### organizations table (new columns)

```
+ max_team_members (INTEGER, DEFAULT 1, NOT NULL)
+ used_team_members (INTEGER, DEFAULT 1, NOT NULL)
+ whatsapp_access_token (TEXT, nullable)
+ whatsapp_webhook_verify_token (TEXT, nullable)
```

---

## 🎯 Next Steps After Migration

1. **Test Onboarding Flow**

   ```bash
   # Start dev server
   npm run dev

   # Navigate to: http://localhost:3000/onboarding
   # Complete onboarding with WhatsApp setup
   # Verify data saved correctly
   ```

2. **Run E2E Tests**

   ```bash
   # Run onboarding E2E tests
   npm run test:e2e -- tests/e2e/onboarding-whatsapp-setup.spec.ts
   ```

3. **Upload Assets**
   - Add annotated screenshots to `/public/images/`
   - Add tutorial video to `/public/tutorials/`

4. **Deploy to Production**
   - Apply migrations to production database
   - Deploy code to Vercel
   - Upload assets to production
   - Monitor for 24 hours

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify migration file contents match exactly
3. Ensure using V2 file for team invitations (not simple or original)
4. Check database permissions
5. Try rollback and reapply if needed

---

_Last Updated: 2025-11-05_
_Status: Ready for Application_
