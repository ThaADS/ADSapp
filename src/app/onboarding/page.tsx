/**
 * Onboarding Page
 */

import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'

export default async function OnboardingPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Check if user already has an organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  // If user is super admin, redirect to admin dashboard
  if (profile?.is_super_admin) {
    redirect('/admin')
  }

  // If user already has organization, redirect to dashboard
  if (profile?.organization_id) {
    redirect('/dashboard')
  }

  return (
    <div className='flex min-h-screen flex-col justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-3xl'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 shadow-lg'>
          <svg
            className='h-8 w-8 text-white'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='1.5'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z'
            />
          </svg>
        </div>
        <h2 className='mt-6 text-center text-4xl font-extrabold text-gray-900'>
          Welcome to ADSapp
        </h2>
        <p className='mt-3 text-center text-lg text-gray-600'>
          Let's set up your WhatsApp Business Inbox in just a few steps
        </p>
      </div>

      <div className='mt-10 px-4 sm:mx-auto sm:w-full sm:max-w-3xl'>
        <OnboardingForm userEmail={user.email || ''} />
      </div>
    </div>
  )
}
