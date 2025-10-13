import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse, validatePagination } from '@/lib/api-utils'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId } = getTenantContext(request);

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const whatsappStatus = searchParams.get('whatsappStatus')
    const { page, limit, offset } = validatePagination(request)

    const supabase = await createClient()

    let query = supabase
      .from('message_templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('is_active', status === 'active')
    }

    if (whatsappStatus) {
      query = query.eq('whatsapp_status', whatsappStatus)
    }

    const { data: templates, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Get usage statistics for each template
    const templatesWithStats = await Promise.all(
      (templates || []).map(async (template) => {
        const { data: usage } = await supabase
          .from('messages')
          .select('id')
          .eq('template_id', template.id)

        return {
          ...template,
          usageCount: usage?.length || 0
        }
      })
    )

    return createSuccessResponse({
      templates: templatesWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0)
      }
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  // Apply standard API middleware (tenant validation + standard rate limiting)
  const middlewareResponse = await standardApiMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    // Get tenant context from middleware (already validated)
    const { organizationId, userId } = getTenantContext(request);

    const body = await request.json();
    const {
      name,
      content,
      category = 'general',
      variables = [],
      whatsappTemplate,
      submitToWhatsApp = false
    } = body

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validate variables format
    if (!Array.isArray(variables)) {
      return NextResponse.json(
        { error: 'Variables must be an array' },
        { status: 400 }
      )
    }

    for (const variable of variables) {
      if (!variable.name || !variable.type) {
        return NextResponse.json(
          { error: 'Each variable must have name and type' },
          { status: 400 }
        )
      }
    }

    let whatsappTemplateId: string | null = null
    let whatsappStatus = 'draft'

    // Submit to WhatsApp if requested
    if (submitToWhatsApp && whatsappTemplate) {
      try {
        const whatsappClient = await getWhatsAppClient(organizationId)

        // Get organization's business account ID
        const { data: org } = await supabase
          .from('organizations')
          .select('whatsapp_business_account_id')
          .eq('id', organizationId)
          .single()

        if (!org?.whatsapp_business_account_id) {
          return NextResponse.json(
            { error: 'WhatsApp Business Account not configured' },
            { status: 400 }
          )
        }

        whatsappTemplateId = await whatsappClient.createTemplate(
          org.whatsapp_business_account_id,
          whatsappTemplate
        )

        whatsappStatus = 'pending'
      } catch (error) {
        console.error('Error submitting template to WhatsApp:', error)
        return NextResponse.json(
          { error: `Failed to submit template to WhatsApp: ${error.message}` },
          { status: 400 }
        )
      }
    }

    // Create template in database
    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        name,
        content,
        category,
        variables,
        whatsapp_template_id: whatsappTemplateId,
        whatsapp_template_name: whatsappTemplate?.name,
        whatsapp_status: whatsappStatus,
        whatsapp_template_data: whatsappTemplate,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(template, 201)

  } catch (error) {
    console.error('Error creating template:', error)
    return createErrorResponse(error)
  }
}
