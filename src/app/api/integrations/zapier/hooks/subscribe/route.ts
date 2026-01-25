/**
 * Zapier REST Hook Subscribe Endpoint
 * POST /api/integrations/zapier/hooks/subscribe
 *
 * Allows Zapier to subscribe to ADSapp events using REST Hooks.
 * Creates a webhook subscription that delivers events to the specified URL.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  createSuccessResponse,
  createErrorResponse,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'
import type {
  SubscribeRequest,
  SubscribeResponse,
  ZapierEventType,
  FilterOperator,
} from '@/types/zapier'

// =====================================================
// Constants
// =====================================================

const VALID_EVENT_TYPES: ZapierEventType[] = [
  'message.received',
  'message.status_changed',
  'contact.created',
  'contact.updated',
]

const VALID_FILTER_OPERATORS: FilterOperator[] = ['any_of', 'all_of', 'none_of']

// =====================================================
// Validation
// =====================================================

/**
 * Validate that URL is HTTPS (Zapier requires HTTPS)
 */
function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validate subscribe request body
 */
function validateSubscribeRequest(
  body: unknown
): { valid: true; data: SubscribeRequest } | { valid: false; error: string; field?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const req = body as Record<string, unknown>

  // Validate event type
  if (!req.event || typeof req.event !== 'string') {
    return { valid: false, error: 'event is required', field: 'event' }
  }

  if (!VALID_EVENT_TYPES.includes(req.event as ZapierEventType)) {
    return {
      valid: false,
      error: `Invalid event type. Valid types: ${VALID_EVENT_TYPES.join(', ')}`,
      field: 'event',
    }
  }

  // Validate hook URL
  if (!req.hookUrl || typeof req.hookUrl !== 'string') {
    return { valid: false, error: 'hookUrl is required', field: 'hookUrl' }
  }

  if (!isValidHttpsUrl(req.hookUrl)) {
    return {
      valid: false,
      error: 'hookUrl must be a valid HTTPS URL',
      field: 'hookUrl',
    }
  }

  // Validate optional filters
  if (req.filters !== undefined) {
    if (typeof req.filters !== 'object' || req.filters === null) {
      return { valid: false, error: 'filters must be an object', field: 'filters' }
    }

    const filters = req.filters as Record<string, unknown>

    // Validate tags filter
    if (filters.tags !== undefined) {
      if (typeof filters.tags !== 'object' || filters.tags === null) {
        return { valid: false, error: 'filters.tags must be an object', field: 'filters.tags' }
      }

      const tagsFilter = filters.tags as Record<string, unknown>

      if (!Array.isArray(tagsFilter.values)) {
        return {
          valid: false,
          error: 'filters.tags.values must be an array',
          field: 'filters.tags.values',
        }
      }

      if (!tagsFilter.values.every((v) => typeof v === 'string')) {
        return {
          valid: false,
          error: 'filters.tags.values must contain only strings',
          field: 'filters.tags.values',
        }
      }

      if (
        tagsFilter.operator !== undefined &&
        !VALID_FILTER_OPERATORS.includes(tagsFilter.operator as FilterOperator)
      ) {
        return {
          valid: false,
          error: `Invalid filter operator. Valid operators: ${VALID_FILTER_OPERATORS.join(', ')}`,
          field: 'filters.tags.operator',
        }
      }
    }

    // Validate segments filter
    if (filters.segments !== undefined) {
      if (!Array.isArray(filters.segments)) {
        return {
          valid: false,
          error: 'filters.segments must be an array',
          field: 'filters.segments',
        }
      }

      if (!filters.segments.every((v) => typeof v === 'string')) {
        return {
          valid: false,
          error: 'filters.segments must contain only strings',
          field: 'filters.segments',
        }
      }
    }
  }

  return { valid: true, data: req as unknown as SubscribeRequest }
}

// =====================================================
// Handler
// =====================================================

async function handleSubscribe(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return createErrorResponse('invalid_request', 'Invalid JSON body', 400)
  }

  // Validate request
  const validation = validateSubscribeRequest(body)
  if (!validation.valid) {
    return createErrorResponse('invalid_request', validation.error, 400)
  }

  const { data } = validation

  // Insert subscription into database
  const supabase = createServiceRoleClient()

  const { data: subscription, error } = await supabase
    .from('zapier_subscriptions')
    .insert({
      organization_id: context.organizationId,
      user_id: context.userId,
      event_type: data.event,
      target_url: data.hookUrl,
      filter_tags: data.filters?.tags?.values ?? null,
      filter_segments: data.filters?.segments ?? null,
      filter_operator: data.filters?.tags?.operator ?? 'any_of',
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create subscription:', error)
    return createErrorResponse('database_error', 'Failed to create subscription', 500)
  }

  // Return success response matching SubscribeResponse type
  const response: SubscribeResponse = {
    id: subscription.id,
    event: subscription.event_type as ZapierEventType,
    hookUrl: subscription.target_url,
    active: subscription.is_active,
    createdAt: subscription.created_at,
  }

  return createSuccessResponse(response, 201)
}

// =====================================================
// Export with Middleware
// =====================================================

export const POST = withZapierMiddleware(handleSubscribe, {
  rateLimitType: 'subscribe',
  requiredScopes: ['triggers:write'],
})
