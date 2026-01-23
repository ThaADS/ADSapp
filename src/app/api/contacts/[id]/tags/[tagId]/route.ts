/**
 * Contact Tag Removal API Route
 *
 * DELETE /api/contacts/[id]/tags/[tagId] - Remove a tag from a contact
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; tagId: string }>
}

/**
 * DELETE /api/contacts/[id]/tags/[tagId]
 * Remove a tag from a contact
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: contactId, tagId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify contact belongs to organization
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Remove tag from contact
    const { error: deleteError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId)

    if (deleteError) {
      console.error('Failed to remove tag:', deleteError)
      return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
    }

    // Decrement tag usage count
    await supabase.rpc('decrement_tag_usage', { tag_id: tagId }).catch(() => {
      // Ignore if RPC doesn't exist
    })

    return NextResponse.json({
      success: true,
      message: 'Tag removed from contact',
    })
  } catch (error) {
    console.error('Contact tag removal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
