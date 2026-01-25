/**
 * Send Message Action
 *
 * Sends a WhatsApp message to a contact.
 * Supports both text messages and pre-approved templates.
 *
 * Endpoint: POST /api/integrations/zapier/actions/send-message
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

/**
 * Send a WhatsApp message
 */
const perform = async (z, bundle) => {
  const body = {
    to: bundle.inputData.phone,
    channel: 'whatsapp'
  }

  // Determine message type and build appropriate payload
  if (bundle.inputData.message_type === 'template') {
    // Template message - requires pre-approved WhatsApp template
    body.template = {
      name: bundle.inputData.template_name,
      language: bundle.inputData.template_language || 'en'
    }

    // Add template components if provided (for variable substitution)
    if (bundle.inputData.template_variables) {
      const variables = bundle.inputData.template_variables.split(',').map(v => v.trim())
      if (variables.length > 0) {
        body.template.components = [{
          type: 'body',
          parameters: variables.map(text => ({
            type: 'text',
            text
          }))
        }]
      }
    }
  } else {
    // Text message
    body.message = {
      type: 'text',
      text: bundle.inputData.message_text
    }
  }

  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/actions/send-message`,
    method: 'POST',
    body
  })

  return response.data
}

module.exports = {
  key: 'send_message',
  noun: 'Message',

  display: {
    label: 'Send WhatsApp Message',
    description: 'Sends a WhatsApp message to a contact. Use text messages for replies within 24 hours, or templates for marketing/outreach.',
    important: true
  },

  operation: {
    inputFields: [
      {
        key: 'phone',
        type: 'string',
        label: 'Phone Number',
        helpText: 'Phone number in E.164 format (e.g., +1234567890). Include country code.',
        required: true
      },
      {
        key: 'message_type',
        type: 'string',
        label: 'Message Type',
        helpText: 'Text messages work within 24-hour window. Templates are required for outbound messages outside the window.',
        choices: [
          { value: 'text', label: 'Text Message' },
          { value: 'template', label: 'Template Message' }
        ],
        default: 'text',
        required: true,
        altersDynamicFields: true
      },
      {
        key: 'message_text',
        type: 'text',
        label: 'Message Text',
        helpText: 'The text message to send. Required for text messages.',
        required: false
      },
      {
        key: 'template_name',
        type: 'string',
        label: 'Template Name',
        helpText: 'The name of your approved WhatsApp Business template. Required for template messages.',
        required: false
      },
      {
        key: 'template_language',
        type: 'string',
        label: 'Template Language',
        helpText: 'Language code for the template (e.g., en, es, fr). Default: en',
        default: 'en',
        required: false
      },
      {
        key: 'template_variables',
        type: 'string',
        label: 'Template Variables',
        helpText: 'Comma-separated values to substitute in template placeholders (e.g., "John,Order123")',
        required: false
      }
    ],

    perform,

    // Sample response data
    sample: {
      success: true,
      message_id: 'msg_123456',
      conversation_id: 'conv_789',
      contact_id: 'contact_456',
      status: 'sent',
      sent_at: '2026-01-25T12:00:00Z'
    },

    // Output field definitions
    outputFields: [
      { key: 'success', label: 'Success', type: 'boolean' },
      { key: 'message_id', label: 'Message ID', type: 'string' },
      { key: 'conversation_id', label: 'Conversation ID', type: 'string' },
      { key: 'contact_id', label: 'Contact ID', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'sent_at', label: 'Sent At', type: 'datetime' }
    ]
  }
}
