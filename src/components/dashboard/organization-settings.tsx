'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOfficeIcon,
  GlobeAltIcon,
  ClockIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface Profile {
  id: string
  organization_id: string | null
  role: 'owner' | 'admin' | 'agent' | 'super_admin'
  organization?: {
    id: string
    name: string
    slug: string
    timezone: string | null
    locale: string | null
  } | null
}

interface OrganizationSettingsProps {
  profile: Profile
}

interface OrganizationFormData {
  name: string
  slug: string
  timezone: string
  locale: string
  primaryColor: string
  secondaryColor: string
}

interface BusinessHours {
  [key: string]: {
    enabled: boolean
    start: string
    end: string
  }
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
]

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

function OrganizationSettingsComponent({ profile }: OrganizationSettingsProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: profile.organization?.name || '',
    slug: profile.organization?.slug || '',
    timezone: profile.organization?.timezone || 'America/New_York',
    locale: profile.organization?.locale || 'en',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
  })

  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  })

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      if (!slug || slug === profile.organization?.slug) {
        setSlugAvailable(null)
        return
      }

      setCheckingSlug(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', slug)
          .single()

        setSlugAvailable(!data && !error)
      } catch {
        setSlugAvailable(null)
      } finally {
        setCheckingSlug(false)
      }
    },
    [profile.organization?.slug]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        checkSlugAvailability(formData.slug)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.slug, checkSlugAvailability])

  // Load business hours on mount
  useEffect(() => {
    const loadBusinessHours = async () => {
      try {
        const response = await fetch('/api/organizations/business-hours')
        if (response.ok) {
          const data = await response.json()
          if (data.business_hours) {
            setBusinessHours(data.business_hours)
          }
        }
      } catch (error) {
        console.error('Failed to load business hours:', error)
      }
    }

    loadBusinessHours()
  }, [])

  // Load logo URL on mount
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const supabase = createClient()
        const { data: org, error } = await supabase
          .from('organizations')
          .select('logo_url')
          .eq('id', profile.organization_id)
          .single()

        if (!error && org?.logo_url) {
          setLogoUrl(org.logo_url)
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
      }
    }

    if (profile.organization_id) {
      loadLogo()
    }
  }, [profile.organization_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          timezone: formData.timezone,
          locale: formData.locale,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.organization_id!)

      if (error) {
        setError(error.message)
      } else {
        setMessage('Organization settings updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleBusinessHoursChange = (
    day: string,
    field: 'enabled' | 'start' | 'end',
    value: boolean | string
  ) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value,
      },
    })
  }

  const saveBusinessHours = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/organizations/business-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_hours: businessHours }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save business hours')
      }

      setMessage('Business hours updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving business hours:', error)
      setError(error instanceof Error ? error.message : 'Failed to save business hours')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, WebP, or SVG.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size: 5MB')
      return
    }

    setUploadingLogo(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/organizations/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo')
      }

      setLogoUrl(data.logo_url)
      setMessage('Logo uploaded successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!confirm('Are you sure you want to delete the organization logo?')) {
      return
    }

    setUploadingLogo(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/organizations/logo', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete logo')
      }

      setLogoUrl(null)
      setMessage('Logo deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting logo:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Basic Information */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='mb-4 flex items-center'>
            <BuildingOfficeIcon className='mr-2 h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>Basic Information</h3>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
                  Organization Name
                </label>
                <input
                  type='text'
                  name='name'
                  id='name'
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  placeholder='Enter organization name'
                />
              </div>

              <div>
                <label htmlFor='slug' className='block text-sm font-medium text-gray-700'>
                  Subdomain
                </label>
                <div className='mt-1 flex rounded-md shadow-sm'>
                  <input
                    type='text'
                    name='slug'
                    id='slug'
                    required
                    value={formData.slug}
                    onChange={handleChange}
                    className='block w-full min-w-0 flex-1 rounded-none rounded-l-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                    placeholder='your-company'
                    pattern='[a-z0-9-]+'
                  />
                  <span className='inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm'>
                    .adsapp.com
                  </span>
                </div>
                {checkingSlug && (
                  <p className='mt-1 text-xs text-gray-500'>Checking availability...</p>
                )}
                {slugAvailable === true && (
                  <p className='mt-1 flex items-center text-xs text-emerald-600'>
                    <CheckCircleIcon className='mr-1 h-4 w-4' />
                    Subdomain available
                  </p>
                )}
                {slugAvailable === false && (
                  <p className='mt-1 flex items-center text-xs text-red-600'>
                    <XCircleIcon className='mr-1 h-4 w-4' />
                    Subdomain not available
                  </p>
                )}
              </div>

              <div>
                <label htmlFor='timezone' className='block text-sm font-medium text-gray-700'>
                  Timezone
                </label>
                <select
                  name='timezone'
                  id='timezone'
                  value={formData.timezone}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor='locale' className='block text-sm font-medium text-gray-700'>
                  Language
                </label>
                <select
                  name='locale'
                  id='locale'
                  value={formData.locale}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
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
                disabled={loading || slugAvailable === false}
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Branding */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='mb-4 flex items-center'>
            <PaintBrushIcon className='mr-2 h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>Branding</h3>
          </div>

          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Organization Logo</label>
              <div className='mt-1 flex items-center space-x-4'>
                <div className='flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-gray-200'>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt='Organization logo'
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <BuildingOfficeIcon className='h-8 w-8 text-gray-400' />
                  )}
                </div>
                <div className='flex space-x-2'>
                  <label className='cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'>
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type='file'
                      accept='image/jpeg,image/jpg,image/png,image/webp,image/svg+xml'
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className='sr-only'
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type='button'
                      onClick={handleLogoDelete}
                      disabled={uploadingLogo}
                      className='rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className='mt-2 text-xs text-gray-500'>
                PNG, JPG, WebP, SVG up to 5MB. Recommended size: 200x200px
              </p>
            </div>

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <label htmlFor='primaryColor' className='block text-sm font-medium text-gray-700'>
                  Primary Color
                </label>
                <div className='mt-1 flex items-center space-x-3'>
                  <input
                    type='color'
                    name='primaryColor'
                    id='primaryColor'
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className='h-10 w-20 cursor-pointer rounded border border-gray-300'
                  />
                  <input
                    type='text'
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className='block flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  />
                </div>
              </div>

              <div>
                <label htmlFor='secondaryColor' className='block text-sm font-medium text-gray-700'>
                  Secondary Color
                </label>
                <div className='mt-1 flex items-center space-x-3'>
                  <input
                    type='color'
                    name='secondaryColor'
                    id='secondaryColor'
                    value={formData.secondaryColor}
                    onChange={handleChange}
                    className='h-10 w-20 cursor-pointer rounded border border-gray-300'
                  />
                  <input
                    type='text'
                    value={formData.secondaryColor}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        secondaryColor: e.target.value,
                      })
                    }
                    className='block flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className='border-t border-gray-200 pt-4'>
              <h4 className='mb-3 text-sm font-medium text-gray-700'>Preview</h4>
              <div className='flex space-x-3'>
                <div
                  className='rounded-md px-4 py-2 text-sm font-medium text-white'
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Primary Button
                </div>
                <div
                  className='rounded-md px-4 py-2 text-sm font-medium text-white'
                  style={{ backgroundColor: formData.secondaryColor }}
                >
                  Secondary Button
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='mb-4 flex items-center'>
            <ClockIcon className='mr-2 h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>Business Hours</h3>
          </div>

          <div className='space-y-3'>
            {DAYS_OF_WEEK.map(day => (
              <div
                key={day}
                className='flex items-center justify-between border-b border-gray-200 py-3 last:border-b-0'
              >
                <div className='flex flex-1 items-center space-x-3'>
                  <input
                    type='checkbox'
                    checked={businessHours[day].enabled}
                    onChange={e => handleBusinessHoursChange(day, 'enabled', e.target.checked)}
                    className='h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500'
                  />
                  <span className='w-24 text-sm font-medium text-gray-700 capitalize'>{day}</span>
                </div>

                {businessHours[day].enabled ? (
                  <div className='flex items-center space-x-2'>
                    <input
                      type='time'
                      value={businessHours[day].start}
                      onChange={e => handleBusinessHoursChange(day, 'start', e.target.value)}
                      className='block rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                    />
                    <span className='text-gray-500'>to</span>
                    <input
                      type='time'
                      value={businessHours[day].end}
                      onChange={e => handleBusinessHoursChange(day, 'end', e.target.value)}
                      className='block rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                    />
                  </div>
                ) : (
                  <span className='text-sm text-gray-500'>Closed</span>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className='mt-6 flex justify-end'>
            <button
              type='button'
              onClick={saveBusinessHours}
              disabled={loading}
              className='rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading ? 'Saving...' : 'Save Business Hours'}
            </button>
          </div>
        </div>
      </div>

      {/* Only Owner Can Edit Notice */}
      {profile.role === 'admin' && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <p className='text-sm text-amber-700'>
            Note: Some settings can only be modified by the organization owner.
          </p>
        </div>
      )}
    </div>
  )
}

export const OrganizationSettings = memo(OrganizationSettingsComponent)
