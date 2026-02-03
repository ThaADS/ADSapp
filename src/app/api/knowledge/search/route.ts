/**
 * Knowledge Search API
 * Purpose: Semantic search across knowledge base with optional AI response
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators, validateSearchQuery } from '@/lib/supabase/server'
import { searchKnowledge } from '@/lib/knowledge'
import { SearchKnowledgeRequest } from '@/types/knowledge'

/**
 * POST /api/knowledge/search
 * Search the knowledge base
 */
export async function POST(request: NextRequest) {
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { query, limit, similarity_threshold, include_response, tags_filter } = body

    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const sanitizedQuery = validateSearchQuery(query)
    if (!sanitizedQuery) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    // Validate optional parameters
    if (limit !== undefined) {
      const limitVal = QueryValidators.integer(limit, 1, 20)
      if (!limitVal.isValid) {
        return NextResponse.json({ error: 'Limit must be between 1 and 20' }, { status: 400 })
      }
    }

    if (similarity_threshold !== undefined) {
      if (typeof similarity_threshold !== 'number' || similarity_threshold < 0 || similarity_threshold > 1) {
        return NextResponse.json(
          { error: 'Similarity threshold must be between 0 and 1' },
          { status: 400 }
        )
      }
    }

    // Check daily query limit
    const { data: settings } = await supabase
      .from('knowledge_settings')
      .select('max_queries_per_day')
      .eq('organization_id', profile.organization_id)
      .single()

    const maxQueries = settings?.max_queries_per_day || 1000

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: queryCount } = await supabase
      .from('knowledge_queries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .gte('created_at', today.toISOString())

    if ((queryCount || 0) >= maxQueries) {
      return NextResponse.json(
        { error: `Daily query limit reached (${maxQueries}). Please try again tomorrow.` },
        { status: 429 }
      )
    }

    // Perform search
    const searchRequest: SearchKnowledgeRequest = {
      query: sanitizedQuery,
      limit,
      similarity_threshold,
      include_response: include_response !== false,
      tags_filter: Array.isArray(tags_filter) ? tags_filter : undefined,
    }

    const result = await searchKnowledge(profile.organization_id, searchRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Knowledge search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/knowledge/search
 * Simple GET endpoint for search (query in URL)
 */
export async function GET(request: NextRequest) {
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = searchParams.get('limit')
    const threshold = searchParams.get('threshold')
    const includeResponse = searchParams.get('include_response')
    const tags = searchParams.get('tags')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter (q) is required' }, { status: 400 })
    }

    const sanitizedQuery = validateSearchQuery(query)
    if (!sanitizedQuery) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    // Check daily query limit (same as POST endpoint)
    const { data: settings } = await supabase
      .from('knowledge_settings')
      .select('max_queries_per_day')
      .eq('organization_id', profile.organization_id)
      .single()

    const maxQueries = settings?.max_queries_per_day || 1000

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: queryCount } = await supabase
      .from('knowledge_queries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .gte('created_at', today.toISOString())

    if ((queryCount || 0) >= maxQueries) {
      return NextResponse.json(
        { error: `Daily query limit reached (${maxQueries}). Please try again tomorrow.` },
        { status: 429 }
      )
    }

    const searchRequest: SearchKnowledgeRequest = {
      query: sanitizedQuery,
      limit: limit ? parseInt(limit, 10) : undefined,
      similarity_threshold: threshold ? parseFloat(threshold) : undefined,
      include_response: includeResponse !== 'false',
      tags_filter: tags ? tags.split(',').map((t) => t.trim()) : undefined,
    }

    const result = await searchKnowledge(profile.organization_id, searchRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Knowledge search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
