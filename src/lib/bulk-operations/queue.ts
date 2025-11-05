// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server'

export interface BulkOperation {
  id: string
  organizationId: string
  userId: string
  type: 'bulk_message' | 'bulk_contact_import' | 'bulk_contact_export' | 'bulk_conversation_close'
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalItems: number
  processedItems: number
  failedItems: number
  configuration: any
  results?: any
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface BulkMessageConfig {
  templateId?: string
  message: {
    type: 'text' | 'template'
    content: string
    variables?: Record<string, string>[]
  }
  recipients: Array<{
    contactId: string
    phoneNumber: string
    variables?: Record<string, string>
  }>
  scheduling?: {
    sendAt?: string
    delay?: number // seconds between messages
  }
}

export interface BulkContactImportConfig {
  file: {
    url: string
    format: 'csv' | 'json' | 'xlsx'
  }
  mapping: Record<string, string> // field mapping
  options: {
    skipDuplicates: boolean
    updateExisting: boolean
    tagAll?: string[]
  }
}

export class BulkOperationQueue {
  private supabase = createClient()

  constructor() {
    this.supabase = createClient()
  }

  async createOperation(operation: Omit<BulkOperation, 'id' | 'createdAt' | 'processedItems' | 'failedItems'>): Promise<BulkOperation> {
    const supabase = await this.supabase

    const { data, error } = await supabase
      .from('bulk_operations')
      .insert({
        organization_id: operation.organizationId,
        user_id: operation.userId,
        type: operation.type,
        status: 'queued',
        total_items: operation.totalItems,
        processed_items: 0,
        failed_items: 0,
        configuration: operation.configuration,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create bulk operation: ${error.message}`)
    }

    return this.mapDatabaseToOperation(data)
  }

  async getOperation(id: string, organizationId: string): Promise<BulkOperation | null> {
    const supabase = await this.supabase

    const { data, error } = await supabase
      .from('bulk_operations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapDatabaseToOperation(data)
  }

  async updateProgress(id: string, progress: { processedItems: number; failedItems?: number; results?: any }): Promise<void> {
    const supabase = await this.supabase

    const updateData: any = {
      processed_items: progress.processedItems,
      updated_at: new Date().toISOString()
    }

    if (progress.failedItems !== undefined) {
      updateData.failed_items = progress.failedItems
    }

    if (progress.results) {
      updateData.results = progress.results
    }

    const { error } = await supabase
      .from('bulk_operations')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update operation progress: ${error.message}`)
    }
  }

  async updateStatus(id: string, status: BulkOperation['status'], error?: string): Promise<void> {
    const supabase = await this.supabase

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'processing') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    if (error) {
      updateData.error = error
    }

    const { error: updateError } = await supabase
      .from('bulk_operations')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update operation status: ${updateError.message}`)
    }
  }

  async listOperations(organizationId: string, options?: {
    status?: BulkOperation['status']
    type?: BulkOperation['type']
    limit?: number
    offset?: number
  }): Promise<{ operations: BulkOperation[]; total: number }> {
    const supabase = await this.supabase

    let query = supabase
      .from('bulk_operations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.type) {
      query = query.eq('type', options.type)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1)
    }

    const { data, error, count } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list operations: ${error.message}`)
    }

    return {
      operations: (data || []).map(item => this.mapDatabaseToOperation(item)),
      total: count || 0
    }
  }

  async cancelOperation(id: string, organizationId: string): Promise<void> {
    const supabase = await this.supabase

    const { error } = await supabase
      .from('bulk_operations')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .in('status', ['queued', 'processing'])

    if (error) {
      throw new Error(`Failed to cancel operation: ${error.message}`)
    }
  }

  async getQueuedOperations(limit: number = 10): Promise<BulkOperation[]> {
    const supabase = await this.supabase

    const { data, error } = await supabase
      .from('bulk_operations')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get queued operations: ${error.message}`)
    }

    return (data || []).map(item => this.mapDatabaseToOperation(item))
  }

  private mapDatabaseToOperation(data: any): BulkOperation {
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      type: data.type,
      status: data.status,
      totalItems: data.total_items,
      processedItems: data.processed_items,
      failedItems: data.failed_items,
      configuration: data.configuration,
      results: data.results,
      error: data.error,
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at
    }
  }

  async cleanupCompletedOperations(olderThanDays: number = 30): Promise<number> {
    const supabase = await this.supabase

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('bulk_operations')
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate)
      .select('id')

    if (error) {
      throw new Error(`Failed to cleanup operations: ${error.message}`)
    }

    return data?.length || 0
  }
}