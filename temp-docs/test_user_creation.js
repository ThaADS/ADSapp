// Test User Creation Script
// Run this after applying the database fixes to verify user creation works
// Usage: node test_user_creation.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...\n');

  try {
    // Test 1: Check if we can query organizations
    console.log('1. Testing organizations table access...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .limit(5);

    if (orgError) {
      console.error('   ❌ Organizations table error:', orgError.message);
    } else {
      console.log(`   ✅ Organizations table accessible (${orgs.length} records)`);
    }

    // Test 2: Check if we can query profiles
    console.log('2. Testing profiles table access...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, is_super_admin')
      .limit(5);

    if (profileError) {
      console.error('   ❌ Profiles table error:', profileError.message);
    } else {
      console.log(`   ✅ Profiles table accessible (${profiles.length} records)`);

      // Check for super admin
      const superAdmin = profiles.find(p => p.is_super_admin);
      if (superAdmin) {
        console.log(`   ✅ Super admin found: ${superAdmin.email}`);
      } else {
        console.log('   ⚠️  No super admin found');
      }
    }

    // Test 3: Test database functions
    console.log('3. Testing database functions...');
    const { data: testResults, error: testError } = await supabase
      .rpc('test_database_setup');

    if (testError) {
      console.error('   ❌ Database test function error:', testError.message);
    } else {
      console.log('   ✅ Database test results:');
      testResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`      ${icon} ${result.test_name}: ${result.status} - ${result.details}`);
      });
    }

  } catch (error) {
    console.error('❌ Database setup test failed:', error.message);
  }
}

async function testUserCreation() {
  console.log('\n🧪 Testing user creation...\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  try {
    console.log(`1. Creating test user: ${testEmail}`);

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName,
          organization_name: 'Test Organization'
        }
      }
    });

    if (authError) {
      console.error('   ❌ User creation failed:', authError.message);
      return false;
    }

    if (!authData.user) {
      console.error('   ❌ No user data returned');
      return false;
    }

    console.log(`   ✅ User created successfully: ${authData.user.id}`);

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if profile was created
    console.log('2. Checking if profile was created...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('   ❌ Profile not found:', profileError.message);
      return false;
    }

    console.log('   ✅ Profile created successfully:');
    console.log(`      Email: ${profile.email}`);
    console.log(`      Role: ${profile.role}`);
    console.log(`      Organization: ${profile.organizations.name}`);

    // Clean up test user
    console.log('3. Cleaning up test data...');

    // Delete profile and organization
    await supabase.from('profiles').delete().eq('id', authData.user.id);
    await supabase.from('organizations').delete().eq('id', profile.organization_id);

    // Delete from auth (requires service role)
    await supabase.auth.admin.deleteUser(authData.user.id);

    console.log('   ✅ Test data cleaned up');

    return true;

  } catch (error) {
    console.error('❌ User creation test failed:', error.message);
    return false;
  }
}

async function testSuperAdminAccess() {
  console.log('\n👑 Testing super admin functionality...\n');

  try {
    // Check if super admin exists
    const { data: superAdmins, error: superAdminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_super_admin', true);

    if (superAdminError) {
      console.error('   ❌ Error checking super admin:', superAdminError.message);
      return false;
    }

    if (superAdmins.length === 0) {
      console.log('   ⚠️  No super admin found. Creating one...');

      // Create super admin
      const { data: createResult, error: createError } = await supabase
        .rpc('create_super_admin');

      if (createError) {
        console.error('   ❌ Failed to create super admin:', createError.message);
        return false;
      }

      console.log(`   ✅ ${createResult}`);
    } else {
      console.log(`   ✅ Super admin exists: ${superAdmins[0].email}`);
    }

    // Test super admin access to all organizations
    const { data: allOrgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, status');

    if (orgError) {
      console.error('   ❌ Super admin cannot access organizations:', orgError.message);
      return false;
    }

    console.log(`   ✅ Super admin can access ${allOrgs.length} organizations`);
    return true;

  } catch (error) {
    console.error('❌ Super admin test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting ADSapp Database Tests');
  console.log('=====================================\n');

  const results = {
    databaseSetup: false,
    userCreation: false,
    superAdminAccess: false
  };

  // Run tests
  await testDatabaseSetup();
  results.userCreation = await testUserCreation();
  results.superAdminAccess = await testSuperAdminAccess();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('=================');

  const allPassed = Object.values(results).every(result => result);

  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${icon} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log('\n✅ Database is properly configured for user creation!');
    console.log('✅ You can now test user registration in your application.');
  } else {
    console.log('\n❌ Some issues remain. Check the errors above and apply the database fixes.');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});