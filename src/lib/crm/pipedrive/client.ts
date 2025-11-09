/**
 * Pipedrive CRM Client
 *
 * Implements Pipedrive API v1 integration
 * https://developers.pipedrive.com/docs/api/v1
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
import { PipedriveAuth } from './auth'
import {
  getPipedriveFieldMappings,
  transformToPipedrivePerson,
  transformFromPipedrivePerson,
  transformToPipedriveDeal,
  transformFromPipedriveDeal,
} from './mapping'

export class PipedriveClient extends CRMClient {
  private auth: PipedriveAuth | null = null
  private baseUrl: string
  private rateLimiter = CRMUtils.createRateLimiter(20) // 20 requests per second (Pipedrive limit: 10,000/day)

  constructor(credentials: CRMCredentials) {
    super(credentials)
    this.fieldMappings = getPipedriveFieldMappings('persons')
    this.baseUrl = 'https://api.pipedrive.com/api/v1'
  }

  /**
   * Authenticate with Pipedrive
   */
  async authenticate(): Promise<void> {
    if (!this.credentials.apiKey) {
      throw new Error('Missing Pipedrive API token')
    }

    const isValid = await this.validateConnection()
    if (!isValid.connected) {
      throw new Error('Invalid Pipedrive credentials')
    }
  }

  /**
   * Refresh access token (not applicable for Pipedrive)
   */
  async refreshToken(): Promise<void> {
    // Pipedrive uses API tokens that don't expire
    console.log('Pipedrive API tokens do not expire')
  }

  /**
   * Validate connection
   */
  async validateConnection(): Promise<CRMConnectionStatus> {
    try {
      const response = await this.makeRequest('/persons')

      if (!response.ok) {
        return {
          connected: false,
          lastError: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      const recordCount = data.additional_data?.pagination?.total || 0

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
   * Get contacts (persons)
   */
  async getContacts(options: QueryOptions = {}): Promise<CRMContact[]> {
    const { limit = 100, offset = 0 } = options

    const params = new URLSearchParams({
      limit: limit.toString(),
      start: offset.toString(),
    })

    const response = await this.makeRequest(`/persons?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch persons: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.data || []).map((person: any) => this.transformPerson(person))
  }

  /**
   * Get single contact
   */
  async getContact(id: string): Promise<CRMContact> {
    const response = await this.makeRequest(`/persons/${id}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch person: ${await response.text()}`)
    }

    const data = await response.json()
    return this.transformPerson(data.data)
  }

  /**
   * Create contact
   */
  async createContact(contact: CRMContact): Promise<CRMContact> {
    const pipedrivePerson = transformToPipedrivePerson(contact)

    const response = await this.makeRequest('/persons', {
      method: 'POST',
      body: JSON.stringify(pipedrivePerson),
    })

    if (!response.ok) {
      throw new Error(`Failed to create person: ${await response.text()}`)
    }

    const data = await response.json()
    return this.getContact(data.data.id)
  }

  /**
   * Update contact
   */
  async updateContact(id: string, contact: Partial<CRMContact>): Promise<CRMContact> {
    const pipedrivePerson = transformToPipedrivePerson(contact)

    const response = await this.makeRequest(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pipedrivePerson),
    })

    if (!response.ok) {
      throw new Error(`Failed to update person: ${await response.text()}`)
    }

    return this.getContact(id)
  }

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    const response = await this.makeRequest(`/persons/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete person: ${await response.text()}`)
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string): Promise<CRMContact[]> {
    const params = new URLSearchParams({
      term: query,
      limit: '20',
    })

    const response = await this.makeRequest(`/persons/search?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to search persons: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.data?.items || []).map((item: any) => this.transformPerson(item.item))
  }

  /**
   * Get deals
   */
  async getDeals(options: QueryOptions = {}): Promise<CRMDeal[]> {
    const { limit = 100, offset = 0 } = options

    const params = new URLSearchParams({
      limit: limit.toString(),
      start: offset.toString(),
    })

    const response = await this.makeRequest(`/deals?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch deals: ${await response.text()}`)
    }

    const data = await response.json()
    return (data.data || []).map((deal: any) => this.transformDeal(deal))
  }

  /**
   * Get single deal
   */
  async getDeal(id: string): Promise<CRMDeal> {
    const response = await this.makeRequest(`/deals/${id}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch deal: ${await response.text()}`)
    }

    const data = await response.json()
    return this.transformDeal(data.data)
  }

  /**
   * Create deal
   */
  async createDeal(deal: CRMDeal): Promise<CRMDeal> {
    const pipedriveDeal = transformToPipedriveDeal(deal)

    const response = await this.makeRequest('/deals', {
      method: 'POST',
      body: JSON.stringify(pipedriveDeal),
    })

    if (!response.ok) {
      throw new Error(`Failed to create deal: ${await response.text()}`)
    }

    const data = await response.json()
    return this.getDeal(data.data.id)
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, deal: Partial<CRMDeal>): Promise<CRMDeal> {
    const pipedriveDeal = transformToPipedriveDeal(deal)

    const response = await this.makeRequest(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pipedriveDeal),
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
    const response = await this.makeRequest(`/deals/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete deal: ${await response.text()}`)
    }
  }

  /**
   * Create activity
   */
  async createActivity(activity: CRMActivity): Promise<CRMActivity> {
    const pipedriveActivity = {
      subject: activity.subject,
      note: activity.description,
      person_id: activity.contactId ? parseInt(activity.contactId) : undefined,
      deal_id: activity.dealId ? parseInt(activity.dealId) : undefined,
      due_date: activity.dueDate?.toISOString().split('T')[0],
      done: activity.completed ? '1' : '0',
      type: this.mapActivityType(activity.type),
    }

    const response = await this.makeRequest('/activities', {
      method: 'POST',
      body: JSON.stringify(pipedriveActivity),
    })

    if (!response.ok) {
      throw new Error(`Failed to create activity: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...activity, id: data.data.id.toString() }
  }

  /**
   * Create note
   */
  async createNote(note: CRMNote): Promise<CRMNote> {
    const pipedriveNote = {
      content: note.content,
      person_id: note.contactId ? parseInt(note.contactId) : undefined,
      deal_id: note.dealId ? parseInt(note.dealId) : undefined,
    }

    const response = await this.makeRequest('/notes', {
      method: 'POST',
      body: JSON.stringify(pipedriveNote),
    })

    if (!response.ok) {
      throw new Error(`Failed to create note: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...note, id: data.data.id.toString() }
  }

  /**
   * Setup webhooks
   */
  async setupWebhooks(config: WebhookConfig): Promise<void> {
    // Register webhooks for specific events
    for (const event of config.events) {
      const webhook = {
        subscription_url: config.url,
        event_action: event,
        event_object: '*',
        ...(config.secret && { secret: config.secret }),
      }

      const response = await this.makeRequest('/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhook),
      })

      if (!response.ok) {
        throw new Error(`Failed to setup webhook: ${await response.text()}`)
      }
    }
  }

  /**
   * Handle webhook
   */
  async handleWebhook(payload: any): Promise<CRMWebhookEvent> {
    return {
      id: payload.meta.id,
      type: payload.meta.action,
      objectType: payload.meta.object,
      objectId: payload.current.id,
      action: payload.meta.action,
      data: payload.current,
      timestamp: new Date(payload.meta.timestamp * 1000),
    }
  }

  /**
   * Make API request with rate limiting
   */
  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials.apiKey) {
      throw new Error('Not authenticated')
    }

    const url = `${this.baseUrl}${path}`
    const separator = path.includes('?') ? '&' : '?'
    const urlWithToken = `${url}${separator}api_token=${this.credentials.apiKey}`

    return this.rateLimiter(async () => {
      const response = await fetch(urlWithToken, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
      })

      return response
    })
  }

  /**
   * Transform Pipedrive Person to CRMContact
   */
  private transformPerson(pipedrivePerson: any): CRMContact {
    return transformFromPipedrivePerson(pipedrivePerson)
  }

  /**
   * Transform Pipedrive Deal to CRMDeal
   */
  private transformDeal(pipedriveDeal: any): CRMDeal {
    return transformFromPipedriveDeal(pipedriveDeal)
  }

  /**
   * Map activity type to Pipedrive activity type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      call: 'call',
      meeting: 'meeting',
      email: 'email',
      note: 'task',
      task: 'task',
    }
    return typeMap[type] || 'task'
  }
}
