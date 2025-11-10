/**
 * Base CRM Client Interface
 *
 * Defines the standard interface that all CRM integrations must implement.
 * This ensures consistent behavior across Salesforce, HubSpot, and Pipedrive.
 */

export interface CRMCredentials {
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
  instanceUrl?: string
  apiKey?: string
  expiresAt?: Date
}

export interface QueryOptions {
  limit?: number
  offset?: number
  filter?: Record<string, any>
  orderBy?: string
  select?: string[]
}

export interface CRMContact {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  tags?: string[]
  customFields?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface CRMDeal {
  id?: string
  title: string
  value?: number
  currency?: string
  stage?: string
  contactId?: string
  companyId?: string
  expectedCloseDate?: Date
  probability?: number
  customFields?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface CRMActivity {
  id?: string
  type: 'call' | 'meeting' | 'email' | 'note' | 'task'
  subject: string
  description?: string
  contactId?: string
  dealId?: string
  dueDate?: Date
  completed?: boolean
  createdAt?: Date
}

export interface CRMNote {
  id?: string
  content: string
  contactId?: string
  dealId?: string
  createdAt?: Date
}

export interface WebhookConfig {
  url: string
  events: string[]
  secret?: string
}

export interface CRMWebhookEvent {
  id: string
  type: string
  objectType: 'contact' | 'deal' | 'activity' | 'note'
  objectId: string
  action: 'created' | 'updated' | 'deleted'
  data: any
  timestamp: Date
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  errors: SyncError[]
  duration: number
}

export interface SyncError {
  recordId?: string
  error: string
  details?: any
}

export interface FieldMapping {
  adsappField: string
  crmField: string
  direction: 'to_crm' | 'from_crm' | 'bidirectional'
  transform?: (value: any) => any
}

export interface CRMConnectionStatus {
  connected: boolean
  lastSync?: Date
  lastError?: string
  recordCount?: number
}

/**
 * Base CRM Client Interface
 * All CRM integrations must implement this interface
 */
export abstract class CRMClient {
  protected credentials: CRMCredentials
  protected fieldMappings: FieldMapping[] = []

  constructor(credentials: CRMCredentials) {
    this.credentials = credentials
  }

  // Authentication
  abstract authenticate(): Promise<void>
  abstract refreshToken(): Promise<void>
  abstract validateConnection(): Promise<CRMConnectionStatus>

  // Contacts
  abstract getContacts(options?: QueryOptions): Promise<CRMContact[]>
  abstract getContact(id: string): Promise<CRMContact>
  abstract createContact(contact: CRMContact): Promise<CRMContact>
  abstract updateContact(id: string, contact: Partial<CRMContact>): Promise<CRMContact>
  abstract deleteContact(id: string): Promise<void>
  abstract searchContacts(query: string): Promise<CRMContact[]>

  // Deals/Opportunities
  abstract getDeals(options?: QueryOptions): Promise<CRMDeal[]>
  abstract getDeal(id: string): Promise<CRMDeal>
  abstract createDeal(deal: CRMDeal): Promise<CRMDeal>
  abstract updateDeal(id: string, deal: Partial<CRMDeal>): Promise<CRMDeal>
  abstract deleteDeal(id: string): Promise<void>

  // Activities/Notes
  abstract createActivity(activity: CRMActivity): Promise<CRMActivity>
  abstract createNote(note: CRMNote): Promise<CRMNote>

  // Webhooks
  abstract setupWebhooks(config: WebhookConfig): Promise<void>
  abstract handleWebhook(payload: any): Promise<CRMWebhookEvent>

  // Field Mapping
  setFieldMappings(mappings: FieldMapping[]): void {
    this.fieldMappings = mappings
  }

  /**
   * Map ADSapp contact to CRM contact
   */
  protected mapToCRM(adsappContact: any): CRMContact {
    const crmContact: CRMContact = {}

    for (const mapping of this.fieldMappings) {
      if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
        let value = adsappContact[mapping.adsappField]
        if (mapping.transform) {
          value = mapping.transform(value)
        }
        (crmContact as any)[mapping.crmField] = value
      }
    }

    return crmContact
  }

  /**
   * Map CRM contact to ADSapp contact
   */
  protected mapFromCRM(crmContact: any): any {
    const adsappContact: any = {}

    for (const mapping of this.fieldMappings) {
      if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
        let value = crmContact[mapping.crmField]
        if (mapping.transform) {
          value = mapping.transform(value)
        }
        adsappContact[mapping.adsappField] = value
      }
    }

    return adsappContact
  }
}

/**
 * CRM Client Factory
 */
export class CRMClientFactory {
  static create(type: 'salesforce' | 'hubspot' | 'pipedrive', credentials: CRMCredentials): CRMClient {
    switch (type) {
      case 'salesforce':
        // Lazy load to avoid circular dependencies
        const SalesforceClient = require('./salesforce/client').SalesforceClient
        return new SalesforceClient(credentials)
      case 'hubspot':
        const HubSpotClient = require('./hubspot/client').HubSpotClient
        return new HubSpotClient(credentials)
      case 'pipedrive':
        const PipedriveClient = require('./pipedrive/client').PipedriveClient
        return new PipedriveClient(credentials)
      default:
        throw new Error(`Unsupported CRM type: ${type}`)
    }
  }
}

/**
 * Common utilities for CRM integrations
 */
export class CRMUtils {
  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number
      initialDelay?: number
      maxDelay?: number
      backoffMultiplier?: number
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
    } = options

    let lastError: Error | undefined
    let delay = initialDelay

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxAttempts) {
          break
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * backoffMultiplier, maxDelay)
      }
    }

    throw lastError
  }

  /**
   * Format phone number for CRM (E.164 format)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')

    // Add + prefix if not present
    if (!digits.startsWith('+')) {
      return `+${digits}`
    }

    return digits
  }

  /**
   * Parse phone number from CRM
   */
  static parsePhoneNumber(phone: string): string {
    if (!phone) return ''

    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '')
  }

  /**
   * Sanitize custom fields
   */
  static sanitizeCustomFields(fields: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(fields)) {
      // Skip null or undefined values
      if (value === null || value === undefined) {
        continue
      }

      // Convert dates to ISO strings
      if (value instanceof Date) {
        sanitized[key] = value.toISOString()
      } else if (typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeCustomFields(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Chunk array for batch processing
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Rate limiter
   */
  static createRateLimiter(requestsPerSecond: number) {
    const queue: Array<() => void> = []
    const interval = 1000 / requestsPerSecond

    setInterval(() => {
      const fn = queue.shift()
      if (fn) fn()
    }, interval)

    return <T>(fn: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push(() => {
          fn().then(resolve).catch(reject)
        })
      })
    }
  }
}
