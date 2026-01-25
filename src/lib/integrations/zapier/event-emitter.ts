/**
 * Zapier Event Emitter
 *
 * Provides functions to emit events for Zapier webhook subscriptions.
 * Handles subscription matching, tag filtering, and webhook delivery.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { webhookService } from './webhook-service'
import type {
  ZapierEventType,
  WebhookPayload,
  MessageReceivedData,
  ContactCreatedData,
  ContactUpdatedData,
  FilterOperator,
  ZapierSubscription,
} from '@/types/zapier'

// =====================================================
// Filter Matching Logic
// =====================================================

/**
 * Check if event matches subscription filters based on contact tags
 *
 * @param contactTags - Tags associated with the contact
 * @param filterTags - Tags configured in the subscription filter
 * @param filterOperator - How to combine filter tags
 * @returns Whether the event matches the filter
 */
function matchesFilters(
  contactTags: string[],
  filterTags: string[] | null,
  filterOperator: FilterOperator
): boolean {
  // No filter configured = match all events
  if (!filterTags || filterTags.length === 0) {
    return true
  }

  const contactTagSet = new Set(contactTags)

  switch (filterOperator) {
    case 'any_of':
      // Match if contact has ANY of the filter tags
      return filterTags.some((tag) => contactTagSet.has(tag))

    case 'all_of':
      // Match if contact has ALL of the filter tags
      return filterTags.every((tag) => contactTagSet.has(tag))

    case 'none_of':
      // Match if contact has NONE of the filter tags
      return !filterTags.some((tag) => contactTagSet.has(tag))

    default:
      // Unknown operator - match all (be permissive)
      return true
  }
}

// =====================================================
// Event Emitter
// =====================================================

/**
 * Emit event to all matching subscriptions
 *
 * @param organizationId - Organization that owns the data
 * @param eventType - Type of event being emitted
 * @param data - Event payload data
 * @param contactTags - Tags for filtering (optional)
 * @returns Number of subscriptions that will receive the webhook
 */
export async function emitZapierEvent(
  organizationId: string,
  eventType: ZapierEventType,
  data: MessageReceivedData | ContactCreatedData | ContactUpdatedData,
  contactTags: string[] = []
): Promise<number> {
  const supabase = createServiceRoleClient()

  // Get active subscriptions for this event type and organization
  const { data: subscriptions, error } = await supabase
    .from('zapier_subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('event_type', eventType)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch subscriptions:', error)
    return 0
  }

  if (!subscriptions || subscriptions.length === 0) {
    return 0
  }

  // Build webhook payload
  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    event: eventType,
    timestamp: new Date().toISOString(),
    organization_id: organizationId,
    data,
  }

  // Deliver to matching subscriptions
  let delivered = 0

  for (const subscription of subscriptions) {
    // Apply tag filtering
    const filterTags = subscription.filter_tags as string[] | null
    const filterOperator = (subscription.filter_operator || 'any_of') as FilterOperator

    if (!matchesFilters(contactTags, filterTags, filterOperator)) {
      continue
    }

    // Fire and forget - don't await all deliveries to avoid blocking
    webhookService
      .deliverWebhook(subscription.id, payload)
      .catch((err) =>
        console.error(`Webhook delivery failed for subscription ${subscription.id}:`, err)
      )

    delivered++
  }

  return delivered
}

// =====================================================
// Convenience Functions
// =====================================================

/**
 * Emit message.received event
 *
 * @param organizationId - Organization that owns the message
 * @param data - Message data
 * @param contactTags - Contact's tags for filtering
 * @returns Number of subscriptions triggered
 */
export async function emitMessageReceived(
  organizationId: string,
  data: MessageReceivedData,
  contactTags: string[] = []
): Promise<number> {
  return emitZapierEvent(organizationId, 'message.received', data, contactTags)
}

/**
 * Emit contact.created event
 *
 * @param organizationId - Organization that owns the contact
 * @param data - Contact data (includes tags)
 * @returns Number of subscriptions triggered
 */
export async function emitContactCreated(
  organizationId: string,
  data: ContactCreatedData
): Promise<number> {
  return emitZapierEvent(organizationId, 'contact.created', data, data.tags)
}

/**
 * Emit contact.updated event
 *
 * @param organizationId - Organization that owns the contact
 * @param data - Contact update data
 * @param contactTags - Contact's current tags for filtering
 * @returns Number of subscriptions triggered
 */
export async function emitContactUpdated(
  organizationId: string,
  data: ContactUpdatedData,
  contactTags: string[] = []
): Promise<number> {
  return emitZapierEvent(organizationId, 'contact.updated', data, contactTags)
}

// =====================================================
// Event Emitter Class (Alternative Interface)
// =====================================================

/**
 * Class-based event emitter for more complex use cases
 */
export class ZapierEventEmitter {
  constructor(private organizationId: string) {}

  /**
   * Emit any supported event
   */
  async emit(
    eventType: ZapierEventType,
    data: MessageReceivedData | ContactCreatedData | ContactUpdatedData,
    contactTags: string[] = []
  ): Promise<number> {
    return emitZapierEvent(this.organizationId, eventType, data, contactTags)
  }

  /**
   * Emit message.received event
   */
  async messageReceived(data: MessageReceivedData, contactTags: string[] = []): Promise<number> {
    return emitMessageReceived(this.organizationId, data, contactTags)
  }

  /**
   * Emit contact.created event
   */
  async contactCreated(data: ContactCreatedData): Promise<number> {
    return emitContactCreated(this.organizationId, data)
  }

  /**
   * Emit contact.updated event
   */
  async contactUpdated(data: ContactUpdatedData, contactTags: string[] = []): Promise<number> {
    return emitContactUpdated(this.organizationId, data, contactTags)
  }
}
