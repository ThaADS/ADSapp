import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase database connection
// Je moet je database wachtwoord invullen
const client = new Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.egaiyydjgeqlhthxmvbn',
  password: 'YOUR_DATABASE_PASSWORD_HERE', // Vul hier je database wachtwoord in
  ssl: {
    rejectUnauthorized: false
  }
})

async function applySchema() {
  try {
    console.log('🔄 Verbinding maken met Supabase database...')
    await client.connect()
    console.log('✅ Verbonden met database!')

    // Lees het schema bestand
    const schemaPath = path.join(__dirname, 'supabase-clean-schema.sql')
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📄 Schema bestand geladen')
    console.log('🚀 Schema toepassen...')

    // Voer het complete schema uit
    await client.query(schemaSQL)
    
    console.log('✅ Schema succesvol toegepast!')
    
    // Test of tabellen bestaan
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    console.log('📋 Aangemaakte tabellen:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // Maak test organisatie aan
    console.log('🏢 Test organisatie aanmaken...')
    await client.query(`
      INSERT INTO organizations (id, name, slug, subscription_status, subscription_tier) 
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'ADSapp Test Organization', 
        'adsapp-test',
        'active',
        'professional'
      ) ON CONFLICT (id) DO NOTHING
    `)
    
    console.log('✅ Test organisatie aangemaakt!')
    console.log('🎉 Database setup compleet!')
    console.log('')
    console.log('👉 Ga nu naar: http://localhost:3001/admin-setup')
    console.log('👉 Om je admin account aan te maken')
    
  } catch (error) {
    console.error('❌ Fout bij database setup:', error.message)
    if (error.message.includes('password')) {
      console.log('')
      console.log('💡 Tip: Vul je database wachtwoord in op regel 10 van dit bestand')
      console.log('🔑 Je kunt je wachtwoord vinden in Supabase Dashboard > Settings > Database')
    }
  } finally {
    await client.end()
  }
}

applySchema()
