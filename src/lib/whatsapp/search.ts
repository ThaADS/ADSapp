export interface SearchQuery {
  text?: string
  type?: 'conversations' | 'messages' | 'contacts' | 'all'
  filters?: {
    status?: string[]
    priority?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    contactId?: string[]
    messageType?: string[]
  }
  sortBy?: 'relevance' | 'date' | 'priority'
  highlight?: boolean
  limit?: number
  offset?: number
}

export interface SearchResult {
  id: string
  type: 'conversation' | 'message' | 'contact'
  score: number
  data: any
  highlights?: {
    field: string
    fragments: string[]
  }[]
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  suggestions?: string[]
  facets?: {
    status: Record<string, number>
    priority: Record<string, number>
    messageType: Record<string, number>
  }
  query: SearchQuery
  executionTime: number
}

export class SearchQueryBuilder {
  private query: SearchQuery = {}

  text(text: string): SearchQueryBuilder {
    this.query.text = text
    return this
  }

  type(type: 'conversations' | 'messages' | 'contacts' | 'all'): SearchQueryBuilder {
    this.query.type = type
    return this
  }

  status(statuses: string[]): SearchQueryBuilder {
    if (!this.query.filters) this.query.filters = {}
    this.query.filters.status = statuses
    return this
  }

  priority(priorities: string[]): SearchQueryBuilder {
    if (!this.query.filters) this.query.filters = {}
    this.query.filters.priority = priorities
    return this
  }

  dateRange(start: Date, end: Date): SearchQueryBuilder {
    if (!this.query.filters) this.query.filters = {}
    this.query.filters.dateRange = { start, end }
    return this
  }

  contactId(contactIds: string[]): SearchQueryBuilder {
    if (!this.query.filters) this.query.filters = {}
    this.query.filters.contactId = contactIds
    return this
  }

  messageType(types: string[]): SearchQueryBuilder {
    if (!this.query.filters) this.query.filters = {}
    this.query.filters.messageType = types
    return this
  }

  sortBy(sort: 'relevance' | 'date' | 'priority'): SearchQueryBuilder {
    this.query.sortBy = sort
    return this
  }

  highlight(enable: boolean = true): SearchQueryBuilder {
    this.query.highlight = enable
    return this
  }

  limit(limit: number): SearchQueryBuilder {
    this.query.limit = limit
    return this
  }

  offset(offset: number): SearchQueryBuilder {
    this.query.offset = offset
    return this
  }

  build(): SearchQuery {
    return { ...this.query }
  }
}

export class WhatsAppSearchEngine {
  private baseUrl = '/api/search'

  async search(organizationId: string, query: SearchQuery): Promise<SearchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          ...query,
        }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Search error:', error)

      // Return mock search results for development
      return this.getMockSearchResults(query)
    }
  }

  async getSearchSuggestions(organizationId: string, query: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/suggestions?q=${encodeURIComponent(query)}&org=${organizationId}`
      )

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`)
      }

      const data = await response.json()
      return data.suggestions || []
    } catch (error) {
      console.error('Suggestions error:', error)

      // Return mock suggestions for development
      return this.getMockSuggestions(query)
    }
  }

  async searchConversations(
    organizationId: string,
    text: string,
    options?: {
      limit?: number
      offset?: number
      filters?: SearchQuery['filters']
    }
  ): Promise<SearchResult[]> {
    const query = new SearchQueryBuilder()
      .text(text)
      .type('conversations')
      .limit(options?.limit || 20)
      .offset(options?.offset || 0)
      .sortBy('relevance')
      .highlight()

    if (options?.filters) {
      if (options.filters.status) query.status(options.filters.status)
      if (options.filters.priority) query.priority(options.filters.priority)
      if (options.filters.contactId) query.contactId(options.filters.contactId)
      if (options.filters.messageType) query.messageType(options.filters.messageType)
      if (options.filters.dateRange) {
        query.dateRange(options.filters.dateRange.start, options.filters.dateRange.end)
      }
    }

    const response = await this.search(organizationId, query.build())
    return response.results.filter(r => r.type === 'conversation')
  }

  async searchMessages(
    organizationId: string,
    text: string,
    options?: {
      limit?: number
      offset?: number
      conversationId?: string
      filters?: SearchQuery['filters']
    }
  ): Promise<SearchResult[]> {
    const query = new SearchQueryBuilder()
      .text(text)
      .type('messages')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0)
      .sortBy('date')
      .highlight()

    if (options?.conversationId) {
      // Add conversation filter logic here
    }

    if (options?.filters) {
      if (options.filters.messageType) query.messageType(options.filters.messageType)
      if (options.filters.dateRange) {
        query.dateRange(options.filters.dateRange.start, options.filters.dateRange.end)
      }
    }

    const response = await this.search(organizationId, query.build())
    return response.results.filter(r => r.type === 'message')
  }

  async searchContacts(
    organizationId: string,
    text: string,
    options?: {
      limit?: number
      offset?: number
    }
  ): Promise<SearchResult[]> {
    const query = new SearchQueryBuilder()
      .text(text)
      .type('contacts')
      .limit(options?.limit || 20)
      .offset(options?.offset || 0)
      .sortBy('relevance')
      .highlight()

    const response = await this.search(organizationId, query.build())
    return response.results.filter(r => r.type === 'contact')
  }

  private getMockSearchResults(query: SearchQuery): SearchResponse {
    const mockResults: SearchResult[] = []

    if (query.type === 'conversations' || query.type === 'all') {
      mockResults.push({
        id: 'conv-1',
        type: 'conversation',
        score: 0.95,
        data: {
          id: 'conv-1',
          contact: {
            id: 'contact-1',
            name: 'John Doe',
            phone_number: '+1234567890',
            profile_picture_url: null,
          },
          status: 'open',
          priority: 'medium',
          assigned_to: null,
          assigned_agent: null,
          subject: 'Product inquiry',
          tags: ['sales', 'product'],
          unread_count: 2,
          last_message_at: new Date().toISOString(),
          last_message: {
            content: query.text
              ? `Message containing "${query.text}"`
              : 'Hi, I have a question about your product',
            message_type: 'text',
            sender_type: 'contact' as const,
          },
          created_at: new Date().toISOString(),
        },
        highlights: query.highlight
          ? [
              {
                field: 'last_message.content',
                fragments: [
                  query.text
                    ? `Message containing "<mark>${query.text}</mark>"`
                    : 'Hi, I have a question about your product',
                ],
              },
            ]
          : undefined,
      })
    }

    if (query.type === 'messages' || query.type === 'all') {
      mockResults.push({
        id: 'msg-1',
        type: 'message',
        score: 0.88,
        data: {
          id: 'msg-1',
          conversation_id: 'conv-1',
          content: query.text
            ? `This is a message containing "${query.text}"`
            : 'This is a sample message',
          message_type: 'text',
          sender_type: 'contact',
          created_at: new Date().toISOString(),
          contact: {
            id: 'contact-1',
            name: 'John Doe',
            phone_number: '+1234567890',
          },
        },
        highlights: query.highlight
          ? [
              {
                field: 'content',
                fragments: [
                  query.text
                    ? `This is a message containing "<mark>${query.text}</mark>"`
                    : 'This is a sample message',
                ],
              },
            ]
          : undefined,
      })
    }

    if (query.type === 'contacts' || query.type === 'all') {
      mockResults.push({
        id: 'contact-1',
        type: 'contact',
        score: 0.82,
        data: {
          id: 'contact-1',
          name: query.text ? `${query.text} Contact` : 'John Doe',
          phone_number: '+1234567890',
          profile_picture_url: null,
          created_at: new Date().toISOString(),
          conversation_count: 3,
          last_interaction: new Date().toISOString(),
        },
        highlights: query.highlight
          ? [
              {
                field: 'name',
                fragments: [query.text ? `<mark>${query.text}</mark> Contact` : 'John Doe'],
              },
            ]
          : undefined,
      })
    }

    return {
      results: mockResults.slice(0, query.limit || 20),
      totalCount: mockResults.length,
      suggestions: query.text ? this.getMockSuggestions(query.text) : [],
      facets: {
        status: { open: 5, pending: 3, resolved: 8, closed: 12 },
        priority: { low: 10, medium: 8, high: 6, urgent: 4 },
        messageType: { text: 20, image: 5, document: 3, audio: 2, video: 1 },
      },
      query,
      executionTime: Math.random() * 100 + 50, // Mock execution time in ms
    }
  }

  private getMockSuggestions(query: string): string[] {
    const baseSuggestions = [
      'product information',
      'pricing details',
      'support request',
      'order status',
      'refund request',
      'technical issue',
      'billing question',
      'account setup',
      'feature request',
      'bug report',
    ]

    return baseSuggestions
      .filter(
        suggestion =>
          suggestion.toLowerCase().includes(query.toLowerCase()) ||
          query.toLowerCase().includes(suggestion.toLowerCase())
      )
      .slice(0, 5)
  }

  // Utility methods for search analytics
  async getSearchAnalytics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalSearches: number
    topQueries: Array<{ query: string; count: number }>
    searchTypes: Record<string, number>
    avgResponseTime: number
  }> {
    try {
      const params = new URLSearchParams({ organization_id: organizationId })
      if (dateRange) {
        params.append('start_date', dateRange.start.toISOString())
        params.append('end_date', dateRange.end.toISOString())
      }

      const response = await fetch(`${this.baseUrl}/analytics?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Analytics error:', error)

      // Return mock analytics
      return {
        totalSearches: 1250,
        topQueries: [
          { query: 'product', count: 45 },
          { query: 'support', count: 38 },
          { query: 'order', count: 32 },
          { query: 'refund', count: 28 },
          { query: 'billing', count: 22 },
        ],
        searchTypes: {
          conversations: 680,
          messages: 420,
          contacts: 150,
        },
        avgResponseTime: 85.5,
      }
    }
  }

  // Method to index new content for search
  async indexContent(
    organizationId: string,
    content: {
      type: 'conversation' | 'message' | 'contact'
      id: string
      data: any
    }
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          ...content,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Indexing error:', error)
      return false
    }
  }

  // Method to remove content from search index
  async removeFromIndex(organizationId: string, type: string, id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/index/${type}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      })

      return response.ok
    } catch (error) {
      console.error('Remove from index error:', error)
      return false
    }
  }
}
