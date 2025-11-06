'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleSignInButton } from './google-signin-button'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
    } catch (err) {
      setError('An unexpected error occurred')
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
          Back to homepage
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
          <span className='bg-white px-2 text-gray-500'>Or continue with email</span>
        </div>
      </div>

      <form className='space-y-6' onSubmit={handleSubmit}>
        <input type='hidden' name='remember' value='true' />
        <div className='-space-y-px rounded-md shadow-sm'>
          <div>
            <label htmlFor='email-address' className='sr-only'>
              Email address
            </label>
            <input
              id='email-address'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder='Email address'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor='password' className='sr-only'>
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              autoComplete='current-password'
              required
              className='relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
              placeholder='Password'
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className='rounded-md bg-red-50 p-4'>
            <div className='flex'>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>Authentication Error</h3>
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
              Remember me
            </label>
          </div>

          <div className='text-sm'>
            <Link
              href='/auth/forgot-password'
              className='font-medium text-green-600 hover:text-green-500'
            >
              Forgot your password?
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
              'Sign in'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
