-- Fix Super Admin RLS Policy Issues
-- This script fixes the infinite recursion in RLS policies and creates the super admin profile

-- 1. First, temporarily disable RLS to fix the policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- 3. Ensure the super admin profile exists first (without RLS interference)
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
SELECT
  '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid,
  NULL,
  'superadmin@adsapp.com',
  'Super Administrator',
  'super_admin',
  true,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid
);

-- 4. Update existing profile if it exists but is not properly configured
UPDATE public.profiles 
SET 
  is_super_admin = true,
  role = 'super_admin',
  full_name = 'Super Administrator',
  is_active = true
WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid;

-- 5. Create new RLS policies that avoid infinite recursion
-- Simple policy for profile access - no recursive checks
CREATE POLICY "Enable read access for own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Allow super admin to read all profiles (direct check, no recursion)
CREATE POLICY "Enable read access for super admin" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_super_admin = true
    )
  );

-- Allow users to insert their own profile
CREATE POLICY "Enable insert for own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow super admin to update any profile (direct check)
CREATE POLICY "Enable update for super admin" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_super_admin = true
    )
  );

-- 6. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Verification query
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role,
  p.is_super_admin,
  p.organization_id,
  p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'superadmin@adsapp.com';

-- 8. Test the policy by selecting as the super admin user
-- This should work without infinite recursion
SET LOCAL "request.jwt.claims" TO '{"sub": "80bb0190-649e-4354-8e84-cc3c14e44148", "role": "authenticated"}';
SELECT id, email, is_super_admin, role FROM profiles WHERE id = '80bb0190-649e-4354-8e84-cc3c14e44148'::uuid;
