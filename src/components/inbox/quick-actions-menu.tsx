'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import type { ConversationWithDetails } from '@/types'

interface QuickAction {
  id: string
  label: string
  icon: ReactNode
  onClick: (conversation: ConversationWithDetails) => void
  requireConfirm?: boolean
  confirmMessage?: string
  variant?: 'default' | 'danger'
  divider?: boolean
}

interface QuickActionsMenuProps {
  conversation: ConversationWithDetails
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  onActionComplete?: (action: string, success: boolean) => void
}

export function QuickActionsMenu({
  conversation,
  isOpen,
  onClose,
  position,
  onActionComplete,
}: QuickActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  // Handle click outside to close menu
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let { x, y } = position

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        x = viewportWidth - rect.width - 10
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        y = viewportHeight - rect.height - 10
      }

      menu.style.left = `${x}px`
      menu.style.top = `${y}px`
    }
  }, [isOpen, position])

  const handleMarkAsRead = async () => {
    try {
      const newReadStatus = !conversation.last_message?.is_read
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: newReadStatus }),
      })

      if (response.ok) {
        onActionComplete?.('mark_as_read', true)
        onClose()
      } else {
        onActionComplete?.('mark_as_read', false)
      }
    } catch (error) {
      console.error('Failed to update read status:', error)
      onActionComplete?.('mark_as_read', false)
    }
  }

  const handleAssignToMe = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assign_to_me: true }),
      })

      if (response.ok) {
        onActionComplete?.('assign_to_me', true)
        onClose()
      } else {
        onActionComplete?.('assign_to_me', false)
      }
    } catch (error) {
      console.error('Failed to assign conversation:', error)
      onActionComplete?.('assign_to_me', false)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        onActionComplete?.(`status_${status}`, true)
        onClose()
      } else {
        onActionComplete?.(`status_${status}`, false)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      onActionComplete?.(`status_${status}`, false)
    }
  }

  const handleArchive = async () => {
    await handleUpdateStatus('closed')
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onActionComplete?.('delete', true)
        onClose()
      } else {
        onActionComplete?.('delete', false)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      onActionComplete?.('delete', false)
    }
  }

  const handleBlockContact = async () => {
    try {
      const response = await fetch(`/api/contacts/${conversation.contact.id}/block`, {
        method: 'POST',
      })

      if (response.ok) {
        onActionComplete?.('block', true)
        onClose()
      } else {
        onActionComplete?.('block', false)
      }
    } catch (error) {
      console.error('Failed to block contact:', error)
      onActionComplete?.('block', false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/export`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conversation-${conversation.id}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        onActionComplete?.('export', true)
        onClose()
      } else {
        onActionComplete?.('export', false)
      }
    } catch (error) {
      console.error('Failed to export conversation:', error)
      onActionComplete?.('export', false)
    }
  }

  const actions: QuickAction[] = [
    {
      id: 'mark_read',
      label: conversation.last_message?.is_read ? 'Mark as Unread' : 'Mark as Read',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76'
          />
        </svg>
      ),
      onClick: handleMarkAsRead,
    },
    {
      id: 'assign',
      label: 'Assign to Me',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
          />
        </svg>
      ),
      onClick: handleAssignToMe,
    },
    {
      id: 'archive',
      label: 'Archive Conversation',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'
          />
        </svg>
      ),
      onClick: handleArchive,
      divider: true,
    },
    {
      id: 'block',
      label: 'Block Contact',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
          />
        </svg>
      ),
      onClick: handleBlockContact,
      requireConfirm: true,
      confirmMessage: `Block ${conversation.contact.name || conversation.contact.phone_number}? They won't be able to message you.`,
      variant: 'danger',
    },
    {
      id: 'delete',
      label: 'Delete Conversation',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
          />
        </svg>
      ),
      onClick: handleDelete,
      requireConfirm: true,
      confirmMessage: 'Delete this conversation? This action cannot be undone.',
      variant: 'danger',
    },
    {
      id: 'export',
      label: 'Export Chat',
      icon: (
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
          />
        </svg>
      ),
      onClick: handleExport,
      divider: true,
    },
  ]

  const handleActionClick = (action: QuickAction) => {
    if (action.requireConfirm) {
      setShowConfirm(action.id)
    } else {
      action.onClick(conversation)
    }
  }

  const handleConfirm = (action: QuickAction) => {
    action.onClick(conversation)
    setShowConfirm(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        ref={menuRef}
        className='fixed z-50 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg'
        style={{ left: position.x, top: position.y }}
        role='menu'
        aria-orientation='vertical'
      >
        {actions.map((action, index) => (
          <div key={action.id}>
            <button
              className={`flex w-full items-center space-x-3 px-4 py-2 text-left text-sm transition-colors ${
                action.variant === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
              } focus:bg-gray-50 focus:outline-none`}
              onClick={() => handleActionClick(action)}
              role='menuitem'
            >
              <span className={action.variant === 'danger' ? 'text-red-500' : 'text-gray-400'}>
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
            {action.divider && index < actions.length - 1 && (
              <div className='my-1 border-t border-gray-100' />
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <h3 className='mb-2 text-lg font-semibold text-gray-900'>Confirm Action</h3>
            <p className='mb-6 text-sm text-gray-600'>
              {actions.find(a => a.id === showConfirm)?.confirmMessage}
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowConfirm(null)}
                className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const action = actions.find(a => a.id === showConfirm)
                  if (action) handleConfirm(action)
                }}
                className='rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface QuickActionsButtonProps {
  conversation: ConversationWithDetails
  onActionComplete?: (action: string, success: boolean) => void
}

export function QuickActionsButton({ conversation, onActionComplete }: QuickActionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({ x: rect.right + 5, y: rect.top })
      setIsOpen(true)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className='rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
        aria-label='Quick actions'
        title='Quick actions'
      >
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z'
          />
        </svg>
      </button>

      <QuickActionsMenu
        conversation={conversation}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={position}
        onActionComplete={onActionComplete}
      />
    </>
  )
}
