import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function DebugProfilePage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get profile data
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Profile Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">User Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error.message}
            </div>
          )}
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Key Checks</h2>
          <ul className="space-y-2">
            <li>
              <strong>User ID:</strong> {user.id}
            </li>
            <li>
              <strong>User Email:</strong> {user.email}
            </li>
            <li>
              <strong>Profile exists:</strong> {profile ? 'Yes' : 'No'}
            </li>
            <li>
              <strong>is_super_admin:</strong> {profile?.is_super_admin ? 'true' : 'false'}
            </li>
            <li>
              <strong>organization_id:</strong> {profile?.organization_id || 'null'}
            </li>
            <li>
              <strong>Role:</strong> {profile?.role || 'undefined'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
