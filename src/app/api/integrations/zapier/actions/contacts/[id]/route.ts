/**
 * Zapier Action: Update Contact
 *
 * PUT /api/integrations/zapier/actions/contacts/{id}
 *
 * Updates an existing contact in the organization.
 * Only provided fields are updated. Custom fields are merged.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'
import type {
  UpdateContactRequest,
  UpdateContactResponse,
  ZapierActionError,
} from '@/types/zapier'

// =====================================================
// Helpers
// =====================================================

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Create Zapier-format error response
 */
function createActionErrorResponse(
  code: ZapierActionError['code'],
  message: string,
  status: number,
  field?: string
): Response {
  const error: ZapierActionError = { code, message }
  if (field) error.field = field

  const response: UpdateContactResponse = {
    success: false,
    error,
  }

  return Response.json(response, { status })
}

// =====================================================
// Handler
// =====================================================

async function updateContactHandler(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  try {
    // Extract contact ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const contactId = pathParts[pathParts.length - 1]

    // Validate contact ID format
    if (!contactId || !isValidUUID(contactId)) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid contact ID format',
        400,
        'id'
      )
    }

    // Parse request body
    let body: UpdateContactRequest
    try {
      body = await request.json()
    } catch {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid JSON in request body',
        400
      )
    }

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Name must be a string',
          400,
          'name'
        )
      }
      if (body.name.trim().length === 0) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Name cannot be empty',
          400,
          'name'
        )
      }
    }

    // Validate email if provided
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Invalid email format',
          400,
          'email'
        )
      }
    }

    // Validate tags if provided
    if (body.tags !== undefined && body.tags !== null) {
      if (!Array.isArray(body.tags)) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Tags must be an array',
          400,
          'tags'
        )
      }
      if (!body.tags.every((tag) => typeof tag === 'string')) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'All tags must be strings',
          400,
          'tags'
        )
      }
    }

    // Validate custom_fields if provided
    if (body.custom_fields !== undefined && body.custom_fields !== null) {
      if (typeof body.custom_fields !== 'object' || Array.isArray(body.custom_fields)) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Custom fields must be an object',
          400,
          'custom_fields'
        )
      }
    }

    const supabase = createServiceRoleClient()

    // Verify contact exists and belongs to organization
    const { data: existingContact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('organization_id', context.organizationId)
      .single()

    if (fetchError || !existingContact) {
      return createActionErrorResponse(
        'NOT_FOUND',
        'Contact not found',
        404
      )
    }

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updates.name = body.name.trim()
    }

    if (body.email !== undefined) {
      // Allow setting email to null/empty to clear it
      updates.email = body.email?.trim() || null
    }

    if (body.tags !== undefined) {
      updates.tags = body.tags
    }

    if (body.custom_fields !== undefined) {
      // Merge custom fields instead of replacing
      updates.custom_fields = {
        ...(existingContact.custom_fields || {}),
        ...body.custom_fields,
      }
    }

    // Check if there are any fields to update
    if (Object.keys(updates).length === 0) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'No fields to update',
        400
      )
    }

    // Update the contact
    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .eq('organization_id', context.organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update contact:', updateError)
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to update contact',
        500
      )
    }

    if (!updatedContact) {
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve updated contact',
        500
      )
    }

    // Return success response
    const response: UpdateContactResponse = {
      success: true,
      contact: {
        id: updatedContact.id,
        name: updatedContact.name,
        phone: updatedContact.phone_number,
        email: updatedContact.email || undefined,
        tags: updatedContact.tags || [],
        custom_fields: updatedContact.custom_fields || {},
        updated_at: updatedContact.updated_at,
      },
    }

    return Response.json(response, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in update-contact action:', error)
    return createActionErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    )
  }
}

// =====================================================
// Route Export
// =====================================================

export const PUT = withZapierMiddleware(updateContactHandler, {
  rateLimitType: 'actions',
  requiredScopes: ['contacts:write'],
})
