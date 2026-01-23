/**
 * AI Sentiment Analysis
 * Analyze customer sentiment and urgency from conversations
 */

import { openRouter } from './openrouter'
import { createClient } from '@/lib/supabase/server'
import type { ConversationContext, SentimentAnalysis } from './types'

/**
 * Analyze sentiment of a conversation
 */
export async function analyzeSentiment(context: ConversationContext): Promise<SentimentAnalysis> {
  const startTime = Date.now()

  const systemPrompt = `Je bent een expert in sentiment analyse voor klantenservice.
Analyseer de emotionele toon van klant berichten nauwkeurig.

Sentiment score schaal:
- 1.0: Zeer positief (blij, dankbaar, tevreden)
- 0.5: Licht positief (vriendelijk, beleefd)
- 0.0: Neutraal (informatief, zakelijk)
- -0.5: Licht negatief (teleurgesteld, gefrustreerd)
- -1.0: Zeer negatief (boos, zeer ontevreden)

Urgentie levels:
- low: Algemene vraag, geen haast
- medium: Wil snel antwoord, maar niet kritiek
- high: Probleem moet snel opgelost, klant is gefrustreerd
- critical: Zeer dringend, klant is boos of heeft groot probleem`

  const customerMessages = context.messages
    .filter(msg => msg.sender === 'customer')
    .slice(-5) // Last 5 customer messages
    .map((msg, idx) => `Bericht ${idx + 1}: ${msg.content}`)
    .join('\n\n')

  const userPrompt = `Analyseer de sentiment van deze klant berichten:

${customerMessages}

Geef je analyse als JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": -1.0 tot 1.0,
  "confidence": 0.0 tot 1.0,
  "topics": ["topic1", "topic2"],
  "urgency": "low|medium|high|critical",
  "reasoning": "Korte uitleg van je analyse (1-2 zinnen)"
}

Let op:
- Wees accuraat in je score
- Identificeer concrete topics
- Bepaal urgency gebaseerd op taalgebruik en situatie
- Geef confidence score gebaseerd op hoe duidelijk de sentiment is`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3, // Low for consistent analysis
        max_tokens: 500,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let analysis
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      analysis = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse sentiment analysis JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    const result: SentimentAnalysis = {
      sentiment: analysis.sentiment,
      score: analysis.score,
      confidence: analysis.confidence,
      topics: analysis.topics || [],
      urgency: analysis.urgency,
      reasoning: analysis.reasoning,
    }

    // Log usage
    await openRouter.logUsage({
      feature: 'sentiment',
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        sentiment: result.sentiment,
        score: result.score,
        urgency: result.urgency,
      },
    })

    // Store in database
    await storeSentimentAnalysis(context.conversationId, result)

    return result
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    throw new Error('Failed to analyze sentiment')
  }
}

/**
 * Store sentiment analysis in conversation metadata
 */
async function storeSentimentAnalysis(
  conversationId: string,
  analysis: SentimentAnalysis
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('conversation_ai_metadata').upsert(
      {
        conversation_id: conversationId,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.score,
        sentiment_confidence: analysis.confidence,
        topics: analysis.topics,
        urgency: analysis.urgency,
        last_analyzed_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id',
      }
    )
  } catch (error) {
    console.error('Failed to store sentiment analysis:', error)
    // Don't fail main operation
  }
}

/**
 * Get sentiment trend over time for a conversation
 */
export async function getSentimentTrend(conversationId: string): Promise<{
  current: SentimentAnalysis | null
  history: Array<{ timestamp: string; score: number }>
}> {
  try {
    const supabase = await createClient()

    // Get current sentiment
    const { data: metadata } = await supabase
      .from('conversation_ai_metadata')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    const current = metadata
      ? {
          sentiment: metadata.sentiment as SentimentAnalysis['sentiment'],
          score: metadata.sentiment_score || 0,
          confidence: metadata.sentiment_confidence || 0,
          topics: metadata.topics || [],
          urgency: metadata.urgency as SentimentAnalysis['urgency'],
        }
      : null

    // Get historical sentiment from ai_responses
    const { data: history } = await supabase
      .from('ai_responses')
      .select('created_at, metadata')
      .eq('conversation_id', conversationId)
      .eq('feature', 'sentiment')
      .order('created_at', { ascending: true })

    const sentimentHistory = (history || []).map(record => ({
      timestamp: record.created_at,
      score: record.metadata?.score || 0,
    }))

    return { current, history: sentimentHistory }
  } catch (error) {
    console.error('Failed to get sentiment trend:', error)
    return { current: null, history: [] }
  }
}
