import { NextRequest, NextResponse } from 'next/server'
import { getSystemSettings, updateSystemSetting, logSuperAdminAction } from '@/lib/super-admin'
import { adminMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const settings = await getSystemSettings()

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to fetch system settings' },
        { status: 500 }
      )
    }

    // Log settings access
    await logSuperAdminAction(
      'view_system_settings',
      'system',
      undefined,
      {},
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Admin settings API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request);
  if (middlewareResponse) return middlewareResponse;

  try {
    const { key, value, description } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    const success = await updateSystemSetting(key, value, description)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update system setting' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update system setting' },
      { status: 500 }
    )
  }
}