/**
 * Workflow AI Handler
 *
 * Implements AI-powered actions for workflow nodes:
 * - Sentiment analysis
 * - Message categorization
 * - Information extraction
 * - Response generation
 * - Translation
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AINodeData } from '@/types/workflow'
import type { ExecutionContext } from './execution-engine'

// ============================================================================
// TYPES
// ============================================================================

export interface AIResult {
  success: boolean
  data?: Record<string, any>
  error?: string
}

type AIAction = AINodeData['aiConfig']['action']

// ============================================================================
// AI HANDLER CLASS
// ============================================================================

export class WorkflowAIHandler {
  private apiKey: string | null = null
  private baseUrl: string = 'https://openrouter.ai/api/v1'

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || null
  }

  /**
   * Execute AI action
   */
  async execute(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    if (!this.apiKey) {
      console.warn('[AIHandler] No API key configured, using mock responses')
      return this.mockResponse(config.action, context)
    }

    try {
      switch (config.action) {
        case 'sentiment_analysis':
          return this.analyzeSentiment(context, config)

        case 'categorize':
          return this.categorizeMessage(context, config)

        case 'extract_info':
          return this.extractInformation(context, config)

        case 'generate_response':
          return this.generateResponse(context, config)

        case 'translate':
          return this.translateText(context, config)

        default:
          return { success: false, error: `Unknown AI action: ${config.action}` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI execution failed',
      }
    }
  }

  /**
   * Analyze sentiment of last message
   */
  private async analyzeSentiment(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    const lastMessage = await this.getLastMessage(context)
    if (!lastMessage) {
      return { success: true, data: { sentiment: 'neutral', confidence: 0 } }
    }

    const prompt = `Analyze the sentiment of the following customer message and respond with a JSON object containing:
- sentiment: one of "positive", "negative", "neutral", "mixed"
- confidence: a number between 0 and 1
- emotions: an array of detected emotions (e.g., "happy", "frustrated", "confused")
- summary: a brief one-line summary of the message tone

Message: "${lastMessage}"

Respond only with valid JSON, no other text.`

    const response = await this.callAI(prompt, config.model || 'gpt-3.5-turbo')

    try {
      const data = JSON.parse(response)
      return { success: true, data }
    } catch {
      return {
        success: true,
        data: { sentiment: 'neutral', confidence: 0.5, raw: response },
      }
    }
  }

  /**
   * Categorize message into predefined categories
   */
  private async categorizeMessage(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    const lastMessage = await this.getLastMessage(context)
    if (!lastMessage) {
      return { success: true, data: { category: 'uncategorized' } }
    }

    const categories = config.categories || ['inquiry', 'complaint', 'feedback', 'support', 'sales', 'other']

    const prompt = `Categorize the following customer message into exactly one of these categories: ${categories.join(', ')}.

Message: "${lastMessage}"

Respond with a JSON object containing:
- category: the selected category (must be one from the list)
- confidence: a number between 0 and 1
- reason: brief explanation for the categorization

Respond only with valid JSON, no other text.`

    const response = await this.callAI(prompt, config.model || 'gpt-3.5-turbo')

    try {
      const data = JSON.parse(response)
      // Validate category
      if (!categories.includes(data.category)) {
        data.category = 'other'
      }
      return { success: true, data }
    } catch {
      return {
        success: true,
        data: { category: 'other', confidence: 0.5, raw: response },
      }
    }
  }

  /**
   * Extract structured information from message
   */
  private async extractInformation(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    const lastMessage = await this.getLastMessage(context)
    if (!lastMessage) {
      return { success: true, data: {} }
    }

    const fields = config.extractionFields || ['name', 'email', 'phone', 'intent']
    const customPrompt = config.extractionPrompt || ''

    const prompt = `Extract the following information from this customer message: ${fields.join(', ')}.
${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Message: "${lastMessage}"

Respond with a JSON object where keys are the field names and values are the extracted values (or null if not found).
Include a "confidence" field with extraction confidence (0-1).

Respond only with valid JSON, no other text.`

    const response = await this.callAI(prompt, config.model || 'gpt-3.5-turbo')

    try {
      const data = JSON.parse(response)
      return { success: true, data }
    } catch {
      return {
        success: true,
        data: { raw: response, extractionFailed: true },
      }
    }
  }

  /**
   * Generate a response to the message
   */
  private async generateResponse(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    const lastMessage = await this.getLastMessage(context)
    const additionalContext = config.responseContext || ''

    // Build prompt with context
    let systemPrompt = `You are a helpful customer service assistant. Generate a friendly, professional response to the customer's message.
${additionalContext ? `Context: ${additionalContext}` : ''}
${config.responsePrompt ? `Instructions: ${config.responsePrompt}` : ''}

Keep the response concise and helpful. Do not use markdown formatting as this will be sent via WhatsApp.`

    const prompt = `Customer message: "${lastMessage || 'Hello'}"

Generate an appropriate response.`

    const response = await this.callAI(
      prompt,
      config.model || 'gpt-3.5-turbo',
      systemPrompt,
      config.temperature ?? 0.7,
      config.maxTokens ?? 500
    )

    return {
      success: true,
      data: {
        response,
        generatedAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Translate text to target language
   */
  private async translateText(
    context: ExecutionContext,
    config: AINodeData['aiConfig']
  ): Promise<AIResult> {
    const lastMessage = await this.getLastMessage(context)
    if (!lastMessage) {
      return { success: true, data: { translated: '', sourceLanguage: 'unknown' } }
    }

    const targetLang = config.targetLanguage || 'en'
    const sourceLang = config.sourceLanguage || 'auto'

    const prompt = `Translate the following text to ${targetLang}.
${sourceLang !== 'auto' ? `Source language: ${sourceLang}` : 'Detect the source language.'}

Text: "${lastMessage}"

Respond with a JSON object containing:
- translated: the translated text
- sourceLanguage: the detected source language code
- confidence: translation confidence (0-1)

Respond only with valid JSON, no other text.`

    const response = await this.callAI(prompt, config.model || 'gpt-3.5-turbo')

    try {
      const data = JSON.parse(response)
      return { success: true, data }
    } catch {
      return {
        success: true,
        data: { translated: response, sourceLanguage: sourceLang, confidence: 0.5 },
      }
    }
  }

  /**
   * Call the AI API
   */
  private async callAI(
    prompt: string,
    model: string,
    systemPrompt?: string,
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ADSapp Workflow Engine',
      },
      body: JSON.stringify({
        model: this.mapModel(model),
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  /**
   * Map user-friendly model names to OpenRouter model IDs
   */
  private mapModel(model: string): string {
    const modelMap: Record<string, string> = {
      'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
      'gpt-4': 'openai/gpt-4',
      'claude-3-sonnet': 'anthropic/claude-3-sonnet',
      'claude-3-haiku': 'anthropic/claude-3-haiku',
    }

    return modelMap[model] || model
  }

  /**
   * Get the last message from the conversation
   */
  private async getLastMessage(context: ExecutionContext): Promise<string | null> {
    // Check context first
    if (context.context?.lastMessage) {
      return context.context.lastMessage
    }

    // Fetch from database
    const supabase = createServiceRoleClient()

    const { data: messages } = await supabase
      .from('messages')
      .select('content')
      .eq('contact_id', context.contactId)
      .eq('direction', 'incoming')
      .order('created_at', { ascending: false })
      .limit(1)

    return messages?.[0]?.content || null
  }

  /**
   * Mock response for when AI is not configured
   */
  private mockResponse(action: AIAction, context: ExecutionContext): AIResult {
    console.log(`[AIHandler] Generating mock response for action: ${action}`)

    switch (action) {
      case 'sentiment_analysis':
        return {
          success: true,
          data: {
            sentiment: 'neutral',
            confidence: 0.5,
            emotions: ['curious'],
            summary: 'Mock sentiment analysis - AI not configured',
          },
        }

      case 'categorize':
        return {
          success: true,
          data: {
            category: 'inquiry',
            confidence: 0.5,
            reason: 'Mock categorization - AI not configured',
          },
        }

      case 'extract_info':
        return {
          success: true,
          data: {
            name: context.contact?.name || null,
            email: context.contact?.email || null,
            phone: context.contact?.phone || null,
            confidence: 0.3,
          },
        }

      case 'generate_response':
        return {
          success: true,
          data: {
            response: 'Thank you for your message. An agent will assist you shortly.',
            generatedAt: new Date().toISOString(),
          },
        }

      case 'translate':
        return {
          success: true,
          data: {
            translated: '[Translation not available - AI not configured]',
            sourceLanguage: 'unknown',
            confidence: 0,
          },
        }

      default:
        return {
          success: false,
          error: `Unknown AI action: ${action}`,
        }
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute AI action for workflow
 */
export async function executeAIAction(
  context: ExecutionContext,
  config: AINodeData['aiConfig']
): Promise<AIResult> {
  const handler = new WorkflowAIHandler()
  return handler.execute(context, config)
}

// Export singleton
export const workflowAIHandler = new WorkflowAIHandler()
