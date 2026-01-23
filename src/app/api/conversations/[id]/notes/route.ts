import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const supabase = await createClient()

    // Verify conversation belongs to organization
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id, notes')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get notes from metadata or dedicated notes table if exists
    const notes = conversation.notes || []

    return createSuccessResponse({ notes })
  } catch (error) {
    console.error('Error fetching conversation notes:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
      .select('id, organization_id, notes')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Create new note
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      created_by: user.id,
      created_by_name: userOrg.full_name || user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Append to existing notes
    const updatedNotes = [...(conversation.notes || []), newNote]

    // Update conversation with new notes
    const { error } = await supabase
      .from('conversations')
      .update({ notes: updatedNotes })
      .eq('id', id)

    if (error) {
      throw error
    }

    return createSuccessResponse({ note: newNote }, 201)
  } catch (error) {
    console.error('Error creating note:', error)
    return createErrorResponse(error)
  }
}
