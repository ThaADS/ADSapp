'use client'

import { useEffect, useState } from 'react'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/components/providers/translation-provider'

interface User {
  id: string
  email: string
  full_name: string | null
  organization_id: string | null
  organization_name: string | null
  role: string
  is_super_admin: boolean
  last_seen: string | null
  created_at: string
}

interface UsersResponse {
  data: User[]
  total: number
  page: number
  limit: number
}

export function UsersManager() {
  const t = useTranslations('admin')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchQuery, filterRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterRole !== 'all' && { role: filterRole }),
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const result: UsersResponse = await response.json()
      setUsers(result.data || [])
      setTotalUsers(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'))
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) {
      return (
        <span className='inline-flex items-center gap-x-1.5 rounded-full bg-gradient-to-r from-red-50 to-red-100 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset'>
          <svg className='h-1.5 w-1.5 fill-red-500' viewBox='0 0 6 6' aria-hidden='true'>
            <circle cx={3} cy={3} r={3} />
          </svg>
          {t('superAdmin')}
        </span>
      )
    }

    const colors: Record<string, string> = {
      owner: 'bg-purple-50 text-purple-700 ring-purple-600/20',
      admin: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      agent: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      viewer: 'bg-slate-50 text-slate-700 ring-slate-600/20',
    }

    const roleName = t(role as any) || role.charAt(0).toUpperCase() + role.slice(1)

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${colors[role] || colors.viewer}`}
      >
        {roleName}
      </span>
    )
  }

  if (loading && users.length === 0) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600'></div>
          <p className='mt-4 text-sm text-slate-600'>{t('loadingUsers')}</p>
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
            <h3 className='text-sm font-medium text-red-800'>{t('errorLoadingUsers')}</h3>
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
        <h2 className='text-2xl font-bold text-slate-900'>{t('users')}</h2>
        <p className='mt-2 text-sm text-slate-600'>
          {t('manageUsers')}
        </p>
      </div>

      {/* Filters and Search */}
      <div className='rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5'>
        <div className='flex flex-col gap-4 sm:flex-row'>
          {/* Search */}
          <div className='flex-1'>
            <div className='relative'>
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                <MagnifyingGlassIcon className='h-5 w-5 text-slate-400' aria-hidden='true' />
              </div>
              <input
                type='text'
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='block w-full rounded-lg border-0 py-2.5 pr-3 pl-10 text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 focus:ring-inset sm:text-sm sm:leading-6'
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className='sm:w-48'>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className='block w-full rounded-lg border-0 py-2.5 pr-10 pl-3 text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6'
            >
              <option value='all'>{t('allRoles')}</option>
              {/* Note: We rely on the role values staying in English for API filtering, 
                  but we could translate the display text if we had a mapping. 
                  For now, let's keep them as is or map them manually. */}
              <option value='owner'>{t('admin', { defaultValue: 'Owner' })}</option>
              <option value='admin'>{t('admin')}</option>
              <option value='agent'>{t('agent')}</option>
              <option value='viewer'>{t('viewer')}</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className='mt-4 flex items-center gap-x-4 text-sm'>
          <div className='flex items-center gap-x-2'>
            <UsersIcon className='h-5 w-5 text-slate-400' />
            <span className='text-slate-600'>
              <span className='font-semibold text-slate-900'>{totalUsers}</span> {t('totalUsers')}
            </span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-slate-200'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='py-3.5 pr-3 pl-6 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('userName')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('organizations')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('userRole')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('lastLogin')}
                </th>
                <th className='px-3 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-900 uppercase'>
                  {t('createdDate')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-200 bg-white'>
              {users.map(user => (
                <tr key={user.id} className='transition-colors hover:bg-slate-50'>
                  <td className='py-4 pr-3 pl-6 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='h-10 w-10 flex-shrink-0'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 font-semibold text-white'>
                          {user.full_name
                            ? user.full_name.charAt(0).toUpperCase()
                            : user.email.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className='ml-4'>
                        <div className='font-medium text-slate-900'>
                          {user.full_name || 'No name'}
                        </div>
                        <div className='flex items-center gap-x-1.5 text-slate-500'>
                          <EnvelopeIcon className='h-3.5 w-3.5' />
                          <span className='text-xs'>{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap'>
                    {user.organization_name ? (
                      <div className='flex items-center gap-x-2'>
                        <BuildingOfficeIcon className='h-4 w-4 text-slate-400' />
                        <span className='text-sm text-slate-900'>{user.organization_name}</span>
                      </div>
                    ) : (
                      <span className='text-sm text-slate-400'>No organization</span>
                    )}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap'>
                    {getRoleBadge(user.role, user.is_super_admin)}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-slate-500'>
                    {user.last_seen ? (
                      <div className='flex items-center gap-x-1.5'>
                        <CheckCircleIcon className='h-4 w-4 text-emerald-500' />
                        {new Date(user.last_seen).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className='text-slate-400'>Never</span>
                    )}
                  </td>
                  <td className='px-3 py-4 text-sm whitespace-nowrap text-slate-500'>
                    <div className='flex items-center gap-x-1.5'>
                      <CalendarIcon className='h-4 w-4 text-slate-400' />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className='py-12 text-center'>
              <UsersIcon className='mx-auto h-12 w-12 text-slate-400' />
              <h3 className='mt-2 text-sm font-medium text-slate-900'>{t('noUsers')}</h3>
              <p className='mt-1 text-sm text-slate-500'>
                {searchQuery || filterRole !== 'all'
                  ? t('noUsersDesc')
                  : t('noUsersCreated')}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalUsers > 20 && (
          <div className='flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4'>
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
                disabled={currentPage * 20 >= totalUsers}
                className='relative ml-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {t('next')}
              </button>
            </div>
            <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-slate-700'>
                  {t('showing')} <span className='font-medium'>{(currentPage - 1) * 20 + 1}</span> {t('to')}{' '}
                  <span className='font-medium'>{Math.min(currentPage * 20, totalUsers)}</span> {t('of')}{' '}
                  <span className='font-medium'>{totalUsers}</span> {t('results')}
                </p>
              </div>
              <div>
                <nav
                  className='isolate inline-flex -space-x-px rounded-lg shadow-sm'
                  aria-label='Pagination'
                >
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className='relative inline-flex items-center rounded-l-lg px-2 py-2 text-slate-400 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <span className='sr-only'>{t('previous')}</span>
                    <svg
                      className='h-5 w-5'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                      aria-hidden='true'
                    >
                      <path
                        fillRule='evenodd'
                        d='M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * 20 >= totalUsers}
                    className='relative inline-flex items-center rounded-r-lg px-2 py-2 text-slate-400 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <span className='sr-only'>{t('next')}</span>
                    <svg
                      className='h-5 w-5'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                      aria-hidden='true'
                    >
                      <path
                        fillRule='evenodd'
                        d='M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
