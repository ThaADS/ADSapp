export interface FilterCriteria {
  status?: ('open' | 'pending' | 'resolved' | 'closed')[]
  priority?: ('low' | 'medium' | 'high' | 'urgent')[]
  assignedTo?: string[]
  tags?: string[]
  dateRange?: {
    field: 'created_at' | 'last_message_at' | 'updated_at'
    start?: Date
    end?: Date
  }
  hasUnreadMessages?: boolean
  messageType?: string[]
  contactId?: string[]
}

export interface QuickFilter {
  id: string
  name: string
  description: string
  icon: string
  criteria: FilterCriteria
  sortBy: {
    field: string
    direction: 'asc' | 'desc'
  }
  isSystem?: boolean
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterOptions {
  limit?: number
  offset?: number
  includeAggregations?: boolean
  currentUserId?: string
}

export interface FilterResult {
  conversations: any[]
  totalCount: number
  aggregations?: {
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
    tagCounts: Record<string, number>
  }
}

export class ConversationFilterManager {
  private quickFilters: QuickFilter[] = []

  constructor() {
    this.initializeDefaultFilters()
  }

  private initializeDefaultFilters() {
    this.quickFilters = [
      {
        id: 'unread',
        name: 'Unread',
        description: 'Conversations with unread messages',
        icon: 'message-circle',
        criteria: { hasUnreadMessages: true },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true,
      },
      {
        id: 'open',
        name: 'Open',
        description: 'Open conversations',
        icon: 'message-square',
        criteria: { status: ['open'] },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true,
      },
      {
        id: 'pending',
        name: 'Pending',
        description: 'Pending conversations',
        icon: 'clock',
        criteria: { status: ['pending'] },
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true,
      },
      {
        id: 'high-priority',
        name: 'High Priority',
        description: 'High and urgent priority conversations',
        icon: 'alert-circle',
        criteria: { priority: ['high', 'urgent'] },
        sortBy: { field: 'priority', direction: 'desc' },
        isSystem: true,
      },
      {
        id: 'assigned-to-me',
        name: 'Assigned to Me',
        description: 'Conversations assigned to current user',
        icon: 'user',
        criteria: {},
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true,
      },
    ]
  }

  getQuickFilters(): QuickFilter[] {
    return this.quickFilters.filter(f => !f.isSystem)
  }

  getAllFilters(): QuickFilter[] {
    return this.quickFilters
  }

  addQuickFilter(filter: Omit<QuickFilter, 'id'>): QuickFilter {
    const newFilter: QuickFilter = {
      ...filter,
      id: `custom-${Date.now()}`,
      isSystem: false,
    }
    this.quickFilters.push(newFilter)
    return newFilter
  }

  updateQuickFilter(id: string, updates: Partial<QuickFilter>): boolean {
    const index = this.quickFilters.findIndex(f => f.id === id)
    if (index === -1) return false

    this.quickFilters[index] = { ...this.quickFilters[index], ...updates }
    return true
  }

  deleteQuickFilter(id: string): boolean {
    const index = this.quickFilters.findIndex(f => f.id === id && !f.isSystem)
    if (index === -1) return false

    this.quickFilters.splice(index, 1)
    return true
  }

  async filterConversations(
    organizationId: string,
    criteria: FilterCriteria,
    sortBy: SortOptions = { field: 'last_message_at', direction: 'desc' },
    options: FilterOptions = {}
  ): Promise<FilterResult> {
    try {
      // Build the query parameters
      const params = new URLSearchParams({
        organization_id: organizationId,
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
        sort_field: sortBy.field,
        sort_direction: sortBy.direction,
      })

      // Add filter criteria to params
      if (criteria.status?.length) {
        params.append('status', criteria.status.join(','))
      }
      if (criteria.priority?.length) {
        params.append('priority', criteria.priority.join(','))
      }
      if (criteria.assignedTo?.length) {
        params.append('assigned_to', criteria.assignedTo.join(','))
      }
      if (criteria.tags?.length) {
        params.append('tags', criteria.tags.join(','))
      }
      if (criteria.hasUnreadMessages !== undefined) {
        params.append('has_unread', criteria.hasUnreadMessages.toString())
      }
      if (criteria.messageType?.length) {
        params.append('message_type', criteria.messageType.join(','))
      }
      if (criteria.contactId?.length) {
        params.append('contact_id', criteria.contactId.join(','))
      }
      if (criteria.dateRange) {
        params.append('date_field', criteria.dateRange.field)
        if (criteria.dateRange.start) {
          params.append('date_start', criteria.dateRange.start.toISOString())
        }
        if (criteria.dateRange.end) {
          params.append('date_end', criteria.dateRange.end.toISOString())
        }
      }

      // Handle "assigned to me" filter
      if (options.currentUserId && criteria.assignedTo?.includes('me')) {
        const updatedAssignedTo = criteria.assignedTo.filter(id => id !== 'me')
        updatedAssignedTo.push(options.currentUserId)
        params.set('assigned_to', updatedAssignedTo.join(','))
      }

      if (options.includeAggregations) {
        params.append('include_aggregations', 'true')
      }

      // Make API call to fetch conversations
      const response = await fetch(`/api/conversations/filter?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to filter conversations: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        conversations: data.conversations || [],
        totalCount: data.totalCount || 0,
        aggregations: data.aggregations,
      }
    } catch (error) {
      console.error('Error filtering conversations:', error)

      // Return mock data for development
      return this.getMockFilterResult(criteria, options)
    }
  }

  private getMockFilterResult(criteria: FilterCriteria, options: FilterOptions): FilterResult {
    // Mock data for development/testing
    const mockConversations = [
      {
        id: '1',
        contact: {
          id: 'contact-1',
          name: 'John Doe',
          phone_number: '+1234567890',
          profile_picture_url: null,
        },
        status: 'open',
        priority: 'medium',
        assigned_to: options.currentUserId,
        assigned_agent: {
          id: options.currentUserId || 'agent-1',
          full_name: 'Current User',
          avatar_url: null,
        },
        subject: 'Product inquiry',
        tags: ['sales', 'product'],
        unread_count: 2,
        last_message_at: new Date().toISOString(),
        last_message: {
          content: 'Hi, I have a question about your product',
          message_type: 'text',
          sender_type: 'contact' as const,
        },
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        contact: {
          id: 'contact-2',
          name: 'Jane Smith',
          phone_number: '+0987654321',
          profile_picture_url: null,
        },
        status: 'pending',
        priority: 'high',
        assigned_to: null,
        assigned_agent: null,
        subject: 'Support request',
        tags: ['support'],
        unread_count: 0,
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        last_message: {
          content: 'Thank you for your help!',
          message_type: 'text',
          sender_type: 'contact' as const,
        },
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]

    // Apply basic filtering to mock data
    let filteredConversations = mockConversations

    if (criteria.status?.length) {
      filteredConversations = filteredConversations.filter(c =>
        criteria.status!.includes(c.status as any)
      )
    }

    if (criteria.priority?.length) {
      filteredConversations = filteredConversations.filter(c =>
        criteria.priority!.includes(c.priority as any)
      )
    }

    if (criteria.hasUnreadMessages) {
      filteredConversations = filteredConversations.filter(c => c.unread_count > 0)
    }

    return {
      conversations: filteredConversations.slice(0, options.limit || 50),
      totalCount: filteredConversations.length,
      aggregations: {
        statusCounts: { open: 1, pending: 1, resolved: 0, closed: 0 },
        priorityCounts: { low: 0, medium: 1, high: 1, urgent: 0 },
        tagCounts: { sales: 1, product: 1, support: 1 },
      },
    }
  }

  buildFilterQuery(criteria: FilterCriteria): string {
    const conditions: string[] = []

    if (criteria.status?.length) {
      conditions.push(`status IN (${criteria.status.map(s => `'${s}'`).join(',')})`)
    }

    if (criteria.priority?.length) {
      conditions.push(`priority IN (${criteria.priority.map(p => `'${p}'`).join(',')})`)
    }

    if (criteria.assignedTo?.length) {
      conditions.push(`assigned_to IN (${criteria.assignedTo.map(a => `'${a}'`).join(',')})`)
    }

    if (criteria.hasUnreadMessages !== undefined) {
      conditions.push(`unread_count ${criteria.hasUnreadMessages ? '>' : '='} 0`)
    }

    if (criteria.dateRange) {
      if (criteria.dateRange.start) {
        conditions.push(
          `${criteria.dateRange.field} >= '${criteria.dateRange.start.toISOString()}'`
        )
      }
      if (criteria.dateRange.end) {
        conditions.push(`${criteria.dateRange.field} <= '${criteria.dateRange.end.toISOString()}'`)
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : ''
  }

  validateFilterCriteria(criteria: FilterCriteria): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (criteria.status?.some(s => !['open', 'pending', 'resolved', 'closed'].includes(s))) {
      errors.push('Invalid status value')
    }

    if (criteria.priority?.some(p => !['low', 'medium', 'high', 'urgent'].includes(p))) {
      errors.push('Invalid priority value')
    }

    if (criteria.dateRange) {
      if (criteria.dateRange.start && criteria.dateRange.end) {
        if (criteria.dateRange.start > criteria.dateRange.end) {
          errors.push('Start date must be before end date')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
