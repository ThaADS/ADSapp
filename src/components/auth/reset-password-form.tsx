'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/components/providers/translation-provider'

export function ResetPasswordForm() {
  const t = useTranslations('auth')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('passwordMin6Chars'))
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/auth/signin?message=Password updated successfully')
      }
    } catch (err) {
      setError(t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
      <div className='space-y-4'>
        <div>
          <label htmlFor='password' className='sr-only'>
            {t('newPassword')}
          </label>
          <input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            required
            className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
            placeholder={t('newPasswordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor='confirmPassword' className='sr-only'>
            {t('confirmPassword')}
          </label>
          <input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            required
            className='relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:ring-green-500 focus:outline-none sm:text-sm'
            placeholder={t('confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className='rounded-md bg-red-50 p-4'>
          <div className='text-sm text-red-700'>{error}</div>
        </div>
      )}

      <div>
        <button
          type='submit'
          disabled={loading}
          className='group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
        >
          {loading ? t('updating') : t('updatePassword')}
        </button>
      </div>
    </form>
  )
}
