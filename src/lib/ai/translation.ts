/**
 * AI Translation Service
 * Automatically detect and translate messages between languages
 */

// @ts-nocheck - Database types need regeneration from Supabase schema

import { openRouter } from './openrouter'
import { createClient } from '@/lib/supabase/server'

export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  confidence: number
  detectedLanguage?: string
}

// Supported languages
export const LANGUAGES = {
  DUTCH: 'nl',
  ENGLISH: 'en',
  GERMAN: 'de',
  FRENCH: 'fr',
  SPANISH: 'es',
  ITALIAN: 'it',
  PORTUGUESE: 'pt',
  POLISH: 'pl',
  TURKISH: 'tr',
  ARABIC: 'ar',
  CHINESE: 'zh',
  JAPANESE: 'ja',
  KOREAN: 'ko',
} as const

export const LANGUAGE_NAMES: Record<string, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
  tr: 'Türkçe',
  ar: 'العربية',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
}

/**
 * Detect the language of a text
 */
export async function detectLanguage(
  text: string,
  organizationId: string
): Promise<{
  language: string
  languageName: string
  confidence: number
}> {
  const startTime = Date.now()

  const systemPrompt = `You are a language detection expert.
Detect the language of the provided text accurately.

Return ONLY a JSON object with this exact format:
{
  "language": "two-letter ISO 639-1 code",
  "languageName": "full language name in English",
  "confidence": 0.0-1.0
}

Common languages:
- nl: Dutch
- en: English
- de: German
- fr: French
- es: Spanish
- it: Italian
- pt: Portuguese
- ar: Arabic
- zh: Chinese
- ja: Japanese`

  const userPrompt = `Detect the language of this text:

"${text}"

Return only the JSON object.`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.1, // Very low for consistent detection
        max_tokens: 100,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let detectionData
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      detectionData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse language detection JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    // Log usage
    await openRouter.logUsage({
      feature: 'language_detection',
      organizationId,
      conversationId: null,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        detectedLanguage: detectionData.language,
        confidence: detectionData.confidence,
      },
    })

    return {
      language: detectionData.language,
      languageName: detectionData.languageName,
      confidence: detectionData.confidence,
    }
  } catch (error) {
    console.error('Language detection error:', error)
    // Return default fallback
    return {
      language: 'en',
      languageName: 'English',
      confidence: 0.3,
    }
  }
}

/**
 * Translate text from one language to another
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
  organizationId?: string,
  conversationId?: string
): Promise<TranslationResult> {
  const startTime = Date.now()

  // Auto-detect source language if not provided
  let detectedLanguage = sourceLanguage
  if (!sourceLanguage && organizationId) {
    const detection = await detectLanguage(text, organizationId)
    detectedLanguage = detection.language
  }

  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage
  const sourceLangName = detectedLanguage
    ? LANGUAGE_NAMES[detectedLanguage] || detectedLanguage
    : 'unknown'

  const systemPrompt = `You are a professional translator with expertise in multiple languages.
Translate the provided text accurately while preserving:
- Tone and formality
- Context and meaning
- Cultural nuances
- Formatting

Return ONLY a JSON object with this exact format:
{
  "translatedText": "the translated text",
  "confidence": 0.0-1.0
}

Do not add explanations or notes, just the JSON.`

  const userPrompt = `Translate this text from ${sourceLangName} to ${targetLangName}:

"${text}"

Return only the JSON object with the translation.`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3, // Low for consistent translation
        max_tokens: Math.max(text.length * 2, 500), // Allow for expansion
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let translationData
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      translationData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse translation JSON:', content)
      // Try to use the content directly as translation
      translationData = {
        translatedText: content.replace(/```json\n?|\n?```/g, '').trim(),
        confidence: 0.6,
      }
    }

    const result: TranslationResult = {
      originalText: text,
      translatedText: translationData.translatedText,
      sourceLanguage: detectedLanguage || 'unknown',
      targetLanguage,
      confidence: translationData.confidence || 0.8,
      detectedLanguage: !sourceLanguage ? detectedLanguage : undefined,
    }

    // Log usage if organizationId provided
    if (organizationId) {
      await openRouter.logUsage({
        feature: 'translation',
        organizationId,
        conversationId: conversationId || null,
        model: response.model,
        prompt: systemPrompt + '\n\n' + userPrompt,
        response: content,
        tokensUsed: response.usage.total_tokens,
        latencyMs: latency,
        metadata: {
          sourceLanguage: detectedLanguage,
          targetLanguage,
          confidence: result.confidence,
        },
      })
    }

    return result
  } catch (error) {
    console.error('Translation error:', error)
    throw new Error('Failed to translate text')
  }
}

/**
 * Batch translate multiple messages
 */
export async function batchTranslate(
  messages: Array<{ id: string; text: string }>,
  targetLanguage: string,
  sourceLanguage?: string,
  organizationId?: string
): Promise<
  Array<{
    id: string
    translation: TranslationResult | null
    error?: string
  }>
> {
  const results = []

  for (const message of messages) {
    try {
      const translation = await translateText(
        message.text,
        targetLanguage,
        sourceLanguage,
        organizationId
      )
      results.push({
        id: message.id,
        translation,
      })
    } catch (error) {
      results.push({
        id: message.id,
        translation: null,
        error: error instanceof Error ? error.message : 'Translation failed',
      })
    }
  }

  return results
}

/**
 * Get translation history for a conversation
 */
export async function getTranslationHistory(conversationId: string): Promise<
  Array<{
    messageId: string
    originalText: string
    translatedText: string
    sourceLanguage: string
    targetLanguage: string
    createdAt: string
  }>
> {
  try {
    const supabase = await createClient()

    const { data: translations } = await supabase
      .from('ai_responses')
      .select('message_id, response, metadata, created_at')
      .eq('conversation_id', conversationId)
      .eq('feature', 'translation')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!translations) {
      return []
    }

    return translations.map(t => ({
      messageId: t.message_id || '',
      originalText: t.metadata?.originalText || '',
      translatedText: t.response,
      sourceLanguage: t.metadata?.sourceLanguage || 'unknown',
      targetLanguage: t.metadata?.targetLanguage || 'unknown',
      createdAt: t.created_at,
    }))
  } catch (error) {
    console.error('Failed to get translation history:', error)
    return []
  }
}

/**
 * Store translation in database
 */
export async function storeTranslation(
  messageId: string,
  conversationId: string,
  organizationId: string,
  translation: TranslationResult
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('ai_responses').insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      message_id: messageId,
      feature: 'translation',
      model: 'translation-service',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      response_data: {
        originalText: translation.originalText,
        translatedText: translation.translatedText,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
      },
      latency_ms: 0,
      cost_usd: 0,
      confidence_score: translation.confidence,
    })
  } catch (error) {
    console.error('Failed to store translation:', error)
    // Don't throw, translation still succeeded
  }
}

/**
 * Quick language detection using simple heuristics (no AI call)
 * Useful for real-time UI feedback
 */
export function quickDetectLanguage(text: string): string {
  const normalizedText = text.toLowerCase()

  // Dutch detection
  if (
    /\b(het|de|een|is|zijn|hebben|van|voor|met|door|als|aan|op)\b/.test(
      normalizedText
    )
  ) {
    return 'nl'
  }

  // German detection
  if (
    /\b(der|die|das|ist|sind|haben|von|für|mit|durch|wenn|zu)\b/.test(
      normalizedText
    )
  ) {
    return 'de'
  }

  // French detection
  if (
    /\b(le|la|les|un|une|est|sont|avoir|de|pour|avec|par|si|à)\b/.test(
      normalizedText
    )
  ) {
    return 'fr'
  }

  // Spanish detection
  if (
    /\b(el|la|los|las|un|una|es|son|tener|de|para|con|por|si|en)\b/.test(
      normalizedText
    )
  ) {
    return 'es'
  }

  // Italian detection
  if (
    /\b(il|lo|la|i|gli|le|un|uno|una|è|sono|avere|di|per|con|da|se|a)\b/.test(
      normalizedText
    )
  ) {
    return 'it'
  }

  // Arabic detection (check for Arabic script)
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar'
  }

  // Chinese detection
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh'
  }

  // Japanese detection
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja'
  }

  // Korean detection
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko'
  }

  // Default to English
  return 'en'
}

/**
 * Get supported languages for UI dropdown
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
    code,
    name,
  }))
}
