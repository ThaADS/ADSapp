-- Simple Super Admin Account Creation SQL
-- Run this directly in Supabase SQL Editor

-- 1. First, insert into auth.users (Supabase Auth)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'superadmin@adsapp.com',
  crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Administrator"}',
  true,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- 2. Create super admin organization
INSERT INTO public.organizations (
  id,
  name,
  subdomain,
  settings,
  subscription_plan,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'ADSapp System Administration',
  'admin',
  '{"is_super_admin_org": true}',
  'enterprise',
  now(),
  now()
) ON CONFLICT (subdomain) DO NOTHING;

-- 3. Create super admin profile
INSERT INTO public.profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  permissions,
  last_seen
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'superadmin@adsapp.com'),
  (SELECT id FROM public.organizations WHERE subdomain = 'admin'),
  'superadmin@adsapp.com',
  'Super Administrator',
  'super_admin',
  '["manage_organizations", "manage_users", "manage_billing", "manage_system_settings", "view_analytics", "manage_support"]',
  now()
) ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  permissions = '["manage_organizations", "manage_users", "manage_billing", "manage_system_settings", "view_analytics", "manage_support"]';

-- Show result
SELECT
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role,
  o.name as organization_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE u.email = 'superadmin@adsapp.com';