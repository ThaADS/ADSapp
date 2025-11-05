import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse, validatePagination, validateSortOrder } from '@/lib/api-utils'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // 🔧 FIX: Query organization directly instead of relying on middleware headers
    // Root cause: Next.js 15 doesn't propagate headers when middleware returns null
    const user = await requireAuthenticatedUser();
    const userOrg = await getUserOrganization(user.id);
    const organizationId = userOrg.organization_id;

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const segment = searchParams.get('segment')
    const blocked = searchParams.get('blocked')
    const { page, limit, offset } = validatePagination(request)
    const { sortBy, ascending } = validateSortOrder(request, ['name', 'phone_number', 'created_at', 'last_message_at'])

    const supabase = await createClient()

    let query = supabase
      .from('contacts')
      .select(`
        *,
        conversations (
          id,
          status,
          last_message_at
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    if (blocked !== null) {
      query = query.eq('is_blocked', blocked === 'true')
    }

    // Apply segmentation
    if (segment) {
      query = await applySegmentation(query, segment, organizationId)
    }

    const { data: contacts, error, count } = await query
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Enhance contacts with additional data
    const enhancedContacts = (contacts || []).map(contact => {
      const activeConversations = contact.conversations?.filter(c => c.status === 'open' || c.status === 'pending') || []
      const lastConversation = contact.conversations?.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      )[0]

      return {
        ...contact,
        activeConversations: activeConversations.length,
        totalConversations: contact.conversations?.length || 0,
        lastContactDate: lastConversation?.last_message_at || contact.last_message_at,
        conversationStatus: lastConversation?.status || null
      }
    })

    return createSuccessResponse({
      contacts: enhancedContacts,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0)
      },
      filters: {
        search,
        tags,
        segment,
        blocked,
        sortBy,
        sortOrder: ascending ? 'asc' : 'desc'
      }
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔧 FIX: Query organization directly instead of relying on middleware headers
    const user = await requireAuthenticatedUser();
    const userOrg = await getUserOrganization(user.id);
    const organizationId = userOrg.organization_id;
    const userId = user.id;

    const body = await request.json();
    const {
      phone_number,
      name,
      email,
      tags = [],
      notes,
      metadata = {},
      whatsapp_id
    } = body

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone_number.replace(/[\s-()]/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()

    // Check for duplicates
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('organization_id', organizationId)
      .eq('phone_number', phone_number)
      .single()

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact with this phone number already exists' },
        { status: 409 }
      )
    }

    // Create contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: organizationId,
        phone_number,
        whatsapp_id: whatsapp_id || phone_number,
        name,
        email,
        tags,
        notes,
        metadata: {
          ...metadata,
          created_by: userId,
          source: 'manual'
        }
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(contact, 201)

  } catch (error) {
    console.error('Error creating contact:', error)
    return createErrorResponse(error)
  }
}

async function applySegmentation(query: any, segment: string, organizationId: string) {
  switch (segment) {
    case 'active':
      // Contacts with messages in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      return query.gte('last_message_at', thirtyDaysAgo)

    case 'inactive':
      // Contacts with no messages in last 30 days
      const thirtyDaysAgoInactive = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      return query.or(`last_message_at.is.null,last_message_at.lt.${thirtyDaysAgoInactive}`)

    case 'new':
      // Contacts created in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      return query.gte('created_at', sevenDaysAgo)

    case 'vip':
      // Contacts with VIP tag
      return query.contains('tags', ['vip'])

    case 'blocked':
      // Blocked contacts
      return query.eq('is_blocked', true)

    default:
      return query
  }
}
