/**
 * Zapier REST Hook Unsubscribe Endpoint
 * DELETE /api/integrations/zapier/hooks/{id}
 *
 * Allows Zapier to unsubscribe from webhook events.
 * Removes the subscription, stopping future event deliveries.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  createErrorResponse,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'

// =====================================================
// Validation
// =====================================================

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// =====================================================
// Handler
// =====================================================

async function handleUnsubscribe(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  // Extract subscription ID from URL
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const subscriptionId = pathParts[pathParts.length - 1]

  // Validate subscription ID format
  if (!subscriptionId || !isValidUUID(subscriptionId)) {
    return createErrorResponse('invalid_request', 'Invalid subscription ID format', 400)
  }

  const supabase = createServiceRoleClient()

  // First, verify the subscription exists and belongs to the organization
  const { data: subscription, error: fetchError } = await supabase
    .from('zapier_subscriptions')
    .select('organization_id')
    .eq('id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    return createErrorResponse('not_found', 'Subscription not found', 404)
  }

  // Verify ownership
  if (subscription.organization_id !== context.organizationId) {
    return createErrorResponse('not_found', 'Subscription not found', 404)
  }

  // Delete the subscription
  const { error: deleteError } = await supabase
    .from('zapier_subscriptions')
    .delete()
    .eq('id', subscriptionId)

  if (deleteError) {
    console.error('Failed to delete subscription:', deleteError)
    return createErrorResponse('database_error', 'Failed to delete subscription', 500)
  }

  // Return 200 OK with empty body per REST Hook spec
  return new Response(null, { status: 200 })
}

// =====================================================
// Export with Middleware
// =====================================================

export const DELETE = withZapierMiddleware(handleUnsubscribe, {
  rateLimitType: 'subscribe',
  requiredScopes: ['triggers:write'],
})
