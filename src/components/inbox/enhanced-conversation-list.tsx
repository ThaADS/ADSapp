'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  MoreVertical,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Image,
  FileText,
  Mic,
  Video,
  MapPin,
  X,
} from 'lucide-react'
import { ConversationFilterManager, FilterCriteria, QuickFilter } from '@/lib/whatsapp/filters'
import { WhatsAppSearchEngine, SearchQueryBuilder } from '@/lib/whatsapp/search'
import { useTranslations } from '@/components/providers/translation-provider'

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
  tags?: string[]
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
  initialConversationId?: string | null
  onConversationsLoaded?: () => void
}

interface AdvancedFiltersProps {
  criteria: FilterCriteria
  onChange: (criteria: FilterCriteria) => void
  onClose: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

function AdvancedFilters({ criteria, onChange, onClose, t }: AdvancedFiltersProps) {
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
    <div className='absolute top-full right-0 left-0 z-50 mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='text-sm font-medium text-gray-900'>{t('filters.title')}</h3>
        <button type='button' onClick={onClose} className='text-gray-400 hover:text-gray-600'>
          <X className='h-4 w-4' />
        </button>
      </div>

      <div className='space-y-4'>
        {/* Status Filter */}
        <div>
          <label className='mb-2 block text-xs font-medium text-gray-700'>{t('conversationInfo.status')}</label>
          <div className='flex flex-wrap gap-2'>
            {['open', 'pending', 'resolved', 'closed'].map(status => (
              <button
                type='button'
                key={status}
                onClick={() => {
                  const currentStatuses = tempCriteria.status || []
                  const newStatuses = currentStatuses.includes(status as any)
                    ? currentStatuses.filter(s => s !== status)
                    : [...currentStatuses, status as any]
                  setTempCriteria({ ...tempCriteria, status: newStatuses })
                }}
                className={`rounded-full border px-3 py-1 text-xs ${tempCriteria.status?.includes(status as any)
                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                  }`}
              >
                {t(`status.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className='mb-2 block text-xs font-medium text-gray-700'>{t('conversationInfo.priority')}</label>
          <div className='flex flex-wrap gap-2'>
            {['low', 'medium', 'high', 'urgent'].map(priority => (
              <button
                type='button'
                key={priority}
                onClick={() => {
                  const currentPriorities = tempCriteria.priority || []
                  const newPriorities = currentPriorities.includes(priority as any)
                    ? currentPriorities.filter(p => p !== priority)
                    : [...currentPriorities, priority as any]
                  setTempCriteria({ ...tempCriteria, priority: newPriorities })
                }}
                className={`rounded-full border px-3 py-1 text-xs ${tempCriteria.priority?.includes(priority as any)
                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                  }`}
              >
                {t(`priority.${priority === 'medium' ? 'normal' : priority}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className='mb-2 block text-xs font-medium text-gray-700'>{t('filters.dateRange')}</label>
          <div className='flex space-x-2'>
            <input
              type='date'
              value={tempCriteria.dateRange?.start?.toISOString().split('T')[0] || ''}
              onChange={e => {
                const start = e.target.value ? new Date(e.target.value) : undefined
                setTempCriteria({
                  ...tempCriteria,
                  dateRange: {
                    ...tempCriteria.dateRange,
                    field: tempCriteria.dateRange?.field || 'last_message_at',
                    start,
                  },
                })
              }}
              className='flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs'
            />
            <input
              type='date'
              value={tempCriteria.dateRange?.end?.toISOString().split('T')[0] || ''}
              onChange={e => {
                const end = e.target.value ? new Date(e.target.value) : undefined
                setTempCriteria({
                  ...tempCriteria,
                  dateRange: {
                    ...tempCriteria.dateRange,
                    field: tempCriteria.dateRange?.field || 'last_message_at',
                    end,
                  },
                })
              }}
              className='flex-1 rounded-md border border-gray-300 px-3 py-1 text-xs'
            />
          </div>
        </div>

        {/* Actions */}
        <div className='flex justify-end space-x-2 border-t border-gray-200 pt-2'>
          <button
            type='button'
            onClick={handleReset}
            className='px-3 py-1 text-xs text-gray-600 hover:text-gray-800'
          >
            {t('filters.reset')}
          </button>
          <button
            type='button'
            onClick={handleApply}
            className='rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700'
          >
            {t('filters.apply')}
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
  className = '',
  initialConversationId,
  onConversationsLoaded,
}: ConversationListProps) {
  const t = useTranslations('inbox')
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

  // Auto-select conversation from URL
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && onConversationsLoaded) {
      const conversation = conversations.find(c => c.id === initialConversationId)
      if (conversation) {
        onConversationSelect(conversation)
      }
      onConversationsLoaded()
    }
  }, [initialConversationId, conversations, onConversationSelect, onConversationsLoaded])

  const loadQuickFilters = () => {
    const filters = filterManager.getQuickFilters()
    setQuickFilters([
      {
        id: 'all',
        name: t('filters.all'),
        description: t('conversations'),
        icon: 'inbox',
        criteria: {},
        sortBy: { field: 'last_message_at', direction: 'desc' },
        isSystem: true,
      },
      ...filters,
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
          currentUserId,
        }
      )

      setConversations(result.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(
    async (query: string) => {
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
    },
    [organizationId, searchEngine, filterManager]
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageSquare className='h-3 w-3 text-green-500' />
      case 'pending':
        return <Clock className='h-3 w-3 text-yellow-500' />
      case 'resolved':
        return <CheckCircle className='h-3 w-3 text-blue-500' />
      case 'closed':
        return <CheckCircle className='h-3 w-3 text-gray-500' />
      default:
        return <MessageSquare className='h-3 w-3 text-gray-400' />
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
        return <Image className='h-3 w-3 text-blue-500' />
      case 'document':
        return <FileText className='h-3 w-3 text-gray-500' />
      case 'audio':
        return <Mic className='h-3 w-3 text-green-500' />
      case 'video':
        return <Video className='h-3 w-3 text-purple-500' />
      case 'location':
        return <MapPin className='h-3 w-3 text-red-500' />
      default:
        return null
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return t('time.minutesAgo', { count: Math.floor(diffInHours * 60) })
    } else if (diffInHours < 24) {
      return t('time.hoursAgo', { count: Math.floor(diffInHours) })
    } else if (diffInHours < 168) {
      return t('time.daysAgo', { count: Math.floor(diffInHours / 24) })
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
    <div className={`flex h-full flex-col border-r border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <div className='relative border-b border-gray-200 p-4'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-gray-900'>{t('conversations')}</h2>
          <button
            type='button'
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          >
            <Filter className='h-4 w-4' />
          </button>
        </div>

        {/* Search Bar */}
        <div className='relative'>
          <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
          <input
            type='text'
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              handleSearch(e.target.value)
            }}
            onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className='w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
          />

          {/* Search Suggestions */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className='absolute top-full right-0 left-0 z-40 mt-1 rounded-md border border-gray-200 bg-white shadow-lg'>
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion)
                    handleSearch(suggestion)
                    setShowSuggestions(false)
                  }}
                  className='w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Filters - Organized by Category */}
        <div className='mt-3 space-y-2'>
          {/* Main Filters (All + Category Tags) */}
          <div className='flex flex-wrap gap-1.5'>
            {quickFilters
              .filter(f => f.id === 'all' || ['sales', 'leads', 'follow-up', 'service', 'backoffice', 'administratie'].includes(f.id))
              .map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${activeFilter === filter.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300'
                    }`}
                >
                  {filter.name}
                </button>
              ))}
          </div>

          {/* Agent Filters */}
          <div className='flex flex-wrap gap-1.5'>
            {quickFilters
              .filter(f => f.id.startsWith('agent-'))
              .map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${activeFilter === filter.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                >
                  {filter.name}
                </button>
              ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <AdvancedFilters
            criteria={filterCriteria}
            onChange={handleFilterChange}
            onClose={() => setShowAdvancedFilters(false)}
            t={t}
          />
        )}
      </div>

      {/* Conversation List */}
      <div className='flex-1 overflow-y-auto'>
        {loading ? (
          <div className='space-y-3 p-4'>
            {[...Array(6)].map((_, i) => (
              <div key={i} className='animate-pulse'>
                <div className='flex items-center space-x-3'>
                  <div className='h-10 w-10 rounded-full bg-gray-200'></div>
                  <div className='flex-1'>
                    <div className='mb-2 h-4 w-3/4 rounded bg-gray-200'></div>
                    <div className='h-3 w-1/2 rounded bg-gray-200'></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className='p-8 text-center text-gray-500'>
            <MessageSquare className='mx-auto mb-4 h-12 w-12 text-gray-300' />
            <p className='mb-2 text-lg font-medium'>{t('list.noConversationsFound')}</p>
            <p className='text-sm'>
              {searchQuery || Object.keys(filterCriteria).length > 0
                ? t('filters.adjustFilters')
                : t('noConversationsDescription')}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-1 p-1.5'>
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`
                  group cursor-pointer rounded-lg border px-2.5 py-2 transition-all
                  ${selectedConversationId === conversation.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent bg-white hover:bg-gray-50'
                  }
                `}
              >
                <div className='flex items-center gap-2.5'>
                  {/* Contact Avatar - Compact 32px */}
                  <div className='relative flex-shrink-0'>
                    {conversation.contact.profile_picture_url ? (
                      <img
                        src={conversation.contact.profile_picture_url}
                        alt={conversation.contact.name}
                        className='h-8 w-8 rounded-full object-cover'
                      />
                    ) : (
                      <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-500'>
                        <span className='text-xs font-medium text-white'>
                          {conversation.contact.name?.charAt(0).toUpperCase() ||
                            conversation.contact.phone_number.slice(-2)}
                        </span>
                      </div>
                    )}
                    {conversation.unread_count > 0 && (
                      <div className='absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white'>
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Conversation Details - Compact layout */}
                  <div className='min-w-0 flex-1'>
                    {/* Row 1: Name + Time inline */}
                    <div className='flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-1.5 min-w-0'>
                        <h3
                          className={`truncate text-sm text-gray-900 ${conversation.unread_count > 0 ? 'font-semibold' : 'font-medium'}`}
                        >
                          {conversation.contact.name || conversation.contact.phone_number}
                        </h3>
                        {getStatusIcon(conversation.status)}
                        {conversation.priority !== 'medium' && conversation.priority !== 'low' && (
                          <span
                            className={`flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${getPriorityColor(conversation.priority)}`}
                          >
                            {conversation.priority === 'urgent' ? '!' : conversation.priority === 'high' ? '↑' : ''}
                          </span>
                        )}
                      </div>
                      <span className='flex-shrink-0 text-[11px] text-gray-400'>
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>

                    {/* Row 2: Message preview (single line) */}
                    {conversation.last_message && (
                      <div className='flex items-center gap-1 mt-0.5'>
                        {getMessageTypeIcon(conversation.last_message.message_type)}
                        <p
                          className={`line-clamp-1 text-xs ${conversation.unread_count > 0 ? 'text-gray-700' : 'text-gray-500'}`}
                        >
                          {conversation.last_message.sender_type === 'agent' && (
                            <span className='text-blue-500'>{t('message.you')}: </span>
                          )}
                          {conversation.last_message.message_type === 'text'
                            ? conversation.last_message.content
                            : `[${conversation.last_message.message_type}]`}
                        </p>
                      </div>
                    )}

                    {/* Tags - Only show on hover or when selected */}
                    {conversation.tags && conversation.tags.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${selectedConversationId === conversation.id ? 'block' : 'hidden group-hover:flex'}`}>
                        {conversation.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${index === 0 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {conversation.tags.length > 2 && (
                          <span className='text-[10px] text-gray-400'>+{conversation.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {conversations.length > 0 && (
        <div className='border-t border-gray-200 p-4'>
          <button
            type='button'
            onClick={loadConversations}
            disabled={loading}
            className='w-full rounded-md py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50'
          >
            {loading ? t('list.loading') : t('list.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
