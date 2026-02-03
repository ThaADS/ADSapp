'use client'

import { useEffect, useRef } from 'react'
import { X, Bell, Check, ExternalLink } from 'lucide-react'
import { useNotificationStore } from '@/stores/notifications'
import { useRouter } from 'next/navigation'
import type { MentionNotification } from '@/types/mentions'

interface NotificationPanelProps {
  onClose?: () => void
}

/**
 * Notification panel showing recent mentions
 * Includes mark as read functionality and navigation to conversations
 */
export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const {
    mentions,
    unreadMentionCount,
    isPanelOpen,
    setPanel,
    markMentionViewed,
    markAllMentionsViewed,
  } = useNotificationStore()

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanel(false)
        onClose?.()
      }
    }

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPanelOpen, setPanel, onClose])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPanelOpen) {
        setPanel(false)
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isPanelOpen, setPanel, onClose])

  const handleMarkAsRead = async (mention: MentionNotification) => {
    if (mention.viewed) return

    try {
      const response = await fetch(`/api/mentions/${mention.id}/viewed`, {
        method: 'POST',
      })

      if (response.ok) {
        markMentionViewed(mention.id)
      }
    } catch (error) {
      console.error('Failed to mark mention as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/mentions', {
        method: 'POST',
      })

      if (response.ok) {
        markAllMentionsViewed()
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleNavigate = (mention: MentionNotification) => {
    handleMarkAsRead(mention)
    router.push(`/dashboard/inbox?conversation=${mention.conversation_id}`)
    setPanel(false)
    onClose?.()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!isPanelOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Notifications</h2>
          {unreadMentionCount > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadMentionCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadMentionCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPanel(false)
              onClose?.()
            }}
            className="p-1 hover:bg-gray-100 rounded-lg"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="overflow-y-auto flex-1">
        {mentions.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">
              You'll see @mentions from your team here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {mentions.map((mention) => (
              <li key={mention.id}>
                <button
                  type="button"
                  onClick={() => handleNavigate(mention)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !mention.viewed ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {mention.mentioning_user.avatar_url ? (
                      <img
                        src={mention.mentioning_user.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {(mention.mentioning_user.full_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {mention.title}
                        </p>
                        {!mention.viewed && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                        {mention.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTime(mention.created_at)}
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>

                    {/* Mark as read button */}
                    {!mention.viewed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(mention)
                        }}
                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
