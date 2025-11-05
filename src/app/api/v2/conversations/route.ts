/**
 * API V2: Conversations Endpoint
 * GET /api/v2/conversations - List conversations with advanced filtering
 * POST /api/v2/conversations - Create new conversation
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createV2SuccessResponse,
  createV2ListResponse,
  createV2CreatedResponse,
  V2Errors,
  buildResourceLinks
} from '@/lib/api/v2/response'
import {
  extractPaginationParams,
  buildPaginationMeta,
  extractSortParams,
  extractFilters,
  applyFilters
} from '@/lib/api/v2/pagination'
import { getApiVersion, validateApiVersion } from '@/lib/api/versioning'
import { EventBus } from '@/lib/events/event-bus'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/v2/conversations
 * List conversations with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = uuidv4()
  const apiVersion = getApiVersion(request)

  try {
    // Validate API version
    validateApiVersion(apiVersion)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return V2Errors.unauthorized('Authentication required', { requestId, startTime })
    }

    // Get user profile with organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return V2Errors.forbidden('No organization access', { requestId, startTime })
    }

    // Extract query parameters
    const { page, limit, offset } = extractPaginationParams(request)
    const { sortBy, sortOrder } = extractSortParams(
      request,
      ['created_at', 'updated_at', 'last_message_at', 'status', 'priority'],
      'last_message_at',
      'desc'
    )
    const filters = extractFilters(request, ['status', 'priority', 'assigned_to', 'contact_id'])

    // Build query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(id, name, phone_number, whatsapp_id),
        assigned_agent:profiles!conversations_assigned_to_fkey(id, full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)

    // Apply filters
    const filterConfig = {
      status: { operator: 'eq' as const },
      priority: { operator: 'eq' as const },
      assigned_to: { operator: 'eq' as const },
      contact_id: { operator: 'eq' as const }
    }
    query = applyFilters(query, filters, filterConfig)

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: conversations, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return V2Errors.internalError('Failed to fetch conversations', { requestId, startTime })
    }

    // Build pagination metadata
    const pagination = buildPaginationMeta(page, limit, count || 0)

    // Add HATEOAS links to each conversation
    const conversationsWithLinks = conversations?.map(conv => ({
      ...conv,
      _links: buildResourceLinks('conversations', conv.id, process.env.NEXT_PUBLIC_APP_URL)
    })) || []

    // Return paginated response
    return createV2ListResponse(
      conversationsWithLinks,
      pagination,
      {
        requestId,
        startTime,
        version: apiVersion,
        baseUrl: process.env.NEXT_PUBLIC_APP_URL,
        endpoint: '/api/v2/conversations'
      }
    )

  } catch (error) {
    console.error('API Error:', error)
    return V2Errors.internalError(
      error instanceof Error ? error.message : 'Unknown error',
      { requestId, startTime }
    )
  }
}

/**
 * POST /api/v2/conversations
 * Create new conversation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = uuidv4()
  const apiVersion = getApiVersion(request)

  try {
    // Validate API version
    validateApiVersion(apiVersion)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return V2Errors.unauthorized('Authentication required', { requestId, startTime })
    }

    // Get user profile with organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return V2Errors.forbidden('No organization access', { requestId, startTime })
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (e) {
      return V2Errors.badRequest('Invalid JSON in request body', undefined, { requestId, startTime })
    }

    // Validate required fields
    if (!body.contact_id) {
      return V2Errors.validationError('contact_id', 'Contact ID is required', { requestId, startTime })
    }

    // Verify contact belongs to organization
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', body.contact_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (contactError || !contact) {
      return V2Errors.notFound('Contact', { requestId, startTime })
    }

    // Create conversation
    const conversationId = uuidv4()
    const conversationData = {
      id: conversationId,
      organization_id: profile.organization_id,
      contact_id: body.contact_id,
      status: body.status || 'open',
      priority: body.priority || 'medium',
      subject: body.subject || null,
      assigned_to: body.assigned_to || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select(`
        *,
        contact:contacts(id, name, phone_number, whatsapp_id),
        assigned_agent:profiles!conversations_assigned_to_fkey(id, full_name, email)
      `)
      .single()

    if (createError) {
      console.error('Create error:', createError)
      return V2Errors.internalError('Failed to create conversation', { requestId, startTime })
    }

    // Publish ConversationCreated event
    await EventBus.publish({
      aggregateId: conversationId,
      aggregateType: 'conversation',
      eventType: 'ConversationCreated',
      eventData: {
        contactId: body.contact_id,
        status: conversationData.status,
        priority: conversationData.priority,
        subject: conversationData.subject
      },
      organizationId: profile.organization_id,
      createdBy: user.id,
      metadata: {
        source: 'api_v2',
        userAgent: request.headers.get('user-agent')
      }
    })

    // Add HATEOAS links
    const conversationWithLinks = {
      ...conversation,
      _links: buildResourceLinks('conversations', conversationId, process.env.NEXT_PUBLIC_APP_URL)
    }

    // Return created response
    const resourceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/v2/conversations/${conversationId}`
    return createV2CreatedResponse(
      conversationWithLinks,
      resourceUrl,
      { requestId, startTime, version: apiVersion }
    )

  } catch (error) {
    console.error('API Error:', error)
    return V2Errors.internalError(
      error instanceof Error ? error.message : 'Unknown error',
      { requestId, startTime }
    )
  }
}
