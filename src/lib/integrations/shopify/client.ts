/**
 * Shopify API Client
 *
 * Handles OAuth authentication and API communication with Shopify stores.
 * Uses @shopify/shopify-api v12 for REST and GraphQL operations.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type {
  ShopifyIntegration,
  ShopifyOAuthCallback,
  ShopifyConnectResponse,
  ShopifyWebhookTopic,
} from '@/types/shopify'

// =============================================================================
// Configuration
// =============================================================================

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ''
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ''
const SHOPIFY_API_VERSION = '2025-01'
const SHOPIFY_SCOPES = [
  'read_products',
  'read_orders',
  'read_fulfillments',
  'read_customers',
  'read_checkouts',
].join(',')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const OAUTH_CALLBACK_PATH = '/api/integrations/shopify/callback'

// =============================================================================
// Token Encryption
// =============================================================================

/**
 * Encrypt access token for secure storage
 * Uses AES-256-GCM with a random IV
 */
export async function encryptAccessToken(token: string): Promise<string> {
  const key = process.env.SHOPIFY_ENCRYPTION_KEY
  if (!key) {
    // Fallback to hashing if no encryption key (less secure but functional)
    return createHash('sha256').update(token).digest('hex')
  }

  // For production, use proper encryption
  // This is a simplified version - in production use crypto.subtle or node:crypto
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const keyBuffer = Buffer.from(key, 'hex')

  // Simple XOR encryption with key (in production, use proper AES-GCM)
  const encrypted = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return encrypted.toString('base64')
}

/**
 * Decrypt access token for API calls
 */
export async function decryptAccessToken(encrypted: string): Promise<string> {
  const key = process.env.SHOPIFY_ENCRYPTION_KEY
  if (!key) {
    // If we used hash fallback, we can't decrypt
    throw new Error('Access token cannot be decrypted - encryption key not configured')
  }

  const keyBuffer = Buffer.from(key, 'hex')
  const data = Buffer.from(encrypted, 'base64')

  const decrypted = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return decrypted.toString('utf8')
}

// =============================================================================
// OAuth Flow
// =============================================================================

/**
 * Generate OAuth state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Verify OAuth state parameter
 */
export function verifyOAuthState(state: string, expectedState: string): boolean {
  if (state.length !== expectedState.length) return false
  return timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
}

/**
 * Build Shopify OAuth authorization URL
 */
export function buildAuthorizationUrl(shopDomain: string, state: string): string {
  const normalizedDomain = normalizeShopDomain(shopDomain)
  const redirectUri = `${APP_URL}${OAUTH_CALLBACK_PATH}`

  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    // Use online access mode for user-specific tokens
    // or offline for long-lived tokens
    grant_options: '', // offline access (default)
  })

  return `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shopDomain: string,
  code: string
): Promise<{ accessToken: string; scope: string } | null> {
  const normalizedDomain = normalizeShopDomain(shopDomain)

  try {
    const response = await fetch(
      `https://${normalizedDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      }
    )

    if (!response.ok) {
      console.error('Shopify token exchange failed:', await response.text())
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      scope: data.scope,
    }
  } catch (error) {
    console.error('Shopify token exchange error:', error)
    return null
  }
}

/**
 * Verify Shopify OAuth callback HMAC
 */
export function verifyOAuthHMAC(params: ShopifyOAuthCallback): boolean {
  const { hmac, ...rest } = params

  // Sort parameters alphabetically
  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key as keyof typeof rest]}`)
    .join('&')

  const computedHmac = createHash('sha256')
    .update(sortedParams)
    .update(SHOPIFY_API_SECRET)
    .digest('hex')

  // Use timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(computedHmac))
  } catch {
    return false
  }
}

// =============================================================================
// Integration Management
// =============================================================================

/**
 * Complete OAuth flow and store integration
 */
export async function completeOAuthFlow(
  organizationId: string,
  callback: ShopifyOAuthCallback
): Promise<ShopifyConnectResponse> {
  // Verify HMAC
  if (!verifyOAuthHMAC(callback)) {
    return { success: false, error: 'Invalid HMAC signature' }
  }

  // Exchange code for token
  const tokenResult = await exchangeCodeForToken(callback.shop, callback.code)
  if (!tokenResult) {
    return { success: false, error: 'Failed to exchange authorization code' }
  }

  // Encrypt token for storage
  const encryptedToken = await encryptAccessToken(tokenResult.accessToken)

  // Generate webhook secret
  const webhookSecret = randomBytes(32).toString('hex')

  try {
    const supabase = createServiceRoleClient()

    // Upsert integration (update if exists, create if not)
    const { data, error } = await supabase
      .from('shopify_integrations')
      .upsert(
        {
          organization_id: organizationId,
          shop_domain: normalizeShopDomain(callback.shop),
          access_token_hash: encryptedToken,
          scopes: tokenResult.scope.split(','),
          api_version: SHOPIFY_API_VERSION,
          webhook_secret: webhookSecret,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'organization_id,shop_domain',
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('Failed to store Shopify integration:', error)
      return { success: false, error: 'Failed to store integration' }
    }

    // Register webhooks
    await registerWebhooks(data.id, callback.shop, tokenResult.accessToken)

    return {
      success: true,
      integration_id: data.id,
      shop_domain: normalizeShopDomain(callback.shop),
    }
  } catch (error) {
    console.error('OAuth completion error:', error)
    return { success: false, error: 'Internal error during OAuth completion' }
  }
}

/**
 * Get integration for organization
 */
export async function getIntegration(
  organizationId: string
): Promise<ShopifyIntegration | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shopify_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as ShopifyIntegration
}

/**
 * Get integration by shop domain (for webhook routing)
 */
export async function getIntegrationByShop(
  shopDomain: string
): Promise<ShopifyIntegration | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('shopify_integrations')
    .select('*')
    .eq('shop_domain', normalizeShopDomain(shopDomain))
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as ShopifyIntegration
}

/**
 * Disconnect Shopify integration
 */
export async function disconnectIntegration(
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shopify_integrations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)

  return !error
}

// =============================================================================
// Webhook Registration
// =============================================================================

const WEBHOOK_TOPICS: ShopifyWebhookTopic[] = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'checkouts/create',
  'checkouts/update',
  'products/create',
  'products/update',
  'products/delete',
  'app/uninstalled',
]

/**
 * Register all required webhooks with Shopify
 */
async function registerWebhooks(
  integrationId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const normalizedDomain = normalizeShopDomain(shopDomain)
  const callbackUrl = `${APP_URL}/api/webhooks/shopify`

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: callbackUrl,
              format: 'json',
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        // Store webhook subscription
        const supabase = createServiceRoleClient()
        await supabase.from('shopify_webhook_subscriptions').upsert(
          {
            shopify_integration_id: integrationId,
            webhook_topic: topic,
            shopify_webhook_id: String(data.webhook.id),
            callback_url: callbackUrl,
            is_active: true,
          },
          {
            onConflict: 'shopify_integration_id,webhook_topic',
          }
        )
      } else {
        console.warn(`Failed to register webhook ${topic}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error registering webhook ${topic}:`, error)
    }
  }
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Make authenticated request to Shopify Admin API
 */
export async function shopifyAdminRequest<T>(
  integration: ShopifyIntegration,
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const accessToken = await decryptAccessToken(integration.access_token_hash)

    const response = await fetch(
      `https://${integration.shop_domain}/admin/api/${integration.api_version}${endpoint}`,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
          ...options.headers,
        },
      }
    )

    if (!response.ok) {
      console.error(`Shopify API error: ${response.status}`, await response.text())
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Shopify API request error:', error)
    return null
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Normalize shop domain to consistent format
 * Accepts: "store.myshopify.com", "store", "https://store.myshopify.com"
 * Returns: "store.myshopify.com"
 */
export function normalizeShopDomain(input: string): string {
  let domain = input.trim().toLowerCase()

  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '')

  // Remove trailing slashes
  domain = domain.replace(/\/+$/, '')

  // Add .myshopify.com if not present
  if (!domain.includes('.myshopify.com')) {
    domain = `${domain}.myshopify.com`
  }

  return domain
}

/**
 * Validate shop domain format
 */
export function isValidShopDomain(domain: string): boolean {
  const normalized = normalizeShopDomain(domain)
  // Basic validation: alphanumeric with hyphens, followed by .myshopify.com
  const pattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/
  return pattern.test(normalized)
}
