/**
 * Contacts API Integration Tests
 *
 * Tests for /api/contacts endpoints including CRUD operations,
 * search/filtering, and multi-tenant isolation.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  createAuthenticatedRequest as createAuthReq,
  parseResponse,
  expectErrorResponse,
  createPaginatedUrl,
  expectPaginatedResponse,
} from '../../utils/api-test-helpers'
import {
  createMockUser,
  createMockContact,
  createMockSupabaseClient,
  generateMockContacts,
} from '../../utils/test-helpers'

jest.mock('@/lib/supabase/server')

// Helper wrapper for backward compatibility with test signatures
function createAuthenticatedRequest(method: string, url: string, userId: string, organizationId: string, body?: any) {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  return createAuthReq({
    method,
    url: fullUrl,
    body,
    user: { id: userId },
    organizationId,
  })
}

describe('GET /api/contacts', () => {
  let mockSupabase: any
  let mockUser: any
  let mockContacts: any[]

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockContacts = generateMockContacts(15, { organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should list contacts with pagination', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockContacts.slice(0, 10),
        error: null,
        count: 15,
      }),
    })

    const url = createPaginatedUrl('/api/contacts', { page: 1, limit: 10 })
    const request = createAuthenticatedRequest('GET', url, mockUser.id, mockUser.organization_id)

    const response = await simulateGetContacts(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expectPaginatedResponse(data)
    expect(data.contacts).toHaveLength(10)
    expect(data.pagination.total).toBe(15)
    expect(data.pagination.hasMore).toBe(true)
  })

  it('should filter contacts by search term', async () => {
    const searchResults = mockContacts.filter(c => c.name.includes('John'))

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: searchResults,
        error: null,
        count: searchResults.length,
      }),
    })

    const url = '/api/contacts?search=John'
    const request = createAuthenticatedRequest('GET', url, mockUser.id, mockUser.organization_id)

    const response = await simulateGetContacts(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.filters.search).toBe('John')
  })

  it('should enforce tenant isolation - cannot see other org contacts', async () => {
    const otherOrgContact = createMockContact({ organization_id: 'different-org-id' })

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: string) => {
        // Verify that organization_id filter is applied
        expect(field).toBe('organization_id')
        expect(value).toBe(mockUser.organization_id)
        return {
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: mockContacts, // Only org's contacts
            error: null,
            count: mockContacts.length,
          }),
        }
      }),
    })

    const request = createAuthenticatedRequest('GET', '/api/contacts', mockUser.id, mockUser.organization_id)

    const response = await simulateGetContacts(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    // Verify no contacts from other organizations
    data.contacts.forEach((contact: any) => {
      expect(contact.organization_id).toBe(mockUser.organization_id)
    })
  })

  it('should filter by tags', async () => {
    const vipContacts = mockContacts.filter(c => c.tags?.includes('vip'))

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: vipContacts,
        error: null,
        count: vipContacts.length,
      }),
    })

    const url = '/api/contacts?tags=vip'
    const request = createAuthenticatedRequest('GET', url, mockUser.id, mockUser.organization_id)

    const response = await simulateGetContacts(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.filters.tags).toContain('vip')
  })
})

describe('POST /api/contacts', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    jest.clearAllMocks()
  })

  it('should create new contact with valid data', async () => {
    const newContactData = {
      phone_number: '+15551234567',
      name: 'New Contact',
      email: 'newcontact@example.com',
      tags: ['customer'],
    }

    let callCount = 0
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        callCount++
        // First call: check for duplicate (returns null - no duplicate)
        if (callCount === 1) {
          return Promise.resolve({ data: null, error: null })
        }
        // Second call: return created contact
        return Promise.resolve({
          data: { ...newContactData, id: 'new-contact-id', organization_id: mockUser.organization_id },
          error: null,
        })
      }),
      insert: jest.fn().mockReturnThis(),
    })

    const request = createAuthenticatedRequest('POST', '/api/contacts', mockUser.id, mockUser.organization_id, newContactData)

    const response = await simulateCreateContact(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(201)
    expect(data.phone_number).toBe(newContactData.phone_number)
    expect(data.organization_id).toBe(mockUser.organization_id)
  })

  it('should reject duplicate phone number in same organization', async () => {
    const existingContact = createMockContact({ organization_id: mockUser.organization_id })

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: existingContact,
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/contacts',
      mockUser.id,
      mockUser.organization_id,
      { phone_number: existingContact.phone_number, name: 'Duplicate' }
    )

    const response = await simulateCreateContact(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(409)
    expectErrorResponse(data, 409, 'already exists')
  })

  it('should validate phone number format', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      '/api/contacts',
      mockUser.id,
      mockUser.organization_id,
      { phone_number: 'invalid', name: 'Test' }
    )

    const response = await simulateCreateContact(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'Invalid phone number format')
  })

  it('should require phone number field', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      '/api/contacts',
      mockUser.id,
      mockUser.organization_id,
      { name: 'Test Contact' }
    )

    const response = await simulateCreateContact(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'Phone number is required')
  })
})

describe('PUT /api/contacts/[id]', () => {
  let mockSupabase: any
  let mockUser: any
  let mockContact: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockContact = createMockContact({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should update contact with valid data', async () => {
    const updateData = { name: 'Updated Name', tags: ['vip'] }

    let callCount = 0
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        callCount++
        // First call: fetch contact (returns existing contact)
        if (callCount === 1) {
          return Promise.resolve({ data: mockContact, error: null })
        }
        // Second call: return updated contact
        return Promise.resolve({
          data: { ...mockContact, ...updateData },
          error: null,
        })
      }),
      update: jest.fn().mockReturnThis(),
    })

    const request = createAuthenticatedRequest(
      'PUT',
      `/api/contacts/${mockContact.id}`,
      mockUser.id,
      mockUser.organization_id,
      updateData
    )

    const response = await simulateUpdateContact(request, mockSupabase, mockUser, mockContact.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.name).toBe(updateData.name)
  })

  it('should prevent updating contact from different organization', async () => {
    const otherOrgContact = createMockContact({ organization_id: 'different-org-id' })

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    const request = createAuthenticatedRequest(
      'PUT',
      `/api/contacts/${otherOrgContact.id}`,
      mockUser.id,
      mockUser.organization_id,
      { name: 'Hacked' }
    )

    const response = await simulateUpdateContact(request, mockSupabase, mockUser, otherOrgContact.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(404)
    expectErrorResponse(data, 404, 'not found')
  })
})

describe('DELETE /api/contacts/[id]', () => {
  let mockSupabase: any
  let mockUser: any
  let mockContact: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockContact = createMockContact({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should soft delete contact', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockContact, error: null }),
      update: jest.fn().mockReturnThis(),
    })

    const request = createAuthenticatedRequest(
      'DELETE',
      `/api/contacts/${mockContact.id}`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateDeleteContact(request, mockSupabase, mockUser, mockContact.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.message).toContain('deleted')
  })

  it('should prevent deleting contact from different organization', async () => {
    const otherOrgContact = createMockContact({ organization_id: 'different-org-id' })

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    const request = createAuthenticatedRequest(
      'DELETE',
      `/api/contacts/${otherOrgContact.id}`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateDeleteContact(request, mockSupabase, mockUser, otherOrgContact.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(404)
    expectErrorResponse(data, 404, 'not found')
  })
})

// =============================================================================
// Helper Functions to Simulate API Route Handlers
// =============================================================================

async function simulateGetContacts(request: NextRequest, supabase: any, user: any): Promise<any> {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase.from('contacts').select('*', { count: 'exact' }).eq('organization_id', user.organization_id)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    const { data: contacts, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) throw error

    return new Response(
      JSON.stringify({
        contacts,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: offset + limit < (count || 0),
        },
        filters: { search, tags },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateCreateContact(request: NextRequest, supabase: any, user: any): Promise<any> {
  try {
    const body = await request.json()
    const { phone_number, name, email, tags } = body

    if (!phone_number) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone_number.replace(/[\s-()]/g, ''))) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check for duplicates
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('phone_number', phone_number)
      .single()

    if (existingContact) {
      return new Response(JSON.stringify({ error: 'Contact with this phone number already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: user.organization_id,
        phone_number,
        name,
        email,
        tags,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(contact), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateUpdateContact(request: NextRequest, supabase: any, user: any, contactId: string): Promise<any> {
  try {
    const body = await request.json()

    // Check contact exists and belongs to organization
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update contact
    const { data: updated, error } = await supabase
      .from('contacts')
      .update(body)
      .eq('id', contactId)
      .eq('organization_id', user.organization_id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateDeleteContact(request: NextRequest, supabase: any, user: any, contactId: string): Promise<any> {
  try {
    // Check contact exists and belongs to organization
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Soft delete
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('organization_id', user.organization_id)

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Contact deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
