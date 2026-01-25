/**
 * New Contact Trigger
 *
 * Triggers when a new contact is created in ADSapp.
 * Uses REST Hook pattern for real-time delivery.
 *
 * Event: contact.created
 * Endpoint: POST /api/integrations/zapier/hooks/subscribe
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

/**
 * Subscribe to contact.created events
 * Called when a user enables this trigger in their Zap
 */
const subscribeHook = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/hooks/subscribe`,
    method: 'POST',
    body: {
      event: 'contact.created',
      hookUrl: bundle.targetUrl
    }
  })

  // Return subscription data - must include `id` for unsubscribe
  return response.data
}

/**
 * Unsubscribe from contact.created events
 * Called when a user disables/deletes their Zap
 */
const unsubscribeHook = async (z, bundle) => {
  const subscriptionId = bundle.subscribeData.id

  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/hooks/${subscriptionId}`,
    method: 'DELETE'
  })

  return response.data
}

/**
 * Process incoming webhook payload
 * Called when ADSapp sends a webhook to Zapier
 */
const perform = async (z, bundle) => {
  // REST Hook - data comes directly from webhook payload
  return [bundle.cleanedRequest]
}

/**
 * Polling fallback for trigger testing
 * Returns recent contacts for the Zap editor preview
 */
const performList = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/triggers/contacts`,
    params: { limit: 10 }
  })

  return response.data.contacts || []
}

module.exports = {
  key: 'new_contact',
  noun: 'Contact',

  display: {
    label: 'New Contact Created',
    description: 'Triggers when a new contact is created in your ADSapp inbox.',
    important: false
  },

  operation: {
    type: 'hook',

    inputFields: [],

    perform,
    performList,
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,

    // Sample data shown in the Zap editor
    sample: {
      id: 'evt_contact_789',
      event: 'contact.created',
      timestamp: '2026-01-25T12:00:00Z',
      organization_id: 'org_789',
      data: {
        contact_id: 'contact_456',
        name: 'Jane Smith',
        phone: '+1987654321',
        email: 'jane@example.com',
        tags: ['vip', 'returning'],
        created_at: '2026-01-25T12:00:00Z'
      }
    },

    // Output field definitions for mapping in subsequent Zap steps
    outputFields: [
      { key: 'id', label: 'Event ID', type: 'string' },
      { key: 'event', label: 'Event Type', type: 'string' },
      { key: 'timestamp', label: 'Event Timestamp', type: 'datetime' },
      { key: 'data__contact_id', label: 'Contact ID', type: 'string' },
      { key: 'data__name', label: 'Name', type: 'string' },
      { key: 'data__phone', label: 'Phone', type: 'string' },
      { key: 'data__email', label: 'Email', type: 'string' },
      { key: 'data__tags', label: 'Tags', type: 'string' },
      { key: 'data__created_at', label: 'Created At', type: 'datetime' }
    ]
  }
}
