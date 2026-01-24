'use client'

/**
 * CatalogSettings Component
 *
 * Allows admins to configure their WhatsApp catalog connection,
 * view sync status, and trigger manual syncs.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ShoppingBagIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import type { WhatsAppCatalog, CatalogSyncStatus } from '@/types/whatsapp-catalog'

export function CatalogSettings() {
  const [catalog, setCatalog] = useState<WhatsAppCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [catalogId, setCatalogId] = useState('')
  const [catalogName, setCatalogName] = useState('')

  // Fetch current catalog config
  const fetchCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/catalog')
      if (!response.ok) {
        if (response.status === 404) {
          // No catalog configured yet
          setCatalog(null)
          return
        }
        throw new Error('Failed to fetch catalog')
      }
      const data = await response.json()
      setCatalog(data.catalog)
      if (data.catalog) {
        setCatalogId(data.catalog.catalog_id)
        setCatalogName(data.catalog.catalog_name || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Save catalog config
  const handleSave = async () => {
    if (!catalogId.trim()) {
      setError('Catalog ID is required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/whatsapp/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: catalogId.trim(),
          catalog_name: catalogName.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save catalog')
      }

      const data = await response.json()
      setCatalog(data.catalog)
      setSuccess('Catalog configuration saved successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save catalog')
    } finally {
      setSaving(false)
    }
  }

  // Trigger sync
  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/whatsapp/catalog/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sync catalog')
      }

      const data = await response.json()
      setSuccess(`Synced ${data.products_synced} products successfully`)

      // Refresh catalog data
      await fetchCatalog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync catalog')
    } finally {
      setSyncing(false)
    }
  }

  // Delete catalog
  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to remove the catalog configuration? This will delete all synced products.'
      )
    ) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/whatsapp/catalog', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete catalog')
      }

      setCatalog(null)
      setCatalogId('')
      setCatalogName('')
      setSuccess('Catalog configuration removed successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete catalog')
    } finally {
      setSaving(false)
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: CatalogSyncStatus }) => {
    const variants: Record<
      CatalogSyncStatus,
      { icon: React.ReactNode; className: string; label: string }
    > = {
      pending: {
        icon: <ClockIcon className="h-4 w-4" />,
        className: 'bg-yellow-100 text-yellow-800',
        label: 'Pending',
      },
      syncing: {
        icon: <ArrowPathIcon className="h-4 w-4 animate-spin" />,
        className: 'bg-blue-100 text-blue-800',
        label: 'Syncing',
      },
      success: {
        icon: <CheckCircleIcon className="h-4 w-4" />,
        className: 'bg-emerald-100 text-emerald-800',
        label: 'Synced',
      },
      error: {
        icon: <XCircleIcon className="h-4 w-4" />,
        className: 'bg-red-100 text-red-800',
        label: 'Error',
      },
    }

    const variant = variants[status]

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium',
          variant.className
        )}
      >
        {variant.icon}
        {variant.label}
      </span>
    )
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <ShoppingBagIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">WhatsApp Product Catalog</h3>
            <p className="text-sm text-gray-500">
              Connect your Meta Commerce Manager catalog to send product messages
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Error alert */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Error</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success alert */}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              <div>
                <h4 className="text-sm font-medium text-emerald-800">Success</h4>
                <p className="mt-1 text-sm text-emerald-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status section (when configured) */}
        {catalog && (
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <StatusBadge status={catalog.sync_status} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Products</span>
              <span className="text-sm text-gray-600">{catalog.product_count} products synced</span>
            </div>

            {catalog.last_sync_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Last Sync</span>
                <span className="text-sm text-gray-600">
                  {formatDateTime(catalog.last_sync_at)}
                </span>
              </div>
            )}

            {catalog.sync_error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{catalog.sync_error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncing || catalog.sync_status === 'syncing'}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowPathIcon className={cn('h-4 w-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* Configuration form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="catalogId" className="block text-sm font-medium text-gray-700">
              Catalog ID
            </label>
            <input
              id="catalogId"
              type="text"
              placeholder="Enter your catalog ID"
              value={catalogId}
              onChange={e => setCatalogId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500">
              Find your catalog ID in{' '}
              <a
                href="https://business.facebook.com/commerce"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Meta Commerce Manager
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="catalogName" className="block text-sm font-medium text-gray-700">
              Display Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="catalogName"
              type="text"
              placeholder="My Product Catalog"
              value={catalogName}
              onChange={e => setCatalogName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
        {catalog ? (
          <>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              Remove Catalog
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !catalogId.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Configuration'
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !catalogId.trim()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Catalog'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default CatalogSettings
