'use client'

import { useEffect, useState } from 'react'
import {
  BuildingOfficeIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/components/providers/translation-provider'

interface Organization {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup'
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
  created_at: string
  user_count?: number
  message_count?: number
}

export function OrganizationsManager() {
  const t = useTranslations('admin')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations')
      if (!response.ok) {
        throw new Error(t('errorLoadingOrganizations') || 'Failed to fetch organizations')
      }
      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/suspend`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(t('messages.suspendFailed'))
      }
      fetchOrganizations() // Refresh list
    } catch (err) {
      alert(t('messages.suspendFailed'))
    }
  }

  const handleActivate = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!response.ok) {
        throw new Error(t('messages.activateFailed'))
      }
      fetchOrganizations() // Refresh list
    } catch (err) {
      alert(t('messages.activateFailed'))
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending_setup: 'bg-yellow-100 text-yellow-800',
      trial: 'bg-blue-100 text-blue-800',
      past_due: 'bg-orange-100 text-orange-800',
    } as const

    const translationKey = `status.${status}`
    const statusText = t(translationKey as any) || status?.replace('_', ' ') || 'unknown'

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}
      >
        {statusText}
      </span>
    )
  }

  if (loading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600'></div>
          <p className='mt-4 text-sm text-slate-600'>{t('loadingOrganizations')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10'>
        <div className='text-sm text-red-700'>{error}</div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-slate-900'>{t('organizations')}</h2>
        <p className='mt-2 text-sm text-slate-600'>
          {t('manageOrganizations')}
        </p>
      </div>

      <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
        <div className='border-b border-slate-200 p-6'>
          <div className='sm:flex sm:items-center'>
            <div className='sm:flex-auto'>
              <h3 className='text-lg font-semibold text-slate-900'>{t('totalOrganizations')}</h3>
              <p className='mt-1 text-sm text-slate-600'>
                {t('organizationDetails')}
              </p>
            </div>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-slate-200'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='py-3.5 pr-3 pl-6 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('organizationName')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('organizationStatus')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('subscriptionPlan')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('users')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('messagesLabel') || 'Messages'}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('createdDate')}
                </th>
                <th className='relative py-3.5 pr-6 pl-3'>
                  <span className='sr-only'>{t('action')}</span>
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-200 bg-white'>
              {organizations.map(org => (
                <tr key={org.id} className='transition-colors hover:bg-slate-50'>
                  <td className='py-4 pr-3 pl-6 text-sm whitespace-nowrap'>
                    <div className='flex items-center gap-3'>
                      <div className='h-10 w-10 flex-shrink-0'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm'>
                          <BuildingOfficeIcon className='h-5 w-5 text-white' />
                        </div>
                      </div>
                      <div>
                        <div className='font-medium text-slate-900'>{org.name}</div>
                        <div className='text-xs text-slate-500'>{org.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap'>
                    {getStatusBadge(org.status)}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap'>
                    {getStatusBadge(org.subscription_status)}
                  </td>
                  <td className='px-3 py-4 text-sm font-medium whitespace-nowrap text-slate-900'>
                    {org.user_count || 0}
                  </td>
                  <td className='px-3 py-4 text-sm font-medium whitespace-nowrap text-slate-900'>
                    {org.message_count || 0}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-slate-500'>
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className='relative py-4 pr-6 pl-3 text-right text-sm font-medium whitespace-nowrap'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        type='button'
                        title={t('viewOrganization')}
                        className='rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50'
                      >
                        <EyeIcon className='h-4 w-4' />
                      </button>
                      {org.status === 'active' ? (
                        <button
                          type='button'
                          title={t('suspendOrganization')}
                          onClick={() => handleSuspend(org.id)}
                          className='rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50'
                        >
                          <PauseIcon className='h-4 w-4' />
                        </button>
                      ) : (
                        <button
                          type='button'
                          title={t('activateOrganization')}
                          onClick={() => handleActivate(org.id)}
                          className='rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50'
                        >
                          <PlayIcon className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {organizations.length === 0 && (
            <div className='py-12 text-center'>
              <BuildingOfficeIcon className='mx-auto h-12 w-12 text-slate-400' />
              <h3 className='mt-2 text-sm font-medium text-slate-900'>{t('noOrganizations')}</h3>
              <p className='mt-1 text-sm text-slate-500'>{t('noOrganizationsDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
