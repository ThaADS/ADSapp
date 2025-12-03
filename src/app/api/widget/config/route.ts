// @ts-nocheck - Database types need regeneration from Supabase schema

/**
 * WhatsApp Widget Configuration API
 * GET: Get organization's widget configuration
 * PUT: Update widget configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export interface WidgetConfig {
  enabled: boolean
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  primaryColor: string
  greeting: string
  placeholder: string
  offlineMessage: string
  showAgentName: boolean
  showAgentAvatar: boolean
  triggerText: string
  delaySeconds: number
  allowedDomains: string[]
  businessHours: {
    enabled: boolean
    timezone: string
    schedule: {
      [key: string]: { start: string; end: string } | null
    }
  }
}

const DEFAULT_CONFIG: WidgetConfig = {
  enabled: false,
  position: 'bottom-right',
  primaryColor: '#25D366',
  greeting: 'Hallo! Hoe kunnen wij u helpen?',
  placeholder: 'Typ uw bericht...',
  offlineMessage: 'Wij zijn momenteel offline. Laat een bericht achter!',
  showAgentName: true,
  showAgentAvatar: true,
  triggerText: 'Chat met ons',
  delaySeconds: 3,
  allowedDomains: [],
  businessHours: {
    enabled: false,
    timezone: 'Europe/Amsterdam',
    schedule: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: null,
      sunday: null,
    },
  },
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const supabase = await createClient()

    // Get widget config from organization settings
    const { data: org, error } = await supabase
      .from('organizations')
      .select('widget_config')
      .eq('id', profile.organization_id)
      .single()

    if (error) {
      throw error
    }

    const config = org?.widget_config || DEFAULT_CONFIG

    return createSuccessResponse({
      config,
      embedCode: generateEmbedCode(profile.organization_id),
    })
  } catch (error) {
    console.error('Get widget config error:', error)
    return createErrorResponse(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Check permissions
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = await createClient()

    // Validate config
    const config: WidgetConfig = {
      ...DEFAULT_CONFIG,
      ...body,
    }

    // Update organization widget config
    const { error } = await supabase
      .from('organizations')
      .update({
        widget_config: config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.organization_id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      config,
      message: 'Widget configuration updated successfully',
    })
  } catch (error) {
    console.error('Update widget config error:', error)
    return createErrorResponse(error)
  }
}

function generateEmbedCode(organizationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.adsapp.nl'

  return `<!-- ADSapp WhatsApp Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ADSappWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    w[o].l=1*new Date();js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','adsapp','${baseUrl}/widget.js'));
  adsapp('init', '${organizationId}');
</script>
<!-- End ADSapp WhatsApp Widget -->`
}
