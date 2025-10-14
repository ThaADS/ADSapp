import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'conversations'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'json'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let reportData: Record<string, unknown> | unknown[]

    switch (reportType) {
      case 'conversations':
        reportData = await generateConversationsReport(supabase, profile.organization_id!, startDate, endDate)
        break
      case 'messages':
        reportData = await generateMessagesReport(supabase, profile.organization_id!, startDate, endDate)
        break
      case 'agents':
        reportData = await generateAgentsReport(supabase, profile.organization_id!, startDate, endDate)
        break
      case 'contacts':
        reportData = await generateContactsReport(supabase, profile.organization_id!, startDate, endDate)
        break
      case 'performance':
        reportData = await generatePerformanceReport(supabase, profile.organization_id!, startDate, endDate)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    if (format === 'csv') {
      const csv = convertToCSV(Array.isArray(reportData) ? reportData : [reportData])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${startDate}-to-${endDate}.csv"`
        }
      })
    }

    return createSuccessResponse({
      reportType,
      dateRange: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      data: reportData
    })

  } catch (error) {
    console.error('Analytics reports error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { reportType, startDate, endDate, filters, scheduling } = body

    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Report type, start date, and end date are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // TODO WEEK 5+: Create scheduled_reports table for recurring reports
    // For now, generate reports immediately
    return createSuccessResponse({
      message: 'Report scheduling feature not yet implemented - generating report immediately',
      reportType,
      startDate,
      endDate,
      note: 'Scheduled reports table not yet created. Use GET endpoint to generate reports on-demand.'
    }, 201)

    // Create scheduled report - COMMENTED OUT until scheduled_reports table is created
    // const { data: scheduledReport, error } = await supabase
    //   .from('scheduled_reports')
    //   .insert({
    //     organization_id: profile.organization_id!,
    //     created_by: user.id,
    //     report_type: reportType,
    //     start_date: startDate,
    //     end_date: endDate,
    //     filters: filters || {},
    //     scheduling: scheduling || { frequency: 'once' },
    //     status: 'pending',
    //     created_at: new Date().toISOString()
    //   })
    //   .select()
    //   .single()

    // if (error) {
    //   throw error
    // }

    // // If it's a one-time report, generate it immediately
    // if (!scheduling || scheduling.frequency === 'once') {
    //   // Queue for immediate processing
    //   await queueReportGeneration(scheduledReport.id)
    // }

    // return createSuccessResponse({
    //   report: scheduledReport,
    //   message: scheduling?.frequency === 'once'
    //     ? 'Report queued for generation'
    //     : 'Report scheduled successfully'
    // }, 201)

  } catch (error) {
    console.error('Schedule report error:', error)
    return createErrorResponse(error)
  }
}

async function generateConversationsReport(supabase: TypedSupabaseClient, organizationId: string, startDate: string, endDate: string): Promise<unknown[]> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      status,
      priority,
      created_at,
      last_message_at,
      contacts (
        name,
        phone_number
      ),
      profiles (
        full_name
      ),
      messages (
        id,
        sender_type,
        created_at
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })

  return (conversations || []).map(conv => {
    const messages = conv.messages || []
    const firstResponse = messages.find(m => m.sender_type === 'agent')
    const responseTime = firstResponse
      ? new Date(firstResponse.created_at).getTime() - new Date(conv.created_at).getTime()
      : null

    return {
      id: conv.id,
      contactName: (conv.contacts as { name?: string } | null)?.name || 'Unknown',
      contactPhone: (conv.contacts as { phone_number?: string } | null)?.phone_number,
      assignedAgent: (conv.profiles as { full_name?: string } | null)?.full_name || 'Unassigned',
      status: conv.status,
      priority: conv.priority,
      messageCount: messages.length,
      responseTimeMinutes: responseTime ? Math.round(responseTime / (1000 * 60)) : null,
      createdAt: conv.created_at,
      lastMessageAt: conv.last_message_at
    }
  })
}

async function generateMessagesReport(supabase: TypedSupabaseClient, organizationId: string, startDate: string, endDate: string): Promise<unknown[]> {
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      message_type,
      sender_type,
      created_at,
      conversations (
        contacts (
          name,
          phone_number
        )
      ),
      profiles (
        full_name
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })

  return (messages || []).map(msg => ({
    id: msg.id,
    content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
    type: msg.message_type,
    senderType: msg.sender_type,
    senderName: (msg.profiles as { full_name?: string } | null)?.full_name || 'System',
    contactName: (msg.conversations as { contacts?: { name?: string } } | null)?.contacts?.name || 'Unknown',
    contactPhone: (msg.conversations as { contacts?: { phone_number?: string } } | null)?.contacts?.phone_number,
    createdAt: msg.created_at
  }))
}

async function generateAgentsReport(supabase: TypedSupabaseClient, organizationId: string, startDate: string, endDate: string): Promise<unknown[]> {
  const { data: agents } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      messages!inner (
        id,
        created_at,
        conversations (
          id
        )
      )
    `)
    .eq('organization_id', organizationId)
    .gte('messages.created_at', startDate)
    .lte('messages.created_at', endDate)

  return (agents || []).map(agent => {
    const messages = agent.messages || []
    const conversations = new Set(messages.map(m => (m.conversations as { id?: string } | null)?.id).filter(Boolean))

    return {
      id: agent.id,
      name: agent.full_name,
      email: agent.email,
      role: agent.role,
      messagesSent: messages.length,
      conversationsHandled: conversations.size,
      avgMessagesPerConversation: conversations.size > 0
        ? Math.round(messages.length / conversations.size * 100) / 100
        : 0
    }
  })
}

async function generateContactsReport(supabase: TypedSupabaseClient, organizationId: string, startDate: string, endDate: string): Promise<unknown[]> {
  const { data: contacts } = await supabase
    .from('contacts')
    .select(`
      id,
      name,
      phone_number,
      tags,
      created_at,
      last_message_at,
      conversations (
        id,
        status,
        messages (
          id
        )
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })

  return (contacts || []).map(contact => {
    const conversations = contact.conversations || []
    const totalMessages = conversations.reduce((sum, conv) => sum + ((conv.messages as unknown[])?.length || 0), 0)

    return {
      id: contact.id,
      name: contact.name || 'Unknown',
      phoneNumber: contact.phone_number,
      tags: contact.tags || [],
      conversationsCount: conversations.length,
      totalMessages,
      lastContactAt: contact.last_message_at,
      createdAt: contact.created_at
    }
  })
}

async function generatePerformanceReport(supabase: TypedSupabaseClient, organizationId: string, startDate: string, endDate: string): Promise<{ summary: Record<string, unknown>; dailyBreakdown: unknown[] }> {
  const [messagesData, conversationsData, agentsData] = await Promise.all([
    supabase
      .from('messages')
      .select('sender_type, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),

    supabase
      .from('conversations')
      .select('status, created_at, last_message_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),

    supabase
      .from('profiles')
      .select('id, full_name, last_seen_at')
      .eq('organization_id', organizationId)
      .gte('last_seen_at', startDate)
  ])

  const messages = messagesData.data || []
  const conversations = conversationsData.data || []
  const activeAgents = agentsData.data || []

  const totalMessages = messages.length
  const inboundMessages = messages.filter(m => m.sender_type === 'contact').length
  const outboundMessages = messages.filter(m => m.sender_type === 'agent').length

  const resolvedConversations = conversations.filter(c => c.status === 'resolved').length
  const resolutionRate = conversations.length > 0
    ? Math.round((resolvedConversations / conversations.length) * 100)
    : 0

  return {
    summary: {
      totalMessages,
      inboundMessages,
      outboundMessages,
      totalConversations: conversations.length,
      resolvedConversations,
      resolutionRate,
      activeAgents: activeAgents.length
    },
    dailyBreakdown: generateDailyBreakdown(messages, conversations, startDate, endDate)
  }
}

interface MessageData { created_at: string; [key: string]: unknown; }
interface ConversationData { created_at: string; [key: string]: unknown; }

function generateDailyBreakdown(messages: MessageData[], conversations: ConversationData[], startDate: string, endDate: string): unknown[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const breakdown = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split('T')[0]
    const dayMessages = messages.filter(m => m.created_at.startsWith(dayStr))
    const dayConversations = conversations.filter(c => c.created_at.startsWith(dayStr))

    breakdown.push({
      date: dayStr,
      messages: dayMessages.length,
      inbound: dayMessages.filter(m => (m as { sender_type?: string }).sender_type === 'contact').length,
      outbound: dayMessages.filter(m => (m as { sender_type?: string }).sender_type === 'agent').length,
      conversations: dayConversations.length,
      resolved: dayConversations.filter(c => (c as { status?: string }).status === 'resolved').length
    })
  }

  return breakdown
}

function convertToCSV(data: Record<string, unknown> | Record<string, unknown>[]): string {
  const dataArray = Array.isArray(data) ? data : [data]
  if (!dataArray || dataArray.length === 0) {
    return ''
  }

  const headers = Object.keys(dataArray[0])
  const csvRows = [
    headers.join(','),
    ...dataArray.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}

async function queueReportGeneration(_reportId: string) {
  // TODO WEEK 5+: Implement background job queue for report generation
  // In a real implementation, this would add the report to a job queue
  // For now, this is commented out until scheduled_reports table is created

  // const supabase = await createClient()
  // await supabase
  //   .from('scheduled_reports')
  //   .update({
  //     status: 'processing',
  //     started_at: new Date().toISOString()
  //   })
  //   .eq('id', reportId)

  // The actual report generation would happen in a background job
}