import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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

    // Update contact to blocked
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        is_blocked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error blocking contact:', error)
      return NextResponse.json({ error: 'Failed to block contact' }, { status: 500 })
    }

    // Close all open conversations with this contact
    await supabase
      .from('conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('contact_id', id)
      .eq('organization_id', profile.organization_id)
      .in('status', ['open', 'pending'])

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in POST /api/contacts/[id]/block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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

    // Unblock contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        is_blocked: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error unblocking contact:', error)
      return NextResponse.json({ error: 'Failed to unblock contact' }, { status: 500 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in DELETE /api/contacts/[id]/block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
