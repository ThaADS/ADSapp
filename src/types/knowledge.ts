/**
 * Knowledge Base Types
 * TypeScript interfaces for RAG knowledge base system
 * Date: 2026-01-28
 */

// =============================================================================
// DATABASE ENTITY TYPES
// =============================================================================

/**
 * Knowledge Document - Uploaded file or crawled URL
 */
export interface KnowledgeDocument {
  id: string
  organization_id: string
  // Document info
  title: string
  description: string | null
  source_type: DocumentSourceType
  // File info
  file_name: string | null
  file_type: string | null
  file_size_bytes: number | null
  storage_path: string | null
  // URL info
  source_url: string | null
  crawled_at: string | null
  // Content
  raw_content: string | null
  content_hash: string | null
  word_count: number | null
  language: string
  // Processing
  status: DocumentProcessingStatus
  error_message: string | null
  embedding_model: string
  chunks_count: number
  // Metadata
  metadata: Record<string, unknown>
  tags: string[]
  // Timestamps
  created_at: string
  updated_at: string
  processed_at: string | null
}

export type DocumentSourceType = 'file' | 'url' | 'text'

export type DocumentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'chunking'
  | 'embedding'
  | 'completed'
  | 'failed'

/**
 * Knowledge Chunk - Document chunk with embedding
 */
export interface KnowledgeChunk {
  id: string
  document_id: string
  organization_id: string
  // Content
  content: string
  chunk_index: number
  token_count: number
  // Embedding (stored as float[] in pgvector)
  embedding: number[] | null
  // Source location
  start_char: number | null
  end_char: number | null
  page_number: number | null
  // Metadata
  metadata: Record<string, unknown>
  // Timestamps
  created_at: string
}

/**
 * Knowledge Query Log
 */
export interface KnowledgeQuery {
  id: string
  organization_id: string
  user_id: string | null
  // Query
  query_text: string
  query_embedding: number[] | null
  // Results
  chunks_retrieved: number
  top_similarity_score: number | null
  context_tokens: number | null
  // AI response
  ai_response: string | null
  ai_model: string | null
  ai_tokens_used: number | null
  // Performance
  search_latency_ms: number | null
  generation_latency_ms: number | null
  // Source
  source_type: QuerySourceType
  source_conversation_id: string | null
  // Timestamps
  created_at: string
}

export type QuerySourceType = 'manual' | 'ai_draft' | 'ai_auto' | 'api'

/**
 * Knowledge Settings
 */
export interface KnowledgeSettings {
  id: string
  organization_id: string
  // Chunking
  chunk_size_tokens: number
  chunk_overlap_tokens: number
  // Retrieval
  max_chunks_per_query: number
  similarity_threshold: number
  // AI
  ai_model: string
  ai_temperature: number
  ai_max_tokens: number
  include_citations: boolean
  // Features
  auto_answer_enabled: boolean
  auto_answer_threshold: number
  draft_suggestions_enabled: boolean
  // Limits
  max_queries_per_day: number
  max_documents: number
  max_storage_mb: number
  // Timestamps
  created_at: string
  updated_at: string
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Upload Document Request
 */
export interface UploadDocumentRequest {
  title: string
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  // File will be sent as FormData
}

/**
 * Add URL Request
 */
export interface AddURLRequest {
  url: string
  title?: string
  description?: string
  tags?: string[]
}

/**
 * Add Text Request
 */
export interface AddTextRequest {
  title: string
  content: string
  description?: string
  tags?: string[]
}

/**
 * Document Response
 */
export interface DocumentResponse {
  success: boolean
  document?: KnowledgeDocument
  error?: string
}

/**
 * Search Knowledge Request
 */
export interface SearchKnowledgeRequest {
  query: string
  limit?: number // default 5
  similarity_threshold?: number // default 0.7
  include_response?: boolean // default true
  tags_filter?: string[]
}

/**
 * Search Result Chunk
 */
export interface SearchResultChunk {
  chunk_id: string
  document_id: string
  document_title: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

/**
 * Search Knowledge Response
 */
export interface SearchKnowledgeResponse {
  success: boolean
  query: string
  chunks: SearchResultChunk[]
  ai_response?: string
  citations?: Citation[]
  search_latency_ms?: number
  generation_latency_ms?: number
  error?: string
}

/**
 * Citation for AI responses
 */
export interface Citation {
  document_id: string
  document_title: string
  chunk_content: string
  similarity: number
}

/**
 * Update Settings Request
 */
export interface UpdateKnowledgeSettingsRequest {
  chunk_size_tokens?: number
  chunk_overlap_tokens?: number
  max_chunks_per_query?: number
  similarity_threshold?: number
  ai_model?: string
  ai_temperature?: number
  ai_max_tokens?: number
  include_citations?: boolean
  auto_answer_enabled?: boolean
  auto_answer_threshold?: number
  draft_suggestions_enabled?: boolean
}

// =============================================================================
// DOCUMENT PROCESSING TYPES
// =============================================================================

/**
 * Document Processing Job
 */
export interface DocumentProcessingJob {
  document_id: string
  organization_id: string
  source_type: DocumentSourceType
  file_path?: string
  source_url?: string
  raw_content?: string
}

/**
 * Chunking Options
 */
export interface ChunkingOptions {
  chunk_size_tokens: number
  chunk_overlap_tokens: number
  min_chunk_size: number
}

/**
 * Document Chunk (before embedding)
 */
export interface DocumentChunkData {
  content: string
  chunk_index: number
  token_count: number
  start_char: number
  end_char: number
  page_number?: number
  metadata: Record<string, unknown>
}

/**
 * Embedding Request
 */
export interface EmbeddingRequest {
  texts: string[]
  model?: string // default 'text-embedding-ada-002'
}

/**
 * Embedding Response
 */
export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// =============================================================================
// RAG PIPELINE TYPES
// =============================================================================

/**
 * RAG Context for AI generation
 */
export interface RAGContext {
  query: string
  chunks: SearchResultChunk[]
  settings: KnowledgeSettings
  max_context_tokens?: number
}

/**
 * RAG Generation Request
 */
export interface RAGGenerationRequest {
  query: string
  context: string
  model: string
  temperature: number
  max_tokens: number
  include_citations: boolean
}

/**
 * RAG Generation Response
 */
export interface RAGGenerationResponse {
  response: string
  citations: Citation[]
  tokens_used: number
  finish_reason: string
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * Knowledge Base Stats
 */
export interface KnowledgeBaseStats {
  total_documents: number
  total_chunks: number
  total_storage_bytes: number
  documents_by_type: Record<DocumentSourceType, number>
  documents_by_status: Record<DocumentProcessingStatus, number>
  queries_today: number
  queries_this_week: number
  avg_similarity_score: number
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate token count (rough approximation)
 * OpenAI tokenizer averages ~4 chars per token for English
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to approximate token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

/**
 * Extract file type from filename
 */
export function getFileType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  const supportedTypes = ['pdf', 'docx', 'doc', 'txt', 'md', 'html']
  return ext && supportedTypes.includes(ext) ? ext : null
}

/**
 * Validate file type for upload
 */
export function isValidFileType(filename: string): boolean {
  return getFileType(filename) !== null
}

/**
 * Default chunking options
 */
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunk_size_tokens: 500,
  chunk_overlap_tokens: 50,
  min_chunk_size: 100,
}

/**
 * Default knowledge settings
 */
export const DEFAULT_KNOWLEDGE_SETTINGS: Partial<KnowledgeSettings> = {
  chunk_size_tokens: 500,
  chunk_overlap_tokens: 50,
  max_chunks_per_query: 5,
  similarity_threshold: 0.7,
  ai_model: 'gpt-4-turbo-preview',
  ai_temperature: 0.3,
  ai_max_tokens: 1000,
  include_citations: true,
  auto_answer_enabled: false,
  auto_answer_threshold: 0.85,
  draft_suggestions_enabled: true,
  max_queries_per_day: 1000,
  max_documents: 100,
  max_storage_mb: 500,
}

/**
 * Supported embedding models
 */
export const EMBEDDING_MODELS = {
  'text-embedding-ada-002': {
    dimensions: 1536,
    max_tokens: 8191,
    price_per_1k: 0.0001, // USD
  },
  'text-embedding-3-small': {
    dimensions: 1536,
    max_tokens: 8191,
    price_per_1k: 0.00002, // USD
  },
  'text-embedding-3-large': {
    dimensions: 3072,
    max_tokens: 8191,
    price_per_1k: 0.00013, // USD
  },
} as const

export type EmbeddingModel = keyof typeof EMBEDDING_MODELS
