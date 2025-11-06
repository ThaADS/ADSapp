'use client'

import { useEffect, useState } from 'react'
import {
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface WebhookEvent {
  id: string
  event_type: string
  source: 'stripe' | 'whatsapp' | 'custom'
  status: 'success' | 'failed' | 'pending' | 'retrying'
  payload: Record<string, unknown>
  response: Record<string, unknown> | null
  error_message: string | null
  attempts: number
  max_attempts: number
  created_at: string
  processed_at: string | null
}

interface WebhookStats {
  total: number
  success: number
  failed: number
  pending: number
  successRate: number
}

export function WebhooksMonitor() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchWebhooks()
  }, [currentPage, filterSource, filterStatus, searchQuery])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterSource !== 'all' && { source: filterSource }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery }),
      })

      const [eventsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/webhooks?${params}`),
        fetch('/api/admin/webhooks/stats'),
      ])

      if (!eventsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch webhooks')
      }

      const eventsData = await eventsRes.json()
      const statsData = await statsRes.json()

      setEvents(eventsData.data || [])
      setStats(statsData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const retryWebhook = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${eventId}/retry`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to retry webhook')
      }

      fetchWebhooks()
    } catch (err) {
      alert('Failed to retry webhook')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      success: {
        icon: CheckCircleIcon,
        class: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      },
      failed: {
        icon: XCircleIcon,
        class: 'bg-red-50 text-red-700 ring-red-600/20',
      },
      pending: {
        icon: ClockIcon,
        class: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      },
      retrying: {
        icon: ArrowPathIcon,
        class: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      },
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const BadgeIcon = badge.icon

    return (
      <span
        className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badge.class}`}
      >
        <BadgeIcon className='h-3.5 w-3.5' />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getSourceBadge = (source: string) => {
    const colors = {
      stripe: 'bg-purple-100 text-purple-700',
      whatsapp: 'bg-green-100 text-green-700',
      custom: 'bg-blue-100 text-blue-700',
    }

    return (
      <span
        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${colors[source as keyof typeof colors] || colors.custom}`}
      >
        {source.charAt(0).toUpperCase() + source.slice(1)}
      </span>
    )
  }

  if (loading && events.length === 0) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600'></div>
          <p className='mt-4 text-sm text-slate-600'>Loading webhooks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10'>
        <div className='flex'>
          <div className='flex-shrink-0'>
            <XCircleIcon className='h-5 w-5 text-red-400' />
          </div>
          <div className='ml-3'>
            <h3 className='text-sm font-medium text-red-800'>Error loading webhooks</h3>
            <div className='mt-2 text-sm text-red-700'>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-slate-900'>Webhook Monitor</h2>
        <p className='mt-2 text-sm text-slate-600'>
          Monitor and manage webhook events from Stripe, WhatsApp, and custom integrations
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
          <div className='rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 ring-1 ring-slate-900/5'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-600'>Total Events</p>
                <p className='mt-1 text-2xl font-bold text-slate-900'>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <BellIcon className='h-8 w-8 text-slate-400' />
            </div>
          </div>

          <div className='rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 ring-1 ring-emerald-600/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-emerald-700'>Success</p>
                <p className='mt-1 text-2xl font-bold text-emerald-900'>
                  {stats.success.toLocaleString()}
                </p>
              </div>
              <CheckCircleIcon className='h-8 w-8 text-emerald-600' />
            </div>
          </div>

          <div className='rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-5 ring-1 ring-red-600/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-red-700'>Failed</p>
                <p className='mt-1 text-2xl font-bold text-red-900'>
                  {stats.failed.toLocaleString()}
                </p>
              </div>
              <XCircleIcon className='h-8 w-8 text-red-600' />
            </div>
          </div>

          <div className='rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 ring-1 ring-blue-600/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-blue-700'>Success Rate</p>
                <p className='mt-1 text-2xl font-bold text-blue-900'>
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white'>
                {stats.successRate.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className='rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='relative'>
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
              <MagnifyingGlassIcon className='h-5 w-5 text-slate-400' />
            </div>
            <input
              type='text'
              placeholder='Search events...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='block w-full rounded-lg border-0 py-2.5 pr-3 pl-10 text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 focus:ring-inset sm:text-sm'
            />
          </div>

          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className='block w-full rounded-lg border-0 py-2.5 pr-10 pl-3 text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-emerald-600 sm:text-sm'
          >
            <option value='all'>All Sources</option>
            <option value='stripe'>Stripe</option>
            <option value='whatsapp'>WhatsApp</option>
            <option value='custom'>Custom</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className='block w-full rounded-lg border-0 py-2.5 pr-10 pl-3 text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-emerald-600 sm:text-sm'
          >
            <option value='all'>All Statuses</option>
            <option value='success'>Success</option>
            <option value='failed'>Failed</option>
            <option value='pending'>Pending</option>
            <option value='retrying'>Retrying</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
        <div className='divide-y divide-slate-200'>
          {events.map(event => (
            <div
              key={event.id}
              className='cursor-pointer p-6 transition-colors hover:bg-slate-50'
              onClick={() => setSelectedEvent(event)}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <div className='mb-2 flex items-center gap-3'>
                    {getSourceBadge(event.source)}
                    {getStatusBadge(event.status)}
                    <span className='text-sm font-medium text-slate-900'>{event.event_type}</span>
                  </div>

                  <div className='mb-2 flex items-center gap-4 text-sm text-slate-600'>
                    <div className='flex items-center gap-1'>
                      <ClockIcon className='h-4 w-4' />
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                    <div>
                      Attempts: {event.attempts}/{event.max_attempts}
                    </div>
                  </div>

                  {event.error_message && (
                    <div className='rounded-lg bg-red-50 p-2 font-mono text-xs text-red-600'>
                      {event.error_message}
                    </div>
                  )}
                </div>

                <div className='flex items-center gap-2'>
                  {event.status === 'failed' && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        retryWebhook(event.id)
                      }}
                      className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100'
                    >
                      <ArrowPathIcon className='h-3.5 w-3.5' />
                      Retry
                    </button>
                  )}
                  <ChevronRightIcon className='h-5 w-5 text-slate-400' />
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className='py-12 text-center'>
            <BellIcon className='mx-auto h-12 w-12 text-slate-400' />
            <h3 className='mt-2 text-sm font-medium text-slate-900'>No webhook events found</h3>
            <p className='mt-1 text-sm text-slate-500'>
              {searchQuery || filterSource !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No webhook events have been received yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl'>
            <div className='border-b border-slate-200 p-6'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-slate-900'>Webhook Event Details</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className='text-slate-400 hover:text-slate-600'
                >
                  <XCircleIcon className='h-6 w-6' />
                </button>
              </div>
            </div>
            <div className='space-y-4 p-6'>
              <div>
                <h4 className='mb-2 text-sm font-semibold text-slate-900'>Event Information</h4>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-slate-600'>Event Type:</span>
                    <span className='ml-2 font-medium text-slate-900'>
                      {selectedEvent.event_type}
                    </span>
                  </div>
                  <div>
                    <span className='text-slate-600'>Source:</span>
                    <span className='ml-2'>{getSourceBadge(selectedEvent.source)}</span>
                  </div>
                  <div>
                    <span className='text-slate-600'>Status:</span>
                    <span className='ml-2'>{getStatusBadge(selectedEvent.status)}</span>
                  </div>
                  <div>
                    <span className='text-slate-600'>Created:</span>
                    <span className='ml-2 font-medium text-slate-900'>
                      {new Date(selectedEvent.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className='mb-2 text-sm font-semibold text-slate-900'>Payload</h4>
                <pre className='overflow-x-auto rounded-lg bg-slate-50 p-4 font-mono text-xs'>
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.response && (
                <div>
                  <h4 className='mb-2 text-sm font-semibold text-slate-900'>Response</h4>
                  <pre className='overflow-x-auto rounded-lg bg-slate-50 p-4 font-mono text-xs'>
                    {JSON.stringify(selectedEvent.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
