/**
 * WhatsApp Single Product Message API
 * Purpose: Send single product message to a conversation
 * Date: 2026-01-24
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { QueryValidators } from '@/lib/supabase/server'
import type { SendProductMessageRequest } from '@/types/whatsapp-catalog'

// POST - Send single product message
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse request body
    const body: SendProductMessageRequest = await request.json()

    // Validate required fields
    if (!body.conversation_id || !body.product_retailer_id) {
      return NextResponse.json(
        { error: 'conversation_id and product_retailer_id are required' },
        { status: 400 }
      )
    }

    // Validate conversation_id is valid UUID
    const convValidation = QueryValidators.uuid(body.conversation_id)
    if (!convValidation.isValid) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    // Validate retailer_id length
    const retailerValidation = QueryValidators.text(body.product_retailer_id, 255)
    if (!retailerValidation.isValid) {
      return NextResponse.json({ error: 'Invalid product retailer ID' }, { status: 400 })
    }

    // Get conversation with contact info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        contact_id,
        contacts (
          phone_number
        )
      `)
      .eq('id', body.conversation_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const contact = conversation.contacts as { phone_number: string } | null
    if (!contact?.phone_number) {
      return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 })
    }

    // Get catalog config
    const { data: catalog, error: catalogError } = await supabase
      .from('whatsapp_catalogs')
      .select('catalog_id')
      .eq('organization_id', profile.organization_id)
      .single()

    if (catalogError || !catalog) {
      return NextResponse.json({ error: 'No catalog configured' }, { status: 400 })
    }

    // Get product to verify it exists
    const { data: product, error: productError } = await supabase
      .from('whatsapp_products')
      .select('id, retailer_id')
      .eq('organization_id', profile.organization_id)
      .eq('retailer_id', body.product_retailer_id)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get organization's WhatsApp config
    const { data: org } = await supabase
      .from('organizations')
      .select('whatsapp_phone_number_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    // Send message
    const client = await getWhatsAppClient(profile.organization_id)
    const messageId = await client.sendProductMessage(
      org.whatsapp_phone_number_id,
      contact.phone_number,
      catalog.catalog_id,
      body.product_retailer_id,
      {
        bodyText: body.body_text,
        footerText: body.footer_text
      }
    )

    // Create message record
    const { data: message } = await supabase
      .from('messages')
      .insert({
        conversation_id: body.conversation_id,
        organization_id: profile.organization_id,
        direction: 'outbound',
        content: body.body_text || `Product: ${product.retailer_id}`,
        message_type: 'interactive',
        status: 'sent',
        whatsapp_message_id: messageId,
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single()

    // Track product message
    await supabase
      .from('whatsapp_product_messages')
      .insert({
        organization_id: profile.organization_id,
        conversation_id: body.conversation_id,
        message_id: message?.id || null,
        message_type: 'single',
        product_ids: [product.id],
        retailer_ids: [product.retailer_id],
        catalog_id: catalog.catalog_id,
        body_text: body.body_text,
        footer_text: body.footer_text
      })

    return NextResponse.json({
      success: true,
      messageId,
      message_id: message?.id
    })

  } catch (error) {
    console.error('Product message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
