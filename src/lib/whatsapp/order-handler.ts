/**
 * WhatsApp Order Handler
 *
 * Handles cart/order webhooks when customers submit their shopping cart.
 * Processes order data and creates messages for agent visibility.
 */

import { createClient } from '@/lib/supabase/server'
import type { CartData, CartItem } from '@/types/whatsapp-catalog'

// =====================================================
// TYPES
// =====================================================

/**
 * Order payload received from WhatsApp webhook
 */
export interface OrderWebhookPayload {
  catalog_id: string
  product_items: {
    product_retailer_id: string
    quantity: number
    item_price: number
    currency: string
  }[]
  text?: string
}

/**
 * Result of order processing
 */
export interface OrderHandlerResult {
  success: boolean
  conversationId?: string
  messageId?: string
  error?: string
}

// =====================================================
// MAIN HANDLER
// =====================================================

/**
 * Handle a cart order webhook from WhatsApp
 * Called when customer sends their cart after adding products
 *
 * @param organizationId - Organization receiving the order
 * @param contactId - Contact who placed the order
 * @param order - Order payload with cart items
 * @param messageTimestamp - Timestamp of the order message (ISO string)
 */
export async function handleCartOrder(
  organizationId: string,
  contactId: string,
  order: OrderWebhookPayload,
  messageTimestamp: string
): Promise<OrderHandlerResult> {
  const supabase = await createClient()

  try {
    // 1. Find or create conversation with contact
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('contact_id', contactId)
      .in('status', ['open', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let conversationId: string

    if (!existingConversation) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          contact_id: contactId,
          status: 'open',
          last_message_at: messageTimestamp,
        })
        .select('id')
        .single()

      if (createError || !newConversation) {
        console.error('Failed to create conversation:', createError)
        return { success: false, error: 'Failed to create conversation' }
      }
      conversationId = newConversation.id
    } else {
      conversationId = existingConversation.id

      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ last_message_at: messageTimestamp })
        .eq('id', conversationId)
    }

    // 2. Calculate order total
    const totalAmount = order.product_items.reduce(
      (sum, item) => sum + item.item_price * item.quantity,
      0
    )
    const currency = order.product_items[0]?.currency || 'USD'

    // 3. Format order summary for message content
    const orderSummary = formatOrderSummary(order)

    // 4. Create message record
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'contact',
        content: orderSummary,
        message_type: 'order',
        created_at: messageTimestamp,
        metadata: {
          order: {
            catalog_id: order.catalog_id,
            total_amount: totalAmount,
            currency: currency,
            item_count: order.product_items.length,
            text: order.text,
          },
        },
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('Failed to create order message:', msgError)
      return { success: false, error: 'Failed to create message' }
    }

    // 5. Get product IDs from database for tracking
    const retailerIds = order.product_items.map(item => item.product_retailer_id)
    const { data: products } = await supabase
      .from('whatsapp_products')
      .select('id, retailer_id')
      .eq('organization_id', organizationId)
      .in('retailer_id', retailerIds)

    const productMap = new Map((products || []).map(p => [p.retailer_id, p.id]))
    const productIds = retailerIds
      .map(id => productMap.get(id))
      .filter((id): id is string => id !== undefined)

    // 6. Track in product messages table
    const cartData: CartData = {
      catalog_id: order.catalog_id,
      product_items: order.product_items.map(
        (item): CartItem => ({
          product_retailer_id: item.product_retailer_id,
          quantity: item.quantity,
          item_price: item.item_price,
          currency: item.currency,
        })
      ),
      text: order.text,
    }

    const { error: trackingError } = await supabase
      .from('whatsapp_product_messages')
      .insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        message_id: message.id,
        message_type: 'single', // Order is response to product message
        product_ids: productIds,
        retailer_ids: retailerIds,
        catalog_id: order.catalog_id,
        sent_at: messageTimestamp,
        cart_received: true,
        cart_received_at: messageTimestamp,
        cart_data: cartData,
      })

    if (trackingError) {
      // Log but don't fail - main order message was created
      console.error('Failed to track product message:', trackingError)
    }

    return {
      success: true,
      conversationId,
      messageId: message.id,
    }
  } catch (error) {
    console.error('Error handling cart order:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format order details into readable message content
 */
export function formatOrderSummary(order: OrderWebhookPayload): string {
  const lines: string[] = ['New Order Received']

  if (order.text) {
    lines.push('')
    lines.push(`Customer note: "${order.text}"`)
  }

  lines.push('')
  lines.push('Items:')

  let total = 0
  const currency = order.product_items[0]?.currency || 'USD'

  for (const item of order.product_items) {
    const itemTotal = item.item_price * item.quantity
    total += itemTotal
    lines.push(
      `- ${item.product_retailer_id} x${item.quantity} - ${formatCurrency(itemTotal, item.currency)}`
    )
  }

  lines.push('')
  lines.push(`Total: ${formatCurrency(total, currency)}`)

  return lines.join('\n')
}

/**
 * Format currency amount for display
 * Amount is expected in cents (smallest currency unit)
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100) // Convert from cents to main unit
  } catch {
    // Fallback for unsupported currencies
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}
