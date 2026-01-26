'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleSignInButton } from './google-signin-button'
import { useTranslations } from '@/components/providers/translation-provider'

export function SignUpForm() {
  const t = useTranslations('auth')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    organizationName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Use our API route instead of direct Supabase call
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          organizationName: formData.organizationName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || t('registrationFailed'))
        return
      }

      if (result.user) {
        // Registration successful
        if (result.confirmationRequired) {
          setError(t('checkEmailConfirm'))
        } else {
          // Redirect to onboarding (not dashboard, as user has no organization yet)
          router.push(result.redirectTo || '/onboarding')
          router.refresh()
        }
      }
    } catch (err) {
      setError(t('registrationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className='mt-8 space-y-6'>
      <div className='mb-4'>
        <Link
          href='/'
          className='inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900'
        >
          <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 19l-7-7m0 0l7-7m-7 7h18'
            />
          </svg>
          {t('backToHomepage')}
        </Link>
      </div>

      {/* Google Sign-In Button */}
      <div>
        <GoogleSignInButton />
      </div>

      {/* Divider */}
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='bg-white px-2 text-gray-500'>{t('orCreateAccountWithEmail')}</span>
        </div>
      </div>

      <form className='space-y-6' onSubmit={handleSubmit}>
        <div className='space-y-4 rounded-md shadow-sm'>
          <div>
            <label htmlFor='full-name' className='sr-only'>
              {t('fullName')}
            </label>
            <input
              id='full-name'
              name='fullName'
              type='text'
              required
              className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('fullName')}
              value={formData.fullName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor='email-address' className='sr-only'>
              {t('email')}
            </label>
            <input
              id='email-address'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('email')}
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor='password' className='sr-only'>
              {t('password')}
            </label>
            <input
              id='password'
              name='password'
              type='password'
              autoComplete='new-password'
              required
              minLength={6}
              className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('passwordMinLength')}
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor='organization-name' className='sr-only'>
              {t('organizationName')}
            </label>
            <input
              id='organization-name'
              name='organizationName'
              type='text'
              required
              className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('organizationName')}
              value={formData.organizationName}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {error && (
          <div className='rounded-md bg-red-50 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>{t('registrationError')}</h3>
                <div className='mt-2 text-sm text-red-700'>{error}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type='submit'
            disabled={isLoading}
            className='group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isLoading ? (
              <div className='h-4 w-4 animate-spin rounded-full border-b-2 border-white'></div>
            ) : (
              t('createAccount')
            )}
          </button>
        </div>

        <div className='text-center text-xs text-gray-600'>
          {t('agreementText')}{' '}
          <a href='#' className='text-green-600 hover:text-green-500'>
            {t('termsOfService')}
          </a>{' '}
          {t('and')}{' '}
          <a href='#' className='text-green-600 hover:text-green-500'>
            {t('privacyPolicy')}
          </a>
        </div>
      </form>
    </div>
  )
}
