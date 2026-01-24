'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { QuickActionsButton } from './quick-actions-menu'
import { useToast } from '@/components/ui/toast'
import ConversationSummary from '@/components/ai/conversation-summary'
import DraftSuggestions from '@/components/ai/draft-suggestions'
import SentimentBadge from '@/components/ai/sentiment-badge'
import ProductMessageComposer from '@/components/messaging/ProductMessageComposer'
import { FileText, Sparkles } from 'lucide-react'
import type { ConversationWithDetails, MessageWithSender } from '@/types'
import type { SendProductMessageRequest, SendProductListMessageRequest, WhatsAppCatalog } from '@/types/whatsapp-catalog'

interface ChatWindowProps {
  conversation: ConversationWithDetails
  profile: {
    id: string
    full_name: string | null
    organization_id: string | null
    role: 'owner' | 'admin' | 'agent' | null
  }
  onShowDetails: () => void
  showDetails: boolean
  onConversationUpdate?: () => void
}

export function ChatWindow({
  conversation,
  profile,
  onShowDetails,
  showDetails,
  onConversationUpdate,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showDraftSuggestions, setShowDraftSuggestions] = useState(false)
  const [showProductComposer, setShowProductComposer] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [catalog, setCatalog] = useState<WhatsAppCatalog | null>(null)
  const { addToast } = useToast()

  // Check if organization has a product catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch('/api/whatsapp/catalog')
        if (response.ok) {
          const data = await response.json()
          setCatalog(data.catalog)
        }
      } catch {
        // No catalog available
      }
    }
    fetchCatalog()
  }, [])

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
    } catch {
      // Message fetch failed - will show empty state
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
      addToast({
        type: 'error',
        title: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Please try again',
      })
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

  // Handle selecting an AI-generated draft
  const handleSelectDraft = (content: string) => {
    setDraftText(content)
    setShowDraftSuggestions(false)
    addToast({
      type: 'success',
      title: 'Draft inserted',
      message: 'Edit the draft before sending',
    })
  }

  // Handle sending product messages
  const handleSendProductMessage = useCallback(async (request: SendProductMessageRequest | SendProductListMessageRequest) => {
    try {
      // Determine which endpoint to use based on request type
      const isSingleProduct = 'product_retailer_id' in request
      const endpoint = isSingleProduct
        ? '/api/whatsapp/messages/product'
        : '/api/whatsapp/messages/product-list'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send product message')
      }

      const data = await response.json()

      // Add the message to the list
      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }

      addToast({
        type: 'success',
        title: 'Product bericht verzonden',
      })

      setShowProductComposer(false)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Verzenden mislukt',
        message: error instanceof Error ? error.message : 'Probeer opnieuw',
      })
      throw error // Re-throw so the composer can handle it
    }
  }, [addToast])

  return (
    <div className='flex h-full flex-col'>
      {/* Chat Header */}
      <div className='border-b border-gray-200 bg-white px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            {/* Contact Avatar */}
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-500'>
              <span className='text-sm font-medium text-white'>
                {conversation.contact.name?.charAt(0).toUpperCase() ||
                  conversation.contact.phone_number.slice(-2).toUpperCase()}
              </span>
            </div>

            {/* Contact Info */}
            <div>
              <div className='flex items-center space-x-2'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  {conversation.contact.name || 'Unknown Contact'}
                </h2>
                {/* Sentiment Badge */}
                <SentimentBadge
                  sentiment={(conversation as any).sentiment}
                  urgency={(conversation as any).urgency}
                  compact={true}
                />
              </div>
              <div className='flex items-center space-x-2 text-sm text-gray-500'>
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
          <div className='flex items-center space-x-2'>
            {/* Status Dropdown */}
            <select
              value={conversation.status}
              className='rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
              onChange={async e => {
                const newStatus = e.target.value
                try {
                  const response = await fetch(`/api/conversations/${conversation.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                  })
                  if (response.ok) {
                    onConversationUpdate?.()
                    addToast({ type: 'success', title: `Status changed to ${newStatus}` })
                  }
                } catch {
                  addToast({ type: 'error', title: 'Failed to update status' })
                }
              }}
            >
              <option value='open'>Open</option>
              <option value='pending'>Pending</option>
              <option value='resolved'>Resolved</option>
              <option value='closed'>Closed</option>
            </select>

            {/* Assign Button */}
            <button className='rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:text-gray-900'>
              {conversation.assigned_agent
                ? `Assigned to ${conversation.assigned_agent.full_name}`
                : 'Assign'}
            </button>

            {/* AI Summary Button */}
            <button
              onClick={() => setShowSummary(true)}
              className='flex items-center space-x-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-100'
              title='Generate AI Summary'
            >
              <FileText className='h-4 w-4' />
              <span>Summary</span>
            </button>

            {/* AI Draft Suggestions Toggle */}
            <button
              onClick={() => setShowDraftSuggestions(!showDraftSuggestions)}
              className={`flex items-center space-x-1 rounded-md border px-3 py-1 text-sm ${
                showDraftSuggestions
                  ? 'border-purple-300 bg-purple-100 text-purple-700'
                  : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
              title='AI Draft Suggestions'
            >
              <Sparkles className='h-4 w-4' />
              <span>AI Drafts</span>
            </button>

            {/* Quick Actions */}
            <QuickActionsButton
              conversation={conversation}
              onActionComplete={handleActionComplete}
            />

            {/* Details Toggle */}
            <button
              onClick={onShowDetails}
              className={`rounded-md p-2 hover:bg-gray-100 ${
                showDetails ? 'bg-green-100 text-green-600' : 'text-gray-600'
              }`}
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-hidden'>
        {isLoading ? (
          <div className='flex h-full items-center justify-center'>
            <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-600'></div>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={profile.id} />
        )}
      </div>

      {/* AI Draft Suggestions Panel */}
      {showDraftSuggestions && (
        <div className='border-t border-gray-200 p-4'>
          <DraftSuggestions
            conversationId={conversation.id}
            organizationId={conversation.organization_id}
            contactName={conversation.contact.name || 'Contact'}
            onSelectDraft={handleSelectDraft}
          />
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        initialValue={draftText}
        onValueChange={setDraftText}
        hasProductCatalog={!!catalog}
        onOpenProductPicker={() => setShowProductComposer(true)}
      />

      {/* AI Conversation Summary Modal */}
      <ConversationSummary
        conversationId={conversation.id}
        organizationId={conversation.organization_id}
        contactName={conversation.contact.name || 'Contact'}
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
      />

      {/* Product Message Composer Modal */}
      {showProductComposer && catalog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='w-full max-w-2xl max-h-[90vh] m-4'>
            <ProductMessageComposer
              conversationId={conversation.id}
              catalogId={catalog.catalog_id}
              onSend={handleSendProductMessage}
              onCancel={() => setShowProductComposer(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
