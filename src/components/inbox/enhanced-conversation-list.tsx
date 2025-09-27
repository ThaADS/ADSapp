'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, MoreVertical, Clock, User, Tag, AlertCircle, CheckCircle, MessageSquare, Image, FileText, Mic, Video, MapPin, X } from 'lucide-react'
import { ConversationFilterManager, FilterCriteria, QuickFilter } from '@/lib/whatsapp/filters'
import { WhatsAppSearchEngine, SearchQueryBuilder } from '@/lib/whatsapp/search'

interface Conversation {
  id: string
  contact: {
    id: string
    name: string
    phone_number: string
    profile_picture_url?: string
  }
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  assigned_agent?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  subject?: string
  tags: string[]
  unread_count: number
  last_message_at: string
  last_message?: {
    content: string
    message_type: string
    sender_type: 'contact' | 'agent' | 'system'
  }
  created_at: string
}

interface ConversationListProps {
  organizationId: string
  currentUserId: string
  onConversationSelect: (conversation: Conversation) => void
  selectedConversationId?: string
  className?: string
}

interface AdvancedFiltersProps {
  criteria: FilterCriteria
  onChange: (criteria: FilterCriteria) => void
  onClose: () => void
}

function AdvancedFilters({ criteria, onChange, onClose }: AdvancedFiltersProps) {
  const [tempCriteria, setTempCriteria] = useState<FilterCriteria>(criteria)

  const handleApply = () => {
    onChange(tempCriteria)
    onClose()
  }

  const handleReset = () => {
    setTempCriteria({})
    onChange({})
    onClose()
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {['open', 'pending', 'resolved', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  const currentStatuses = tempCriteria.status || []
                  const newStatuses = currentStatuses.includes(status as any)
                    ? currentStatuses.filter(s => s !== status)
                    : [...currentStatuses, status as any]
                  setTempCriteria({ ...tempCriteria, status: newStatuses })
                }}
                className={`px-3 py-1 text-xs rounded-full border ${
                  tempCriteria.status?.includes(status as any)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
          <div className="flex flex-wrap gap-2">
            {['low', 'medium', 'high', 'urgent'].map((priority) => (
              <button
                key={priority}
                onClick={() => {
                  const currentPriorities = tempCriteria.priority || []
                  const newPriorities = currentPriorities.includes(priority as any)
                    ? currentPriorities.filter(p => p !== priority)
                    : [...currentPriorities, priority as any]
                  setTempCriteria({ ...tempCriteria, priority: newPriorities })
                }}
                className={`px-3 py-1 text-xs rounded-full border ${
                  tempCriteria.priority?.includes(priority as any)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={tempCriteria.dateRange?.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                const start = e.target.value ? new Date(e.target.value) : undefined
                setTempCriteria({
                  ...tempCriteria,
                  dateRange: {
                    ...tempCriteria.dateRange,
                    field: tempCriteria.dateRange?.field || 'last_message_at',
                    start
                  }
                })
              }}
              className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-md"
            />
            <input
              type="date"
              value={tempCriteria.dateRange?.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                const end = e.target.value ? new Date(e.target.value) : undefined
                setTempCriteria({
                  ...tempCriteria,
                  dateRange: {
                    ...tempCriteria.dateRange,
                    field: tempCriteria.dateRange?.field || 'last_message_at',
                    end
                  }
                })
              }}
              className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EnhancedConversationList({
  organizationId,
  currentUserId,
  onConversationSelect,
  selectedConversationId,
  className = ''
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({})
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filterManager = new ConversationFilterManager()
  const searchEngine = new WhatsAppSearchEngine()

  useEffect(() => {
    loadQuickFilters()
    loadConversations()
  }, [organizationId, activeFilter, filterCriteria])

  const loadQuickFilters = () => {
    const filters = filterManager.getQuickFilters()
    setQuickFilters([
      { id: 'all', name: 'All', description: 'All conversations', icon: 'inbox', criteria: {}, sortBy: { field: 'last_message_at', direction: 'desc' }, isSystem: true },
      ...filters
    ])
  }

  const loadConversations = async () => {
    try {
      setLoading(true)

      let criteria = filterCriteria
      if (activeFilter !== 'all') {
        const filter = quickFilters.find(f => f.id === activeFilter)
        if (filter) {
          criteria = filter.criteria
        }
      }

      const result = await filterManager.filterConversations(
        organizationId,
        criteria,
        { field: 'last_message_at', direction: 'desc' },
        {
          limit: 50,
          includeAggregations: true,
          currentUserId
        }
      )

      setConversations(result.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadConversations()
      setShowSuggestions(false)
      return
    }

    try {
      // Get search suggestions
      const suggestions = await searchEngine.getSearchSuggestions(organizationId, query)
      setSearchSuggestions(suggestions)
      setShowSuggestions(true)

      // Perform search
      setLoading(true)
      const searchQuery = new SearchQueryBuilder()
        .text(query)
        .type('conversations')
        .highlight()
        .sortBy('relevance')
        .build()

      const result = await searchEngine.search(organizationId, searchQuery)
      const conversationResults = result.results
        .filter(r => r.type === 'conversation')
        .map(r => r.data)

      setConversations(conversationResults)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId, searchEngine, filterManager])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageSquare className="w-3 h-3 text-green-500" />
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />
      case 'resolved':
        return <CheckCircle className="w-3 h-3 text-blue-500" />
      case 'closed':
        return <CheckCircle className="w-3 h-3 text-gray-500" />
      default:
        return <MessageSquare className="w-3 h-3 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return <Image className="w-3 h-3 text-blue-500" />
      case 'document':
        return <FileText className="w-3 h-3 text-gray-500" />
      case 'audio':
        return <Mic className="w-3 h-3 text-green-500" />
      case 'video':
        return <Video className="w-3 h-3 text-purple-500" />
      case 'location':
        return <MapPin className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const truncateMessage = (content: string, maxLength = 60) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const handleFilterChange = (criteria: FilterCriteria) => {
    setFilterCriteria(criteria)
    setActiveFilter('custom')
  }

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations, contacts, messages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              handleSearch(e.target.value)
            }}
            onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Search Suggestions */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-40 mt-1">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion)
                    handleSearch(suggestion)
                    setShowSuggestions(false)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-1 mt-3">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeFilter === filter.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <AdvancedFilters
            criteria={filterCriteria}
            onChange={handleFilterChange}
            onClose={() => setShowAdvancedFilters(false)}
          />
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No conversations found</p>
            <p className="text-sm">
              {searchQuery || Object.keys(filterCriteria).length > 0
                ? 'Try adjusting your search or filters'
                : 'Connect your WhatsApp to start receiving messages'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Contact Avatar */}
                  <div className="relative">
                    {conversation.contact.profile_picture_url ? (
                      <img
                        src={conversation.contact.profile_picture_url}
                        alt={conversation.contact.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {conversation.contact.name?.charAt(0).toUpperCase() ||
                           conversation.contact.phone_number.slice(-2)}
                        </span>
                      </div>
                    )}
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Conversation Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-sm font-medium text-gray-900 truncate ${
                          conversation.unread_count > 0 ? 'font-semibold' : ''
                        }`}>
                          {conversation.contact.name || conversation.contact.phone_number}
                        </h3>
                        {getStatusIcon(conversation.status)}
                        {conversation.priority !== 'medium' && (
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getPriorityColor(conversation.priority)}`}>
                            {conversation.priority}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>

                    {/* Last Message */}
                    {conversation.last_message && (
                      <div className="flex items-center space-x-1 mb-2">
                        {getMessageTypeIcon(conversation.last_message.message_type)}
                        <p className={`text-sm text-gray-600 truncate ${
                          conversation.unread_count > 0 ? 'font-medium text-gray-800' : ''
                        }`}>
                          {conversation.last_message.sender_type === 'agent' && (
                            <span className="text-blue-600 mr-1">You:</span>
                          )}
                          {conversation.last_message.message_type === 'text'
                            ? truncateMessage(conversation.last_message.content)
                            : `[${conversation.last_message.message_type}]`
                          }
                        </p>
                      </div>
                    )}

                    {/* Tags and Assignment */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {conversation.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {conversation.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {conversation.tags.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{conversation.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Assigned Agent */}
                      {conversation.assigned_agent && (
                        <div className="flex items-center space-x-1">
                          {conversation.assigned_agent.avatar_url ? (
                            <img
                              src={conversation.assigned_agent.avatar_url}
                              alt={conversation.assigned_agent.full_name}
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500 truncate">
                            {conversation.assigned_agent.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* More Options */}
                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {conversations.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={loadConversations}
            disabled={loading}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more conversations'}
          </button>
        </div>
      )}
    </div>
  )
}