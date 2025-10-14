const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://egaiyydjgeqlhthxmvbn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

async function checkAllPolicies() {
  console.log('🔍 Checking ALL RLS Policies on profiles table\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Use direct SQL query via service role
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.log('❌ Cannot query via RPC, trying alternative...\n');

    // Try direct query
    const query = `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
      ORDER BY policyname;
    `;

    console.log('SQL to run manually in Supabase SQL Editor:');
    console.log(query);
    console.log('\nOr check policies in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/editor');

    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No policies found on profiles table\n');
    return;
  }

  console.log(`Found ${data.length} policies on profiles table:\n`);

  data.forEach((policy, i) => {
    console.log(`${i + 1}. Policy: "${policy.policyname}"`);
    console.log(`   Command: ${policy.cmd}`);
    console.log(`   USING: ${policy.qual || 'N/A'}`);
    console.log(`   WITH CHECK: ${policy.with_check || 'N/A'}`);
    console.log('');
  });

  console.log('⚠️  Check if any policy queries the profiles table in USING or WITH CHECK clauses');
  console.log('   That would cause infinite recursion!\n');
}

checkAllPolicies().catch(console.error);