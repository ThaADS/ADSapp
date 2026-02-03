/**
 * Document Processor
 * Purpose: Process documents through the RAG pipeline (extract, chunk, embed, store)
 * Date: 2026-01-28
 */

import { createClient } from '@/lib/supabase/server'
import {
  KnowledgeDocument,
  DocumentProcessingJob,
  DocumentChunkData,
  ChunkingOptions,
  DEFAULT_CHUNKING_OPTIONS,
  DocumentSourceType,
} from '@/types/knowledge'
import { chunkDocument, ChunkingStrategy, extractDocumentMetadata } from './chunker'
import { generateEmbeddings, generateEmbeddingsWithRetry, EmbeddingModel } from './embeddings'
import crypto from 'crypto'

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = 'text-embedding-3-small'
const MAX_CONCURRENT_EMBEDDINGS = 5
const EMBEDDING_BATCH_SIZE = 20
const URL_FETCH_TIMEOUT_MS = 30000 // 30 second timeout for URL fetching
const MAX_CONTENT_SIZE_BYTES = 10 * 1024 * 1024 // 10MB max content size

// Blocked URL patterns for SSRF protection
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^https?:\/\/\[fe80:/i,
  /^file:/i,
  /^ftp:/i,
  /^data:/i,
]

// =============================================================================
// DOCUMENT PROCESSOR
// =============================================================================

export interface ProcessingResult {
  success: boolean
  documentId: string
  chunksCreated: number
  tokensUsed: number
  error?: string
}

export interface ProcessingProgress {
  stage: 'extracting' | 'chunking' | 'embedding' | 'storing' | 'completed' | 'failed'
  progress: number // 0-100
  message: string
  chunksProcessed?: number
  totalChunks?: number
}

/**
 * Process a document through the full RAG pipeline
 */
export async function processDocument(
  job: DocumentProcessingJob,
  options?: {
    chunkingOptions?: Partial<ChunkingOptions>
    embeddingModel?: EmbeddingModel
    chunkingStrategy?: ChunkingStrategy
    onProgress?: (progress: ProcessingProgress) => void
  }
): Promise<ProcessingResult> {
  const supabase = await createClient()
  const onProgress = options?.onProgress || (() => {})

  try {
    // Update status to processing
    await updateDocumentStatus(supabase, job.document_id, 'processing')
    onProgress({ stage: 'extracting', progress: 10, message: 'Extracting content...' })

    // 1. Get content based on source type
    let content: string

    switch (job.source_type) {
      case 'text':
        content = job.raw_content || ''
        break

      case 'url':
        content = await fetchURLContent(job.source_url!)
        break

      case 'file':
        content = await extractFileContent(job.file_path!)
        break

      default:
        throw new Error(`Unknown source type: ${job.source_type}`)
    }

    if (!content.trim()) {
      throw new Error('No content extracted from document')
    }

    // Generate content hash for deduplication
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    // Check for duplicate content
    const { data: existingDoc } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('organization_id', job.organization_id)
      .eq('content_hash', contentHash)
      .neq('id', job.document_id)
      .single()

    if (existingDoc) {
      throw new Error('Duplicate content detected - document already exists')
    }

    // Update document with raw content and hash
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length
    await supabase
      .from('knowledge_documents')
      .update({
        raw_content: content,
        content_hash: contentHash,
        word_count: wordCount,
        status: 'chunking',
      })
      .eq('id', job.document_id)

    onProgress({ stage: 'chunking', progress: 30, message: 'Splitting into chunks...' })

    // 2. Chunk the content
    const chunkingOpts: ChunkingOptions = {
      ...DEFAULT_CHUNKING_OPTIONS,
      ...options?.chunkingOptions,
    }

    const chunks = chunkDocument(content, chunkingOpts, options?.chunkingStrategy)

    if (chunks.length === 0) {
      throw new Error('No chunks generated from content')
    }

    // Update document with chunk count
    await supabase
      .from('knowledge_documents')
      .update({
        chunks_count: chunks.length,
        status: 'embedding',
      })
      .eq('id', job.document_id)

    onProgress({
      stage: 'embedding',
      progress: 50,
      message: `Generating embeddings for ${chunks.length} chunks...`,
      totalChunks: chunks.length,
      chunksProcessed: 0,
    })

    // 3. Generate embeddings in batches
    const embeddingModel = options?.embeddingModel || DEFAULT_EMBEDDING_MODEL
    const embeddings: number[][] = []
    let totalTokensUsed = 0

    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
      const batchTexts = batchChunks.map((c) => c.content)

      const response = await generateEmbeddingsWithRetry({ texts: batchTexts, model: embeddingModel })

      embeddings.push(...response.embeddings)
      totalTokensUsed += response.usage.total_tokens

      const processed = Math.min(i + EMBEDDING_BATCH_SIZE, chunks.length)
      const progress = 50 + Math.round((processed / chunks.length) * 30)

      onProgress({
        stage: 'embedding',
        progress,
        message: `Embedded ${processed}/${chunks.length} chunks...`,
        totalChunks: chunks.length,
        chunksProcessed: processed,
      })
    }

    onProgress({ stage: 'storing', progress: 85, message: 'Storing chunks in database...' })

    // 4. Store chunks with embeddings
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: job.document_id,
      organization_id: job.organization_id,
      content: chunk.content,
      chunk_index: index,
      token_count: chunk.token_count,
      embedding: embeddings[index],
      start_char: chunk.start_char,
      end_char: chunk.end_char,
      page_number: chunk.page_number || null,
      metadata: chunk.metadata,
    }))

    // Insert chunks in batches
    for (let i = 0; i < chunkRecords.length; i += 50) {
      const batch = chunkRecords.slice(i, i + 50)
      const { error: insertError } = await supabase.from('knowledge_chunks').insert(batch)

      if (insertError) {
        throw new Error(`Failed to store chunks: ${insertError.message}`)
      }
    }

    // 5. Update document status to completed
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'completed',
        embedding_model: embeddingModel,
        processed_at: new Date().toISOString(),
        metadata: {
          ...extractDocumentMetadata(content),
          processingTokensUsed: totalTokensUsed,
        },
      })
      .eq('id', job.document_id)

    onProgress({ stage: 'completed', progress: 100, message: 'Processing complete!' })

    return {
      success: true,
      documentId: job.document_id,
      chunksCreated: chunks.length,
      tokensUsed: totalTokensUsed,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    // Update document with error status
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', job.document_id)

    onProgress({ stage: 'failed', progress: 0, message: errorMessage })

    return {
      success: false,
      documentId: job.document_id,
      chunksCreated: 0,
      tokensUsed: 0,
      error: errorMessage,
    }
  }
}

/**
 * Reprocess an existing document (e.g., with new chunking settings)
 */
export async function reprocessDocument(
  documentId: string,
  organizationId: string,
  options?: {
    chunkingOptions?: Partial<ChunkingOptions>
    embeddingModel?: EmbeddingModel
    chunkingStrategy?: ChunkingStrategy
  }
): Promise<ProcessingResult> {
  const supabase = await createClient()

  // Get existing document
  const { data: document, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single()

  if (error || !document) {
    return {
      success: false,
      documentId,
      chunksCreated: 0,
      tokensUsed: 0,
      error: 'Document not found',
    }
  }

  // Delete existing chunks
  await supabase.from('knowledge_chunks').delete().eq('document_id', documentId)

  // Reset document status
  await supabase
    .from('knowledge_documents')
    .update({
      status: 'pending',
      chunks_count: 0,
      error_message: null,
      processed_at: null,
    })
    .eq('id', documentId)

  // Create processing job
  const job: DocumentProcessingJob = {
    document_id: documentId,
    organization_id: organizationId,
    source_type: document.source_type as DocumentSourceType,
    raw_content: document.raw_content,
    source_url: document.source_url,
    file_path: document.storage_path,
  }

  return processDocument(job, options)
}

// =============================================================================
// CONTENT EXTRACTION
// =============================================================================

/**
 * Validate URL for SSRF protection
 */
function isURLSafe(url: string): boolean {
  // Check against blocked patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(url)) {
      return false
    }
  }

  // Parse and validate URL
  try {
    const parsed = new URL(url)

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    // Block URLs with credentials
    if (parsed.username || parsed.password) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Fetch and extract content from a URL
 */
async function fetchURLContent(url: string): Promise<string> {
  // SSRF protection: validate URL before fetching
  if (!isURLSafe(url)) {
    throw new Error('URL not allowed: blocked for security reasons')
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'ADSapp-KnowledgeBot/1.0',
          Accept: 'text/html, text/plain, */*',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    // Check content length before reading
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_SIZE_BYTES) {
      throw new Error(`Content too large: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB exceeds limit`)
    }

    // Validate final URL after redirects (SSRF protection)
    if (response.url && response.url !== url) {
      if (!isURLSafe(response.url)) {
        throw new Error('Redirect URL not allowed: blocked for security reasons')
      }
    }

    const contentType = response.headers.get('content-type') || ''

    // Read with size limit
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to read response body')
    }

    const chunks: Uint8Array[] = []
    let totalSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalSize += value.length
      if (totalSize > MAX_CONTENT_SIZE_BYTES) {
        reader.cancel()
        throw new Error(`Content too large: exceeds ${MAX_CONTENT_SIZE_BYTES / 1024 / 1024}MB limit`)
      }
      chunks.push(value)
    }

    const html = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))))

    // Basic HTML to text conversion
    if (contentType.includes('text/html')) {
      return extractTextFromHTML(html)
    }

    // Plain text
    return html
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`URL fetch timed out after ${URL_FETCH_TIMEOUT_MS / 1000} seconds`)
    }
    throw new Error(`URL fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from HTML content
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Convert block elements to newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = decodeHTMLEntities(text)

  // Clean up whitespace
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')

  return text
}

/**
 * Decode common HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char)
  }

  // Decode numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))

  return result
}

/**
 * Extract content from a file
 */
async function extractFileContent(filePath: string): Promise<string> {
  // For now, only support text-based files
  // PDF, DOCX extraction would require additional libraries
  const extension = filePath.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'txt':
    case 'md':
    case 'html':
      // TODO: Read from Supabase storage
      throw new Error('File extraction not yet implemented - use text or URL source')

    case 'pdf':
      throw new Error('PDF extraction requires additional setup')

    case 'docx':
    case 'doc':
      throw new Error('Word document extraction requires additional setup')

    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Update document processing status
 */
async function updateDocumentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  await supabase
    .from('knowledge_documents')
    .update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
}

/**
 * Queue a document for background processing
 */
export async function queueDocumentForProcessing(
  documentId: string,
  organizationId: string,
  priority: number = 5
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('knowledge_processing_queue').insert({
    document_id: documentId,
    organization_id: organizationId,
    priority,
    status: 'pending',
  })
}

/**
 * Process next document from the queue
 */
export async function processNextFromQueue(): Promise<ProcessingResult | null> {
  const supabase = await createClient()

  // Get next pending item (highest priority first)
  const { data: queueItem, error } = await supabase
    .from('knowledge_processing_queue')
    .select('*, knowledge_documents(*)')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !queueItem) {
    return null
  }

  // Mark as processing
  await supabase
    .from('knowledge_processing_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', queueItem.id)

  try {
    const doc = queueItem.knowledge_documents as KnowledgeDocument

    const job: DocumentProcessingJob = {
      document_id: doc.id,
      organization_id: doc.organization_id,
      source_type: doc.source_type as DocumentSourceType,
      raw_content: doc.raw_content || undefined,
      source_url: doc.source_url || undefined,
      file_path: doc.storage_path || undefined,
    }

    const result = await processDocument(job)

    // Update queue status
    await supabase
      .from('knowledge_processing_queue')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        error_message: result.error,
      })
      .eq('id', queueItem.id)

    return result
  } catch (error) {
    // Update queue with error
    await supabase
      .from('knowledge_processing_queue')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', queueItem.id)

    return {
      success: false,
      documentId: queueItem.document_id,
      chunksCreated: 0,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
