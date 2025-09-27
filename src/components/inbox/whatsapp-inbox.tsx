'use client'

import { useState, useEffect } from 'react'
import { Settings, Phone, UserPlus, MoreVertical, Star, Archive, Trash2, MessageSquare, Users, TrendingUp, Filter, Search } from 'lucide-react'
import EnhancedConversationList from './enhanced-conversation-list'
import EnhancedMessageList from './enhanced-message-list'
import EnhancedMessageInput from './enhanced-message-input'
import { WhatsAppService } from '@/lib/whatsapp/service'
import { WhatsAppBusinessAPI } from '@/lib/whatsapp/business-api'
import { WhatsAppSearchEngine } from '@/lib/whatsapp/search'

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
  onRemoveTag
}: ConversationDetailsProps) {
  const [newTag, setNewTag] = useState('')
  const [agents] = useState([
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' }
  ])

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim())
      setNewTag('')
    }
  }

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {conversation.contact.profile_picture_url ? (
            <img
              src={conversation.contact.profile_picture_url}
              alt={conversation.contact.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-white">
                {conversation.contact.name?.charAt(0).toUpperCase() ||
                 conversation.contact.phone_number.slice(-2)}
              </span>
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {conversation.contact.name || 'Unknown Contact'}
            </h4>
            <p className="text-sm text-gray-500">{conversation.contact.phone_number}</p>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button className="flex items-center justify-center w-full py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </button>
          <button className="flex items-center justify-center w-full py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <UserPlus className="w-4 h-4 mr-2" />
            Profile
          </button>
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="flex-1 overflow-y-auto">
        {/* Status */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={conversation.priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Assignment */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to</label>
          <select
            value={conversation.assigned_to || ''}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>

          {/* Existing Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {conversation.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add New Tag */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            <Star className="w-4 h-4 mr-3" />
            Add to favorites
          </button>
          <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            <Archive className="w-4 h-4 mr-3" />
            Archive conversation
          </button>
          <button className="flex items-center w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md">
            <Trash2 className="w-4 h-4 mr-3" />
            Delete conversation
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppInbox({
  organizationId,
  currentUserId,
  userRole
}: WhatsAppInboxProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [stats, setStats] = useState<InboxStats>({
    totalConversations: 0,
    unreadConversations: 0,
    activeConversations: 0,
    averageResponseTime: 0,
    messagesThisWeek: 0,
    responseRate: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  const whatsappService = new WhatsAppService('', '')

  useEffect(() => {
    loadStats()
  }, [organizationId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  const loadStats = async () => {
    try {
      // Load inbox statistics
      // This would connect to your analytics service
      setStats({
        totalConversations: 156,
        unreadConversations: 23,
        activeConversations: 45,
        averageResponseTime: 8.5,
        messagesThisWeek: 342,
        responseRate: 94.2
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true)
      // Load messages for the conversation
      // This would connect to your message service
      setMessages([])
    } catch (error) {
      console.error('Failed to load messages:', error)
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
    type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video',
    attachments?: any[]
  ) => {
    if (!selectedConversation) return

    try {
      await whatsappService.sendMessage(
        selectedConversation.id,
        content,
        currentUserId,
        type
      )

      // Reload messages
      loadMessages(selectedConversation.id)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleMessageRead = (messageId: string) => {
    // Mark message as read
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      )
    )
  }

  const handleStatusChange = (status: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      status: status as any
    })
  }

  const handlePriorityChange = (priority: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      priority: priority as any
    })
  }

  const handleAssigneeChange = (assigneeId: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      assigned_to: assigneeId || undefined
    })
  }

  const handleAddTag = (tag: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      tags: [...selectedConversation.tags, tag]
    })
  }

  const handleRemoveTag = (tag: string) => {
    if (!selectedConversation) return
    setSelectedConversation({
      ...selectedConversation,
      tags: selectedConversation.tags.filter(t => t !== tag)
    })
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Inbox</h1>

            {/* Stats */}
            <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>{stats.totalConversations} conversations</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{stats.unreadConversations} unread</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{stats.activeConversations} active</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>{stats.responseRate}% response rate</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 flex-shrink-0">
          <EnhancedConversationList
            organizationId={organizationId}
            currentUserId={currentUserId}
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedConversation.contact.profile_picture_url ? (
                      <img
                        src={selectedConversation.contact.profile_picture_url}
                        alt={selectedConversation.contact.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {selectedConversation.contact.name?.charAt(0).toUpperCase() ||
                           selectedConversation.contact.phone_number.slice(-2)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedConversation.contact.name || selectedConversation.contact.phone_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.contact.phone_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedConversation.status === 'open' ? 'bg-green-100 text-green-800' :
                      selectedConversation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedConversation.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedConversation.status}
                    </span>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <EnhancedMessageList
                  conversationId={selectedConversation.id}
                  messages={messages}
                  currentUserId={currentUserId}
                  onMessageRead={handleMessageRead}
                  loading={isLoading}
                />
              </div>

              {/* Message Input */}
              <EnhancedMessageInput
                conversationId={selectedConversation.id}
                organizationId={organizationId}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
              />
            </>
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to WhatsApp Inbox</h3>
                <p className="text-gray-500 max-w-sm">
                  Select a conversation from the list to start messaging with your customers
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Details */}
        {showDetails && selectedConversation && (
          <ConversationDetails
            conversation={selectedConversation}
            onClose={() => setShowDetails(false)}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAssigneeChange={handleAssigneeChange}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        )}
      </div>
    </div>
  )
}