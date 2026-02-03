import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import {
  stripHtml,
  sanitizeNoteHtml,
} from '@/lib/mentions/parser'
import type { ConversationNote } from '@/types/mentions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/[id]/notes/[noteId]
 * Fetch a single note by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: conversationId, noteId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Fetch note with creator profile
    const { data: note, error: noteError } = await supabase
      .from('conversation_notes')
      .select(`
        id,
        conversation_id,
        organization_id,
        content,
        content_plain,
        created_by,
        created_at,
        updated_at,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .eq('id', noteId)
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return createSuccessResponse({ note })
  } catch (error) {
    console.error('Error fetching note:', error)
    return createErrorResponse(error)
  }
}

/**
 * PUT /api/conversations/[id]/notes/[noteId]
 * Update a note's content (only creator can update)
 * Note: Mentions are not updated - they are immutable once created
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: conversationId, noteId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify note exists and user is the creator
    const { data: existingNote } = await supabase
      .from('conversation_notes')
      .select('id, created_by')
      .eq('id', noteId)
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 })
    }

    // Parse and sanitize content
    const sanitizedContent = sanitizeNoteHtml(content)
    const plainText = stripHtml(sanitizedContent)

    // Update note
    const { data: updatedNote, error: updateError } = await supabase
      .from('conversation_notes')
      .update({
        content: sanitizedContent,
        content_plain: plainText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select(`
        id,
        conversation_id,
        organization_id,
        content,
        content_plain,
        created_by,
        created_at,
        updated_at,
        profiles:created_by (
          full_name,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating note:', updateError)
      throw updateError
    }

    return createSuccessResponse({ note: updatedNote as ConversationNote })
  } catch (error) {
    console.error('Error updating note:', error)
    return createErrorResponse(error)
  }
}

/**
 * DELETE /api/conversations/[id]/notes/[noteId]
 * Delete a note (only creator can delete)
 * Associated mention records are cascade-deleted automatically
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: conversationId, noteId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Verify note exists and user is the creator
    const { data: existingNote } = await supabase
      .from('conversation_notes')
      .select('id, created_by')
      .eq('id', noteId)
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 })
    }

    // Delete note (mentions are cascade-deleted via FK constraint)
    const { error: deleteError } = await supabase
      .from('conversation_notes')
      .delete()
      .eq('id', noteId)

    if (deleteError) {
      console.error('Error deleting note:', deleteError)
      throw deleteError
    }

    return createSuccessResponse({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return createErrorResponse(error)
  }
}
