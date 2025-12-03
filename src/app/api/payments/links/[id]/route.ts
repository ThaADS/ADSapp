// @ts-nocheck - Database types need regeneration from Supabase schema
/**
 * Individual Payment Link API
 * GET /api/payments/links/[id] - Get payment link details
 * PUT /api/payments/links/[id] - Update payment link status
 * DELETE /api/payments/links/[id] - Archive payment link
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { PaymentLinksService } from '@/lib/stripe/payment-links'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const paymentLink = await PaymentLinksService.getPaymentLink(
      id,
      profile.organization_id
    )

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      )
    }

    return createSuccessResponse({ paymentLink })
  } catch (error) {
    console.error('Get payment link error:', error)
    return createErrorResponse(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Check permissions
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate status
    if (body.status && !['active', 'inactive', 'archived'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, inactive, or archived' },
        { status: 400 }
      )
    }

    const success = await PaymentLinksService.updatePaymentLinkStatus(
      id,
      profile.organization_id,
      body.status
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Payment link not found or update failed' },
        { status: 404 }
      )
    }

    return createSuccessResponse({
      message: 'Payment link updated successfully',
    })
  } catch (error) {
    console.error('Update payment link error:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Check permissions
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Archive instead of delete
    const success = await PaymentLinksService.updatePaymentLinkStatus(
      id,
      profile.organization_id,
      'archived'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      )
    }

    return createSuccessResponse({
      message: 'Payment link archived successfully',
    })
  } catch (error) {
    console.error('Delete payment link error:', error)
    return createErrorResponse(error)
  }
}
