'use client'

import { useState, useRef } from 'react'

interface MessageInputProps {
  onSendMessage: (content: string, type?: string) => Promise<void>
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSendMessage(message.trim())
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const quickReplies = [
    'Thank you for contacting us!',
    'How can I help you today?',
    "I'll look into this for you.",
    'Is there anything else I can help with?',
  ]

  return (
    <div className='border-t border-gray-200 bg-white'>
      {/* Quick Replies */}
      {showTemplates && (
        <div className='border-b border-gray-100 px-6 py-2'>
          <div className='flex flex-wrap gap-2'>
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => {
                  setMessage(reply)
                  setShowTemplates(false)
                  textareaRef.current?.focus()
                }}
                className='rounded-full bg-gray-100 px-3 py-1 text-sm transition-colors hover:bg-gray-200'
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSubmit} className='px-6 py-4'>
        <div className='flex items-end space-x-3'>
          {/* Attachment Button */}
          <button
            type='button'
            className='flex-shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            title='Attach file'
          >
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
              />
            </svg>
          </button>

          {/* Templates Button */}
          <button
            type='button'
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex-shrink-0 rounded-full p-2 hover:bg-gray-100 ${
              showTemplates ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            title='Quick replies'
          >
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
              />
            </svg>
          </button>

          {/* Text Input */}
          <div className='relative flex-1'>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder='Type your message...'
              disabled={isLoading}
              className='w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50'
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          {/* Send Button */}
          <button
            type='submit'
            disabled={!message.trim() || isLoading}
            className='flex-shrink-0 rounded-full bg-green-600 p-2 text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            title='Send message (Enter)'
          >
            {isLoading ? (
              <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
            ) : (
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                />
              </svg>
            )}
          </button>
        </div>

        {/* Character count or typing indicator */}
        <div className='mt-2 flex items-center justify-between text-xs text-gray-500'>
          <div>{/* Typing indicator would go here */}</div>
          <div>Press Enter to send, Shift+Enter for new line</div>
        </div>
      </form>
    </div>
  )
}
