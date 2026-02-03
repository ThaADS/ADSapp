/**
 * Instagram DM Integration Client
 * Purpose: Meta Graph API client for Instagram Business Direct Messages
 * Date: 2026-01-28
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  InstagramConnection,
  InstagramBusinessAccount,
  InstagramConversationsResponse,
  SendInstagramMessageRequest,
  SendInstagramMessageResponse,
  InstagramRateLimitInfo
} from '@/types/instagram'

// =============================================================================
// Constants
// =============================================================================

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Instagram DM rate limit: 200 messages per hour
const RATE_LIMIT_PER_HOUR = 200

// Required OAuth scopes for Instagram DM
export const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_manage_messages',
  'pages_messaging',
  'pages_show_list',
  'pages_manage_metadata'
]

// =============================================================================
// Token Encryption (using same pattern as Shopify)
// =============================================================================

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Simple XOR-based encryption for access tokens
 * In production, use proper encryption like AES-256
 */
export function encryptAccessToken(token: string): string {
  const key = ENCRYPTION_KEY
  let encrypted = ''
  for (let i = 0; i < token.length; i++) {
    encrypted += String.fromCharCode(
      token.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    )
  }
  return Buffer.from(encrypted).toString('base64')
}

export function decryptAccessToken(encryptedToken: string): string {
  const key = ENCRYPTION_KEY
  const encrypted = Buffer.from(encryptedToken, 'base64').toString()
  let decrypted = ''
  for (let i = 0; i < encrypted.length; i++) {
    decrypted += String.fromCharCode(
      encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    )
  }
  return decrypted
}

// =============================================================================
// OAuth Flow Helpers
// =============================================================================

/**
 * Builds the Meta OAuth authorization URL for Instagram
 */
export function buildInstagramAuthUrl(organizationId: string): string {
  const clientId = process.env.META_APP_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`

  const state = Buffer.from(JSON.stringify({
    organizationId,
    timestamp: Date.now()
  })).toString('base64')

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
    state
  })

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`
}

/**
 * Exchanges OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to exchange code for token')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000 // 60 days default
  }
}

/**
 * Exchanges short-lived token for long-lived token
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `fb_exchange_token=${shortLivedToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get long-lived token')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000
  }
}

// =============================================================================
// Instagram Account Discovery
// =============================================================================

/**
 * Gets Facebook Pages connected to the user's account
 */
export async function getConnectedPages(accessToken: string): Promise<Array<{
  id: string
  name: string
  instagram_business_account?: { id: string }
}>> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/accounts?` +
    `fields=id,name,instagram_business_account&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get connected pages')
  }

  const data = await response.json()
  return data.data || []
}

/**
 * Gets Instagram Business Account details
 */
export async function getInstagramBusinessAccount(
  instagramAccountId: string,
  accessToken: string
): Promise<InstagramBusinessAccount> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${instagramAccountId}?` +
    `fields=id,username,name,profile_picture_url,followers_count,media_count&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get Instagram account')
  }

  return response.json()
}

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Saves Instagram connection to database
 */
export async function saveInstagramConnection(
  organizationId: string,
  pageId: string,
  pageName: string,
  instagramAccount: InstagramBusinessAccount,
  accessToken: string,
  expiresIn: number
): Promise<InstagramConnection> {
  const supabase = createServiceRoleClient()

  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { data, error } = await supabase
    .from('instagram_connections')
    .upsert({
      organization_id: organizationId,
      instagram_user_id: instagramAccount.id,
      instagram_username: instagramAccount.username,
      page_id: pageId,
      page_name: pageName,
      access_token_hash: encryptAccessToken(accessToken),
      token_expires_at: tokenExpiresAt,
      scopes: INSTAGRAM_SCOPES,
      is_active: true,
      webhook_subscribed: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,instagram_user_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save Instagram connection: ${error.message}`)
  }

  return data as InstagramConnection
}

/**
 * Gets Instagram connection for organization
 */
export async function getInstagramConnection(
  organizationId: string
): Promise<InstagramConnection | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('instagram_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as InstagramConnection
}

/**
 * Gets Instagram connection by Instagram user ID
 */
export async function getInstagramConnectionByUserId(
  instagramUserId: string
): Promise<InstagramConnection | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('instagram_connections')
    .select('*')
    .eq('instagram_user_id', instagramUserId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as InstagramConnection
}

/**
 * Disconnects Instagram integration
 */
export async function disconnectInstagram(organizationId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('instagram_connections')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId)

  return !error
}

// =============================================================================
// Messaging API
// =============================================================================

/**
 * Sends a DM via Instagram
 */
export async function sendInstagramMessage(
  connection: InstagramConnection,
  recipientId: string,
  message: SendInstagramMessageRequest['message']
): Promise<SendInstagramMessageResponse> {
  // Check rate limit first
  const rateLimitOk = await checkAndIncrementRateLimit(connection.organization_id)
  if (!rateLimitOk) {
    throw new Error('Rate limit exceeded: 200 messages per hour')
  }

  const accessToken = decryptAccessToken(connection.access_token_hash)

  const payload: Record<string, unknown> = {
    recipient: { id: recipientId },
    message
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.instagram_user_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to send Instagram message')
  }

  const data = await response.json()
  return {
    recipient_id: data.recipient_id,
    message_id: data.message_id
  }
}

/**
 * Gets conversations from Instagram
 */
export async function getInstagramConversations(
  connection: InstagramConnection,
  limit: number = 20
): Promise<InstagramConversationsResponse> {
  const accessToken = decryptAccessToken(connection.access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.instagram_user_id}/conversations?` +
    `fields=id,participants,messages{id,message,from,created_time},updated_time&` +
    `limit=${limit}&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get conversations')
  }

  return response.json()
}

/**
 * Gets messages from a specific conversation
 */
export async function getConversationMessages(
  connection: InstagramConnection,
  conversationId: string,
  limit: number = 50
): Promise<Array<{
  id: string
  message: string
  from: { id: string; username: string }
  created_time: string
}>> {
  const accessToken = decryptAccessToken(connection.access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${conversationId}/messages?` +
    `fields=id,message,from,created_time,attachments&` +
    `limit=${limit}&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get messages')
  }

  const data = await response.json()
  return data.data || []
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Checks and increments rate limit for organization
 * Returns true if within limit, false if exceeded
 */
async function checkAndIncrementRateLimit(organizationId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Get current rate limit state
  const { data: rateLimit } = await supabase
    .from('instagram_rate_limits')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  if (!rateLimit) {
    // Create new rate limit record
    await supabase
      .from('instagram_rate_limits')
      .insert({
        organization_id: organizationId,
        messages_sent_this_hour: 1,
        hour_window_start: now.toISOString(),
        limit_per_hour: RATE_LIMIT_PER_HOUR
      })
    return true
  }

  const windowStart = new Date(rateLimit.hour_window_start)

  if (windowStart < hourAgo) {
    // Reset window
    await supabase
      .from('instagram_rate_limits')
      .update({
        messages_sent_this_hour: 1,
        hour_window_start: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('organization_id', organizationId)
    return true
  }

  if (rateLimit.messages_sent_this_hour >= rateLimit.limit_per_hour) {
    return false
  }

  // Increment counter
  await supabase
    .from('instagram_rate_limits')
    .update({
      messages_sent_this_hour: rateLimit.messages_sent_this_hour + 1,
      updated_at: now.toISOString()
    })
    .eq('organization_id', organizationId)

  return true
}

/**
 * Gets current rate limit info
 */
export async function getRateLimitInfo(
  organizationId: string
): Promise<InstagramRateLimitInfo | null> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('instagram_rate_limits')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (!data) return null

  return {
    organization_id: data.organization_id,
    messages_sent_this_hour: data.messages_sent_this_hour,
    hour_window_start: data.hour_window_start,
    limit: data.limit_per_hour
  }
}

// =============================================================================
// Webhook Subscription
// =============================================================================

/**
 * Subscribes to Instagram webhooks
 */
export async function subscribeToWebhooks(
  connection: InstagramConnection
): Promise<boolean> {
  const accessToken = decryptAccessToken(connection.access_token_hash)

  // Subscribe the Page to webhook events
  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        subscribed_fields: ['messages', 'messaging_seen', 'messaging_postbacks']
      })
    }
  )

  if (!response.ok) {
    console.error('Failed to subscribe to webhooks:', await response.json())
    return false
  }

  // Update connection to mark webhooks as subscribed
  const supabase = createServiceRoleClient()
  await supabase
    .from('instagram_connections')
    .update({
      webhook_subscribed: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', connection.id)

  return true
}

// =============================================================================
// Token Refresh
// =============================================================================

/**
 * Refreshes Instagram access token before expiry
 */
export async function refreshAccessToken(
  connection: InstagramConnection
): Promise<InstagramConnection | null> {
  const currentToken = decryptAccessToken(connection.access_token_hash)

  try {
    const { accessToken, expiresIn } = await getLongLivedToken(currentToken)

    const supabase = createServiceRoleClient()
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { data, error } = await supabase
      .from('instagram_connections')
      .update({
        access_token_hash: encryptAccessToken(accessToken),
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update token:', error)
      return null
    }

    return data as InstagramConnection
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}
