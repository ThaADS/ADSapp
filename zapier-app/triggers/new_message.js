/**
 * New Message Trigger
 *
 * Triggers when a new WhatsApp message is received.
 * Uses REST Hook pattern for real-time delivery.
 *
 * Event: message.received
 * Endpoint: POST /api/integrations/zapier/hooks/subscribe
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

/**
 * Subscribe to message.received events
 * Called when a user enables this trigger in their Zap
 */
const subscribeHook = async (z, bundle) => {
  // Build filters from user input
  const filters = {}

  if (bundle.inputData.filter_tags) {
    const tags = bundle.inputData.filter_tags.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length > 0) {
      filters.tags = {
        operator: bundle.inputData.filter_operator || 'any_of',
        values: tags
      }
    }
  }

  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/hooks/subscribe`,
    method: 'POST',
    body: {
      event: 'message.received',
      hookUrl: bundle.targetUrl,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    }
  })

  // Return subscription data - must include `id` for unsubscribe
  return response.data
}

/**
 * Unsubscribe from message.received events
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
  // Wrap in array as Zapier expects an array of results
  return [bundle.cleanedRequest]
}

/**
 * Polling fallback for trigger testing
 * Returns recent messages for the Zap editor preview
 */
const performList = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/triggers/messages`,
    params: { limit: 10 }
  })

  return response.data.messages || []
}

module.exports = {
  key: 'new_message',
  noun: 'Message',

  display: {
    label: 'New Message Received',
    description: 'Triggers when a new WhatsApp message is received from a contact.',
    important: true
  },

  operation: {
    type: 'hook',

    inputFields: [
      {
        key: 'filter_tags',
        type: 'string',
        label: 'Filter by Tags',
        helpText: 'Only trigger for contacts with these tags (comma-separated). Leave empty to trigger for all messages.',
        required: false
      },
      {
        key: 'filter_operator',
        type: 'string',
        label: 'Tag Filter Mode',
        helpText: 'How to match tags: any_of (contact has at least one tag), all_of (contact has all tags), none_of (contact has none of these tags)',
        choices: [
          { value: 'any_of', label: 'Has any of these tags' },
          { value: 'all_of', label: 'Has all of these tags' },
          { value: 'none_of', label: 'Has none of these tags' }
        ],
        default: 'any_of',
        required: false
      }
    ],

    perform,
    performList,
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,

    // Sample data shown in the Zap editor
    sample: {
      id: 'evt_msg_123456',
      event: 'message.received',
      timestamp: '2026-01-25T12:00:00Z',
      organization_id: 'org_789',
      data: {
        message_id: 'msg_123456',
        conversation_id: 'conv_789',
        contact: {
          id: 'contact_456',
          name: 'John Doe',
          phone: '+1234567890'
        },
        content: {
          type: 'text',
          text: 'Hello, I have a question about my order.'
        },
        channel: 'whatsapp',
        received_at: '2026-01-25T12:00:00Z'
      }
    },

    // Output field definitions for mapping in subsequent Zap steps
    outputFields: [
      { key: 'id', label: 'Event ID', type: 'string' },
      { key: 'event', label: 'Event Type', type: 'string' },
      { key: 'timestamp', label: 'Event Timestamp', type: 'datetime' },
      { key: 'data__message_id', label: 'Message ID', type: 'string' },
      { key: 'data__conversation_id', label: 'Conversation ID', type: 'string' },
      { key: 'data__contact__id', label: 'Contact ID', type: 'string' },
      { key: 'data__contact__name', label: 'Contact Name', type: 'string' },
      { key: 'data__contact__phone', label: 'Contact Phone', type: 'string' },
      { key: 'data__content__type', label: 'Content Type', type: 'string' },
      { key: 'data__content__text', label: 'Message Text', type: 'string' },
      { key: 'data__content__media_url', label: 'Media URL', type: 'string' },
      { key: 'data__channel', label: 'Channel', type: 'string' },
      { key: 'data__received_at', label: 'Received At', type: 'datetime' }
    ]
  }
}
