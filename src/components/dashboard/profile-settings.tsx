'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline'

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

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    </div>
  )
}
