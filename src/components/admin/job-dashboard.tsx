'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, Pause } from 'lucide-react'

/**
 * Job Dashboard Component
 *
 * Real-time monitoring dashboard for BullMQ job queues.
 * Displays queue statistics, job history, and provides management controls.
 *
 * Features:
 * - Real-time queue statistics
 * - Job status indicators
 * - Recent job history
 * - Auto-refresh functionality
 * - Job type breakdown
 */

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

interface JobLog {
  id: string
  job_id: string
  job_type: string
  status: string
  result: any
  created_at: string
  started_at: string
  completed_at: string
}

interface JobStats {
  queueStats: Record<string, QueueStats>
  historicalStats: {
    total: number
    completed: number
    failed: number
    running: number
    byType: Record<string, any>
  }
  recentJobs: JobLog[]
}

export function JobDashboard() {
  const [stats, setStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setError(null)
      const response = await fetch('/api/jobs/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch job statistics')
      }

      const data = await response.json()
      if (data.success) {
        setStats(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching job stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStats()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatDuration = (startedAt: string, completedAt: string) => {
    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    const duration = end - start

    if (duration < 1000) {
      return `${duration}ms`
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`
    } else {
      return `${(duration / 60000).toFixed(1)}m`
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'running':
      case 'active':
        return 'text-blue-600 bg-blue-50'
      case 'paused':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4' />
      case 'failed':
        return <XCircle className='h-4 w-4' />
      case 'active':
        return <Clock className='h-4 w-4 animate-spin' />
      case 'paused':
        return <Pause className='h-4 w-4' />
      default:
        return <Clock className='h-4 w-4' />
    }
  }

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='flex flex-col items-center gap-2'>
          <RefreshCw className='h-8 w-8 animate-spin text-blue-600' />
          <p className='text-gray-600'>Loading job statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
        <div className='flex items-center gap-2'>
          <XCircle className='h-5 w-5 text-red-600' />
          <p className='font-medium text-red-800'>Error loading job statistics</p>
        </div>
        <p className='mt-1 text-sm text-red-600'>{error}</p>
      </div>
    )
  }

  if (!stats) {
    return <div>No data available</div>
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-gray-900'>Job Queue Dashboard</h2>
        <div className='flex items-center gap-4'>
          <label className='flex items-center gap-2 text-sm text-gray-600'>
            <input
              type='checkbox'
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className='rounded border-gray-300'
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchStats}
            className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
          >
            <RefreshCw className='h-4 w-4' />
            Refresh
          </button>
        </div>
      </div>

      {/* Queue Statistics Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Object.entries(stats.queueStats).map(([queueName, queueStats]) => (
          <div key={queueName} className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
            <h3 className='mb-4 text-sm font-medium text-gray-600 uppercase'>
              {queueName.replace(/-/g, ' ')}
            </h3>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Waiting</span>
                <span className='text-sm font-semibold'>{queueStats.waiting}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Active</span>
                <span className='text-sm font-semibold text-blue-600'>{queueStats.active}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Completed</span>
                <span className='text-sm font-semibold text-green-600'>{queueStats.completed}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Failed</span>
                <span className='text-sm font-semibold text-red-600'>{queueStats.failed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Statistics */}
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
        <h3 className='mb-4 text-lg font-semibold'>Historical Statistics</h3>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='text-center'>
            <p className='text-3xl font-bold text-gray-900'>{stats.historicalStats.total}</p>
            <p className='text-sm text-gray-600'>Total Jobs</p>
          </div>
          <div className='text-center'>
            <p className='text-3xl font-bold text-green-600'>{stats.historicalStats.completed}</p>
            <p className='text-sm text-gray-600'>Completed</p>
          </div>
          <div className='text-center'>
            <p className='text-3xl font-bold text-red-600'>{stats.historicalStats.failed}</p>
            <p className='text-sm text-gray-600'>Failed</p>
          </div>
          <div className='text-center'>
            <p className='text-3xl font-bold text-blue-600'>{stats.historicalStats.running}</p>
            <p className='text-sm text-gray-600'>Running</p>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className='rounded-lg border border-gray-200 bg-white shadow'>
        <div className='border-b border-gray-200 p-6'>
          <h3 className='text-lg font-semibold'>Recent Jobs</h3>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Job Type
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Duration
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Completed At
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white'>
              {stats.recentJobs.map(job => (
                <tr key={job.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span className='text-sm font-medium text-gray-900'>
                      {job.job_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}
                    >
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                  </td>
                  <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-600'>
                    {formatDuration(job.started_at, job.completed_at)}
                  </td>
                  <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-600'>
                    {new Date(job.completed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
