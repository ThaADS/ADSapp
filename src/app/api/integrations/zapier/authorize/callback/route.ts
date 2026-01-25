/**
 * OAuth 2.0 Authorization Callback Endpoint
 *
 * POST /api/integrations/zapier/authorize/callback
 *
 * Called from consent page after user approves authorization.
 * Creates authorization code and returns it to the consent page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuthorizationCode } from '@/lib/integrations/zapier/oauth-provider'
import type { OAuthScope } from '@/types/oauth'

interface CallbackRequest {
  clientId: string
  redirectUri: string
  scopes: OAuthScope[]
  state: string
  codeChallenge?: string
  codeChallengeMethod?: 'S256' | 'plain'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CallbackRequest

    // 1. Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 403 }
      )
    }

    // 3. Verify user has permission to authorize (owner or admin)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and admins can authorize integrations.' },
        { status: 403 }
      )
    }

    // 4. Create authorization code
    const { code } = await createAuthorizationCode({
      clientId: body.clientId,
      userId: user.id,
      organizationId: profile.organization_id,
      redirectUri: body.redirectUri,
      scopes: body.scopes,
      state: body.state,
      codeChallenge: body.codeChallenge,
      codeChallengeMethod: body.codeChallengeMethod,
    })

    // 5. Return code to consent page
    return NextResponse.json({ code }, { status: 200 })
  } catch (error) {
    console.error('Authorization callback error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
