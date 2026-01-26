'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  user_id: string
  user_email: string
  user_name: string | null
  organization_id: string | null
  organization_name: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  severity: 'info' | 'warning' | 'error' | 'critical'
  created_at: string
}

interface AuditLogsResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
}

export function AuditLogs() {
  const t = useTranslations('admin')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  useEffect(() => {
    fetchAuditLogs()
  }, [currentPage, searchQuery, filterSeverity, filterAction])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
        ...(filterSeverity !== 'all' && { severity: filterSeverity }),
        ...(filterAction !== 'all' && { action: filterAction }),
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }
      const result: AuditLogsResponse = await response.json()
      setLogs(result.data || [])
      setTotalLogs(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const badges = {
      info: {
        icon: InformationCircleIcon,
        class: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      },
      warning: {
        icon: ExclamationCircleIcon,
        class: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      },
      error: {
        icon: ExclamationCircleIcon,
        class: 'bg-red-50 text-red-700 ring-red-600/20',
      },
      critical: {
        icon: ShieldCheckIcon,
        class: 'bg-purple-50 text-purple-700 ring-purple-600/20',
      },
    }

    const badge = badges[severity as keyof typeof badges] || badges.info
    const BadgeIcon = badge.icon

    return (
      <span
        className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badge.class}`}
      >
        <BadgeIcon className='h-3.5 w-3.5' />
        {t(`auditLogs.severity${severity.charAt(0).toUpperCase() + severity.slice(1)}`)}
      </span>
    )
  }

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-emerald-600 bg-emerald-50'
    if (action.includes('update')) return 'text-blue-600 bg-blue-50'
    if (action.includes('delete')) return 'text-red-600 bg-red-50'
    if (action.includes('login') || action.includes('auth')) return 'text-purple-600 bg-purple-50'
    return 'text-slate-600 bg-slate-50'
  }

  if (loading && logs.length === 0) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600'></div>
          <p className='mt-4 text-sm text-slate-600'>{t('auditLogs.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10'>
        <div className='flex'>
          <div className='flex-shrink-0'>
            <ExclamationCircleIcon className='h-5 w-5 text-red-400' />
          </div>
          <div className='ml-3'>
            <h3 className='text-sm font-medium text-red-800'>{t('auditLogs.errorLoading')}</h3>
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
        <h2 className='text-2xl font-bold text-slate-900'>{t('auditLogs.title')}</h2>
        <p className='mt-2 text-sm text-slate-600'>
          {t('auditLogs.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className='rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {/* Search */}
          <div className='md:col-span-1'>
            <div className='relative'>
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                <MagnifyingGlassIcon className='h-5 w-5 text-slate-400' />
              </div>
              <input
                type='text'
                placeholder={t('auditLogs.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='block w-full rounded-lg border-0 py-2.5 pr-3 pl-10 text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 focus:ring-inset sm:text-sm'
              />
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className='block w-full rounded-lg border-0 py-2.5 pr-10 pl-3 text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-emerald-600 sm:text-sm'
            >
              <option value='all'>{t('auditLogs.allSeverities')}</option>
              <option value='info'>{t('auditLogs.severityInfo')}</option>
              <option value='warning'>{t('auditLogs.severityWarning')}</option>
              <option value='error'>{t('auditLogs.severityError')}</option>
              <option value='critical'>{t('auditLogs.severityCritical')}</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className='block w-full rounded-lg border-0 py-2.5 pr-10 pl-3 text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-emerald-600 sm:text-sm'
            >
              <option value='all'>{t('auditLogs.allActions')}</option>
              <option value='create'>{t('auditLogs.actionCreate')}</option>
              <option value='update'>{t('auditLogs.actionUpdate')}</option>
              <option value='delete'>{t('auditLogs.actionDelete')}</option>
              <option value='login'>{t('auditLogs.actionLogin')}</option>
              <option value='logout'>{t('auditLogs.actionLogout')}</option>
            </select>
          </div>
        </div>

        <div className='mt-4 flex items-center gap-x-4 text-sm'>
          <div className='flex items-center gap-x-2'>
            <DocumentTextIcon className='h-5 w-5 text-slate-400' />
            <span className='text-slate-600'>
              <span className='font-semibold text-slate-900'>{totalLogs.toLocaleString()}</span>{' '}
              {t('auditLogs.totalLogs')}
            </span>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
        <div className='divide-y divide-slate-200'>
          {logs.map(log => (
            <div key={log.id} className='p-6 transition-colors hover:bg-slate-50'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  {/* Header Row */}
                  <div className='mb-3 flex items-center gap-3'>
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                    {getSeverityBadge(log.severity)}
                    <span className='text-xs text-slate-500'>
                      {log.resource_type && `${log.resource_type}`}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className='mb-2 flex items-center gap-4'>
                    <div className='flex items-center gap-2'>
                      <UserCircleIcon className='h-4 w-4 text-slate-400' />
                      <span className='text-sm font-medium text-slate-900'>
                        {log.user_name || log.user_email}
                      </span>
                    </div>
                    {log.organization_name && (
                      <div className='flex items-center gap-2'>
                        <BuildingOfficeIcon className='h-4 w-4 text-slate-400' />
                        <span className='text-sm text-slate-600'>{log.organization_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className='mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-500'>
                      {JSON.stringify(log.metadata, null, 2)}
                    </div>
                  )}

                  {/* Technical Details */}
                  <div className='mt-3 flex items-center gap-4 text-xs text-slate-500'>
                    {log.ip_address && <span>IP: {log.ip_address}</span>}
                    {log.resource_id && <span className='truncate'>ID: {log.resource_id}</span>}
                  </div>
                </div>

                {/* Timestamp */}
                <div className='flex items-center gap-2 text-xs whitespace-nowrap text-slate-500'>
                  <ClockIcon className='h-4 w-4' />
                  <div className='text-right'>
                    <div>{new Date(log.created_at).toLocaleDateString()}</div>
                    <div>{new Date(log.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className='py-12 text-center'>
            <DocumentTextIcon className='mx-auto h-12 w-12 text-slate-400' />
            <h3 className='mt-2 text-sm font-medium text-slate-900'>{t('auditLogs.noLogsFound')}</h3>
            <p className='mt-1 text-sm text-slate-500'>
              {searchQuery || filterSeverity !== 'all' || filterAction !== 'all'
                ? t('auditLogs.noLogsSearchAdjust')
                : t('auditLogs.noLogsRecorded')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalLogs > 50 && (
          <div className='flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4'>
            <div className='flex flex-1 justify-between sm:hidden'>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {t('previous')}
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * 50 >= totalLogs}
                className='relative ml-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {t('next')}
              </button>
            </div>
            <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-slate-700'>
                  {t('showing')} <span className='font-medium'>{(currentPage - 1) * 50 + 1}</span> {t('to')}{' '}
                  <span className='font-medium'>{Math.min(currentPage * 50, totalLogs)}</span> {t('of')}{' '}
                  <span className='font-medium'>{totalLogs}</span> {t('results')}
                </p>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className='relative inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * 50 >= totalLogs}
                  className='relative inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
