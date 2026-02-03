/**
 * Mention parsing utilities for extracting @mentions from Tiptap HTML
 *
 * Tiptap mentions are formatted as:
 * <span data-type="mention" data-id="user-id" data-label="Name">@Name</span>
 */

import { JSDOM } from 'jsdom'

/**
 * Extract unique user IDs from Tiptap mention HTML
 * @param html - HTML content from Tiptap editor
 * @returns Array of unique user IDs that were mentioned
 */
export function extractMentionIds(html: string): string[] {
  if (!html || typeof html !== 'string') {
    return []
  }

  const dom = new JSDOM(html)
  const doc = dom.window.document
  const mentions = doc.querySelectorAll('span[data-type="mention"][data-id]')

  const ids = new Set<string>()
  mentions.forEach((el) => {
    const id = el.getAttribute('data-id')
    if (id && id.trim()) {
      ids.add(id.trim())
    }
  })

  return Array.from(ids)
}

/**
 * Strip HTML tags and return plain text
 * Preserves mention names (without @) and normal text content
 * @param html - HTML content
 * @returns Plain text content
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  const dom = new JSDOM(html)
  const text = dom.window.document.body.textContent || ''

  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Sanitize HTML content for safe storage
 * Removes potentially dangerous elements and attributes
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  const dom = new JSDOM(html)
  const doc = dom.window.document

  // Remove script tags
  doc.querySelectorAll('script').forEach(el => el.remove())

  // Remove style tags (inline CSS is OK)
  doc.querySelectorAll('style').forEach(el => el.remove())

  // Remove iframe, embed, object tags
  doc.querySelectorAll('iframe, embed, object, form, input, button').forEach(el => el.remove())

  // Remove event handler attributes from all elements
  const allElements = doc.querySelectorAll('*')
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      // Remove on* event handlers
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name)
      }
      // Remove javascript: URLs
      if (attr.value && attr.value.toLowerCase().includes('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}

/**
 * Extract mentions with their labels (for display purposes)
 * @param html - HTML content from Tiptap editor
 * @returns Array of objects with id and label
 */
export function extractMentionsWithLabels(html: string): Array<{ id: string; label: string }> {
  if (!html || typeof html !== 'string') {
    return []
  }

  const dom = new JSDOM(html)
  const doc = dom.window.document
  const mentions = doc.querySelectorAll('span[data-type="mention"][data-id]')

  const result: Array<{ id: string; label: string }> = []
  const seenIds = new Set<string>()

  mentions.forEach((el) => {
    const id = el.getAttribute('data-id')
    const label = el.getAttribute('data-label') || el.textContent?.replace('@', '') || ''

    if (id && !seenIds.has(id)) {
      seenIds.add(id)
      result.push({ id: id.trim(), label: label.trim() })
    }
  })

  return result
}

/**
 * Check if content contains any mentions
 * @param html - HTML content
 * @returns true if content has at least one mention
 */
export function hasMentions(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false
  }

  return html.includes('data-type="mention"') && html.includes('data-id=')
}

/**
 * Truncate text while preserving word boundaries
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) {
    return text || ''
  }

  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}
