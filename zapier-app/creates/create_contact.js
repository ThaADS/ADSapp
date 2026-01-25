/**
 * Create Contact Action
 *
 * Creates a new contact in ADSapp.
 * Contacts are automatically associated with the authenticated organization.
 *
 * Endpoint: POST /api/integrations/zapier/actions/contacts
 */

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

/**
 * Create a new contact
 */
const perform = async (z, bundle) => {
  const body = {
    name: bundle.inputData.name,
    phone: bundle.inputData.phone
  }

  // Add optional fields if provided
  if (bundle.inputData.email) {
    body.email = bundle.inputData.email
  }

  if (bundle.inputData.tags) {
    body.tags = bundle.inputData.tags.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Parse custom fields if provided as JSON
  if (bundle.inputData.custom_fields) {
    try {
      body.custom_fields = JSON.parse(bundle.inputData.custom_fields)
    } catch (e) {
      // If not valid JSON, ignore custom fields
      z.console.log('Invalid custom_fields JSON, ignoring:', e.message)
    }
  }

  const response = await z.request({
    url: `${BASE_URL}/api/integrations/zapier/actions/contacts`,
    method: 'POST',
    body
  })

  return response.data
}

module.exports = {
  key: 'create_contact',
  noun: 'Contact',

  display: {
    label: 'Create Contact',
    description: 'Creates a new contact in your ADSapp inbox.',
    important: false
  },

  operation: {
    inputFields: [
      {
        key: 'name',
        type: 'string',
        label: 'Name',
        helpText: 'Contact full name',
        required: true
      },
      {
        key: 'phone',
        type: 'string',
        label: 'Phone Number',
        helpText: 'Phone number in E.164 format (e.g., +1234567890). Include country code.',
        required: true
      },
      {
        key: 'email',
        type: 'string',
        label: 'Email',
        helpText: 'Contact email address',
        required: false
      },
      {
        key: 'tags',
        type: 'string',
        label: 'Tags',
        helpText: 'Comma-separated tags to apply to the contact (e.g., "lead,website,vip")',
        required: false
      },
      {
        key: 'custom_fields',
        type: 'text',
        label: 'Custom Fields (JSON)',
        helpText: 'Optional JSON object with custom field values (e.g., {"company": "Acme", "source": "website"})',
        required: false
      }
    ],

    perform,

    // Sample response data
    sample: {
      success: true,
      contact: {
        id: 'contact_456',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        tags: ['lead', 'website'],
        custom_fields: { company: 'Acme', source: 'website' },
        created_at: '2026-01-25T12:00:00Z'
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
      { key: 'contact__created_at', label: 'Created At', type: 'datetime' }
    ]
  }
}
