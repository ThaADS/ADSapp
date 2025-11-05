const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanup() {
  console.log('🧹 Cleaning up test data...')

  // Delete organization with subdomain "ads-web-services"
  const { data: org, error: findError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'ads-web-services')
    .maybeSingle()

  if (findError) {
    console.error('Error finding organization:', findError)
    return
  }

  if (org) {
    console.log(`Found organization: ${org.name} (${org.id})`)

    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', org.id)

    if (deleteError) {
      console.error('Error deleting organization:', deleteError)
    } else {
      console.log('✅ Successfully deleted organization')
    }
  } else {
    console.log('ℹ️ No organization found with subdomain "ads-web-services"')
  }

  console.log('\n📝 Database is clean and ready for testing')
}

cleanup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cleanup failed:', err)
    process.exit(1)
  })
