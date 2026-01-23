/**
 * AI Template Generation API
 * Generate WhatsApp Business message templates with AI
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateTemplate,
  improveTemplate,
  generateTemplateVariations,
  analyzeTemplateEffectiveness,
} from '@/lib/ai/templates'
import type { TemplateGenerationRequest } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { action = 'generate' } = body

    // Handle template improvement
    if (action === 'improve') {
      const { templateId, performanceData } = body

      if (!templateId || !performanceData) {
        return Response.json(
          {
            error: 'templateId and performanceData are required for improvement',
          },
          { status: 400 }
        )
      }

      // Get existing template
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('content, organization_id')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return Response.json({ error: 'Template not found' }, { status: 404 })
      }

      if (template.organization_id !== profile.organization_id) {
        return Response.json({ error: 'Access denied' }, { status: 403 })
      }

      // Improve template
      const improvedTemplate = await improveTemplate(
        template.content,
        performanceData,
        profile.organization_id
      )

      return Response.json({
        success: true,
        improvedTemplate,
        originalTemplate: template.content,
        action: 'improve',
      })
    }

    // Handle template variations (A/B testing)
    if (action === 'variations') {
      const { templateId, count = 3 } = body

      if (!templateId) {
        return Response.json(
          {
            error: 'templateId is required for variations',
          },
          { status: 400 }
        )
      }

      // Get existing template
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('content, organization_id')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return Response.json({ error: 'Template not found' }, { status: 404 })
      }

      if (template.organization_id !== profile.organization_id) {
        return Response.json({ error: 'Access denied' }, { status: 403 })
      }

      // Generate variations
      const variations = await generateTemplateVariations(
        template.content,
        count,
        profile.organization_id
      )

      return Response.json({
        success: true,
        variations,
        baseTemplate: template.content,
        count: variations.length,
        action: 'variations',
      })
    }

    // Handle template effectiveness analysis
    if (action === 'analyze') {
      const { templateId, usageData } = body

      if (!templateId || !usageData) {
        return Response.json(
          {
            error: 'templateId and usageData are required for analysis',
          },
          { status: 400 }
        )
      }

      // Get existing template
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('content, organization_id')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return Response.json({ error: 'Template not found' }, { status: 404 })
      }

      if (template.organization_id !== profile.organization_id) {
        return Response.json({ error: 'Access denied' }, { status: 403 })
      }

      // Analyze effectiveness
      const analysis = await analyzeTemplateEffectiveness(template.content, usageData)

      // Update effectiveness score in database
      await supabase
        .from('message_templates')
        .update({
          effectiveness_score: analysis.score / 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)

      return Response.json({
        success: true,
        analysis,
        templateId,
        action: 'analyze',
      })
    }

    // Handle template generation (default action)
    const { purpose, tone, language, maxLength } = body

    if (!purpose) {
      return Response.json(
        {
          error: 'purpose is required for template generation',
        },
        { status: 400 }
      )
    }

    const request: TemplateGenerationRequest = {
      purpose,
      tone: tone || 'professional',
      language: language || 'nl',
      maxLength: maxLength || 160,
    }

    // Generate template
    const generatedTemplate = await generateTemplate(request, profile.organization_id)

    // Optionally save to database
    if (body.saveToDatabase !== false) {
      const { data: savedTemplate, error: saveError } = await supabase
        .from('message_templates')
        .insert({
          organization_id: profile.organization_id,
          name: generatedTemplate.name,
          content: generatedTemplate.content,
          variables: generatedTemplate.variables,
          category: body.category || 'quick_reply',
          ai_generated: true,
          ai_prompt: purpose,
          ai_model: 'openrouter',
          effectiveness_score: generatedTemplate.estimatedPerformance
            ? generatedTemplate.estimatedPerformance / 100
            : null,
          created_by: user.id,
        })
        .select()
        .single()

      if (saveError) {
        console.error('Failed to save template:', saveError)
      } else {
        generatedTemplate.id = savedTemplate.id
      }
    }

    return Response.json({
      success: true,
      template: generatedTemplate,
      saved: body.saveToDatabase !== false,
      action: 'generate',
    })
  } catch (error) {
    console.error('Template generation error:', error)
    return Response.json(
      {
        error: 'Failed to process template request',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
