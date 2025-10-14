const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://egaiyydjgeqlhthxmvbn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies and Profile Access...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Check if profile exists (bypass RLS with service role)
  console.log('1️⃣ Checking if super admin profile exists (service role)...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '80bb0190-649e-4354-8e84-cc3c14e44148')
    .single();

  if (profileError) {
    console.log('   ❌ Error:', profileError.message);
  } else {
    console.log('   ✅ Profile found:');
    console.log('      Email:', profile.email);
    console.log('      Role:', profile.role);
    console.log('      is_super_admin:', profile.is_super_admin);
    console.log('      organization_id:', profile.organization_id);
  }

  // 2. Check RLS policies on profiles table
  console.log('\n2️⃣ Checking RLS policies on profiles table...');
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'profiles'
        ORDER BY policyname;
      `
    })
    .catch(() => {
      // If RPC doesn't exist, try direct query
      return supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'profiles');
    });

  if (policyError) {
    console.log('   ⚠️  Cannot query policies directly');
    console.log('   This is normal - checking alternative method...');
  } else if (policies) {
    console.log('   Policies found:', policies.length);
    policies.forEach(p => {
      console.log(`   - ${p.policyname} (${p.cmd})`);
    });
  }

  // 3. Test authenticated user access (simulate what happens after login)
  console.log('\n3️⃣ Testing authenticated user access to own profile...');

  // Sign in as super admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@adsapp.com',
    password: 'ADSapp2024!SuperSecure#Admin'
  });

  if (authError) {
    console.log('   ❌ Login failed:', authError.message);
    return;
  }

  console.log('   ✅ Login successful');
  console.log('   User ID:', authData.user.id);

  // Create a new client with the user's session
  const userSupabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzM4NjQsImV4cCI6MjA3NDQwOTg2NH0.r3VLq_qnhWkLckWHiJ2PVWqpb9Aw2DsYHMFq2m56ayk', {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Try to read own profile
  const { data: userProfile, error: userProfileError } = await userSupabase
    .from('profiles')
    .select('is_super_admin, organization_id')
    .eq('id', authData.user.id)
    .single();

  if (userProfileError) {
    console.log('\n   ❌ PROFILE QUERY FAILED (This is the problem!)');
    console.log('   Error:', userProfileError.message);
    console.log('   Code:', userProfileError.code);
    console.log('   Details:', userProfileError.details);
    console.log('   Hint:', userProfileError.hint);
  } else {
    console.log('\n   ✅ Profile query successful');
    console.log('   is_super_admin:', userProfile.is_super_admin);
    console.log('   organization_id:', userProfile.organization_id);
  }

  // 4. Check if RLS is enabled
  console.log('\n4️⃣ Checking RLS status...');
  const { data: tableInfo, error: tableError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE tablename = 'profiles';
      `
    })
    .catch(() => null);

  if (tableInfo) {
    console.log('   RLS enabled:', tableInfo[0]?.rowsecurity);
  }

  console.log('\n📊 Analysis Complete\n');
  console.log('If profile query failed with 500 error, the RLS policies need to be fixed.');
  console.log('Run the supabase-fix-super-admin.sql script in Supabase SQL Editor.\n');
}

checkRLSPolicies().catch(console.error);