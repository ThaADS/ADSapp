import Link from 'next/link'

// Simple time formatter until we install date-fns
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m${options?.addSuffix ? ' ago' : ''}`
  if (diffHours < 24) return `${diffHours}h${options?.addSuffix ? ' ago' : ''}`
  if (diffDays < 30) return `${diffDays}d${options?.addSuffix ? ' ago' : ''}`
  return date.toLocaleDateString()
}

interface Conversation {
  id: string
  status: string
  subject?: string
  updated_at: string
  contact: {
    id: string
    name?: string
    phone_number: string
  }
  last_message?: {
    content: string
    created_at: string
    sender_type: string
  }
}

interface RecentConversationsProps {
  conversations: Conversation[]
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
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
      <div className="p-6 text-center">
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
          Start by connecting your WhatsApp Business account.
        </p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-my-5 divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <li key={conversation.id} className="py-4 px-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {conversation.contact.name?.charAt(0).toUpperCase() ||
                     conversation.contact.phone_number.charAt(-2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conversation.contact.name || conversation.contact.phone_number}
                </p>
                {conversation.last_message && (
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.last_message.content}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    conversation.status
                  )}`}
                >
                  {conversation.status}
                </span>
                <Link
                  href={`/dashboard/conversations/${conversation.id}`}
                  className="text-green-600 hover:text-green-900 text-sm font-medium"
                >
                  View
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-6 py-3 border-t border-gray-200">
        <Link
          href="/dashboard/conversations"
          className="text-sm font-medium text-green-600 hover:text-green-500"
        >
          View all conversations →
        </Link>
      </div>
    </div>
  )
}