/**
 * Cleanup Demo Accounts Script
 *
 * This script removes any existing demo accounts and organization
 * to allow for a fresh creation.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_ORG_SLUG = 'demo-company';
const DEMO_EMAILS = [
  'owner@demo-company.com',
  'admin@demo-company.com',
  'agent@demo-company.com',
];

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🧹 Cleaning up demo accounts...\n');

  try {
    // Delete auth users
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    for (const email of DEMO_EMAILS) {
      const user = allUsers.users.find(u => u.email === email);
      if (user) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`❌ Failed to delete auth user ${email}:`, deleteError.message);
        } else {
          console.log(`✅ Deleted auth user: ${email}`);
        }
      }
    }

    // Delete organization (cascading deletes will remove profiles)
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .eq('slug', DEMO_ORG_SLUG);

    if (orgError) {
      console.error('❌ Failed to delete organization:', orgError.message);
    } else {
      console.log(`✅ Deleted organization: ${DEMO_ORG_SLUG}`);
    }

    console.log('\n✅ Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

main();