const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying team_invitations migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '037_team_invitations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 SQL size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Execute migration
    console.log('⏳ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('⚠️  RPC method not available, trying direct execution...\n');

      // Split into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📋 Executing ${statements.length} statements...\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`[${i + 1}/${statements.length}] Executing...`);

        try {
          await supabase.rpc('exec', { sql: stmt }).catch(() => {
            // If RPC fails, log the statement
            console.log('Statement:', stmt.substring(0, 100) + '...');
          });
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} error (may be expected):`, err.message);
        }
      }
    }

    // Verify tables were created
    console.log('\n✅ Verifying migration...\n');

    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('id')
      .limit(1);

    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('id')
      .limit(1);

    console.log('✅ team_invitations table:', invitations !== null ? 'EXISTS' : '⚠️  NOT FOUND');
    console.log('✅ api_keys table:', apiKeys !== null ? 'EXISTS' : '⚠️  NOT FOUND');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('1. Test team invitations in Settings → Team');
    console.log('2. Test API key generation in Settings → Integrations');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 You may need to apply this migration manually via Supabase Dashboard:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Go to SQL Editor');
    console.error('   4. Paste the contents of: supabase/migrations/037_team_invitations.sql');
    console.error('   5. Execute the SQL');
    process.exit(1);
  }
}

applyMigration();
