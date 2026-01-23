'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import MFAEnrollment from '@/components/auth/mfa-enrollment'

interface Profile {
  id: string
  email?: string
  full_name?: string
  phone?: string
  avatar_url?: string
  organization?: {
    name: string
    slug: string
  }
}

interface ProfileSettingsProps {
  profile: Profile
}

interface MFAStatus {
  enabled: boolean
  enrolledAt?: string
  backupCodesRemaining?: number
  requiresSetup: boolean
}

interface Session {
  sessionToken: string
  deviceInfo: {
    userAgent: string
    ip: string
    platform: string
  }
  createdAt: string
  lastActivity: string
  expiresAt: string
  isCurrent: boolean
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // MFA State
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [mfaLoading, setMfaLoading] = useState(true)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)
  const [showDisableMfaConfirm, setShowDisableMfaConfirm] = useState(false)
  const [mfaError, setMfaError] = useState('')

  // Session State
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [revokingSession, setRevokingSession] = useState<string | null>(null)

  // Fetch MFA status on mount
  useEffect(() => {
    fetchMfaStatus()
    fetchSessions()
  }, [])

  const fetchMfaStatus = async () => {
    try {
      setMfaLoading(true)
      const response = await fetch('/api/auth/mfa/status')
      const data = await response.json()
      if (response.ok) {
        setMfaStatus(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err)
    } finally {
      setMfaLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const response = await fetch('/api/auth/session/list')
      const data = await response.json()
      if (response.ok) {
        setSessions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setSessionsLoading(false)
    }
  }

  const handleDisableMfa = async () => {
    try {
      setMfaLoading(true)
      setMfaError('')
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA')
      }
      setShowDisableMfaConfirm(false)
      await fetchMfaStatus()
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Failed to disable MFA')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaEnrollmentComplete = async () => {
    setShowMfaEnrollment(false)
    await fetchMfaStatus()
  }

  const handleRevokeSession = async (sessionToken: string) => {
    try {
      setRevokingSession(sessionToken)
      setSessionError('')
      const response = await fetch('/api/auth/session/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke session')
      }
      await fetchSessions()
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to revoke session')
    } finally {
      setRevokingSession(null)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    try {
      setSessionsLoading(true)
      setSessionError('')
      const response = await fetch('/api/auth/session/revoke-all', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke sessions')
      }
      await fetchSessions()
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to revoke sessions')
    } finally {
      setSessionsLoading(false)
    }
  }

  const getDeviceIcon = (platform: string) => {
    const p = platform.toLowerCase()
    if (p.includes('mobile') || p.includes('android') || p.includes('iphone')) {
      return DevicePhoneMobileIcon
    }
    if (p.includes('windows') || p.includes('mac') || p.includes('linux')) {
      return ComputerDesktopIcon
    }
    return GlobeAltIcon
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) {
        setError(error.message)
      } else {
        setMessage('Profile updated successfully!')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className='space-y-6'>
      {/* Profile Overview */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='flex items-center space-x-5'>
            <div className='flex-shrink-0'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gray-300'>
                {profile.avatar_url ? (
                  <img
                    className='h-20 w-20 rounded-full'
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Profile'}
                  />
                ) : (
                  <UserIcon className='h-8 w-8 text-gray-600' />
                )}
              </div>
            </div>
            <div className='min-w-0 flex-1'>
              <h2 className='text-2xl font-bold text-gray-900 sm:truncate'>
                {profile.full_name || 'No name set'}
              </h2>
              <div className='mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6'>
                <div className='mt-2 flex items-center text-sm text-gray-500'>
                  <EnvelopeIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400' />
                  {profile.email}
                </div>
                {profile.organization && (
                  <div className='mt-2 flex items-center text-sm text-gray-500'>
                    <UserIcon className='mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400' />
                    {profile.organization.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Personal Information</h3>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <label htmlFor='full_name' className='block text-sm font-medium text-gray-700'>
                  Full Name
                </label>
                <input
                  type='text'
                  name='full_name'
                  id='full_name'
                  value={formData.full_name}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  placeholder='Enter your full name'
                />
              </div>

              <div>
                <label htmlFor='phone' className='block text-sm font-medium text-gray-700'>
                  Phone Number
                </label>
                <input
                  type='tel'
                  name='phone'
                  id='phone'
                  value={formData.phone}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  placeholder='Enter your phone number'
                />
              </div>

              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
                  Email Address
                </label>
                <input
                  type='email'
                  name='email'
                  id='email'
                  value={profile.email || ''}
                  disabled
                  className='mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 sm:text-sm'
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>
            </div>

            {error && (
              <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
                <div className='text-sm text-red-700'>{error}</div>
              </div>
            )}

            {message && (
              <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
                <div className='text-sm text-emerald-700'>{message}</div>
              </div>
            )}

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={loading}
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Settings */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Security</h3>

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='text-sm font-medium text-gray-900'>Password</h4>
                <p className='text-sm text-gray-500'>Last updated: Never or unknown</p>
              </div>
              <a
                href='/auth/forgot-password'
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
              >
                Change Password
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <ShieldCheckIcon className='h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>Two-Factor Authentication</h3>
          </div>

          {mfaError && (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-4'>
              <div className='text-sm text-red-700'>{mfaError}</div>
            </div>
          )}

          {mfaLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
              <span className='ml-2 text-gray-500'>Loading MFA status...</span>
            </div>
          ) : mfaStatus?.enabled ? (
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full bg-emerald-500'></div>
                <span className='text-sm font-medium text-emerald-700'>MFA is enabled</span>
              </div>

              <div className='rounded-lg bg-gray-50 p-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <p className='text-xs text-gray-500'>Enrolled</p>
                    <p className='text-sm font-medium text-gray-900'>
                      {mfaStatus.enrolledAt
                        ? new Date(mfaStatus.enrolledAt).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500'>Backup Codes Remaining</p>
                    <p className={`text-sm font-medium ${
                      (mfaStatus.backupCodesRemaining || 0) <= 2
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {mfaStatus.backupCodesRemaining ?? 'Unknown'}
                      {(mfaStatus.backupCodesRemaining || 0) <= 2 && (
                        <span className='ml-2 text-xs text-red-600'>(Low - consider regenerating)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between pt-2'>
                <p className='text-sm text-gray-500'>
                  Your account is protected with two-factor authentication.
                </p>
                <button
                  onClick={() => setShowDisableMfaConfirm(true)}
                  className='rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
                >
                  Disable MFA
                </button>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full bg-gray-400'></div>
                <span className='text-sm font-medium text-gray-500'>MFA is not enabled</span>
              </div>

              <div className='rounded-lg bg-amber-50 border border-amber-200 p-4'>
                <p className='text-sm text-amber-800'>
                  Add an extra layer of security to your account by enabling two-factor
                  authentication. You'll need an authenticator app like Google Authenticator or Authy.
                </p>
              </div>

              <div className='flex justify-end'>
                <button
                  onClick={() => setShowMfaEnrollment(true)}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
                >
                  Enable Two-Factor Authentication
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900'>Active Sessions</h3>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllOtherSessions}
                disabled={sessionsLoading}
                className='rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
              >
                Sign Out All Other Sessions
              </button>
            )}
          </div>

          {sessionError && (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-4'>
              <div className='text-sm text-red-700'>{sessionError}</div>
            </div>
          )}

          {sessionsLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
              <span className='ml-2 text-gray-500'>Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className='text-sm text-gray-500 py-4'>No active sessions found.</p>
          ) : (
            <div className='space-y-3'>
              {sessions.map(session => {
                const DeviceIcon = getDeviceIcon(session.deviceInfo.platform)
                return (
                  <div
                    key={session.sessionToken}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      session.isCurrent
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className='flex items-center gap-4'>
                      <DeviceIcon className={`h-8 w-8 ${
                        session.isCurrent ? 'text-emerald-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm font-medium text-gray-900'>
                            {session.deviceInfo.platform || 'Unknown Device'}
                          </p>
                          {session.isCurrent && (
                            <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'>
                              Current Session
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-gray-500 mt-1'>
                          IP: {session.deviceInfo.ip} • Last active: {formatRelativeTime(session.lastActivity)}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.sessionToken)}
                        disabled={revokingSession === session.sessionToken}
                        className='rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-red-600 focus:outline-none disabled:opacity-50'
                        title='Sign out this session'
                      >
                        {revokingSession === session.sessionToken ? (
                          <div className='h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent'></div>
                        ) : (
                          <TrashIcon className='h-5 w-5' />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <p className='mt-4 text-xs text-gray-500'>
            These are devices that are currently signed in to your account.
            Sign out any sessions that you don't recognize.
          </p>
        </div>
      </div>

      {/* MFA Enrollment Modal */}
      {showMfaEnrollment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white'>
            <MFAEnrollment
              onComplete={handleMfaEnrollmentComplete}
              onCancel={() => setShowMfaEnrollment(false)}
            />
          </div>
        </div>
      )}

      {/* Disable MFA Confirmation Modal */}
      {showDisableMfaConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
                <ExclamationTriangleIcon className='h-6 w-6 text-red-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Disable Two-Factor Authentication?</h3>
            </div>

            <p className='text-sm text-gray-600 mb-6'>
              This will remove the extra security from your account. You can re-enable MFA at any time.
            </p>

            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setShowDisableMfaConfirm(false)}
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none'
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={mfaLoading}
                className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
              >
                {mfaLoading ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
