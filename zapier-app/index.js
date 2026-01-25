/**
 * ADSapp Zapier Integration
 *
 * WhatsApp Business Inbox integration for Zapier.
 * Enables workflow automation with real-time triggers and actions.
 *
 * Triggers:
 * - new_message: Fires when a new WhatsApp message is received
 * - new_contact: Fires when a new contact is created
 *
 * Actions:
 * - send_message: Send a WhatsApp message (text or template)
 * - create_contact: Create a new contact
 * - update_contact: Update an existing contact
 */

const authentication = require('./authentication')
const newMessage = require('./triggers/new_message')
const newContact = require('./triggers/new_contact')
const sendMessage = require('./creates/send_message')
const createContact = require('./creates/create_contact')
const updateContact = require('./creates/update_contact')

const BASE_URL = process.env.ADSAPP_API_URL || 'https://app.adsapp.com'

module.exports = {
  // App version from package.json
  version: require('./package.json').version,

  // Zapier platform version
  platformVersion: require('zapier-platform-core').version,

  // OAuth 2.0 authentication configuration
  authentication,

  // Request middleware - runs before each API request
  beforeRequest: [
    (request, z, bundle) => {
      // Add Authorization header if we have an access token
      if (bundle.authData && bundle.authData.access_token) {
        request.headers.Authorization = `Bearer ${bundle.authData.access_token}`
      }

      // Add consistent content-type for JSON requests
      if (request.body && typeof request.body === 'object') {
        request.headers['Content-Type'] = 'application/json'
      }

      return request
    }
  ],

  // Response middleware - runs after each API response
  afterResponse: [
    (response, z, bundle) => {
      // Trigger token refresh on 401 Unauthorized
      if (response.status === 401) {
        throw new z.errors.RefreshAuthError('Session expired. Refreshing access token.')
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60'
        throw new z.errors.ThrottledError(`Rate limited. Retry after ${retryAfter} seconds.`, parseInt(retryAfter, 10))
      }

      return response
    }
  ],

  // Triggers - events that start Zaps
  triggers: {
    [newMessage.key]: newMessage,
    [newContact.key]: newContact
  },

  // Creates - actions that create or modify data
  creates: {
    [sendMessage.key]: sendMessage,
    [createContact.key]: createContact,
    [updateContact.key]: updateContact
  },

  // Searches - find existing data (not implemented yet)
  searches: {},

  // Resources - combine related triggers, creates, and searches
  resources: {}
}
