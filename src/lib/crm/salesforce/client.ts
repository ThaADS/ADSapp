/**
 * Salesforce CRM Client
 *
 * Implements Salesforce REST API v59.0 integration
 * https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
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
import { SalesforceAuth } from './auth'
import {
  getSalesforceFieldMappings,
  transformToSalesforceContact,
  transformFromSalesforceContact,
  transformToSalesforceOpportunity,
  transformFromSalesforceOpportunity,
} from './mapping'

const API_VERSION = 'v59.0'

export class SalesforceClient extends CRMClient {
  private auth: SalesforceAuth | null = null
  private rateLimiter = CRMUtils.createRateLimiter(100) // 100 requests per second

  constructor(credentials: CRMCredentials) {
    super(credentials)
    this.fieldMappings = getSalesforceFieldMappings('Contact')
  }

  /**
   * Authenticate with Salesforce
   */
  async authenticate(): Promise<void> {
    // Authentication is handled via OAuth flow
    // This method validates existing credentials
    if (!this.credentials.accessToken || !this.credentials.instanceUrl) {
      throw new Error('Missing Salesforce credentials')
    }

    const isValid = await this.validateConnection()
    if (!isValid.connected) {
      throw new Error('Invalid Salesforce credentials')
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
      const response = await this.makeRequest('/services/data')

      if (!response.ok) {
        return {
          connected: false,
          lastError: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      // Get record count
      const countResponse = await this.makeRequest(
        `/services/data/${API_VERSION}/query?q=SELECT+COUNT()+FROM+Contact`
      )

      let recordCount = 0
      if (countResponse.ok) {
        const countData = await countResponse.json()
        recordCount = countData.totalSize || 0
      }

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
    const { limit = 200, offset = 0, filter = {}, select = [] } = options

    // Build SOQL query
    const fields = select.length > 0 ? select.join(',') : this.getDefaultContactFields()
    let soql = `SELECT ${fields} FROM Contact`

    // Add filters
    const whereClauses: string[] = []
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'string') {
        whereClauses.push(`${key} = '${this.escapeSoql(value)}'`)
      } else if (typeof value === 'number') {
        whereClauses.push(`${key} = ${value}`)
      }
    }
    if (whereClauses.length > 0) {
      soql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // Add ordering
    soql += ` ORDER BY LastModifiedDate DESC`

    // Add limit and offset
    soql += ` LIMIT ${limit} OFFSET ${offset}`

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${await response.text()}`)
    }

    const data = await response.json()
    return data.records.map((record: any) => this.transformContact(record))
  }

  /**
   * Get single contact
   */
  async getContact(id: string): Promise<CRMContact> {
    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Contact/${id}`
    )

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
    const salesforceContact = transformToSalesforceContact(contact)

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Contact`,
      {
        method: 'POST',
        body: JSON.stringify(salesforceContact),
      }
    )

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
    const salesforceContact = transformToSalesforceContact(contact)

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Contact/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(salesforceContact),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update contact: ${await response.text()}`)
    }

    return this.getContact(id)
  }

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Contact/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete contact: ${await response.text()}`)
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string): Promise<CRMContact[]> {
    const sosl = `FIND {${this.escapeSoql(query)}} IN ALL FIELDS RETURNING Contact(${this.getDefaultContactFields()}) LIMIT 20`

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/search?q=${encodeURIComponent(sosl)}`
    )

    if (!response.ok) {
      throw new Error(`Failed to search contacts: ${await response.text()}`)
    }

    const data = await response.json()
    const contacts = data.searchRecords || []
    return contacts.map((record: any) => this.transformContact(record))
  }

  /**
   * Get deals (opportunities)
   */
  async getDeals(options: QueryOptions = {}): Promise<CRMDeal[]> {
    const { limit = 200, offset = 0 } = options

    const soql = `SELECT Id, Name, Amount, StageName, CloseDate, Probability, Description, Type, CreatedDate, LastModifiedDate FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT ${limit} OFFSET ${offset}`

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch opportunities: ${await response.text()}`)
    }

    const data = await response.json()
    return data.records.map((record: any) => this.transformOpportunity(record))
  }

  /**
   * Get single deal
   */
  async getDeal(id: string): Promise<CRMDeal> {
    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch opportunity: ${await response.text()}`)
    }

    const data = await response.json()
    return this.transformOpportunity(data)
  }

  /**
   * Create deal
   */
  async createDeal(deal: CRMDeal): Promise<CRMDeal> {
    const salesforceOpportunity = transformToSalesforceOpportunity(deal)

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Opportunity`,
      {
        method: 'POST',
        body: JSON.stringify(salesforceOpportunity),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create opportunity: ${await response.text()}`)
    }

    const data = await response.json()
    return this.getDeal(data.id)
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, deal: Partial<CRMDeal>): Promise<CRMDeal> {
    const salesforceOpportunity = transformToSalesforceOpportunity(deal)

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(salesforceOpportunity),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update opportunity: ${await response.text()}`)
    }

    return this.getDeal(id)
  }

  /**
   * Delete deal
   */
  async deleteDeal(id: string): Promise<void> {
    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete opportunity: ${await response.text()}`)
    }
  }

  /**
   * Create activity (Task)
   */
  async createActivity(activity: CRMActivity): Promise<CRMActivity> {
    const salesforceTask = {
      Subject: activity.subject,
      Description: activity.description,
      WhoId: activity.contactId, // Contact/Lead ID
      WhatId: activity.dealId, // Opportunity ID
      ActivityDate: activity.dueDate?.toISOString().split('T')[0],
      Status: activity.completed ? 'Completed' : 'Not Started',
      Type: this.mapActivityType(activity.type),
    }

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Task`,
      {
        method: 'POST',
        body: JSON.stringify(salesforceTask),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create task: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...activity, id: data.id }
  }

  /**
   * Create note
   */
  async createNote(note: CRMNote): Promise<CRMNote> {
    const salesforceNote = {
      Title: 'WhatsApp Conversation',
      Body: note.content,
      ParentId: note.contactId || note.dealId,
    }

    const response = await this.makeRequest(
      `/services/data/${API_VERSION}/sobjects/Note`,
      {
        method: 'POST',
        body: JSON.stringify(salesforceNote),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create note: ${await response.text()}`)
    }

    const data = await response.json()
    return { ...note, id: data.id }
  }

  /**
   * Setup webhooks (Platform Events)
   */
  async setupWebhooks(config: WebhookConfig): Promise<void> {
    // Salesforce uses Platform Events for webhooks
    // This requires custom Apex code or third-party tools like Heroku Connect
    console.warn('Salesforce webhooks require Platform Events setup')
    throw new Error('Salesforce webhooks not implemented yet')
  }

  /**
   * Handle webhook
   */
  async handleWebhook(payload: any): Promise<CRMWebhookEvent> {
    // Parse Salesforce Platform Event
    return {
      id: payload.event.replayId,
      type: payload.event.type,
      objectType: 'contact',
      objectId: payload.sobject.Id,
      action: 'updated',
      data: payload.sobject,
      timestamp: new Date(payload.event.createdDate),
    }
  }

  /**
   * Make API request with rate limiting
   */
  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials.instanceUrl || !this.credentials.accessToken) {
      throw new Error('Not authenticated')
    }

    const url = `${this.credentials.instanceUrl}${path}`

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
   * Get default contact fields
   */
  private getDefaultContactFields(): string {
    return 'Id, FirstName, LastName, Email, Phone, MobilePhone, Title, Department, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry, Description, CreatedDate, LastModifiedDate'
  }

  /**
   * Escape SOQL strings
   */
  private escapeSoql(value: string): string {
    return value.replace(/'/g, "\\'")
  }

  /**
   * Transform Salesforce Contact to CRMContact
   */
  private transformContact(salesforceContact: any): CRMContact {
    return transformFromSalesforceContact(salesforceContact)
  }

  /**
   * Transform Salesforce Opportunity to CRMDeal
   */
  private transformOpportunity(salesforceOpportunity: any): CRMDeal {
    return transformFromSalesforceOpportunity(salesforceOpportunity)
  }

  /**
   * Map activity type to Salesforce Task type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      call: 'Call',
      meeting: 'Meeting',
      email: 'Email',
      note: 'Other',
      task: 'Other',
    }
    return typeMap[type] || 'Other'
  }
}
