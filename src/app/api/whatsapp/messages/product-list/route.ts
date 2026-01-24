/**
 * WhatsApp Multi-Product Message API
 * Purpose: Send multi-product list message with sections to a conversation
 * Date: 2026-01-24
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { QueryValidators } from '@/lib/supabase/server'
import type { SendProductListMessageRequest, ProductSection } from '@/types/whatsapp-catalog'
import {
  MAX_SECTIONS_PER_MESSAGE,
  MAX_PRODUCTS_PER_MESSAGE,
  MAX_BODY_TEXT_LENGTH,
  MAX_FOOTER_TEXT_LENGTH
} from '@/types/whatsapp-catalog'

// POST - Send multi-product list message
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
    const body: SendProductListMessageRequest = await request.json()

    // Validate required fields
    if (!body.conversation_id || !body.header_text || !body.body_text || !body.sections?.length) {
      return NextResponse.json(
        { error: 'conversation_id, header_text, body_text, and sections are required' },
        { status: 400 }
      )
    }

    // Validate conversation_id is valid UUID
    const convValidation = QueryValidators.uuid(body.conversation_id)
    if (!convValidation.isValid) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    // Validate text lengths
    if (body.body_text.length > MAX_BODY_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Body text exceeds maximum of ${MAX_BODY_TEXT_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (body.footer_text && body.footer_text.length > MAX_FOOTER_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Footer text exceeds maximum of ${MAX_FOOTER_TEXT_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Validate sections constraints
    if (body.sections.length > MAX_SECTIONS_PER_MESSAGE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SECTIONS_PER_MESSAGE} sections allowed` },
        { status: 400 }
      )
    }

    const allProductIds = body.sections.flatMap(s => s.product_retailer_ids)
    if (allProductIds.length > MAX_PRODUCTS_PER_MESSAGE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PRODUCTS_PER_MESSAGE} products allowed` },
        { status: 400 }
      )
    }

    if (allProductIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one product is required' },
        { status: 400 }
      )
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

    // Verify all products exist
    const { data: products, error: productsError } = await supabase
      .from('whatsapp_products')
      .select('id, retailer_id')
      .eq('organization_id', profile.organization_id)
      .in('retailer_id', allProductIds)
      .eq('is_active', true)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to verify products' }, { status: 500 })
    }

    if (!products || products.length !== allProductIds.length) {
      const foundIds = (products || []).map(p => p.retailer_id)
      const missingIds = allProductIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Products not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
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

    // Convert sections format for WhatsApp API
    const sections: ProductSection[] = body.sections.map(section => ({
      title: section.title,
      product_items: section.product_retailer_ids.map(id => ({
        product_retailer_id: id
      }))
    }))

    // Send message
    const client = await getWhatsAppClient(profile.organization_id)
    const messageId = await client.sendProductListMessage(
      org.whatsapp_phone_number_id,
      contact.phone_number,
      catalog.catalog_id,
      sections,
      {
        headerText: body.header_text,
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
        content: body.body_text,
        message_type: 'interactive',
        status: 'sent',
        whatsapp_message_id: messageId,
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single()

    // Track product message
    const productMap = new Map(products.map(p => [p.retailer_id, p.id]))
    await supabase
      .from('whatsapp_product_messages')
      .insert({
        organization_id: profile.organization_id,
        conversation_id: body.conversation_id,
        message_id: message?.id || null,
        message_type: 'multi',
        product_ids: allProductIds.map(id => productMap.get(id)).filter(Boolean),
        retailer_ids: allProductIds,
        catalog_id: catalog.catalog_id,
        header_text: body.header_text,
        body_text: body.body_text,
        footer_text: body.footer_text,
        sections: body.sections
      })

    return NextResponse.json({
      success: true,
      messageId,
      message_id: message?.id,
      products_sent: allProductIds.length
    })

  } catch (error) {
    console.error('Product list message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
