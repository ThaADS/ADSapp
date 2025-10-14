const https = require('https');

const SUPABASE_PROJECT_REF = 'egaiyydjgeqlhthxmvbn';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

// Complete SQL fix script
const SQL_FIX = `
-- ============================================
-- EMERGENCY DATABASE FIX - FORCE APPLY
-- ============================================

-- Step 1: Add missing columns to profiles table
DO $$
BEGIN
  -- Add is_super_admin column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added is_super_admin column';
  END IF;

  -- Add last_seen column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added last_seen column';
  END IF;
END $$;

-- Step 2: Drop all existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access" ON public.profiles;

-- Step 3: Create permissive RLS policies
CREATE POLICY "Enable all access for service role"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 4: Recreate trigger function for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_super_admin,
    last_seen,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::boolean, false),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_super_admin = EXCLUDED.is_super_admin,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database fix completed successfully!';
  RAISE NOTICE '   - Added is_super_admin and last_seen columns';
  RAISE NOTICE '   - Fixed RLS policies';
  RAISE NOTICE '   - Created user signup trigger';
  RAISE NOTICE '   - Granted necessary permissions';
END $$;
`;

function executePostgrestQuery(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: `${SUPABASE_PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 FORCE DATABASE FIX - DIRECT SQL EXECUTION\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Target Database:', SUPABASE_URL);
  console.log('Using Service Role Key\n');

  console.log('📋 SQL Script to Execute:');
  console.log('─────────────────────────────────────────────────────');
  console.log(SQL_FIX);
  console.log('─────────────────────────────────────────────────────\n');

  console.log('⚠️  IMPORTANT: This SQL must be run manually in Supabase SQL Editor');
  console.log('');
  console.log('🔧 MANUAL FIX INSTRUCTIONS:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Open Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn');
  console.log('');
  console.log('2. Navigate to: SQL Editor (left sidebar)');
  console.log('');
  console.log('3. Click "New Query"');
  console.log('');
  console.log('4. Copy the ENTIRE SQL script from above');
  console.log('');
  console.log('5. Paste into the SQL Editor');
  console.log('');
  console.log('6. Click "Run" (or press Ctrl+Enter / Cmd+Enter)');
  console.log('');
  console.log('7. Wait for "Success" message');
  console.log('');
  console.log('8. Then run the super admin creation script below:');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 SUPER ADMIN CREATION SQL:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`
-- Create super admin user in auth.users
-- You'll need to do this via Supabase Dashboard > Authentication > Add User
-- OR run this after the schema fix:

-- First, insert into auth.users (use Dashboard UI for this)
-- Email: superadmin@adsapp.com
-- Password: ADSapp2024!SuperSecure#Admin
-- Confirm email: YES

-- Then run this to update their profile:
UPDATE public.profiles
SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = 'Super Admin',
  updated_at = NOW()
WHERE email = 'superadmin@adsapp.com';

-- Verify the super admin was created:
SELECT id, email, role, is_super_admin, created_at
FROM public.profiles
WHERE email = 'superadmin@adsapp.com';
  `);
  console.log('─────────────────────────────────────────────────────\n');

  // Also save to a file for easy access
  const fs = require('fs');
  const fixPath = 'C:\\Ai Projecten\\ADSapp\\MANUAL_DATABASE_FIX.sql';

  fs.writeFileSync(fixPath, SQL_FIX + `\n\n-- Super Admin Creation\n` + `
-- 1. Go to Supabase Dashboard > Authentication > Add User
-- 2. Email: superadmin@adsapp.com
-- 3. Password: ADSapp2024!SuperSecure#Admin
-- 4. Confirm email: YES
-- 5. Then run:

UPDATE public.profiles
SET
  role = 'super_admin',
  is_super_admin = true,
  full_name = 'Super Admin',
  updated_at = NOW()
WHERE email = 'superadmin@adsapp.com';

SELECT id, email, role, is_super_admin
FROM public.profiles
WHERE email = 'superadmin@adsapp.com';
`);

  console.log(`✅ SQL script saved to: ${fixPath}`);
  console.log('');
  console.log('🎯 QUICK START:');
  console.log('   1. Open the file above in a text editor');
  console.log('   2. Copy all the SQL');
  console.log('   3. Paste into Supabase SQL Editor');
  console.log('   4. Click Run');
  console.log('   5. Create user via Dashboard > Authentication');
  console.log('   6. Update user to super admin with the UPDATE query');
  console.log('');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);