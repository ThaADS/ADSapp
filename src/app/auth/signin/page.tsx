import { Metadata } from 'next'
import Link from 'next/link'
import { SignInForm } from '@/components/auth/signin-form'
import { getTranslations } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Sign In - ADSapp',
  description: 'Sign in to your WhatsApp Business Inbox',
}

export default async function SignInPage() {
  const { t } = await getTranslations('auth')

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <div className='mx-auto flex h-12 w-auto items-center justify-center'>
            <div className='text-2xl font-bold text-green-600'>ADSapp</div>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            {t('welcomeBack')}
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            {t('dontHaveAccount')}{' '}
            <Link href='/auth/signup' className='font-medium text-green-600 hover:text-green-500'>
              {t('signup')}
            </Link>
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}

