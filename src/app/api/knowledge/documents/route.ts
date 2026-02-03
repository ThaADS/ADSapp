/**
 * Knowledge Documents API
 * Purpose: Create and list knowledge base documents
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { processDocument, queueDocumentForProcessing } from '@/lib/knowledge'
import { DocumentProcessingJob, DocumentSourceType } from '@/types/knowledge'

/**
 * GET /api/knowledge/documents
 * List all knowledge documents for the organization
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sourceType = searchParams.get('source_type')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('knowledge_documents')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Failed to fetch documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({
      documents,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('Knowledge documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/documents
 * Create a new knowledge document
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check role (owner or admin only)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or owner role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, source_type, content, url, tags, process_async } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const titleValidation = QueryValidators.text(title, 255)
    if (!titleValidation.isValid) {
      return NextResponse.json({ error: titleValidation.error }, { status: 400 })
    }

    // Validate source type
    const validSourceTypes: DocumentSourceType[] = ['text', 'url', 'file']
    if (!validSourceTypes.includes(source_type)) {
      return NextResponse.json(
        { error: 'Invalid source_type. Must be text, url, or file' },
        { status: 400 }
      )
    }

    // Validate source-specific fields
    if (source_type === 'text' && !content) {
      return NextResponse.json({ error: 'Content is required for text source type' }, { status: 400 })
    }

    if (source_type === 'url' && !url) {
      return NextResponse.json({ error: 'URL is required for url source type' }, { status: 400 })
    }

    // Check document limits
    const { data: settings } = await supabase
      .from('knowledge_settings')
      .select('max_documents')
      .eq('organization_id', profile.organization_id)
      .single()

    const maxDocs = settings?.max_documents || 100

    const { count: currentCount } = await supabase
      .from('knowledge_documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)

    if ((currentCount || 0) >= maxDocs) {
      return NextResponse.json(
        { error: `Document limit reached (${maxDocs}). Please delete some documents or upgrade your plan.` },
        { status: 400 }
      )
    }

    // Create document record
    const { data: document, error: insertError } = await supabase
      .from('knowledge_documents')
      .insert({
        organization_id: profile.organization_id,
        title,
        description: description || null,
        source_type,
        source_url: source_type === 'url' ? url : null,
        raw_content: source_type === 'text' ? content : null,
        status: 'pending',
        tags: tags || [],
        embedding_model: 'text-embedding-3-small',
        chunks_count: 0,
        language: 'en',
        metadata: {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create document:', insertError)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Process document
    if (process_async) {
      // Queue for background processing
      await queueDocumentForProcessing(document.id, profile.organization_id)

      return NextResponse.json({
        success: true,
        document,
        message: 'Document queued for processing',
      })
    } else {
      // Process synchronously
      const job: DocumentProcessingJob = {
        document_id: document.id,
        organization_id: profile.organization_id,
        source_type,
        raw_content: source_type === 'text' ? content : undefined,
        source_url: source_type === 'url' ? url : undefined,
      }

      const result = await processDocument(job)

      // Get updated document
      const { data: updatedDoc } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('id', document.id)
        .single()

      return NextResponse.json({
        success: result.success,
        document: updatedDoc,
        processing: {
          chunksCreated: result.chunksCreated,
          tokensUsed: result.tokensUsed,
          error: result.error,
        },
      })
    }
  } catch (error) {
    console.error('Create document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
