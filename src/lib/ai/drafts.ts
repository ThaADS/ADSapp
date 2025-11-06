/**
 * AI Draft Suggestions
 * Generate intelligent response suggestions for agents
 */

import { openRouter } from './openrouter'
import type { ConversationContext, DraftSuggestion } from './types'

/**
 * Generate draft response suggestions for a conversation
 */
export async function generateDraftSuggestions(
  context: ConversationContext,
  count: number = 3
): Promise<DraftSuggestion[]> {
  const startTime = Date.now()

  const systemPrompt = `Je bent een professionele klantenservice assistent voor WhatsApp.
Genereer ${count} verschillende antwoord suggesties op het laatste bericht van de klant.

Richtlijnen:
- Wees behulpzaam, empathisch en professioneel
- Houd rekening met de conversatie context
- Varieer in toon: 1 professioneel, 1 vriendelijk, 1 empathisch
- Houd antwoorden kort (max 2-3 zinnen)
- Geef concrete oplossingen waar mogelijk
- Gebruik de naam van de klant als die bekend is`

  const conversationHistory = context.messages
    .slice(-5) // Last 5 messages for context
    .map(msg => `${msg.sender === 'customer' ? 'Klant' : 'Agent'}: ${msg.content}`)
    .join('\n')

  const customerName = context.customerName || 'de klant'

  const userPrompt = `Conversatie met ${customerName}:
${conversationHistory}

Genereer ${count} verschillende antwoord suggesties als JSON array:
[
  {
    "content": "Het antwoord tekst...",
    "tone": "professional/friendly/empathetic",
    "reasoning": "Korte uitleg waarom dit een goed antwoord is"
  }
]

Zorg ervoor dat de antwoorden:
1. Direct inspelen op de laatste vraag/opmerking
2. Verschillend zijn in aanpak en toon
3. Allemaal bruikbaar zijn
4. Professioneel maar menselijk klinken`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.8, // Higher for creative variety
        max_tokens: 1500,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content

    // Parse JSON response
    let suggestions
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      suggestions = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    // Log usage
    await openRouter.logUsage({
      feature: 'draft',
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        suggestionsCount: count,
        customerName: context.customerName,
      },
    })

    // Transform to DraftSuggestion format
    return suggestions.map((sug: any, index: number) => ({
      content: sug.content,
      confidence: 0.85 - index * 0.05, // Slightly decreasing confidence
      reasoning: sug.reasoning,
      tone: sug.tone,
    }))
  } catch (error) {
    console.error('Draft generation error:', error)
    throw new Error('Failed to generate draft suggestions')
  }
}

/**
 * Improve an existing draft based on feedback
 */
export async function improveDraft(
  originalDraft: string,
  feedback: string,
  organizationId: string
): Promise<string> {
  const systemPrompt = `Je bent een expert in het verfijnen van klantenservice berichten.
Verbeter het gegeven bericht op basis van de feedback.`

  const userPrompt = `Origineel bericht:
"${originalDraft}"

Feedback:
"${feedback}"

Geef een verbeterde versie die rekening houdt met de feedback.
Geef alleen de verbeterde tekst, geen uitleg.`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        max_tokens: 500,
      }
    )

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('Draft improvement error:', error)
    throw new Error('Failed to improve draft')
  }
}
