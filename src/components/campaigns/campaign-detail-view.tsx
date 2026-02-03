'use client'

/**
 * Campaign Detail View Component
 * Displays comprehensive campaign analytics with real-time progress tracking
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  EyeIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

interface CampaignStatistics {
  totalTargets: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  optOuts: number
  replies: number
  deliveryRate: number
  readRate: number
  replyRate: number
  failureRate: number
}

interface Campaign {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  template_id: string | null
  message: {
    type: string
    content: string
  } | null
  target_audience: {
    type: string
    tags?: string[]
    contactIds?: string[]
  }
  scheduling: {
    type: string
    scheduledAt?: string
  }
  rate_limiting: {
    enabled: boolean
    messagesPerHour: number
    messagesPerDay: number
  }
  statistics: CampaignStatistics
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface ProgressMetrics {
  totalJobs: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
  percentComplete: number
  messagesPerMinute: number
  estimatedTimeRemaining: number | null
  errors: Array<{ error: string; count: number }>
  lastUpdated: string
}

interface CampaignDetailViewProps {
  campaignId: string
}

export function CampaignDetailView({ campaignId }: CampaignDetailViewProps) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [progress, setProgress] = useState<ProgressMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/bulk/campaigns/${campaignId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaign')
      }

      setCampaign(data.campaign || data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign')
    }
  }, [campaignId])

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/bulk/campaigns/${campaignId}/progress`)
      const data = await response.json()

      if (response.ok) {
        setProgress(data.progress)
        if (data.campaign) {
          setCampaign(prev => prev ? { ...prev, ...data.campaign } : null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }, [campaignId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchCampaign()
      await fetchProgress()
      setLoading(false)
    }
    loadData()
  }, [fetchCampaign, fetchProgress])

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulk_campaigns',
          filter: `id=eq.${campaignId}`,
        },
        () => {
          fetchCampaign()
          fetchProgress()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulk_message_jobs',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchProgress()
        }
      )
      .subscribe()

    // Poll for progress every 10 seconds for running campaigns
    let pollInterval: NodeJS.Timeout | null = null
    if (campaign?.status === 'running') {
      pollInterval = setInterval(fetchProgress, 10000)
    }

    return () => {
      channel.unsubscribe()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [campaignId, campaign?.status, fetchCampaign, fetchProgress])

  const handleAction = async (action: 'pause' | 'resume' | 'send' | 'cancel') => {
    setActionLoading(action)
    try {
      const endpoint = action === 'cancel'
        ? `/api/bulk/campaigns/${campaignId}`
        : `/api/bulk/campaigns/${campaignId}/${action}`

      const method = action === 'cancel' ? 'DELETE' : 'POST'
      const response = await fetch(endpoint, { method })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} campaign`)
      }

      await fetchCampaign()
      await fetchProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} campaign`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDuplicate = async () => {
    setActionLoading('duplicate')
    try {
      const response = await fetch(`/api/bulk/campaigns/${campaignId}/duplicate`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate campaign')
      }

      router.push(`/dashboard/campaigns/${data.campaign.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Campagne laden...</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-700">{error || 'Campagne niet gevonden'}</p>
          <button
            onClick={() => router.push('/dashboard/campaigns')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Terug naar campagnes
          </button>
        </div>
      </div>
    )
  }

  const stats = campaign.statistics || {
    totalTargets: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
    messagesFailed: 0,
    deliveryRate: 0,
    readRate: 0,
    replyRate: 0,
    failureRate: 0,
    replies: 0,
    optOuts: 0,
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    running: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Concept',
    scheduled: 'Gepland',
    running: 'Actief',
    paused: 'Gepauzeerd',
    completed: 'Voltooid',
    failed: 'Mislukt',
    cancelled: 'Geannuleerd',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/campaigns')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[campaign.status]}`}>
                    {statusLabels[campaign.status] || campaign.status}
                  </span>
                </div>
                {campaign.description && (
                  <p className="mt-1 text-sm text-gray-500">{campaign.description}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleAction('send')}
                  disabled={actionLoading === 'send'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4" />
                  {actionLoading === 'send' ? 'Starten...' : 'Starten'}
                </button>
              )}
              {campaign.status === 'running' && (
                <button
                  onClick={() => handleAction('pause')}
                  disabled={actionLoading === 'pause'}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  <PauseIcon className="h-4 w-4" />
                  {actionLoading === 'pause' ? 'Pauzeren...' : 'Pauzeren'}
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleAction('resume')}
                  disabled={actionLoading === 'resume'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4" />
                  {actionLoading === 'resume' ? 'Hervatten...' : 'Hervatten'}
                </button>
              )}
              {['running', 'paused', 'scheduled'].includes(campaign.status) && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading === 'cancel'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <StopIcon className="h-4 w-4" />
                  {actionLoading === 'cancel' ? 'Annuleren...' : 'Annuleren'}
                </button>
              )}
              <button
                onClick={handleDuplicate}
                disabled={actionLoading === 'duplicate'}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                {actionLoading === 'duplicate' ? 'Kopiëren...' : 'Dupliceren'}
              </button>
              <button
                onClick={() => { fetchCampaign(); fetchProgress(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Vernieuwen"
              >
                <ArrowPathIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Progress Section (for running campaigns) */}
          {['running', 'paused'].includes(campaign.status) && progress && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Voortgang</h2>
                <span className="text-sm text-gray-500">
                  Laatst bijgewerkt: {new Date(progress.lastUpdated).toLocaleTimeString('nl-NL')}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{progress.percentComplete}% voltooid</span>
                  <span className="text-gray-500">
                    {progress.totalJobs - progress.pending} / {progress.totalJobs} berichten
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(progress.delivered / progress.totalJobs) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${(progress.sent / progress.totalJobs) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(progress.failed / progress.totalJobs) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full" /> Afgeleverd ({progress.delivered})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full" /> Verzonden ({progress.sent})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-full" /> Mislukt ({progress.failed})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-gray-300 rounded-full" /> Wachtend ({progress.pending})
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Snelheid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {progress.messagesPerMinute}
                  </p>
                  <p className="text-xs text-gray-500">berichten/min</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Geschatte tijd</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {progress.estimatedTimeRemaining !== null
                      ? `${progress.estimatedTimeRemaining} min`
                      : '-'}
                  </p>
                  <p className="text-xs text-gray-500">resterend</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Wachtend</p>
                  <p className="text-2xl font-bold text-gray-900">{progress.pending}</p>
                  <p className="text-xs text-gray-500">berichten</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Mislukt</p>
                  <p className="text-2xl font-bold text-red-600">{progress.failed}</p>
                  <p className="text-xs text-gray-500">berichten</p>
                </div>
              </div>

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recente fouten</h3>
                  <div className="space-y-2">
                    {progress.errors.map((err, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-red-50 rounded-lg p-3">
                        <span className="text-sm text-red-700">{err.error}</span>
                        <span className="text-sm font-medium text-red-800">{err.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalTargets.toLocaleString('nl-NL')}
              </p>
              <p className="text-sm text-gray-500">Doelgroep</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <EnvelopeIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.messagesSent.toLocaleString('nl-NL')}
              </p>
              <p className="text-sm text-gray-500">Verzonden</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.messagesDelivered.toLocaleString('nl-NL')}
              </p>
              <p className="text-sm text-gray-500">Afgeleverd</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <EyeIcon className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.messagesRead.toLocaleString('nl-NL')}
              </p>
              <p className="text-sm text-gray-500">Gelezen</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Prestatie Metrics</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Aflevering Rate</span>
                    <span className="font-medium">{stats.deliveryRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.deliveryRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Lees Rate</span>
                    <span className="font-medium">{stats.readRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.readRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Reactie Rate</span>
                    <span className="font-medium">{stats.replyRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.replyRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Fout Rate</span>
                    <span className="font-medium text-red-600">{stats.failureRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.failureRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campagne Details</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Type</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{campaign.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Planning</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">
                    {campaign.scheduling?.type || 'Onmiddellijk'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Doelgroep Type</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">
                    {campaign.target_audience?.type || '-'}
                  </dd>
                </div>
                {campaign.rate_limiting?.enabled && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Rate Limit (uur)</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {campaign.rate_limiting.messagesPerHour}/uur
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Rate Limit (dag)</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {campaign.rate_limiting.messagesPerDay}/dag
                      </dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Aangemaakt</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(campaign.created_at).toLocaleDateString('nl-NL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
                {campaign.started_at && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Gestart</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(campaign.started_at).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                )}
                {campaign.completed_at && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Voltooid</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(campaign.completed_at).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Engagement Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Betrokkenheid Samenvatting</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.replies}</p>
                <p className="text-sm text-gray-500">Reacties</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.optOuts}</p>
                <p className="text-sm text-gray-500">Uitschrijvingen</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.messagesFailed}</p>
                <p className="text-sm text-gray-500">Mislukt</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <ClockIcon className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {campaign.started_at && campaign.completed_at
                    ? Math.round(
                        (new Date(campaign.completed_at).getTime() -
                          new Date(campaign.started_at).getTime()) /
                          (1000 * 60)
                      )
                    : '-'}
                </p>
                <p className="text-sm text-gray-500">Minuten totaal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
