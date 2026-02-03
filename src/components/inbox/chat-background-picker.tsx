'use client'

import { useState, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'

export type ChatBackground = {
  id: string
  value: string
  label: string
  textClass?: string
}

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  { id: 'default', value: '#f0f2f5', label: 'Professional Gray' },
  { id: 'whatsapp', value: 'whatsapp-doodle', label: 'WhatsApp Classic' },
  { id: 'white', value: '#ffffff', label: 'Clean White' },
  { id: 'warm', value: '#faf8f5', label: 'Warm Cream' },
  { id: 'focus', value: '#e8f4f8', label: 'Focus Blue' },
  { id: 'dark', value: '#1a1a2e', label: 'Dark Mode', textClass: 'text-white' },
]

const STORAGE_KEY = 'inbox-chat-background'

interface ChatBackgroundPickerProps {
  onBackgroundChange?: (background: ChatBackground) => void
}

export function ChatBackgroundPicker({ onBackgroundChange }: ChatBackgroundPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBackground, setSelectedBackground] = useState<ChatBackground>(CHAT_BACKGROUNDS[0])

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const found = CHAT_BACKGROUNDS.find(bg => bg.id === saved)
      if (found) {
        setSelectedBackground(found)
        onBackgroundChange?.(found)
      }
    }
  }, [onBackgroundChange])

  const handleSelect = (background: ChatBackground) => {
    setSelectedBackground(background)
    localStorage.setItem(STORAGE_KEY, background.id)
    onBackgroundChange?.(background)
    setIsOpen(false)
  }

  const getPreviewStyle = (bg: ChatBackground) => {
    if (bg.value === 'whatsapp-doodle') {
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cpattern id='pattern' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Cpath d='M0 20 Q10 10 20 20 T40 20' fill='none' stroke='%23d4e5d4' stroke-width='1'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%23d4e5d4'/%3E%3Ccircle cx='10' cy='30' r='1.5' fill='%23d4e5d4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23e5ddd5'/%3E%3Crect width='200' height='200' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
      }
    }
    return { backgroundColor: bg.value }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        title="Chat background"
        aria-label="Select chat background"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">Background</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg bg-white shadow-lg border border-gray-200 py-2">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Chat Background
              </p>
            </div>
            <div className="p-2 space-y-1">
              {CHAT_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => handleSelect(bg)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                    selectedBackground.id === bg.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {/* Color preview */}
                  <div
                    className="w-8 h-8 rounded-md border border-gray-200 flex-shrink-0"
                    style={getPreviewStyle(bg)}
                  />
                  {/* Label */}
                  <span className="flex-1 text-sm text-left">{bg.label}</span>
                  {/* Checkmark */}
                  {selectedBackground.id === bg.id && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Hook to get background style
export function useChatBackground(): { background: ChatBackground; style: React.CSSProperties } {
  const [background, setBackground] = useState<ChatBackground>(CHAT_BACKGROUNDS[0])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const found = CHAT_BACKGROUNDS.find(bg => bg.id === saved)
      if (found) {
        setBackground(found)
      }
    }
  }, [])

  const style: React.CSSProperties = background.value === 'whatsapp-doodle'
    ? {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cpattern id='pattern' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Cpath d='M0 20 Q10 10 20 20 T40 20' fill='none' stroke='%23d4e5d4' stroke-width='1'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%23d4e5d4'/%3E%3Ccircle cx='10' cy='30' r='1.5' fill='%23d4e5d4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23e5ddd5'/%3E%3Crect width='200' height='200' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
      }
    : { backgroundColor: background.value }

  return { background, style }
}

export function getBackgroundStyle(background: ChatBackground): React.CSSProperties {
  if (background.value === 'whatsapp-doodle') {
    return {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cpattern id='pattern' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Cpath d='M0 20 Q10 10 20 20 T40 20' fill='none' stroke='%23d4e5d4' stroke-width='1'/%3E%3Ccircle cx='30' cy='10' r='2' fill='%23d4e5d4'/%3E%3Ccircle cx='10' cy='30' r='1.5' fill='%23d4e5d4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%23e5ddd5'/%3E%3Crect width='200' height='200' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
    }
  }
  return { backgroundColor: background.value }
}
