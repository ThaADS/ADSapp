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
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-4xl'>
        <h1 className='mb-6 text-2xl font-bold'>Debug Profile Information</h1>

        <div className='mb-6 rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>User Information</h2>
          <pre className='overflow-auto rounded bg-gray-100 p-4 text-sm'>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className='mb-6 rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>Profile Information</h2>
          {error && (
            <div className='mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700'>
              <strong>Error:</strong> {error.message}
            </div>
          )}
          <pre className='overflow-auto rounded bg-gray-100 p-4 text-sm'>
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div className='rounded-lg bg-white p-6 shadow'>
          <h2 className='mb-4 text-lg font-semibold'>Key Checks</h2>
          <ul className='space-y-2'>
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
