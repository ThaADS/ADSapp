'use client'

import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/stores/notifications'

interface NotificationBadgeProps {
  onClick?: () => void
  className?: string
}

/**
 * Notification bell icon with badge showing unread count
 * Includes ARIA attributes for screen reader accessibility
 */
export function NotificationBadge({ onClick, className = '' }: NotificationBadgeProps) {
  const unreadCount = useNotificationStore((state) => state.unreadMentionCount)
  const togglePanel = useNotificationStore((state) => state.togglePanel)

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      togglePanel()
    }
  }

  const ariaLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications, none unread'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label={ariaLabel}
    >
      <Bell className="h-5 w-5 text-gray-600" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
