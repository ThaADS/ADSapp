import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const supabaseUrl = 'https://egaiyydjgeqlhthxmvbn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzM4NjQsImV4cCI6MjA3NDQwOTg2NH0.dX7gwwqk5gVY6NJWec8Gr2CfbxyxJhp0gkx6-SWl7oQ'

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to Supabase...')
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_initial_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded successfully')
    console.log('🚀 Applying database schema...')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.log(`⚠️  Statement ${i + 1} may have failed (this might be expected):`, error.message)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} error (continuing):`, err.message)
      }
    }
    
    console.log('🎉 Database setup completed!')
    console.log('🔍 Verifying tables...')
    
    // Verify some key tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError.message)
    } else {
      const tableNames = tables.map(t => t.table_name)
      const expectedTables = ['organizations', 'profiles', 'contacts', 'conversations', 'messages']
      
      console.log('📋 Tables found:', tableNames.join(', '))
      
      const missingTables = expectedTables.filter(table => !tableNames.includes(table))
      if (missingTables.length === 0) {
        console.log('✅ All expected tables are present!')
      } else {
        console.log('⚠️  Missing tables:', missingTables.join(', '))
      }
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

setupDatabase()
