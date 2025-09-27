import { createClient } from '@/lib/supabase/server'

export interface ConversationFilter {
  id: string
  name: string
  organizationId: string
  isDefault: boolean
  isPublic: boolean
  criteria: FilterCriteria
  sortBy: SortOptions
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface FilterCriteria {
  status?: ConversationStatus[]
  priority?: ConversationPriority[]
  assignedTo?: string[]
  unassigned?: boolean
  tags?: string[]
  contactName?: string
  phoneNumber?: string
  messageContent?: string
  dateRange?: {
    field: 'created_at' | 'last_message_at' | 'updated_at'
    start?: Date
    end?: Date
  }
  messageType?: MessageType[]
  hasMedia?: boolean
  isRead?: boolean
  responseTime?: {
    operator: 'less_than' | 'greater_than' | 'between'
    value: number
    unit: 'minutes' | 'hours' | 'days'
    endValue?: number
  }
  contactProperties?: ContactFilter[]
  customFields?: CustomFieldFilter[]
}

export interface ContactFilter {
  field: string
  operator: FilterOperator
  value: string | number | Date | boolean
}

export interface CustomFieldFilter {
  fieldName: string
  operator: FilterOperator
  value: any
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'regex'

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'

export interface SortOptions {
  field: 'created_at' | 'last_message_at' | 'updated_at' | 'priority' | 'status'
  direction: 'asc' | 'desc'
}

export interface FilterResult {
  conversations: any[]
  total: number
  hasMore: boolean
  aggregations?: FilterAggregations
}

export interface FilterAggregations {
  statusCounts: Record<ConversationStatus, number>
  priorityCounts: Record<ConversationPriority, number>
  assigneeCounts: Record<string, number>
  tagCounts: Record<string, number>
  mediaTypeCounts: Record<MessageType, number>
  averageResponseTime: number
  totalUnread: number
}

export interface QuickFilter {
  id: string
  name: string
  description: string
  icon: string
  criteria: FilterCriteria
  sortBy: SortOptions
  isSystem: boolean
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: FilterCriteria
  organizationId: string
  createdBy: string
  createdAt: Date
  lastUsed: Date
  useCount: number
}

export class ConversationFilterManager {
  private supabase = createClient()

  /**
   * Get system quick filters
   */
  getQuickFilters(): QuickFilter[] {
    return [
      {
        id: 'unassigned',
        name: 'Unassigned',
        description: 'Conversations not assigned to any agent',
        icon: 'user-minus',
        criteria: { unassigned: true, status: ['open', 'pending'] },
        sortBy: { field: 'created_at', direction: 'desc' },
        isSystem: true
      },
      {
        id: 'my_conversations',
        name: 'My Conversations',
        description: 'Conversations assigned to me',
        icon: 'user',
        criteria: { assignedTo: ['current_user'] },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true
      },
      {
        id: 'urgent',
        name: 'Urgent',
        description: 'High priority conversations',
        icon: 'alert-triangle',
        criteria: { priority: ['urgent', 'high'], status: ['open', 'pending'] },
        sortBy: { field: 'created_at', direction: 'asc' },
        isSystem: true
      },
      {
        id: 'unread',
        name: 'Unread',
        description: 'Conversations with unread messages',
        icon: 'mail',
        criteria: { isRead: false },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true
      },
      {
        id: 'recent',
        name: 'Recent',
        description: 'Recently active conversations',
        icon: 'clock',
        criteria: {
          dateRange: {
            field: 'last_message_at',
            start: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true
      },
      {
        id: 'with_media',
        name: 'With Media',
        description: 'Conversations containing media files',
        icon: 'paperclip',
        criteria: { hasMedia: true },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true
      },
      {
        id: 'slow_response',
        name: 'Slow Response',
        description: 'Conversations with slow response times',
        icon: 'timer',
        criteria: {
          responseTime: {
            operator: 'greater_than',
            value: 4,
            unit: 'hours'
          }
        },
        sortBy: { field: 'created_at', direction: 'asc' },
        isSystem: true
      },
      {
        id: 'resolved_today',
        name: 'Resolved Today',
        description: 'Conversations resolved today',
        icon: 'check-circle',
        criteria: {
          status: ['resolved'],
          dateRange: {
            field: 'updated_at',
            start: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        sortBy: { field: 'updated_at', direction: 'desc' },
        isSystem: true
      }
    ]
  }

  /**
   * Apply filters to get conversations
   */
  async filterConversations(
    organizationId: string,
    criteria: FilterCriteria,
    sortBy: SortOptions,
    options?: {
      limit?: number
      offset?: number
      includeAggregations?: boolean
      currentUserId?: string
    }
  ): Promise<FilterResult> {
    try {
      let query = this.supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*),
          assigned_agent:profiles(id, full_name, avatar_url),
          latest_message:messages(
            id, content, message_type, created_at, sender_type, is_read
          )
        `, { count: 'exact' })
        .eq('organization_id', organizationId)

      // Apply filters
      query = this.applyCriteriaToQuery(query, criteria, options?.currentUserId)

      // Apply sorting
      query = this.applySortingToQuery(query, sortBy)

      // Apply pagination
      const limit = options?.limit || 50
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data: conversations, error, count } = await query

      if (error) {
        throw new Error(`Failed to filter conversations: ${error.message}`)
      }

      let aggregations: FilterAggregations | undefined

      if (options?.includeAggregations) {
        aggregations = await this.getFilterAggregations(organizationId, criteria, options.currentUserId)
      }

      return {
        conversations: conversations || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
        aggregations
      }
    } catch (error) {
      throw new Error(`Failed to filter conversations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Apply filter criteria to Supabase query
   */
  private applyCriteriaToQuery(query: any, criteria: FilterCriteria, currentUserId?: string): any {
    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      query = query.in('status', criteria.status)
    }

    // Priority filter
    if (criteria.priority && criteria.priority.length > 0) {
      query = query.in('priority', criteria.priority)
    }

    // Assignment filter
    if (criteria.unassigned) {
      query = query.is('assigned_to', null)
    } else if (criteria.assignedTo && criteria.assignedTo.length > 0) {
      const assigneeIds = criteria.assignedTo.map(id =>
        id === 'current_user' ? currentUserId : id
      ).filter(Boolean)

      if (assigneeIds.length > 0) {
        query = query.in('assigned_to', assigneeIds)
      }
    }

    // Date range filter
    if (criteria.dateRange) {
      const { field, start, end } = criteria.dateRange
      if (start) {
        query = query.gte(field, start.toISOString())
      }
      if (end) {
        query = query.lte(field, end.toISOString())
      }
    }

    // Contact name filter
    if (criteria.contactName) {
      query = query.ilike('contact.name', `%${criteria.contactName}%`)
    }

    // Phone number filter
    if (criteria.phoneNumber) {
      query = query.like('contact.phone_number', `%${criteria.phoneNumber}%`)
    }

    return query
  }

  /**
   * Apply sorting to query
   */
  private applySortingToQuery(query: any, sortBy: SortOptions): any {
    const ascending = sortBy.direction === 'asc'
    return query.order(sortBy.field, { ascending })
  }

  /**
   * Get filter aggregations/statistics
   */
  async getFilterAggregations(
    organizationId: string,
    criteria: FilterCriteria,
    currentUserId?: string
  ): Promise<FilterAggregations> {
    try {
      // Get base query for aggregations
      let baseQuery = this.supabase
        .from('conversations')
        .select('status, priority, assigned_to, tags')
        .eq('organization_id', organizationId)

      baseQuery = this.applyCriteriaToQuery(baseQuery, criteria, currentUserId)

      const { data: conversations, error } = await baseQuery

      if (error) {
        throw new Error(`Failed to get aggregations: ${error.message}`)
      }

      // Calculate aggregations
      const statusCounts: Record<ConversationStatus, number> = {
        open: 0,
        pending: 0,
        resolved: 0,
        closed: 0
      }

      const priorityCounts: Record<ConversationPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }

      const assigneeCounts: Record<string, number> = {}
      const tagCounts: Record<string, number> = {}

      conversations?.forEach(conv => {
        // Status counts
        if (conv.status) {
          statusCounts[conv.status as ConversationStatus]++
        }

        // Priority counts
        if (conv.priority) {
          priorityCounts[conv.priority as ConversationPriority]++
        }

        // Assignee counts
        if (conv.assigned_to) {
          assigneeCounts[conv.assigned_to] = (assigneeCounts[conv.assigned_to] || 0) + 1
        }

        // Tag counts
        if (conv.tags && Array.isArray(conv.tags)) {
          conv.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
      })

      // Get message type counts and other metrics
      const messageStats = await this.getMessageStatistics(organizationId, criteria, currentUserId)

      return {
        statusCounts,
        priorityCounts,
        assigneeCounts,
        tagCounts,
        mediaTypeCounts: messageStats.mediaTypeCounts,
        averageResponseTime: messageStats.averageResponseTime,
        totalUnread: messageStats.totalUnread
      }
    } catch (error) {
      throw new Error(`Failed to get filter aggregations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get message statistics for aggregations
   */
  private async getMessageStatistics(
    organizationId: string,
    criteria: FilterCriteria,
    currentUserId?: string
  ): Promise<{
    mediaTypeCounts: Record<MessageType, number>
    averageResponseTime: number
    totalUnread: number
  }> {
    try {
      // This would require more complex queries to join conversations and messages
      // For now, return default values
      return {
        mediaTypeCounts: {
          text: 0,
          image: 0,
          document: 0,
          audio: 0,
          video: 0,
          location: 0,
          system: 0
        },
        averageResponseTime: 0,
        totalUnread: 0
      }
    } catch (error) {
      console.error('Failed to get message statistics:', error)
      return {
        mediaTypeCounts: {
          text: 0,
          image: 0,
          document: 0,
          audio: 0,
          video: 0,
          location: 0,
          system: 0
        },
        averageResponseTime: 0,
        totalUnread: 0
      }
    }
  }

  /**
   * Save custom filter
   */
  async saveFilter(
    organizationId: string,
    filter: Omit<ConversationFilter, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ConversationFilter> {
    try {
      const filterData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: filter.name,
        is_default: filter.isDefault,
        is_public: filter.isPublic,
        criteria: filter.criteria,
        sort_by: filter.sortBy,
        created_by: filter.createdBy,
        created_at: new Date(),
        updated_at: new Date()
      }

      const { data, error } = await this.supabase
        .from('conversation_filters')
        .insert(filterData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save filter: ${error.message}`)
      }

      return this.mapToFilter(data)
    } catch (error) {
      throw new Error(`Failed to save filter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get saved filters for organization
   */
  async getSavedFilters(
    organizationId: string,
    userId: string
  ): Promise<ConversationFilter[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_filters')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get saved filters: ${error.message}`)
      }

      return data?.map(item => this.mapToFilter(item)) || []
    } catch (error) {
      throw new Error(`Failed to get saved filters: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete saved filter
   */
  async deleteFilter(filterId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversation_filters')
        .delete()
        .eq('id', filterId)
        .eq('created_by', userId) // Only allow users to delete their own filters

      if (error) {
        throw new Error(`Failed to delete filter: ${error.message}`)
      }

      return true
    } catch (error) {
      throw new Error(`Failed to delete filter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Apply quick filter by ID
   */
  async applyQuickFilter(
    organizationId: string,
    filterId: string,
    options?: {
      limit?: number
      offset?: number
      currentUserId?: string
    }
  ): Promise<FilterResult> {
    const quickFilters = this.getQuickFilters()
    const filter = quickFilters.find(f => f.id === filterId)

    if (!filter) {
      throw new Error('Quick filter not found')
    }

    return this.filterConversations(
      organizationId,
      filter.criteria,
      filter.sortBy,
      { ...options, includeAggregations: true }
    )
  }

  /**
   * Get filter by ID
   */
  async getFilter(filterId: string): Promise<ConversationFilter> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_filters')
        .select('*')
        .eq('id', filterId)
        .single()

      if (error) {
        throw new Error(`Failed to get filter: ${error.message}`)
      }

      return this.mapToFilter(data)
    } catch (error) {
      throw new Error(`Failed to get filter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update saved filter
   */
  async updateFilter(
    filterId: string,
    updates: Partial<ConversationFilter>,
    userId: string
  ): Promise<ConversationFilter> {
    try {
      const updateData: any = {
        updated_at: new Date()
      }

      if (updates.name) updateData.name = updates.name
      if (updates.criteria) updateData.criteria = updates.criteria
      if (updates.sortBy) updateData.sort_by = updates.sortBy
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic

      const { data, error } = await this.supabase
        .from('conversation_filters')
        .update(updateData)
        .eq('id', filterId)
        .eq('created_by', userId) // Only allow users to update their own filters
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update filter: ${error.message}`)
      }

      return this.mapToFilter(data)
    } catch (error) {
      throw new Error(`Failed to update filter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get filter suggestions based on current criteria
   */
  async getFilterSuggestions(
    organizationId: string,
    partialCriteria: Partial<FilterCriteria>
  ): Promise<{
    availableStatuses: ConversationStatus[]
    availablePriorities: ConversationPriority[]
    availableAssignees: { id: string; name: string }[]
    availableTags: string[]
    suggestedFilters: QuickFilter[]
  }> {
    try {
      // Get available values based on current data
      const { data: conversations, error } = await this.supabase
        .from('conversations')
        .select(`
          status,
          priority,
          assigned_to,
          tags,
          assigned_agent:profiles(id, full_name)
        `)
        .eq('organization_id', organizationId)

      if (error) {
        throw new Error(`Failed to get filter suggestions: ${error.message}`)
      }

      const availableStatuses = [...new Set(conversations?.map(c => c.status).filter(Boolean))] as ConversationStatus[]
      const availablePriorities = [...new Set(conversations?.map(c => c.priority).filter(Boolean))] as ConversationPriority[]

      const assigneeMap = new Map()
      conversations?.forEach(c => {
        if (c.assigned_agent) {
          assigneeMap.set(c.assigned_agent.id, c.assigned_agent.full_name)
        }
      })
      const availableAssignees = Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }))

      const allTags = conversations?.flatMap(c => c.tags || []) || []
      const availableTags = [...new Set(allTags)]

      // Get suggested quick filters based on current state
      const quickFilters = this.getQuickFilters()
      const suggestedFilters = quickFilters.slice(0, 4) // Return top 4 suggestions

      return {
        availableStatuses,
        availablePriorities,
        availableAssignees,
        availableTags,
        suggestedFilters
      }
    } catch (error) {
      throw new Error(`Failed to get filter suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Map database record to filter interface
   */
  private mapToFilter(data: any): ConversationFilter {
    return {
      id: data.id,
      name: data.name,
      organizationId: data.organization_id,
      isDefault: data.is_default,
      isPublic: data.is_public,
      criteria: data.criteria,
      sortBy: data.sort_by,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

/**
 * Advanced Filter Builder
 */
export class FilterBuilder {
  private criteria: FilterCriteria = {}

  /**
   * Add status filter
   */
  status(statuses: ConversationStatus[]): FilterBuilder {
    this.criteria.status = statuses
    return this
  }

  /**
   * Add priority filter
   */
  priority(priorities: ConversationPriority[]): FilterBuilder {
    this.criteria.priority = priorities
    return this
  }

  /**
   * Add assignee filter
   */
  assignedTo(userIds: string[]): FilterBuilder {
    this.criteria.assignedTo = userIds
    return this
  }

  /**
   * Filter for unassigned conversations
   */
  unassigned(): FilterBuilder {
    this.criteria.unassigned = true
    return this
  }

  /**
   * Add tags filter
   */
  withTags(tags: string[]): FilterBuilder {
    this.criteria.tags = tags
    return this
  }

  /**
   * Add date range filter
   */
  dateRange(field: 'created_at' | 'last_message_at' | 'updated_at', start?: Date, end?: Date): FilterBuilder {
    this.criteria.dateRange = { field, start, end }
    return this
  }

  /**
   * Filter by contact name
   */
  contactName(name: string): FilterBuilder {
    this.criteria.contactName = name
    return this
  }

  /**
   * Filter by phone number
   */
  phoneNumber(number: string): FilterBuilder {
    this.criteria.phoneNumber = number
    return this
  }

  /**
   * Filter by message content
   */
  messageContent(content: string): FilterBuilder {
    this.criteria.messageContent = content
    return this
  }

  /**
   * Filter conversations with media
   */
  hasMedia(hasMedia = true): FilterBuilder {
    this.criteria.hasMedia = hasMedia
    return this
  }

  /**
   * Filter by read status
   */
  isRead(isRead: boolean): FilterBuilder {
    this.criteria.isRead = isRead
    return this
  }

  /**
   * Filter by response time
   */
  responseTime(operator: 'less_than' | 'greater_than' | 'between', value: number, unit: 'minutes' | 'hours' | 'days', endValue?: number): FilterBuilder {
    this.criteria.responseTime = { operator, value, unit, endValue }
    return this
  }

  /**
   * Build the filter criteria
   */
  build(): FilterCriteria {
    return this.criteria
  }

  /**
   * Reset the builder
   */
  reset(): FilterBuilder {
    this.criteria = {}
    return this
  }
}

/**
 * Filter presets for common use cases
 */
export class FilterPresets {
  static todaysConversations(): FilterCriteria {
    return new FilterBuilder()
      .dateRange('created_at', new Date(new Date().setHours(0, 0, 0, 0)))
      .build()
  }

  static urgentUnassigned(): FilterCriteria {
    return new FilterBuilder()
      .priority(['urgent', 'high'])
      .unassigned()
      .status(['open', 'pending'])
      .build()
  }

  static needsResponse(): FilterCriteria {
    return new FilterBuilder()
      .status(['open', 'pending'])
      .responseTime('greater_than', 2, 'hours')
      .build()
  }

  static mediaConversations(): FilterCriteria {
    return new FilterBuilder()
      .hasMedia(true)
      .dateRange('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .build()
  }

  static closedToday(): FilterCriteria {
    return new FilterBuilder()
      .status(['resolved', 'closed'])
      .dateRange('updated_at', new Date(new Date().setHours(0, 0, 0, 0)))
      .build()
  }
}