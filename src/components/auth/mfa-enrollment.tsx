'use client'

/**
 * MFA Enrollment Component
 *
 * 3-step wizard for MFA enrollment:
 * 1. Generate QR code and backup codes
 * 2. Scan QR code with authenticator app
 * 3. Verify TOTP token to complete enrollment
 */

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from '@/components/providers/translation-provider'

interface MFAEnrollmentProps {
  onComplete?: () => void
  onCancel?: () => void
}

interface EnrollmentData {
  qrCode: string
  backupCodes: string[]
}

export default function MFAEnrollment({ onComplete, onCancel }: MFAEnrollmentProps) {
  const t = useTranslations('auth')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null)
  const [verificationToken, setVerificationToken] = useState('')
  const [backupCodesSaved, setBackupCodesSaved] = useState(false)

  // Step 1: Generate QR code and backup codes
  const handleStartEnrollment = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate enrollment data')
      }

      setEnrollmentData(data.data)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: User scans QR code and saves backup codes
  const handleContinueToVerification = () => {
    if (!backupCodesSaved) {
      setError(t('mfa.confirmSavedCodes'))
      return
    }
    setStep(3)
  }

  // Step 3: Verify TOTP token
  const handleVerifyToken = async () => {
    if (!/^\d{6}$/.test(verificationToken)) {
      setError(t('mfa.codeFormat6Digits'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      // Success!
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  // Download backup codes as text file
  const handleDownloadBackupCodes = () => {
    if (!enrollmentData) return

    const content = `ADSapp MFA Backup Codes\n\n${enrollmentData.backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'adsapp-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-md'>
      {/* Progress indicator */}
      <div className='mb-8'>
        <div className='mb-2 flex items-center justify-between'>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              } ${s < 3 ? 'mr-2' : ''}`}
            />
          ))}
        </div>
        <div className='text-center text-sm text-gray-600'>
          {t('mfa.stepOf').replace('{step}', String(step)).replace('{total}', '3')}: {step === 1 ? t('mfa.stepStart') : step === 2 ? t('mfa.stepScanQR') : t('mfa.stepVerify')}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-700'>
          {error}
        </div>
      )}

      {/* Step 1: Introduction */}
      {step === 1 && (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-2xl font-bold'>{t('mfa.enrollTitle')}</h2>
            <p className='text-gray-600'>
              {t('mfa.enrollDescription')}
            </p>
          </div>

          <div className='rounded-md bg-blue-50 p-4'>
            <h3 className='mb-2 font-semibold'>{t('mfa.youllNeed')}</h3>
            <ul className='list-inside list-disc space-y-1 text-sm text-gray-700'>
              <li>{t('mfa.needAuthenticatorApp')}</li>
              <li>{t('mfa.needSecurePlace')}</li>
              <li>{t('mfa.need5Minutes')}</li>
            </ul>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={handleStartEnrollment}
              disabled={loading}
              className='flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading ? t('mfa.generating') : t('mfa.getStarted')}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={loading}
                className='rounded-md border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50'
              >
                {t('mfa.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Scan QR Code */}
      {step === 2 && enrollmentData && (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-2xl font-bold'>{t('mfa.scanQRCodeTitle')}</h2>
            <p className='text-gray-600'>
              {t('mfa.scanQRCodeDescription')}
            </p>
          </div>

          {/* QR Code */}
          <div className='flex justify-center rounded-lg bg-gray-50 p-6'>
            <Image
              src={enrollmentData.qrCode}
              alt={t('mfa.qrCodeAlt')}
              width={256}
              height={256}
              className='border-4 border-white shadow-lg'
            />
          </div>

          {/* Backup Codes */}
          <div className='rounded-md border border-yellow-200 bg-yellow-50 p-4'>
            <h3 className='mb-2 font-semibold text-yellow-900'>⚠️ {t('mfa.saveBackupCodes')}</h3>
            <p className='mb-3 text-sm text-yellow-800'>
              {t('mfa.backupCodesWarning')}
            </p>
            <div className='mb-3 rounded border border-yellow-300 bg-white p-3'>
              <div className='grid grid-cols-2 gap-2 font-mono text-sm'>
                {enrollmentData.backupCodes.map((code, index) => (
                  <div key={index} className='text-gray-700'>
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={handleDownloadBackupCodes}
                className='flex-1 rounded-md bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-200'
              >
                {t('mfa.downloadCodes')}
              </button>
              <label className='flex flex-1 cursor-pointer items-center gap-2 rounded-md bg-yellow-100 px-4 py-2 hover:bg-yellow-200'>
                <input
                  type='checkbox'
                  checked={backupCodesSaved}
                  onChange={e => setBackupCodesSaved(e.target.checked)}
                  className='h-4 w-4'
                />
                <span className='text-sm font-medium text-yellow-900'>{t('mfa.savedCodes')}</span>
              </label>
            </div>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={handleContinueToVerification}
              disabled={loading || !backupCodesSaved}
              className='flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {t('mfa.continueToVerification')}
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className='rounded-md border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50'
            >
              {t('mfa.back')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verify Token */}
      {step === 3 && (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-2xl font-bold'>{t('mfa.verifySetupTitle')}</h2>
            <p className='text-gray-600'>
              {t('mfa.verifySetupDescription')}
            </p>
          </div>

          <div>
            <label htmlFor='token' className='mb-2 block text-sm font-medium text-gray-700'>
              {t('mfa.verificationCode')}
            </label>
            <input
              id='token'
              type='text'
              inputMode='numeric'
              maxLength={6}
              value={verificationToken}
              onChange={e => setVerificationToken(e.target.value.replace(/\D/g, ''))}
              placeholder='000000'
              className='w-full rounded-md border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-widest focus:border-transparent focus:ring-2 focus:ring-blue-500'
              autoComplete='off'
            />
            <p className='mt-2 text-sm text-gray-500'>
              {t('mfa.codeChanges30Sec')}
            </p>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={handleVerifyToken}
              disabled={loading || verificationToken.length !== 6}
              className='flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading ? t('mfa.verifying') : t('mfa.verifyAndEnable')}
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className='rounded-md border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50'
            >
              {t('mfa.back')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
