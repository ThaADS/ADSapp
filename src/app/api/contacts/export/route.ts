import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { BulkOperationQueue } from '@/lib/bulk-operations/queue'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const {
      format = 'csv',
      filters = {},
      fields = ['name', 'phone_number', 'email', 'tags', 'created_at', 'last_message_at'],
      includeStats = false
    } = body

    // Validate format
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: csv, xlsx, json' },
        { status: 400 }
      )
    }

    // Validate fields
    const allowedFields = [
      'id', 'name', 'phone_number', 'whatsapp_id', 'email', 'tags', 'notes',
      'is_blocked', 'created_at', 'updated_at', 'last_message_at'
    ]

    const invalidFields = fields.filter(field => !allowedFields.includes(field))
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Invalid fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Count contacts that match filters
    let countQuery = supabase
      .from('contacts')
      .select('id', { count: 'exact' })
      .eq('organization_id', profile.organization_id)

    // Apply filters
    countQuery = applyFilters(countQuery, filters)

    const { count } = await countQuery

    if (count === 0) {
      return NextResponse.json(
        { error: 'No contacts match the specified filters' },
        { status: 400 }
      )
    }

    // Create export configuration
    const exportConfig = {
      format,
      filters,
      fields,
      includeStats
    }

    // Create bulk operation
    const queue = new BulkOperationQueue()
    const operation = await queue.createOperation({
      organizationId: profile.organization_id,
      userId: user.id,
      type: 'bulk_contact_export',
      status: 'queued',
      totalItems: count || 0,
      configuration: exportConfig
    })

    return createSuccessResponse({
      operation,
      estimatedContacts: count,
      format,
      fields,
      filters
    }, 201)

  } catch (error) {
    console.error('Contact export error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const fields = searchParams.get('fields')?.split(',') || ['name', 'phone_number', 'email']
    const segment = searchParams.get('segment')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '100')))

    // For small exports, return data directly
    if (limit <= 100) {
      const supabase = await createClient()

      let query = supabase
        .from('contacts')
        .select(generateSelectString(fields))
        .eq('organization_id', profile.organization_id)
        .limit(limit)

      // Apply filters
      if (segment) {
        query = applySegmentFilter(query, segment)
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      const { data: contacts, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Format data based on requested format
      const formattedData = formatExportData(contacts || [], fields, format)

      if (format === 'csv') {
        return new NextResponse(formattedData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="contacts.csv"'
          }
        })
      }

      return createSuccessResponse({
        contacts: formattedData,
        count: contacts?.length || 0,
        format,
        fields
      })
    }

    // For larger exports, create bulk operation
    return NextResponse.json(
      { error: 'Use POST method for exports larger than 100 contacts' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Direct contact export error:', error)
    return createErrorResponse(error)
  }
}

function applyFilters(query: any, filters: any) {
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }

  if (filters.segment) {
    query = applySegmentFilter(query, filters.segment)
  }

  if (filters.blocked !== undefined) {
    query = query.eq('is_blocked', filters.blocked)
  }

  if (filters.createdAfter) {
    query = query.gte('created_at', filters.createdAfter)
  }

  if (filters.createdBefore) {
    query = query.lte('created_at', filters.createdBefore)
  }

  if (filters.lastMessageAfter) {
    query = query.gte('last_message_at', filters.lastMessageAfter)
  }

  if (filters.lastMessageBefore) {
    query = query.lte('last_message_at', filters.lastMessageBefore)
  }

  return query
}

function applySegmentFilter(query: any, segment: string) {
  switch (segment) {
    case 'active':
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      return query.gte('last_message_at', thirtyDaysAgo)

    case 'inactive':
      const thirtyDaysAgoInactive = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      return query.or(`last_message_at.is.null,last_message_at.lt.${thirtyDaysAgoInactive}`)

    case 'new':
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      return query.gte('created_at', sevenDaysAgo)

    case 'vip':
      return query.contains('tags', ['vip'])

    case 'blocked':
      return query.eq('is_blocked', true)

    default:
      return query
  }
}

function generateSelectString(fields: string[]): string {
  // Ensure we always select ID for data integrity
  const selectFields = ['id', ...fields.filter(f => f !== 'id')]
  return selectFields.join(', ')
}

function formatExportData(contacts: any[], fields: string[], format: string): any {
  const processedContacts = contacts.map(contact => {
    const processedContact: any = {}

    for (const field of fields) {
      switch (field) {
        case 'tags':
          processedContact[field] = Array.isArray(contact[field])
            ? contact[field].join(', ')
            : contact[field] || ''
          break

        case 'created_at':
        case 'updated_at':
        case 'last_message_at':
          processedContact[field] = contact[field]
            ? new Date(contact[field]).toISOString()
            : ''
          break

        default:
          processedContact[field] = contact[field] || ''
      }
    }

    return processedContact
  })

  if (format === 'csv') {
    return convertToCSV(processedContacts)
  }

  return processedContacts
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  return csvContent
}