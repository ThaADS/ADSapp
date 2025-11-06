'use client'

import { useEffect, useRef } from 'react'
import type { MessageWithSender } from '@/types'

// Simple time formatter
function formatMessageTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface MessageListProps {
  messages: MessageWithSender[]
  currentUserId: string
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className='flex h-full items-center justify-center p-8'>
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
          <h3 className='mt-2 text-sm font-medium text-gray-900'>No messages yet</h3>
          <p className='mt-1 text-sm text-gray-500'>Start the conversation by sending a message.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 space-y-4 overflow-y-auto px-6 py-4'>
        {messages.map(message => {
          const isFromCurrentUser = message.sender_id === currentUserId
          const isFromAgent = message.sender_type === 'agent'
          const isFromContact = message.sender_type === 'contact'
          const isSystemMessage = message.sender_type === 'system'

          // System messages
          if (isSystemMessage) {
            return (
              <div key={message.id} className='flex justify-center'>
                <div className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600'>
                  {message.content}
                </div>
              </div>
            )
          }

          // Agent/Contact messages
          return (
            <div
              key={message.id}
              className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-xs lg:max-w-md ${isFromAgent ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isFromAgent ? 'ml-2' : 'mr-2'}`}>
                  {isFromAgent ? (
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-500'>
                      <span className='text-xs font-medium text-white'>
                        {message.sender?.full_name?.charAt(0) || 'A'}
                      </span>
                    </div>
                  ) : (
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-green-500'>
                      <span className='text-xs font-medium text-white'>C</span>
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-lg px-4 py-2 ${
                    isFromAgent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Message Type Indicator */}
                  {message.message_type !== 'text' && (
                    <div className='mb-1 text-xs opacity-75'>[{message.message_type}]</div>
                  )}

                  {/* Message Content */}
                  <div className='text-sm'>{message.content}</div>

                  {/* Media */}
                  {message.media_url && (
                    <div className='mt-2'>
                      {message.message_type === 'image' && (
                        <img
                          src={message.media_url}
                          alt='Shared image'
                          className='max-w-full rounded'
                        />
                      )}
                      {(message.message_type === 'document' ||
                        message.message_type === 'audio' ||
                        message.message_type === 'video') && (
                        <a
                          href={message.media_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-xs underline opacity-75 hover:opacity-100'
                        >
                          Download {message.message_type}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-1 text-xs ${isFromAgent ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    {formatMessageTime(new Date(message.created_at))}
                    {isFromAgent && (
                      <span className='ml-1'>
                        {message.delivered_at && !message.read_at && '✓'}
                        {message.read_at && '✓✓'}
                      </span>
                    )}
                  </div>

                  {/* Message Status */}
                  {!message.is_read && isFromContact && (
                    <div className='absolute -top-1 -left-1 h-3 w-3 rounded-full bg-green-500'></div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
