import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { AnalyticsExporter } from '@/lib/export/analytics-export'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { format, dateRange, metrics, organizationId } = body

    // Validate required fields
    if (!format || !dateRange || !metrics || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate format
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      )
    }

    // Create exporter and export data
    const exporter = new AnalyticsExporter()
    const exportResult = await exporter.exportData({
      format,
      dateRange,
      metrics,
      organizationId
    })

    // Return file download response
    return new NextResponse(exportResult.content, {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}
