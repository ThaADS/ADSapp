'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { MentionSuggestion } from '@/types/mentions'

export interface MentionListProps {
  items: MentionSuggestion[]
  command: (item: MentionSuggestion) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

/**
 * Accessible mention suggestion dropdown
 * Implements WAI-ARIA listbox pattern for keyboard navigation
 */
export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    // Expose keyboard handler to parent
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) =>
            prev === 0 ? items.length - 1 : prev - 1
          )
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) =>
            prev === items.length - 1 ? 0 : prev + 1
          )
          return true
        }

        if (event.key === 'Enter') {
          if (items[selectedIndex]) {
            command(items[selectedIndex])
          }
          return true
        }

        if (event.key === 'Escape') {
          return true
        }

        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm text-gray-500"
          role="status"
          aria-live="polite"
        >
          No team members found
        </div>
      )
    }

    return (
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
        role="listbox"
        aria-label="Team member suggestions"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => command(item)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-emerald-50 text-emerald-900'
                : 'hover:bg-gray-50 text-gray-900'
            }`}
            role="option"
            aria-selected={index === selectedIndex}
          >
            {/* Avatar */}
            {item.avatar_url ? (
              <img
                src={item.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-white">
                  {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name and role */}
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {item.full_name || item.email}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {item.role}
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
