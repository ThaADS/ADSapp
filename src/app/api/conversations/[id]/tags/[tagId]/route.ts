import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Remove tag from conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } }
) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = params.id
    const tagId = params.tagId

    // Get current conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Remove tag from array
    const currentTags = conversation.tags || []
    const updatedTags = currentTags.filter((t: string) => t !== tagId)

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ tags: updatedTags })
      .eq('id', conversationId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, tags: updatedTags })
  } catch (error) {
    console.error('Error removing tag from conversation:', error)
    return NextResponse.json(
      { error: 'Failed to remove tag' },
      { status: 500 }
    )
  }
}
