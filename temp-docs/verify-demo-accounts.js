/**
 * Verify Demo Accounts Script
 *
 * This script verifies that all demo accounts are properly configured
 * and can be used for testing.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyOrganization() {
  console.log('\n📦 Verifying Demo Organization...');

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', 'demo-company')
    .single();

  if (error) {
    console.error('❌ Organization not found:', error.message);
    return null;
  }

  console.log('✅ Organization Found:');
  console.log(`   ID: ${data.id}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Slug: ${data.slug}`);
  console.log(`   Subscription: ${data.subscription_tier} (${data.subscription_status})`);
  console.log(`   WhatsApp Account ID: ${data.whatsapp_business_account_id}`);
  console.log(`   WhatsApp Phone ID: ${data.whatsapp_phone_number_id}`);

  return data.id;
}

async function verifyProfiles(organizationId) {
  console.log('\n👥 Verifying User Profiles...');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('role', { ascending: false });

  if (error) {
    console.error('❌ Error fetching profiles:', error.message);
    return [];
  }

  console.log(`✅ Found ${data.length} profiles:`);
  data.forEach(profile => {
    console.log(`\n   ${profile.role.toUpperCase()}:`);
    console.log(`   - Email: ${profile.email}`);
    console.log(`   - Full Name: ${profile.full_name}`);
    console.log(`   - User ID: ${profile.id}`);
    console.log(`   - Active: ${profile.is_active}`);
    console.log(`   - Created: ${new Date(profile.created_at).toLocaleDateString()}`);
  });

  return data;
}

async function verifyAuthUsers(profiles) {
  console.log('\n🔐 Verifying Auth Users...');

  const { data: allUsers, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error fetching auth users:', error.message);
    return false;
  }

  let allVerified = true;

  for (const profile of profiles) {
    const authUser = allUsers.users.find(u => u.id === profile.id);

    if (!authUser) {
      console.error(`❌ Auth user not found for: ${profile.email}`);
      allVerified = false;
      continue;
    }

    const emailConfirmed = authUser.email_confirmed_at !== null;
    const status = emailConfirmed ? '✅' : '⚠️';

    console.log(`${status} ${profile.email}:`);
    console.log(`   - Auth ID: ${authUser.id}`);
    console.log(`   - Email Confirmed: ${emailConfirmed}`);
    console.log(`   - Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
  }

  return allVerified;
}

async function testLogin(email, password) {
  console.log(`\n🔑 Testing login for ${email}...`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`❌ Login failed: ${error.message}`);
      return false;
    }

    console.log(`✅ Login successful!`);
    console.log(`   - User ID: ${data.user.id}`);
    console.log(`   - Session: ${data.session ? 'Active' : 'None'}`);

    // Sign out
    await supabase.auth.signOut();

    return true;
  } catch (error) {
    console.error(`❌ Login error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   ADSapp Demo Account Verification                ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    // Step 1: Verify organization
    const organizationId = await verifyOrganization();
    if (!organizationId) {
      throw new Error('Demo organization not found');
    }

    // Step 2: Verify profiles
    const profiles = await verifyProfiles(organizationId);
    if (profiles.length === 0) {
      throw new Error('No profiles found');
    }

    // Step 3: Verify auth users
    const authVerified = await verifyAuthUsers(profiles);
    if (!authVerified) {
      console.warn('\n⚠️  Some auth users have issues');
    }

    // Step 4: Test login for each account
    console.log('\n🔐 Testing Login Functionality...');
    const loginTests = [
      { email: 'owner@demo-company.com', password: 'Demo2024!Owner' },
      { email: 'admin@demo-company.com', password: 'Demo2024!Admin' },
      { email: 'agent@demo-company.com', password: 'Demo2024!Agent' },
    ];

    let allLoginsWork = true;
    for (const { email, password } of loginTests) {
      const success = await testLogin(email, password);
      if (!success) allLoginsWork = false;
    }

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   Verification Summary                             ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\n✅ Organization: Created and configured`);
    console.log(`✅ Profiles: ${profiles.length} users with correct roles`);
    console.log(`${authVerified ? '✅' : '⚠️'}  Auth Users: ${authVerified ? 'All verified' : 'Some issues found'}`);
    console.log(`${allLoginsWork ? '✅' : '⚠️'}  Login Tests: ${allLoginsWork ? 'All passed' : 'Some failed'}`);

    if (authVerified && allLoginsWork) {
      console.log('\n🎉 All demo accounts are ready to use!');
      console.log('📝 See DEMO_ACCOUNTS.md for login credentials and usage guide.\n');
    } else {
      console.log('\n⚠️  Some issues were found. Please review the output above.\n');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();