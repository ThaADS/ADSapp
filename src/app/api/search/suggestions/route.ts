// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const query = searchParams.get('q') || ''
    const organizationId = searchParams.get('org')

    if (organizationId !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get recent search terms and popular tags
    const { data: conversations } = await supabase
      .from('conversations')
      .select('subject, tags')
      .eq('organization_id', organizationId)
      .not('subject', 'is', null)
      .limit(100)

    const suggestions = new Set<string>()

    // Add subjects that match the query
    conversations?.forEach(conv => {
      if (conv.subject && conv.subject.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(conv.subject)
      }
      
      // Add matching tags
      conv.tags?.forEach((tag: string) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tag)
        }
      })
    })

    // Add some common suggestions
    const commonSuggestions = [
      'product information',
      'pricing details',
      'support request',
      'order status',
      'refund request',
      'technical issue',
      'billing question',
      'account setup'
    ]

    commonSuggestions.forEach(suggestion => {
      if (suggestion.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(suggestion)
      }
    })

    return NextResponse.json({
      suggestions: Array.from(suggestions).slice(0, 5)
    })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
