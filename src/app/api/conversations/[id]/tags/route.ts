import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Helper to check if a string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

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
    const { tagId, tagName } = await request.json()

    if (!tagId && !tagName) {
      return NextResponse.json({ error: 'Tag ID or name is required' }, { status: 400 })
    }

    // Get user's organization for tag lookup
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // Resolve tag ID - accept either UUID or name
    let resolvedTagId = tagId
    if (tagId && !isUUID(tagId)) {
      // tagId is actually a name, look it up
      const { data: tag } = await supabase
        .from('tags')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', tagId)
        .single()

      if (!tag) {
        return NextResponse.json({ error: `Tag "${tagId}" not found` }, { status: 404 })
      }
      resolvedTagId = tag.id
    } else if (tagName && !tagId) {
      // Look up by name
      const { data: tag } = await supabase
        .from('tags')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', tagName)
        .single()

      if (!tag) {
        return NextResponse.json({ error: `Tag "${tagName}" not found` }, { status: 404 })
      }
      resolvedTagId = tag.id
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
    if (!currentTags.includes(resolvedTagId)) {
      const updatedTags = [...currentTags, resolvedTagId]

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ tags: updatedTags })
        .eq('id', conversationId)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({ success: true, tags: [...currentTags, resolvedTagId] })
  } catch (error) {
    console.error('Error adding tag to conversation:', error)
    return NextResponse.json(
      { error: 'Failed to add tag' },
      { status: 500 }
    )
  }
}
