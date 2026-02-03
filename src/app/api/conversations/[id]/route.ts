import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam, isValidUUID } from '@/lib/validation'
import { z } from 'zod'

// Zod schema for PATCH request body
const updateConversationSchema = z.object({
  is_read: z.boolean().optional(),
  assign_to_me: z.boolean().optional(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
}).strict()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate UUID parameter
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get conversation with details
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        contact:contacts(*),
        assigned_agent:profiles(*)
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching conversation:', error)
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate UUID parameter
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    let body: z.infer<typeof updateConversationSchema>
    try {
      const rawBody = await request.json()
      const result = updateConversationSchema.safeParse(rawBody)
      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Invalid request body',
            code: 'VALIDATION_ERROR',
            details: result.error.flatten(),
          },
          { status: 400 }
        )
      }
      body = result.data
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    // Handle different update types
    if ('is_read' in body) {
      // Update read status
      updates.last_message_at = new Date().toISOString()
    }

    if ('assign_to_me' in body && body.assign_to_me) {
      updates.assigned_to = user.id
    }

    if ('status' in body) {
      updates.status = body.status
    }

    if ('priority' in body) {
      updates.priority = body.priority
    }

    // Update the conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select(
        `
        *,
        contact:contacts(*),
        assigned_agent:profiles(*)
      `
      )
      .single()

    if (error) {
      console.error('Error updating conversation:', error)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    // If updating read status, also update messages
    if ('is_read' in body) {
      await supabase
        .from('messages')
        .update({
          is_read: body.is_read,
          read_at: body.is_read ? new Date().toISOString() : null,
        })
        .eq('conversation_id', id)
        .eq('sender_type', 'contact')
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in PATCH /api/conversations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID parameter
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format', code: 'INVALID_UUID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Soft delete by updating status to closed
    const { error } = await supabase
      .from('conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('Error deleting conversation:', error)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/conversations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
