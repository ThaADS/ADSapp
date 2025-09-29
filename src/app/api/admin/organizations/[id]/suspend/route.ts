import { NextRequest, NextResponse } from 'next/server'
import { suspendOrganization, reactivateOrganization } from '@/lib/super-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { reason } = await request.json()
    const { id } = await params;

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Suspension reason is required' },
        { status: 400 }
      )
    }

    const success = await suspendOrganization(
      id,
      reason,
      request.ip,
      request.headers.get('user-agent') || undefined
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to suspend organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Organization suspension API error:', error)
    return NextResponse.json(
      { error: 'Failed to suspend organization' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await reactivateOrganization(
      id,
      request.ip,
      request.headers.get('user-agent') || undefined
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reactivate organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Organization reactivation API error:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate organization' },
      { status: 500 }
    )
  }
}