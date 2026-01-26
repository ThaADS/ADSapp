'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Settings,
  Phone,
  UserPlus,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  MessageSquare,
  Users,
  TrendingUp,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react'
import EnhancedConversationList from './enhanced-conversation-list'
import EnhancedMessageList from './enhanced-message-list'
import MessageInputWithTyping from './message-input-with-typing'
import ConversationTagSelector from './conversation-tag-selector'
import BubbleColorPicker from './bubble-color-picker'
import { WhatsAppService } from '@/lib/whatsapp/service'
import ConversationSummary from '@/components/ai/conversation-summary'
import { createClient } from '@/lib/supabase/client'
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

interface Message {
  id: string
  conversation_id: string
  whatsapp_message_id?: string
  sender_type: 'contact' | 'agent' | 'system'
  sender_id?: string
  sender?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  content: string
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
  media_url?: string
  media_mime_type?: string
  is_read: boolean
  delivered_at?: string
  read_at?: string
  created_at: string
  media?: {
    id: string
    filename: string
    fileSize: number
    url: string
    thumbnailUrl?: string
    mimeType: string
  }
}

interface InboxStats {
  totalConversations: number
  unreadConversations: number
  activeConversations: number
  averageResponseTime: number
  messagesThisWeek: number
  responseRate: number
}

interface WhatsAppInboxProps {
  organizationId: string
  currentUserId: string
  userRole: 'owner' | 'admin' | 'agent'
}

interface ConversationDetailsProps {
  conversation: Conversation
  onClose: () => void
  onStatusChange: (status: string) => void
  onPriorityChange: (priority: string) => void
  onAssigneeChange: (assigneeId: string) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}

function ConversationDetails({
  conversation,
  onClose,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onAddTag,
  onRemoveTag,
}: ConversationDetailsProps) {
  const t = useTranslations('inbox')
  const [newTag, setNewTag] = useState('')
  const [agents] = useState([
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
  ])

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim())
      setNewTag('')
    }
  }

  return (
    <div className='flex w-80 flex-col border-l border-gray-200 bg-gray-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-medium text-gray-900'>{t('contact.details')}</h3>
          <button type='button' onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <MoreVertical className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className='border-b border-gray-200 bg-white p-4'>
        <div className='flex items-center space-x-3'>
          {conversation.contact.profile_picture_url ? (
            <div className='relative h-12 w-12 flex-shrink-0'>
              <Image
                src={conversation.contact.profile_picture_url}
                alt={conversation.contact.name}
                fill
                sizes='48px'
                className='rounded-full object-cover'
                priority={false}
              />
            </div>
          ) : (
            <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500'>
              <span className='text-lg font-medium text-white'>
                {conversation.contact.name?.charAt(0).toUpperCase() ||
                  conversation.contact.phone_number.slice(-2)}
              </span>
            </div>
          )}
          <div>
            <h4 className='text-sm font-medium text-gray-900'>
              {conversation.contact.name || t('contact.unknown')}
            </h4>
            <p className='text-sm text-gray-500'>{conversation.contact.phone_number}</p>
          </div>
        </div>

        <div className='mt-4 flex space-x-2'>
          <button type='button' className='flex w-full items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'>
            <Phone className='mr-2 h-4 w-4' />
            {t('contact.call', { phone: '' })}
          </button>
          <button type='button' className='flex w-full items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'>
            <UserPlus className='mr-2 h-4 w-4' />
            {t('contact.viewProfile')}
          </button>
        </div>
      </div>

      {/* Conversation Settings */}
      <div className='flex-1 overflow-y-auto'>
        {/* Status */}
        <div className='border-b border-gray-200 bg-white p-4'>
          <label className='mb-2 block text-sm font-medium text-gray-700'>{t('conversationInfo.status')}</label>
          <select
            value={conversation.status}
            onChange={e => onStatusChange(e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500'
          >
            <option value='open'>{t('status.open')}</option>
            <option value='pending'>{t('status.pending')}</option>
            <option value='resolved'>{t('status.resolved')}</option>
            <option value='closed'>{t('status.closed')}</option>
          </select>
        </div>

        {/* Priority */}
        <div className='border-b border-gray-200 bg-white p-4'>
          <label className='mb-2 block text-sm font-medium text-gray-700'>{t('conversationInfo.priority')}</label>
          <select
            value={conversation.priority}
            onChange={e => onPriorityChange(e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500'
          >
            <option value='low'>{t('priority.low')}</option>
            <option value='medium'>{t('priority.normal')}</option>
            <option value='high'>{t('priority.high')}</option>
            <option value='urgent'>{t('priority.urgent')}</option>
          </select>
        </div>

        {/* Assignment */}
        <div className='border-b border-gray-200 bg-white p-4'>
          <label className='mb-2 block text-sm font-medium text-gray-700'>{t('conversationInfo.assignedTo')}</label>
          <select
            value={conversation.assigned_to || ''}
            onChange={e => onAssigneeChange(e.target.value)}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500'
          >
            <option value=''>{t('assignment.unassigned')}</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className='border-b border-gray-200 bg-white p-4'>
          <label className='mb-2 block text-sm font-medium text-gray-700'>{t('tags.label')}</label>

          {/* Existing Tags */}
          <div className='mb-3 flex flex-wrap gap-1.5'>
            {conversation.tags && conversation.tags.length > 0 ? (
              conversation.tags.map(tag => (
                <span
                  key={tag}
                  className='inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800'
                >
                  {tag}
                  <button
                    type='button'
                    onClick={() => onRemoveTag(tag)}
                    className='ml-1.5 text-emerald-600 hover:text-emerald-900'
                    title={t('tags.remove')}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className='text-xs text-gray-400 italic'>{t('tags.noTags')}</span>
            )}
          </div>

          {/* Category Tags */}
          <div className='mb-3'>
            <p className='mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide'>{t('tags.categories')}</p>
            <div className='flex flex-wrap gap-1.5'>
              {[
                { id: 'sales', label: 'Sales', color: 'blue' },
                { id: 'leads', label: 'Leads', color: 'purple' },
                { id: 'follow-up', label: 'Follow-up', color: 'orange' },
                { id: 'service', label: 'Service', color: 'teal' },
                { id: 'backoffice', label: 'Backoffice', color: 'slate' },
                { id: 'administratie', label: 'Administratie', color: 'gray' },
              ].map(tag => {
                const isSelected = conversation.tags?.includes(tag.id)
                return (
                  <button
                    type='button'
                    key={tag.id}
                    onClick={() => isSelected ? onRemoveTag(tag.id) : onAddTag(tag.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Team Member Tags */}
          <div className='mb-3'>
            <p className='mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide'>{t('team')}</p>
            <div className='flex flex-wrap gap-1.5'>
              {[
                { id: 'agent-1', label: 'Agent 1' },
                { id: 'agent-2', label: 'Agent 2' },
                { id: 'agent-3', label: 'Agent 3' },
              ].map(tag => {
                const isSelected = conversation.tags?.includes(tag.id)
                return (
                  <button
                    type='button'
                    key={tag.id}
                    onClick={() => isSelected ? onRemoveTag(tag.id) : onAddTag(tag.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div>
            <p className='mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide'>{t('tags.add')}</p>
            <div className='flex gap-2'>
              <input
                type='text'
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                placeholder={t('tags.add')}
                className='flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none'
              />
              <button
                type='button'
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className='rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t('tags.add')}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='space-y-2 p-4'>
          <button type='button' className='flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100'>
            <Star className='mr-3 h-4 w-4' />
            {t('actions.star')}
          </button>
          <button type='button' className='flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100'>
            <Archive className='mr-3 h-4 w-4' />
            {t('actions.archiveConversation')}
          </button>
          <button type='button' className='flex w-full items-center rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50'>
            <Trash2 className='mr-3 h-4 w-4' />
            {t('actions.deleteConversation')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppInbox({ organizationId, currentUserId }: WhatsAppInboxProps) {
  const t = useTranslations('inbox')
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get('conversation')

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [stats, setStats] = useState<InboxStats>({
    totalConversations: 0,
    unreadConversations: 0,
    activeConversations: 0,
    averageResponseTime: 0,
    messagesThisWeek: 0,
    responseRate: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [globalBubbleColor, setGlobalBubbleColor] = useState<{ bubble: string; text: string }>({
    bubble: 'bg-white',
    text: 'text-gray-900',
  })
  const [whatsappService, setWhatsappService] = useState<WhatsAppService | null>(null)
  const [userName, setUserName] = useState<string>('Agent')

  // ⚡ PERFORMANCE: Initialize WhatsApp service, load bubble color, and stats in parallel
  useEffect(() => {
    const initializeInbox = async () => {
      const supabase = createClient()

      // Run all initialization tasks in parallel
      const [serviceResult, colorResult] = await Promise.allSettled([
        // Task 1: Initialize WhatsApp service
        (async () => {
          const service = await WhatsAppService.createFromOrganization(organizationId, supabase)
          return service
        })(),

        // Task 2: Load bubble color preference and user name
        (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return null as { bubble_color_preference?: string; bubble_text_color_preference?: string; full_name?: string } | null

          const { data: profile } = await supabase
            .from('profiles')
            .select('bubble_color_preference, bubble_text_color_preference, full_name')
            .eq('id', user.id)
            .single()

          return profile
        })(),
      ])

      // Handle WhatsApp service result
      if (serviceResult.status === 'fulfilled' && serviceResult.value) {
        setWhatsappService(serviceResult.value)
      } else {
        console.error('Failed to initialize WhatsApp service:', serviceResult.status === 'rejected' ? serviceResult.reason : 'Unknown error')
        setWhatsappService(null)
      }

      // Handle bubble color result and user name
      if (colorResult.status === 'fulfilled' && colorResult.value) {
        if (colorResult.value.bubble_color_preference) {
          setGlobalBubbleColor({
            bubble: colorResult.value.bubble_color_preference,
            text: colorResult.value.bubble_text_color_preference || 'text-gray-900',
          })
        }
        if (colorResult.value.full_name) {
          setUserName(colorResult.value.full_name)
        }
      }

      // Load stats after initialization
      loadStats()
    }

    if (organizationId) {
      initializeInbox()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    }
  }, [selectedConversation])

  const loadStats = async () => {
    try {
      // Load real inbox statistics from API
      const response = await fetch(
        `/api/conversations/filter?organization_id=${organizationId}&include_aggregations=true&limit=1`
      )

      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const data = await response.json()

      // Calculate stats from the data
      const activeCount = data.conversations?.filter((c: any) => c.status === 'open' || c.status === 'pending').length || 0
      const unreadCount = data.conversations?.filter((c: any) => c.unread_count > 0).length || 0
      const totalMessages = data.conversations?.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0) || 0

      setStats({
        totalConversations: data.totalCount || 0,
        unreadConversations: unreadCount,
        activeConversations: activeCount,
        averageResponseTime: 0, // TODO: Calculate from message timestamps
        messagesThisWeek: totalMessages,
        responseRate: totalMessages > 0 ? Math.round((activeCount / totalMessages) * 100) : 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
      // Set all stats to 0 on error (show empty state, not fake data)
      setStats({
        totalConversations: 0,
        unreadConversations: 0,
        activeConversations: 0,
        averageResponseTime: 0,
        messagesThisWeek: 0,
        responseRate: 0,
      })
    }
  }

  const loadMessages = async () => {
    if (!selectedConversation) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`)

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowDetails(false)
  }

  const handleSendMessage = async (
    content: string,
    type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video'
  ) => {
    if (!selectedConversation || !whatsappService) return

    try {
      // WhatsAppService currently only supports text, template, image, document
      // Map audio/video to document for now
      const supportedType = type === 'audio' || type === 'video' ? 'document' : type

      await whatsappService.sendMessage(
        selectedConversation.id,
        content,
        currentUserId,
        supportedType as 'text' | 'template' | 'image' | 'document'
      )

      // Reload messages
      loadMessages()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleMessageRead = (messageId: string) => {
    // Mark message as read
    setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, is_read: true } : msg)))
  }

  const handleStatusChange = (status: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      status: status as 'open' | 'pending' | 'resolved' | 'closed',
    })
  }

  const handlePriorityChange = (priority: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
    })
  }

  const handleAssigneeChange = (assigneeId: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      assigned_to: assigneeId || undefined,
    })
  }

  const handleAddTag = async (tagId: string) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })

      if (response.ok) {
        setSelectedConversation({
          ...selectedConversation,
          tags: [...selectedConversation.tags, tagId],
        })
      }
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSelectedConversation({
          ...selectedConversation,
          tags: selectedConversation.tags.filter(t => t !== tagId),
        })
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const handleColorChange = async (bubbleColor: string, textColor: string) => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Update global bubble color in user profile (applies to ALL conversations)
      const { error } = await supabase
        .from('profiles')
        .update({
          bubble_color_preference: bubbleColor,
          bubble_text_color_preference: textColor,
        })
        .eq('id', user.id)

      if (error) throw error

      // Update local state immediately for instant UI feedback
      setGlobalBubbleColor({ bubble: bubbleColor, text: textColor })
    } catch (error) {
      console.error('Error saving bubble color preference:', error)
    }
  }

  return (
    <div className='flex h-screen flex-col bg-gray-100'>
      {/* Header - Desktop */}
      <div className='hidden md:block border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <h1 className='text-2xl font-bold text-gray-900'>{t('header.title')}</h1>

            {/* Stats */}
            <div className='hidden items-center space-x-6 text-sm text-gray-600 lg:flex'>
              <div className='flex items-center space-x-1'>
                <MessageSquare className='h-4 w-4' />
                <span>{t('stats.conversations', { count: stats.totalConversations })}</span>
              </div>
              <div className='flex items-center space-x-1'>
                <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                <span>{t('stats.unread', { count: stats.unreadConversations })}</span>
              </div>
              <div className='flex items-center space-x-1'>
                <Users className='h-4 w-4' />
                <span>{t('stats.active', { count: stats.activeConversations })}</span>
              </div>
              <div className='flex items-center space-x-1'>
                <TrendingUp className='h-4 w-4' />
                <span>{t('stats.responseRate', { rate: stats.responseRate })}</span>
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-3'>
            <button type='button' className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-h-[44px] min-w-[44px]' title={t('header.search')} aria-label={t('header.search')}>
              <Search className='h-5 w-5' />
            </button>
            <button type='button' className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-h-[44px] min-w-[44px]' title={t('filters.title')} aria-label={t('filters.title')}>
              <Filter className='h-5 w-5' />
            </button>
            <button type='button' className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-h-[44px] min-w-[44px]' title={t('header.settings')} aria-label={t('header.settings')}>
              <Settings className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header - Only show when conversation is selected */}
      {selectedConversation && (
        <div className='md:hidden border-b border-gray-200 bg-white'>
          <div className='flex items-center gap-3 px-4 py-3'>
            <button
              type='button'
              onClick={() => setSelectedConversation(null)}
              className='flex-shrink-0 p-2 -ml-2 text-gray-600 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center'
              aria-label={t('mobile.backToConversations')}
              title={t('mobile.back')}
            >
              <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
            <div className='flex items-center gap-3 flex-1 min-w-0'>
              {selectedConversation.contact.profile_picture_url ? (
                <div className='relative h-10 w-10 flex-shrink-0'>
                  <Image
                    src={selectedConversation.contact.profile_picture_url}
                    alt={selectedConversation.contact.name}
                    fill
                    sizes='40px'
                    className='rounded-full object-cover'
                    priority
                  />
                </div>
              ) : (
                <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500'>
                  <span className='text-sm font-medium text-white'>
                    {selectedConversation.contact.name?.charAt(0).toUpperCase() ||
                      selectedConversation.contact.phone_number.slice(-2)}
                  </span>
                </div>
              )}
              <div className='flex-1 min-w-0'>
                <h3 className='text-base font-semibold text-gray-900 truncate'>
                  {selectedConversation.contact.name || selectedConversation.contact.phone_number}
                </h3>
                <p className='text-xs text-gray-500 truncate'>{selectedConversation.contact.phone_number}</p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setShowDetails(!showDetails)}
              className='flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center'
              aria-label={t('mobile.showDetails')}
              title={t('mobile.details')}
            >
              <MoreVertical className='h-5 w-5' />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Stats Bar - Only show when no conversation selected */}
      {!selectedConversation && (
        <div className='md:hidden border-b border-gray-200 bg-white px-4 py-3'>
          <div className='grid grid-cols-2 gap-3 text-xs'>
            <div className='flex items-center gap-2'>
              <MessageSquare className='h-4 w-4 text-gray-400' />
              <span className='text-gray-600'>{t('stats.total', { count: stats.totalConversations })}</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-blue-500'></div>
              <span className='text-gray-600'>{t('stats.unread', { count: stats.unreadConversations })}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4 text-gray-400' />
              <span className='text-gray-600'>{t('stats.active', { count: stats.activeConversations })}</span>
            </div>
            <div className='flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-gray-400' />
              <span className='text-gray-600'>{t('stats.rate', { rate: stats.responseRate })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Conversation List - Full width on mobile when no conversation selected, hidden when selected */}
        <div className={`${selectedConversation ? 'hidden md:block md:w-80' : 'w-full md:w-80'} flex-shrink-0`}>
          <EnhancedConversationList
            organizationId={organizationId}
            currentUserId={currentUserId}
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversation?.id}
            initialConversationId={conversationIdFromUrl}
            onConversationsLoaded={() => setConversationsLoaded(true)}
          />
        </div>

        {/* Chat Area - Full width on mobile, flex on desktop */}
        <div className={`flex flex-1 flex-col ${!selectedConversation ? 'hidden md:flex' : 'w-full md:w-auto'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header - Desktop only (mobile header is above) */}
              <div className='hidden md:block border-b border-gray-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    {selectedConversation.contact.profile_picture_url ? (
                      <div className='relative h-10 w-10 flex-shrink-0'>
                        <Image
                          src={selectedConversation.contact.profile_picture_url}
                          alt={selectedConversation.contact.name}
                          fill
                          sizes='40px'
                          className='rounded-full object-cover'
                          priority
                        />
                      </div>
                    ) : (
                      <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500'>
                        <span className='text-sm font-medium text-white'>
                          {selectedConversation.contact.name?.charAt(0).toUpperCase() ||
                            selectedConversation.contact.phone_number.slice(-2)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className='text-lg font-medium text-gray-900'>
                        {selectedConversation.contact.name ||
                          selectedConversation.contact.phone_number}
                      </h3>
                      <p className='text-sm text-gray-500'>
                        {selectedConversation.contact.phone_number}
                      </p>
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    {/* Tags Selector */}
                    <ConversationTagSelector
                      conversationId={selectedConversation.id}
                      organizationId={organizationId}
                      selectedTags={selectedConversation.tags}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                    />

                    {/* Bubble Color Picker */}
                    <BubbleColorPicker
                      conversationId={selectedConversation.id}
                      currentColor={globalBubbleColor.bubble}
                      onColorChange={handleColorChange}
                    />

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        selectedConversation.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : selectedConversation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : selectedConversation.status === 'resolved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedConversation.status}
                    </span>

                    {/* AI Summary Button */}
                    <button
                      type='button'
                      onClick={() => setShowSummary(true)}
                      className='flex items-center space-x-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100'
                      title={t('ai.generateSummary')}
                      aria-label={t('ai.generateSummary')}
                    >
                      <Sparkles className='h-4 w-4' />
                      <span>{t('ai.summary')}</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => setShowDetails(!showDetails)}
                      className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      title={t('mobile.details')}
                      aria-label={t('mobile.showDetails')}
                    >
                      <MoreVertical className='h-5 w-5' />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className='flex-1 overflow-hidden'>
                <EnhancedMessageList
                  conversationId={selectedConversation.id}
                  messages={messages}
                  currentUserId={currentUserId}
                  onMessageRead={handleMessageRead}
                  loading={isLoading}
                  contactBubbleColor={globalBubbleColor.bubble}
                  contactTextColor={globalBubbleColor.text}
                />
              </div>

              {/* Message Input with Typing Indicators */}
              <MessageInputWithTyping
                conversationId={selectedConversation.id}
                organizationId={organizationId}
                currentUserId={currentUserId}
                userName={userName}
                contactName={selectedConversation.contact.name || 'Contact'}
                onSendMessage={handleSendMessage}
              />
            </>
          ) : (
            /* No Conversation Selected */
            <div className='flex flex-1 items-center justify-center bg-gray-50'>
              <div className='text-center'>
                <MessageSquare className='mx-auto mb-4 h-16 w-16 text-gray-300' />
                <h3 className='mb-2 text-lg font-medium text-gray-900'>
                  {t('welcome.title')}
                </h3>
                <p className='max-w-sm text-gray-500'>
                  {t('welcome.description')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Details - Modal on mobile, sidebar on desktop */}
        {showDetails && selectedConversation && (
          <>
            {/* Mobile: Full screen modal */}
            <div className='md:hidden fixed inset-0 z-50 bg-white overflow-y-auto'>
              <div className='sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setShowDetails(false)}
                  className='p-2 -ml-2 text-gray-600 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center'
                  aria-label={t('mobile.closeDetails')}
                  title={t('templates.close')}
                >
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
                <h2 className='text-lg font-semibold text-gray-900'>{t('contact.details')}</h2>
              </div>
              <ConversationDetails
                conversation={selectedConversation}
                onClose={() => setShowDetails(false)}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
            </div>

            {/* Desktop: Sidebar */}
            <div className='hidden md:block'>
              <ConversationDetails
                conversation={selectedConversation}
                onClose={() => setShowDetails(false)}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
            </div>
          </>
        )}
      </div>

      {/* AI Conversation Summary Modal */}
      {selectedConversation && (
        <ConversationSummary
          conversationId={selectedConversation.id}
          organizationId={organizationId}
          contactName={selectedConversation.contact.name || 'Contact'}
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
