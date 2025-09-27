'use client'

import { useState, useEffect } from 'react'
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  CogIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface BulkOperation {
  id: string
  type: 'suspend' | 'reactivate' | 'delete' | 'update_tier' | 'update_settings' | 'export_data' | 'import_data' | 'mass_email'
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  total_items: number
  processed_items: number
  failed_items: number
  created_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
  created_by: string
}

interface Organization {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
  user_count: number
  created_at: string
  last_activity?: string
}

interface BulkOperationConfig {
  type: BulkOperation['type']
  selectedItems: string[]
  parameters: Record<string, any>
}

interface FilterCriteria {
  status?: string[]
  subscription_tier?: string[]
  subscription_status?: string[]
  created_before?: string
  created_after?: string
  last_activity_before?: string
  user_count_min?: number
  user_count_max?: number
  search_query?: string
}

export function BulkOperationsInterface() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [operations, setOperations] = useState<BulkOperation[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewOperation, setShowNewOperation] = useState(false)
  const [operationConfig, setOperationConfig] = useState<BulkOperationConfig>({
    type: 'suspend',
    selectedItems: [],
    parameters: {}
  })
  const [filters, setFilters] = useState<FilterCriteria>({})

  useEffect(() => {
    fetchOrganizations()
    fetchOperations()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [organizations, filters])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOperations = async () => {
    try {
      const response = await fetch('/api/admin/bulk-operations')
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
      }
    } catch (error) {
      console.error('Error fetching operations:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...organizations]

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase()
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query)
      )
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(org => filters.status!.includes(org.status))
    }

    if (filters.subscription_tier && filters.subscription_tier.length > 0) {
      filtered = filtered.filter(org => filters.subscription_tier!.includes(org.subscription_tier))
    }

    if (filters.subscription_status && filters.subscription_status.length > 0) {
      filtered = filtered.filter(org => filters.subscription_status!.includes(org.subscription_status))
    }

    if (filters.user_count_min !== undefined) {
      filtered = filtered.filter(org => org.user_count >= filters.user_count_min!)
    }

    if (filters.user_count_max !== undefined) {
      filtered = filtered.filter(org => org.user_count <= filters.user_count_max!)
    }

    if (filters.created_after) {
      filtered = filtered.filter(org => new Date(org.created_at) >= new Date(filters.created_after!))
    }

    if (filters.created_before) {
      filtered = filtered.filter(org => new Date(org.created_at) <= new Date(filters.created_before!))
    }

    setFilteredOrganizations(filtered)
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredOrganizations.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredOrganizations.map(org => org.id))
    }
  }

  const handleSelectItem = (orgId: string) => {
    setSelectedItems(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const createBulkOperation = async () => {
    try {
      const response = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...operationConfig,
          selectedItems
        })
      })

      if (response.ok) {
        const newOperation = await response.json()
        setOperations(prev => [newOperation, ...prev])
        setShowNewOperation(false)
        setSelectedItems([])
        setOperationConfig({
          type: 'suspend',
          selectedItems: [],
          parameters: {}
        })
      }
    } catch (error) {
      console.error('Error creating bulk operation:', error)
    }
  }

  const getOperationIcon = (type: BulkOperation['type']) => {
    switch (type) {
      case 'suspend': return PauseIcon
      case 'reactivate': return PlayIcon
      case 'delete': return TrashIcon
      case 'update_tier': return CogIcon
      case 'export_data': return CloudArrowDownIcon
      case 'import_data': return CloudArrowUpIcon
      case 'mass_email': return DocumentDuplicateIcon
      default: return CogIcon
    }
  }

  const getStatusColor = (status: BulkOperation['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getOrgStatusColor = (status: Organization['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'suspended': return 'text-red-600 bg-red-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Perform bulk actions on multiple organizations simultaneously
          </p>
        </div>
        <button
          onClick={() => setShowNewOperation(true)}
          disabled={selectedItems.length === 0}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selectedItems.length > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Create Operation ({selectedItems.length} selected)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={filters.search_query || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search_query: e.target.value }))}
                className="pl-10 w-full rounded-md border-gray-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              multiple
              value={filters.status || []}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full rounded-md border-gray-300 text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending_setup">Pending Setup</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
            <select
              multiple
              value={filters.subscription_tier || []}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                subscription_tier: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full rounded-md border-gray-300 text-sm"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Users</label>
            <input
              type="number"
              placeholder="0"
              value={filters.user_count_min || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                user_count_min: e.target.value ? parseInt(e.target.value) : undefined
              }))}
              className="w-full rounded-md border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
            <input
              type="number"
              placeholder="999"
              value={filters.user_count_max || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                user_count_max: e.target.value ? parseInt(e.target.value) : undefined
              }))}
              className="w-full rounded-md border-gray-300 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredOrganizations.length} of {organizations.length} organizations
          </div>
          <button
            onClick={() => setFilters({})}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Organizations</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredOrganizations.length && filteredOrganizations.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-600">Select all</span>
              </label>
            </div>
          </div>
        </div>

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
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrganizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{org.name}</div>
                      <div className="text-sm text-gray-500">{org.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOrgStatusColor(org.status)}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.subscription_tier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(org.id)}
                      onChange={() => handleSelectItem(org.id)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Operations</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {operations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No bulk operations found
            </div>
          ) : (
            operations.slice(0, 10).map((operation) => {
              const Icon = getOperationIcon(operation.type)
              return (
                <div key={operation.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{operation.name}</div>
                        <div className="text-sm text-gray-500">{operation.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-900">
                          {operation.processed_items} / {operation.total_items}
                        </div>
                        <div className="text-xs text-gray-500">
                          {operation.failed_items > 0 && `${operation.failed_items} failed`}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                    </div>
                  </div>
                  {operation.status === 'running' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${operation.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* New Operation Modal */}
      {showNewOperation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Bulk Operation</h3>
              <button
                onClick={() => setShowNewOperation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
                <select
                  value={operationConfig.type}
                  onChange={(e) => setOperationConfig(prev => ({
                    ...prev,
                    type: e.target.value as BulkOperation['type'],
                    parameters: {}
                  }))}
                  className="w-full rounded-md border-gray-300"
                >
                  <option value="suspend">Suspend Organizations</option>
                  <option value="reactivate">Reactivate Organizations</option>
                  <option value="update_tier">Update Subscription Tier</option>
                  <option value="update_settings">Update Settings</option>
                  <option value="export_data">Export Organization Data</option>
                  <option value="mass_email">Send Mass Email</option>
                </select>
              </div>

              {/* Dynamic parameters based on operation type */}
              {operationConfig.type === 'suspend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Reason</label>
                  <textarea
                    value={operationConfig.parameters.reason || ''}
                    onChange={(e) => setOperationConfig(prev => ({
                      ...prev,
                      parameters: { ...prev.parameters, reason: e.target.value }
                    }))}
                    className="w-full rounded-md border-gray-300"
                    rows={3}
                    placeholder="Enter reason for suspension..."
                  />
                </div>
              )}

              {operationConfig.type === 'update_tier' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Subscription Tier</label>
                  <select
                    value={operationConfig.parameters.new_tier || ''}
                    onChange={(e) => setOperationConfig(prev => ({
                      ...prev,
                      parameters: { ...prev.parameters, new_tier: e.target.value }
                    }))}
                    className="w-full rounded-md border-gray-300"
                  >
                    <option value="">Select tier...</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              )}

              {operationConfig.type === 'mass_email' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                    <input
                      type="text"
                      value={operationConfig.parameters.subject || ''}
                      onChange={(e) => setOperationConfig(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, subject: e.target.value }
                      }))}
                      className="w-full rounded-md border-gray-300"
                      placeholder="Enter email subject..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
                    <textarea
                      value={operationConfig.parameters.content || ''}
                      onChange={(e) => setOperationConfig(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, content: e.target.value }
                      }))}
                      className="w-full rounded-md border-gray-300"
                      rows={6}
                      placeholder="Enter email content..."
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Organizations</h4>
                <p className="text-sm text-gray-600">
                  This operation will affect <strong>{selectedItems.length}</strong> organizations.
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {selectedItems.slice(0, 10).map(id => {
                    const org = organizations.find(o => o.id === id)
                    return org ? (
                      <div key={id} className="text-xs text-gray-500">• {org.name}</div>
                    ) : null
                  })}
                  {selectedItems.length > 10 && (
                    <div className="text-xs text-gray-500">... and {selectedItems.length - 10} more</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewOperation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createBulkOperation}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Create Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}