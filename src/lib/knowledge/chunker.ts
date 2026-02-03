/**
 * Document Chunker
 * Purpose: Split documents into overlapping chunks for embedding
 * Date: 2026-01-28
 */

import {
  ChunkingOptions,
  DocumentChunkData,
  DEFAULT_CHUNKING_OPTIONS,
  estimateTokenCount,
} from '@/types/knowledge'

// =============================================================================
// SENTENCE SPLITTING
// =============================================================================

/**
 * Split text into sentences using regex-based approach
 */
function splitIntoSentences(text: string): string[] {
  // Match sentence endings: period, exclamation, question mark
  // followed by space and capital letter or end of string
  const sentenceRegex = /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g
  const matches = text.match(sentenceRegex)

  if (!matches) {
    return [text]
  }

  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

// =============================================================================
// CHUNKING STRATEGIES
// =============================================================================

/**
 * Chunk text using sentence-based splitting with overlap
 */
export function chunkBySentences(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunkData[] {
  const sentences = splitIntoSentences(text)
  const chunks: DocumentChunkData[] = []

  let currentChunk: string[] = []
  let currentTokenCount = 0
  let chunkStartChar = 0
  let charPosition = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const sentenceTokens = estimateTokenCount(sentence)

    // If adding this sentence would exceed chunk size
    if (currentTokenCount + sentenceTokens > options.chunk_size_tokens && currentChunk.length > 0) {
      // Save current chunk
      const chunkContent = currentChunk.join(' ')
      chunks.push({
        content: chunkContent,
        chunk_index: chunks.length,
        token_count: currentTokenCount,
        start_char: chunkStartChar,
        end_char: charPosition,
        metadata: {},
      })

      // Calculate overlap - go back by overlap tokens
      let overlapTokens = 0
      let overlapSentences: string[] = []

      for (let j = currentChunk.length - 1; j >= 0 && overlapTokens < options.chunk_overlap_tokens; j--) {
        const sentenceTokensCount = estimateTokenCount(currentChunk[j])
        overlapSentences.unshift(currentChunk[j])
        overlapTokens += sentenceTokensCount
      }

      // Start new chunk with overlap
      currentChunk = overlapSentences
      currentTokenCount = overlapTokens
      chunkStartChar = charPosition - overlapSentences.join(' ').length
    }

    currentChunk.push(sentence)
    currentTokenCount += sentenceTokens
    charPosition = text.indexOf(sentence, charPosition) + sentence.length
  }

  // Add final chunk if it meets minimum size
  if (currentChunk.length > 0 && currentTokenCount >= options.min_chunk_size) {
    const chunkContent = currentChunk.join(' ')
    chunks.push({
      content: chunkContent,
      chunk_index: chunks.length,
      token_count: currentTokenCount,
      start_char: chunkStartChar,
      end_char: text.length,
      metadata: {},
    })
  } else if (currentChunk.length > 0 && chunks.length > 0) {
    // Append to last chunk if too small
    const lastChunk = chunks[chunks.length - 1]
    lastChunk.content += ' ' + currentChunk.join(' ')
    lastChunk.token_count += currentTokenCount
    lastChunk.end_char = text.length
  } else if (currentChunk.length > 0) {
    // First chunk is small but we have to include it
    const chunkContent = currentChunk.join(' ')
    chunks.push({
      content: chunkContent,
      chunk_index: 0,
      token_count: currentTokenCount,
      start_char: 0,
      end_char: text.length,
      metadata: {},
    })
  }

  return chunks
}

/**
 * Chunk text using paragraph-based splitting with sentence overlap
 */
export function chunkByParagraphs(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunkData[] {
  const paragraphs = splitIntoParagraphs(text)
  const chunks: DocumentChunkData[] = []

  let currentChunk: string[] = []
  let currentTokenCount = 0
  let chunkStartChar = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph)

    // If single paragraph exceeds chunk size, split by sentences
    if (paragraphTokens > options.chunk_size_tokens) {
      // Save current accumulated chunk first
      if (currentChunk.length > 0) {
        const chunkContent = currentChunk.join('\n\n')
        const startPos = text.indexOf(currentChunk[0], chunkStartChar)
        chunks.push({
          content: chunkContent,
          chunk_index: chunks.length,
          token_count: currentTokenCount,
          start_char: startPos,
          end_char: startPos + chunkContent.length,
          metadata: {},
        })
        currentChunk = []
        currentTokenCount = 0
      }

      // Split large paragraph by sentences
      const sentenceChunks = chunkBySentences(paragraph, options)
      const paragraphStart = text.indexOf(paragraph, chunkStartChar)

      for (const chunk of sentenceChunks) {
        chunks.push({
          ...chunk,
          chunk_index: chunks.length,
          start_char: paragraphStart + chunk.start_char,
          end_char: paragraphStart + chunk.end_char,
        })
      }

      chunkStartChar = paragraphStart + paragraph.length
      continue
    }

    // If adding this paragraph would exceed chunk size
    if (currentTokenCount + paragraphTokens > options.chunk_size_tokens && currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n\n')
      const startPos = text.indexOf(currentChunk[0], chunkStartChar)

      chunks.push({
        content: chunkContent,
        chunk_index: chunks.length,
        token_count: currentTokenCount,
        start_char: startPos,
        end_char: startPos + chunkContent.length,
        metadata: {},
      })

      // Start new chunk with overlap from last paragraph
      const lastParagraph = currentChunk[currentChunk.length - 1]
      const lastTokens = estimateTokenCount(lastParagraph)

      if (lastTokens <= options.chunk_overlap_tokens) {
        currentChunk = [lastParagraph]
        currentTokenCount = lastTokens
      } else {
        currentChunk = []
        currentTokenCount = 0
      }

      chunkStartChar = text.indexOf(paragraph, chunkStartChar)
    }

    currentChunk.push(paragraph)
    currentTokenCount += paragraphTokens
  }

  // Add final chunk
  if (currentChunk.length > 0 && currentTokenCount >= options.min_chunk_size) {
    const chunkContent = currentChunk.join('\n\n')
    const startPos = text.indexOf(currentChunk[0], chunkStartChar)

    chunks.push({
      content: chunkContent,
      chunk_index: chunks.length,
      token_count: currentTokenCount,
      start_char: startPos,
      end_char: text.length,
      metadata: {},
    })
  } else if (currentChunk.length > 0 && chunks.length > 0) {
    // Append to last chunk if too small
    const lastChunk = chunks[chunks.length - 1]
    lastChunk.content += '\n\n' + currentChunk.join('\n\n')
    lastChunk.token_count += currentTokenCount
    lastChunk.end_char = text.length
  }

  return chunks
}

/**
 * Chunk text using fixed token size with overlap
 */
export function chunkByTokens(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunkData[] {
  const words = text.split(/\s+/)
  const chunks: DocumentChunkData[] = []

  // Approximate 4 chars per token, so tokens ≈ chars / 4
  const charsPerToken = 4
  const maxCharsPerChunk = options.chunk_size_tokens * charsPerToken
  const overlapChars = options.chunk_overlap_tokens * charsPerToken

  let currentChunk = ''
  let chunkStartChar = 0
  let charPosition = 0

  for (const word of words) {
    const wordWithSpace = currentChunk.length > 0 ? ' ' + word : word

    if (currentChunk.length + wordWithSpace.length > maxCharsPerChunk && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk,
        chunk_index: chunks.length,
        token_count: estimateTokenCount(currentChunk),
        start_char: chunkStartChar,
        end_char: chunkStartChar + currentChunk.length,
        metadata: {},
      })

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlapChars)
      chunkStartChar = chunkStartChar + currentChunk.length - overlapText.length
      currentChunk = overlapText + wordWithSpace
    } else {
      currentChunk += wordWithSpace
    }

    charPosition += word.length + 1
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const tokenCount = estimateTokenCount(currentChunk)

    if (tokenCount >= options.min_chunk_size || chunks.length === 0) {
      chunks.push({
        content: currentChunk,
        chunk_index: chunks.length,
        token_count: tokenCount,
        start_char: chunkStartChar,
        end_char: text.length,
        metadata: {},
      })
    } else if (chunks.length > 0) {
      // Append to last chunk
      const lastChunk = chunks[chunks.length - 1]
      lastChunk.content += ' ' + currentChunk
      lastChunk.token_count = estimateTokenCount(lastChunk.content)
      lastChunk.end_char = text.length
    }
  }

  return chunks
}

// =============================================================================
// MARKDOWN-AWARE CHUNKING
// =============================================================================

/**
 * Chunk markdown document respecting headers and structure
 */
export function chunkMarkdown(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunkData[] {
  // Split by headers while preserving them
  const sections = text.split(/(?=^#{1,6}\s)/m).filter((s) => s.trim().length > 0)
  const chunks: DocumentChunkData[] = []

  let currentSection = ''
  let currentTokenCount = 0
  let currentHeader = ''

  for (const section of sections) {
    // Extract header if present
    const headerMatch = section.match(/^(#{1,6}\s[^\n]+)\n?/)
    const header = headerMatch ? headerMatch[1] : ''
    const content = headerMatch ? section.slice(headerMatch[0].length) : section

    const sectionTokens = estimateTokenCount(section)

    // If section is too large, chunk its content
    if (sectionTokens > options.chunk_size_tokens) {
      // Save current accumulated content first
      if (currentSection.length > 0) {
        const startPos = text.indexOf(currentSection)
        chunks.push({
          content: currentSection,
          chunk_index: chunks.length,
          token_count: currentTokenCount,
          start_char: startPos,
          end_char: startPos + currentSection.length,
          metadata: { header: currentHeader },
        })
        currentSection = ''
        currentTokenCount = 0
      }

      // Chunk the large section by paragraphs
      const sectionChunks = chunkByParagraphs(content, options)
      const sectionStart = text.indexOf(section)

      for (const chunk of sectionChunks) {
        // Prepend header to each chunk from this section
        const chunkWithHeader = header ? `${header}\n\n${chunk.content}` : chunk.content
        chunks.push({
          content: chunkWithHeader,
          chunk_index: chunks.length,
          token_count: estimateTokenCount(chunkWithHeader),
          start_char: sectionStart + chunk.start_char,
          end_char: sectionStart + chunk.end_char,
          metadata: { header },
        })
      }

      continue
    }

    // If adding this section would exceed chunk size
    if (currentTokenCount + sectionTokens > options.chunk_size_tokens && currentSection.length > 0) {
      const startPos = text.indexOf(currentSection)
      chunks.push({
        content: currentSection,
        chunk_index: chunks.length,
        token_count: currentTokenCount,
        start_char: startPos,
        end_char: startPos + currentSection.length,
        metadata: { header: currentHeader },
      })
      currentSection = ''
      currentTokenCount = 0
    }

    if (currentSection.length === 0) {
      currentHeader = header
    }

    currentSection += (currentSection.length > 0 ? '\n\n' : '') + section
    currentTokenCount += sectionTokens
  }

  // Add final chunk
  if (currentSection.length > 0) {
    const startPos = text.indexOf(currentSection)
    chunks.push({
      content: currentSection,
      chunk_index: chunks.length,
      token_count: currentTokenCount,
      start_char: startPos >= 0 ? startPos : 0,
      end_char: text.length,
      metadata: { header: currentHeader },
    })
  }

  return chunks
}

// =============================================================================
// MAIN CHUNKING FUNCTION
// =============================================================================

export type ChunkingStrategy = 'sentences' | 'paragraphs' | 'tokens' | 'markdown' | 'auto'

/**
 * Chunk document content using specified strategy
 */
export function chunkDocument(
  content: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS,
  strategy: ChunkingStrategy = 'auto'
): DocumentChunkData[] {
  // Clean content
  const cleanedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .trim()

  if (cleanedContent.length === 0) {
    return []
  }

  // Auto-detect strategy based on content
  if (strategy === 'auto') {
    if (/^#{1,6}\s/m.test(cleanedContent)) {
      strategy = 'markdown'
    } else if (cleanedContent.includes('\n\n')) {
      strategy = 'paragraphs'
    } else {
      strategy = 'sentences'
    }
  }

  let chunks: DocumentChunkData[]

  switch (strategy) {
    case 'markdown':
      chunks = chunkMarkdown(cleanedContent, options)
      break
    case 'paragraphs':
      chunks = chunkByParagraphs(cleanedContent, options)
      break
    case 'tokens':
      chunks = chunkByTokens(cleanedContent, options)
      break
    case 'sentences':
    default:
      chunks = chunkBySentences(cleanedContent, options)
      break
  }

  // Re-index chunks
  return chunks.map((chunk, index) => ({
    ...chunk,
    chunk_index: index,
  }))
}

/**
 * Extract metadata from document content
 */
export function extractDocumentMetadata(content: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}

  // Extract title from first header
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    metadata.extractedTitle = titleMatch[1].trim()
  }

  // Count headers
  const h1Count = (content.match(/^#\s/gm) || []).length
  const h2Count = (content.match(/^##\s/gm) || []).length
  const h3Count = (content.match(/^###\s/gm) || []).length

  metadata.headerCounts = { h1: h1Count, h2: h2Count, h3: h3Count }

  // Detect code blocks
  const codeBlockCount = (content.match(/```/g) || []).length / 2
  metadata.hasCode = codeBlockCount > 0
  metadata.codeBlockCount = codeBlockCount

  // Detect lists
  metadata.hasBulletList = /^[-*]\s/m.test(content)
  metadata.hasNumberedList = /^\d+\.\s/m.test(content)

  // Word and character counts
  metadata.wordCount = content.split(/\s+/).filter((w) => w.length > 0).length
  metadata.charCount = content.length

  return metadata
}
