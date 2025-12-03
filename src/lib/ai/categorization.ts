/**
 * AI Automatic Categorization
 * Automatically categorize conversations by topic, issue type, and intent
 */

// @ts-nocheck - Database types need regeneration from Supabase schema

import { openRouter } from './openrouter'
import { createClient } from '@/lib/supabase/server'
import type { ConversationContext } from './types'

export interface ConversationCategory {
  primaryCategory: string
  subcategory?: string
  topics: string[]
  intent: string
  issueType?: string
  productService?: string
  priority: number // 1-10
  confidence: number // 0-1
  reasoning: string
}

// Predefined categories
export const CATEGORIES = {
  SALES: 'sales_inquiry',
  SUPPORT: 'support_request',
  BILLING: 'billing_question',
  FEEDBACK: 'product_feedback',
  COMPLAINT: 'complaint',
  GENERAL: 'general_question',
  EMERGENCY: 'emergency',
  APPOINTMENT: 'appointment_scheduling',
} as const

export const INTENTS = {
  INQUIRY: 'inquiry',
  REQUEST: 'request',
  COMPLAINT: 'complaint',
  FEEDBACK: 'feedback',
  PURCHASE: 'purchase',
  CANCEL: 'cancellation',
  REFUND: 'refund',
  HELP: 'help',
} as const

export const ISSUE_TYPES = {
  TECHNICAL: 'technical_issue',
  ACCOUNT: 'account_issue',
  PAYMENT: 'payment_issue',
  DELIVERY: 'delivery_issue',
  PRODUCT_QUALITY: 'product_quality',
  SERVICE_QUALITY: 'service_quality',
  AVAILABILITY: 'availability',
  OTHER: 'other',
} as const

/**
 * Categorize a conversation automatically
 */
export async function categorizeConversation(
  context: ConversationContext
): Promise<ConversationCategory> {
  const startTime = Date.now()

  const systemPrompt = `Je bent een expert in het categoriseren van klantenservice gesprekken.
Analyseer het gesprek en bepaal de juiste categorie, intent, en prioriteit.

Categorieën:
- sales_inquiry: Verkoop gerelateerde vragen (prijzen, producten, demo's)
- support_request: Technische hulp of ondersteuning
- billing_question: Facturering, betaling, abonnementen
- product_feedback: Product suggesties of feedback
- complaint: Klacht over product of service
- general_question: Algemene vragen
- emergency: Dringende problemen die direct aandacht nodig hebben
- appointment_scheduling: Afspraak maken of wijzigen

Intent types:
- inquiry: Informatie vragen
- request: Iets aanvragen (wijziging, actie)
- complaint: Klagen over iets
- feedback: Feedback geven
- purchase: Iets kopen
- cancellation: Iets opzeggen
- refund: Terugbetaling vragen
- help: Hulp nodig

Prioriteit (1-10):
- 1-3: Laag (algemene vragen, feedback)
- 4-6: Normaal (standaard support, sales)
- 7-8: Hoog (urgent issues, complaints)
- 9-10: Kritiek (noodgevallen, grote problemen)`

  const conversationText = context.messages
    .slice(-10) // Last 10 messages for context
    .map((msg, idx) => {
      return `${msg.sender === 'customer' ? 'Klant' : 'Agent'}: ${msg.content}`
    })
    .join('\n')

  const userPrompt = `Analyseer en categoriseer dit gesprek:

${conversationText}

Geef je analyse als JSON:
{
  "primaryCategory": "category_name",
  "subcategory": "optional subcategory",
  "topics": ["topic1", "topic2", "topic3"],
  "intent": "intent_type",
  "issueType": "issue_type (if applicable)",
  "productService": "specific product or service mentioned (if applicable)",
  "priority": 1-10,
  "confidence": 0.0-1.0,
  "reasoning": "1-2 zinnen waarom je deze categorie koos"
}

Regels:
- Gebruik exacte category names uit de lijst hierboven
- topics: 2-5 specifieke onderwerpen uit het gesprek
- priority: Gebaseerd op urgentie en impact
- confidence: Hoe zeker ben je van de categorisatie?
- Als er meerdere onderwerpen zijn, kies de belangrijkste als primary`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3, // Low for consistent categorization
        max_tokens: 500,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let categoryData
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      categoryData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse categorization JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    const result: ConversationCategory = {
      primaryCategory: categoryData.primaryCategory,
      subcategory: categoryData.subcategory,
      topics: categoryData.topics || [],
      intent: categoryData.intent,
      issueType: categoryData.issueType,
      productService: categoryData.productService,
      priority: categoryData.priority,
      confidence: categoryData.confidence,
      reasoning: categoryData.reasoning,
    }

    // Log usage
    await openRouter.logUsage({
      feature: 'categorization',
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        category: result.primaryCategory,
        priority: result.priority,
        confidence: result.confidence,
      },
    })

    // Store in database
    await storeCategorization(context.conversationId, result)

    return result
  } catch (error) {
    console.error('Categorization error:', error)
    throw new Error('Failed to categorize conversation')
  }
}

/**
 * Store categorization in conversation metadata
 */
async function storeCategorization(
  conversationId: string,
  category: ConversationCategory
): Promise<void> {
  try {
    const supabase = await createClient()

    // Update conversation metadata
    await supabase.from('conversation_ai_metadata').upsert(
      {
        conversation_id: conversationId,
        primary_intent: category.intent,
        topics: category.topics,
        priority_score: category.priority,
        last_analyzed_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id',
      }
    )

    // Also update conversation table with category and priority
    await supabase
      .from('conversations')
      .update({
        category: category.primaryCategory,
        priority: mapPriorityToLevel(category.priority),
      })
      .eq('id', conversationId)
  } catch (error) {
    console.error('Failed to store categorization:', error)
    // Don't fail main operation
  }
}

/**
 * Map numeric priority (1-10) to text level
 */
function mapPriorityToLevel(priority: number): string {
  if (priority >= 9) return 'urgent'
  if (priority >= 7) return 'high'
  if (priority >= 4) return 'normal'
  return 'low'
}

/**
 * Batch categorize multiple conversations
 */
export async function batchCategorizeConversations(
  organizationId: string,
  conversationIds: string[]
): Promise<{
  success: number
  failed: number
  results: Array<{ conversationId: string; category: ConversationCategory | null; error?: string }>
}> {
  const results = []
  let success = 0
  let failed = 0

  for (const conversationId of conversationIds) {
    try {
      // Get conversation messages
      const supabase = await createClient()
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .eq('id', conversationId)
        .single()

      if (!conversation) {
        failed++
        results.push({
          conversationId,
          category: null,
          error: 'Conversation not found',
        })
        continue
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (!messages || messages.length === 0) {
        failed++
        results.push({
          conversationId,
          category: null,
          error: 'No messages found',
        })
        continue
      }

      const context: ConversationContext = {
        organizationId,
        conversationId,
        messages: messages.map(m => ({
          sender: m.is_from_contact ? 'customer' : 'agent',
          content: m.content || '',
          timestamp: m.created_at,
        })),
      }

      const category = await categorizeConversation(context)
      success++
      results.push({
        conversationId,
        category,
      })
    } catch (error) {
      failed++
      results.push({
        conversationId,
        category: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { success, failed, results }
}

/**
 * Get categorization statistics for an organization
 */
export async function getCategorizationStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCategorized: number
  byCategory: Record<string, number>
  byIntent: Record<string, number>
  averagePriority: number
  averageConfidence: number
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('conversations')
      .select('category, conversation_ai_metadata(primary_intent, priority_score, sentiment_confidence)')
      .eq('organization_id', organizationId)
      .not('category', 'is', null)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data: conversations } = await query

    if (!conversations || conversations.length === 0) {
      return {
        totalCategorized: 0,
        byCategory: {},
        byIntent: {},
        averagePriority: 0,
        averageConfidence: 0,
      }
    }

    // Aggregate statistics
    const byCategory: Record<string, number> = {}
    const byIntent: Record<string, number> = {}
    let totalPriority = 0
    let totalConfidence = 0
    let countWithMetadata = 0

    conversations.forEach(conv => {
      // Count by category
      if (conv.category) {
        byCategory[conv.category] = (byCategory[conv.category] || 0) + 1
      }

      // Count by intent and aggregate metrics
      if (conv.conversation_ai_metadata) {
        const metadata = Array.isArray(conv.conversation_ai_metadata)
          ? conv.conversation_ai_metadata[0]
          : conv.conversation_ai_metadata

        if (metadata) {
          if (metadata.primary_intent) {
            byIntent[metadata.primary_intent] = (byIntent[metadata.primary_intent] || 0) + 1
          }
          if (metadata.priority_score) {
            totalPriority += metadata.priority_score
            countWithMetadata++
          }
          if (metadata.sentiment_confidence) {
            totalConfidence += metadata.sentiment_confidence
          }
        }
      }
    })

    return {
      totalCategorized: conversations.length,
      byCategory,
      byIntent,
      averagePriority: countWithMetadata > 0 ? totalPriority / countWithMetadata : 0,
      averageConfidence: countWithMetadata > 0 ? totalConfidence / countWithMetadata : 0,
    }
  } catch (error) {
    console.error('Failed to get categorization stats:', error)
    throw new Error('Failed to get categorization statistics')
  }
}

/**
 * Suggest category based on partial conversation (for real-time suggestions)
 */
export async function suggestCategory(messages: Array<{ sender: string; content: string }>): Promise<{
  suggestedCategory: string
  confidence: number
}> {
  // Quick categorization based on keywords (no AI call for performance)
  const allText = messages
    .filter(m => m.sender === 'customer')
    .map(m => m.content.toLowerCase())
    .join(' ')

  // Sales keywords
  if (
    allText.match(/\b(prijs|kost|betalen|kopen|aankoop|demo|informatie|product)\b/i)
  ) {
    return { suggestedCategory: CATEGORIES.SALES, confidence: 0.7 }
  }

  // Support keywords
  if (
    allText.match(
      /\b(help|probleem|werkt niet|fout|error|bug|kapot|storing)\b/i
    )
  ) {
    return { suggestedCategory: CATEGORIES.SUPPORT, confidence: 0.75 }
  }

  // Billing keywords
  if (
    allText.match(
      /\b(factuur|betaling|abonnement|opzeggen|terugbetaling|refund)\b/i
    )
  ) {
    return { suggestedCategory: CATEGORIES.BILLING, confidence: 0.8 }
  }

  // Complaint keywords
  if (
    allText.match(
      /\b(klacht|teleurgesteld|slecht|boos|ontevreden|verschrikkelijk)\b/i
    )
  ) {
    return { suggestedCategory: CATEGORIES.COMPLAINT, confidence: 0.75 }
  }

  // Emergency keywords
  if (allText.match(/\b(urgent|spoed|direct|nu|onmiddellijk|noodgeval)\b/i)) {
    return { suggestedCategory: CATEGORIES.EMERGENCY, confidence: 0.85 }
  }

  // Default
  return { suggestedCategory: CATEGORIES.GENERAL, confidence: 0.5 }
}
