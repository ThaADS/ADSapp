/**
 * AI Template Generation
 * Generate WhatsApp Business message templates with AI
 */

import { openRouter } from './openrouter';
import type { TemplateGenerationRequest, GeneratedTemplate } from './types';

/**
 * Generate a WhatsApp Business message template
 */
export async function generateTemplate(
  request: TemplateGenerationRequest,
  organizationId: string
): Promise<GeneratedTemplate> {
  const startTime = Date.now();

  const {
    purpose,
    tone = 'professional',
    language = 'nl',
    maxLength = 160,
  } = request;

  const toneDescriptions = {
    professional: 'zakelijk en professioneel',
    friendly: 'vriendelijk en warm',
    casual: 'casual en toegankelijk',
  };

  const systemPrompt = `Je bent een expert in het schrijven van WhatsApp Business templates.
Schrijf effectieve, compliant templates die goed converteren.

WhatsApp Business Policy regels:
- Maximaal 1024 karakters (maar streef naar ${maxLength})
- Geen misleidende informatie
- Duidelijke opt-out optie waar nodig
- Gebruik variabelen voor personalisatie: {{1}}, {{2}}, etc.
- Categories: MARKETING, UTILITY, AUTHENTICATION

Template best practices:
- Begin met een duidelijke opening
- Een bericht, één doel
- Gebruik emoji's spaarzaam
- Call-to-action aan het eind
- Personaliseer met naam waar mogelijk`;

  const userPrompt = `Genereer een WhatsApp Business template voor: ${purpose}

Requirements:
- Toon: ${toneDescriptions[tone]}
- Taal: ${language === 'nl' ? 'Nederlands' : language}
- Max lengte: ${maxLength} karakters
- Gebruik variabelen voor personalisatie

Geef het resultaat als JSON:
{
  "name": "template_naam_lowercase_underscore",
  "content": "Template tekst met {{1}} variabelen en ⚡ emoji waar gepast",
  "variables": ["klant_naam", "product_naam"],
  "category": "MARKETING|UTILITY|AUTHENTICATION",
  "estimatedPerformance": 85
}

Regels:
- name: lowercase met underscores, beschrijvend
- content: Directe template tekst, geen quotes
- variables: Lijst van wat elke {{nummer}} voorstelt
- category: Kies meest passende categorie
- estimatedPerformance: 0-100 score (hoger = beter)`;

  try {
    const response = await openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 800
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0].message.content;

    // Parse JSON response
    let templateData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      templateData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse template JSON:', content);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate template
    if (templateData.content.length > 1024) {
      throw new Error('Generated template exceeds WhatsApp maximum length of 1024 characters');
    }

    const template: GeneratedTemplate = {
      name: templateData.name,
      content: templateData.content,
      variables: templateData.variables || [],
      category: templateData.category,
      estimatedPerformance: templateData.estimatedPerformance || 75,
    };

    // Log usage
    await openRouter.logUsage({
      feature: 'template',
      organizationId,
      model: response.model,
      prompt: systemPrompt + '\n\n' + userPrompt,
      response: content,
      tokensUsed: response.usage.total_tokens,
      latencyMs: latency,
      metadata: {
        purpose,
        tone,
        language,
        templateName: template.name,
      },
    });

    return template;

  } catch (error) {
    console.error('Template generation error:', error);
    throw new Error('Failed to generate template');
  }
}

/**
 * Improve an existing template based on performance data
 */
export async function improveTemplate(
  existingTemplate: string,
  performanceData: {
    openRate: number;
    clickRate: number;
    responseRate: number;
    feedback: string[];
  },
  organizationId: string
): Promise<string> {
  const systemPrompt = `Je bent een expert in het optimaliseren van WhatsApp templates.
Analyseer performance data en verbeter de template.`;

  const userPrompt = `Huidige template:
"${existingTemplate}"

Performance metrics:
- Open rate: ${performanceData.openRate}%
- Click rate: ${performanceData.clickRate}%
- Response rate: ${performanceData.responseRate}%

Feedback van gebruikers:
${performanceData.feedback.join('\n')}

Geef een verbeterde versie die:
1. De zwakke punten aanpakt
2. De sterke punten behoudt
3. Beter converteert

Geef alleen de verbeterde template tekst, behoud variabelen {{1}}, {{2}}, etc.`;

  try {
    const response = await openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.6,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error('Template improvement error:', error);
    throw new Error('Failed to improve template');
  }
}

/**
 * Generate template variations for A/B testing
 */
export async function generateTemplateVariations(
  baseTemplate: string,
  count: number = 3,
  organizationId: string
): Promise<string[]> {
  const systemPrompt = `Je bent een expert in A/B testing voor marketing templates.
Genereer variaties die verschillend genoeg zijn om te testen, maar de kern behouden.`;

  const userPrompt = `Basis template:
"${baseTemplate}"

Genereer ${count} variaties voor A/B testing.

Varieer in:
- Opening (vraag vs statement)
- Emoji gebruik
- Call-to-action formulering
- Urgentie niveau

Geef als JSON array:
["variatie 1 tekst", "variatie 2 tekst", "variatie 3 tekst"]

Behoud variabelen {{1}}, {{2}}, etc. op dezelfde posities.`;

  try {
    const response = await openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.8, // Higher for more variation
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;

    // Parse JSON array
    let variations;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      variations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse variations JSON:', content);
      throw new Error('AI returned invalid JSON format');
    }

    return variations.slice(0, count);

  } catch (error) {
    console.error('Template variation error:', error);
    throw new Error('Failed to generate template variations');
  }
}

/**
 * Analyze template effectiveness based on usage data
 */
export async function analyzeTemplateEffectiveness(
  template: string,
  usageData: {
    timesSent: number;
    responses: number;
    avgResponseTime: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }
): Promise<{
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}> {
  const responseRate = usageData.timesSent > 0
    ? (usageData.responses / usageData.timesSent) * 100
    : 0;

  // Calculate base score
  let score = 50;

  // Adjust for response rate
  if (responseRate > 50) score += 20;
  else if (responseRate > 30) score += 10;
  else if (responseRate < 10) score -= 20;

  // Adjust for response time
  if (usageData.avgResponseTime < 60) score += 10;
  else if (usageData.avgResponseTime > 300) score -= 10;

  // Adjust for sentiment
  if (usageData.sentiment === 'positive') score += 15;
  else if (usageData.sentiment === 'negative') score -= 15;

  // Cap score between 0-100
  score = Math.max(0, Math.min(100, score));

  // Generate insights
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (responseRate > 40) {
    strengths.push('Hoge response rate - bericht triggert actie');
  } else if (responseRate < 15) {
    weaknesses.push('Lage response rate - bericht spreekt niet aan');
    recommendations.push('Voeg een duidelijkere call-to-action toe');
  }

  if (usageData.avgResponseTime < 120) {
    strengths.push('Snelle response tijd - urgentie wordt gevoeld');
  }

  if (usageData.sentiment === 'positive') {
    strengths.push('Positieve sentiment - tone resonates met ontvangers');
  } else if (usageData.sentiment === 'negative') {
    weaknesses.push('Negatieve sentiment - tone past mogelijk niet');
    recommendations.push('Overweeg een vriendelijkere of empathischere toon');
  }

  if (template.length > 200) {
    weaknesses.push('Template is relatief lang - kan overweldigend zijn');
    recommendations.push('Overweeg het bericht te verkorten tot de essentie');
  }

  return {
    score,
    strengths,
    weaknesses,
    recommendations,
  };
}
