'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { QuickActionsButton } from './quick-actions-menu'
import { useToast } from '@/components/ui/toast'
import type { ConversationWithDetails, MessageWithSender } from '@/types'

interface ChatWindowProps {
  conversation: ConversationWithDetails
  profile: any
  onShowDetails: () => void
  showDetails: boolean
  onConversationUpdate?: () => void
}

export function ChatWindow({ conversation, profile, onShowDetails, showDetails, onConversationUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  // Fetch messages for the conversation
  useEffect(() => {
    if (conversation.id) {
      fetchMessages()
    }
  }, [conversation.id])

  const fetchMessages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (content: string, type = 'text') => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, type }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO: Show error toast
    }
  }

  const handleActionComplete = (action: string, success: boolean) => {
    if (success) {
      const messages: Record<string, string> = {
        mark_as_read: 'Conversation marked as read',
        assign_to_me: 'Conversation assigned to you',
        status_closed: 'Conversation archived',
        delete: 'Conversation deleted',
        block: 'Contact blocked successfully',
        export: 'Conversation exported successfully',
      }

      addToast({
        type: 'success',
        title: messages[action] || 'Action completed',
      })

      // Trigger refresh
      onConversationUpdate?.()
    } else {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: 'Please try again',
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Contact Avatar */}
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {conversation.contact.name?.charAt(0).toUpperCase() ||
                 conversation.contact.phone_number.slice(-2).toUpperCase()}
              </span>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {conversation.contact.name || 'Unknown Contact'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{conversation.contact.phone_number}</span>
                {conversation.priority !== 'medium' && (
                  <>
                    <span>•</span>
                    <span className={`font-medium ${getPriorityColor(conversation.priority)}`}>
                      {conversation.priority} priority
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Status Dropdown */}
            <select
              value={conversation.status}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              onChange={(e) => {
                // TODO: Update conversation status
                console.log('Status changed to:', e.target.value)
              }}
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Assign Button */}
            <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md">
              {conversation.assigned_agent
                ? `Assigned to ${conversation.assigned_agent.full_name}`
                : 'Assign'
              }
            </button>

            {/* Quick Actions */}
            <QuickActionsButton
              conversation={conversation}
              onActionComplete={handleActionComplete}
            />

            {/* Details Toggle */}
            <button
              onClick={onShowDetails}
              className={`p-2 rounded-md hover:bg-gray-100 ${
                showDetails ? 'bg-green-100 text-green-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={profile.id} />
        )}
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}