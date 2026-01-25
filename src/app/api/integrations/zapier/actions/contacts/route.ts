/**
 * Zapier Action: Create Contact
 *
 * POST /api/integrations/zapier/actions/contacts
 *
 * Creates a new contact in the organization.
 * Validates phone number format and checks for duplicates.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'
import type {
  CreateContactRequest,
  CreateContactResponse,
  ZapierActionError,
} from '@/types/zapier'

// =====================================================
// Helpers
// =====================================================

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  return normalized
}

/**
 * Validate phone number format (basic E.164 check)
 */
function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
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

  const response: CreateContactResponse = {
    success: false,
    error,
  }

  return Response.json(response, { status })
}

// =====================================================
// Handler
// =====================================================

async function createContactHandler(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  try {
    // Parse request body
    let body: CreateContactRequest
    try {
      body = await request.json()
    } catch {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid JSON in request body',
        400
      )
    }

    // Validate required field: name
    if (!body.name || typeof body.name !== 'string') {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Contact name is required',
        400,
        'name'
      )
    }

    if (body.name.trim().length === 0) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Contact name cannot be empty',
        400,
        'name'
      )
    }

    // Validate required field: phone
    if (!body.phone || typeof body.phone !== 'string') {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Phone number is required',
        400,
        'phone'
      )
    }

    // Normalize and validate phone number
    const normalizedPhone = normalizePhoneNumber(body.phone)
    if (!isValidPhoneNumber(normalizedPhone)) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
        400,
        'phone'
      )
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

    // Check for duplicate contact by phone number
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('phone_number', normalizedPhone)
      .single()

    if (existingContact) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Contact with this phone number already exists',
        400,
        'phone'
      )
    }

    // Create the contact
    const whatsappId = normalizedPhone.replace('+', '')
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: context.organizationId,
        name: body.name.trim(),
        phone_number: normalizedPhone,
        whatsapp_id: whatsappId,
        email: body.email?.trim() || null,
        tags: body.tags || [],
        custom_fields: body.custom_fields || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create contact:', error)
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create contact',
        500
      )
    }

    if (!contact) {
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve created contact',
        500
      )
    }

    // Return success response
    const response: CreateContactResponse = {
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone_number,
        email: contact.email || undefined,
        tags: contact.tags || [],
        custom_fields: contact.custom_fields || {},
        created_at: contact.created_at,
      },
    }

    return Response.json(response, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in create-contact action:', error)
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

export const POST = withZapierMiddleware(createContactHandler, {
  rateLimitType: 'actions',
  requiredScopes: ['contacts:write'],
})
