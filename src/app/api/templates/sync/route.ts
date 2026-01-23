import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Get organization's WhatsApp configuration
    const { data: org } = await supabase
      .from('organizations')
      .select('whatsapp_business_account_id, whatsapp_access_token')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.whatsapp_business_account_id || !org?.whatsapp_access_token) {
      return NextResponse.json(
        { error: 'WhatsApp Business Account not configured' },
        { status: 400 }
      )
    }

    const whatsappClient = await getWhatsAppClient(profile.organization_id)

    // Get templates from WhatsApp
    const whatsappTemplates = await whatsappClient.getTemplates(org.whatsapp_business_account_id)

    // Get existing templates from database
    const { data: existingTemplates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .not('whatsapp_template_id', 'is', null)

    const existingTemplateMap = new Map(
      (existingTemplates || []).map(t => [t.whatsapp_template_id, t])
    )

    const results = {
      synced: [],
      created: [],
      updated: [],
      errors: [],
    }

    // Process each WhatsApp template
    for (const whatsappTemplate of whatsappTemplates) {
      try {
        const existingTemplate = existingTemplateMap.get(whatsappTemplate.id)

        const templateData = {
          name: whatsappTemplate.name,
          content: extractTemplateContent(whatsappTemplate),
          category: whatsappTemplate.category || 'general',
          variables: extractTemplateVariables(whatsappTemplate),
          whatsapp_template_id: whatsappTemplate.id,
          whatsapp_template_name: whatsappTemplate.name,
          whatsapp_status: whatsappTemplate.status,
          whatsapp_template_data: whatsappTemplate,
          is_active: whatsappTemplate.status === 'APPROVED',
        }

        if (existingTemplate) {
          // Update existing template
          const { data: updatedTemplate, error } = await supabase
            .from('message_templates')
            .update({
              ...templateData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingTemplate.id)
            .select()
            .single()

          if (error) {
            throw error
          }

          results.updated.push(updatedTemplate)
        } else {
          // Create new template
          const { data: newTemplate, error } = await supabase
            .from('message_templates')
            .insert({
              organization_id: profile.organization_id,
              created_by: user.id,
              ...templateData,
            })
            .select()
            .single()

          if (error) {
            throw error
          }

          results.created.push(newTemplate)
        }

        results.synced.push({
          id: whatsappTemplate.id,
          name: whatsappTemplate.name,
          status: whatsappTemplate.status,
        })
      } catch (error) {
        console.error(`Error syncing template ${whatsappTemplate.id}:`, error)
        results.errors.push({
          templateId: whatsappTemplate.id,
          templateName: whatsappTemplate.name,
          error: error.message,
        })
      }
    }

    // Check for templates that were deleted from WhatsApp
    const whatsappTemplateIds = new Set(whatsappTemplates.map(t => t.id))
    const deletedTemplates = (existingTemplates || []).filter(
      t => t.whatsapp_template_id && !whatsappTemplateIds.has(t.whatsapp_template_id)
    )

    // Mark deleted templates as inactive
    for (const deletedTemplate of deletedTemplates) {
      await supabase
        .from('message_templates')
        .update({
          is_active: false,
          whatsapp_status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deletedTemplate.id)
    }

    return createSuccessResponse({
      summary: {
        totalWhatsAppTemplates: whatsappTemplates.length,
        synced: results.synced.length,
        created: results.created.length,
        updated: results.updated.length,
        deleted: deletedTemplates.length,
        errors: results.errors.length,
      },
      details: results,
      deletedTemplates: deletedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        whatsappTemplateId: t.whatsapp_template_id,
      })),
    })
  } catch (error) {
    console.error('Template sync error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Get organization's WhatsApp configuration
    const { data: org } = await supabase
      .from('organizations')
      .select('whatsapp_business_account_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.whatsapp_business_account_id) {
      return NextResponse.json(
        { error: 'WhatsApp Business Account not configured' },
        { status: 400 }
      )
    }

    const whatsappClient = await getWhatsAppClient(profile.organization_id)

    // Get templates from WhatsApp (for comparison)
    const whatsappTemplates = await whatsappClient.getTemplates(org.whatsapp_business_account_id)

    // Get existing templates from database
    const { data: dbTemplates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .not('whatsapp_template_id', 'is', null)

    const syncStatus = {
      whatsappTemplates: whatsappTemplates.length,
      databaseTemplates: dbTemplates?.length || 0,
      needsSync: false,
      syncDetails: {
        newInWhatsApp: [],
        updatedInWhatsApp: [],
        deletedFromWhatsApp: [],
        outOfSync: [],
      },
    }

    const dbTemplateMap = new Map((dbTemplates || []).map(t => [t.whatsapp_template_id, t]))

    // Check for new templates in WhatsApp
    for (const whatsappTemplate of whatsappTemplates) {
      const dbTemplate = dbTemplateMap.get(whatsappTemplate.id)

      if (!dbTemplate) {
        syncStatus.syncDetails.newInWhatsApp.push({
          id: whatsappTemplate.id,
          name: whatsappTemplate.name,
          status: whatsappTemplate.status,
        })
        syncStatus.needsSync = true
      } else if (dbTemplate.whatsapp_status !== whatsappTemplate.status) {
        syncStatus.syncDetails.updatedInWhatsApp.push({
          id: whatsappTemplate.id,
          name: whatsappTemplate.name,
          oldStatus: dbTemplate.whatsapp_status,
          newStatus: whatsappTemplate.status,
        })
        syncStatus.needsSync = true
      }
    }

    // Check for deleted templates
    const whatsappTemplateIds = new Set(whatsappTemplates.map(t => t.id))
    for (const dbTemplate of dbTemplates || []) {
      if (
        dbTemplate.whatsapp_template_id &&
        !whatsappTemplateIds.has(dbTemplate.whatsapp_template_id)
      ) {
        syncStatus.syncDetails.deletedFromWhatsApp.push({
          id: dbTemplate.id,
          name: dbTemplate.name,
          whatsappTemplateId: dbTemplate.whatsapp_template_id,
        })
        syncStatus.needsSync = true
      }
    }

    return createSuccessResponse({
      lastSyncAt: await getLastSyncTime(supabase, profile.organization_id),
      syncStatus,
    })
  } catch (error) {
    console.error('Template sync status error:', error)
    return createErrorResponse(error)
  }
}

function extractTemplateContent(whatsappTemplate: any): string {
  try {
    // Extract content from WhatsApp template structure
    const components = whatsappTemplate.components || []
    const bodyComponent = components.find(c => c.type === 'BODY')

    if (bodyComponent && bodyComponent.text) {
      return bodyComponent.text
    }

    return whatsappTemplate.name || 'WhatsApp Template'
  } catch (error) {
    console.error('Error extracting template content:', error)
    return 'WhatsApp Template'
  }
}

function extractTemplateVariables(
  whatsappTemplate: any
): Array<{ name: string; type: string; example?: string }> {
  try {
    const variables = []
    const components = whatsappTemplate.components || []

    for (const component of components) {
      if (component.example && component.example.body_text) {
        // Extract variables from body text examples
        const bodyText = component.text || ''
        const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []

        matches.forEach((match, index) => {
          variables.push({
            name: `var${index + 1}`,
            type: 'text',
            example: component.example.body_text[0]?.[index] || '',
          })
        })
      }
    }

    return variables
  } catch (error) {
    console.error('Error extracting template variables:', error)
    return []
  }
}

async function getLastSyncTime(supabase: any, organizationId: string): Promise<string | null> {
  const { data } = await supabase
    .from('message_templates')
    .select('updated_at')
    .eq('organization_id', organizationId)
    .not('whatsapp_template_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return data?.updated_at || null
}
