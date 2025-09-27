import { createClient } from '@/lib/supabase/server'

export interface SearchQuery {
  query: string
  type: SearchType
  filters?: SearchFilters
  options?: SearchOptions
}

export type SearchType = 'messages' | 'contacts' | 'conversations' | 'all'

export interface SearchFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  messageTypes?: MessageType[]
  contactIds?: string[]
  conversationIds?: string[]
  assignedTo?: string[]
  tags?: string[]
  status?: ConversationStatus[]
  hasMedia?: boolean
  fromContact?: boolean
  fromAgent?: boolean
}

export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'contact_name'
  sortDirection?: 'asc' | 'desc'
  fuzzy?: boolean
  exactPhrase?: boolean
  caseSensitive?: boolean
  highlightResults?: boolean
}

export interface SearchResult {
  type: 'message' | 'contact' | 'conversation'
  id: string
  score: number
  highlighted?: {
    content?: string
    title?: string
    snippet?: string
  }
  data: any
  context?: SearchContext
}

export interface SearchContext {
  conversationId: string
  contactId: string
  messagesBefore?: any[]
  messagesAfter?: any[]
  relatedMessages?: any[]
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  hasMore: boolean
  query: string
  searchTime: number
  suggestions?: string[]
  facets?: SearchFacets
}

export interface SearchFacets {
  messageTypes: Record<MessageType, number>
  contactCounts: Record<string, number>
  dateCounts: Record<string, number>
  statusCounts: Record<ConversationStatus, number>
}

export interface SavedSearch {
  id: string
  name: string
  query: SearchQuery
  organizationId: string
  createdBy: string
  createdAt: Date
  lastUsed: Date
  useCount: number
}

export interface SearchSuggestion {
  text: string
  type: 'recent' | 'popular' | 'contact' | 'keyword'
  count?: number
}

export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'

export class WhatsAppSearchEngine {
  private supabase = createClient()

  /**
   * Perform comprehensive search across messages, contacts, and conversations
   */
  async search(
    organizationId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResponse> {
    const startTime = performance.now()

    try {
      let results: SearchResult[] = []

      switch (searchQuery.type) {
        case 'messages':
          results = await this.searchMessages(organizationId, searchQuery)
          break
        case 'contacts':
          results = await this.searchContacts(organizationId, searchQuery)
          break
        case 'conversations':
          results = await this.searchConversations(organizationId, searchQuery)
          break
        case 'all':
          const [messageResults, contactResults, conversationResults] = await Promise.all([
            this.searchMessages(organizationId, searchQuery),
            this.searchContacts(organizationId, searchQuery),
            this.searchConversations(organizationId, searchQuery)
          ])
          results = [...messageResults, ...contactResults, ...conversationResults]
          break
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score)

      // Apply pagination
      const limit = searchQuery.options?.limit || 50
      const offset = searchQuery.options?.offset || 0
      const paginatedResults = results.slice(offset, offset + limit)

      // Get search suggestions and facets
      const [suggestions, facets] = await Promise.all([
        this.getSearchSuggestions(organizationId, searchQuery.query),
        this.getSearchFacets(organizationId, searchQuery)
      ])

      const searchTime = performance.now() - startTime

      // Save search query for analytics
      await this.saveSearchQuery(organizationId, searchQuery)

      return {
        results: paginatedResults,
        total: results.length,
        hasMore: (offset + limit) < results.length,
        query: searchQuery.query,
        searchTime,
        suggestions,
        facets
      }
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search messages with full-text search and filters
   */
  async searchMessages(
    organizationId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations!inner(
            id,
            organization_id,
            status,
            assigned_to,
            contact:contacts(id, name, phone_number)
          )
        `)
        .eq('conversation.organization_id', organizationId)

      // Apply text search
      if (searchQuery.query) {
        if (searchQuery.options?.exactPhrase) {
          query = query.eq('content', searchQuery.query)
        } else {
          // Use fuzzy text search
          query = query.textSearch('content', searchQuery.query)
        }
      }

      // Apply filters
      query = this.applyMessageFilters(query, searchQuery.filters)

      // Apply sorting
      if (searchQuery.options?.sortBy === 'date') {
        const ascending = searchQuery.options.sortDirection === 'asc'
        query = query.order('created_at', { ascending })
      }

      const { data: messages, error } = await query

      if (error) {
        throw new Error(`Message search failed: ${error.message}`)
      }

      return (messages || []).map(message => {
        const score = this.calculateMessageScore(message, searchQuery.query)
        const highlighted = searchQuery.options?.highlightResults
          ? this.highlightText(message.content, searchQuery.query)
          : undefined

        return {
          type: 'message' as const,
          id: message.id,
          score,
          highlighted: highlighted ? { content: highlighted } : undefined,
          data: message,
          context: {
            conversationId: message.conversation_id,
            contactId: message.conversation.contact.id
          }
        }
      })
    } catch (error) {
      throw new Error(`Message search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search contacts by name, phone number, and other attributes
   */
  async searchContacts(
    organizationId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', organizationId)

      // Apply text search on multiple fields
      if (searchQuery.query) {
        query = query.or(`name.ilike.%${searchQuery.query}%,phone_number.like.%${searchQuery.query}%`)
      }

      // Apply filters
      if (searchQuery.filters?.tags && searchQuery.filters.tags.length > 0) {
        query = query.overlaps('tags', searchQuery.filters.tags)
      }

      // Apply sorting
      if (searchQuery.options?.sortBy === 'contact_name') {
        const ascending = searchQuery.options.sortDirection === 'asc'
        query = query.order('name', { ascending })
      } else {
        query = query.order('last_message_at', { ascending: false })
      }

      const { data: contacts, error } = await query

      if (error) {
        throw new Error(`Contact search failed: ${error.message}`)
      }

      return (contacts || []).map(contact => {
        const score = this.calculateContactScore(contact, searchQuery.query)
        const highlighted = searchQuery.options?.highlightResults
          ? {
              title: this.highlightText(contact.name, searchQuery.query),
              snippet: contact.phone_number
            }
          : undefined

        return {
          type: 'contact' as const,
          id: contact.id,
          score,
          highlighted,
          data: contact
        }
      })
    } catch (error) {
      throw new Error(`Contact search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search conversations by various criteria
   */
  async searchConversations(
    organizationId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*),
          assigned_agent:profiles(id, full_name),
          latest_message:messages(content, created_at, message_type)
        `)
        .eq('organization_id', organizationId)

      // Apply filters
      if (searchQuery.filters?.status && searchQuery.filters.status.length > 0) {
        query = query.in('status', searchQuery.filters.status)
      }

      if (searchQuery.filters?.assignedTo && searchQuery.filters.assignedTo.length > 0) {
        query = query.in('assigned_to', searchQuery.filters.assignedTo)
      }

      if (searchQuery.filters?.tags && searchQuery.filters.tags.length > 0) {
        query = query.overlaps('tags', searchQuery.filters.tags)
      }

      // Date range filter
      if (searchQuery.filters?.dateRange) {
        query = query
          .gte('created_at', searchQuery.filters.dateRange.start.toISOString())
          .lte('created_at', searchQuery.filters.dateRange.end.toISOString())
      }

      const { data: conversations, error } = await query

      if (error) {
        throw new Error(`Conversation search failed: ${error.message}`)
      }

      // Filter conversations that match the text query in messages
      let filteredConversations = conversations || []

      if (searchQuery.query) {
        // Search for conversations containing the query in their messages
        const conversationIds = await this.getConversationsWithQuery(organizationId, searchQuery.query)
        filteredConversations = filteredConversations.filter(conv =>
          conversationIds.includes(conv.id) ||
          conv.contact.name?.toLowerCase().includes(searchQuery.query.toLowerCase()) ||
          conv.subject?.toLowerCase().includes(searchQuery.query.toLowerCase())
        )
      }

      return filteredConversations.map(conversation => {
        const score = this.calculateConversationScore(conversation, searchQuery.query)
        const highlighted = searchQuery.options?.highlightResults
          ? {
              title: this.highlightText(conversation.contact.name, searchQuery.query),
              snippet: conversation.latest_message?.content
            }
          : undefined

        return {
          type: 'conversation' as const,
          id: conversation.id,
          score,
          highlighted,
          data: conversation,
          context: {
            conversationId: conversation.id,
            contactId: conversation.contact.id
          }
        }
      })
    } catch (error) {
      throw new Error(`Conversation search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get conversations that contain the search query in their messages
   */
  private async getConversationsWithQuery(organizationId: string, query: string): Promise<string[]> {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select(`
          conversation_id,
          conversation:conversations!inner(organization_id)
        `)
        .eq('conversation.organization_id', organizationId)
        .textSearch('content', query)

      if (error) {
        return []
      }

      return [...new Set(messages?.map(m => m.conversation_id) || [])]
    } catch (error) {
      return []
    }
  }

  /**
   * Apply message-specific filters to query
   */
  private applyMessageFilters(query: any, filters?: SearchFilters): any {
    if (!filters) return query

    // Message type filter
    if (filters.messageTypes && filters.messageTypes.length > 0) {
      query = query.in('message_type', filters.messageTypes)
    }

    // Sender type filter
    if (filters.fromContact && !filters.fromAgent) {
      query = query.eq('sender_type', 'contact')
    } else if (filters.fromAgent && !filters.fromContact) {
      query = query.eq('sender_type', 'agent')
    }

    // Date range filter
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString())
    }

    // Conversation filter
    if (filters.conversationIds && filters.conversationIds.length > 0) {
      query = query.in('conversation_id', filters.conversationIds)
    }

    return query
  }

  /**
   * Calculate relevance score for messages
   */
  private calculateMessageScore(message: any, query: string): number {
    if (!query) return 1

    let score = 0
    const content = message.content.toLowerCase()
    const searchQuery = query.toLowerCase()

    // Exact match bonus
    if (content === searchQuery) score += 100

    // Contains full query bonus
    if (content.includes(searchQuery)) score += 50

    // Word match scoring
    const queryWords = searchQuery.split(' ')
    const contentWords = content.split(' ')

    queryWords.forEach(word => {
      if (contentWords.includes(word)) score += 10
      if (content.includes(word)) score += 5
    })

    // Recent message bonus
    const messageAge = Date.now() - new Date(message.created_at).getTime()
    const daysSinceMessage = messageAge / (1000 * 60 * 60 * 24)
    score += Math.max(0, 10 - daysSinceMessage)

    return Math.max(score, 1)
  }

  /**
   * Calculate relevance score for contacts
   */
  private calculateContactScore(contact: any, query: string): number {
    if (!query) return 1

    let score = 0
    const searchQuery = query.toLowerCase()

    // Name matching
    if (contact.name) {
      const name = contact.name.toLowerCase()
      if (name === searchQuery) score += 100
      if (name.includes(searchQuery)) score += 50
      if (name.startsWith(searchQuery)) score += 25
    }

    // Phone number matching
    if (contact.phone_number && contact.phone_number.includes(query)) {
      score += 75
    }

    // Recent activity bonus
    if (contact.last_message_at) {
      const activityAge = Date.now() - new Date(contact.last_message_at).getTime()
      const daysSinceActivity = activityAge / (1000 * 60 * 60 * 24)
      score += Math.max(0, 10 - daysSinceActivity)
    }

    return Math.max(score, 1)
  }

  /**
   * Calculate relevance score for conversations
   */
  private calculateConversationScore(conversation: any, query: string): number {
    if (!query) return 1

    let score = 0
    const searchQuery = query.toLowerCase()

    // Contact name matching
    if (conversation.contact.name) {
      const name = conversation.contact.name.toLowerCase()
      if (name.includes(searchQuery)) score += 30
    }

    // Subject matching
    if (conversation.subject && conversation.subject.toLowerCase().includes(searchQuery)) {
      score += 40
    }

    // Recent activity bonus
    if (conversation.last_message_at) {
      const activityAge = Date.now() - new Date(conversation.last_message_at).getTime()
      const daysSinceActivity = activityAge / (1000 * 60 * 60 * 24)
      score += Math.max(0, 15 - daysSinceActivity)
    }

    // Status-based scoring
    const statusScore = {
      'open': 20,
      'pending': 15,
      'resolved': 5,
      'closed': 1
    }
    score += statusScore[conversation.status as keyof typeof statusScore] || 1

    return Math.max(score, 1)
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, query: string): string {
    if (!text || !query) return text

    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(organizationId: string, query: string): Promise<string[]> {
    try {
      // Get recent searches
      const recentSearches = await this.getRecentSearches(organizationId)

      // Get contact names that match
      const { data: contacts } = await this.supabase
        .from('contacts')
        .select('name')
        .eq('organization_id', organizationId)
        .ilike('name', `%${query}%`)
        .limit(5)

      const contactSuggestions = contacts?.map(c => c.name).filter(Boolean) || []

      // Combine and deduplicate suggestions
      const allSuggestions = [...recentSearches, ...contactSuggestions]
      return [...new Set(allSuggestions)].slice(0, 8)
    } catch (error) {
      return []
    }
  }

  /**
   * Get search facets for filtering
   */
  async getSearchFacets(organizationId: string, searchQuery: SearchQuery): Promise<SearchFacets> {
    try {
      // This would typically involve complex aggregation queries
      // For now, return empty facets
      return {
        messageTypes: {
          text: 0,
          image: 0,
          document: 0,
          audio: 0,
          video: 0,
          location: 0,
          system: 0
        },
        contactCounts: {},
        dateCounts: {},
        statusCounts: {
          open: 0,
          pending: 0,
          resolved: 0,
          closed: 0
        }
      }
    } catch (error) {
      return {
        messageTypes: {
          text: 0,
          image: 0,
          document: 0,
          audio: 0,
          video: 0,
          location: 0,
          system: 0
        },
        contactCounts: {},
        dateCounts: {},
        statusCounts: {
          open: 0,
          pending: 0,
          resolved: 0,
          closed: 0
        }
      }
    }
  }

  /**
   * Save search query for analytics and suggestions
   */
  private async saveSearchQuery(organizationId: string, searchQuery: SearchQuery): Promise<void> {
    try {
      await this.supabase
        .from('search_analytics')
        .insert({
          organization_id: organizationId,
          query: searchQuery.query,
          type: searchQuery.type,
          filters: searchQuery.filters,
          created_at: new Date()
        })
    } catch (error) {
      // Ignore errors in search analytics
      console.error('Failed to save search query:', error)
    }
  }

  /**
   * Get recent searches for suggestions
   */
  async getRecentSearches(organizationId: string, limit = 10): Promise<string[]> {
    try {
      const { data: searches, error } = await this.supabase
        .from('search_analytics')
        .select('query')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) return []

      return [...new Set(searches?.map(s => s.query).filter(Boolean) || [])]
    } catch (error) {
      return []
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(organizationId: string, limit = 10): Promise<{ query: string; count: number }[]> {
    try {
      // This would require a more complex aggregation query
      // For now, return empty array
      return []
    } catch (error) {
      return []
    }
  }

  /**
   * Save a search as a saved search
   */
  async saveSearch(
    organizationId: string,
    name: string,
    searchQuery: SearchQuery,
    userId: string
  ): Promise<SavedSearch> {
    try {
      const savedSearchData = {
        id: crypto.randomUUID(),
        name,
        query: searchQuery,
        organization_id: organizationId,
        created_by: userId,
        created_at: new Date(),
        last_used: new Date(),
        use_count: 1
      }

      const { data, error } = await this.supabase
        .from('saved_searches')
        .insert(savedSearchData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save search: ${error.message}`)
      }

      return this.mapToSavedSearch(data)
    } catch (error) {
      throw new Error(`Failed to save search: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get saved searches for organization
   */
  async getSavedSearches(organizationId: string, userId: string): Promise<SavedSearch[]> {
    try {
      const { data, error } = await this.supabase
        .from('saved_searches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('created_by', userId)
        .order('last_used', { ascending: false })

      if (error) {
        throw new Error(`Failed to get saved searches: ${error.message}`)
      }

      return data?.map(item => this.mapToSavedSearch(item)) || []
    } catch (error) {
      throw new Error(`Failed to get saved searches: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute a saved search
   */
  async executeSavedSearch(savedSearchId: string): Promise<SearchResponse> {
    try {
      const { data, error } = await this.supabase
        .from('saved_searches')
        .select('*')
        .eq('id', savedSearchId)
        .single()

      if (error) {
        throw new Error(`Failed to get saved search: ${error.message}`)
      }

      const savedSearch = this.mapToSavedSearch(data)

      // Update usage statistics
      await this.supabase
        .from('saved_searches')
        .update({
          last_used: new Date(),
          use_count: savedSearch.useCount + 1
        })
        .eq('id', savedSearchId)

      // Execute the search
      return await this.search(savedSearch.organizationId, savedSearch.query)
    } catch (error) {
      throw new Error(`Failed to execute saved search: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(savedSearchId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('saved_searches')
        .delete()
        .eq('id', savedSearchId)
        .eq('created_by', userId)

      if (error) {
        throw new Error(`Failed to delete saved search: ${error.message}`)
      }

      return true
    } catch (error) {
      throw new Error(`Failed to delete saved search: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get search context for a message (surrounding messages)
   */
  async getMessageContext(
    messageId: string,
    contextSize = 3
  ): Promise<SearchContext | null> {
    try {
      // Get the message
      const { data: message, error: messageError } = await this.supabase
        .from('messages')
        .select('*, conversation_id, created_at')
        .eq('id', messageId)
        .single()

      if (messageError || !message) {
        return null
      }

      // Get surrounding messages
      const { data: beforeMessages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', message.conversation_id)
        .lt('created_at', message.created_at)
        .order('created_at', { ascending: false })
        .limit(contextSize)

      const { data: afterMessages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', message.conversation_id)
        .gt('created_at', message.created_at)
        .order('created_at', { ascending: true })
        .limit(contextSize)

      // Get conversation and contact info
      const { data: conversation } = await this.supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .eq('id', message.conversation_id)
        .single()

      return {
        conversationId: message.conversation_id,
        contactId: conversation?.contact?.id || '',
        messagesBefore: beforeMessages?.reverse() || [],
        messagesAfter: afterMessages || []
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Map database record to saved search interface
   */
  private mapToSavedSearch(data: any): SavedSearch {
    return {
      id: data.id,
      name: data.name,
      query: data.query,
      organizationId: data.organization_id,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      lastUsed: new Date(data.last_used),
      useCount: data.use_count
    }
  }
}

/**
 * Search query builder for complex searches
 */
export class SearchQueryBuilder {
  private query: SearchQuery = {
    query: '',
    type: 'all',
    filters: {},
    options: {}
  }

  /**
   * Set the search text
   */
  text(query: string): SearchQueryBuilder {
    this.query.query = query
    return this
  }

  /**
   * Set search type
   */
  type(type: SearchType): SearchQueryBuilder {
    this.query.type = type
    return this
  }

  /**
   * Add date range filter
   */
  dateRange(start: Date, end: Date): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.dateRange = { start, end }
    return this
  }

  /**
   * Filter by message types
   */
  messageTypes(types: MessageType[]): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.messageTypes = types
    return this
  }

  /**
   * Filter by conversation status
   */
  status(statuses: ConversationStatus[]): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.status = statuses
    return this
  }

  /**
   * Filter by assigned agents
   */
  assignedTo(agentIds: string[]): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.assignedTo = agentIds
    return this
  }

  /**
   * Filter by tags
   */
  tags(tags: string[]): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.tags = tags
    return this
  }

  /**
   * Filter messages from contacts only
   */
  fromContact(): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.fromContact = true
    return this
  }

  /**
   * Filter messages from agents only
   */
  fromAgent(): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.fromAgent = true
    return this
  }

  /**
   * Filter conversations with media
   */
  hasMedia(): SearchQueryBuilder {
    this.query.filters = this.query.filters || {}
    this.query.filters.hasMedia = true
    return this
  }

  /**
   * Set pagination
   */
  paginate(limit: number, offset = 0): SearchQueryBuilder {
    this.query.options = this.query.options || {}
    this.query.options.limit = limit
    this.query.options.offset = offset
    return this
  }

  /**
   * Set sorting
   */
  sortBy(field: 'relevance' | 'date' | 'contact_name', direction: 'asc' | 'desc' = 'desc'): SearchQueryBuilder {
    this.query.options = this.query.options || {}
    this.query.options.sortBy = field
    this.query.options.sortDirection = direction
    return this
  }

  /**
   * Enable fuzzy search
   */
  fuzzy(): SearchQueryBuilder {
    this.query.options = this.query.options || {}
    this.query.options.fuzzy = true
    return this
  }

  /**
   * Search for exact phrase
   */
  exactPhrase(): SearchQueryBuilder {
    this.query.options = this.query.options || {}
    this.query.options.exactPhrase = true
    return this
  }

  /**
   * Enable result highlighting
   */
  highlight(): SearchQueryBuilder {
    this.query.options = this.query.options || {}
    this.query.options.highlightResults = true
    return this
  }

  /**
   * Build the search query
   */
  build(): SearchQuery {
    return this.query
  }
}

/**
 * Search operators for advanced queries
 */
export class SearchOperators {
  static and(queries: string[]): string {
    return queries.map(q => `(${q})`).join(' AND ')
  }

  static or(queries: string[]): string {
    return queries.map(q => `(${q})`).join(' OR ')
  }

  static not(query: string): string {
    return `NOT (${query})`
  }

  static phrase(text: string): string {
    return `"${text}"`
  }

  static wildcard(pattern: string): string {
    return pattern.replace(/\*/g, '%')
  }

  static proximity(word1: string, word2: string, distance = 5): string {
    return `"${word1}" NEAR/${distance} "${word2}"`
  }

  static field(field: string, value: string): string {
    return `${field}:${value}`
  }
}