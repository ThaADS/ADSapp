/**
 * CRM Sync Manager
 *
 * Central orchestration for bi-directional synchronization across all CRM integrations
 */

import { createClient } from '../supabase/server'
import { CRMClient, CRMClientFactory, SyncResult, CRMCredentials } from './base-client'
import { SalesforceSync, SyncOptions, SyncState } from './salesforce/sync'
import { HubSpotSync } from './hubspot/sync'
import { PipedriveSync } from './pipedrive/sync'

export interface SyncManagerConfig {
  organizationId: string
  crmType: 'salesforce' | 'hubspot' | 'pipedrive'
  credentials: CRMCredentials
  syncOptions: SyncOptions
}

export interface SyncLogEntry {
  id: string
  connectionId: string
  syncType: 'full' | 'delta' | 'webhook'
  direction: 'to_crm' | 'from_crm' | 'bidirectional'
  status: 'running' | 'completed' | 'failed'
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  errors: any[]
  startedAt: Date
  completedAt?: Date
}

export class CRMSyncManager {
  private config: SyncManagerConfig
  private client: CRMClient
  private syncEngine: SalesforceSync | HubSpotSync | PipedriveSync

  constructor(config: SyncManagerConfig) {
    this.config = config
    this.client = CRMClientFactory.create(config.crmType, config.credentials)

    // Initialize sync engine based on CRM type
    switch (config.crmType) {
      case 'salesforce':
        this.syncEngine = new SalesforceSync(this.client as any)
        break
      case 'hubspot':
        this.syncEngine = new HubSpotSync(this.client as any)
        break
      case 'pipedrive':
        this.syncEngine = new PipedriveSync(this.client as any)
        break
    }
  }

  /**
   * Perform full sync
   */
  async fullSync(): Promise<SyncResult> {
    const supabase = await createClient()

    // Create sync log entry
    const logId = await this.createSyncLog('full', this.config.syncOptions.direction)

    try {
      // Update log status to running
      await this.updateSyncLog(logId, { status: 'running' })

      // Get ADSapp contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', this.config.organizationId)

      if (contactsError) {
        throw contactsError
      }

      // Get sync states
      const syncStates = await this.getSyncStates()

      // Perform sync
      const result = await this.syncEngine.fullSync(
        contacts || [],
        syncStates,
        this.config.syncOptions
      )

      // Update sync log
      await this.updateSyncLog(logId, {
        status: result.success ? 'completed' : 'failed',
        recordsProcessed: result.recordsProcessed,
        recordsSuccess: result.recordsSuccess,
        recordsFailed: result.recordsFailed,
        errors: result.errors,
        completedAt: new Date(),
      })

      // Update sync states
      await this.updateSyncStates(syncStates)

      return result
    } catch (error) {
      // Update log with error
      await this.updateSyncLog(logId, {
        status: 'failed',
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        completedAt: new Date(),
      })

      throw error
    }
  }

  /**
   * Perform delta sync (only changed records since last sync)
   */
  async deltaSync(): Promise<SyncResult> {
    const supabase = await createClient()

    // Get last sync time
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('last_sync_at')
      .eq('organization_id', this.config.organizationId)
      .eq('crm_type', this.config.crmType)
      .single()

    const since = connection?.last_sync_at ? new Date(connection.last_sync_at) : new Date(0)

    // Create sync log entry
    const logId = await this.createSyncLog('delta', this.config.syncOptions.direction)

    try {
      await this.updateSyncLog(logId, { status: 'running' })

      // Get changed ADSapp contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', this.config.organizationId)
        .gte('updated_at', since.toISOString())

      if (contactsError) {
        throw contactsError
      }

      // Get sync states
      const syncStates = await this.getSyncStates()

      // Perform delta sync
      const result = await this.syncEngine.deltaSync(since, {
        ...this.config.syncOptions,
      })

      // Update sync log
      await this.updateSyncLog(logId, {
        status: result.success ? 'completed' : 'failed',
        recordsProcessed: result.recordsProcessed,
        recordsSuccess: result.recordsSuccess,
        recordsFailed: result.recordsFailed,
        errors: result.errors,
        completedAt: new Date(),
      })

      // Update last sync time
      await this.updateLastSyncTime()

      return result
    } catch (error) {
      await this.updateSyncLog(logId, {
        status: 'failed',
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        completedAt: new Date(),
      })

      throw error
    }
  }

  /**
   * Sync single contact
   */
  async syncContact(
    contactId: string,
    direction: 'to_crm' | 'from_crm' = 'to_crm'
  ): Promise<void> {
    const supabase = await createClient()

    // Get contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      throw new Error('Contact not found')
    }

    // Get sync state
    const { data: syncState } = await supabase
      .from('crm_sync_state')
      .select('*')
      .eq('contact_id', contactId)
      .single()

    if (direction === 'to_crm') {
      // Create or update in CRM
      if (syncState?.crm_record_id) {
        await this.client.updateContact(syncState.crm_record_id, contact)
      } else {
        const created = await this.client.createContact(contact)

        // Create sync state
        await supabase.from('crm_sync_state').insert({
          connection_id: await this.getConnectionId(),
          contact_id: contactId,
          crm_record_id: created.id!,
          last_synced_at: new Date().toISOString(),
          adsapp_updated_at: contact.updated_at,
          crm_updated_at: new Date().toISOString(),
          sync_direction: 'to_crm',
        })
      }
    } else {
      // Fetch from CRM and update ADSapp
      if (!syncState?.crm_record_id) {
        throw new Error('Contact not synced to CRM')
      }

      const crmContact = await this.client.getContact(syncState.crm_record_id)

      // Update contact in ADSapp
      await supabase
        .from('contacts')
        .update({
          ...crmContact,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)
    }

    // Update sync state
    if (syncState) {
      await supabase
        .from('crm_sync_state')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_direction: direction,
        })
        .eq('id', syncState.id)
    }
  }

  /**
   * Get sync states for all contacts
   */
  private async getSyncStates(): Promise<SyncState[]> {
    const supabase = await createClient()

    const connectionId = await this.getConnectionId()

    const { data, error } = await supabase
      .from('crm_sync_state')
      .select('*')
      .eq('connection_id', connectionId)

    if (error) {
      console.error('Error fetching sync states:', error)
      return []
    }

    return (data || []).map(state => ({
      contactId: state.contact_id,
      crmRecordId: state.crm_record_id,
      lastSyncedAt: new Date(state.last_synced_at),
      adsappUpdatedAt: new Date(state.adsapp_updated_at),
      crmUpdatedAt: new Date(state.crm_updated_at),
    }))
  }

  /**
   * Update sync states
   */
  private async updateSyncStates(syncStates: SyncState[]): Promise<void> {
    const supabase = await createClient()

    for (const state of syncStates) {
      await supabase
        .from('crm_sync_state')
        .upsert({
          connection_id: await this.getConnectionId(),
          contact_id: state.contactId,
          crm_record_id: state.crmRecordId,
          last_synced_at: new Date().toISOString(),
          adsapp_updated_at: state.adsappUpdatedAt.toISOString(),
          crm_updated_at: state.crmUpdatedAt.toISOString(),
        })
        .match({ contact_id: state.contactId })
    }
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(
    syncType: 'full' | 'delta' | 'webhook',
    direction: 'to_crm' | 'from_crm' | 'bidirectional'
  ): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_sync_logs')
      .insert({
        connection_id: await this.getConnectionId(),
        sync_type: syncType,
        direction,
        status: 'running',
        records_processed: 0,
        records_success: 0,
        records_failed: 0,
        errors: [],
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error('Failed to create sync log')
    }

    return data.id
  }

  /**
   * Update sync log entry
   */
  private async updateSyncLog(logId: string, updates: Partial<SyncLogEntry>): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('crm_sync_logs')
      .update({
        ...updates,
        ...(updates.completedAt && { completed_at: updates.completedAt.toISOString() }),
      })
      .eq('id', logId)
  }

  /**
   * Get connection ID
   */
  private async getConnectionId(): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_connections')
      .select('id')
      .eq('organization_id', this.config.organizationId)
      .eq('crm_type', this.config.crmType)
      .single()

    if (error || !data) {
      throw new Error('CRM connection not found')
    }

    return data.id
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('crm_connections')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('organization_id', this.config.organizationId)
      .eq('crm_type', this.config.crmType)
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit = 10): Promise<SyncLogEntry[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('crm_sync_logs')
      .select('*')
      .eq('connection_id', await this.getConnectionId())
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return (data || []).map(log => ({
      id: log.id,
      connectionId: log.connection_id,
      syncType: log.sync_type,
      direction: log.direction,
      status: log.status,
      recordsProcessed: log.records_processed,
      recordsSuccess: log.records_success,
      recordsFailed: log.records_failed,
      errors: log.errors,
      startedAt: new Date(log.started_at),
      completedAt: log.completed_at ? new Date(log.completed_at) : undefined,
    }))
  }

  /**
   * Get connection status
   */
  async getConnectionStatus() {
    try {
      const status = await this.client.validateConnection()
      return status
    } catch (error) {
      return {
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Create sync manager instance
 */
export async function createSyncManager(
  organizationId: string,
  crmType: 'salesforce' | 'hubspot' | 'pipedrive'
): Promise<CRMSyncManager> {
  const supabase = await createClient()

  // Get CRM connection
  const { data: connection, error } = await supabase
    .from('crm_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('crm_type', crmType)
    .single()

  if (error || !connection) {
    throw new Error('CRM connection not found')
  }

  // Get field mappings
  const { data: mappings } = await supabase
    .from('crm_field_mappings')
    .select('*')
    .eq('connection_id', connection.id)

  const config: SyncManagerConfig = {
    organizationId,
    crmType,
    credentials: connection.credentials,
    syncOptions: {
      direction: connection.settings?.sync_direction || 'bidirectional',
      conflictResolution: connection.settings?.conflict_resolution || 'newest_wins',
      batchSize: connection.settings?.batch_size || 100,
      syncContacts: connection.settings?.sync_contacts !== false,
      syncDeals: connection.settings?.sync_deals !== false,
    },
  }

  return new CRMSyncManager(config)
}
