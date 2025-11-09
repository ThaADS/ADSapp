'use client'

/**
 * CRM Connection Card Component
 */

import { useState } from 'react'

interface CRMConnectionCardProps {
  crm: {
    type: string
    name: string
    description: string
    icon: string
    color: string
  }
  connection?: {
    id: string
    status: string
    last_sync_at: string | null
    last_error: string | null
  }
  isConnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
  onConfigure: () => void
  onViewMapping: () => void
}

export function CRMConnectionCard({
  crm,
  connection,
  isConnecting,
  onConnect,
  onDisconnect,
  onSync,
  onConfigure,
  onViewMapping,
}: CRMConnectionCardProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusColor = () => {
    if (!connection) return 'gray'
    switch (connection.status) {
      case 'active':
        return 'green'
      case 'error':
        return 'red'
      case 'paused':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const statusColor = getStatusColor()

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-4xl">{crm.icon}</div>
          <div>
            <h3 className="text-lg font-semibold">{crm.name}</h3>
            {connection && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}
              >
                {connection.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{crm.description}</p>

      {/* Connection Info */}
      {connection && (
        <div className="mb-4 space-y-2">
          {connection.last_sync_at && (
            <p className="text-xs text-gray-500">
              Last sync: {new Date(connection.last_sync_at).toLocaleString()}
            </p>
          )}
          {connection.last_error && (
            <p className="text-xs text-red-600 truncate" title={connection.last_error}>
              Error: {connection.last_error}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!connection ? (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              isConnecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : `bg-${crm.color}-600 text-white hover:bg-${crm.color}-700`
            }`}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        ) : (
          <>
            <button
              onClick={handleSync}
              disabled={isSyncing || connection.status !== 'active'}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isSyncing || connection.status !== 'active'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <div className="flex space-x-2">
              <button
                onClick={onViewMapping}
                className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Field Mapping
              </button>
              <button
                onClick={onDisconnect}
                className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
