'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { suggestion } from './mention-suggestion'
import { useCallback, useEffect, useRef } from 'react'

interface MentionEditorProps {
  onSubmit: (html: string, plainText: string) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  minHeight?: string
}

/**
 * Rich text editor with @mention support
 * Uses Tiptap with the Mention extension for team member autocomplete
 */
export function MentionEditor({
  onSubmit,
  placeholder = 'Add a note... Use @ to mention team members',
  disabled = false,
  autoFocus = false,
  minHeight = '80px',
}: MentionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable features not needed for notes
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
          'data-type': 'mention',
        },
        suggestion,
        renderText({ node }) {
          return `@${node.attrs.label}`
        },
        renderHTML({ options, node }) {
          return [
            'span',
            {
              class: options.HTMLAttributes?.class || 'mention',
              'data-type': 'mention',
              'data-id': node.attrs.id,
              'data-label': node.attrs.label,
            },
            `@${node.attrs.label}`,
          ]
        },
      }),
    ],
    immediatelyRender: false, // Required for Next.js SSR compatibility
    content: '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none px-3 py-2 w-full`,
        style: `min-height: ${minHeight}`,
        'aria-label': 'Note editor with @mention support',
        'aria-placeholder': placeholder,
      },
    },
  })

  // Update editable state when disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus('end')
    }
  }, [autoFocus, editor])

  const handleSubmit = useCallback(() => {
    if (!editor || disabled) return

    const text = editor.getText().trim()
    if (!text) return

    const html = editor.getHTML()
    const plainText = editor.getText()

    onSubmit(html, plainText)
    editor.commands.clearContent()
  }, [editor, disabled, onSubmit])

  // Handle Ctrl+Enter or Cmd+Enter to submit
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleSubmit()
      }
    }

    const element = editorRef.current
    element?.addEventListener('keydown', handleKeyDown)

    return () => {
      element?.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, handleSubmit])

  if (!editor) {
    return (
      <div
        className="bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 animate-pulse"
        style={{ minHeight }}
      >
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  return (
    <div
      ref={editorRef}
      className={`mention-editor bg-white rounded-lg border ${
        disabled ? 'border-gray-100 bg-gray-50' : 'border-gray-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
      }`}
    >
      <EditorContent editor={editor} />

      {/* Submit hint */}
      {!disabled && (
        <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Ctrl</kbd>+
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> to submit
        </div>
      )}

      {/* Mention styling */}
      <style jsx global>{`
        .mention {
          background-color: #e0f2fe;
          color: #0369a1;
          border-radius: 4px;
          padding: 2px 4px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }
        .mention:hover {
          background-color: #bae6fd;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
}

export default MentionEditor
