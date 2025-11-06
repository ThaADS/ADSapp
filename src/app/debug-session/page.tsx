'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchSessionInfo()
  }, [])

  const fetchSessionInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/session')
      const data = await response.json()
      setSessionInfo(data)
    } catch (error) {
      console.error('Failed to fetch session info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearSession = async () => {
    if (!confirm('Are you sure you want to clear all session data? You will be logged out.')) {
      return
    }

    setClearing(true)
    try {
      const response = await fetch('/api/auth/clear-session', {
        method: 'POST',
      })

      if (response.ok) {
        // Also clear localStorage
        localStorage.clear()
        sessionStorage.clear()

        alert('Session cleared successfully! Redirecting to signin...')
        router.push('/auth/signin')
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Failed to clear session: ${error.error}`)
      }
    } catch (error) {
      console.error('Clear session error:', error)
      alert('Failed to clear session')
    } finally {
      setClearing(false)
    }
  }

  const handleClearBrowserData = () => {
    if (!confirm('This will clear all localStorage and sessionStorage. Continue?')) {
      return
    }

    localStorage.clear()
    sessionStorage.clear()
    alert('Browser storage cleared! Please refresh the page.')
    window.location.reload()
  }

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600'></div>
          <p className='mt-4 text-gray-600'>Loading session info...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-4xl'>
        <div className='rounded-lg bg-white p-6 shadow'>
          <h1 className='mb-6 text-2xl font-bold text-gray-900'>Session Debug Info</h1>

          {/* Session Info */}
          <div className='space-y-6'>
            <div>
              <h2 className='mb-3 text-lg font-semibold text-gray-900'>Current Session</h2>
              {sessionInfo?.session ? (
                <div className='space-y-2 rounded-lg border border-green-200 bg-green-50 p-4'>
                  <p>
                    <strong>User ID:</strong>{' '}
                    <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                      {sessionInfo.session.user_id}
                    </code>
                  </p>
                  <p>
                    <strong>Email:</strong> {sessionInfo.session.user_email}
                  </p>
                  <p>
                    <strong>Expires:</strong>{' '}
                    {new Date(sessionInfo.session.expires_at * 1000).toLocaleString()}
                  </p>
                  <p>
                    <strong>Token Preview:</strong>{' '}
                    <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                      {sessionInfo.session.access_token_preview}
                    </code>
                  </p>
                </div>
              ) : (
                <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
                  <p className='text-yellow-800'>No active session found</p>
                </div>
              )}
            </div>

            {/* User Info */}
            <div>
              <h2 className='mb-3 text-lg font-semibold text-gray-900'>User Info</h2>
              {sessionInfo?.user ? (
                <div className='space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4'>
                  <p>
                    <strong>User ID:</strong>{' '}
                    <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                      {sessionInfo.user.id}
                    </code>
                  </p>
                  <p>
                    <strong>Email:</strong> {sessionInfo.user.email}
                  </p>
                  <p>
                    <strong>Created:</strong>{' '}
                    {new Date(sessionInfo.user.created_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <p className='text-gray-600'>No user data</p>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div>
              <h2 className='mb-3 text-lg font-semibold text-gray-900'>Profile Info</h2>
              {sessionInfo?.profile ? (
                <div
                  className={`space-y-2 rounded-lg border p-4 ${
                    sessionInfo.profile.email === 'admin@demo-company.com'
                      ? 'border-red-300 bg-red-50'
                      : 'border-purple-200 bg-purple-50'
                  }`}
                >
                  <p>
                    <strong>Profile ID:</strong>{' '}
                    <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                      {sessionInfo.profile.id}
                    </code>
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    <span
                      className={
                        sessionInfo.profile.email === 'admin@demo-company.com'
                          ? 'font-bold text-red-700'
                          : ''
                      }
                    >
                      {sessionInfo.profile.email}
                    </span>
                  </p>
                  <p>
                    <strong>Full Name:</strong> {sessionInfo.profile.full_name || 'N/A'}
                  </p>
                  <p>
                    <strong>Role:</strong> {sessionInfo.profile.role}
                  </p>
                  <p>
                    <strong>Organization ID:</strong>{' '}
                    <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                      {sessionInfo.profile.organization_id || 'None'}
                    </code>
                  </p>
                  <p>
                    <strong>Super Admin:</strong>{' '}
                    {sessionInfo.profile.is_super_admin ? 'Yes' : 'No'}
                  </p>

                  {sessionInfo.profile.email === 'admin@demo-company.com' && (
                    <div className='mt-4 rounded border border-red-300 bg-red-100 p-3'>
                      <p className='font-bold text-red-800'>
                        ⚠️ WARNING: You are logged in as DEMO ADMIN!
                      </p>
                      <p className='mt-1 text-sm text-red-700'>
                        This is not your account. Clear session to fix.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <p className='text-gray-600'>No profile data</p>
                </div>
              )}
            </div>

            {/* Cookies Info */}
            <div>
              <h2 className='mb-3 text-lg font-semibold text-gray-900'>Browser Cookies</h2>
              {sessionInfo?.debug?.cookies && sessionInfo.debug.cookies.length > 0 ? (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <div className='max-h-60 space-y-1 overflow-y-auto'>
                    {sessionInfo.debug.cookies.map((cookie: any, index: number) => (
                      <div key={index} className='text-sm'>
                        <code className='rounded bg-white px-2 py-1'>{cookie.name}</code>:{' '}
                        {cookie.value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <p className='text-gray-600'>No cookies found</p>
                </div>
              )}
            </div>

            {/* Errors */}
            {(sessionInfo?.errors?.sessionError || sessionInfo?.errors?.userError) && (
              <div>
                <h2 className='mb-3 text-lg font-semibold text-gray-900'>Errors</h2>
                <div className='space-y-2 rounded-lg border border-red-200 bg-red-50 p-4'>
                  {sessionInfo.errors.sessionError && (
                    <p>
                      <strong>Session Error:</strong> {sessionInfo.errors.sessionError}
                    </p>
                  )}
                  {sessionInfo.errors.userError && (
                    <p>
                      <strong>User Error:</strong> {sessionInfo.errors.userError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
            <button
              onClick={handleClearSession}
              disabled={clearing}
              className='flex-1 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {clearing ? 'Clearing...' : 'Clear Session & Logout'}
            </button>

            <button
              onClick={handleClearBrowserData}
              className='flex-1 rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-700'
            >
              Clear Browser Storage
            </button>

            <button
              onClick={fetchSessionInfo}
              className='flex-1 rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700'
            >
              Refresh Info
            </button>
          </div>

          {/* Instructions */}
          <div className='mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4'>
            <h3 className='mb-2 font-semibold text-blue-900'>How to Fix Demo Admin Issue:</h3>
            <ol className='list-inside list-decimal space-y-1 text-sm text-blue-800'>
              <li>Click "Clear Session & Logout" button above</li>
              <li>If that doesn't work, also click "Clear Browser Storage"</li>
              <li>Go to /auth/signin and sign in with YOUR email</li>
              <li>You should now be logged in as yourself, not demo admin</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
