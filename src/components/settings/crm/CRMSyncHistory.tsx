'use client'

/**
 * CRM Sync History Component
 */

interface SyncLog {
  id: string
  sync_type: string
  direction: string
  status: string
  records_processed: number
  records_success: number
  records_failed: number
  started_at: string
  completed_at: string | null
}

interface CRMSyncHistoryProps {
  syncHistory: Array<{
    connectionId: string
    crmType: string
    logs: SyncLog[]
  }>
  onRetrySync: (crmType: string) => void
}

export function CRMSyncHistory({ syncHistory, onRetrySync }: CRMSyncHistoryProps) {
  const allLogs = syncHistory.flatMap(h =>
    h.logs.map(log => ({
      ...log,
      crmType: h.crmType,
    }))
  )

  // Sort by start time, most recent first
  const sortedLogs = allLogs.sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    )
  }

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress'

    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    const durationSeconds = Math.floor((end - start) / 1000)

    if (durationSeconds < 60) return `${durationSeconds}s`
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60
    return `${minutes}m ${seconds}s`
  }

  if (sortedLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No sync history yet</p>
        <p className="text-sm mt-2">Sync logs will appear here after your first sync</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CRM
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Started At
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedLogs.slice(0, 10).map((log: any) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-medium capitalize">{log.crmType}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-600">{log.sync_type}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(log.status)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{log.records_success}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-gray-600">{log.records_processed}</span>
                  {log.records_failed > 0 && (
                    <>
                      <span className="text-gray-400 mx-1">|</span>
                      <span className="text-red-600">{log.records_failed} failed</span>
                    </>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {formatDuration(log.started_at, log.completed_at)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {new Date(log.started_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {log.status === 'failed' && (
                  <button
                    onClick={() => onRetrySync(log.crmType)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
