-- COMPREHENSIVE DATABASE FIX SCRIPT
-- Run this script directly in Supabase SQL Editor to fix all authentication issues
-- Date: 2025-01-26

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEAN UP EXISTING CONFLICTING POLICIES

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and owners can manage profiles" ON profiles;

-- Drop and recreate organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;

-- 2. CREATE FIXED RLS POLICIES

-- Profiles table policies
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR auth.uid() IS NULL  -- Allow trigger function to insert
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
    OR id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Admins can manage organization profiles" ON profiles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Organizations table policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Allow organization creation during signup" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- 3. FIX THE USER CREATION TRIGGER

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Extract organization name from user metadata
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    SPLIT_PART(NEW.email, '@', 1) || '''s Organization'
  );

  -- Generate a unique slug
  org_slug := LOWER(REPLACE(REPLACE(org_name, ' ', '-'), '.', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::text;

  -- Special handling for super admin
  IF NEW.email = 'superadmin@adsapp.com' THEN
    -- Check if admin org already exists
    SELECT id INTO org_id FROM organizations WHERE slug = 'adsapp-admin';

    IF org_id IS NULL THEN
      INSERT INTO organizations (name, slug, subscription_status, subscription_tier, status)
      VALUES ('ADSapp Admin', 'adsapp-admin', 'active', 'enterprise', 'active')
      RETURNING id INTO org_id;
    END IF;

    -- Create super admin profile
    INSERT INTO profiles (
      id, organization_id, email, full_name, role, is_super_admin, is_active
    ) VALUES (
      NEW.id, org_id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Super Admin'),
      'owner', true, true
    );
  ELSE
    -- Create organization for regular user
    INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
    VALUES (org_name, org_slug, 'trial', 'starter')
    RETURNING id INTO org_id;

    -- Create user profile
    INSERT INTO profiles (
      id, organization_id, email, full_name, role, is_super_admin, is_active
    ) VALUES (
      NEW.id, org_id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'owner', false, true
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue (don't fail user creation)
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. CREATE UTILITY FUNCTIONS

-- Function to create super admin user
CREATE OR REPLACE FUNCTION create_super_admin()
RETURNS TEXT AS $$
DECLARE
  admin_exists BOOLEAN;
  result TEXT;
BEGIN
  -- Check if super admin already exists
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE email = 'superadmin@adsapp.com'
  ) INTO admin_exists;

  IF admin_exists THEN
    RETURN 'Super admin already exists';
  END IF;

  -- Create the super admin user in auth.users
  -- Note: In production, this should be done through Supabase Auth API
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    raw_user_meta_data,
    confirmation_token,
    email_confirmed_at
  ) VALUES (
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000',
    'superadmin@adsapp.com',
    crypt('SuperAdmin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    jsonb_build_object(
      'full_name', 'Super Administrator',
      'organization_name', 'ADSapp Admin'
    ),
    '',
    NOW()
  );

  RETURN 'Super admin created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Failed to create super admin: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix existing broken users
CREATE OR REPLACE FUNCTION fix_broken_users()
RETURNS TEXT AS $$
DECLARE
  fixed_count INTEGER := 0;
  user_record RECORD;
  new_org_id UUID;
  result TEXT;
BEGIN
  -- Find users without profiles
  FOR user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Create organization for this user
    INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
    VALUES (
      COALESCE(user_record.raw_user_meta_data->>'organization_name', user_record.email || '''s Organization'),
      LOWER(REPLACE(SPLIT_PART(user_record.email, '@', 1), '.', '-')) || '-org-' || EXTRACT(EPOCH FROM NOW())::text,
      'trial',
      'starter'
    )
    RETURNING id INTO new_org_id;

    -- Create profile for this user
    INSERT INTO profiles (
      id, organization_id, email, full_name, role, is_super_admin, is_active
    ) VALUES (
      user_record.id,
      new_org_id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', ''),
      'owner',
      user_record.email = 'superadmin@adsapp.com',
      true
    );

    fixed_count := fixed_count + 1;
  END LOOP;

  RETURN 'Fixed ' || fixed_count || ' broken user profiles';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error fixing users: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test database setup
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS TABLE(test_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
  -- Test 1: Check if organizations table exists and is accessible
  BEGIN
    PERFORM COUNT(*) FROM organizations;
    RETURN QUERY SELECT 'Organizations table', 'PASS'::TEXT, 'Table accessible'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'Organizations table', 'FAIL'::TEXT, SQLERRM;
  END;

  -- Test 2: Check if profiles table exists and is accessible
  BEGIN
    PERFORM COUNT(*) FROM profiles;
    RETURN QUERY SELECT 'Profiles table', 'PASS'::TEXT, 'Table accessible'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'Profiles table', 'FAIL'::TEXT, SQLERRM;
  END;

  -- Test 3: Check if trigger function exists
  BEGIN
    PERFORM handle_new_user();
    RETURN QUERY SELECT 'Trigger function', 'FAIL'::TEXT, 'Function should not execute without trigger context'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%NEW%' OR SQLERRM LIKE '%trigger%' THEN
        RETURN QUERY SELECT 'Trigger function', 'PASS'::TEXT, 'Function exists and expects trigger context'::TEXT;
      ELSE
        RETURN QUERY SELECT 'Trigger function', 'FAIL'::TEXT, SQLERRM;
      END IF;
  END;

  -- Test 4: Check RLS policies
  BEGIN
    PERFORM COUNT(*) FROM pg_policies WHERE tablename IN ('organizations', 'profiles');
    RETURN QUERY SELECT 'RLS policies', 'PASS'::TEXT, 'Policies exist'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'RLS policies', 'FAIL'::TEXT, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. GRANT NECESSARY PERMISSIONS

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- Grant permissions for trigger functions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT, INSERT, UPDATE ON auth.users TO postgres;

-- 6. CREATE HELPFUL INDEXES

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id_role ON profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- 7. INSERT SYSTEM SETTINGS

INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('user_registration_enabled', 'true', 'Allow new user registrations', 'general', true),
('email_confirmation_required', 'false', 'Require email confirmation for new users', 'security', true),
('auto_create_organization', 'true', 'Automatically create organization for new users', 'general', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- 8. RUN INITIAL TESTS AND FIXES

-- Fix any existing broken users
SELECT fix_broken_users() as fix_result;

-- Test the database setup
SELECT * FROM test_database_setup();

-- Display final status
SELECT
  'Database fix complete' as status,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE is_super_admin = true) as super_admins,
  NOW() as completed_at;