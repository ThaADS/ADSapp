'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OrganizationSummary } from '@/lib/super-admin'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const statusColors = {
  active: 'text-green-700 bg-green-50 ring-green-600/20',
  suspended: 'text-red-700 bg-red-50 ring-red-600/20',
  cancelled: 'text-gray-700 bg-gray-50 ring-gray-600/20',
  pending_setup: 'text-yellow-700 bg-yellow-50 ring-yellow-600/20'
}

const subscriptionColors = {
  trial: 'text-blue-700 bg-blue-50 ring-blue-600/20',
  active: 'text-green-700 bg-green-50 ring-green-600/20',
  cancelled: 'text-red-700 bg-red-50 ring-red-600/20',
  past_due: 'text-orange-700 bg-orange-50 ring-orange-600/20'
}

function StatusBadge({ status, type }: { status: string, type: 'status' | 'subscription' }) {
  const colors = type === 'status' ? statusColors : subscriptionColors
  const colorClass = colors[status as keyof typeof colors] || 'text-gray-700 bg-gray-50 ring-gray-600/20'

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorClass}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function OrganizationsManager() {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    fetchOrganizations()
  }, [page, search, statusFilter])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`/api/admin/organizations?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      setOrganizations(data.organizations)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendOrganization = async (orgId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        throw new Error('Failed to suspend organization')
      }

      fetchOrganizations() // Refresh the list
    } catch (error) {
      console.error('Error suspending organization:', error)
      alert('Failed to suspend organization')
    }
  }

  const handleReactivateOrganization = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/suspend`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate organization')
      }

      fetchOrganizations() // Refresh the list
    } catch (error) {
      console.error('Error reactivating organization:', error)
      alert('Failed to reactivate organization')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <div className="text-sm text-gray-500">
          {total} total organizations
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending_setup">Pending Setup</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading organizations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={fetchOrganizations}
              className="text-blue-600 hover:text-blue-500"
            >
              Try again
            </button>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No organizations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={org.status} type="status" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={org.subscription_status} type="subscription" />
                        <div className="text-xs text-gray-500 capitalize">{org.subscription_tier}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {org.user_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {org.message_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      {org.status === 'active' ? (
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for suspension:')
                            if (reason) {
                              handleSuspendOrganization(org.id, reason)
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Suspend Organization"
                        >
                          <ExclamationTriangleIcon className="h-4 w-4" />
                        </button>
                      ) : org.status === 'suspended' ? (
                        <button
                          onClick={() => {
                            if (confirm('Reactivate this organization?')) {
                              handleReactivateOrganization(org.id)
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Reactivate Organization"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}