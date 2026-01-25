/**
 * Zapier Contacts Polling Trigger
 *
 * Returns recent contacts for Zapier trigger preview/polling fallback.
 * Used when REST Hooks are not available or for Zap editor preview.
 *
 * GET /api/integrations/zapier/triggers/contacts
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  createSuccessResponse,
  createErrorResponse,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'

async function handler(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)

  const supabase = createServiceRoleClient()

  // Get recent contacts for this organization
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, name, phone_number, email, tags, created_at')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching contacts:', error)
    return createErrorResponse('database_error', 'Failed to fetch contacts', 500)
  }

  // Transform to Zapier webhook payload format
  const transformed = (contacts || []).map((contact) => ({
    id: `evt_${contact.id}`,
    event: 'contact.created',
    timestamp: contact.created_at,
    organization_id: context.organizationId,
    data: {
      contact_id: contact.id,
      name: contact.name,
      phone: contact.phone_number,
      email: contact.email,
      tags: contact.tags || [],
      created_at: contact.created_at,
    },
  }))

  return createSuccessResponse({
    contacts: transformed,
  })
}

export const GET = withZapierMiddleware(handler, {
  rateLimitType: 'actions',
  requiredScopes: ['contacts:read'],
})
