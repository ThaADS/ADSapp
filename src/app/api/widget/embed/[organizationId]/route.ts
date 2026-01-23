/**
 * Public Widget Embed Endpoint
 * Returns organization's widget configuration and JavaScript
 * No authentication required - uses organization ID as identifier
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params

    // Validate origin if domains are restricted
    const origin = request.headers.get('origin') || request.headers.get('referer')

    const supabase = await createServiceRoleClient()

    // Get organization widget config (public endpoint uses service role)
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, widget_config, whatsapp_phone_number_id')
      .eq('id', organizationId)
      .single()

    if (error || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const config = org.widget_config || {}

    // Check if widget is enabled
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Widget is not enabled for this organization' },
        { status: 403 }
      )
    }

    // Check allowed domains
    if (config.allowedDomains?.length > 0 && origin) {
      const originHost = new URL(origin).hostname
      const isAllowed = config.allowedDomains.some((domain: string) => {
        const pattern = domain.replace(/\*/g, '.*')
        return new RegExp(`^${pattern}$`).test(originHost)
      })

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Domain not allowed' },
          { status: 403 }
        )
      }
    }

    // SECURITY FIX: Return ONLY public-safe widget configuration
    // Do NOT expose: organization name, WhatsApp phone ID, or internal identifiers
    // These can be used for social engineering or competitive intelligence
    return NextResponse.json({
      // Only return a hashed/obfuscated identifier for widget initialization
      widgetId: Buffer.from(org.id).toString('base64').slice(0, 12),
      config: {
        position: config.position || 'bottom-right',
        primaryColor: config.primaryColor || '#25D366',
        greeting: config.greeting || 'Hallo! Hoe kunnen wij u helpen?',
        placeholder: config.placeholder || 'Typ uw bericht...',
        offlineMessage: config.offlineMessage,
        showAgentName: config.showAgentName ?? true,
        showAgentAvatar: config.showAgentAvatar ?? true,
        triggerText: config.triggerText || 'Chat met ons',
        delaySeconds: config.delaySeconds ?? 3,
        businessHours: config.businessHours,
      },
      // Widget enabled status only - no sensitive data
      enabled: true,
    }, {
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    })
  } catch (error) {
    console.error('Widget embed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*'

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
