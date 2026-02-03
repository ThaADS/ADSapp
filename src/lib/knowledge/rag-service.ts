/**
 * RAG Query Service
 * Purpose: Retrieval-Augmented Generation service for answering questions using knowledge base
 * Date: 2026-01-28
 */

import { createClient } from '@/lib/supabase/server'
import {
  SearchKnowledgeRequest,
  SearchKnowledgeResponse,
  SearchResultChunk,
  Citation,
  RAGContext,
  RAGGenerationRequest,
  RAGGenerationResponse,
  KnowledgeSettings,
  DEFAULT_KNOWLEDGE_SETTINGS,
  estimateTokenCount,
  truncateToTokenLimit,
} from '@/types/knowledge'
import { generateEmbedding, EmbeddingModel } from './embeddings'

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_SIMILARITY_THRESHOLD = 0.7
const DEFAULT_MAX_CHUNKS = 5
const DEFAULT_CONTEXT_MAX_TOKENS = 4000
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

// =============================================================================
// SEARCH SERVICE
// =============================================================================

/**
 * Search knowledge base using semantic similarity
 */
export async function searchKnowledge(
  organizationId: string,
  request: SearchKnowledgeRequest
): Promise<SearchKnowledgeResponse> {
  const supabase = await createClient()
  const startTime = Date.now()

  try {
    // Get organization settings
    const settings = await getKnowledgeSettings(organizationId)
    const similarityThreshold = request.similarity_threshold ?? settings.similarity_threshold
    const maxChunks = request.limit ?? settings.max_chunks_per_query

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(request.query, 'text-embedding-3-small')

    // Search using pgvector
    const { data: results, error } = await supabase.rpc('search_knowledge_chunks', {
      query_embedding: queryEmbedding,
      org_id: organizationId,
      similarity_threshold: similarityThreshold,
      max_results: maxChunks,
    })

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    const searchLatency = Date.now() - startTime

    // Filter by tags if specified
    let chunks: SearchResultChunk[] = (results || []).map((result: any) => ({
      chunk_id: result.chunk_id,
      document_id: result.document_id,
      document_title: result.document_title,
      content: result.content,
      similarity: result.similarity,
      metadata: result.metadata || {},
    }))

    if (request.tags_filter && request.tags_filter.length > 0) {
      // Get document IDs that have the required tags
      const { data: taggedDocs } = await supabase
        .from('knowledge_documents')
        .select('id')
        .eq('organization_id', organizationId)
        .overlaps('tags', request.tags_filter)

      const taggedDocIds = new Set((taggedDocs || []).map((d) => d.id))
      chunks = chunks.filter((c) => taggedDocIds.has(c.document_id))
    }

    // Build response
    const response: SearchKnowledgeResponse = {
      success: true,
      query: request.query,
      chunks,
      search_latency_ms: searchLatency,
    }

    // Generate AI response if requested
    if (request.include_response !== false && chunks.length > 0) {
      const generationStart = Date.now()

      const ragResult = await generateRAGResponse({
        query: request.query,
        chunks,
        settings,
      })

      response.ai_response = ragResult.response
      response.citations = ragResult.citations
      response.generation_latency_ms = Date.now() - generationStart
    }

    // Log query for analytics
    await logQuery(organizationId, request, response, queryEmbedding, settings)

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Search failed'

    return {
      success: false,
      query: request.query,
      chunks: [],
      error: errorMessage,
      search_latency_ms: Date.now() - startTime,
    }
  }
}

/**
 * Search for similar documents (not chunks)
 */
export async function findSimilarDocuments(
  organizationId: string,
  documentId: string,
  maxResults: number = 5
): Promise<{ documentId: string; title: string; similarity: number }[]> {
  const supabase = await createClient()

  // Get chunks from source document
  const { data: sourceChunks } = await supabase
    .from('knowledge_chunks')
    .select('embedding')
    .eq('document_id', documentId)
    .limit(1)

  if (!sourceChunks || sourceChunks.length === 0) {
    return []
  }

  // Use first chunk embedding to find similar
  const sourceEmbedding = sourceChunks[0].embedding

  const { data: results } = await supabase.rpc('search_knowledge_chunks', {
    query_embedding: sourceEmbedding,
    org_id: organizationId,
    similarity_threshold: 0.5,
    max_results: maxResults * 3, // Get more to group by document
  })

  if (!results) {
    return []
  }

  // Group by document and calculate average similarity
  const docSimilarities = new Map<string, { title: string; similarities: number[] }>()

  for (const result of results) {
    if (result.document_id === documentId) continue // Skip source document

    if (!docSimilarities.has(result.document_id)) {
      docSimilarities.set(result.document_id, {
        title: result.document_title,
        similarities: [],
      })
    }
    docSimilarities.get(result.document_id)!.similarities.push(result.similarity)
  }

  // Calculate average similarity and sort
  const similarDocs = Array.from(docSimilarities.entries())
    .map(([docId, data]) => ({
      documentId: docId,
      title: data.title,
      similarity: data.similarities.reduce((a, b) => a + b, 0) / data.similarities.length,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)

  return similarDocs
}

// =============================================================================
// RAG GENERATION
// =============================================================================

/**
 * Generate AI response using retrieved context
 */
export async function generateRAGResponse(context: RAGContext): Promise<RAGGenerationResponse> {
  const settings = context.settings
  const maxContextTokens = context.max_context_tokens ?? DEFAULT_CONTEXT_MAX_TOKENS

  // Build context string from chunks
  const contextParts: string[] = []
  let currentTokens = 0
  const usedChunks: SearchResultChunk[] = []

  for (const chunk of context.chunks) {
    const chunkTokens = estimateTokenCount(chunk.content)

    if (currentTokens + chunkTokens > maxContextTokens) {
      // Truncate last chunk if needed
      const remainingTokens = maxContextTokens - currentTokens
      if (remainingTokens > 100) {
        const truncated = truncateToTokenLimit(chunk.content, remainingTokens)
        contextParts.push(`[${chunk.document_title}]\n${truncated}`)
        usedChunks.push(chunk)
      }
      break
    }

    contextParts.push(`[${chunk.document_title}]\n${chunk.content}`)
    currentTokens += chunkTokens
    usedChunks.push(chunk)
  }

  const contextString = contextParts.join('\n\n---\n\n')

  // Generate response using OpenAI
  const request: RAGGenerationRequest = {
    query: context.query,
    context: contextString,
    model: settings.ai_model || DEFAULT_KNOWLEDGE_SETTINGS.ai_model!,
    temperature: settings.ai_temperature ?? DEFAULT_KNOWLEDGE_SETTINGS.ai_temperature!,
    max_tokens: settings.ai_max_tokens ?? DEFAULT_KNOWLEDGE_SETTINGS.ai_max_tokens!,
    include_citations: settings.include_citations ?? DEFAULT_KNOWLEDGE_SETTINGS.include_citations!,
  }

  const response = await callOpenAI(request)

  // Build citations
  const citations: Citation[] = settings.include_citations
    ? usedChunks.map((chunk) => ({
        document_id: chunk.document_id,
        document_title: chunk.document_title,
        chunk_content: truncateToTokenLimit(chunk.content, 100),
        similarity: chunk.similarity,
      }))
    : []

  return {
    response: response.content,
    citations,
    tokens_used: response.tokensUsed,
    finish_reason: response.finishReason,
  }
}

/**
 * Call OpenAI Chat API for RAG generation
 */
async function callOpenAI(
  request: RAGGenerationRequest
): Promise<{ content: string; tokensUsed: number; finishReason: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const systemPrompt = request.include_citations
    ? `You are a helpful assistant that answers questions based on the provided context.
Always base your answers on the given context. If the context doesn't contain enough information to answer the question, say so.
When citing information, reference the document title in brackets like [Document Title].`
    : `You are a helpful assistant that answers questions based on the provided context.
Always base your answers on the given context. If the context doesn't contain enough information to answer the question, say so.`

  const userPrompt = `Context:
${request.context}

Question: ${request.query}

Please provide a helpful answer based on the context above.`

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage.total_tokens,
    finishReason: data.choices[0].finish_reason,
  }
}

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * Get knowledge base settings for an organization
 */
export async function getKnowledgeSettings(organizationId: string): Promise<KnowledgeSettings> {
  const supabase = await createClient()

  const { data: settings, error } = await supabase
    .from('knowledge_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !settings) {
    // Return defaults if no settings exist
    return {
      id: '',
      organization_id: organizationId,
      ...DEFAULT_KNOWLEDGE_SETTINGS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as KnowledgeSettings
  }

  return settings as KnowledgeSettings
}

/**
 * Update knowledge base settings
 */
export async function updateKnowledgeSettings(
  organizationId: string,
  updates: Partial<KnowledgeSettings>
): Promise<KnowledgeSettings> {
  const supabase = await createClient()

  // Upsert settings
  const { data, error } = await supabase
    .from('knowledge_settings')
    .upsert(
      {
        organization_id: organizationId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`)
  }

  return data as KnowledgeSettings
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Log a knowledge query for analytics
 */
async function logQuery(
  organizationId: string,
  request: SearchKnowledgeRequest,
  response: SearchKnowledgeResponse,
  queryEmbedding: number[],
  settings: KnowledgeSettings
): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase.from('knowledge_queries').insert({
      organization_id: organizationId,
      query_text: request.query,
      query_embedding: queryEmbedding,
      chunks_retrieved: response.chunks.length,
      top_similarity_score: response.chunks[0]?.similarity ?? null,
      context_tokens: response.chunks.reduce((sum, c) => sum + estimateTokenCount(c.content), 0),
      ai_response: response.ai_response || null,
      ai_model: response.ai_response ? (settings.ai_model || DEFAULT_KNOWLEDGE_SETTINGS.ai_model) : null,
      ai_tokens_used: null, // TODO: Track this from response
      search_latency_ms: response.search_latency_ms,
      generation_latency_ms: response.generation_latency_ms || null,
      source_type: 'manual',
    })
  } catch (error) {
    console.error('Failed to log query:', error)
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeStats(organizationId: string): Promise<{
  totalDocuments: number
  totalChunks: number
  totalStorageBytes: number
  documentsByType: Record<string, number>
  documentsByStatus: Record<string, number>
  queriesToday: number
  queriesThisWeek: number
  avgSimilarityScore: number
}> {
  const supabase = await createClient()

  // Get document counts
  const { data: docs } = await supabase
    .from('knowledge_documents')
    .select('id, source_type, status, file_size_bytes')
    .eq('organization_id', organizationId)

  const documents = docs || []

  // Get chunk count
  const { count: chunkCount } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  // Calculate storage
  const totalStorageBytes = documents.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0)

  // Count by type and status
  const documentsByType: Record<string, number> = {}
  const documentsByStatus: Record<string, number> = {}

  for (const doc of documents) {
    documentsByType[doc.source_type] = (documentsByType[doc.source_type] || 0) + 1
    documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1
  }

  // Query stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: queriesToday } = await supabase
    .from('knowledge_queries')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', today.toISOString())

  const { count: queriesThisWeek } = await supabase
    .from('knowledge_queries')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', weekAgo.toISOString())

  // Average similarity score
  const { data: avgData } = await supabase
    .from('knowledge_queries')
    .select('top_similarity_score')
    .eq('organization_id', organizationId)
    .not('top_similarity_score', 'is', null)
    .limit(100)

  const scores = (avgData || []).map((q) => q.top_similarity_score).filter((s) => s !== null) as number[]
  const avgSimilarityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  return {
    totalDocuments: documents.length,
    totalChunks: chunkCount || 0,
    totalStorageBytes,
    documentsByType,
    documentsByStatus,
    queriesToday: queriesToday || 0,
    queriesThisWeek: queriesThisWeek || 0,
    avgSimilarityScore,
  }
}
