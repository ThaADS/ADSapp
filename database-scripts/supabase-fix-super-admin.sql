-- Supabase Super Admin Fix
-- Run this in your Supabase SQL Editor

-- 1. First, temporarily disable RLS to fix the issues
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- 3. Ensure the super admin profile exists
-- Use the exact user ID from the debug info: 80bb0190-649e-4354-8e84-cc3c14e44148
INSERT INTO public.profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  is_super_admin,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid,
  NULL,
  'superadmin@adsapp.com',
  'Super Administrator',
  'admin',
  true,
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  is_super_admin = true,
  role = 'admin',
  full_name = 'Super Administrator',
  is_active = true,
  updated_at = now();

-- 4. Create simple, non-recursive RLS policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Create a separate policy for super admin access (avoid recursion)
CREATE POLICY "profiles_super_admin_all" ON profiles
  FOR ALL USING (
    auth.uid()::text = '80bb0190-649e-4354-8e84-cc3c14e44148'
  );

-- 6. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Verify the super admin profile was created correctly
SELECT 
  id,
  email,
  full_name,
  role,
  is_super_admin,
  organization_id,
  is_active,
  created_at
FROM public.profiles 
WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid;
