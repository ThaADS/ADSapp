/**
 * Shopify Abandoned Cart Recovery
 *
 * Detects abandoned carts and sends recovery messages via WhatsApp
 */

import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import type { ShopifyCart, CartRecoveryStats } from '@/types/shopify'

// =============================================================================
// Cart Detection
// =============================================================================

/**
 * Mark carts as abandoned after specified delay
 * Should be called by a scheduled job (e.g., every 15 minutes)
 */
export async function processAbandonedCarts(
  organizationId?: string
): Promise<{ processed: number; marked: number }> {
  const supabase = createServiceRoleClient()

  // Get settings for abandonment delay
  const delayHours = 1 // Default 1 hour, could be configurable per org

  // Calculate cutoff time
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - delayHours)

  // Build query for carts that should be marked as abandoned
  let query = supabase
    .from('shopify_carts')
    .select('id, shopify_integration_id, organization_id')
    .is('abandoned_at', null)
    .is('converted_at', null)
    .lt('shopify_updated_at', cutoffTime.toISOString())

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data: carts, error } = await query

  if (error || !carts) {
    console.error('Failed to fetch carts for abandonment check:', error)
    return { processed: 0, marked: 0 }
  }

  let marked = 0

  // Mark as abandoned
  for (const cart of carts) {
    const { error: updateError } = await supabase
      .from('shopify_carts')
      .update({
        abandoned_at: new Date().toISOString(),
        recovery_status: 'pending',
      })
      .eq('id', cart.id)
      .is('converted_at', null) // Double-check not converted

    if (!updateError) {
      marked++
    }
  }

  return { processed: carts.length, marked }
}

/**
 * Mark a specific cart as abandoned
 */
export async function markCartAsAbandoned(cartId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('shopify_carts')
    .update({
      abandoned_at: new Date().toISOString(),
      recovery_status: 'pending',
    })
    .eq('id', cartId)
    .is('converted_at', null)

  return !error
}

// =============================================================================
// Recovery Messages
// =============================================================================

/**
 * Send cart recovery message via WhatsApp
 */
export async function sendCartRecoveryMessage(
  cartId: string,
  options?: {
    templateId?: string
    customMessage?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Get cart with integration details
  const { data: cart, error: cartError } = await supabase
    .from('shopify_carts')
    .select(`
      *,
      shopify_integrations (
        organization_id,
        shop_domain
      )
    `)
    .eq('id', cartId)
    .single()

  if (cartError || !cart) {
    return { success: false, error: 'Cart not found' }
  }

  // Check if already recovered or expired
  if (cart.converted_at) {
    return { success: false, error: 'Cart already converted' }
  }

  if (cart.recovery_status === 'expired') {
    return { success: false, error: 'Recovery period expired' }
  }

  // Get settings for max attempts
  const { data: settings } = await supabase
    .from('shopify_settings')
    .select('cart_recovery_max_attempts, cart_recovery_template_id')
    .eq('organization_id', cart.organization_id)
    .single()

  const maxAttempts = settings?.cart_recovery_max_attempts || 3

  if (cart.recovery_attempts >= maxAttempts) {
    // Mark as expired
    await supabase
      .from('shopify_carts')
      .update({ recovery_status: 'expired' })
      .eq('id', cartId)

    return { success: false, error: 'Maximum recovery attempts reached' }
  }

  // Check if we have a phone number
  if (!cart.customer_phone) {
    return { success: false, error: 'No phone number for cart recovery' }
  }

  // Find or create contact
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone_number')
    .eq('organization_id', cart.organization_id)
    .eq('phone_number', cart.customer_phone)
    .single()

  if (!contact) {
    return { success: false, error: 'Contact not found' }
  }

  // Build recovery message
  const cartItems = (cart.line_items as any[])
    .map((item) => `• ${item.title} (${item.quantity}x)`)
    .join('\n')

  const message = options?.customMessage || `
Hi! You left some items in your cart:

${cartItems}

Total: €${cart.total_price?.toFixed(2)}

Complete your purchase: ${cart.checkout_url}

Reply STOP to unsubscribe.
  `.trim()

  // Send message via WhatsApp (using existing messaging infrastructure)
  try {
    // This would integrate with your existing WhatsApp sending logic
    // For now, we'll just log and update the attempt count
    console.log(`Sending cart recovery to ${cart.customer_phone}:`, message)

    // In production, call your WhatsApp message sending function here
    // await sendWhatsAppMessage(contact.id, message, cart.organization_id)

    // Update cart with recovery attempt
    await supabase
      .from('shopify_carts')
      .update({
        recovery_attempts: cart.recovery_attempts + 1,
        last_recovery_attempt_at: new Date().toISOString(),
        recovery_message_sent_at: new Date().toISOString(),
        recovery_status: 'sent',
      })
      .eq('id', cartId)

    return { success: true }
  } catch (error) {
    console.error('Failed to send recovery message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
}

/**
 * Process all pending recovery messages
 * Should be called by a scheduled job
 */
export async function processPendingRecoveries(
  organizationId?: string
): Promise<{ processed: number; sent: number; failed: number }> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('shopify_carts')
    .select('id')
    .eq('recovery_status', 'pending')
    .not('customer_phone', 'is', null)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  // Limit batch size
  query = query.limit(50)

  const { data: carts, error } = await query

  if (error || !carts) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const cart of carts) {
    const result = await sendCartRecoveryMessage(cart.id)
    if (result.success) {
      sent++
    } else {
      failed++
    }
  }

  return { processed: carts.length, sent, failed }
}

// =============================================================================
// Cart Queries
// =============================================================================

/**
 * Get abandoned carts for organization
 */
export async function getAbandonedCarts(
  organizationId: string,
  options: {
    limit?: number
    offset?: number
    status?: 'pending' | 'sent' | 'converted' | 'expired'
  } = {}
): Promise<{ carts: ShopifyCart[]; total: number }> {
  const { limit = 50, offset = 0, status } = options

  const supabase = await createClient()

  let query = supabase
    .from('shopify_carts')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .not('abandoned_at', 'is', null)
    .order('abandoned_at', { ascending: false })

  if (status) {
    query = query.eq('recovery_status', status)
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to get abandoned carts:', error)
    return { carts: [], total: 0 }
  }

  return {
    carts: data as ShopifyCart[],
    total: count || 0,
  }
}

/**
 * Get cart recovery statistics
 */
export async function getCartRecoveryStats(
  organizationId: string,
  daysBack: number = 30
): Promise<CartRecoveryStats> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  // Get all abandoned carts in period
  const { data: carts } = await supabase
    .from('shopify_carts')
    .select('recovery_status, total_price, converted_at')
    .eq('organization_id', organizationId)
    .not('abandoned_at', 'is', null)
    .gte('abandoned_at', startDate.toISOString())

  if (!carts) {
    return {
      total_abandoned: 0,
      recovery_sent: 0,
      recovered: 0,
      recovery_rate: 0,
      revenue_recovered: 0,
    }
  }

  const totalAbandoned = carts.length
  const recoverySent = carts.filter(
    (c) => c.recovery_status === 'sent' || c.recovery_status === 'converted'
  ).length
  const recovered = carts.filter((c) => c.recovery_status === 'converted').length
  const revenueRecovered = carts
    .filter((c) => c.recovery_status === 'converted')
    .reduce((sum, c) => sum + (c.total_price || 0), 0)

  return {
    total_abandoned: totalAbandoned,
    recovery_sent: recoverySent,
    recovered,
    recovery_rate: totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0,
    revenue_recovered: revenueRecovered,
  }
}
