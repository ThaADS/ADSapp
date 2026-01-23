'use client'

/**
 * Billing Panel Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback } from 'react'

interface BillingPlanProps {
  id: string
  name: string
  price: number
  priceYearly?: number
  currency?: string
  features: string[]
  popular?: boolean
}

interface BillingPanelProps {
  currentPlan?: string
  plans?: BillingPlanProps[]
  usage?: {
    messages: { current: number; limit: number }
    contacts: { current: number; limit: number }
    storage: { current: number; limit: number }
  }
  billingHistory?: {
    date: string
    description: string
    amount: number
    status: 'paid' | 'pending' | 'failed'
  }[]
  onUpgrade?: (planId: string) => void
  onManageSubscription?: () => void
  className?: string
}

export function BillingPanel({
  currentPlan = 'starter',
  plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      priceYearly: 290,
      features: ['1.000 berichten/maand', '500 contacten', '1 gebruiker', 'Basis analytics'],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 79,
      priceYearly: 790,
      popular: true,
      features: [
        '10.000 berichten/maand',
        '5.000 contacten',
        '5 gebruikers',
        'Geavanceerde analytics',
        'AI suggesties',
        'Prioriteit support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      priceYearly: 1990,
      features: [
        'Onbeperkte berichten',
        'Onbeperkte contacten',
        'Onbeperkte gebruikers',
        'Custom integraties',
        'Dedicated support',
        'SLA garantie',
      ],
    },
  ],
  usage = {
    messages: { current: 7500, limit: 10000 },
    contacts: { current: 3200, limit: 5000 },
    storage: { current: 2.4, limit: 10 },
  },
  billingHistory = [
    { date: '2024-01-01', description: 'Professional - Maandelijks', amount: 79, status: 'paid' },
    { date: '2023-12-01', description: 'Professional - Maandelijks', amount: 79, status: 'paid' },
    { date: '2023-11-01', description: 'Professional - Maandelijks', amount: 79, status: 'paid' },
  ],
  onUpgrade,
  onManageSubscription,
  className = '',
}: BillingPanelProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [showHistory, setShowHistory] = useState(false)

  const getUsagePercentage = (current: number, limit: number) =>
    Math.min(Math.round((current / limit) * 100), 100)

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  const handleUpgrade = useCallback((planId: string) => {
    onUpgrade?.(planId)
  }, [onUpgrade])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Usage */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="font-semibold mb-4">Huidig Gebruik</h3>
        <div className="space-y-4">
          {[
            { label: 'Berichten', ...usage.messages, unit: '' },
            { label: 'Contacten', ...usage.contacts, unit: '' },
            { label: 'Opslag', ...usage.storage, unit: 'GB' },
          ].map((item) => {
            const percentage = getUsagePercentage(item.current, item.limit)
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span className="text-gray-500">
                    {item.current.toLocaleString('nl-NL')}{item.unit} / {item.limit.toLocaleString('nl-NL')}{item.unit}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getUsageColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plans */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Abonnementen</h3>
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-3 py-1 rounded text-sm transition-all
                ${billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}
              `}
            >
              Maandelijks
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-3 py-1 rounded text-sm transition-all
                ${billingPeriod === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}
              `}
            >
              Jaarlijks
              <span className="ml-1 text-xs text-emerald-600">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan
            const price = billingPeriod === 'yearly' && plan.priceYearly
              ? Math.round(plan.priceYearly / 12)
              : plan.price

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-5 transition-all
                  ${plan.popular ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}
                  ${isCurrentPlan ? 'bg-emerald-50' : ''}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                    Populair
                  </div>
                )}

                <h4 className="font-semibold text-lg">{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold">€{price}</span>
                  <span className="text-gray-500">/maand</span>
                </div>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors
                    ${isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : plan.popular
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {isCurrentPlan ? 'Huidig abonnement' : 'Upgraden'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Billing History */}
      <div className="rounded-lg border bg-white">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <h3 className="font-semibold">Betalingsgeschiedenis</h3>
          <span className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showHistory && (
          <div className="border-t">
            {billingHistory.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Geen betalingen gevonden</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Datum</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Omschrijving</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Bedrag</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-3 text-sm">{item.date}</td>
                      <td className="px-4 py-3 text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-right">€{item.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full
                            ${item.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                            ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${item.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                          `}
                        >
                          {item.status === 'paid' && 'Betaald'}
                          {item.status === 'pending' && 'In afwachting'}
                          {item.status === 'failed' && 'Mislukt'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Manage Subscription */}
      <div className="flex justify-center">
        <button
          onClick={onManageSubscription}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Abonnement beheren via Stripe Portal
        </button>
      </div>
    </div>
  )
}

export default BillingPanel
