/**
 * WhatsApp Provider Health API
 * Purpose: Check health status of WhatsApp providers
 * Phase: 24 - Integration & Settings
 * Date: 2026-02-03
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkProviderHealth } from '@/lib/integrations/whatsapp/provider-service'

/**
 * GET /api/integrations/whatsapp/provider/health
 * Get health status of both WhatsApp providers (Cloud API and Twilio)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check health of both providers
    const healthStatus = await checkProviderHealth(profile.organization_id)

    return NextResponse.json(healthStatus)
  } catch (error) {
    console.error('Provider health check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
