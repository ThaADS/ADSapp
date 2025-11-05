// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 * Core persistence layer for event sourcing
 */

import { createClient } from '@/lib/supabase/server'
import { DomainEvent, EventStoreRecord, AggregateType } from './types'

export class EventStore {
  /**
   * Append event to store using database function
   */
  static async appendEvent(event: DomainEvent): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('append_event', {
      p_aggregate_id: event.aggregateId,
      p_aggregate_type: event.aggregateType,
      p_event_type: event.eventType,
      p_event_data: event.eventData,
      p_organization_id: event.organizationId,
      p_created_by: event.createdBy || null,
      p_metadata: event.metadata || {}
    })

    if (error) {
      throw new Error(`Failed to append event: ${error.message}`)
    }

    return data
  }

  /**
   * Get all events for an aggregate
   */
  static async getEvents(
    aggregateId: string,
    fromVersion?: number
  ): Promise<EventStoreRecord[]> {
    const supabase = await createClient()

    let query = supabase
      .from('event_store')
      .select('*')
      .eq('aggregate_id', aggregateId)
      .order('version', { ascending: true })

    if (fromVersion !== undefined) {
      query = query.gte('version', fromVersion)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to retrieve events: ${error.message}`)
    }

    return data as EventStoreRecord[]
  }

  /**
   * Get events by type and date range
   */
  static async getEventsByType(
    eventType: string,
    organizationId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<EventStoreRecord[]> {
    const supabase = await createClient()

    let query = supabase
      .from('event_store')
      .select('*')
      .eq('event_type', eventType)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (fromDate) {
      query = query.gte('created_at', fromDate.toISOString())
    }

    if (toDate) {
      query = query.lte('created_at', toDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to retrieve events by type: ${error.message}`)
    }

    return data as EventStoreRecord[]
  }

  /**
   * Get events for organization
   */
  static async getOrganizationEvents(
    organizationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<EventStoreRecord[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('event_store')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to retrieve organization events: ${error.message}`)
    }

    return data as EventStoreRecord[]
  }

  /**
   * Get aggregate state from events
   */
  static async getAggregateState(aggregateId: string): Promise<Record<string, any>> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_aggregate_state', {
      p_aggregate_id: aggregateId
    })

    if (error) {
      throw new Error(`Failed to get aggregate state: ${error.message}`)
    }

    return data || {}
  }

  /**
   * Create snapshot manually
   */
  static async createSnapshot(
    aggregateId: string,
    aggregateType: AggregateType,
    organizationId: string
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.rpc('create_snapshot', {
      p_aggregate_id: aggregateId,
      p_aggregate_type: aggregateType,
      p_organization_id: organizationId
    })

    if (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`)
    }
  }

  /**
   * Get snapshot for aggregate
   */
  static async getSnapshot(aggregateId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('event_snapshots')
      .select('*')
      .eq('aggregate_id', aggregateId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw new Error(`Failed to retrieve snapshot: ${error.message}`)
    }

    return data
  }

  /**
   * Replay events to rebuild state
   */
  static async replayEvents(
    aggregateId: string,
    toVersion?: number
  ): Promise<Record<string, any>> {
    const events = await this.getEvents(aggregateId, undefined)

    let state: Record<string, any> = {}

    for (const event of events) {
      if (toVersion !== undefined && event.version > toVersion) {
        break
      }

      // Apply event to state
      state = this.applyEvent(state, event)
    }

    return state
  }

  /**
   * Apply event to state (domain logic)
   */
  private static applyEvent(
    state: Record<string, any>,
    event: EventStoreRecord
  ): Record<string, any> {
    const newState = { ...state }

    switch (event.eventType) {
      case 'ConversationCreated':
        return {
          ...event.eventData,
          id: event.aggregateId,
          createdAt: event.createdAt
        }

      case 'ConversationStatusChanged':
        return {
          ...newState,
          status: event.eventData.newStatus
        }

      case 'ConversationAssigned':
        return {
          ...newState,
          assignedTo: event.eventData.assignedTo
        }

      case 'MessageSent':
      case 'MessageReceived':
        return {
          ...event.eventData,
          id: event.aggregateId,
          createdAt: event.createdAt
        }

      case 'ContactCreated':
        return {
          ...event.eventData,
          id: event.aggregateId,
          createdAt: event.createdAt
        }

      case 'ContactUpdated':
        return {
          ...newState,
          ...event.eventData.updatedFields
        }

      default:
        return newState
    }
  }

  /**
   * Get event statistics
   */
  static async getEventStats(organizationId?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_event_store_stats', {
      p_organization_id: organizationId || null
    })

    if (error) {
      throw new Error(`Failed to get event stats: ${error.message}`)
    }

    return data
  }
}
