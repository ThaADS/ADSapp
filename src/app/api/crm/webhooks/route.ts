/**
 * CRM Webhooks API
 *
 * Handles incoming webhooks from Salesforce, HubSpot, and Pipedrive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSyncManager } from '@/lib/crm/sync-manager'
import crypto from 'crypto'

/**
 * POST /api/crm/webhooks
 * Handle CRM webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const crmType = searchParams.get('crm_type')

    if (!crmType || !['salesforce', 'hubspot', 'pipedrive'].includes(crmType)) {
      return NextResponse.json({ error: 'Invalid CRM type' }, { status: 400 })
    }

    const body = await request.text()
    const payload = JSON.parse(body)

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(request, body, crmType)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Process webhook based on CRM type
    let organizationId: string | null = null
    let contactId: string | null = null

    switch (crmType) {
      case 'salesforce':
        // Salesforce Platform Events
        organizationId = await getOrganizationFromSalesforcePayload(payload)
        contactId = await processS alesforceWebhook(payload, organizationId)
        break

      case 'hubspot':
        // HubSpot webhooks
        organizationId = await getOrganizationFromHubSpotPayload(payload)
        contactId = await processHubSpotWebhook(payload, organizationId)
        break

      case 'pipedrive':
        // Pipedrive webhooks
        organizationId = await getOrganizationFromPipedrivePayload(payload)
        contactId = await processPipedriveWebhook(payload, organizationId)
        break
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Trigger sync for affected contact
    if (contactId) {
      const syncManager = await createSyncManager(organizationId, crmType)
      await syncManager.syncContact(contactId, 'from_crm')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string,
  crmType: string
): Promise<boolean> {
  try {
    switch (crmType) {
      case 'salesforce':
        // Salesforce uses OAuth, signature verification is handled by Platform Events
        return true

      case 'hubspot':
        // HubSpot signature verification
        const hubspotSignature = request.headers.get('x-hubspot-signature')
        if (!hubspotSignature) return false

        const hubspotSecret = process.env.HUBSPOT_WEBHOOK_SECRET || ''
        const expectedSignature = crypto
          .createHmac('sha256', hubspotSecret)
          .update(body)
          .digest('hex')

        return hubspotSignature === expectedSignature

      case 'pipedrive':
        // Pipedrive doesn't use signature verification
        // Instead, we validate the API token from the payload
        return true

      default:
        return false
    }
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Get organization ID from Salesforce payload
 */
async function getOrganizationFromSalesforcePayload(payload: any): Promise<string | null> {
  const supabase = await createClient()

  // Extract Salesforce instance URL or organization ID from payload
  const instanceUrl = payload.event?.replayId || payload.sobject?.Id

  if (!instanceUrl) return null

  // Find connection by credentials
  const { data: connections } = await supabase
    .from('crm_connections')
    .select('organization_id')
    .eq('crm_type', 'salesforce')
    .eq('status', 'active')

  // Match instance URL with stored credentials
  // This is simplified - in production, you'd need more robust matching
  return connections?.[0]?.organization_id || null
}

/**
 * Get organization ID from HubSpot payload
 */
async function getOrganizationFromHubSpotPayload(payload: any): Promise<string | null> {
  const supabase = await createClient()

  const portalId = payload.portalId

  if (!portalId) return null

  // Find connection by portal ID
  const { data: connection } = await supabase
    .from('crm_connections')
    .select('organization_id')
    .eq('crm_type', 'hubspot')
    .eq('status', 'active')
    .single()

  return connection?.organization_id || null
}

/**
 * Get organization ID from Pipedrive payload
 */
async function getOrganizationFromPipedrivePayload(payload: any): Promise<string | null> {
  const supabase = await createClient()

  const companyId = payload.meta?.company_id

  if (!companyId) return null

  // Find connection by company ID
  const { data: connection } = await supabase
    .from('crm_connections')
    .select('organization_id')
    .eq('crm_type', 'pipedrive')
    .eq('status', 'active')
    .single()

  return connection?.organization_id || null
}

/**
 * Process Salesforce webhook
 */
async function processSalesforceWebhook(payload: any, organizationId: string): Promise<string | null> {
  const supabase = await createClient()

  const sobject = payload.sobject
  if (!sobject || sobject.Type !== 'Contact') {
    return null
  }

  // Find ADSapp contact by Salesforce ID
  const { data: syncState } = await supabase
    .from('crm_sync_state')
    .select('contact_id')
    .eq('crm_record_id', sobject.Id)
    .single()

  return syncState?.contact_id || null
}

/**
 * Process HubSpot webhook
 */
async function processHubSpotWebhook(payload: any, organizationId: string): Promise<string | null> {
  const supabase = await createClient()

  const objectId = payload.objectId
  if (!objectId || payload.subscriptionType !== 'contact.propertyChange') {
    return null
  }

  // Find ADSapp contact by HubSpot ID
  const { data: syncState } = await supabase
    .from('crm_sync_state')
    .select('contact_id')
    .eq('crm_record_id', objectId.toString())
    .single()

  return syncState?.contact_id || null
}

/**
 * Process Pipedrive webhook
 */
async function processPipedriveWebhook(payload: any, organizationId: string): Promise<string | null> {
  const supabase = await createClient()

  const personId = payload.current?.id
  if (!personId || payload.meta?.object !== 'person') {
    return null
  }

  // Find ADSapp contact by Pipedrive ID
  const { data: syncState } = await supabase
    .from('crm_sync_state')
    .select('contact_id')
    .eq('crm_record_id', personId.toString())
    .single()

  return syncState?.contact_id || null
}

/**
 * GET /api/crm/webhooks
 * Webhook verification endpoint (for setup)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('hub.challenge') // HubSpot
  const verify = searchParams.get('hub.verify_token') // HubSpot

  if (challenge && verify) {
    // HubSpot webhook verification
    if (verify === process.env.HUBSPOT_WEBHOOK_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 400 })
}
