'use client'

import { useRouter } from 'next/navigation'
import { useDemo } from '@/contexts/demo-context'

export function QuickActions() {
  const router = useRouter()
  const { state } = useDemo()

  const actions = [
    {
      name: 'New Conversation',
      description: 'Start a new WhatsApp conversation',
      icon: (
        <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='h-8 w-8'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          />
        </svg>
      ),
      color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600',
      onClick: () => {
        // Navigate to inbox where users can start conversations
        if (state.isActive) {
          router.push('/demo/inbox')
        } else {
          router.push('/dashboard/inbox')
        }
      },
    },
    {
      name: 'Add Contact',
      description: 'Add a new contact to your list',
      icon: (
        <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='h-8 w-8'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z'
          />
        </svg>
      ),
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
      onClick: () => {
        router.push('/dashboard/contacts')
      },
    },
    {
      name: 'Create Template',
      description: 'Create a new message template',
      icon: (
        <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='h-8 w-8'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
      ),
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
      onClick: () => {
        router.push('/dashboard/templates')
      },
    },
    {
      name: 'Setup Automation',
      description: 'Configure automatic responses',
      icon: (
        <svg fill='none' stroke='currentColor' viewBox='0 0 24 24' className='h-8 w-8'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-600',
      onClick: () => {
        router.push('/dashboard/automation')
      },
    },
  ]

  return (
    <div className='rounded-lg bg-white shadow-sm'>
      <div className='border-b border-gray-200 px-6 py-4'>
        <h3 className='text-lg leading-6 font-medium text-gray-900'>Quick Actions</h3>
      </div>
      <div className='p-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {actions.map(action => (
            <button
              key={action.name}
              onClick={action.onClick}
              className={`flex flex-col items-center rounded-lg p-4 text-center transition-colors ${action.color}`}
            >
              <div className='mb-2'>{action.icon}</div>
              <span className='text-sm font-medium text-gray-900'>{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
