/**
 * Contact Segmentation System
 * Create and manage dynamic and static contact segments
 */

import { createClient } from '@/lib/supabase/server'

export interface SegmentRule {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in'
  value: any
  logic?: 'and' | 'or' // For combining multiple rules
}

export interface Segment {
  id: string
  name: string
  description?: string
  type: 'dynamic' | 'static'
  rules: SegmentRule[]
  contactCount: number
  lastCalculated?: string
  createdAt: string
}

/**
 * Create a new segment
 */
export async function createSegment(
  organizationId: string,
  name: string,
  rules: SegmentRule[],
  description?: string,
  type: 'dynamic' | 'static' = 'dynamic'
): Promise<{ success: boolean; segmentId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Calculate initial count
    const contactCount = await calculateSegmentSize(organizationId, rules)

    const { data, error } = await supabase
      .from('contact_segments')
      .insert({
        organization_id: organizationId,
        name,
        description,
        rules: rules,
        segment_type: type,
        contact_count: contactCount,
        last_calculated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // If static segment, populate members
    if (type === 'static') {
      await populateStaticSegment(data.id, organizationId, rules)
    }

    return {
      success: true,
      segmentId: data.id,
    }
  } catch (error) {
    console.error('Failed to create segment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create segment',
    }
  }
}

/**
 * Get contacts matching a segment
 */
export async function getSegmentContacts(
  segmentId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{
  contacts: Array<{
    id: string
    name: string
    email?: string
    phone: string
    leadScore: number
    tags?: string[]
  }>
  total: number
}> {
  try {
    const supabase = await createClient()

    // Get segment details
    const { data: segment } = await supabase
      .from('contact_segments')
      .select('*')
      .eq('id', segmentId)
      .single()

    if (!segment) {
      return { contacts: [], total: 0 }
    }

    if (segment.segment_type === 'static') {
      // Get from static membership table
      const { data: members, count } = await supabase
        .from('contact_segment_members')
        .select('contact:contacts(*)', { count: 'exact' })
        .eq('segment_id', segmentId)
        .range(offset, offset + limit - 1)

      const contacts =
        members?.map((m: any) => ({
          id: m.contact.id,
          name: m.contact.name,
          email: m.contact.email,
          phone: m.contact.phone,
          leadScore: m.contact.lead_score || 0,
          tags: m.contact.tags || [],
        })) || []

      return {
        contacts,
        total: count || 0,
      }
    } else {
      // Dynamic segment - query based on rules
      const query = buildSegmentQuery(supabase, segment.organization_id, segment.rules)
      const { data: contacts, count } = await query.range(offset, offset + limit - 1)

      return {
        contacts:
          contacts?.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            leadScore: c.lead_score || 0,
            tags: c.tags || [],
          })) || [],
        total: count || 0,
      }
    }
  } catch (error) {
    console.error('Failed to get segment contacts:', error)
    return { contacts: [], total: 0 }
  }
}

/**
 * Calculate segment size without fetching all contacts
 */
async function calculateSegmentSize(organizationId: string, rules: SegmentRule[]): Promise<number> {
  try {
    const supabase = await createClient()
    const query = buildSegmentQuery(supabase, organizationId, rules)
    const { count } = await query

    return count || 0
  } catch (error) {
    console.error('Failed to calculate segment size:', error)
    return 0
  }
}

/**
 * Build Supabase query from segment rules
 */
function buildSegmentQuery(supabase: any, organizationId: string, rules: SegmentRule[]) {
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)

  rules.forEach(rule => {
    switch (rule.operator) {
      case 'equals':
        query = query.eq(rule.field, rule.value)
        break
      case 'not_equals':
        query = query.neq(rule.field, rule.value)
        break
      case 'contains':
        query = query.ilike(rule.field, `%${rule.value}%`)
        break
      case 'gt':
        query = query.gt(rule.field, rule.value)
        break
      case 'lt':
        query = query.lt(rule.field, rule.value)
        break
      case 'gte':
        query = query.gte(rule.field, rule.value)
        break
      case 'lte':
        query = query.lte(rule.field, rule.value)
        break
      case 'in':
        query = query.in(rule.field, rule.value)
        break
      case 'not_in':
        query = query.not(rule.field, 'in', rule.value)
        break
    }
  })

  return query
}

/**
 * Populate static segment with current matching contacts
 */
async function populateStaticSegment(
  segmentId: string,
  organizationId: string,
  rules: SegmentRule[]
): Promise<number> {
  try {
    const supabase = await createClient()

    // Get matching contacts
    const query = buildSegmentQuery(supabase, organizationId, rules)
    const { data: contacts } = await query

    if (!contacts || contacts.length === 0) {
      return 0
    }

    // Insert memberships
    const { data: user } = await supabase.auth.getUser()

    const memberships = contacts.map(contact => ({
      segment_id: segmentId,
      contact_id: contact.id,
      added_by: user.data.user?.id,
    }))

    const { error } = await supabase.from('contact_segment_members').insert(memberships)

    if (error) {
      throw error
    }

    return contacts.length
  } catch (error) {
    console.error('Failed to populate static segment:', error)
    return 0
  }
}

/**
 * Refresh segment (recalculate for dynamic, update count for all)
 */
export async function refreshSegment(segmentId: string): Promise<{
  success: boolean
  contactCount: number
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get segment
    const { data: segment } = await supabase
      .from('contact_segments')
      .select('*')
      .eq('id', segmentId)
      .single()

    if (!segment) {
      return { success: false, contactCount: 0, error: 'Segment not found' }
    }

    // Calculate new count
    const contactCount = await calculateSegmentSize(segment.organization_id, segment.rules)

    // Update segment
    const { error } = await supabase
      .from('contact_segments')
      .update({
        contact_count: contactCount,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('id', segmentId)

    if (error) {
      throw error
    }

    return {
      success: true,
      contactCount,
    }
  } catch (error) {
    console.error('Failed to refresh segment:', error)
    return {
      success: false,
      contactCount: 0,
      error: error instanceof Error ? error.message : 'Failed to refresh segment',
    }
  }
}

/**
 * Get all segments for an organization
 */
export async function getSegments(organizationId: string): Promise<Segment[]> {
  try {
    const supabase = await createClient()

    const { data: segments } = await supabase
      .from('contact_segments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (!segments) {
      return []
    }

    return segments.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.segment_type,
      rules: s.rules,
      contactCount: s.contact_count,
      lastCalculated: s.last_calculated_at,
      createdAt: s.created_at,
    }))
  } catch (error) {
    console.error('Failed to get segments:', error)
    return []
  }
}

/**
 * Pre-defined segment templates
 */
export const SEGMENT_TEMPLATES = {
  VIP_CUSTOMERS: {
    name: 'VIP Customers',
    description: 'High-value customers with lead score > 80',
    rules: [{ field: 'lead_score', operator: 'gte' as const, value: 80 }],
  },
  ACTIVE_CUSTOMERS: {
    name: 'Active Customers',
    description: 'Engaged within last 30 days',
    rules: [
      {
        field: 'last_engagement_at',
        operator: 'gte' as const,
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  INACTIVE_CUSTOMERS: {
    name: 'Inactive (Churn Risk)',
    description: 'No engagement in 90+ days',
    rules: [
      {
        field: 'last_engagement_at',
        operator: 'lte' as const,
        value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  NEW_LEADS: {
    name: 'New Leads',
    description: 'Created within last 7 days',
    rules: [
      {
        field: 'created_at',
        operator: 'gte' as const,
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  HIGH_POTENTIAL: {
    name: 'High Potential',
    description: 'Lead score 60-80, warm leads',
    rules: [
      { field: 'lead_score', operator: 'gte' as const, value: 60 },
      { field: 'lead_score', operator: 'lte' as const, value: 80 },
    ],
  },
}

/**
 * Create segment from template
 */
export async function createSegmentFromTemplate(
  organizationId: string,
  templateKey: keyof typeof SEGMENT_TEMPLATES
): Promise<{ success: boolean; segmentId?: string; error?: string }> {
  const template = SEGMENT_TEMPLATES[templateKey]

  return createSegment(organizationId, template.name, template.rules, template.description, 'dynamic')
}

/**
 * Add contact to static segment
 */
export async function addContactToSegment(
  segmentId: string,
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Check segment type
    const { data: segment } = await supabase
      .from('contact_segments')
      .select('segment_type')
      .eq('id', segmentId)
      .single()

    if (!segment || segment.segment_type !== 'static') {
      return { success: false, error: 'Can only add contacts to static segments' }
    }

    const { data: user } = await supabase.auth.getUser()

    const { error } = await supabase.from('contact_segment_members').insert({
      segment_id: segmentId,
      contact_id: contactId,
      added_by: user.data.user?.id,
    })

    if (error) {
      if (error.code === '23505') {
        // Duplicate - already in segment
        return { success: true }
      }
      throw error
    }

    // Update count
    await refreshSegment(segmentId)

    return { success: true }
  } catch (error) {
    console.error('Failed to add contact to segment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add contact',
    }
  }
}

/**
 * Remove contact from static segment
 */
export async function removeContactFromSegment(
  segmentId: string,
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_segment_members')
      .delete()
      .eq('segment_id', segmentId)
      .eq('contact_id', contactId)

    if (error) {
      throw error
    }

    // Update count
    await refreshSegment(segmentId)

    return { success: true }
  } catch (error) {
    console.error('Failed to remove contact from segment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove contact',
    }
  }
}
