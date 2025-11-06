'use client'

import { useState } from 'react'
import { PricingPlans } from './pricing-plans'
import { UsageMetrics } from './usage-metrics'
import { BillingHistory } from './billing-history'
import { useToast } from '@/components/ui/toast'
import type { Organization, Profile } from '@/types'

interface BillingDashboardProps {
  organization: Organization
  profile: Profile
  usage: any
  plans: any
}

export function BillingDashboard({ organization, profile, usage, plans }: BillingDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      addToast({
        type: 'error',
        title: 'Upgrade Failed',
        message: 'Unable to process upgrade. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to access billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      addToast({
        type: 'error',
        title: 'Portal Access Failed',
        message: 'Unable to access billing portal. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const currentPlan = plans[organization.subscription_tier] || plans.starter
  const isActive = organization.subscription_status === 'active'
  const isPastDue = organization.subscription_status === 'past_due'
  const isCancelled = organization.subscription_status === 'cancelled'

  return (
    <div className='space-y-6'>
      {/* Current Subscription Status */}
      <div className='rounded-lg bg-white shadow'>
        <div className='border-b border-gray-200 px-6 py-4'>
          <h2 className='text-lg font-medium text-gray-900'>Current Subscription</h2>
        </div>
        <div className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-xl font-semibold text-gray-900'>{currentPlan.name}</h3>
              <p className='text-gray-600'>{currentPlan.description}</p>
              <p className='mt-2 text-2xl font-bold text-gray-900'>
                ${currentPlan.price}
                <span className='text-sm font-normal text-gray-500'>/{currentPlan.interval}</span>
              </p>
            </div>
            <div className='text-right'>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  isActive
                    ? 'bg-green-100 text-green-800'
                    : isPastDue
                      ? 'bg-yellow-100 text-yellow-800'
                      : isCancelled
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {organization.subscription_status || 'trial'}
              </span>
              {organization.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  disabled={isLoading}
                  className='mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50'
                >
                  {isLoading ? 'Loading...' : 'Manage Billing'}
                </button>
              )}
            </div>
          </div>

          {isPastDue && (
            <div className='mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg className='h-5 w-5 text-yellow-400' viewBox='0 0 20 20' fill='currentColor'>
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-yellow-800'>Payment Issue</h3>
                  <p className='mt-1 text-sm text-yellow-700'>
                    Your payment method failed. Please update your billing information to continue
                    using the service.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Metrics */}
      {usage && <UsageMetrics usage={usage} plan={currentPlan} />}

      {/* Pricing Plans */}
      <PricingPlans
        plans={plans}
        currentPlan={organization.subscription_tier}
        onUpgrade={handleUpgrade}
        isLoading={isLoading}
      />

      {/* Billing History */}
      <BillingHistory organizationId={organization.id} />
    </div>
  )
}
