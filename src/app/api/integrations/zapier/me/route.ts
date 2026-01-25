/**
 * Zapier Me Endpoint
 *
 * Returns authenticated user and organization info.
 * Used by Zapier to test OAuth connection and display connection label.
 *
 * GET /api/integrations/zapier/me
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
  const supabase = createServiceRoleClient()

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', context.userId)
    .single()

  if (profileError || !profile) {
    return createErrorResponse('not_found', 'User not found', 404)
  }

  // Get organization info
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', context.organizationId)
    .single()

  if (orgError || !org) {
    return createErrorResponse('not_found', 'Organization not found', 404)
  }

  return createSuccessResponse({
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
    },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
    },
    // Used by Zapier for connection label
    organization_name: org.name,
    scopes: context.scopes,
  })
}

export const GET = withZapierMiddleware(handler, {
  rateLimitType: 'actions',
  requiredScopes: [], // Any authenticated request can access /me
})
