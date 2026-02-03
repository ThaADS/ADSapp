/**
 * Facebook Messenger Integration Client
 * Purpose: Meta Graph API client for Facebook Page Messenger
 * Date: 2026-01-28
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  FacebookConnection,
  FacebookUserProfile,
  SendFacebookMessageRequest,
  SendFacebookMessageResponse,
  PassThreadControlRequest,
  TakeThreadControlRequest,
  ThreadOwnerInfo
} from '@/types/facebook'

// =============================================================================
// Constants
// =============================================================================

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Required OAuth scopes for Messenger
export const FACEBOOK_MESSENGER_SCOPES = [
  'pages_messaging',
  'pages_manage_metadata',
  'pages_show_list',
  'pages_read_engagement'
]

// Page inbox app ID (Meta's primary receiver)
const PAGE_INBOX_APP_ID = '263902037430900'

// =============================================================================
// Token Encryption (using same pattern as Instagram/Shopify)
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
 * Builds the Meta OAuth authorization URL for Facebook Pages
 */
export function buildFacebookAuthUrl(organizationId: string): string {
  const clientId = process.env.META_APP_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/facebook/callback`

  const state = Buffer.from(JSON.stringify({
    organizationId,
    timestamp: Date.now()
  })).toString('base64')

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope: FACEBOOK_MESSENGER_SCOPES.join(','),
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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/facebook/callback`

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

/**
 * Gets Page Access Token from User Access Token
 */
export async function getPageAccessToken(
  pageId: string,
  userAccessToken: string
): Promise<{ accessToken: string; name: string }> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${pageId}?` +
    `fields=access_token,name&` +
    `access_token=${userAccessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get page access token')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    name: data.name
  }
}

// =============================================================================
// Page Discovery
// =============================================================================

/**
 * Gets Facebook Pages owned by the user
 */
export async function getOwnedPages(accessToken: string): Promise<Array<{
  id: string
  name: string
  access_token: string
  category: string
}>> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/accounts?` +
    `fields=id,name,access_token,category&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get owned pages')
  }

  const data = await response.json()
  return data.data || []
}

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Saves Facebook Page connection to database
 */
export async function saveFacebookConnection(
  organizationId: string,
  pageId: string,
  pageName: string,
  pageAccessToken: string,
  userAccessToken: string | null,
  expiresIn: number
): Promise<FacebookConnection> {
  const supabase = createServiceRoleClient()
  const appId = process.env.META_APP_ID || ''

  const tokenExpiresAt = expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null // Page tokens can be long-lived (never expire)

  const { data, error } = await supabase
    .from('facebook_connections')
    .upsert({
      organization_id: organizationId,
      page_id: pageId,
      page_name: pageName,
      page_access_token_hash: encryptAccessToken(pageAccessToken),
      user_access_token_hash: userAccessToken ? encryptAccessToken(userAccessToken) : null,
      token_expires_at: tokenExpiresAt,
      scopes: FACEBOOK_MESSENGER_SCOPES,
      is_active: true,
      webhook_subscribed: false,
      app_id: appId,
      secondary_receivers: [],
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,page_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save Facebook connection: ${error.message}`)
  }

  return data as FacebookConnection
}

/**
 * Gets Facebook connection for organization
 */
export async function getFacebookConnection(
  organizationId: string
): Promise<FacebookConnection | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('facebook_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as FacebookConnection
}

/**
 * Gets Facebook connection by Page ID
 */
export async function getFacebookConnectionByPageId(
  pageId: string
): Promise<FacebookConnection | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('facebook_connections')
    .select('*')
    .eq('page_id', pageId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as FacebookConnection
}

/**
 * Disconnects Facebook integration
 */
export async function disconnectFacebook(organizationId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('facebook_connections')
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
 * Sends a Messenger message
 */
export async function sendFacebookMessage(
  connection: FacebookConnection,
  request: SendFacebookMessageRequest
): Promise<SendFacebookMessageResponse> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(request)
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to send Facebook message')
  }

  return response.json()
}

/**
 * Sends a text message (convenience method)
 */
export async function sendTextMessage(
  connection: FacebookConnection,
  recipientPsid: string,
  text: string,
  messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE',
  tag?: string
): Promise<SendFacebookMessageResponse> {
  const request: SendFacebookMessageRequest = {
    recipient: { id: recipientPsid },
    message: { text },
    messaging_type: messagingType
  }

  if (tag) {
    request.tag = tag
  }

  return sendFacebookMessage(connection, request)
}

/**
 * Sends a message with quick replies
 */
export async function sendQuickReplyMessage(
  connection: FacebookConnection,
  recipientPsid: string,
  text: string,
  quickReplies: Array<{
    content_type: 'text' | 'user_phone_number' | 'user_email'
    title?: string
    payload?: string
  }>
): Promise<SendFacebookMessageResponse> {
  return sendFacebookMessage(connection, {
    recipient: { id: recipientPsid },
    message: {
      text,
      quick_replies: quickReplies
    },
    messaging_type: 'RESPONSE'
  })
}

/**
 * Sends a template message
 */
export async function sendTemplateMessage(
  connection: FacebookConnection,
  recipientPsid: string,
  template: Record<string, unknown>
): Promise<SendFacebookMessageResponse> {
  return sendFacebookMessage(connection, {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: 'template',
        payload: template
      }
    },
    messaging_type: 'RESPONSE'
  })
}

/**
 * Sends typing indicator
 */
export async function sendTypingIndicator(
  connection: FacebookConnection,
  recipientPsid: string,
  action: 'typing_on' | 'typing_off' | 'mark_seen'
): Promise<void> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        sender_action: action
      })
    }
  )
}

// =============================================================================
// User Profile
// =============================================================================

/**
 * Gets user profile information
 */
export async function getUserProfile(
  connection: FacebookConnection,
  psid: string
): Promise<FacebookUserProfile> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${psid}?` +
    `fields=id,name,first_name,last_name,profile_pic,locale,timezone&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    // User profile may not be available, return minimal info
    return { id: psid }
  }

  return response.json()
}

// =============================================================================
// Handover Protocol
// =============================================================================

/**
 * Passes thread control to another app (e.g., Page Inbox)
 */
export async function passThreadControl(
  connection: FacebookConnection,
  recipientPsid: string,
  targetAppId: string = PAGE_INBOX_APP_ID,
  metadata?: string
): Promise<boolean> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const payload: PassThreadControlRequest = {
    recipient: { id: recipientPsid },
    target_app_id: targetAppId
  }

  if (metadata) {
    payload.metadata = metadata
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/pass_thread_control`,
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
    console.error('Failed to pass thread control:', error)
    return false
  }

  // Log the handover event
  await logThreadControlEvent(connection, recipientPsid, 'pass', connection.app_id, targetAppId, metadata)

  return true
}

/**
 * Takes thread control from current owner
 */
export async function takeThreadControl(
  connection: FacebookConnection,
  recipientPsid: string,
  metadata?: string
): Promise<boolean> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const payload: TakeThreadControlRequest = {
    recipient: { id: recipientPsid }
  }

  if (metadata) {
    payload.metadata = metadata
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/take_thread_control`,
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
    console.error('Failed to take thread control:', error)
    return false
  }

  // Log the handover event
  await logThreadControlEvent(connection, recipientPsid, 'take', undefined, connection.app_id, metadata)

  return true
}

/**
 * Gets current thread owner
 */
export async function getThreadOwner(
  connection: FacebookConnection,
  recipientPsid: string
): Promise<ThreadOwnerInfo | null> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/thread_owner?` +
    `recipient=${recipientPsid}&` +
    `access_token=${accessToken}`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const owner = data.data?.[0]

  if (!owner) return null

  return {
    app_id: owner.thread_owner.app_id,
    is_secondary_receiver: connection.secondary_receivers.includes(owner.thread_owner.app_id)
  }
}

/**
 * Logs thread control event
 */
async function logThreadControlEvent(
  connection: FacebookConnection,
  recipientPsid: string,
  action: 'pass' | 'take' | 'request',
  fromAppId?: string,
  toAppId?: string,
  metadata?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Get conversation ID
  const { data: conversation } = await supabase
    .from('facebook_conversations')
    .select('id')
    .eq('facebook_connection_id', connection.id)
    .eq('psid', recipientPsid)
    .single()

  if (!conversation) return

  await supabase
    .from('facebook_thread_control_log')
    .insert({
      facebook_conversation_id: conversation.id,
      action,
      from_app_id: fromAppId,
      to_app_id: toAppId,
      metadata
    })

  // Update conversation thread owner
  const newOwner = action === 'pass' ?
    (toAppId === PAGE_INBOX_APP_ID ? 'page_inbox' : 'secondary_app') :
    'app'

  await supabase
    .from('facebook_conversations')
    .update({
      thread_owner: newOwner,
      thread_owner_app_id: toAppId || connection.app_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)
}

// =============================================================================
// Webhook Subscription
// =============================================================================

/**
 * Subscribes Page to webhook events
 */
export async function subscribeToWebhooks(
  connection: FacebookConnection
): Promise<boolean> {
  const accessToken = decryptAccessToken(connection.page_access_token_hash)

  const response = await fetch(
    `${GRAPH_API_BASE}/${connection.page_id}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        subscribed_fields: [
          'messages',
          'messaging_postbacks',
          'messaging_optins',
          'message_deliveries',
          'message_reads',
          'messaging_handovers',
          'standby'
        ]
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
    .from('facebook_connections')
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
 * Refreshes Facebook access token before expiry
 */
export async function refreshAccessToken(
  connection: FacebookConnection
): Promise<FacebookConnection | null> {
  // Page access tokens that are long-lived don't need refreshing
  // Only refresh if we have a user token and it's expiring
  if (!connection.user_access_token_hash || !connection.token_expires_at) {
    return connection
  }

  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  // Only refresh if expiring within 7 days
  if (daysUntilExpiry > 7) {
    return connection
  }

  const currentUserToken = decryptAccessToken(connection.user_access_token_hash)

  try {
    const { accessToken: newUserToken, expiresIn } = await getLongLivedToken(currentUserToken)

    // Get new page token
    const { accessToken: newPageToken } = await getPageAccessToken(connection.page_id, newUserToken)

    const supabase = createServiceRoleClient()
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { data, error } = await supabase
      .from('facebook_connections')
      .update({
        page_access_token_hash: encryptAccessToken(newPageToken),
        user_access_token_hash: encryptAccessToken(newUserToken),
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

    return data as FacebookConnection
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}
