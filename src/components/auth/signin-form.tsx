'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleSignInButton } from './google-signin-button'
import { useTranslations } from '@/components/providers/translation-provider'

export function SignInForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDemoLogin = async (role: 'owner' | 'admin' | 'agent') => {
    setIsLoading(true)
    setError(null)

    const demoAccounts = {
      owner: { email: 'owner@demo-company.com', password: 'Demo2024!Owner' },
      admin: { email: 'admin@demo-company.com', password: 'Demo2024!Admin' },
      agent: { email: 'agent@demo-company.com', password: 'Demo2024!Agent' },
    }

    const credentials = demoAccounts[role]
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials)

      if (error) {
        setError(`${t('demo.loginFailed')}: ${error.message}`)
      } else if (data.user) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError(t('unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Fetch user profile to determine redirect path
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin, organization_id')
          .eq('id', data.user.id)
          .single()

        // Redirect based on user role
        if (profile?.is_super_admin) {
          router.push('/admin')
        } else if (profile?.organization_id) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
        router.refresh()
      }
    } catch {
      setError(t('unexpectedError'))
    } finally {
      setIsLoading(false)
    }
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

      <div>
        <GoogleSignInButton />
      </div>

      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='bg-white px-2 text-gray-500'>{t('orContinueWithEmail')}</span>
        </div>
      </div>

      <form className='space-y-6' onSubmit={handleSubmit}>
        <input type='hidden' name='remember' value='true' />
        <div className='-space-y-px rounded-md shadow-sm'>
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
              className='relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              autoComplete='current-password'
              required
              className='relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder={t('password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className='rounded-md bg-red-50 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>{t('authenticationError')}</h3>
                <div className='mt-2 text-sm text-red-700'>{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <input
              id='remember-me'
              name='remember-me'
              type='checkbox'
              className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
            />
            <label htmlFor='remember-me' className='ml-2 block text-sm text-gray-900'>
              {t('rememberMe')}
            </label>
          </div>

          <div className='text-sm'>
            <Link
              href='/auth/forgot-password'
              className='font-medium text-green-600 hover:text-green-500'
            >
              {t('forgotPassword')}
            </Link>
          </div>
        </div>

        <div>
          <button
            type='submit'
            disabled={isLoading}
            className='group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isLoading ? (
              <div className='h-4 w-4 animate-spin rounded-full border-b-2 border-white'></div>
            ) : (
              t('signin')
            )}
          </button>
        </div>
      </form>

      {/* Demo Account Access */}
      <div className='mt-6'>
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-300' />
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='bg-white px-2 text-gray-500'>{t('demo.title')}</span>
          </div>
        </div>

        <div className='mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4'>
          <div className='mb-3 flex items-start'>
            <svg
              className='mr-2 h-5 w-5 flex-shrink-0 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <div className='text-sm text-blue-800'>
              <p className='font-medium'>{t('demo.explore')}</p>
              <p className='mt-1 text-blue-700'>
                {t('demo.fullAccess')}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
            <button
              type='button'
              onClick={() => handleDemoLogin('owner')}
              disabled={isLoading}
              className='flex items-center justify-center rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                />
              </svg>
              {t('demo.owner')}
            </button>

            <button
              type='button'
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
              className='flex items-center justify-center rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
              </svg>
              {t('demo.admin')}
            </button>

            <button
              type='button'
              onClick={() => handleDemoLogin('agent')}
              disabled={isLoading}
              className='flex items-center justify-center rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            >
              <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                />
              </svg>
              {t('demo.agent')}
            </button>
          </div>

          <p className='mt-3 text-xs text-blue-600'>
            💡 {t('demo.rolesHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
