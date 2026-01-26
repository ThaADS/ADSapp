'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { ConversationDetails } from './conversation-details'
import { InboxFilters } from './inbox-filters'
import type { ConversationWithDetails } from '@/types'

type StatusFilter = 'all' | 'open' | 'assigned' | 'unread'

interface InboxLayoutProps {
  conversations: ConversationWithDetails[]
  profile: any
}

export function InboxLayout({ conversations, profile }: InboxLayoutProps) {
  const t = useTranslations('inbox')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversations[0]?.id || null
  )
  const [showDetails, setShowDetails] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })

  // Apply all filters to conversations
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => {
        switch (statusFilter) {
          case 'open':
            return conv.status === 'open' || conv.status === 'pending'
          case 'assigned':
            return conv.assigned_to !== null
          case 'unread':
            return conv.unread_count > 0
          default:
            return true
        }
      })
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(conv => {
        const contactName = conv.contact.name?.toLowerCase() || ''
        const contactPhone = conv.contact.phone_number.toLowerCase()
        const lastMessage = conv.last_message?.content.toLowerCase() || ''
        return (
          contactName.includes(query) || contactPhone.includes(query) || lastMessage.includes(query)
        )
      })
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(conv => {
        const contactTags = conv.contact.tags || []
        return selectedTags.some(tag => contactTags.includes(tag))
      })
    }

    // Agent filter
    if (selectedAgent) {
      filtered = filtered.filter(conv => conv.assigned_to === selectedAgent)
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(conv => {
        if (!conv.last_message_at) return false
        const messageDate = new Date(conv.last_message_at)

        if (dateRange.start && messageDate < dateRange.start) return false
        if (dateRange.end && messageDate > dateRange.end) return false

        return true
      })
    }

    return filtered
  }, [conversations, statusFilter, searchQuery, selectedTags, selectedAgent, dateRange])

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter !== 'all') count++
    if (searchQuery.trim()) count++
    if (selectedTags.length > 0) count++
    if (selectedAgent) count++
    if (dateRange.start || dateRange.end) count++
    return count
  }, [statusFilter, searchQuery, selectedTags, selectedAgent, dateRange])

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter('all')
    setSearchQuery('')
    setSelectedTags([])
    setSelectedAgent(null)
    setDateRange({ start: null, end: null })
    setShowSearch(false)
    setShowFilters(false)
  }

  // Get all unique tags from contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    conversations.forEach(conv => {
      conv.contact.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [conversations])

  // Get all agents
  const allAgents = useMemo(() => {
    const agents = new Map<string, string>()
    conversations.forEach(conv => {
      if (conv.assigned_agent && conv.assigned_to) {
        agents.set(conv.assigned_to, conv.assigned_agent.full_name || 'Unknown')
      }
    })
    return Array.from(agents.entries()).map(([id, name]) => ({ id, name }))
  }, [conversations])

  const selectedConversation = filteredConversations.find(c => c.id === selectedConversationId)

  return (
    <div className='flex h-full bg-white'>
      {/* Conversation List - Left Sidebar */}
      <div className='flex w-80 flex-col border-r border-gray-200'>
        <div className='border-b border-gray-200 p-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-lg font-semibold text-gray-900'>
              {t('title')}
              {activeFilterCount > 0 && (
                <span className='ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
                  {activeFilterCount}
                </span>
              )}
            </h1>
            <div className='flex items-center space-x-2'>
              {/* Advanced filter button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 ${showFilters ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                title={t('filters.title')}
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
                  />
                </svg>
              </button>
              {/* Search button */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 ${showSearch ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                title={t('search.placeholder')}
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className='mt-3'>
              <div className='relative'>
                <input
                  type='text'
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 py-2 pr-10 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                />
                <svg
                  className='absolute top-2.5 left-3 h-4 w-4 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className='absolute top-2.5 right-3 text-gray-400 hover:text-gray-600'
                  >
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Advanced filters */}
          {showFilters && (
            <InboxFilters
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              allTags={allTags}
              allAgents={allAgents}
              onClearAll={clearAllFilters}
            />
          )}

          {/* Status filter tabs */}
          <div className='mt-4 flex space-x-1 rounded-lg bg-gray-100 p-1'>
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${statusFilter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {t('filters.all')}
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${statusFilter === 'open'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {t('status.open')}
            </button>
            <button
              onClick={() => setStatusFilter('assigned')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${statusFilter === 'assigned'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {t('filters.assigned')}
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${statusFilter === 'unread'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {t('filters.unread')}
            </button>
          </div>

          {/* Active filters indicator */}
          {activeFilterCount > 0 && (
            <div className='mt-3 flex items-center justify-between text-xs text-gray-600'>
              <span>
                {t('list.conversationsCount', { count: filteredConversations.length, total: conversations.length })}
              </span>
              <button
                onClick={clearAllFilters}
                className='font-medium text-green-600 hover:text-green-700'
              >
                {t('filters.clearAll')}
              </button>
            </div>
          )}
        </div>

        <ConversationList
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Chat Window - Center */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            profile={profile}
            onShowDetails={() => setShowDetails(!showDetails)}
            showDetails={showDetails}
          />
        ) : (
          <div className='flex flex-1 items-center justify-center bg-gray-50'>
            <div className='text-center'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900'>{t('empty.selectConversation')}</h3>
              <p className='mt-1 text-sm text-gray-500'>
                {t('empty.selectConversationDescription')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Details - Right Sidebar */}
      {selectedConversation && showDetails && (
        <div className='w-80 border-l border-gray-200'>
          <ConversationDetails
            conversation={selectedConversation}
            profile={profile}
            onClose={() => setShowDetails(false)}
          />
        </div>
      )}
    </div>
  )
}
