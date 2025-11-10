/**
 * CRM Sync Background Jobs
 *
 * Scheduled jobs for automatic CRM synchronization
 */

import { createClient } from '../supabase/server'
import { createSyncManager } from '../crm/sync-manager'

export interface SyncJobResult {
  success: boolean
  organizationId: string
  crmType: string
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  duration: number
  errors: any[]
}

/**
 * Run delta sync for all active CRM connections
 * Should be run every 15 minutes
 */
export async function runScheduledDeltaSync(): Promise<SyncJobResult[]> {
  console.log('[CRM Sync] Starting scheduled delta sync...')

  const supabase = await createClient()
  const results: SyncJobResult[] = []

  try {
    // Get all active CRM connections
    const { data: connections, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('status', 'active')

    if (error) {
      console.error('[CRM Sync] Error fetching connections:', error)
      return results
    }

    if (!connections || connections.length === 0) {
      console.log('[CRM Sync] No active connections found')
      return results
    }

    console.log(`[CRM Sync] Found ${connections.length} active connections`)

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(
          `[CRM Sync] Syncing ${connection.crm_type} for organization ${connection.organization_id}`
        )

        const syncManager = await createSyncManager(
          connection.organization_id,
          connection.crm_type
        )

        const result = await syncManager.deltaSync()

        results.push({
          success: result.success,
          organizationId: connection.organization_id,
          crmType: connection.crm_type,
          recordsProcessed: result.recordsProcessed,
          recordsSuccess: result.recordsSuccess,
          recordsFailed: result.recordsFailed,
          duration: result.duration,
          errors: result.errors,
        })

        console.log(
          `[CRM Sync] Completed ${connection.crm_type} sync: ${result.recordsSuccess}/${result.recordsProcessed} records`
        )

        // Update connection last sync time
        await supabase
          .from('crm_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_error: result.success ? null : result.errors[0]?.error || 'Unknown error',
            status: result.success ? 'active' : 'error',
          })
          .eq('id', connection.id)
      } catch (error) {
        console.error(
          `[CRM Sync] Error syncing ${connection.crm_type} for organization ${connection.organization_id}:`,
          error
        )

        results.push({
          success: false,
          organizationId: connection.organization_id,
          crmType: connection.crm_type,
          recordsProcessed: 0,
          recordsSuccess: 0,
          recordsFailed: 0,
          duration: 0,
          errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        })

        // Update connection with error
        await supabase
          .from('crm_connections')
          .update({
            last_error: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
          })
          .eq('id', connection.id)
      }
    }

    console.log(`[CRM Sync] Scheduled delta sync completed. Processed ${results.length} connections`)

    return results
  } catch (error) {
    console.error('[CRM Sync] Fatal error in scheduled sync:', error)
    return results
  }
}

/**
 * Run full sync for a specific connection
 * Should be run weekly or on-demand
 */
export async function runFullSync(
  organizationId: string,
  crmType: 'salesforce' | 'hubspot' | 'pipedrive'
): Promise<SyncJobResult> {
  console.log(`[CRM Sync] Starting full sync for ${crmType} - ${organizationId}`)

  try {
    const syncManager = await createSyncManager(organizationId, crmType)
    const result = await syncManager.fullSync()

    console.log(
      `[CRM Sync] Full sync completed: ${result.recordsSuccess}/${result.recordsProcessed} records`
    )

    return {
      success: result.success,
      organizationId,
      crmType,
      recordsProcessed: result.recordsProcessed,
      recordsSuccess: result.recordsSuccess,
      recordsFailed: result.recordsFailed,
      duration: result.duration,
      errors: result.errors,
    }
  } catch (error) {
    console.error(`[CRM Sync] Error in full sync:`, error)

    return {
      success: false,
      organizationId,
      crmType,
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsFailed: 0,
      duration: 0,
      errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
    }
  }
}

/**
 * Cleanup old sync logs
 * Should be run daily
 */
export async function cleanupOldSyncLogs(): Promise<number> {
  console.log('[CRM Sync] Cleaning up old sync logs...')

  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('cleanup_old_sync_logs')

    if (error) {
      console.error('[CRM Sync] Error cleaning up logs:', error)
      return 0
    }

    console.log(`[CRM Sync] Cleaned up ${data} old sync logs`)
    return data || 0
  } catch (error) {
    console.error('[CRM Sync] Fatal error cleaning up logs:', error)
    return 0
  }
}

/**
 * Detect and mark sync conflicts
 * Should be run hourly
 */
export async function detectSyncConflicts(): Promise<void> {
  console.log('[CRM Sync] Detecting sync conflicts...')

  const supabase = await createClient()

  try {
    // Get all active connections
    const { data: connections } = await supabase
      .from('crm_connections')
      .select('id, organization_id, crm_type')
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return
    }

    for (const connection of connections) {
      // Detect conflicts for this connection
      const { data: conflicts } = await supabase.rpc('detect_sync_conflicts', {
        p_connection_id: connection.id,
      })

      if (conflicts && conflicts.length > 0) {
        console.log(
          `[CRM Sync] Found ${conflicts.length} conflicts for ${connection.crm_type} - ${connection.organization_id}`
        )

        // Mark conflicts in sync state
        for (const conflict of conflicts) {
          await supabase
            .from('crm_sync_state')
            .update({
              conflict_detected: true,
              conflict_details: {
                detected_at: new Date().toISOString(),
                adsapp_updated_at: conflict.adsapp_updated_at,
                crm_updated_at: conflict.crm_updated_at,
                last_synced_at: conflict.last_synced_at,
              },
            })
            .eq('contact_id', conflict.contact_id)
            .eq('connection_id', connection.id)
        }
      }
    }

    console.log('[CRM Sync] Conflict detection completed')
  } catch (error) {
    console.error('[CRM Sync] Error detecting conflicts:', error)
  }
}

/**
 * Retry failed syncs
 * Should be run every hour
 */
export async function retryFailedSyncs(): Promise<SyncJobResult[]> {
  console.log('[CRM Sync] Retrying failed syncs...')

  const supabase = await createClient()
  const results: SyncJobResult[] = []

  try {
    // Get connections with recent failed syncs
    const { data: failedSyncs } = await supabase
      .from('crm_sync_logs')
      .select('connection_id, crm_connections(organization_id, crm_type)')
      .eq('status', 'failed')
      .gte('started_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(5) // Limit retries per run

    if (!failedSyncs || failedSyncs.length === 0) {
      console.log('[CRM Sync] No failed syncs to retry')
      return results
    }

    for (const sync of failedSyncs) {
      try {
        const connection = (sync as any).crm_connections
        if (!connection) continue

        console.log(`[CRM Sync] Retrying ${connection.crm_type} sync...`)

        const syncManager = await createSyncManager(connection.organization_id, connection.crm_type)
        const result = await syncManager.deltaSync()

        results.push({
          success: result.success,
          organizationId: connection.organization_id,
          crmType: connection.crm_type,
          recordsProcessed: result.recordsProcessed,
          recordsSuccess: result.recordsSuccess,
          recordsFailed: result.recordsFailed,
          duration: result.duration,
          errors: result.errors,
        })
      } catch (error) {
        console.error('[CRM Sync] Error retrying sync:', error)
      }
    }

    console.log(`[CRM Sync] Retry completed. Processed ${results.length} failed syncs`)

    return results
  } catch (error) {
    console.error('[CRM Sync] Fatal error in retry:', error)
    return results
  }
}

/**
 * Health check for CRM connections
 * Should be run every 5 minutes
 */
export async function healthCheckConnections(): Promise<void> {
  console.log('[CRM Sync] Running health check on CRM connections...')

  const supabase = await createClient()

  try {
    // Get all active connections
    const { data: connections } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return
    }

    for (const connection of connections) {
      try {
        const syncManager = await createSyncManager(
          connection.organization_id,
          connection.crm_type
        )

        const status = await syncManager.getConnectionStatus()

        // Update connection status
        await supabase
          .from('crm_connections')
          .update({
            status: status.connected ? 'active' : 'error',
            last_error: status.connected ? null : status.lastError,
          })
          .eq('id', connection.id)

        if (!status.connected) {
          console.warn(
            `[CRM Sync] Connection unhealthy: ${connection.crm_type} - ${connection.organization_id}`
          )
        }
      } catch (error) {
        console.error(
          `[CRM Sync] Error checking ${connection.crm_type} connection:`,
          error
        )
      }
    }

    console.log('[CRM Sync] Health check completed')
  } catch (error) {
    console.error('[CRM Sync] Fatal error in health check:', error)
  }
}
