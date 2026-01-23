/**
 * Payment Links API
 * GET /api/payments/links - List payment links
 * POST /api/payments/links - Create a new payment link
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { PaymentLinksService } from '@/lib/stripe/payment-links'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { links, total } = await PaymentLinksService.listPaymentLinks(
      profile.organization_id,
      { status, limit, offset }
    )

    return createSuccessResponse({
      links,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('List payment links error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Check permissions
    const userRole = (profile as { role?: string }).role || ''
    if (!['owner', 'admin', 'agent'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create payment links' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!body.amount || typeof body.amount !== 'number' || body.amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least 50 cents' },
        { status: 400 }
      )
    }

    const paymentLink = await PaymentLinksService.createPaymentLink({
      name: body.name,
      description: body.description,
      amount: body.amount,
      currency: body.currency || 'eur',
      quantity: body.quantity || 1,
      allowCustomQuantity: body.allowCustomQuantity || false,
      collectShipping: body.collectShipping || false,
      collectBillingAddress: body.collectBillingAddress ?? true,
      customMessage: body.customMessage,
      organizationId: profile.organization_id,
    })

    return createSuccessResponse({
      paymentLink,
      message: 'Payment link created successfully',
    })
  } catch (error) {
    console.error('Create payment link error:', error)
    return createErrorResponse(error)
  }
}
