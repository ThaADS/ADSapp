import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const { data: usage } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('template_id', template.id)
      .order('created_at', { ascending: false })
      .limit(100)

    // Get recent usage breakdown
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentUsage = (usage || []).filter(u => new Date(u.created_at) >= last30Days)

    const templateWithStats = {
      ...template,
      usageStats: {
        totalUsage: usage?.length || 0,
        recentUsage: recentUsage.length,
        lastUsed: usage?.[0]?.created_at || null
      }
    }

    return createSuccessResponse(templateWithStats)

  } catch (error) {
    console.error('Error fetching template:', error)
    return createErrorResponse(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const {
      name,
      content,
      category,
      variables,
      whatsappTemplate,
      submitToWhatsApp = false,
      is_active
    } = body

    const supabase = await createClient()

    // Check if template exists
    const { data: existingTemplate } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (category !== undefined) updateData.category = category
    if (variables !== undefined) updateData.variables = variables
    if (is_active !== undefined) updateData.is_active = is_active

    // Handle WhatsApp template updates
    if (submitToWhatsApp && whatsappTemplate) {
      try {
        const whatsappClient = await getWhatsAppClient(profile.organization_id)

        // Get organization's business account ID
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

        // If template already exists in WhatsApp, delete and recreate
        if (existingTemplate.whatsapp_template_name) {
          try {
            await whatsappClient.deleteTemplate(
              org.whatsapp_business_account_id,
              existingTemplate.whatsapp_template_name
            )
          } catch (error) {
            console.warn('Failed to delete existing WhatsApp template:', error)
          }
        }

        const whatsappTemplateId = await whatsappClient.createTemplate(
          org.whatsapp_business_account_id,
          whatsappTemplate
        )

        updateData.whatsapp_template_id = whatsappTemplateId
        updateData.whatsapp_template_name = whatsappTemplate.name
        updateData.whatsapp_status = 'pending'
        updateData.whatsapp_template_data = whatsappTemplate

      } catch (error) {
        console.error('Error updating WhatsApp template:', error)
        return NextResponse.json(
          { error: `Failed to update WhatsApp template: ${error.message}` },
          { status: 400 }
        )
      }
    }

    // Update template
    const { data: updatedTemplate, error } = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(updatedTemplate)

  } catch (error) {
    console.error('Error updating template:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Check if template exists
    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if template is being used in any bulk operations
    const { data: bulkOps } = await supabase
      .from('bulk_operations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('type', 'bulk_message')
      .in('status', ['queued', 'processing'])
      .contains('configuration', { templateId: params.id })

    if (bulkOps && bulkOps.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template while it is being used in active bulk operations' },
        { status: 400 }
      )
    }

    // Delete from WhatsApp if it exists there
    if (template.whatsapp_template_name) {
      try {
        const whatsappClient = await getWhatsAppClient(profile.organization_id)

        const { data: org } = await supabase
          .from('organizations')
          .select('whatsapp_business_account_id')
          .eq('id', profile.organization_id)
          .single()

        if (org?.whatsapp_business_account_id) {
          await whatsappClient.deleteTemplate(
            org.whatsapp_business_account_id,
            template.whatsapp_template_name
          )
        }
      } catch (error) {
        console.warn('Failed to delete WhatsApp template:', error)
        // Continue with database deletion even if WhatsApp deletion fails
      }
    }

    // Delete template from database
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      id: params.id,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting template:', error)
    return createErrorResponse(error)
  }
}