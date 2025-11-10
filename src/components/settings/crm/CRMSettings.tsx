'use client'

/**
 * CRM Settings Component
 *
 * Main component for managing CRM integrations
 */

import { useState } from 'react'
import { CRMConnectionCard } from './CRMConnectionCard'
import { CRMSyncHistory } from './CRMSyncHistory'
import { CRMFieldMapping } from './CRMFieldMapping'

interface CRMConnection {
  id: string
  crm_type: 'salesforce' | 'hubspot' | 'pipedrive'
  status: string
  last_sync_at: string | null
  last_error: string | null
  settings: any
}

interface CRMSettingsProps {
  organizationId: string
  connections: CRMConnection[]
  syncHistory: Array<{
    connectionId: string
    crmType: string
    logs: any[]
  }>
}

const CRM_TYPES = [
  {
    type: 'salesforce' as const,
    name: 'Salesforce',
    description: 'Connect your Salesforce CRM to sync contacts and opportunities',
    icon: '⚡',
    color: 'blue',
  },
  {
    type: 'hubspot' as const,
    name: 'HubSpot',
    description: 'Sync contacts, deals, and activities with HubSpot',
    icon: '🟠',
    color: 'orange',
  },
  {
    type: 'pipedrive' as const,
    name: 'Pipedrive',
    description: 'Connect Pipedrive to manage your sales pipeline',
    icon: '🟢',
    color: 'green',
  },
]

export default function CRMSettings({ organizationId, connections, syncHistory }: CRMSettingsProps) {
  const [selectedCRM, setSelectedCRM] = useState<string | null>(null)
  const [showFieldMapping, setShowFieldMapping] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const getConnection = (crmType: string) => {
    return connections.find(c => c.crm_type === crmType)
  }

  const handleConnect = async (crmType: string) => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/crm/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmType, config: {} }),
      })

      const data = await response.json()

      if (data.authUrl) {
        // Redirect to OAuth flow
        window.location.href = data.authUrl
      } else if (data.connectionId) {
        // Direct connection (Pipedrive)
        window.location.reload()
      } else {
        alert('Failed to connect CRM')
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert('Failed to connect CRM')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (crmType: string) => {
    if (!confirm(`Are you sure you want to disconnect ${crmType}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/crm/connect?crm_type=${crmType}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to disconnect CRM')
      }
    } catch (error) {
      console.error('Disconnection error:', error)
      alert('Failed to disconnect CRM')
    }
  }

  const handleSync = async (crmType: string, syncType = 'delta') => {
    try {
      const response = await fetch('/api/crm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmType, syncType }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Sync completed: ${data.recordsSuccess}/${data.recordsProcessed} records synced`)
        window.location.reload()
      } else {
        alert('Sync failed. Check the sync history for details.')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Failed to trigger sync')
    }
  }

  return (
    <div className="space-y-8">
      {/* CRM Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CRM_TYPES.map(crm => {
          const connection = getConnection(crm.type)
          const history = syncHistory.find(h => h.crmType === crm.type)

          return (
            <CRMConnectionCard
              key={crm.type}
              crm={crm}
              connection={connection}
              isConnecting={isConnecting}
              onConnect={() => handleConnect(crm.type)}
              onDisconnect={() => handleDisconnect(crm.type)}
              onSync={() => handleSync(crm.type)}
              onConfigure={() => setSelectedCRM(crm.type)}
              onViewMapping={() => {
                setSelectedCRM(crm.type)
                setShowFieldMapping(true)
              }}
            />
          )
        })}
      </div>

      {/* Sync History */}
      {connections.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Sync History</h2>
          <CRMSyncHistory
            syncHistory={syncHistory}
            onRetrySync={(crmType) => handleSync(crmType, 'full')}
          />
        </div>
      )}

      {/* Field Mapping Modal */}
      {selectedCRM && showFieldMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-semibold">
                Field Mapping - {CRM_TYPES.find(c => c.type === selectedCRM)?.name}
              </h2>
              <button
                onClick={() => {
                  setShowFieldMapping(false)
                  setSelectedCRM(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <CRMFieldMapping
                organizationId={organizationId}
                crmType={selectedCRM}
                onSave={() => {
                  setShowFieldMapping(false)
                  setSelectedCRM(null)
                  window.location.reload()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2 text-blue-900">Need Help?</h3>
        <p className="text-blue-800 mb-4">
          Learn how to set up CRM integrations and configure field mappings.
        </p>
        <ul className="space-y-2 text-blue-800">
          <li>• Automatic sync runs every 15 minutes</li>
          <li>• You can trigger manual sync anytime</li>
          <li>• Conflicts are detected and require manual resolution</li>
          <li>• Field mappings can be customized per CRM</li>
        </ul>
      </div>
    </div>
  )
}
