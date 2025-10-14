-- Fix RLS Infinite Recursion for Profiles Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new

-- 1. Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
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

-- 3. Create simple, non-recursive policies
-- Important: These policies ONLY check auth.uid(), they never query the profiles table

-- Policy 1: Users can SELECT their own profile
CREATE POLICY "Allow users to read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can INSERT their own profile (for signup)
CREATE POLICY "Allow users to insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can UPDATE their own profile
CREATE POLICY "Allow users to update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy 4: Service role has full access (bypasses RLS anyway, but explicit is good)
-- Note: This policy is not needed as service_role bypasses RLS, but we include it for clarity

-- 4. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Test query (this will work now because policies don't cause recursion)
SELECT
  id,
  email,
  full_name,
  role,
  is_super_admin,
  organization_id
FROM public.profiles
WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148';

-- Expected: Should return the super admin profile without errors