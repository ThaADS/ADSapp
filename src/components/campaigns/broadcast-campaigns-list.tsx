'use client'

/**
 * Broadcast Campaigns List
 * Overview of all broadcast campaigns with stats
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

interface BroadcastCampaign {
  id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  type: string
  statistics: {
    totalTargets: number
    messagesSent: number
    messagesDelivered: number
    deliveryRate: number
    readRate: number
  }
  scheduling: {
    type: string
    scheduledAt?: string
  }
  createdAt: string
}

export function BroadcastCampaignsList() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchCampaigns()
  }, [filter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)

      const response = await fetch(`/api/bulk/campaigns?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      running: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
      paused: 'bg-orange-100 text-orange-700',
    }

    const labels: Record<string, string> = {
      draft: 'Draft',
      scheduled: 'Gepland',
      running: 'Bezig',
      completed: 'Voltooid',
      failed: 'Mislukt',
      cancelled: 'Geannuleerd',
      paused: 'Gepauzeerd',
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    )
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
        {['all', 'scheduled', 'running', 'completed', 'draft'].map(status => (
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

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Geen campagnes gevonden</h3>
          <p className="mt-2 text-sm text-gray-500">
            Maak je eerste broadcast campagne aan om bulkberichten te versturen.
          </p>
          <Button onClick={() => router.push('/dashboard/broadcast/new')} className="mt-4">
            Nieuwe Broadcast Maken
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
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-gray-500 mb-3">{campaign.description}</p>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-5 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Doelgroep</p>
                      <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4 text-gray-400" />
                        {campaign.statistics.totalTargets}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Verzonden</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {campaign.statistics.messagesSent}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Afgeleverd</p>
                      <div className="flex items-center gap-1">
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <p className="text-lg font-semibold text-green-600">
                          {campaign.statistics.messagesDelivered}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Delivery Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {campaign.statistics.deliveryRate.toFixed(1)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Open Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {campaign.statistics.readRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {campaign.status === 'running' && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Voortgang</span>
                        <span>
                          {campaign.statistics.messagesSent} / {campaign.statistics.totalTargets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (campaign.statistics.messagesSent /
                                campaign.statistics.totalTargets) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {campaign.scheduling.scheduledAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      Gepland voor:{' '}
                      {new Date(campaign.scheduling.scheduledAt).toLocaleString('nl-NL')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/broadcast/${campaign.id}/analytics`)}
                    title="Analytics"
                  >
                    <ChartBarIcon className="h-4 w-4" />
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
