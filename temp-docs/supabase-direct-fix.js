#!/usr/bin/env node

/**
 * EMERGENCY SUPABASE DATABASE FIX
 *
 * This script uses direct HTTP calls to Supabase's PostgREST API
 * to execute SQL commands with the service role key.
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://egaiyydjgeqlhthxmvbn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function main() {
  console.log('\n🚨 CRITICAL: SUPABASE LIMITATIONS DETECTED\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('❌ PROBLEM: Cannot execute DDL commands via Supabase Client SDK');
  console.log('   Supabase does not expose a direct SQL execution endpoint');
  console.log('   for security reasons. DDL commands (ALTER TABLE, CREATE POLICY,');
  console.log('   etc.) must be run through the Supabase Dashboard SQL Editor.\n');

  console.log('✅ SOLUTION: Use the Supabase Dashboard SQL Editor\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📋 STEP-BY-STEP GUIDE TO FIX YOUR DATABASE:\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('STEP 1: Open Supabase SQL Editor');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('1. Go to: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn');
  console.log('2. Click "SQL Editor" in the left sidebar');
  console.log('3. Click "+ New query"\n');

  console.log('STEP 2: Copy and Run the Database Fix SQL');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('1. Open the file: MANUAL_DATABASE_FIX.sql');
  console.log('2. Copy ALL the SQL (Ctrl+A, Ctrl+C)');
  console.log('3. Paste into the SQL Editor');
  console.log('4. Click "RUN" button (or press Ctrl+Enter)\n');
  console.log('5. You should see: "Success. No rows returned"\n');

  console.log('STEP 3: Create Super Admin User');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('1. In Supabase Dashboard, click "Authentication" (left sidebar)');
  console.log('2. Click "Add user" button');
  console.log('3. Enter:');
  console.log('   - Email: superadmin@adsapp.com');
  console.log('   - Password: ADSapp2024!SuperSecure#Admin');
  console.log('   - Auto Confirm User: YES (check this box!)');
  console.log('4. Click "Create user"\n');

  console.log('STEP 4: Make User Super Admin');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('1. Go back to SQL Editor');
  console.log('2. Create a new query');
  console.log('3. Copy and paste this SQL:\n');
  console.log('   UPDATE public.profiles');
  console.log('   SET');
  console.log('     role = \'super_admin\',');
  console.log('     is_super_admin = true,');
  console.log('     full_name = \'Super Admin\',');
  console.log('     updated_at = NOW()');
  console.log('   WHERE email = \'superadmin@adsapp.com\';\n');
  console.log('4. Click RUN');
  console.log('5. You should see: "Success. 1 rows affected"\n');

  console.log('STEP 5: Verify Setup');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Run this verification query:\n');
  console.log('   SELECT id, email, role, is_super_admin, created_at');
  console.log('   FROM public.profiles');
  console.log('   WHERE email = \'superadmin@adsapp.com\';\n');
  console.log('You should see your super admin user with is_super_admin = true\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🎯 ALTERNATIVE: Let me try creating the user directly...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Try to at least test if we can create users via the admin API
  console.log('Testing user creation via Supabase Admin API...\n');

  try {
    // First check existing users
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log('❌ Cannot list users:', listError.message);
      console.log('   This confirms we need to use the Dashboard.\n');
    } else {
      console.log(`✅ Found ${existingUsers.users.length} existing users in auth.users\n`);

      const superAdmin = existingUsers.users.find(u => u.email === 'superadmin@adsapp.com');

      if (superAdmin) {
        console.log('ℹ️  Super admin user already exists in auth.users');
        console.log('   User ID:', superAdmin.id);
        console.log('   Email:', superAdmin.email);
        console.log('   Created:', superAdmin.created_at);
        console.log('\n   However, the profiles table may be missing the user.');
        console.log('   Run the SQL fix in Step 2 above, then manually insert the profile.\n');
      } else {
        console.log('ℹ️  Super admin does not exist. Creating now...\n');

        // Try to create the user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: 'superadmin@adsapp.com',
          password: 'ADSapp2024!SuperSecure#Admin',
          email_confirm: true,
          user_metadata: {
            full_name: 'Super Admin',
            role: 'super_admin',
            is_super_admin: true
          }
        });

        if (createError) {
          console.log('❌ Cannot create user:', createError.message);
          console.log('   Reason:', createError);
          console.log('\n   Please use the Dashboard method described above.\n');
        } else {
          console.log('✅ User created in auth.users!');
          console.log('   User ID:', newUser.user.id);
          console.log('   Email:', newUser.user.email);
          console.log('\n   ⚠️  However, the profile may not be created automatically');
          console.log('   because the trigger depends on the schema fix.\n');
          console.log('   Next steps:');
          console.log('   1. Run the SQL fix (Step 2 above)');
          console.log('   2. Run the UPDATE query (Step 4 above)\n');
        }
      }
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('   Please follow the manual steps above.\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📄 QUICK REFERENCE FILES CREATED:\n');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  📁 MANUAL_DATABASE_FIX.sql - Complete SQL fix script');
  console.log('  📁 quick-database-fix.sql - Alternative fix script');
  console.log('  📁 fix_database_issues.sql - Another fix option\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('💡 TIP: The fastest way is to:');
  console.log('   1. Open MANUAL_DATABASE_FIX.sql');
  console.log('   2. Copy everything');
  console.log('   3. Paste in Supabase SQL Editor');
  console.log('   4. Click RUN');
  console.log('   5. Create user via Dashboard Authentication');
  console.log('   6. Run the UPDATE query to make them super admin\n');

  console.log('🚀 After completing these steps, your database will be fixed!\n');
}

main().catch(console.error);