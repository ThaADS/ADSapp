import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Supabase configuratie
const supabaseUrl = 'https://egaiyydjgeqlhthxmvbn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE'

async function setupDatabase() {
  console.log('🚀 Database setup starten...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Lees het schema bestand
    console.log('📄 Schema bestand laden...')
    const schemaPath = path.join(__dirname, 'supabase-clean-schema.sql')
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('🔄 Database schema toepassen via Supabase RPC...')
    
    // Split het schema in kleinere delen voor RPC calls
    const sqlStatements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 ${sqlStatements.length} SQL statements gevonden`)
    
    // Voer elke statement uit via RPC
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i] + ';'
      
      if (statement.includes('CREATE') || statement.includes('INSERT') || statement.includes('ALTER')) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error && !error.message.includes('already exists')) {
            console.log(`⚠️ Statement ${i + 1}: ${error.message}`)
          } else {
            console.log(`✅ Statement ${i + 1} uitgevoerd`)
          }
        } catch (err) {
          console.log(`⚠️ Statement ${i + 1}: ${err.message}`)
        }
      }
    }
    
    console.log('🎉 Schema setup compleet!')
    
    // Test of organisaties tabel werkt
    console.log('🏢 Test organisatie aanmaken...')
    const { error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          id: 'a0000000-0000-0000-0000-000000000001',
          name: 'ADSapp Test Organization',
          slug: 'adsapp-test',
          subscription_status: 'active',
          subscription_tier: 'professional'
        }
      ])
    
    if (orgError && !orgError.message.includes('duplicate')) {
      console.log('❌ Organisatie fout:', orgError.message)
      console.log('💡 Ga handmatig naar Supabase Dashboard en voer schema uit')
      console.log('🔗 https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new')
    } else {
      console.log('✅ Test organisatie aangemaakt!')
      console.log('🎉 Database is klaar voor gebruik!')
    }
    
  } catch (error) {
    console.error('❌ Setup fout:', error.message)
    console.log('💡 Probeer handmatige setup via Supabase Dashboard')
  }
}

// Voer setup uit
setupDatabase()
