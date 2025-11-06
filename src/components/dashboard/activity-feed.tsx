// Simple time formatter
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

interface Message {
  id: string
  content: string
  sender_type: string
  created_at: string
  conversation: {
    id: string
    contact: {
      name?: string
      phone_number: string
    }
  }
}

interface ActivityFeedProps {
  messages: Message[]
}

export function ActivityFeed({ messages }: ActivityFeedProps) {
  const getActivityIcon = (senderType: string) => {
    if (senderType === 'contact') {
      return (
        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100'>
          <svg
            className='h-4 w-4 text-emerald-600'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
            />
          </svg>
        </div>
      )
    }

    return (
      <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100'>
        <svg
          className='h-4 w-4 text-blue-600'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
          />
        </svg>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className='p-6 text-center'>
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
            d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <h3 className='mt-2 text-sm font-medium text-gray-900'>No recent activity</h3>
        <p className='mt-1 text-sm text-gray-500'>Recent messages will appear here.</p>
      </div>
    )
  }

  return (
    <div className='flow-root'>
      <ul role='list' className='-mb-8'>
        {messages.map((message, messageIdx) => (
          <li key={message.id}>
            <div className='relative pb-8'>
              {messageIdx !== messages.length - 1 ? (
                <span
                  className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200'
                  aria-hidden='true'
                />
              ) : null}
              <div className='relative flex space-x-3 px-6'>
                <div>{getActivityIcon(message.sender_type)}</div>
                <div className='flex min-w-0 flex-1 justify-between space-x-4 pt-1.5'>
                  <div>
                    <p className='text-sm text-gray-500'>
                      {message.sender_type === 'contact' ? 'New message from' : 'Agent replied to'}{' '}
                      <span className='font-medium text-gray-900'>
                        {message.conversation.contact.name ||
                          message.conversation.contact.phone_number}
                      </span>
                    </p>
                    <p className='mt-1 line-clamp-2 text-sm text-gray-600'>{message.content}</p>
                  </div>
                  <div className='text-right text-sm whitespace-nowrap text-gray-500'>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
