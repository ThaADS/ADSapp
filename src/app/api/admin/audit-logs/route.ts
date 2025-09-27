import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs } from '@/lib/super-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const adminId = searchParams.get('admin_id') || undefined
    const action = searchParams.get('action') || undefined
    const targetType = searchParams.get('target_type') || undefined

    const result = await getAuditLogs(page, limit, adminId, action, targetType)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin audit logs API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}