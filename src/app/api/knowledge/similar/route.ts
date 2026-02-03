/**
 * Similar Documents API
 * Purpose: Find documents similar to a given document
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { findSimilarDocuments } from '@/lib/knowledge'

/**
 * GET /api/knowledge/similar
 * Find documents similar to a given document
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
    const documentId = searchParams.get('document_id')
    const limit = searchParams.get('limit')

    if (!documentId) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
    }

    const idValidation = QueryValidators.uuid(documentId)
    if (!idValidation.isValid) {
      return NextResponse.json({ error: 'Invalid document_id' }, { status: 400 })
    }

    // Verify document belongs to organization
    const { data: doc } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('id', documentId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const maxResults = limit ? Math.min(parseInt(limit, 10), 10) : 5

    const similarDocs = await findSimilarDocuments(
      profile.organization_id,
      documentId,
      maxResults
    )

    return NextResponse.json({ documents: similarDocs })
  } catch (error) {
    console.error('Find similar documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
