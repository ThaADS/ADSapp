/**
 * Admin Refund Details API (S-001)
 * ==================================
 * Super admin endpoint for viewing specific refund details.
 *
 * GET /api/admin/billing/refunds/[id] - Get refund details
 *
 * Security: Super admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RefundManager } from '@/lib/billing/refunds'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify super admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // 3. Get refund details
    const refundManager = new RefundManager()
    const refund = await refundManager.getRefund(id)

    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
    }

    // 4. Get refund history
    const history = await refundManager.getRefundHistory(refund.organization_id)

    return NextResponse.json({
      success: true,
      refund,
      history,
    })
  } catch (error) {
    const err = error as Error
    console.error('Get refund API error:', err)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err.message,
      },
      { status: 500 }
    )
  }
}
