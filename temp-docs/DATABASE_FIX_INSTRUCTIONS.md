# Database Fix Instructions for ADSapp

## Problem Summary
User creation is failing with "Database error creating new user" due to:
1. Conflicting RLS policies on the `profiles` table
2. Issues with the `handle_new_user()` trigger function
3. Missing permissions and improper database setup
4. No super admin user configured

## Solution Overview
This fix resolves all authentication issues by:
- Cleaning up conflicting RLS policies
- Fixing the user creation trigger function
- Creating proper permissions
- Adding utility functions for maintenance
- Setting up a super admin user

## Step-by-Step Instructions

### Method 1: Apply via Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `egaiyydjgeqlhthxmvbn`

2. **Access SQL Editor**
   - Go to "SQL Editor" in the left sidebar
   - Create a new query

3. **Run the Fix Script**
   - Copy the entire contents of `fix_database_issues.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute the script

4. **Verify the Fix**
   - The script will output test results
   - Look for "Database fix complete" status message
   - Check that all tests show "PASS" status

### Method 2: Apply via Supabase CLI (Alternative)

1. **Fix Environment File**
   ```bash
   # The .env.local BOM issue has been fixed
   # Ensure your .env.local contains:
   NEXT_PUBLIC_SUPABASE_URL=https://egaiyydjgeqlhthxmvbn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Apply Migration**
   ```bash
   cd "C:\Ai Projecten\ADSapp"
   npx supabase db push
   ```

## Post-Fix Verification

### 1. Test User Creation in Application

Try creating a test user through your application:
- Email: `test@example.com`
- Password: `TestPassword123!`
- Full Name: `Test User`
- Organization: `Test Organization`

### 2. Create Super Admin User

You can create the super admin user in two ways:

**Option A: Through SQL (Recommended)**
```sql
SELECT create_super_admin();
```

**Option B: Through Your Application**
- Create user with email: `superadmin@adsapp.com`
- Password: `SuperAdmin123!` (change this immediately)
- The trigger will automatically assign super admin privileges

### 3. Test Database Functions

Run these queries in Supabase SQL Editor to verify everything works:

```sql
-- Test database setup
SELECT * FROM test_database_setup();

-- Check existing users and organizations
SELECT
  p.email,
  p.full_name,
  p.role,
  p.is_super_admin,
  o.name as organization_name
FROM profiles p
JOIN organizations o ON p.organization_id = o.id;

-- Check system health
SELECT
  (SELECT COUNT(*) FROM organizations) as total_orgs,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE is_super_admin = true) as super_admins;
```

## What the Fix Does

### 1. RLS Policy Fixes
- Removes conflicting policies that prevented user creation
- Creates comprehensive policies that allow proper authentication flow
- Ensures super admin can access all data while maintaining tenant isolation

### 2. Trigger Function Improvements
- Fixes the `handle_new_user()` function to properly create organizations and profiles
- Adds error handling to prevent user creation failures
- Handles super admin creation with special privileges

### 3. Utility Functions
- `create_super_admin()`: Creates the initial super admin user
- `fix_broken_users()`: Repairs any existing users without profiles
- `test_database_setup()`: Validates database configuration

### 4. Permissions and Security
- Grants necessary permissions for authentication flow
- Maintains RLS security while allowing proper access
- Creates indexes for better performance

## Troubleshooting

### If User Creation Still Fails

1. **Check Trigger Function**
   ```sql
   SELECT * FROM test_database_setup();
   ```

2. **Check for Broken Users**
   ```sql
   SELECT fix_broken_users();
   ```

3. **Verify RLS Policies**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('organizations', 'profiles');
   ```

### If Super Admin Creation Fails

1. **Check if User Already Exists**
   ```sql
   SELECT * FROM profiles WHERE email = 'superadmin@adsapp.com';
   ```

2. **Manual Super Admin Creation**
   ```sql
   -- If the user exists but isn't super admin
   UPDATE profiles
   SET is_super_admin = true, role = 'owner'
   WHERE email = 'superadmin@adsapp.com';
   ```

### Common Error Messages and Solutions

| Error | Solution |
|-------|----------|
| "permission denied for table profiles" | Run the permission grants from the fix script |
| "new row violates row-level security policy" | Apply the RLS policy fixes |
| "function handle_new_user() does not exist" | Apply the trigger function fix |
| "duplicate key value violates unique constraint" | User may already exist, check existing data |

## Expected Results After Fix

✅ **User creation works through API**
✅ **Users can sign up through the dashboard**
✅ **Organizations are automatically created**
✅ **Super admin has full access**
✅ **Regular users have proper tenant isolation**
✅ **All database tests pass**

## Security Notes

- The super admin password is set to `SuperAdmin123!` - **change this immediately**
- RLS policies maintain tenant isolation
- Service role permissions are properly scoped
- All operations are logged for audit purposes

## Next Steps After Fix

1. **Change super admin password**
2. **Test user registration flow**
3. **Configure email templates** (if using email confirmation)
4. **Set up proper monitoring** for authentication events
5. **Consider implementing MFA** for super admin account

---

**Need Help?**
If you encounter any issues, check the error logs in:
- Supabase Dashboard → Settings → Logs
- Your application console logs
- Network tab for API request failures