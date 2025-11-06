/**
 * AI Conversation Summarization
 * Automatically summarize conversations with key points and action items
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { openRouter } from './openrouter'
import { createClient } from '@/lib/supabase/server'
import type { ConversationContext, ConversationSummary } from './types'

/**
 * Summarize a conversation
 */
export async function summarizeConversation(
  context: ConversationContext
): Promise<ConversationSummary> {
  const startTime = Date.now()

  const systemPrompt = `Je bent een expert in het samenvatten van klantenservice gesprekken.
Maak een duidelijke, gestructureerde samenvatting die direct bruikbaar is.

Focus op:
- Kern van het gesprek (wat wilde de klant?)
- Belangrijke beslissingen en afspraken
- Wat is opgelost en wat nog open staat
- Concrete vervolgstappen

Wees beknopt maar compleet. Gebruik bullet points.`

  const conversationText = context.messages
    .map((msg, idx) => {
      const time = new Date(msg.timestamp).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return `[${time}] ${msg.sender === 'customer' ? 'Klant' : 'Agent'}: ${msg.content}`
    })
    .join('\n')

  const messageCount = context.messages.length
  const duration = calculateDuration(
    context.messages[0].timestamp,
    context.messages[messageCount - 1].timestamp
  )

  const userPrompt = `Vat dit klantenservice gesprek samen:

${conversationText}

Geef een samenvatting als JSON:
{
  "summary": "Korte samenvatting in 2-3 zinnen",
  "keyPoints": ["belangrijk punt 1", "belangrijk punt 2", "belangrijk punt 3"],
  "nextSteps": ["volgende actie 1", "volgende actie 2"],
  "resolvedIssues": ["opgelost probleem 1", "opgelost probleem 2"],
  "openQuestions": ["open vraag 1", "open vraag 2"]
}

Regels:
- keyPoints: 3-5 belangrijkste punten uit het gesprek
- nextSteps: Concrete acties die moeten gebeuren
- resolvedIssues: Wat is definitief opgelost
- openQuestions: Wat staat nog open of is onduidelijk
- Als een sectie leeg is, geef lege array []`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5,
        max_tokens: 1000,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let summaryData
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      summaryData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse summary JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    const summary: ConversationSummary = {
      summary: summaryData.summary,
      keyPoints: summaryData.keyPoints || [],
      nextSteps: summaryData.nextSteps || [],
      resolvedIssues: summaryData.resolvedIssues || [],
      openQuestions: summaryData.openQuestions || [],
      duration,
      messageCount,
    }

    // Log usage
    await openRouter.logUsage({
      feature: 'summary',
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        messageCount,
        duration,
      },
    })

    // Store in database
    await storeSummary(context.conversationId, summary)

    return summary
  } catch (error) {
    console.error('Summarization error:', error)
    throw new Error('Failed to summarize conversation')
  }
}

/**
 * Store summary in conversation metadata
 */
async function storeSummary(conversationId: string, summary: ConversationSummary): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('conversation_ai_metadata').upsert(
      {
        conversation_id: conversationId,
        summary: summary.summary,
        key_points: summary.keyPoints,
        next_steps: summary.nextSteps,
        resolved_issues: summary.resolvedIssues,
        open_questions: summary.openQuestions,
        last_analyzed_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id',
      }
    )
  } catch (error) {
    console.error('Failed to store summary:', error)
  }
}

/**
 * Calculate conversation duration
 */
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const diffMs = end - start

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Generate executive summary for multiple conversations
 */
export async function generateExecutiveSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalConversations: number
  avgDuration: string
  commonIssues: string[]
  resolvedRate: number
  urgentMatters: string[]
}> {
  try {
    const supabase = await createClient()

    // Get all conversations with metadata in date range
    const { data: metadata } = await supabase
      .from('conversation_ai_metadata')
      .select('*, conversations(*)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('conversations.organization_id', organizationId)

    if (!metadata || metadata.length === 0) {
      return {
        totalConversations: 0,
        avgDuration: '0m',
        commonIssues: [],
        resolvedRate: 0,
        urgentMatters: [],
      }
    }

    // Analyze metadata
    const totalConversations = metadata.length

    // Extract all key points and find common issues
    const allKeyPoints: string[] = []
    const allResolvedIssues: string[] = []
    const urgentMatters: string[] = []

    metadata.forEach(m => {
      if (m.key_points) allKeyPoints.push(...m.key_points)
      if (m.resolved_issues) allResolvedIssues.push(...m.resolved_issues)
      if (m.urgency === 'high' || m.urgency === 'critical') {
        if (m.open_questions) urgentMatters.push(...m.open_questions)
      }
    })

    // Find common issues (simple frequency count)
    const issueFrequency: Record<string, number> = {}
    allKeyPoints.forEach(point => {
      const normalized = point.toLowerCase()
      issueFrequency[normalized] = (issueFrequency[normalized] || 0) + 1
    })

    const commonIssues = Object.entries(issueFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue)

    // Calculate resolved rate
    const totalIssues = allKeyPoints.length
    const resolvedCount = allResolvedIssues.length
    const resolvedRate = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0

    return {
      totalConversations,
      avgDuration: 'N/A', // Would need actual duration data
      commonIssues,
      resolvedRate: Math.round(resolvedRate),
      urgentMatters: urgentMatters.slice(0, 10),
    }
  } catch (error) {
    console.error('Failed to generate executive summary:', error)
    throw new Error('Failed to generate executive summary')
  }
}
