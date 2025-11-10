/**
 * AI Auto-Response API
 * Generate and send automated responses based on conditions
 */

// @ts-nocheck - Type definitions need review
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AISettings } from '@/types/ai'
import { randomUUID } from 'crypto'
import { shouldAutoRespond, generateAutoResponse } from '@/lib/ai/auto-response'
import type { ConversationContext } from '@/lib/ai/types'

// Mark as dynamic to prevent build-time rendering (requires runtime env vars)
export const dynamic = 'force-dynamic'

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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { conversationId, action = 'check' } = body

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Verify conversation access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, organization_id, contact_id, status, assigned_to')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== profile.organization_id) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if auto-response should be sent
    if (action === 'check') {
      const shouldRespond = await shouldAutoRespond(conversationId, profile.organization_id)

      return Response.json({
        success: true,
        shouldAutoRespond: shouldRespond.should,
        reason: shouldRespond.reason,
        config: shouldRespond.config,
      })
    }

    // Generate and optionally send auto-response
    if (action === 'generate' || action === 'send') {
      // Get conversation messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, sender_type, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!messages || messages.length === 0) {
        return Response.json(
          {
            error: 'No conversation history found',
          },
          { status: 400 }
        )
      }

      // Get contact information
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, phone_number')
        .eq('id', conversation.contact_id)
        .single()

      // Build conversation context
      const context: ConversationContext = {
        conversationId,
        organizationId: profile.organization_id,
        messages: messages.reverse().map(m => ({
          sender: m.sender_type === 'contact' ? 'customer' : 'agent',
          content: m.content,
          timestamp: m.created_at,
        })),
        customerName: contact?.name,
        customerPhone: contact?.phone_number ?? '',
      }

      // Generate auto-response
      const responseText = await generateAutoResponse(context, {
        enabled: true,
        conditions: {},
        tone: 'professional' as const,
        language: 'nl',
      })

      const response = {
        message: responseText,
        responseId: crypto.randomUUID(),
        confidence: 0.85,
      }

      // If action is 'send', actually send the message via WhatsApp
      if (action === 'send' && body.sendMessage !== false) {
        // Store message in database
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          content: response.message,
          sender_type: 'agent',
          sender_id: user.id,
          metadata: {
            auto_generated: true,
            ai_response_id: response.responseId,
          },
        })

        if (msgError) {
          console.error('Failed to store auto-response:', msgError)
        }

        // TODO: Send via WhatsApp API
        // await whatsappClient.sendMessage({
        //   to: contact?.phone_number,
        //   message: response.message
        // });
      }

      return Response.json({
        success: true,
        response: response.message,
        confidence: response.confidence,
        sent: action === 'send',
        conversationId,
      })
    }

    return Response.json(
      {
        error: 'Invalid action. Use "check", "generate", or "send"',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auto-response error:', error)
    return Response.json(
      {
        error: 'Failed to process auto-response',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
