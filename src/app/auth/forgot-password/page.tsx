import { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { getTranslations } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Reset Password - ADSapp',
  description: 'Reset your password for ADSapp',
}

export default async function ForgotPasswordPage() {
  const { t } = await getTranslations('auth')

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <div className='mx-auto flex h-12 w-auto items-center justify-center'>
            <div className='text-2xl font-bold text-green-600'>ADSapp</div>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            {t('forgotPassword')}
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            {t('alreadyHaveAccount')}{' '}
            <Link href='/auth/signin' className='font-medium text-green-600 hover:text-green-500'>
              {t('signin')}
            </Link>
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

