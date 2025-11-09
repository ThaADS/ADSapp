/**
 * Export Broadcast Campaign Results
 * GET /api/bulk/campaigns/[id]/export?format=csv|pdf
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: csv, pdf' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get all jobs with contact details
    const { data: jobs, error: jobsError } = await supabase
      .from('bulk_message_jobs')
      .select('*, contact:contacts(phone, first_name, last_name, email)')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: false })

    if (jobsError) {
      throw jobsError
    }

    if (format === 'csv') {
      const csv = generateCSV(campaign, jobs || [])
      const filename = `campaign-${campaign.name.replace(/[^a-zA-Z0-9]/g, '-')}-export.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === 'pdf') {
      const report = generatePDFReport(campaign, jobs || [])
      const filename = `campaign-${campaign.name.replace(/[^a-zA-Z0-9]/g, '-')}-report.txt`

      return new NextResponse(report, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Export campaign error:', error)
    return createErrorResponse(error)
  }
}

function generateCSV(campaign: any, jobs: any[]): string {
  const headers = [
    'Contact Phone',
    'Contact Name',
    'Status',
    'Sent At',
    'Delivered At',
    'Read At',
    'Error',
  ]

  const rows = jobs.map(job => {
    const contact = job.contact || {}
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')

    return [
      contact.phone || '',
      name,
      job.status,
      job.sent_at ? new Date(job.sent_at).toLocaleString('nl-NL') : '',
      job.delivered_at ? new Date(job.delivered_at).toLocaleString('nl-NL') : '',
      job.read_at ? new Date(job.read_at).toLocaleString('nl-NL') : '',
      job.error || '',
    ]
  })

  const escapeCSV = (value: string): string => {
    const str = String(value || '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvLines = [
    `# Campaign: ${campaign.name}`,
    `# Status: ${campaign.status}`,
    `# Total Recipients: ${jobs.length}`,
    `# Created: ${new Date(campaign.created_at).toLocaleString('nl-NL')}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ]

  return csvLines.join('\n')
}

function generatePDFReport(campaign: any, jobs: any[]): string {
  const stats = {
    total: jobs.length,
    sent: jobs.filter((j: any) => j.sent_at).length,
    delivered: jobs.filter((j: any) => j.delivered_at).length,
    read: jobs.filter((j: any) => j.read_at).length,
    failed: jobs.filter((j: any) => j.failed_at).length,
    pending: jobs.filter((j: any) => j.status === 'pending').length,
  }

  const percentage = (count: number, total: number): string => {
    return total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%'
  }

  const lines = [
    'BROADCAST CAMPAIGN REPORT',
    '='.repeat(60),
    '',
    `Campaign Name: ${campaign.name}`,
    `Description: ${campaign.description || 'N/A'}`,
    `Status: ${campaign.status}`,
    `Created: ${new Date(campaign.created_at).toLocaleString('nl-NL')}`,
    '',
    'STATISTICS',
    '-'.repeat(60),
    `Total Recipients: ${stats.total}`,
    `Sent: ${stats.sent} (${percentage(stats.sent, stats.total)})`,
    `Delivered: ${stats.delivered} (${percentage(stats.delivered, stats.total)})`,
    `Read: ${stats.read} (${percentage(stats.read, stats.total)})`,
    `Failed: ${stats.failed} (${percentage(stats.failed, stats.total)})`,
    `Pending: ${stats.pending} (${percentage(stats.pending, stats.total)})`,
    '',
    'MESSAGE DETAILS',
    '-'.repeat(60),
    `Type: ${campaign.message_type || 'text'}`,
    campaign.message_content ? `Content: ${campaign.message_content}` : '',
    '',
    `Report Generated: ${new Date().toLocaleString('nl-NL')}`,
  ].filter(Boolean)

  return lines.join('\n')
}
