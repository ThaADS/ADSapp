// @ts-nocheck - Database types need regeneration
'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, Save, X } from 'lucide-react'

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
  currentUserId
}: ConversationNotesProps) {
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
          body: JSON.stringify({ content: noteContent })
        })
      } else {
        // Create new note
        await fetch(`/api/conversations/${conversationId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent })
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
      alert('Fout bij opslaan notitie')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return

    try {
      await fetch(`/api/conversations/${conversationId}/notes/${noteId}`, {
        method: 'DELETE'
      })
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Fout bij verwijderen notitie')
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
    <div className="bg-white border-t">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Notities
        </h3>
        {!isAddingNote && (
          <button
            onClick={() => setIsAddingNote(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Toevoegen
          </button>
        )}
      </div>

      {/* Add/Edit Note Form */}
      {isAddingNote && (
        <div className="p-4 bg-gray-50 border-b">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Schrijf een notitie..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSaveNote}
              disabled={isLoading || !noteContent.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Opslaan...' : editingNoteId ? 'Bijwerken' : 'Opslaan'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nog geen notities</p>
            <p className="text-sm">Voeg een notitie toe om belangrijke informatie vast te leggen</p>
          </div>
        ) : (
          <div className="divide-y">
            {notes.map((note) => (
              <div key={note.id} className="p-4 hover:bg-gray-50 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>{note.created_by_name}</span>
                      <span>•</span>
                      <span>{new Date(note.created_at).toLocaleString('nl-NL')}</span>
                      {note.updated_at !== note.created_at && (
                        <>
                          <span>•</span>
                          <span className="italic">bewerkt</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Bewerken"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
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
