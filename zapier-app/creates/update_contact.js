/**
 * Update Contact Action
 *
 * Updates an existing contact in ADSapp.
 * Only provided fields are updated; omitted fields remain unchanged.
 *
 * Endpoint: PUT /api/integrations/zapier/actions/contacts/{id}
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

/**
 * Update an existing contact
 */
const perform = async (z, bundle) => {
  const body = {}

  // Only include fields that were provided
  if (bundle.inputData.name) {
    body.name = bundle.inputData.name
  }

  if (bundle.inputData.email) {
    body.email = bundle.inputData.email
  }

  if (bundle.inputData.tags) {
    body.tags = bundle.inputData.tags.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Parse custom fields if provided as JSON
  // Note: Custom fields are merged with existing values on the server
  if (bundle.inputData.custom_fields) {
    try {
      body.custom_fields = JSON.parse(bundle.inputData.custom_fields)
    } catch (e) {
      z.console.log('Invalid custom_fields JSON, ignoring:', e.message)
    }
  }

  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/actions/contacts/${bundle.inputData.contact_id}`,
    method: 'PUT',
    body
  })

  return response.data
}

module.exports = {
  key: 'update_contact',
  noun: 'Contact',

  display: {
    label: 'Update Contact',
    description: 'Updates an existing contact in your ADSapp inbox. Only provided fields are updated.',
    important: false
  },

  operation: {
    inputFields: [
      {
        key: 'contact_id',
        type: 'string',
        label: 'Contact ID',
        helpText: 'The ID of the contact to update. You can get this from a "New Contact" or "New Message" trigger.',
        required: true
      },
      {
        key: 'name',
        type: 'string',
        label: 'Name',
        helpText: 'New contact name. Leave empty to keep existing name.',
        required: false
      },
      {
        key: 'email',
        type: 'string',
        label: 'Email',
        helpText: 'New email address. Leave empty to keep existing email.',
        required: false
      },
      {
        key: 'tags',
        type: 'string',
        label: 'Tags',
        helpText: 'Comma-separated tags to replace existing tags (e.g., "vip,returning"). Leave empty to keep existing tags.',
        required: false
      },
      {
        key: 'custom_fields',
        type: 'text',
        label: 'Custom Fields (JSON)',
        helpText: 'JSON object with custom field values to update. Values are merged with existing custom fields.',
        required: false
      }
    ],

    perform,

    // Sample response data
    sample: {
      success: true,
      contact: {
        id: 'contact_456',
        name: 'John Smith',
        phone: '+1234567890',
        email: 'john.smith@example.com',
        tags: ['vip', 'returning'],
        custom_fields: { company: 'Acme Corp', source: 'website' },
        updated_at: '2026-01-25T12:30:00Z'
      }
    },

    // Output field definitions
    outputFields: [
      { key: 'success', label: 'Success', type: 'boolean' },
      { key: 'contact__id', label: 'Contact ID', type: 'string' },
      { key: 'contact__name', label: 'Name', type: 'string' },
      { key: 'contact__phone', label: 'Phone', type: 'string' },
      { key: 'contact__email', label: 'Email', type: 'string' },
      { key: 'contact__tags', label: 'Tags', type: 'string' },
      { key: 'contact__custom_fields', label: 'Custom Fields', type: 'string' },
      { key: 'contact__updated_at', label: 'Updated At', type: 'datetime' }
    ]
  }
}
