import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Add tag to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Next.js 15: params is now a Promise
    const { id: conversationId } = await params
    const { tagId } = await request.json()

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    // Get current conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Add tag to array if not already present
    const currentTags = conversation.tags || []
    if (!currentTags.includes(tagId)) {
      const updatedTags = [...currentTags, tagId]

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ tags: updatedTags })
        .eq('id', conversationId)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({ success: true, tags: [...currentTags, tagId] })
  } catch (error) {
    console.error('Error adding tag to conversation:', error)
    return NextResponse.json(
      { error: 'Failed to add tag' },
      { status: 500 }
    )
  }
}
