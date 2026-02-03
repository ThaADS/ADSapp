/**
 * Knowledge Document API (Single Document)
 * Purpose: Get, update, delete, and reprocess individual documents
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { reprocessDocument } from '@/lib/knowledge'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/documents/[id]
 * Get a single document with its chunks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Validate document ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    // Get document
    const { data: document, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if chunks should be included
    const { searchParams } = new URL(request.url)
    const includeChunks = searchParams.get('include_chunks') === 'true'

    let chunks = null
    if (includeChunks) {
      const { data: chunkData } = await supabase
        .from('knowledge_chunks')
        .select('id, chunk_index, content, token_count, start_char, end_char, metadata')
        .eq('document_id', id)
        .order('chunk_index', { ascending: true })

      chunks = chunkData
    }

    return NextResponse.json({
      document,
      chunks,
    })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/knowledge/documents/[id]
 * Update document metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Check role
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate document ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    // Check document exists and belongs to org
    const { data: existing } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, tags } = body

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) {
      const titleValidation = QueryValidators.text(title, 255)
      if (!titleValidation.isValid) {
        return NextResponse.json({ error: titleValidation.error }, { status: 400 })
      }
      updates.title = title
    }

    if (description !== undefined) {
      updates.description = description
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 })
      }
      updates.tags = tags
    }

    // Update document
    const { data: document, error } = await supabase
      .from('knowledge_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update document:', error)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/knowledge/documents/[id]
 * Delete a document and its chunks
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Check role
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate document ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    // Check document exists
    const { data: existing } = await supabase
      .from('knowledge_documents')
      .select('id, storage_path')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete chunks first (cascades should handle this, but being explicit)
    await supabase.from('knowledge_chunks').delete().eq('document_id', id)

    // Delete from processing queue
    await supabase.from('knowledge_processing_queue').delete().eq('document_id', id)

    // Delete document
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete document:', error)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    // TODO: Delete from storage if file was uploaded

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/documents/[id]
 * Reprocess a document (re-chunk and re-embed)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Check role
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate document ID
    const idValidation = QueryValidators.uuid(id)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    // Check document exists
    const { data: existing } = await supabase
      .from('knowledge_documents')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if already processing
    if (['processing', 'chunking', 'embedding'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Document is already being processed' },
        { status: 400 }
      )
    }

    // Parse options from body
    const body = await request.json().catch(() => ({}))
    const { chunk_size_tokens, chunk_overlap_tokens, chunking_strategy } = body

    // Reprocess document
    const result = await reprocessDocument(id, profile.organization_id, {
      chunkingOptions: {
        chunk_size_tokens: chunk_size_tokens || undefined,
        chunk_overlap_tokens: chunk_overlap_tokens || undefined,
      },
      chunkingStrategy: chunking_strategy || undefined,
    })

    // Get updated document
    const { data: document } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: result.success,
      document,
      processing: {
        chunksCreated: result.chunksCreated,
        tokensUsed: result.tokensUsed,
        error: result.error,
      },
    })
  } catch (error) {
    console.error('Reprocess document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
