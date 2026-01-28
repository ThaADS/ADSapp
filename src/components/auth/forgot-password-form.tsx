'use client'

import { useState } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Use API route for localized password reset emails
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('unexpectedError'))
      } else {
        setMessage(t('checkEmailReset'))
      }
    } catch (err) {
      setError(t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
      <div>
        <label htmlFor='email' className='sr-only'>
          {t('email')}
        </label>
        <input
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          required
          className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
          placeholder={t('email')}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      {error && (
        <div className='rounded-md bg-red-50 p-4'>
          <div className='text-sm text-red-700'>{error}</div>
        </div>
      )}

      {message && (
        <div className='rounded-md bg-green-50 p-4'>
          <div className='text-sm text-green-700'>{message}</div>
        </div>
      )}

      <div>
        <button
          type='submit'
          disabled={loading}
          className='group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
        >
          {loading ? t('sending') : t('sendResetLink')}
        </button>
      </div>
    </form>
  )
}
