import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id, notes')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Update note
    const updatedNotes = (conversation.notes || []).map((note: any) =>
      note.id === noteId
        ? { ...note, content: content.trim(), updated_at: new Date().toISOString() }
        : note
    )

    // Save updated notes
    const { error } = await supabase
      .from('conversations')
      .update({ notes: updatedNotes })
      .eq('id', id)

    if (error) {
      throw error
    }

    const updatedNote = updatedNotes.find((n: any) => n.id === noteId)

    return createSuccessResponse({ note: updatedNote })
  } catch (error) {
    console.error('Error updating note:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id, notes')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Remove note
    const updatedNotes = (conversation.notes || []).filter((note: any) => note.id !== noteId)

    // Save updated notes
    const { error } = await supabase
      .from('conversations')
      .update({ notes: updatedNotes })
      .eq('id', id)

    if (error) {
      throw error
    }

    return createSuccessResponse({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return createErrorResponse(error)
  }
}
