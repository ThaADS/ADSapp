import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://egaiyydjgeqlhthxmvbn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MzM4NjQsImV4cCI6MjA3NDQwOTg2NH0.dX7gwwqk5gVY6NJWec8Gr2CfbxyxJhp0gkx6-SWl7oQ'

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test basic connection
    const { error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('⚠️  Auth check:', error.message)
    } else {
      console.log('✅ Supabase connection successful!')
    }
    
    // Try to check if any tables exist
    try {
      const { error: orgError } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)
      
      if (orgError) {
        console.log('❌ Organizations table does not exist yet:', orgError.message)
        console.log('📋 You need to apply the database schema manually.')
        console.log('🔗 Go to: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new')
        console.log('📄 Copy the content from: supabase/migrations/001_initial_schema.sql')
        console.log('▶️  Run the SQL to create all tables')
      } else {
        console.log('✅ Database tables already exist!')
      }
    } catch (err) {
      console.log('❌ Table check failed:', err.message)
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
  }
}

testConnection()
