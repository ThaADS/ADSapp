'use client'

/**
 * MFA Verification Component
 *
 * Used during login flow to verify MFA token
 * Supports both TOTP codes and backup codes
 */

import { useState } from 'react'

interface MFAVerificationProps {
  userId: string
  onSuccess: () => void
  onCancel?: () => void
}

export default function MFAVerification({ userId, onSuccess, onCancel }: MFAVerificationProps) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter a verification code')
      return
    }

    // Validate format
    if (useBackupCode) {
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token.toUpperCase())) {
        setError('Backup code format: XXXX-XXXX')
        return
      }
    } else {
      if (!/^\d{6}$/.test(token)) {
        setError('Verification code must be 6 digits')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: useBackupCode ? token.toUpperCase() : token,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      // Success!
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify()
    }
  }

  return (
    <div className='mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-md'>
      <div className='mb-6'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100'>
          <svg
            className='h-6 w-6 text-blue-600'
            fill='none'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
          </svg>
        </div>
        <h2 className='mb-2 text-center text-2xl font-bold'>Two-Factor Authentication</h2>
        <p className='text-center text-sm text-gray-600'>
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the code from your authenticator app'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </div>
      )}

      <div className='space-y-4'>
        {/* Token input */}
        <div>
          <label htmlFor='token' className='mb-2 block text-sm font-medium text-gray-700'>
            {useBackupCode ? 'Backup Code' : 'Verification Code'}
          </label>
          <input
            id='token'
            type='text'
            inputMode={useBackupCode ? 'text' : 'numeric'}
            maxLength={useBackupCode ? 9 : 6}
            value={token}
            onChange={e => {
              const value = useBackupCode
                ? e.target.value.toUpperCase()
                : e.target.value.replace(/\D/g, '')
              setToken(value)
              setError(null)
            }}
            onKeyPress={handleKeyPress}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
            className='w-full rounded-md border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-widest focus:border-transparent focus:ring-2 focus:ring-blue-500'
            autoComplete='off'
            autoFocus
            disabled={loading}
          />
          <p className='mt-2 text-xs text-gray-500'>
            {useBackupCode
              ? 'Each backup code can only be used once'
              : 'The code changes every 30 seconds'}
          </p>
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || !token}
          className='w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        {/* Toggle backup code mode */}
        <button
          onClick={() => {
            setUseBackupCode(!useBackupCode)
            setToken('')
            setError(null)
          }}
          disabled={loading}
          className='w-full text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50'
        >
          {useBackupCode ? 'Use authenticator app code' : 'Use backup code instead'}
        </button>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className='w-full text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50'
          >
            Cancel and sign out
          </button>
        )}
      </div>

      {/* Help text */}
      <div className='mt-6 border-t border-gray-200 pt-6'>
        <details className='text-sm'>
          <summary className='cursor-pointer font-medium text-gray-600 hover:text-gray-800'>
            Having trouble?
          </summary>
          <div className='mt-3 space-y-2 text-gray-600'>
            <p>• Make sure your device time is synchronized</p>
            <p>• Try entering the current code from your authenticator app</p>
            <p>• If you've lost access to your app, use a backup code</p>
            <p>• Contact support if you've lost both your app and backup codes</p>
          </div>
        </details>
      </div>
    </div>
  )
}
