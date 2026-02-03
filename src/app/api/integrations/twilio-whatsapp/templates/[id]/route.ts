/**
 * Twilio WhatsApp Single Template API
 * Purpose: Get template details and preview
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getTemplateById } from '@/lib/integrations/twilio-whatsapp/template-sync'

/**
 * GET /api/integrations/twilio-whatsapp/templates/[id]
 * Get a single template with preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate template ID
    const validation = QueryValidators.uuid(id)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get template
    const template = await getTemplateById(id, profile.organization_id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Generate preview with placeholder variables
    let preview = template.body || ''
    for (const variable of template.variables) {
      const placeholder = `{{${variable.key}}}`
      const displayName = variable.name || `Variable ${variable.key}`
      preview = preview.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), `[${displayName}]`)
    }

    return NextResponse.json({
      template,
      preview,
    })
  } catch (error) {
    console.error('Template get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
