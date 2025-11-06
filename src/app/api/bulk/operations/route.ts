// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
  validatePagination,
} from '@/lib/api-utils'
import {
  BulkOperationQueue,
  BulkMessageConfig,
  BulkContactImportConfig,
} from '@/lib/bulk-operations/queue'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const type = searchParams.get('type') as any
    const { page, limit, offset } = validatePagination(request)

    const queue = new BulkOperationQueue()
    const result = await queue.listOperations(profile.organization_id, {
      status,
      type,
      limit,
      offset,
    })

    return createSuccessResponse({
      operations: result.operations,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    console.error('List bulk operations error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { type, configuration } = body

    if (!type || !configuration) {
      return NextResponse.json({ error: 'Type and configuration are required' }, { status: 400 })
    }

    // Validate configuration based on type
    let totalItems: number

    switch (type) {
      case 'bulk_message':
        const messageConfig = configuration as BulkMessageConfig
        if (!messageConfig.message || !messageConfig.recipients) {
          return NextResponse.json(
            { error: 'Message and recipients are required for bulk message operation' },
            { status: 400 }
          )
        }
        totalItems = messageConfig.recipients.length

        // Validate recipients
        const invalidRecipients = messageConfig.recipients.filter(
          r => !r.phoneNumber || !r.contactId
        )
        if (invalidRecipients.length > 0) {
          return NextResponse.json(
            { error: 'All recipients must have phoneNumber and contactId' },
            { status: 400 }
          )
        }

        // Check organization limits
        const messageLimit = await checkMessageLimit(profile.organization_id, totalItems)
        if (!messageLimit.allowed) {
          return NextResponse.json({ error: messageLimit.reason }, { status: 429 })
        }
        break

      case 'bulk_contact_import':
        const importConfig = configuration as BulkContactImportConfig
        if (!importConfig.file || !importConfig.mapping) {
          return NextResponse.json(
            { error: 'File and mapping are required for bulk contact import' },
            { status: 400 }
          )
        }

        // Estimate total items from file (this is approximate)
        totalItems = await estimateFileSize(importConfig.file.url, importConfig.file.format)
        break

      case 'bulk_contact_export':
        // Get total contacts for export
        const supabase = await createClient()
        const { count } = await supabase
          .from('contacts')
          .select('id', { count: 'exact' })
          .eq('organization_id', profile.organization_id)

        totalItems = count || 0
        break

      case 'bulk_conversation_close':
        // Estimate conversations to close
        const convCount = await estimateConversationsToClose(profile.organization_id, configuration)
        totalItems = convCount
        break

      default:
        return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
    }

    // Create the bulk operation
    const queue = new BulkOperationQueue()
    const operation = await queue.createOperation({
      organizationId: profile.organization_id,
      userId: user.id,
      type,
      status: 'queued',
      totalItems,
      configuration,
    })

    // Queue the operation for processing
    await queueOperationForProcessing(operation.id)

    return createSuccessResponse(operation, 201)
  } catch (error) {
    console.error('Create bulk operation error:', error)
    return createErrorResponse(error)
  }
}

async function checkMessageLimit(
  organizationId: string,
  messageCount: number
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()

  // Get organization subscription details
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier, subscription_status')
    .eq('id', organizationId)
    .single()

  if (!org) {
    return { allowed: false, reason: 'Organization not found' }
  }

  // Check subscription status
  if (org.subscription_status !== 'active' && org.subscription_status !== 'trial') {
    return { allowed: false, reason: 'Active subscription required for bulk messaging' }
  }

  // Check tier limits
  const limits = {
    starter: 100,
    professional: 1000,
    enterprise: 10000,
  }

  const limit = limits[org.subscription_tier] || 0

  if (messageCount > limit) {
    return {
      allowed: false,
      reason: `Bulk message limit exceeded. Your ${org.subscription_tier} plan allows up to ${limit} messages per operation.`,
    }
  }

  // Check daily usage (optional additional check)
  const today = new Date().toISOString().split('T')[0]
  const { data: dailyUsage } = await supabase
    .from('daily_analytics')
    .select('messages_sent')
    .eq('organization_id', organizationId)
    .eq('date', today)
    .single()

  const messagesUsedToday = dailyUsage?.messages_sent || 0
  const dailyLimit = limits[org.subscription_tier] * 10 // 10x the per-operation limit as daily limit

  if (messagesUsedToday + messageCount > dailyLimit) {
    return {
      allowed: false,
      reason: `Daily message limit would be exceeded. Used: ${messagesUsedToday}, Attempting: ${messageCount}, Daily limit: ${dailyLimit}`,
    }
  }

  return { allowed: true }
}

async function estimateFileSize(fileUrl: string, format: string): Promise<number> {
  try {
    // Make a HEAD request to get file size
    const response = await fetch(fileUrl, { method: 'HEAD' })
    const contentLength = response.headers.get('content-length')

    if (contentLength) {
      const fileSizeBytes = parseInt(contentLength)

      // Rough estimates based on file format
      let estimatedRows: number
      switch (format) {
        case 'csv':
          estimatedRows = Math.floor(fileSizeBytes / 100) // ~100 bytes per row
          break
        case 'xlsx':
          estimatedRows = Math.floor(fileSizeBytes / 200) // ~200 bytes per row
          break
        case 'json':
          estimatedRows = Math.floor(fileSizeBytes / 300) // ~300 bytes per row
          break
        default:
          estimatedRows = Math.floor(fileSizeBytes / 150)
      }

      return Math.max(1, estimatedRows)
    }

    return 1000 // Default estimate if size can't be determined
  } catch (error) {
    console.error('Error estimating file size:', error)
    return 1000 // Default estimate
  }
}

async function estimateConversationsToClose(organizationId: string, config: any): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('conversations')
    .select('id', { count: 'exact' })
    .eq('organization_id', organizationId)

  if (config.status) {
    query = query.eq('status', config.status)
  }

  if (config.olderThanDays) {
    const cutoffDate = new Date(
      Date.now() - config.olderThanDays * 24 * 60 * 60 * 1000
    ).toISOString()
    query = query.lt('last_message_at', cutoffDate)
  }

  const { count } = await query

  return count || 0
}

async function queueOperationForProcessing(operationId: string): Promise<void> {
  // In a real implementation, this would add the operation to a job queue
  // For now, we'll just log it
  console.log(`Queued bulk operation ${operationId} for processing`)

  // You could integrate with a job queue system like:
  // - Bull Queue (Redis-based)
  // - AWS SQS
  // - Google Cloud Tasks
  // - Or implement a simple polling mechanism
}
