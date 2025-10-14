-- Very simple user creation without conflicts
-- Run in Supabase SQL Editor

-- Check if user already exists
SELECT email FROM auth.users WHERE email = 'superadmin@adsapp.com';

-- If not exists, create manually
-- You'll need to do this in Supabase Dashboard Authentication tab:
-- 1. Go to Authentication > Users
-- 2. Click "Add user"
-- 3. Email: superadmin@adsapp.com
-- 4. Password: ADSapp2024!SuperSecure#Admin
-- 5. Auto confirm: Yes

-- After creating in Dashboard, run this to add profile:
INSERT INTO profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  permissions
)
SELECT
  (SELECT id FROM auth.users WHERE email = 'superadmin@adsapp.com'),
  (SELECT id FROM organizations LIMIT 1),
  'superadmin@adsapp.com',
  'Super Administrator',
  'super_admin',
  '["manage_organizations", "manage_users", "manage_billing", "manage_system_settings", "view_analytics", "manage_support"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'superadmin@adsapp.com')
);