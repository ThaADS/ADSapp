-- FINAL RLS FIX - Removes ALL recursive policies
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new

-- ==========================================
-- STEP 1: Disable RLS temporarily
-- ==========================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: Drop EVERY policy on profiles
-- ==========================================
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
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
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;  -- ← This one causes infinite recursion!
DROP POLICY IF EXISTS "Admins and owners can manage profiles" ON profiles;  -- ← This one too!
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

-- ==========================================
-- STEP 3: Create ONLY simple, safe policies
-- ==========================================

-- Policy 1: Users can read ONLY their own profile (no subqueries!)
CREATE POLICY "profiles_read_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can insert ONLY their own profile (for signup)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update ONLY their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: DELETE is disabled for security (only service role can delete)
-- No DELETE policy = nobody can delete profiles except service_role

-- ==========================================
-- STEP 4: Re-enable RLS
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 5: Verify the fix
-- ==========================================
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

-- Expected: Should return the super admin profile
-- id: 80bb0190-649e-4354-8e84-cc3c14e44148
-- email: superadmin@adsapp.com
-- is_super_admin: true

-- ==========================================
-- IMPORTANT NOTES:
-- ==========================================
-- 1. These policies ONLY use auth.uid() = id
-- 2. NO subqueries to profiles table (prevents recursion)
-- 3. Users can ONLY access their own profile
-- 4. Service role bypasses RLS and can access all profiles
-- 5. If you need organization-wide profile access, implement it in your application code using service_role
-- ==========================================