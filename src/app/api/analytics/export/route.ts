/**
 * Analytics Export API
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization } from '@/lib/api-utils'
import { AnalyticsExporter } from '@/lib/export/analytics-export'

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Require authentication and get user's organization
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { format, dateRange, metrics, organizationId } = body

    // SECURITY FIX: Validate that user can only export their own organization's data
    // Prevents unauthorized access to other organizations' analytics
    if (organizationId && organizationId !== profile.organization_id) {
      // Only super admins can export other organizations' data
      if (!profile.is_super_admin) {
        return NextResponse.json(
          { error: 'Access denied: Cannot export data for other organizations' },
          { status: 403 }
        )
      }
    }

    // Use the authenticated user's organization if not specified
    const targetOrganizationId = organizationId || profile.organization_id

    // Validate required fields
    if (!format || !dateRange || !metrics) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate format
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 })
    }

    // Create exporter and export data
    const exporter = new AnalyticsExporter()
    const exportResult = await exporter.exportData({
      format,
      dateRange,
      metrics,
      organizationId: targetOrganizationId,
    })

    // Return file download response
    return new NextResponse(exportResult.content, {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
