'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'

interface Note {
  id: string
  content: string
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

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
  const [notes, setNotes] = useState<Note[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [conversationId])

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/notes`)
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return

    setIsLoading(true)
    try {
      if (editingNoteId) {
        // Update existing note
        await fetch(`/api/conversations/${conversationId}/notes/${editingNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent }),
        })
      } else {
        // Create new note
        await fetch(`/api/conversations/${conversationId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent }),
        })
      }

      // Reload notes
      await loadNotes()

      // Reset form
      setNoteContent('')
      setIsAddingNote(false)
      setEditingNoteId(null)
    } catch (error) {
      console.error('Failed to save note:', error)
      alert(t('notes.saveError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t('notes.deleteConfirm'))) return

    try {
      await fetch(`/api/conversations/${conversationId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert(t('notes.deleteError'))
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id)
    setNoteContent(note.content)
    setIsAddingNote(true)
  }

  const handleCancelEdit = () => {
    setNoteContent('')
    setIsAddingNote(false)
    setEditingNoteId(null)
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

      {/* Add/Edit Note Form */}
      {isAddingNote && (
        <div className='border-b bg-gray-50 p-4'>
          <textarea
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
            placeholder={t('notes.placeholder')}
            className='w-full resize-none rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500'
            rows={3}
            autoFocus
          />
          <div className='mt-2 flex gap-2'>
            <button
              type='button'
              onClick={handleSaveNote}
              disabled={isLoading || !noteContent.trim()}
              className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300'
            >
              <Save className='h-4 w-4' />
              {isLoading ? t('notes.saving') : editingNoteId ? t('notes.update') : t('notes.save')}
            </button>
            <button
              type='button'
              onClick={handleCancelEdit}
              className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100'
              title={t('actions.cancel')}
            >
              <X className='h-4 w-4' />
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
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1'>
                    <p className='text-sm whitespace-pre-wrap text-gray-800'>{note.content}</p>
                    <div className='mt-2 flex items-center gap-2 text-xs text-gray-500'>
                      <span>{note.created_by_name}</span>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
