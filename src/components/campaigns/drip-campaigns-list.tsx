'use client'

/**
 * Drip Campaigns List Component
 * Displays all drip campaigns with filtering and actions
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/components/providers/translation-provider'

interface DripCampaign {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  triggerType: string
  isActive: boolean
  statistics: {
    totalEnrolled: number
    activeContacts: number
    completedContacts: number
    averageCompletionRate: number
  }
  createdAt: string
  updatedAt: string
}

export function DripCampaignsList() {
  const router = useRouter()
  const t = useTranslations('campaigns')
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Fetch campaigns
  useEffect(() => {
    fetchCampaigns()
  }, [filter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)

      const response = await fetch(`/api/drip-campaigns?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCampaigns(data.campaigns || [])
      } else {
        console.error('Failed to fetch campaigns:', data.error)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCampaign = async (campaignId: string, currentlyActive: boolean) => {
    try {
      const endpoint = currentlyActive ? 'pause' : 'activate'
      const response = await fetch(`/api/drip-campaigns/${campaignId}/${endpoint}`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh list
        await fetchCampaigns()
      } else {
        const data = await response.json()
        alert(`${t('builder.errors.generic')}: ${data.error}`)
      }
    } catch (error) {
      console.error('Error toggling campaign:', error)
      alert(t('builder.errors.generic'))
    }
  }

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(t('drip.list.actions.archiveConfirm', { name: campaignName }) || `Are you sure you want to archive "${campaignName}"?`)) return

    try {
      const response = await fetch(`/api/drip-campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCampaigns()
      } else {
        const data = await response.json()
        alert(`Fout: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert(t('builder.errors.generic'))
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'draft') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{t('list.status.draft')}</span>
    }
    if (isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{t('drip.list.stats.active')}</span> // Or specific status badge
    }
    if (status === 'paused') {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">{t('list.status.paused')}</span>
    }
    if (status === 'archived') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">{t('drip.list.actions.archive')}</span> // Reusing archive text or creating new status
    }
    return null
  }

  const getTriggerTypeLabel = (type: string) => {
    return t(`drip.builder.triggers.${type}` as any) || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('builder.buttons.processing', { defaultValue: 'Laden...' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 border-b pb-4">
        {['all', 'active', 'paused', 'draft'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {t(`list.filters.${status}` as any)}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">{t('drip.list.empty.title')}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {t('drip.list.empty.description')}
          </p>
          <Button
            onClick={() => router.push('/dashboard/drip-campaigns/new')}
            className="mt-4"
          >
            {t('drip.createButton')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Campaign Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    {getStatusBadge(campaign.status, campaign.isActive)}
                  </div>

                  {campaign.description && (
                    <p className="mt-1 text-sm text-gray-500">{campaign.description}</p>
                  )}

                  <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>
                        {campaign.statistics.totalEnrolled} {t('drip.list.stats.enrolled')}
                      </span>
                    </div>
                    <div>
                      {campaign.statistics.activeContacts} {t('drip.list.stats.active')}
                    </div>
                    <div>
                      {campaign.statistics.completedContacts} {t('drip.list.stats.completed')}
                    </div>
                    <div className="font-medium">
                      {campaign.statistics.averageCompletionRate.toFixed(1)}% {t('drip.list.stats.conversion')}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {t('drip.builder.steps.trigger')}: {getTriggerTypeLabel(campaign.triggerType)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {campaign.status !== 'archived' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleCampaign(campaign.id, campaign.isActive)}
                        title={campaign.isActive ? t('drip.list.actions.pause') : t('drip.list.actions.activate')}
                      >
                        {campaign.isActive ? (
                          <PauseIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/drip-campaigns/${campaign.id}`)}
                        title={t('drip.list.actions.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/drip-campaigns/${campaign.id}/analytics`)
                        }
                        title="Analytics"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                    title={t('drip.list.actions.archive')}
                    className="text-red-600 hover:text-red-700 hover:border-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
