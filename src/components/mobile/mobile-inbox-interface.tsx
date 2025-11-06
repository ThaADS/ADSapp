'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  PaperClipIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  FaceSmileIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import {
  CheckIcon,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid'

interface Conversation {
  id: string
  contact: {
    id: string
    name: string
    avatar?: string
    phone: string
    status: 'online' | 'offline' | 'away'
  }
  lastMessage: {
    content: string
    timestamp: Date
    sender: 'user' | 'contact'
    type: 'text' | 'image' | 'audio' | 'video' | 'document'
  }
  unreadCount: number
  isPinned: boolean
  tags: string[]
  assignedTo?: string
}

interface Message {
  id: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  sender: 'user' | 'contact'
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

// Sample data
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    contact: {
      id: 'c1',
      name: 'Sarah Johnson',
      phone: '+1 234 567 8900',
      status: 'online',
    },
    lastMessage: {
      content: 'Could you send me the pricing details?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      sender: 'contact',
      type: 'text',
    },
    unreadCount: 2,
    isPinned: false,
    tags: ['sales', 'priority'],
    assignedTo: 'You',
  },
  {
    id: '2',
    contact: {
      id: 'c2',
      name: 'Michael Chen',
      phone: '+1 234 567 8901',
      status: 'away',
    },
    lastMessage: {
      content: 'Thanks for the quick response!',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      sender: 'contact',
      type: 'text',
    },
    unreadCount: 0,
    isPinned: true,
    tags: ['support'],
    assignedTo: 'Alice',
  },
  {
    id: '3',
    contact: {
      id: 'c3',
      name: 'Emma Wilson',
      phone: '+1 234 567 8902',
      status: 'offline',
    },
    lastMessage: {
      content: 'Product demo scheduled for tomorrow',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      sender: 'user',
      type: 'text',
    },
    unreadCount: 0,
    isPinned: false,
    tags: ['demo'],
    assignedTo: 'Bob',
  },
]

const SAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    content: "Hi! I'm interested in your products.",
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read',
  },
  {
    id: '2',
    content:
      "Hello! Thanks for reaching out. I'd be happy to help you with information about our products.",
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3300000),
    status: 'read',
  },
  {
    id: '3',
    content: 'Could you send me the pricing details?',
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 300000),
    status: 'delivered',
  },
]

interface MobileInboxInterfaceProps {
  organizationId: string
}

export default function MobileInboxInterface({ organizationId }: MobileInboxInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Handle viewport height changes (for mobile keyboards)
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter conversations based on search
  const filteredConversations = conversations.filter(
    conv =>
      conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Send message
  const sendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversation) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: messageInput.trim(),
      type: 'text',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    }

    setMessages(prev => [...prev, newMessage])
    setMessageInput('')

    // Update conversation last message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              lastMessage: {
                content: newMessage.content,
                timestamp: newMessage.timestamp,
                sender: newMessage.sender,
                type: newMessage.type,
              },
            }
          : conv
      )
    )

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev =>
        prev.map(msg => (msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg))
      )
    }, 1000)

    setTimeout(() => {
      setMessages(prev =>
        prev.map(msg => (msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg))
      )
    }, 2000)
  }, [messageInput, selectedConversation])

  // Handle conversation selection
  const selectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowContactInfo(false)

    // Mark as read
    setConversations(prev =>
      prev.map(conv => (conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv))
    )
  }, [])

  // Get status indicator color
  const getStatusColor = (status: 'online' | 'offline' | 'away') => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  // Get message status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return (
          <div className='h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent' />
        )
      case 'sent':
        return <CheckIcon className='h-3 w-3 text-gray-400' />
      case 'delivered':
        return (
          <div className='flex'>
            <CheckIcon className='h-3 w-3 text-gray-600' />
            <CheckIcon className='-ml-1 h-3 w-3 text-gray-600' />
          </div>
        )
      case 'read':
        return (
          <div className='flex'>
            <CheckIcon className='h-3 w-3 text-blue-600' />
            <CheckIcon className='-ml-1 h-3 w-3 text-blue-600' />
          </div>
        )
      case 'failed':
        return <ExclamationTriangleIconSolid className='h-3 w-3 text-red-500' />
      default:
        return null
    }
  }

  // Format time for mobile display
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  // Render conversation list
  const renderConversationList = () => (
    <div className='flex h-full flex-col bg-white'>
      {/* Header */}
      <div className='sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold text-gray-900'>Inbox</h1>
          <div className='flex items-center space-x-2'>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            >
              <MagnifyingGlassIcon className='h-5 w-5' />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            >
              <PlusIcon className='h-5 w-5' />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className='mt-3'>
            <div className='relative'>
              <MagnifyingGlassIcon className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
              <input
                type='text'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder='Search conversations...'
                className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
              />
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className='flex-1 overflow-y-auto'>
        {filteredConversations.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
            <ChatBubbleLeftRightIcon className='mb-4 h-12 w-12' />
            <h3 className='mb-2 text-lg font-medium'>No conversations</h3>
            <p className='text-center'>Start a new conversation to get started</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-200'>
            {filteredConversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className='w-full p-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100'
              >
                <div className='flex items-center space-x-3'>
                  {/* Avatar */}
                  <div className='relative'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gray-300'>
                      {conversation.contact.avatar ? (
                        <img
                          src={conversation.contact.avatar}
                          alt=''
                          className='h-12 w-12 rounded-full'
                        />
                      ) : (
                        <span className='text-sm font-medium text-gray-600'>
                          {conversation.contact.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </span>
                      )}
                    </div>
                    <div
                      className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(conversation.contact.status)}`}
                    />
                  </div>

                  {/* Content */}
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='truncate text-sm font-medium text-gray-900'>
                        {conversation.contact.name}
                      </h3>
                      <div className='flex items-center space-x-1'>
                        <span className='text-xs text-gray-500'>
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <div className='flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white'>
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='mt-1 flex items-center justify-between'>
                      <p className='truncate text-sm text-gray-600'>
                        {conversation.lastMessage.sender === 'user' && '✓ '}
                        {conversation.lastMessage.content}
                      </p>
                    </div>

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className='mt-2 flex items-center space-x-1'>
                        {conversation.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'
                          >
                            {tag}
                          </span>
                        ))}
                        {conversation.tags.length > 2 && (
                          <span className='text-xs text-gray-500'>
                            +{conversation.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Render chat interface
  const renderChatInterface = () => (
    <div className='flex h-full flex-col bg-white'>
      {/* Chat Header */}
      <div className='sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <button
              onClick={() => setSelectedConversation(null)}
              className='p-1 text-gray-600 hover:text-gray-900'
            >
              <ArrowLeftIcon className='h-5 w-5' />
            </button>

            <div className='flex items-center space-x-3'>
              <div className='relative'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-300'>
                  {selectedConversation?.contact.avatar ? (
                    <img
                      src={selectedConversation.contact.avatar}
                      alt=''
                      className='h-8 w-8 rounded-full'
                    />
                  ) : (
                    <span className='text-xs font-medium text-gray-600'>
                      {selectedConversation?.contact.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute right-0 bottom-0 h-2 w-2 rounded-full border border-white ${getStatusColor(selectedConversation?.contact.status || 'offline')}`}
                />
              </div>

              <div>
                <h2 className='text-sm font-medium text-gray-900'>
                  {selectedConversation?.contact.name}
                </h2>
                <p className='text-xs text-gray-500'>{selectedConversation?.contact.status}</p>
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <button className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'>
              <PhoneIcon className='h-4 w-4' />
            </button>
            <button className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'>
              <VideoCameraIcon className='h-4 w-4' />
            </button>
            <button
              onClick={() => setShowContactInfo(!showContactInfo)}
              className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            >
              <InformationCircleIcon className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'rounded-br-md bg-blue-600 text-white'
                  : 'rounded-bl-md bg-gray-100 text-gray-900'
              }`}
            >
              <p className='text-sm whitespace-pre-wrap'>{message.content}</p>
              <div
                className={`mt-1 flex items-center justify-between text-xs ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                <span>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.sender === 'user' && (
                  <div className='ml-2'>{getStatusIcon(message.status)}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className='border-t border-gray-200 bg-white p-4'>
        <div className='flex items-end space-x-2'>
          <button className='rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900'>
            <PaperClipIcon className='h-5 w-5' />
          </button>

          <div className='relative flex-1'>
            <textarea
              ref={messageInputRef}
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder='Type a message...'
              className='w-full resize-none rounded-full border border-gray-300 px-4 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
              rows={1}
              style={{ maxHeight: '100px' }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 100)}px`
              }}
            />

            <button className='absolute top-1/2 right-2 -translate-y-1/2 transform p-1 text-gray-400 hover:text-gray-600'>
              <FaceSmileIcon className='h-4 w-4' />
            </button>
          </div>

          {messageInput.trim() ? (
            <button
              onClick={sendMessage}
              className='rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700'
            >
              <PaperAirplaneIcon className='h-5 w-5' />
            </button>
          ) : (
            <button
              className={`rounded-full p-2 ${
                isRecording ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onTouchStart={() => setIsRecording(true)}
              onTouchEnd={() => setIsRecording(false)}
            >
              <MicrophoneIcon className='h-5 w-5' />
            </button>
          )}
        </div>
      </div>

      {/* Contact Info Sidebar (Mobile) */}
      {showContactInfo && (
        <div className='fixed inset-y-0 right-0 z-20 w-80 transform border-l border-gray-200 bg-white transition-transform'>
          <div className='p-4'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-medium'>Contact Info</h3>
              <button
                onClick={() => setShowContactInfo(false)}
                className='p-2 text-gray-400 hover:text-gray-600'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='mb-6 text-center'>
              <div className='mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gray-300'>
                <span className='text-lg font-medium text-gray-600'>
                  {selectedConversation?.contact.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </span>
              </div>
              <h4 className='text-lg font-medium'>{selectedConversation?.contact.name}</h4>
              <p className='text-gray-600'>{selectedConversation?.contact.phone}</p>
            </div>

            <div className='space-y-4'>
              <div>
                <h5 className='mb-2 font-medium text-gray-900'>Tags</h5>
                <div className='flex flex-wrap gap-2'>
                  {selectedConversation?.tags.map(tag => (
                    <span
                      key={tag}
                      className='rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className='mb-2 font-medium text-gray-900'>Assigned To</h5>
                <p className='text-gray-600'>{selectedConversation?.assignedTo || 'Unassigned'}</p>
              </div>

              <div>
                <h5 className='mb-2 font-medium text-gray-900'>Status</h5>
                <div className='flex items-center space-x-2'>
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(selectedConversation?.contact.status || 'offline')}`}
                  />
                  <span className='text-gray-600 capitalize'>
                    {selectedConversation?.contact.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className='h-full' style={{ height: viewportHeight || '100vh' }}>
      {selectedConversation ? renderChatInterface() : renderConversationList()}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
          <div className='w-full max-w-sm rounded-lg bg-white shadow-xl'>
            <div className='flex items-center justify-between border-b border-gray-200 p-4'>
              <h2 className='text-lg font-medium'>New Chat</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='p-4'>
              <div className='space-y-3'>
                <input
                  type='text'
                  placeholder='Enter phone number...'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                />
                <button className='flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'>
                  <UserPlusIcon className='mr-2 h-4 w-4' />
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
