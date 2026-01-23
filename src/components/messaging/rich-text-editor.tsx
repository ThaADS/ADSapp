'use client'

/**
 * Rich Text Editor Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback, useRef } from 'react'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Typ hier je bericht...',
  maxLength,
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  const [localValue, setLocalValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((newValue: string) => {
    if (maxLength && newValue.length > maxLength) return
    setLocalValue(newValue)
    onChange?.(newValue)
  }, [maxLength, onChange])

  const insertFormatting = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = localValue.substring(start, end)
    const newValue =
      localValue.substring(0, start) +
      before +
      selectedText +
      after +
      localValue.substring(end)

    handleChange(newValue)

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = start + before.length
      textarea.selectionEnd = end + before.length
      textarea.focus()
    }, 0)
  }, [localValue, handleChange])

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const newValue =
      localValue.substring(0, start) + emoji + localValue.substring(start)

    handleChange(newValue)

    setTimeout(() => {
      textarea.selectionStart = start + emoji.length
      textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }, [localValue, handleChange])

  const quickEmojis = ['😊', '👍', '❤️', '🎉', '✅', '📱', '💬', '🔔']

  return (
    <div className={`rounded-lg border bg-white ${disabled ? 'opacity-50' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b p-2 bg-gray-50 rounded-t-lg flex-wrap">
        <button
          type="button"
          onClick={() => insertFormatting('*', '*')}
          disabled={disabled}
          className="p-2 hover:bg-gray-200 rounded font-bold transition-colors"
          title="Vetgedrukt"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('_', '_')}
          disabled={disabled}
          className="p-2 hover:bg-gray-200 rounded italic transition-colors"
          title="Cursief"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('~', '~')}
          disabled={disabled}
          className="p-2 hover:bg-gray-200 rounded line-through transition-colors"
          title="Doorgestreept"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('```\n', '\n```')}
          disabled={disabled}
          className="p-2 hover:bg-gray-200 rounded font-mono text-sm transition-colors"
          title="Code blok"
        >
          {'</>'}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Quick Emojis */}
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => insertEmoji(emoji)}
            disabled={disabled}
            className="p-1 hover:bg-gray-200 rounded text-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-4 min-h-[150px] resize-y border-none focus:ring-0 focus:outline-none rounded-b-lg"
        style={{ fontFamily: 'inherit' }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-sm text-gray-500 rounded-b-lg">
        <span>
          WhatsApp formatting: *vet* _cursief_ ~doorgestreept~ ```code```
        </span>
        {maxLength && (
          <span className={localValue.length > maxLength * 0.9 ? 'text-orange-500' : ''}>
            {localValue.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

export default RichTextEditor
