-- QUICK DATABASE FIX - Run this in Supabase SQL Editor
-- This adds missing columns and fixes authentication issues

-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- 2. Create an index for super admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON public.profiles(is_super_admin);

-- 3. Clean up any conflicting RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and owners can manage profiles" ON profiles;

-- 4. Create simple, working RLS policies
CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR auth.uid() IS NULL
  );

CREATE POLICY "Users can view their own profile and organization profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR is_super_admin = true
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_super_admin = true);

-- 5. Fix organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;

CREATE POLICY "Allow organization creation" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 6. Create or replace the user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create a default organization for the user if they don't have one
  IF NEW.raw_user_meta_data->>'organization_id' IS NULL THEN
    INSERT INTO public.organizations (name, subdomain)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
      LOWER(REPLACE(NEW.email, '@', '-at-') || '-' || substr(NEW.id::text, 1, 8))
    )
    ON CONFLICT (subdomain) DO UPDATE SET subdomain = organizations.subdomain || '-' || substr(gen_random_uuid()::text, 1, 4)
    RETURNING id INTO NEW.raw_user_meta_data;
  END IF;

  -- Create user profile
  INSERT INTO public.profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    is_super_admin
  )
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'organization_id')::uuid,
      (SELECT id FROM organizations WHERE subdomain = LOWER(REPLACE(NEW.email, '@', '-at-') || '-' || substr(NEW.id::text, 1, 8)) LIMIT 1)
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create super admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  'superadmin@adsapp.com',
  crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Administrator", "is_super_admin": true, "role": "super_admin"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
  raw_user_meta_data = '{"full_name": "Super Administrator", "is_super_admin": true, "role": "super_admin"}';

-- 9. Ensure super admin profile exists and is properly configured
INSERT INTO public.profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  is_super_admin
)
SELECT
  u.id,
  (SELECT id FROM organizations ORDER BY created_at LIMIT 1),
  'superadmin@adsapp.com',
  'Super Administrator',
  'super_admin',
  true
FROM auth.users u
WHERE u.email = 'superadmin@adsapp.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = 'Super Administrator';

-- 10. Verification query
SELECT
  'Database fix completed!' as message,
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role,
  p.is_super_admin,
  o.name as organization_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE u.email = 'superadmin@adsapp.com';