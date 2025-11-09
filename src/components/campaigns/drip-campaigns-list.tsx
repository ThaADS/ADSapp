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
        alert(`Fout: ${data.error}`)
      }
    } catch (error) {
      console.error('Error toggling campaign:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Weet je zeker dat je "${campaignName}" wilt archiveren?`)) return

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
      alert('Er is een fout opgetreden')
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'draft') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Draft</span>
    }
    if (isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Actief</span>
    }
    if (status === 'paused') {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Gepauzeerd</span>
    }
    if (status === 'archived') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">Gearchiveerd</span>
    }
    return null
  }

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      manual: 'Handmatig',
      contact_created: 'Nieuw Contact',
      tag_added: 'Tag Toegevoegd',
      custom_event: 'Custom Event',
      api: 'API Trigger',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Campagnes laden...</p>
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Alle' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Geen campagnes gevonden</h3>
          <p className="mt-2 text-sm text-gray-500">
            Maak je eerste drip campagne aan om geautomatiseerde berichtenreeksen te versturen.
          </p>
          <Button
            onClick={() => router.push('/dashboard/drip-campaigns/new')}
            className="mt-4"
          >
            Nieuwe Campagne Maken
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
                        {campaign.statistics.totalEnrolled} geënroleerd
                      </span>
                    </div>
                    <div>
                      {campaign.statistics.activeContacts} actief
                    </div>
                    <div>
                      {campaign.statistics.completedContacts} voltooid
                    </div>
                    <div className="font-medium">
                      {campaign.statistics.averageCompletionRate.toFixed(1)}% conversie
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Trigger: {getTriggerTypeLabel(campaign.triggerType)}
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
                        title={campaign.isActive ? 'Pauzeren' : 'Activeren'}
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
                        title="Bewerken"
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
                    title="Archiveren"
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
