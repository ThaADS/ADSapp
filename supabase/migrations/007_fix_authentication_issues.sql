-- Fix Authentication and User Creation Issues
-- This migration resolves RLS conflicts, trigger issues, and ensures proper user creation

-- 1. Fix conflicting RLS policies on profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a single, comprehensive profile insert policy
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT WITH CHECK (
    -- Allow insert if:
    -- 1. User is inserting their own profile
    auth.uid() = id
    -- 2. OR it's being inserted by the handle_new_user trigger (service role)
    OR auth.uid() IS NULL
    -- 3. OR user is a super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- 2. Fix the handle_new_user trigger function to handle organization creation properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
BEGIN
  -- Extract organization name from user metadata
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    'Personal Organization'
  );

  -- For the first user (super admin), create a special admin organization
  IF NEW.email = 'superadmin@adsapp.com' THEN
    -- Create admin organization
    INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
    VALUES ('ADSapp Admin', 'adsapp-admin', 'active', 'enterprise')
    RETURNING id INTO org_id;

    -- Create super admin profile
    INSERT INTO profiles (
      id,
      organization_id,
      email,
      full_name,
      role,
      is_super_admin,
      super_admin_permissions,
      is_active
    ) VALUES (
      NEW.id,
      org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Super Admin'),
      'owner',
      true,
      ARRAY['system:read', 'system:write', 'organizations:manage', 'users:manage', 'billing:manage'],
      true
    );
  ELSE
    -- For regular users, check if they have an organization_name in metadata
    IF org_name != 'Personal Organization' THEN
      -- Create new organization for this user
      INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
      VALUES (
        org_name,
        LOWER(REPLACE(REPLACE(org_name, ' ', '-'), '.', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::text,
        'trial',
        'starter'
      )
      RETURNING id INTO org_id;
    ELSE
      -- For users without organization name, create a personal org
      INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
      VALUES (
        NEW.email || '''s Organization',
        LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-')) || '-org-' || EXTRACT(EPOCH FROM NOW())::text,
        'trial',
        'starter'
      )
      RETURNING id INTO org_id;
    END IF;

    -- Create regular user profile
    INSERT INTO profiles (
      id,
      organization_id,
      email,
      full_name,
      role,
      is_super_admin,
      is_active
    ) VALUES (
      NEW.id,
      org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'owner', -- First user in organization becomes owner
      false,
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE EXCEPTION 'Error in handle_new_user trigger: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Create function to safely create super admin if it doesn't exist
CREATE OR REPLACE FUNCTION create_super_admin_if_not_exists()
RETURNS BOOLEAN AS $$
DECLARE
  admin_exists BOOLEAN;
  admin_user_id UUID;
  org_id UUID;
BEGIN
  -- Check if super admin already exists
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE is_super_admin = true
  ) INTO admin_exists;

  IF NOT admin_exists THEN
    -- Create admin organization first
    INSERT INTO organizations (
      id,
      name,
      slug,
      subscription_status,
      subscription_tier,
      status
    ) VALUES (
      uuid_generate_v4(),
      'ADSapp Admin',
      'adsapp-admin',
      'active',
      'enterprise',
      'active'
    )
    RETURNING id INTO org_id;

    -- Generate a UUID for the admin user
    admin_user_id := uuid_generate_v4();

    -- Insert into auth.users (this will trigger handle_new_user)
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
      raw_user_meta_data
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'superadmin@adsapp.com',
      crypt('SuperAdmin123!', gen_salt('bf')), -- You should change this password
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      jsonb_build_object(
        'full_name', 'Super Administrator',
        'organization_name', 'ADSapp Admin'
      )
    );

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix RLS policies to allow proper access patterns

-- Update profiles policies to handle the auth flow properly
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    -- Users can see profiles in their organization
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    -- Super admins can see all profiles
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
    -- Users can see their own profile during creation
    OR id = auth.uid()
  );

-- Update organizations policy to handle creation better
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
  FOR SELECT USING (
    -- Users can view their organization
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    -- Super admins can view all organizations
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Add policy to allow organization creation during signup
CREATE POLICY "Allow organization creation during signup" ON organizations
  FOR INSERT WITH CHECK (true); -- This will be restricted by application logic

-- 6. Create indexes for better performance during auth operations
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id_role ON profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- 7. Grant necessary permissions for the trigger function
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT, INSERT, UPDATE ON auth.users TO postgres;
GRANT ALL ON organizations TO postgres;
GRANT ALL ON profiles TO postgres;

-- 8. Create a function to reset/fix existing broken users
CREATE OR REPLACE FUNCTION fix_broken_user_profiles()
RETURNS TABLE(fixed_users INTEGER, created_orgs INTEGER) AS $$
DECLARE
  fixed_count INTEGER := 0;
  org_count INTEGER := 0;
  user_record RECORD;
  new_org_id UUID;
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

    org_count := org_count + 1;

    -- Create profile for this user
    INSERT INTO profiles (
      id,
      organization_id,
      email,
      full_name,
      role,
      is_super_admin,
      is_active
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

  RETURN QUERY SELECT fixed_count, org_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to test user creation
CREATE OR REPLACE FUNCTION test_user_creation(test_email TEXT, test_name TEXT DEFAULT 'Test User')
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
BEGIN
  -- Generate test user ID
  test_user_id := uuid_generate_v4();

  -- Try to simulate user creation
  BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, subscription_status, subscription_tier)
    VALUES (
      test_name || '''s Organization',
      'test-org-' || EXTRACT(EPOCH FROM NOW())::text,
      'trial',
      'starter'
    )
    RETURNING id INTO test_org_id;

    -- Create profile
    INSERT INTO profiles (
      id,
      organization_id,
      email,
      full_name,
      role,
      is_super_admin,
      is_active
    ) VALUES (
      test_user_id,
      test_org_id,
      test_email,
      test_name,
      'owner',
      false,
      true
    );

    -- Clean up test data
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM organizations WHERE id = test_org_id;

    RETURN QUERY SELECT true, 'User creation test successful';
  EXCEPTION
    WHEN OTHERS THEN
      -- Clean up any partial data
      DELETE FROM profiles WHERE id = test_user_id;
      DELETE FROM organizations WHERE id = test_org_id;

      RETURN QUERY SELECT false, 'User creation test failed: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create default system settings if they don't exist
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('user_registration_enabled', 'true', 'Allow new user registrations', 'general', true),
('email_confirmation_required', 'false', 'Require email confirmation for new users', 'security', true),
('auto_create_organization', 'true', 'Automatically create organization for new users', 'general', false)
ON CONFLICT (key) DO NOTHING;

-- 11. Ensure auth schema permissions are correct
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON auth.users TO authenticated;

COMMENT ON MIGRATION IS 'Fix authentication and user creation issues - resolves RLS conflicts, improves trigger function, and ensures proper user/organization creation flow';