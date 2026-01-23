import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
  validatePagination,
} from '@/lib/api-utils'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'
import {
  generateApiCacheKey,
  getCachedApiResponse,
  cacheApiResponse,
  CacheConfigs,
  invalidateCache,
  getCacheHeaders,
  addCacheHitHeader,
} from '@/lib/cache/api-cache'

export async function GET(request: NextRequest) {
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

    // Get organization from query params or user profile
    const { searchParams } = new URL(request.url)
    let organizationId = searchParams.get('organization_id')

    if (!organizationId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      organizationId = profile?.organization_id || ''
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const whatsappStatus = searchParams.get('whatsappStatus')
    const { page, limit, offset} = validatePagination(request)

    // 🚀 PERFORMANCE: Generate cache key from request parameters
    const cacheKey = generateApiCacheKey(organizationId, 'templates', request)

    // 🚀 PERFORMANCE: Try to get from cache (30 min TTL - templates rarely change)
    const cached = await getCachedApiResponse<any>(cacheKey, CacheConfigs.templates)
    if (cached) {
      const headers = new Headers(getCacheHeaders(CacheConfigs.templates.ttl))
      addCacheHitHeader(headers, true, cached.cacheAge)
      return NextResponse.json(cached.data, { headers })
    }

    let query = supabase
      .from('message_templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (category) {
      query = query.eq('category', category)
    }

    // Note: Database schema doesn't have is_active or status fields
    // All templates in database are considered active/approved
    // Commenting out status filter for now
    // if (status) {
    //   query = query.eq('is_active', status === 'active')
    // }

    if (whatsappStatus) {
      query = query.eq('whatsapp_status', whatsappStatus)
    }

    const {
      data: templates,
      error,
      count,
    } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Transform database templates to frontend format
    const transformedTemplates = await Promise.all(
      (templates || []).map(async template => {
        const { data: usage } = await supabase
          .from('messages')
          .select('id')
          .eq('template_id', template.id)

        // Transform database format to WhatsAppTemplate format with null-safe access
        const templateName = template.name || 'Unnamed Template'
        const displayName = templateName
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')

        return {
          id: template.id,
          name: templateName,
          displayName,
          category: template.category || 'custom',
          language: template.language || 'nl', // Fallback if column doesn't exist
          status: 'approved', // All templates in database are considered approved
          content: {
            body: {
              text: template.content || ''
            }
          },
          variables: (template.variables || []).map((v: string) => ({
            name: v,
            type: 'text',
            required: true,
            example: v,
            description: `Value for ${v}`
          })),
          created_at: template.created_at,
          updated_at: template.updated_at,
          organization_id: template.organization_id,
          usageCount: usage?.length || 0
        }
      })
    )

    // Return direct JSON to match frontend expectations
    // Frontend expects { templates: [...], pagination: {...} } directly
    const responseData = {
      templates: transformedTemplates,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    }

    // 🚀 PERFORMANCE: Cache the response (30 min TTL)
    await cacheApiResponse(cacheKey, responseData, CacheConfigs.templates)

    const headers = new Headers(getCacheHeaders(CacheConfigs.templates.ttl))
    addCacheHitHeader(headers, false)

    return NextResponse.json(responseData, { headers })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
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

    const organizationId = profile?.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      content,
      category = 'general',
      variables = [],
      whatsappTemplate,
      submitToWhatsApp = false,
    } = body

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 })
    }

    // Validate variables format
    if (!Array.isArray(variables)) {
      return NextResponse.json({ error: 'Variables must be an array' }, { status: 400 })
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
        created_by: user.id,
        name,
        content,
        category,
        variables,
        whatsapp_template_id: whatsappTemplateId,
        whatsapp_template_name: whatsappTemplate?.name,
        whatsapp_status: whatsappStatus,
        whatsapp_template_data: whatsappTemplate,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // 🚀 PERFORMANCE: Invalidate templates cache after creating new template
    await invalidateCache.templates(organizationId)

    return createSuccessResponse(template, 201)
  } catch (error) {
    console.error('Error creating template:', error)
    return createErrorResponse(error)
  }
}
