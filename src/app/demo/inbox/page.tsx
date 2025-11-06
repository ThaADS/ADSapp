'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DemoProvider, useDemo, useDemoActions } from '@/contexts/demo-context'
import { DemoBanner } from '@/components/demo/demo-banner'
import { DemoTour, TourTrigger } from '@/components/demo/demo-tour'
import { DemoSimulator, FloatingSimulator } from '@/components/demo/demo-simulator'
import { DemoProgress } from '@/components/demo/demo-progress'
import { DemoResetButton, QuickResetButton } from '@/components/demo/demo-reset-button'
import { DemoWatermark, ContextualWatermark } from '@/components/demo/demo-watermark'
import { QuickScenarioSwitcher } from '@/components/demo/demo-scenario-selector'

// Mock conversation list component
function ConversationList() {
  const { state, dispatch } = useDemo()
  const { setActiveConversation, incrementInteraction } = useDemoActions()

  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId)
    incrementInteraction()
  }

  return (
    <div
      className='flex w-80 flex-col border-r border-gray-200 bg-white'
      data-tour='conversation-list'
    >
      {/* Header */}
      <div className='border-b border-gray-200 p-4'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-gray-900'>Conversations</h2>
          <QuickScenarioSwitcher />
        </div>

        {/* Search bar */}
        <div className='relative' data-tour='search-bar'>
          <svg
            className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400'
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
          <input
            type='text'
            placeholder='Search conversations...'
            className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-green-500'
            onChange={() => incrementInteraction()}
          />
        </div>
      </div>

      {/* Conversation items */}
      <div className='flex-1 overflow-y-auto'>
        {state.conversations.map(conversation => (
          <div
            key={conversation.id}
            className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 ${
              state.activeConversationId === conversation.id
                ? 'border-l-4 border-l-blue-500 bg-blue-50'
                : ''
            }`}
            onClick={() => handleConversationClick(conversation.id)}
            data-tour='conversation-item'
            data-customer={conversation.customerName}
          >
            <div className='flex items-start space-x-3'>
              {/* Avatar */}
              <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-sm font-semibold text-white'>
                {conversation.avatar}
              </div>

              {/* Content */}
              <div className='min-w-0 flex-1'>
                <div className='mb-1 flex items-center justify-between'>
                  <h3 className='truncate font-semibold text-gray-900'>
                    {conversation.customerName}
                  </h3>
                  <span className='text-xs text-gray-500'>
                    {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className='mb-2 truncate text-sm text-gray-600'>{conversation.lastMessage}</p>

                <div className='flex items-center justify-between'>
                  {/* Status and tags */}
                  <div className='flex items-center space-x-2'>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        conversation.status === 'active'
                          ? 'bg-green-500'
                          : conversation.status === 'pending'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                      }`}
                      data-tour='conversation-status'
                    />
                    {conversation.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-600'
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Unread count */}
                  {conversation.unreadCount > 0 && (
                    <span className='min-w-[20px] rounded-full bg-green-600 px-2 py-1 text-center text-xs font-bold text-white'>
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mock chat window component
function ChatWindow() {
  const { state } = useDemo()
  const { addMessage, incrementInteraction } = useDemoActions()
  const [messageText, setMessageText] = useState('')

  const activeConversation = state.conversations.find(c => c.id === state.activeConversationId)

  const handleSendMessage = () => {
    if (messageText.trim() && activeConversation) {
      addMessage(activeConversation.id, {
        type: 'outgoing',
        content: messageText,
        sender: 'You',
        status: 'sent',
        messageType: 'text',
      })
      setMessageText('')
      incrementInteraction()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!activeConversation) {
    return (
      <div className='flex flex-1 items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <svg
            className='mx-auto mb-4 h-16 w-16 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
          <h3 className='mb-2 text-lg font-semibold text-gray-900'>Select a conversation</h3>
          <p className='text-gray-600'>Choose a conversation from the list to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col bg-white' data-tour='chat-window'>
      {/* Chat header */}
      <div className='border-b border-gray-200 bg-white p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 font-semibold text-white'>
              {activeConversation.avatar}
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>{activeConversation.customerName}</h3>
              <p className='text-sm text-gray-600'>{activeConversation.customerPhone}</p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            {/* Actions */}
            <button className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'>
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                />
              </svg>
            </button>
            <button className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'>
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4' data-tour='message-thread'>
        {activeConversation.messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                message.type === 'outgoing'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className='text-sm'>{message.content}</p>
              <div
                className={`mt-1 flex items-center justify-between text-xs ${
                  message.type === 'outgoing' ? 'text-green-100' : 'text-gray-500'
                }`}
              >
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {message.type === 'outgoing' && (
                  <span className='ml-2'>
                    {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : '⏳'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message input */}
      <div className='border-t border-gray-200 bg-white p-4' data-tour='message-input'>
        <div className='flex items-end space-x-3'>
          <button className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'>
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
              />
            </svg>
          </button>

          <button
            className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'
            data-tour='templates-button'
          >
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
              />
            </svg>
          </button>

          <div className='flex-1'>
            <textarea
              value={messageText}
              onChange={e => {
                setMessageText(e.target.value)
                incrementInteraction()
              }}
              onKeyPress={handleKeyPress}
              placeholder='Type a message...'
              className='w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500'
              rows={1}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className='rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300'
          >
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Demo controls sidebar
function DemoControls() {
  const { state } = useDemo()

  return (
    <div className='w-80 space-y-6 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4'>
      <div>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Demo Controls</h3>

        {/* Progress */}
        <DemoProgress variant='detailed' showStats={true} showSteps={true} />
      </div>

      {/* Simulator */}
      <div>
        <DemoSimulator />
      </div>

      {/* Actions */}
      <div className='space-y-3'>
        <DemoResetButton variant='secondary' size='md' className='w-full' />

        <button className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
          View Analytics
        </button>

        <button className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
          Setup Automation
        </button>
      </div>
    </div>
  )
}

function InboxDemoContent() {
  const { state } = useDemo()
  const { startDemo } = useDemoActions()
  const router = useRouter()
  const [isInitialized, setIsInitialized] = React.useState(false)

  useEffect(() => {
    // Auto-start demo if not active
    if (!state.isActive && !isInitialized) {
      startDemo('ecommerce') // Default to ecommerce scenario
      setIsInitialized(true)
    }
  }, [state.isActive, isInitialized, startDemo])

  if (!state.isActive) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600'></div>
          <p className='text-gray-600'>Initializing demo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Demo banner */}
      <DemoBanner />

      {/* Contextual watermark */}
      <ContextualWatermark context='inbox' />

      {/* Main content */}
      <div className='flex h-screen pt-16'>
        {' '}
        {/* pt-16 to account for banner */}
        {/* Conversation list */}
        <ConversationList />
        {/* Chat window */}
        <ChatWindow />
        {/* Demo controls */}
        <DemoControls />
      </div>

      {/* Demo tour */}
      <DemoTour />
      <TourTrigger />

      {/* Floating simulator */}
      <FloatingSimulator />

      {/* Watermark */}
      <DemoWatermark variant='corner' position='bottom-left' />
    </div>
  )
}

export default function InboxDemoPage() {
  return (
    <DemoProvider>
      <InboxDemoContent />
    </DemoProvider>
  )
}
