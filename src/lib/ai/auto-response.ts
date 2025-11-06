/**
 * AI Auto-Response System
 * Automatically respond to messages outside business hours or when no agent available
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { openRouter } from './openrouter'
import { createClient } from '@/lib/supabase/server'
import type { ConversationContext, AutoResponseConfig } from './types'

/**
 * Check if auto-response should be triggered
 */
export async function shouldAutoRespond(
  conversationId: string,
  organizationId: string
): Promise<{ should: boolean; reason?: string; config?: AutoResponseConfig }> {
  try {
    const supabase = await createClient()

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (!aiSettings?.enabled || !aiSettings?.auto_response_enabled) {
      return { should: false, reason: 'Auto-response disabled' }
    }

    const conditions = aiSettings.auto_response_conditions as AutoResponseConfig['conditions']
    const config: AutoResponseConfig = {
      enabled: true,
      conditions,
      tone: aiSettings.auto_response_tone as AutoResponseConfig['tone'],
      language: aiSettings.auto_response_language,
    }

    // Check: Outside business hours?
    if (conditions.outsideBusinessHours) {
      const { data: org } = await supabase
        .from('organizations')
        .select('business_hours')
        .eq('id', organizationId)
        .single()

      if (org?.business_hours && !isWithinBusinessHours(org.business_hours)) {
        return { should: true, reason: 'Outside business hours', config }
      }
    }

    // Check: No agent available?
    if (conditions.noAgentAvailable) {
      const { data: activeAgents } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('role', ['agent', 'admin', 'owner'])

      if (!activeAgents || activeAgents.length === 0) {
        return { should: true, reason: 'No agents available', config }
      }
    }

    // Check: Queue time exceeded?
    if (conditions.maxQueueTime) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('created_at, last_message_at')
        .eq('id', conversationId)
        .single()

      if (conversation) {
        const waitTime =
          Date.now() - new Date(conversation.last_message_at || conversation.created_at).getTime()
        const maxWaitMs = conditions.maxQueueTime * 60 * 1000

        if (waitTime > maxWaitMs) {
          return {
            should: true,
            reason: `Queue time exceeded (${Math.floor(waitTime / 60000)} min)`,
            config,
          }
        }
      }
    }

    return { should: false, reason: 'All conditions not met' }
  } catch (error) {
    console.error('Auto-response check error:', error)
    return { should: false, reason: 'Error checking conditions' }
  }
}

/**
 * Generate an automatic response
 */
export async function generateAutoResponse(
  context: ConversationContext,
  config: AutoResponseConfig
): Promise<string> {
  const startTime = Date.now()

  const toneInstructions = {
    professional: 'Gebruik een professionele, formele toon zoals een bedrijfsmedewerker',
    friendly: 'Gebruik een vriendelijke, warme toon zoals een behulpzame vriend',
    casual: 'Gebruik een casual, toegankelijke toon zoals een collega',
  }

  const systemPrompt = `Je bent een AI assistent voor WhatsApp klantenservice.
${toneInstructions[config.tone]}.
Communiceer in het ${config.language === 'nl' ? 'Nederlands' : config.language}.

Belangrijke regels:
1. Wees duidelijk dat dit een automatisch bericht is
2. Wees behulpzaam en empathisch
3. Geef aan wanneer een menselijke agent beschikbaar is
4. Houd het kort (max 3 zinnen)
5. Bied geen valse beloften
6. Geef nuttige informatie als dat mogelijk is`

  const lastMessage = context.messages[context.messages.length - 1]
  const customerName = context.customerName ? ` ${context.customerName}` : ''

  const userPrompt = `De klant${customerName} heeft zojuist dit bericht gestuurd:
"${lastMessage.content}"

Genereer een automatisch antwoord dat:
1. Erkent hun bericht
2. Vertelt dat dit een automatisch antwoord is
3. Geeft aan wanneer een agent beschikbaar is (binnen 24 uur)
4. Geeft eventueel nuttige informatie of richt naar FAQ

Geef alleen de bericht tekst, geen uitleg of quotes.`

  try {
    const response = await openRouter.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5, // Lower for consistency
        max_tokens: 300,
      }
    )

    const latency = Date.now() - startTime
    const content = response.choices[0].message.content.trim()

    // Log usage
    await openRouter.logUsage({
      feature: 'auto_response',
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        tone: config.tone,
        language: config.language,
      },
    })

    return content
  } catch (error) {
    console.error('Auto-response generation error:', error)
    // Return a fallback message
    const fallbackMessage =
      config.language === 'nl'
        ? `Bedankt voor je bericht! Dit is een automatisch antwoord. Een van onze medewerkers zal binnen 24 uur contact met je opnemen. Voor dringende zaken kun je ons ook bellen.`
        : `Thank you for your message! This is an automatic response. One of our team members will contact you within 24 hours. For urgent matters, you can also call us.`

    return fallbackMessage
  }
}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHours(businessHours: any): boolean {
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()]
  const currentTime = now.getHours() * 100 + now.getMinutes() // e.g., 14:30 = 1430

  const daySchedule = businessHours[currentDay]

  if (!daySchedule || !daySchedule.enabled) {
    return false // Day is closed
  }

  // Parse time strings like "09:00" to 900
  const openTime = parseInt(daySchedule.open.replace(':', ''))
  const closeTime = parseInt(daySchedule.close.replace(':', ''))

  return currentTime >= openTime && currentTime <= closeTime
}
