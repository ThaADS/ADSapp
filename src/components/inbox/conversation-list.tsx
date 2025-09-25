import type { ConversationWithDetails } from '@/types'

// Simple time formatter
function formatTime(date: Date) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return diffMins < 1 ? 'now' : `${diffMins}m`
  }
  if (diffHours < 24) {
    return `${diffHours}h`
  }
  if (diffDays < 7) {
    return `${diffDays}d`
  }
  return date.toLocaleDateString()
}

interface ConversationListProps {
  conversations: ConversationWithDetails[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-blue-100 text-blue-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your WhatsApp to start receiving messages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedConversationId
          const hasUnread = conversation.unread_count > 0

          return (
            <div
              key={conversation.id}
              className={`
                p-4 cursor-pointer hover:bg-gray-50 transition-colors
                ${isSelected ? 'bg-green-50 border-r-2 border-green-500' : ''}
              `}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start space-x-3">
                {/* Contact Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {conversation.contact.name?.charAt(0).toUpperCase() ||
                       conversation.contact.phone_number.slice(-2).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Conversation Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium text-gray-900 truncate ${hasUnread ? 'font-semibold' : ''}`}>
                      {conversation.contact.name || conversation.contact.phone_number}
                    </p>
                    <div className="flex items-center space-x-2">
                      {hasUnread && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-600 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {conversation.last_message_at &&
                         formatTime(new Date(conversation.last_message_at))}
                      </span>
                    </div>
                  </div>

                  {/* Last Message */}
                  {conversation.last_message && (
                    <p className={`mt-1 text-sm text-gray-500 truncate ${hasUnread ? 'font-medium text-gray-700' : ''}`}>
                      {conversation.last_message.sender_type === 'agent' && (
                        <span className="text-blue-600">You: </span>
                      )}
                      {conversation.last_message.content}
                    </p>
                  )}

                  {/* Status and Assignment */}
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        conversation.status
                      )}`}
                    >
                      {conversation.status}
                    </span>

                    {conversation.assigned_agent && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {conversation.assigned_agent.full_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}