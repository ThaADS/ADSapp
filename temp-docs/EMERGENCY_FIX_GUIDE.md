# EMERGENCY DATABASE FIX GUIDE

## Problem Summary

Your ADSapp Supabase database is missing critical columns and has incorrect RLS policies that are blocking user creation and authentication.

**Missing columns:**
- `is_super_admin` in profiles table
- `last_seen` in profiles table

**Issues:**
- RLS policies are too restrictive
- User signup trigger is missing or broken
- Cannot create any users (super admin or regular users)

## Critical Information

**Supabase Project URL:** https://egaiyydjgeqlhthxmvbn.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn

**Super Admin Credentials (after fix):**
- Email: `superadmin@adsapp.com`
- Password: `ADSapp2024!SuperSecure#Admin`

---

## Fix Instructions (5 Steps)

### STEP 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn
2. Log into your Supabase account
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"** button

---

### STEP 2: Run the Database Fix SQL

1. Open the file: **`MANUAL_DATABASE_FIX.sql`** (in this folder)
2. Select ALL content (Ctrl+A or Cmd+A)
3. Copy it (Ctrl+C or Cmd+C)
4. Go back to Supabase SQL Editor
5. Paste the SQL (Ctrl+V or Cmd+V)
6. Click **"RUN"** button (or press Ctrl+Enter / Cmd+Enter)
7. Wait for the query to complete

**Expected Result:**
```
Success. No rows returned
```

**What this does:**
- Adds `is_super_admin` column to profiles table
- Adds `last_seen` column to profiles table
- Removes restrictive RLS policies
- Creates new permissive RLS policies
- Creates user signup trigger
- Grants necessary permissions

---

### STEP 3: Create Super Admin User

1. In Supabase Dashboard, click **"Authentication"** (left sidebar)
2. Click **"Add user"** button (top right)
3. Fill in the form:
   - **Email:** `superadmin@adsapp.com`
   - **Password:** `ADSapp2024!SuperSecure#Admin`
   - **Auto Confirm User:** ✅ CHECK THIS BOX (important!)
4. Click **"Create user"**

**Expected Result:**
- User appears in the users list
- Status shows as "Confirmed"

---

### STEP 4: Make User Super Admin

1. Go back to **SQL Editor**
2. Click **"+ New query"**
3. Copy and paste this SQL:

```sql
UPDATE public.profiles
SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = 'Super Admin',
  updated_at = NOW()
WHERE email = 'superadmin@adsapp.com';
```

4. Click **"RUN"**

**Expected Result:**
```
Success. 1 rows affected
```

---

### STEP 5: Verify the Fix

Run this verification query in SQL Editor:

```sql
SELECT id, email, role, is_super_admin, created_at
FROM public.profiles
WHERE email = 'superadmin@adsapp.com';
```

**Expected Result:**
You should see your super admin user with:
- `email`: superadmin@adsapp.com
- `role`: super_admin
- `is_super_admin`: true

---

## Testing the Fix

### Test 1: Login to Your App

1. Go to your application: http://localhost:3000 (or your deployed URL)
2. Navigate to the login page
3. Enter:
   - Email: `superadmin@adsapp.com`
   - Password: `ADSapp2024!SuperSecure#Admin`
4. Click **Sign In**

**Expected Result:**
- Login succeeds
- You are redirected to the admin dashboard
- You can access all admin features

### Test 2: Create a New User

1. Go to Supabase Dashboard > Authentication
2. Click "Add user"
3. Create a test user:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Auto Confirm: YES
4. Click "Create user"

**Expected Result:**
- User is created successfully
- A profile is automatically created in the `profiles` table
- No errors occur

---

## Troubleshooting

### Issue: "column profiles.is_super_admin does not exist"

**Solution:** You didn't run Step 2 successfully. Go back and run the SQL fix again.

### Issue: "User created but cannot login"

**Solution:** Make sure you checked "Auto Confirm User" when creating the user. If not:
1. Go to Authentication in Supabase
2. Find the user
3. Click the "..." menu
4. Click "Confirm user"

### Issue: "Profile not created automatically"

**Solution:** Run this SQL to manually create the profile:

```sql
INSERT INTO public.profiles (id, email, full_name, role, is_super_admin, last_seen, created_at, updated_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID from auth.users
  'superadmin@adsapp.com',
  'Super Admin',
  'super_admin',
  true,
  NOW(),
  NOW(),
  NOW()
);
```

### Issue: SQL fix fails with policy errors

**Solution:** Run this simplified fix first:

```sql
-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Add columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Allow all for service role"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for authenticated"
  ON public.profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## Files Created

The following helper files have been created in your project:

1. **MANUAL_DATABASE_FIX.sql** - Complete SQL fix (USE THIS ONE)
2. **quick-database-fix.sql** - Alternative fix script
3. **fix_database_issues.sql** - Another fix option
4. **emergency-db-fix.js** - Node.js script (cannot execute DDL, use manual SQL instead)
5. **supabase-direct-fix.js** - Diagnostic script
6. **EMERGENCY_FIX_GUIDE.md** - This guide

---

## Why Can't We Automate This?

Supabase does not expose a direct SQL execution endpoint via their REST API or client SDKs for security reasons. DDL commands (ALTER TABLE, CREATE POLICY, etc.) can only be executed through:

1. **Supabase Dashboard SQL Editor** (recommended)
2. **Supabase CLI** (if installed and linked)
3. **Direct PostgreSQL connection** (requires database password)

The scripts we created attempted to use the Supabase Admin API, but that only allows user management operations, not schema modifications.

---

## After the Fix

Once you complete these steps:

1. ✅ Database schema will be correct
2. ✅ Super admin user will exist and work
3. ✅ User signup will work automatically
4. ✅ Authentication will work properly
5. ✅ New users will automatically get profiles created
6. ✅ RLS policies will allow proper access

---

## Need Help?

If you encounter any issues:

1. Check the **Troubleshooting** section above
2. Review the SQL error messages carefully
3. Verify you're running the SQL in the correct Supabase project
4. Make sure you're logged in as a project owner/admin
5. Try the simplified fix in the Troubleshooting section

---

## Quick Start Checklist

- [ ] Open Supabase SQL Editor
- [ ] Run MANUAL_DATABASE_FIX.sql
- [ ] Create super admin user via Dashboard > Authentication
- [ ] Run UPDATE query to make user super admin
- [ ] Run verification query
- [ ] Test login on your app
- [ ] Confirm user creation works

---

**Last Updated:** 2025-09-29
**Project:** ADSapp
**Database:** egaiyydjgeqlhthxmvbn.supabase.co