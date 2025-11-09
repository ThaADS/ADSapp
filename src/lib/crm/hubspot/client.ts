/**
 * HubSpot CRM Client
 *
 * Implements HubSpot API v3 integration
 * https://developers.hubspot.com/docs/api/crm/contacts
 */

import {
  CRMClient,
  CRMCredentials,
  CRMContact,
  CRMDeal,
  CRMActivity,
  CRMNote,
  QueryOptions,
  WebhookConfig,
  CRMWebhookEvent,
  CRMConnectionStatus,
  CRMUtils,
} from '../base-client'
import { HubSpotAuth } from './auth'
import {
  getHubSpotFieldMappings,
  transformToHubSpotContact,
  transformFromHubSpotContact,
  transformToHubSpotDeal,
  transformFromHubSpotDeal,
} from './mapping'

const API_BASE_URL = 'https://api.hubapi.com'

export class HubSpotClient extends CRMClient {
  private auth: HubSpotAuth | null = null
  private rateLimiter = CRMUtils.createRateLimiter(100) // 100 requests per second

  constructor(credentials: CRMCredentials) {
    super(credentials)
    this.fieldMappings = getHubSpotFieldMappings('contacts')
  }

  /**
   * Authenticate with HubSpot
   */
  async authenticate(): Promise<void> {
    if (!this.credentials.accessToken) {
      throw new Error('Missing HubSpot credentials')
    }

    const isValid = await this.validateConnection()
    if (!isValid.connected) {
      throw new Error('Invalid HubSpot credentials')
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    if (!this.credentials.refreshToken) {
      throw new Error('No refresh token available')
    }

    if (!this.auth) {
      throw new Error('Auth not configured')
    }

    const newCredentials = await this.auth.refreshAccessToken(this.credentials.refreshToken)
    this.credentials = newCredentials
  }

  /**
   * Validate connection
   */
  async validateConnection(): Promise<CRMConnectionStatus> {
    try {
      const response = await this.makeRequest('/crm/v3/objects/contacts', {
        method: 'GET',
      })

      if (!response.ok) {
        return {
          connected: false,
          lastError: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      const recordCount = data.total || 0

      return {
        connected: true,
        recordCount,
      }
    } catch (error) {
      return {
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get contacts
   */
  async getContacts(options: QueryOptions = {}): Promise<CRMContact[]> {
    const { limit = 100, offset = 0 } = options

    // Build properties list
    const properties = this.getContactProperties()

    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(offset && { after: offset.toString() }),
      properties: properties.join(','),
    })

    const response = await this.makeRequest(`/crm/v3/objects/contacts?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.results || []).map((contact: any) => this.transformContact(contact))
  }

  /**
   * Get single contact
   */
  async getContact(id: string): Promise<CRMContact> {
    const properties = this.getContactProperties()

    const params = new URLSearchParams({
      properties: properties.join(','),
    })

    const response = await this.makeRequest(`/crm/v3/objects/contacts/${id}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch contact: ${await response.text()}`)
    }

    const data = await response.json()
    return this.transformContact(data)
  }

  /**
   * Create contact
   */
  async createContact(contact: CRMContact): Promise<CRMContact> {
    const hubspotContact = transformToHubSpotContact(contact)

    const response = await this.makeRequest('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify(hubspotContact),
    })

    if (!response.ok) {
      throw new Error(`Failed to create contact: ${await response.text()}`)
    }

    const data = await response.json()
    return this.getContact(data.id)
  }

  /**
   * Update contact
   */
  async updateContact(id: string, contact: Partial<CRMContact>): Promise<CRMContact> {
    const hubspotContact = transformToHubSpotContact(contact)

    const response = await this.makeRequest(`/crm/v3/objects/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(hubspotContact),
    })

    if (!response.ok) {
      throw new Error(`Failed to update contact: ${await response.text()}`)
    }

    return this.getContact(id)
  }

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    const response = await this.makeRequest(`/crm/v3/objects/contacts/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete contact: ${await response.text()}`)
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string): Promise<CRMContact[]> {
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'CONTAINS_TOKEN',
              value: query,
            },
          ],
        },
        {
          filters: [
            {
              propertyName: 'firstname',
              operator: 'CONTAINS_TOKEN',
              value: query,
            },
          ],
        },
        {
          filters: [
            {
              propertyName: 'lastname',
              operator: 'CONTAINS_TOKEN',
              value: query,
            },
          ],
        },
      ],
      properties: this.getContactProperties(),
      limit: 20,
    }

    const response = await this.makeRequest('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      throw new Error(`Failed to search contacts: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.results || []).map((contact: any) => this.transformContact(contact))
  }

  /**
   * Get deals
   */
  async getDeals(options: QueryOptions = {}): Promise<CRMDeal[]> {
    const { limit = 100, offset = 0 } = options

    const properties = this.getDealProperties()

    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(offset && { after: offset.toString() }),
      properties: properties.join(','),
    })

    const response = await this.makeRequest(`/crm/v3/objects/deals?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch deals: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.results || []).map((deal: any) => this.transformDeal(deal))
  }

  /**
   * Get single deal
   */
  async getDeal(id: string): Promise<CRMDeal> {
    const properties = this.getDealProperties()

    const params = new URLSearchParams({
      properties: properties.join(','),
    })

    const response = await this.makeRequest(`/crm/v3/objects/deals/${id}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch deal: ${await response.text()}`)
    }

    const data = await response.json()
    return this.transformDeal(data)
  }

  /**
   * Create deal
   */
  async createDeal(deal: CRMDeal): Promise<CRMDeal> {
    const hubspotDeal = transformToHubSpotDeal(deal)

    const response = await this.makeRequest('/crm/v3/objects/deals', {
      method: 'POST',
      body: JSON.stringify(hubspotDeal),
    })

    if (!response.ok) {
      throw new Error(`Failed to create deal: ${await response.text()}`)
    }

    const data = await response.json()
    return this.getDeal(data.id)
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, deal: Partial<CRMDeal>): Promise<CRMDeal> {
    const hubspotDeal = transformToHubSpotDeal(deal)

    const response = await this.makeRequest(`/crm/v3/objects/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(hubspotDeal),
    })

    if (!response.ok) {
      throw new Error(`Failed to update deal: ${await response.text()}`)
    }

    return this.getDeal(id)
  }

  /**
   * Delete deal
   */
  async deleteDeal(id: string): Promise<void> {
    const response = await this.makeRequest(`/crm/v3/objects/deals/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete deal: ${await response.text()}`)
    }
  }

  /**
   * Create activity (Engagement)
   */
  async createActivity(activity: CRMActivity): Promise<CRMActivity> {
    const engagement = {
      properties: {
        hs_timestamp: activity.createdAt?.getTime() || Date.now(),
        hs_engagement_type: this.mapActivityType(activity.type),
        hs_engagement_source: 'WHATSAPP',
      },
      associations: [
        ...(activity.contactId
          ? [
              {
                to: { id: activity.contactId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }],
              },
            ]
          : []),
        ...(activity.dealId
          ? [
              {
                to: { id: activity.dealId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }],
              },
            ]
          : []),
      ],
    }

    const response = await this.makeRequest('/crm/v3/objects/engagements', {
      method: 'POST',
      body: JSON.stringify(engagement),
    })

    if (!response.ok) {
      throw new Error(`Failed to create engagement: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...activity, id: data.id }
  }

  /**
   * Create note
   */
  async createNote(note: CRMNote): Promise<CRMNote> {
    const hubspotNote = {
      properties: {
        hs_note_body: note.content,
        hs_timestamp: note.createdAt?.getTime() || Date.now(),
      },
      associations: [
        ...(note.contactId
          ? [
              {
                to: { id: note.contactId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
              },
            ]
          : []),
        ...(note.dealId
          ? [
              {
                to: { id: note.dealId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }],
              },
            ]
          : []),
      ],
    }

    const response = await this.makeRequest('/crm/v3/objects/notes', {
      method: 'POST',
      body: JSON.stringify(hubspotNote),
    })

    if (!response.ok) {
      throw new Error(`Failed to create note: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...note, id: data.id }
  }

  /**
   * Setup webhooks
   */
  async setupWebhooks(config: WebhookConfig): Promise<void> {
    // HubSpot webhooks are configured via the app settings
    console.warn('HubSpot webhooks must be configured in app settings')
  }

  /**
   * Handle webhook
   */
  async handleWebhook(payload: any): Promise<CRMWebhookEvent> {
    return {
      id: payload.subscriptionId,
      type: payload.subscriptionType,
      objectType: payload.objectType === 'contact' ? 'contact' : 'deal',
      objectId: payload.objectId,
      action: payload.propertyName ? 'updated' : 'created',
      data: payload,
      timestamp: new Date(payload.occurredAt),
    }
  }

  /**
   * Make API request with rate limiting
   */
  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials.accessToken) {
      throw new Error('Not authenticated')
    }

    const url = `${API_BASE_URL}${path}`

    return this.rateLimiter(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      // Handle token expiration
      if (response.status === 401) {
        await this.refreshToken()
        // Retry request with new token
        return fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })
      }

      return response
    })
  }

  /**
   * Get contact properties to fetch
   */
  private getContactProperties(): string[] {
    return [
      'firstname',
      'lastname',
      'email',
      'phone',
      'mobilephone',
      'company',
      'jobtitle',
      'website',
      'address',
      'city',
      'state',
      'zip',
      'country',
      'createdate',
      'lastmodifieddate',
      'lifecyclestage',
      'hs_lead_status',
    ]
  }

  /**
   * Get deal properties to fetch
   */
  private getDealProperties(): string[] {
    return [
      'dealname',
      'amount',
      'dealstage',
      'closedate',
      'pipeline',
      'description',
      'dealtype',
      'createdate',
      'hs_lastmodifieddate',
    ]
  }

  /**
   * Transform HubSpot Contact to CRMContact
   */
  private transformContact(hubspotContact: any): CRMContact {
    return transformFromHubSpotContact(hubspotContact)
  }

  /**
   * Transform HubSpot Deal to CRMDeal
   */
  private transformDeal(hubspotDeal: any): CRMDeal {
    return transformFromHubSpotDeal(hubspotDeal)
  }

  /**
   * Map activity type to HubSpot engagement type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      call: 'CALL',
      meeting: 'MEETING',
      email: 'EMAIL',
      note: 'NOTE',
      task: 'TASK',
    }
    return typeMap[type] || 'NOTE'
  }
}
