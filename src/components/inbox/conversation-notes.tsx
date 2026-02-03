'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'
import { MentionEditor } from './mention-editor'
import { MentionRenderer } from './mention-renderer'
import { UserProfileSidebar } from '@/components/profile/user-profile-sidebar'
import type { ConversationNote } from '@/types/mentions'

interface ConversationNotesProps {
  conversationId: string
  organizationId: string
  currentUserId: string
}

export default function ConversationNotes({
  conversationId,
  organizationId,
  currentUserId,
}: ConversationNotesProps) {
  const t = useTranslations('inbox')
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [conversationId])

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes`)
      const data = await response.json()

      // Transform API response to match ConversationNote interface
      const transformedNotes: ConversationNote[] = (data.data?.notes || data.notes || []).map(
        (note: any) => ({
          id: note.id,
          conversation_id: note.conversation_id,
          organization_id: note.organization_id,
          content: note.content,
          content_plain: note.content_plain || note.content,
          created_by: note.created_by,
          created_at: note.created_at,
          updated_at: note.updated_at,
          profiles: note.profiles,
        })
      )

      setNotes(transformedNotes)
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const handleSaveNewNote = async (html: string, plainText: string) => {
    if (!html.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html }),
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      // Reload notes
      await loadNotes()

      // Reset form
      setIsAddingNote(false)
    } catch (error) {
      console.error('Failed to save note:', error)
      alert(t('notes.saveError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to update note')
      }

      // Reload notes
      await loadNotes()

      // Reset edit state
      setEditingNoteId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to update note:', error)
      alert(t('notes.saveError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t('notes.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert(t('notes.deleteError'))
    }
  }

  const handleEditNote = (note: ConversationNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditContent('')
    setEditingNoteId(null)
  }

  const handleCancelAdd = () => {
    setIsAddingNote(false)
  }

  const getAuthorName = (note: ConversationNote): string => {
    if (note.profiles?.full_name) {
      return note.profiles.full_name
    }
    return 'Unknown'
  }

  return (
    <div className='border-t bg-white'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <h3 className='flex items-center gap-2 font-semibold'>
          <FileText className='h-5 w-5 text-gray-600' />
          {t('notes.title')}
        </h3>
        {!isAddingNote && (
          <button
            type='button'
            onClick={() => setIsAddingNote(true)}
            className='flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700'
          >
            <Plus className='h-4 w-4' />
            {t('notes.add')}
          </button>
        )}
      </div>

      {/* Add Note Form with MentionEditor */}
      {isAddingNote && (
        <div className='border-b bg-gray-50 p-4'>
          <MentionEditor
            onSubmit={handleSaveNewNote}
            placeholder={t('notes.mentionPlaceholder') || 'Write a note... Use @ to mention team members'}
            disabled={isLoading}
            autoFocus
          />
          <div className='mt-2 flex justify-end'>
            <button
              type='button'
              onClick={handleCancelAdd}
              className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100'
            >
              {t('actions.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className='max-h-96 overflow-y-auto'>
        {notes.length === 0 ? (
          <div className='p-8 text-center text-gray-500'>
            <FileText className='mx-auto mb-2 h-12 w-12 text-gray-300' />
            <p>{t('notes.empty')}</p>
            <p className='text-sm'>{t('notes.emptyDescription')}</p>
          </div>
        ) : (
          <div className='divide-y'>
            {notes.map(note => (
              <div key={note.id} className='group p-4 hover:bg-gray-50'>
                {editingNoteId === note.id ? (
                  // Edit mode
                  <div className='space-y-3'>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className='w-full resize-none rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500'
                      rows={3}
                      autoFocus
                      aria-label={t('notes.editNote')}
                      placeholder={t('notes.mentionPlaceholder') || 'Edit note...'}
                    />
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={isLoading || !editContent.trim()}
                        className='flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300'
                      >
                        <Save className='h-4 w-4' />
                        {isLoading ? t('notes.saving') : t('notes.update')}
                      </button>
                      <button
                        type='button'
                        onClick={handleCancelEdit}
                        className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100'
                        title={t('actions.cancel')}
                        aria-label={t('actions.cancel')}
                      >
                        <X className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      {/* Note content with clickable mentions */}
                      <MentionRenderer
                        html={note.content}
                        onMentionClick={(userId) => setSelectedUserId(userId)}
                        className='text-sm text-gray-800'
                      />
                      <div className='mt-2 flex items-center gap-2 text-xs text-gray-500'>
                        <span>{getAuthorName(note)}</span>
                        <span>•</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                        {note.updated_at !== note.created_at && (
                          <>
                            <span>•</span>
                            <span className='italic'>{t('notes.edited')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {note.created_by === currentUserId && (
                      <div className='flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                        <button
                          type='button'
                          onClick={() => handleEditNote(note)}
                          className='rounded p-1 hover:bg-gray-200'
                          title={t('notes.edit')}
                        >
                          <Edit className='h-4 w-4 text-gray-600' />
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeleteNote(note.id)}
                          className='rounded p-1 hover:bg-red-100'
                          title={t('notes.delete')}
                        >
                          <Trash2 className='h-4 w-4 text-red-600' />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Sidebar (opens when clicking a mention) */}
      <UserProfileSidebar
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}
