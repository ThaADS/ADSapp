'use client'

import { useState, useEffect } from 'react'
import { BillingDashboard } from '@/components/billing/billing-dashboard'
import { ToastProvider } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { Organization, Profile } from '@/types'

interface BillingPageProps {
  organization?: Organization
  profile?: Profile
}

const DEFAULT_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for small businesses getting started',
    price: 29,
    interval: 'month',
    features: [
      'Up to 3 team members',
      'Up to 500 contacts',
      'Up to 1,000 messages/month',
      'Basic automation',
      'Email support',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'Growing businesses with advanced needs',
    price: 79,
    interval: 'month',
    features: [
      'Up to 10 team members',
      'Up to 5,000 contacts',
      'Up to 10,000 messages/month',
      'Advanced automation',
      'Custom templates',
      'Priority support',
      'Analytics dashboard',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Large organizations with custom requirements',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited team members',
      'Unlimited contacts',
      'Unlimited messages',
      'Custom integrations',
      'Dedicated support',
      'Custom branding',
      'Advanced analytics',
      'SLA guarantees',
    ],
  },
}

export default function BillingPage({
  organization: propOrganization,
  profile: propProfile,
}: BillingPageProps) {
  const [organization, setOrganization] = useState<Organization | null>(propOrganization || null)
  const [profile, setProfile] = useState<Profile | null>(propProfile || null)
  const [usage, setUsage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        // Get current user if not provided via props
        if (!profile) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (userProfile) {
              setProfile(userProfile)
            }
          }
        }

        // Get organization if not provided via props
        if (!organization && (profile?.organization_id || propProfile?.organization_id)) {
          const orgId = profile?.organization_id || propProfile?.organization_id
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single()

          if (org) {
            setOrganization(org)
          }
        }

        // Fetch usage data
        const usageResponse = await fetch('/api/billing/usage')
        if (usageResponse.ok) {
          const { usage: usageData } = await usageResponse.json()
          setUsage(usageData)
        }
      } catch (error) {
        console.error('Error fetching billing data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [organization, profile, propOrganization, propProfile])

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
          <div className='animate-pulse space-y-6'>
            <div className='h-8 w-1/4 rounded bg-gray-200'></div>
            <div className='space-y-4 rounded-lg bg-white p-6'>
              <div className='h-4 w-3/4 rounded bg-gray-200'></div>
              <div className='h-4 w-1/2 rounded bg-gray-200'></div>
              <div className='h-4 w-2/3 rounded bg-gray-200'></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization || !profile) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-gray-900'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>Please log in to access billing information.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900'>Billing & Subscription</h1>
            <p className='mt-2 text-gray-600'>
              Manage your subscription, view usage metrics, and download invoices.
            </p>
          </div>

          <BillingDashboard
            organization={organization}
            profile={profile}
            usage={usage}
            plans={DEFAULT_PLANS}
          />
        </div>
      </div>
    </ToastProvider>
  )
}
