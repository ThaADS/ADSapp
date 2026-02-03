'use client'

import { useCallback } from 'react'
import DOMPurify from 'dompurify'

interface MentionRendererProps {
  html: string
  onMentionClick?: (userId: string) => void
  className?: string
}

/**
 * Renders note HTML content with clickable mention links
 * Sanitizes HTML and handles click events on mentions
 */
export function MentionRenderer({ html, onMentionClick, className = '' }: MentionRendererProps) {
  // Sanitize HTML to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'data-type', 'data-id', 'data-label', 'href'],
  })

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if clicked element or its parent is a mention
      const mentionElement = target.closest('[data-type="mention"]') as HTMLElement | null

      if (mentionElement) {
        const userId = mentionElement.getAttribute('data-id')
        if (userId && onMentionClick) {
          e.preventDefault()
          e.stopPropagation()
          onMentionClick(userId)
        }
      }
    },
    [onMentionClick]
  )

  return (
    <>
      <div
        className={`note-content prose prose-sm max-w-none ${className}`}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />

      {/* Mention styling */}
      <style jsx global>{`
        .note-content .mention,
        .note-content [data-type="mention"] {
          background-color: #e0f2fe;
          color: #0369a1;
          border-radius: 4px;
          padding: 2px 4px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline;
        }
        .note-content .mention:hover,
        .note-content [data-type="mention"]:hover {
          background-color: #bae6fd;
          text-decoration: underline;
        }
      `}</style>
    </>
  )
}

export default MentionRenderer
