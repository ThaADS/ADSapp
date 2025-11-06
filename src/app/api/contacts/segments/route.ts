// @ts-nocheck - Type definitions need review
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Calculate segment statistics
    const segments = await Promise.all([
      calculateSegment(supabase, profile.organization_id, 'all', 'All Contacts'),
      calculateSegment(supabase, profile.organization_id, 'active', 'Active (Last 30 days)'),
      calculateSegment(supabase, profile.organization_id, 'inactive', 'Inactive (30+ days)'),
      calculateSegment(supabase, profile.organization_id, 'new', 'New (Last 7 days)'),
      calculateSegment(supabase, profile.organization_id, 'vip', 'VIP Contacts'),
      calculateSegment(supabase, profile.organization_id, 'blocked', 'Blocked Contacts'),
      calculateSegment(supabase, profile.organization_id, 'no_conversations', 'No Conversations'),
      calculateSegment(
        supabase,
        profile.organization_id,
        'high_volume',
        'High Volume (10+ messages)'
      ),
    ])

    // Get tag-based segments
    const tagSegments = await calculateTagSegments(supabase, profile.organization_id)

    // Get custom segments if any
    const { data: customSegments } = await supabase
      .from('contact_segments')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const customSegmentStats = await Promise.all(
      (customSegments || []).map(async segment => {
        const count = await calculateCustomSegmentCount(
          supabase,
          profile.organization_id,
          segment.criteria
        )
        return {
          id: segment.id,
          name: segment.name,
          description: segment.description,
          count,
          criteria: segment.criteria,
          lastUpdated: segment.updated_at,
        }
      })
    )

    return createSuccessResponse({
      predefinedSegments: segments,
      tagSegments,
      customSegments: customSegmentStats,
      summary: {
        totalContacts: segments.find(s => s.key === 'all')?.count || 0,
        activeContacts: segments.find(s => s.key === 'active')?.count || 0,
        newContacts: segments.find(s => s.key === 'new')?.count || 0,
        blockedContacts: segments.find(s => s.key === 'blocked')?.count || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching contact segments:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { name, description, criteria } = body

    if (!name || !criteria) {
      return NextResponse.json({ error: 'Name and criteria are required' }, { status: 400 })
    }

    // Validate criteria structure
    if (!validateSegmentCriteria(criteria)) {
      return NextResponse.json({ error: 'Invalid criteria structure' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if segment with same name exists
    const { data: existingSegment } = await supabase
      .from('contact_segments')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('name', name)
      .single()

    if (existingSegment) {
      return NextResponse.json({ error: 'Segment with this name already exists' }, { status: 409 })
    }

    // Test the criteria to ensure it works
    const testCount = await calculateCustomSegmentCount(supabase, profile.organization_id, criteria)

    // Create the segment
    const { data: segment, error } = await supabase
      .from('contact_segments')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name,
        description,
        criteria,
        contact_count: testCount,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse(
      {
        ...segment,
        count: testCount,
      },
      201
    )
  } catch (error) {
    console.error('Error creating contact segment:', error)
    return createErrorResponse(error)
  }
}

async function calculateSegment(supabase: any, organizationId: string, key: string, name: string) {
  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact' })
    .eq('organization_id', organizationId)

  switch (key) {
    case 'all':
      // No additional filters
      break

    case 'active':
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_message_at', thirtyDaysAgo)
      break

    case 'inactive':
      const thirtyDaysAgoInactive = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`last_message_at.is.null,last_message_at.lt.${thirtyDaysAgoInactive}`)
      break

    case 'new':
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', sevenDaysAgo)
      break

    case 'vip':
      query = query.contains('tags', ['vip'])
      break

    case 'blocked':
      query = query.eq('is_blocked', true)
      break

    case 'no_conversations':
      // Contacts with no conversations
      query = supabase
        .from('contacts')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .not(
          'id',
          'in',
          `(
          SELECT DISTINCT contact_id
          FROM conversations
          WHERE organization_id = '${organizationId}'
        )`
        )
      break

    case 'high_volume':
      // Contacts with 10+ messages in conversations
      query = supabase
        .from('contacts')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .in(
          'id',
          `(
          SELECT c.contact_id
          FROM conversations c
          JOIN messages m ON c.id = m.conversation_id
          WHERE c.organization_id = '${organizationId}'
          GROUP BY c.contact_id
          HAVING COUNT(m.id) >= 10
        )`
        )
      break

    default:
      break
  }

  const { count } = await query

  return {
    key,
    name,
    count: count || 0,
    description: getSegmentDescription(key),
  }
}

async function calculateTagSegments(supabase: any, organizationId: string) {
  // Get all unique tags
  const { data: contacts } = await supabase
    .from('contacts')
    .select('tags')
    .eq('organization_id', organizationId)
    .not('tags', 'is', null)

  const tagCounts = new Map()

  for (const contact of contacts || []) {
    const tags = contact.tags || []
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      key: `tag:${tag}`,
      name: `Tagged: ${tag}`,
      count,
      tag,
      description: `Contacts tagged with "${tag}"`,
    }))
    .sort((a, b) => b.count - a.count)
}

async function calculateCustomSegmentCount(
  supabase: any,
  organizationId: string,
  criteria: any
): Promise<number> {
  try {
    let query = supabase
      .from('contacts')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply criteria filters
    for (const condition of criteria.conditions || []) {
      query = applyCondition(query, condition)
    }

    const { count } = await query
    return count || 0
  } catch (error) {
    console.error('Error calculating custom segment count:', error)
    return 0
  }
}

function applyCondition(query: any, condition: any) {
  const { field, operator, value } = condition

  switch (operator) {
    case 'equals':
      return query.eq(field, value)

    case 'not_equals':
      return query.neq(field, value)

    case 'contains':
      return query.ilike(field, `%${value}%`)

    case 'not_contains':
      return query.not('ilike', field, `%${value}%`)

    case 'starts_with':
      return query.ilike(field, `${value}%`)

    case 'ends_with':
      return query.ilike(field, `%${value}`)

    case 'is_null':
      return query.is(field, null)

    case 'is_not_null':
      return query.not('is', field, null)

    case 'greater_than':
      return query.gt(field, value)

    case 'less_than':
      return query.lt(field, value)

    case 'greater_than_or_equal':
      return query.gte(field, value)

    case 'less_than_or_equal':
      return query.lte(field, value)

    case 'in':
      return query.in(field, Array.isArray(value) ? value : [value])

    case 'not_in':
      return query.not('in', field, Array.isArray(value) ? value : [value])

    case 'has_tag':
      return query.contains('tags', [value])

    case 'not_has_tag':
      return query.not('contains', 'tags', [value])

    default:
      return query
  }
}

function validateSegmentCriteria(criteria: any): boolean {
  if (!criteria || typeof criteria !== 'object') {
    return false
  }

  if (!Array.isArray(criteria.conditions)) {
    return false
  }

  const validFields = [
    'name',
    'phone_number',
    'email',
    'tags',
    'notes',
    'is_blocked',
    'created_at',
    'updated_at',
    'last_message_at',
  ]
  const validOperators = [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'is_null',
    'is_not_null',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'in',
    'not_in',
    'has_tag',
    'not_has_tag',
  ]

  for (const condition of criteria.conditions) {
    if (!condition.field || !condition.operator) {
      return false
    }

    if (!validFields.includes(condition.field)) {
      return false
    }

    if (!validOperators.includes(condition.operator)) {
      return false
    }

    // Value is optional for some operators
    const operatorsWithoutValue = ['is_null', 'is_not_null']
    if (!operatorsWithoutValue.includes(condition.operator) && condition.value === undefined) {
      return false
    }
  }

  return true
}

function getSegmentDescription(key: string): string {
  const descriptions = {
    all: 'All contacts in your organization',
    active: 'Contacts who have sent or received messages in the last 30 days',
    inactive: 'Contacts who have not been active for more than 30 days',
    new: 'Contacts added in the last 7 days',
    vip: 'Contacts tagged as VIP',
    blocked: 'Contacts that have been blocked',
    no_conversations: 'Contacts who have never had a conversation',
    high_volume: 'Contacts with 10 or more messages',
  }

  return descriptions[key] || ''
}
