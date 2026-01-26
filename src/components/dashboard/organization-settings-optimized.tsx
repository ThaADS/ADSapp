'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOfficeIcon,
  GlobeAltIcon,
  ClockIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/components/providers/translation-provider'

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
    open: string
    close: string
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  Monday: { enabled: true, open: '09:00', close: '17:00' },
  Tuesday: { enabled: true, open: '09:00', close: '17:00' },
  Wednesday: { enabled: true, open: '09:00', close: '17:00' },
  Thursday: { enabled: true, open: '09:00', close: '17:00' },
  Friday: { enabled: true, open: '09:00', close: '17:00' },
  Saturday: { enabled: false, open: '09:00', close: '17:00' },
  Sunday: { enabled: false, open: '09:00', close: '17:00' },
}

export function OrganizationSettings({ profile }: OrganizationSettingsProps) {
  const t = useTranslations('settings')
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: profile.organization?.name || '',
    slug: profile.organization?.slug || '',
    timezone: profile.organization?.timezone || 'America/New_York',
    locale: profile.organization?.locale || 'en',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
  })

  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Optimized slug availability check with longer debounce
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

  // Increased debounce to 1000ms for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        checkSlugAvailability(formData.slug)
      }
    }, 1000) // Increased from 500ms

    return () => clearTimeout(timer)
  }, [formData.slug, checkSlugAvailability])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
          setMessage(t('organization.updateSuccess'))
          setTimeout(() => setMessage(''), 3000)
        }
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    },
    [formData, profile.organization_id]
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }, [])

  const handleBusinessHoursChange = useCallback(
    (day: string, field: 'enabled' | 'open' | 'close', value: boolean | string) => {
      setBusinessHours(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value,
        },
      }))
    },
    []
  )

  // Memoize color preview buttons to prevent re-renders
  const colorPreview = useMemo(
    () => (
      <div className='flex space-x-3'>
        <div
          className='rounded-md px-4 py-2 text-sm font-medium text-white'
          style={{ backgroundColor: formData.primaryColor }}
        >
          {t('organization.primaryButton') || 'Primary Button'}
        </div>
        <div
          className='rounded-md px-4 py-2 text-sm font-medium text-white'
          style={{ backgroundColor: formData.secondaryColor }}
        >
          {t('organization.secondaryButton') || 'Secondary Button'}
        </div>
      </div>
    ),
    [formData.primaryColor, formData.secondaryColor]
  )

  return (
    <div className='space-y-6'>
      {/* Basic Information */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='mb-4 flex items-center'>
            <BuildingOfficeIcon className='mr-2 h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>{t('organization.basicInfo')}</h3>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
                  {t('organization.name')}
                </label>
                <input
                  type='text'
                  name='name'
                  id='name'
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  placeholder={t('organization.enterName')}
                />
              </div>

              <div>
                <label htmlFor='slug' className='block text-sm font-medium text-gray-700'>
                  {t('organization.subdomain')}
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
                  <p className='mt-1 text-xs text-gray-500'>{t('organization.checkAvailability')}</p>
                )}
                {slugAvailable === true && (
                  <p className='mt-1 flex items-center text-xs text-emerald-600'>
                    <CheckCircleIcon className='mr-1 h-4 w-4' />
                    {t('organization.available')}
                  </p>
                )}
                {slugAvailable === false && (
                  <p className='mt-1 flex items-center text-xs text-red-600'>
                    <XCircleIcon className='mr-1 h-4 w-4' />
                    {t('organization.unavailable')}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor='timezone' className='block text-sm font-medium text-gray-700'>
                  {t('organization.timezone')}
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
                  {t('organization.language')}
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
                {loading ? t('saving') : t('saveChanges')}
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
            <h3 className='text-lg font-semibold text-gray-900'>{t('organization.branding.title')}</h3>
          </div>

          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700'>{t('organization.branding.logo')}</label>
              <div className='mt-1 flex items-center space-x-4'>
                <div className='flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200'>
                  <BuildingOfficeIcon className='h-8 w-8 text-gray-400' />
                </div>
                <button
                  type='button'
                  className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
                >
                  {t('organization.branding.uploadLogo')}
                </button>
              </div>
              <p className='mt-2 text-xs text-gray-500'>
                {t('organization.branding.logoHelp')}
              </p>
            </div>

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <label htmlFor='primaryColor' className='block text-sm font-medium text-gray-700'>
                  {t('organization.branding.primaryColor')}
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
                    onChange={e => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className='block flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  />
                </div>
              </div>

              <div>
                <label htmlFor='secondaryColor' className='block text-sm font-medium text-gray-700'>
                  {t('organization.branding.secondaryColor')}
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
                      setFormData(prev => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    className='block flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className='border-t border-gray-200 pt-4'>
              <h4 className='mb-3 text-sm font-medium text-gray-700'>{t('organization.preview')}</h4>
              {colorPreview}
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='mb-4 flex items-center'>
            <ClockIcon className='mr-2 h-6 w-6 text-emerald-600' />
            <h3 className='text-lg font-semibold text-gray-900'>{t('organization.businessHours')}</h3>
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
                  <span className='w-24 text-sm font-medium text-gray-700'>{t(`organization.days.${day}`)}</span>
                </div>

                {businessHours[day].enabled ? (
                  <div className='flex items-center space-x-2'>
                    <input
                      type='time'
                      value={businessHours[day].open}
                      onChange={e => handleBusinessHoursChange(day, 'open', e.target.value)}
                      className='block rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                    />
                    <span className='text-gray-500'>{t('organization.to')}</span>
                    <input
                      type='time'
                      value={businessHours[day].close}
                      onChange={e => handleBusinessHoursChange(day, 'close', e.target.value)}
                      className='block rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                    />
                  </div>
                ) : (
                  <span className='text-sm text-gray-500'>{t('organization.closed')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Only Owner Can Edit Notice */}
      {profile.role === 'admin' && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <p className='text-sm text-amber-700'>
            {t('organization.ownerOnly')}
          </p>
        </div>
      )}
    </div>
  )
}
