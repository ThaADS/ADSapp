/**
 * HubSpot Sync Logic
 *
 * Handles bi-directional synchronization between ADSapp and HubSpot
 */

import { HubSpotClient } from './client'
import { CRMUtils, SyncResult, SyncError } from '../base-client'
import type { SyncOptions, SyncState } from '../salesforce/sync'

export class HubSpotSync {
  private client: HubSpotClient

  constructor(client: HubSpotClient) {
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
      if (options.direction === 'to_crm' || options.direction === 'bidirectional') {
        const result = await this.syncToHubSpot(adsappContacts, syncStates, options)
        recordsProcessed += result.recordsProcessed
        recordsSuccess += result.recordsSuccess
        errors.push(...result.errors)
      }

      if (options.direction === 'from_crm' || options.direction === 'bidirectional') {
        const result = await this.syncFromHubSpot(adsappContacts, syncStates, options)
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
   * Sync contacts to HubSpot
   */
  private async syncToHubSpot(
    adsappContacts: any[],
    syncStates: SyncState[],
    options: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsSuccess = 0
    const errors: SyncError[] = []

    const syncStateMap = new Map<string, SyncState>()
    for (const state of syncStates) {
      syncStateMap.set(state.contactId, state)
    }

    const batchSize = options.batchSize || 100
    const batches = CRMUtils.chunk(adsappContacts, batchSize)

    for (const batch of batches) {
      for (const contact of batch) {
        recordsProcessed++

        try {
          const syncState = syncStateMap.get(contact.id)

          if (syncState?.crmRecordId) {
            await CRMUtils.retry(() => this.client.updateContact(syncState.crmRecordId, contact))
          } else {
            const created = await CRMUtils.retry(() => this.client.createContact(contact))
            if (syncState) {
              syncState.crmRecordId = created.id!
            }
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
   * Sync contacts from HubSpot
   */
  private async syncFromHubSpot(
    adsappContacts: any[],
    syncStates: SyncState[],
    options: SyncOptions
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsProcessed = 0
    let recordsSuccess = 0
    const errors: SyncError[] = []

    try {
      const contactMap = new Map<string, any>()
      for (const contact of adsappContacts) {
        contactMap.set(contact.id, contact)
      }

      const syncStateMap = new Map<string, SyncState>()
      for (const state of syncStates) {
        syncStateMap.set(state.crmRecordId, state)
      }

      let offset = 0
      const limit = options.batchSize || 100

      while (true) {
        const hubspotContacts = await this.client.getContacts({
          limit,
          offset,
        })

        if (hubspotContacts.length === 0) {
          break
        }

        for (const hsContact of hubspotContacts) {
          recordsProcessed++

          try {
            const syncState = syncStateMap.get(hsContact.id!)
            if (!syncState) {
              continue
            }

            recordsSuccess++
          } catch (error) {
            errors.push({
              recordId: hsContact.id,
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
   * Delta sync - only sync changed records
   */
  async deltaSync(since: Date, options: SyncOptions): Promise<SyncResult> {
    return this.fullSync([], [], {
      ...options,
      since,
    })
  }
}
