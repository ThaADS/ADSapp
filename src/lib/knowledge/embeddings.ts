/**
 * OpenAI Embeddings Client
 * Purpose: Generate text embeddings using OpenAI API for semantic search
 * Date: 2026-01-28
 */

import { EmbeddingRequest, EmbeddingResponse, EMBEDDING_MODELS, EmbeddingModel } from '@/types/knowledge'

// =============================================================================
// CONFIGURATION
// =============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const DEFAULT_MODEL: EmbeddingModel = 'text-embedding-3-small'
const MAX_BATCH_SIZE = 2048 // OpenAI limit
const MAX_TOKENS_PER_REQUEST = 8191
const API_TIMEOUT_MS = 30000 // 30 second timeout
const RATE_LIMIT_RETRY_AFTER_DEFAULT = 60000 // 60 seconds default

// =============================================================================
// EMBEDDING CLIENT
// =============================================================================

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(
  text: string,
  model: EmbeddingModel = DEFAULT_MODEL
): Promise<number[]> {
  const response = await generateEmbeddings({ texts: [text], model })
  return response.embeddings[0]
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  request: EmbeddingRequest
): Promise<EmbeddingResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new EmbeddingError('OPENAI_API_KEY environment variable is not set', 'CONFIG_ERROR')
  }

  const model = request.model || DEFAULT_MODEL

  // Validate model
  if (!(model in EMBEDDING_MODELS)) {
    throw new EmbeddingError(`Invalid embedding model: ${model}`, 'INVALID_MODEL')
  }

  // Validate batch size
  if (request.texts.length > MAX_BATCH_SIZE) {
    throw new EmbeddingError(
      `Batch size ${request.texts.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      'BATCH_TOO_LARGE'
    )
  }

  // Filter empty texts
  const validTexts = request.texts.filter((t) => t.trim().length > 0)
  if (validTexts.length === 0) {
    throw new EmbeddingError('No valid texts provided', 'EMPTY_INPUT')
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: validTexts,
          encoding_format: 'float',
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // Handle rate limiting specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : RATE_LIMIT_RETRY_AFTER_DEFAULT
        const error = new EmbeddingError(
          `Rate limited by OpenAI. Retry after ${Math.ceil(retryMs / 1000)} seconds.`,
          'RATE_LIMITED',
          429
        )
        ;(error as any).retryAfterMs = retryMs
        throw error
      }

      throw new EmbeddingError(
        errorData.error?.message || `OpenAI API error: ${response.status}`,
        'API_ERROR',
        response.status
      )
    }

    const data = await response.json()

    // Sort embeddings by index to maintain order
    const sortedEmbeddings = data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => item.embedding)

    return {
      embeddings: sortedEmbeddings,
      model: data.model,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        total_tokens: data.usage.total_tokens,
      },
    }
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error
    }
    // Handle abort/timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EmbeddingError(
        `OpenAI API request timed out after ${API_TIMEOUT_MS / 1000} seconds`,
        'NETWORK_ERROR'
      )
    }
    throw new EmbeddingError(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    )
  }
}

/**
 * Generate embeddings in batches for large datasets
 */
export async function generateEmbeddingsBatched(
  texts: string[],
  model: EmbeddingModel = DEFAULT_MODEL,
  batchSize: number = 100,
  onProgress?: (completed: number, total: number) => void
): Promise<EmbeddingResponse> {
  const allEmbeddings: number[][] = []
  let totalPromptTokens = 0
  let totalTokens = 0

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const response = await generateEmbeddings({ texts: batch, model })

    allEmbeddings.push(...response.embeddings)
    totalPromptTokens += response.usage.prompt_tokens
    totalTokens += response.usage.total_tokens

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length)
    }

    // Rate limiting: small delay between batches
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return {
    embeddings: allEmbeddings,
    model,
    usage: {
      prompt_tokens: totalPromptTokens,
      total_tokens: totalTokens,
    },
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

/**
 * Get embedding dimensions for a model
 */
export function getEmbeddingDimensions(model: EmbeddingModel): number {
  return EMBEDDING_MODELS[model].dimensions
}

/**
 * Estimate cost for embedding texts
 */
export function estimateEmbeddingCost(
  texts: string[],
  model: EmbeddingModel = DEFAULT_MODEL
): { estimatedTokens: number; estimatedCost: number } {
  // Rough estimation: ~4 chars per token
  const estimatedTokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0)
  const costPer1k = EMBEDDING_MODELS[model].price_per_1k
  const estimatedCost = (estimatedTokens / 1000) * costPer1k

  return {
    estimatedTokens,
    estimatedCost,
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export type EmbeddingErrorCode =
  | 'CONFIG_ERROR'
  | 'INVALID_MODEL'
  | 'BATCH_TOO_LARGE'
  | 'EMPTY_INPUT'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'

export class EmbeddingError extends Error {
  code: EmbeddingErrorCode
  statusCode?: number

  constructor(message: string, code: EmbeddingErrorCode, statusCode?: number) {
    super(message)
    this.name = 'EmbeddingError'
    this.code = code
    this.statusCode = statusCode
  }

  isRetryable(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code === 'RATE_LIMITED' ||
      (this.code === 'API_ERROR' && this.statusCode !== undefined && this.statusCode >= 500)
    )
  }
}

/**
 * Retry embedding generation with exponential backoff
 */
export async function generateEmbeddingsWithRetry(
  request: EmbeddingRequest,
  maxRetries: number = 3
): Promise<EmbeddingResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateEmbeddings(request)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (error instanceof EmbeddingError && !error.isRetryable()) {
        throw error
      }

      // Use retry-after from rate limit error if available
      let delay: number
      if (error instanceof EmbeddingError && (error as any).retryAfterMs) {
        delay = (error as any).retryAfterMs
      } else {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000)
        const jitter = Math.random() * 1000
        delay = baseDelay + jitter
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Failed to generate embeddings after retries')
}
