import { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Reset Password - ADSapp',
  description: 'Reset your password for ADSapp',
}

export default function ForgotPasswordPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div>
          <div className='mx-auto flex h-12 w-auto items-center justify-center'>
            <div className='text-2xl font-bold text-green-600'>ADSapp</div>
          </div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Reset your password
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            Remember your password?{' '}
            <Link href='/auth/signin' className='font-medium text-green-600 hover:text-green-500'>
              Sign in
            </Link>
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
