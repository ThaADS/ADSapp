/**
 * Knowledge Base Module
 * Purpose: Exports for RAG knowledge base system
 * Date: 2026-01-28
 */

// Embeddings
export {
  generateEmbedding,
  generateEmbeddings,
  generateEmbeddingsBatched,
  generateEmbeddingsWithRetry,
  cosineSimilarity,
  getEmbeddingDimensions,
  estimateEmbeddingCost,
  EmbeddingError,
  type EmbeddingErrorCode,
} from './embeddings'

// Chunking
export {
  chunkDocument,
  chunkBySentences,
  chunkByParagraphs,
  chunkByTokens,
  chunkMarkdown,
  extractDocumentMetadata,
  type ChunkingStrategy,
} from './chunker'

// Document Processing
export {
  processDocument,
  reprocessDocument,
  queueDocumentForProcessing,
  processNextFromQueue,
  type ProcessingResult,
  type ProcessingProgress,
} from './document-processor'

// RAG Service
export {
  searchKnowledge,
  findSimilarDocuments,
  generateRAGResponse,
  getKnowledgeSettings,
  updateKnowledgeSettings,
  getKnowledgeStats,
} from './rag-service'
