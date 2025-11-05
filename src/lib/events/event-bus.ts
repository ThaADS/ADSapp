/**
 * Event Bus Implementation
 * Publishes events and notifies subscribers
 */

import { DomainEvent, EventHandler } from './types'
import { EventStore } from './event-store'

export class EventBus {
  private static handlers: Map<string, EventHandler[]> = new Map()

  /**
   * Subscribe to event type
   */
  static subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }

    this.handlers.get(eventType)!.push(handler)
  }

  /**
   * Subscribe to multiple event types
   */
  static subscribeMany(eventTypes: string[], handler: EventHandler): void {
    for (const eventType of eventTypes) {
      this.subscribe(eventType, handler)
    }
  }

  /**
   * Unsubscribe from event type
   */
  static unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Publish event to store and notify handlers
   */
  static async publish(event: DomainEvent): Promise<string> {
    // First, persist the event
    const eventId = await EventStore.appendEvent(event)

    // Then, notify all handlers
    const handlers = this.handlers.get(event.eventType) || []
    const wildcardHandlers = this.handlers.get('*') || []
    const allHandlers = [...handlers, ...wildcardHandlers]

    // Execute handlers in parallel
    await Promise.all(
      allHandlers.map(handler =>
        this.executeHandler(handler, { ...event, id: eventId })
      )
    )

    return eventId
  }

  /**
   * Execute handler with error handling
   */
  private static async executeHandler(
    handler: EventHandler,
    event: DomainEvent
  ): Promise<void> {
    try {
      await handler(event)
    } catch (error) {
      console.error(`Error executing handler for ${event.eventType}:`, error)
      // Don't throw - we don't want one handler failure to affect others
    }
  }

  /**
   * Get all registered event types
   */
  static getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Clear all handlers (useful for testing)
   */
  static clearHandlers(): void {
    this.handlers.clear()
  }
}
