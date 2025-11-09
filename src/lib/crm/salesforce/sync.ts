/**
 * Salesforce Sync Logic
 *
 * Handles bi-directional synchronization between ADSapp and Salesforce
 */

import { SalesforceClient } from './client'
import { CRMUtils, SyncResult, SyncError } from '../base-client'

export interface SyncOptions {
  direction: 'to_crm' | 'from_crm' | 'bidirectional'
  conflictResolution: 'adsapp_wins' | 'crm_wins' | 'newest_wins' | 'manual'
  batchSize?: number
  syncContacts?: boolean
  syncDeals?: boolean
  since?: Date
}

export interface SyncState {
  contactId: string
  crmRecordId: string
  lastSyncedAt: Date
  adsappUpdatedAt: Date
  crmUpdatedAt: Date
}

export class SalesforceSync {
  private client: SalesforceClient

  constructor(client: SalesforceClient) {
    this.client = client
  }

  /**
   * Perform full sync
   */
  async fullSync(
    adsappContacts: any[],
    syncStates: SyncState[],
    options: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsSuccess = 0
    const errors: SyncError[] = []

    try {
      // Sync based on direction
      if (options.direction === 'to_crm' || options.direction === 'bidirectional') {
        const result = await this.syncToSalesforce(adsappContacts, syncStates, options)
        recordsProcessed += result.recordsProcessed
        recordsSuccess += result.recordsSuccess
        errors.push(...result.errors)
      }

      if (options.direction === 'from_crm' || options.direction === 'bidirectional') {
        const result = await this.syncFromSalesforce(adsappContacts, syncStates, options)
        recordsProcessed += result.recordsProcessed
        recordsSuccess += result.recordsSuccess
        errors.push(...result.errors)
      }

      return {
        success: errors.length === 0,
        recordsProcessed,
        recordsSuccess,
        recordsFailed: errors.length,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        recordsProcessed,
        recordsSuccess,
        recordsFailed: recordsProcessed - recordsSuccess,
        errors: [
          ...errors,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          },
        ],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Sync contacts to Salesforce
   */
  private async syncToSalesforce(
    adsappContacts: any[],
    syncStates: SyncState[],
    options: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsSuccess = 0
    const errors: SyncError[] = []

    // Build sync state map for quick lookup
    const syncStateMap = new Map<string, SyncState>()
    for (const state of syncStates) {
      syncStateMap.set(state.contactId, state)
    }

    // Process contacts in batches
    const batchSize = options.batchSize || 200
    const batches = CRMUtils.chunk(adsappContacts, batchSize)

    for (const batch of batches) {
      for (const contact of batch) {
        recordsProcessed++

        try {
          const syncState = syncStateMap.get(contact.id)

          // Determine if contact needs syncing
          if (!this.needsSync(contact, syncState, options)) {
            recordsSuccess++
            continue
          }

          // Check for conflicts
          if (syncState && options.conflictResolution !== 'adsapp_wins') {
            const hasConflict = await this.detectConflict(contact, syncState)
            if (hasConflict) {
              const resolution = await this.resolveConflict(
                contact,
                syncState,
                options.conflictResolution
              )
              if (resolution === 'skip') {
                recordsSuccess++
                continue
              }
            }
          }

          // Create or update in Salesforce
          if (syncState?.crmRecordId) {
            await CRMUtils.retry(() => this.client.updateContact(syncState.crmRecordId, contact))
          } else {
            const created = await CRMUtils.retry(() => this.client.createContact(contact))
            syncState!.crmRecordId = created.id!
          }

          recordsSuccess++
        } catch (error) {
          errors.push({
            recordId: contact.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          })
        }
      }
    }

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsSuccess,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Sync contacts from Salesforce
   */
  private async syncFromSalesforce(
    adsappContacts: any[],
    syncStates: SyncState[],
    options: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsSuccess = 0
    const errors: SyncError[] = []

    try {
      // Build contact map for quick lookup
      const contactMap = new Map<string, any>()
      for (const contact of adsappContacts) {
        contactMap.set(contact.id, contact)
      }

      // Build sync state map
      const syncStateMap = new Map<string, SyncState>()
      for (const state of syncStates) {
        syncStateMap.set(state.crmRecordId, state)
      }

      // Fetch updated contacts from Salesforce
      let offset = 0
      const limit = options.batchSize || 200
      let hasMore = true

      while (hasMore) {
        const salesforceContacts = await this.client.getContacts({
          limit,
          offset,
          ...(options.since && {
            filter: { LastModifiedDate: `> ${options.since.toISOString()}` },
          }),
        })

        if (salesforceContacts.length === 0) {
          hasMore = false
          break
        }

        for (const sfContact of salesforceContacts) {
          recordsProcessed++

          try {
            const syncState = syncStateMap.get(sfContact.id!)

            // Skip if not mapped to ADSapp contact
            if (!syncState) {
              continue
            }

            const adsappContact = contactMap.get(syncState.contactId)

            // Check for conflicts
            if (adsappContact && options.conflictResolution !== 'crm_wins') {
              const hasConflict = await this.detectConflict(adsappContact, syncState)
              if (hasConflict) {
                const resolution = await this.resolveConflict(
                  adsappContact,
                  syncState,
                  options.conflictResolution
                )
                if (resolution === 'skip') {
                  recordsSuccess++
                  continue
                }
              }
            }

            // Update ADSapp contact with Salesforce data
            // This would be handled by the sync manager
            recordsSuccess++
          } catch (error) {
            errors.push({
              recordId: sfContact.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              details: error,
            })
          }
        }

        offset += limit
      }

      return {
        success: errors.length === 0,
        recordsProcessed,
        recordsSuccess,
        recordsFailed: errors.length,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        recordsProcessed,
        recordsSuccess,
        recordsFailed: recordsProcessed - recordsSuccess,
        errors: [
          ...errors,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          },
        ],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Check if contact needs syncing
   */
  private needsSync(contact: any, syncState: SyncState | undefined, options: SyncOptions): boolean {
    // Always sync if no sync state exists
    if (!syncState) {
      return true
    }

    // Check if contact was updated since last sync
    const contactUpdatedAt = new Date(contact.updated_at || contact.updatedAt)
    if (contactUpdatedAt > syncState.lastSyncedAt) {
      return true
    }

    // Check if syncing since a specific date
    if (options.since && contactUpdatedAt > options.since) {
      return true
    }

    return false
  }

  /**
   * Detect conflict between ADSapp and Salesforce
   */
  private async detectConflict(contact: any, syncState: SyncState): Promise<boolean> {
    const contactUpdatedAt = new Date(contact.updated_at || contact.updatedAt)

    // If both ADSapp and Salesforce were updated since last sync
    if (
      contactUpdatedAt > syncState.lastSyncedAt &&
      syncState.crmUpdatedAt > syncState.lastSyncedAt
    ) {
      return true
    }

    return false
  }

  /**
   * Resolve conflict
   */
  private async resolveConflict(
    contact: any,
    syncState: SyncState,
    strategy: 'adsapp_wins' | 'crm_wins' | 'newest_wins' | 'manual'
  ): Promise<'adsapp' | 'crm' | 'skip'> {
    switch (strategy) {
      case 'adsapp_wins':
        return 'adsapp'
      case 'crm_wins':
        return 'crm'
      case 'newest_wins':
        const contactUpdatedAt = new Date(contact.updated_at || contact.updatedAt)
        return contactUpdatedAt > syncState.crmUpdatedAt ? 'adsapp' : 'crm'
      case 'manual':
        // Skip and let user resolve manually
        return 'skip'
      default:
        return 'skip'
    }
  }

  /**
   * Sync single contact
   */
  async syncContact(
    adsappContact: any,
    syncState: SyncState | undefined,
    direction: 'to_crm' | 'from_crm'
  ): Promise<void> {
    if (direction === 'to_crm') {
      if (syncState?.crmRecordId) {
        await this.client.updateContact(syncState.crmRecordId, adsappContact)
      } else {
        await this.client.createContact(adsappContact)
      }
    } else {
      if (syncState?.crmRecordId) {
        const sfContact = await this.client.getContact(syncState.crmRecordId)
        // Return sfContact for processing by sync manager
      }
    }
  }

  /**
   * Delta sync - only sync changed records
   */
  async deltaSync(since: Date, options: SyncOptions): Promise<SyncResult> {
    return this.fullSync([], [], {
      ...options,
      since,
    })
  }
}
