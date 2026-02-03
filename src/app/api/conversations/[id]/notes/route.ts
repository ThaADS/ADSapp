import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import {
  extractMentionIds,
  stripHtml,
  sanitizeNoteHtml,
} from '@/lib/mentions/parser'
import type { ConversationNote, CreateNoteResponse } from '@/types/mentions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/[id]/notes
 * Fetch all notes for a conversation from the conversation_notes table
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Verify conversation belongs to organization
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Fetch notes from conversation_notes table with creator profile
    const { data: notes, error: notesError } = await supabase
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
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
      throw notesError
    }

    return createSuccessResponse({ notes: notes || [] })
  } catch (error) {
    console.error('Error fetching conversation notes:', error)
    return createErrorResponse(error)
  }
}

/**
 * POST /api/conversations/[id]/notes
 * Create a new note with @mention support
 * Extracts mentions from HTML content and creates mention records
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify conversation belongs to organization
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Parse and sanitize content
    const sanitizedContent = sanitizeNoteHtml(content)
    const plainText = stripHtml(sanitizedContent)
    const mentionedUserIds = extractMentionIds(sanitizedContent)

    // Insert note into conversation_notes table
    const { data: note, error: noteError } = await supabase
      .from('conversation_notes')
      .insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        content: sanitizedContent,
        content_plain: plainText,
        created_by: user.id,
      })
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

    if (noteError) {
      console.error('Error creating note:', noteError)
      throw noteError
    }

    // Create mention records (skip self-mentions)
    let mentionsCreated = 0
    const mentionErrors: string[] = []

    for (const mentionedUserId of mentionedUserIds) {
      // Skip self-mention
      if (mentionedUserId === user.id) {
        continue
      }

      // Verify mentioned user is in the same organization
      const { data: mentionedUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', mentionedUserId)
        .eq('organization_id', organizationId)
        .single()

      if (!mentionedUser) {
        mentionErrors.push(`User ${mentionedUserId} not found in organization`)
        continue
      }

      // Create mention record
      const { error: mentionError } = await supabase
        .from('mentions')
        .insert({
          note_id: note.id,
          conversation_id: conversationId,
          organization_id: organizationId,
          mentioned_user_id: mentionedUserId,
          mentioning_user_id: user.id,
        })

      if (mentionError) {
        console.error('Error creating mention:', mentionError)
        mentionErrors.push(`Failed to create mention for ${mentionedUserId}`)
      } else {
        mentionsCreated++
      }
    }

    const response: CreateNoteResponse = {
      note: note as ConversationNote,
      mentions_created: mentionsCreated,
    }

    return createSuccessResponse(response, 201)
  } catch (error) {
    console.error('Error creating note:', error)
    return createErrorResponse(error)
  }
}
