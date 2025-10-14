-- Clean RLS Fix for Super Admin Access
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new

-- 1. Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (including the ones causing conflicts)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

-- 3. Update super admin profile (ensure is_super_admin is true)
UPDATE public.profiles
SET
  is_super_admin = true,
  role = 'admin',
  full_name = 'Super Administrator',
  is_active = true,
  updated_at = now()
WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148';

-- 4. Create new, simple RLS policies
-- Policy 1: Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Super admin can do anything
CREATE POLICY "profiles_super_admin_all" ON profiles
  FOR ALL USING (
    auth.uid()::text = '80bb0190-649e-4354-8e84-cc3c14e44148'
  );

-- 5. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verify the fix
SELECT
  id,
  email,
  full_name,
  role,
  is_super_admin,
  organization_id,
  is_active
FROM public.profiles
WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148';

-- Expected result:
-- id: 80bb0190-649e-4354-8e84-cc3c14e44148
-- email: superadmin@adsapp.com
-- full_name: Super Administrator
-- role: admin
-- is_super_admin: true
-- organization_id: (can be NULL or a dummy org ID)
-- is_active: true