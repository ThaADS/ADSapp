/**
 * Salesforce Field Mapping
 *
 * Defines field mappings between ADSapp and Salesforce objects
 */

import { FieldMapping } from '../base-client'

/**
 * Standard field mappings for Salesforce Contact
 */
export const SALESFORCE_CONTACT_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'firstName',
    crmField: 'FirstName',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastName',
    crmField: 'LastName',
    direction: 'bidirectional',
  },
  {
    adsappField: 'email',
    crmField: 'Email',
    direction: 'bidirectional',
  },
  {
    adsappField: 'phone',
    crmField: 'Phone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mobilePhone',
    crmField: 'MobilePhone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'company',
    crmField: 'Account.Name',
    direction: 'bidirectional',
  },
  {
    adsappField: 'title',
    crmField: 'Title',
    direction: 'bidirectional',
  },
  {
    adsappField: 'department',
    crmField: 'Department',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mailingAddress',
    crmField: 'MailingStreet',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mailingCity',
    crmField: 'MailingCity',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mailingState',
    crmField: 'MailingState',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mailingPostalCode',
    crmField: 'MailingPostalCode',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mailingCountry',
    crmField: 'MailingCountry',
    direction: 'bidirectional',
  },
  {
    adsappField: 'description',
    crmField: 'Description',
    direction: 'bidirectional',
  },
]

/**
 * Custom field mappings (require custom fields in Salesforce)
 */
export const SALESFORCE_CUSTOM_CONTACT_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'tags',
    crmField: 'ADSapp_Tags__c',
    direction: 'bidirectional',
    transform: (value: string[] | string) => {
      // Convert array to comma-separated string for Salesforce
      if (Array.isArray(value)) {
        return value.join(',')
      }
      // Convert comma-separated string to array for ADSapp
      if (typeof value === 'string') {
        return value.split(',').map(tag => tag.trim())
      }
      return value
    },
  },
  {
    adsappField: 'customFields',
    crmField: 'ADSapp_Custom_Fields__c',
    direction: 'bidirectional',
    transform: (value: any) => {
      // Convert object to JSON string for Salesforce
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
      // Convert JSON string to object for ADSapp
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return {}
        }
      }
      return value
    },
  },
  {
    adsappField: 'whatsappOptIn',
    crmField: 'WhatsApp_Opt_In__c',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastWhatsAppMessageDate',
    crmField: 'Last_WhatsApp_Message__c',
    direction: 'to_crm',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    },
  },
  {
    adsappField: 'whatsappConversationCount',
    crmField: 'WhatsApp_Conversation_Count__c',
    direction: 'to_crm',
  },
]

/**
 * Standard field mappings for Salesforce Lead
 */
export const SALESFORCE_LEAD_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'firstName',
    crmField: 'FirstName',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastName',
    crmField: 'LastName',
    direction: 'bidirectional',
  },
  {
    adsappField: 'email',
    crmField: 'Email',
    direction: 'bidirectional',
  },
  {
    adsappField: 'phone',
    crmField: 'Phone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mobilePhone',
    crmField: 'MobilePhone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'company',
    crmField: 'Company',
    direction: 'bidirectional',
  },
  {
    adsappField: 'title',
    crmField: 'Title',
    direction: 'bidirectional',
  },
  {
    adsappField: 'status',
    crmField: 'Status',
    direction: 'bidirectional',
  },
  {
    adsappField: 'rating',
    crmField: 'Rating',
    direction: 'bidirectional',
  },
  {
    adsappField: 'leadSource',
    crmField: 'LeadSource',
    direction: 'from_crm',
    transform: () => 'WhatsApp', // Default to WhatsApp for ADSapp-created leads
  },
]

/**
 * Standard field mappings for Salesforce Opportunity
 */
export const SALESFORCE_OPPORTUNITY_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'title',
    crmField: 'Name',
    direction: 'bidirectional',
  },
  {
    adsappField: 'value',
    crmField: 'Amount',
    direction: 'bidirectional',
  },
  {
    adsappField: 'stage',
    crmField: 'StageName',
    direction: 'bidirectional',
  },
  {
    adsappField: 'expectedCloseDate',
    crmField: 'CloseDate',
    direction: 'bidirectional',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.toISOString().split('T')[0] // Salesforce uses YYYY-MM-DD format
      }
      return value
    },
  },
  {
    adsappField: 'probability',
    crmField: 'Probability',
    direction: 'bidirectional',
  },
  {
    adsappField: 'description',
    crmField: 'Description',
    direction: 'bidirectional',
  },
  {
    adsappField: 'type',
    crmField: 'Type',
    direction: 'bidirectional',
  },
  {
    adsappField: 'leadSource',
    crmField: 'LeadSource',
    direction: 'from_crm',
    transform: () => 'WhatsApp',
  },
]

/**
 * Get default field mappings for a Salesforce object type
 */
export function getSalesforceFieldMappings(
  objectType: 'Contact' | 'Lead' | 'Opportunity',
  includeCustomFields = true
): FieldMapping[] {
  switch (objectType) {
    case 'Contact':
      return includeCustomFields
        ? [...SALESFORCE_CONTACT_MAPPINGS, ...SALESFORCE_CUSTOM_CONTACT_MAPPINGS]
        : SALESFORCE_CONTACT_MAPPINGS
    case 'Lead':
      return SALESFORCE_LEAD_MAPPINGS
    case 'Opportunity':
      return SALESFORCE_OPPORTUNITY_MAPPINGS
    default:
      return []
  }
}

/**
 * Transform ADSapp contact to Salesforce Contact
 */
export function transformToSalesforceContact(adsappContact: any): any {
  const salesforceContact: any = {}

  const mappings = getSalesforceFieldMappings('Contact')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappContact[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        salesforceContact[mapping.crmField] = transformedValue
      }
    }
  }

  return salesforceContact
}

/**
 * Transform Salesforce Contact to ADSapp contact
 */
export function transformFromSalesforceContact(salesforceContact: any): any {
  const adsappContact: any = {}

  const mappings = getSalesforceFieldMappings('Contact')

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      const value = salesforceContact[mapping.crmField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappContact[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add Salesforce metadata
  adsappContact.salesforceId = salesforceContact.Id
  adsappContact.salesforceCreatedDate = salesforceContact.CreatedDate
  adsappContact.salesforceLastModifiedDate = salesforceContact.LastModifiedDate

  return adsappContact
}

/**
 * Transform ADSapp deal to Salesforce Opportunity
 */
export function transformToSalesforceOpportunity(adsappDeal: any): any {
  const salesforceOpportunity: any = {}

  const mappings = getSalesforceFieldMappings('Opportunity')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappDeal[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        salesforceOpportunity[mapping.crmField] = transformedValue
      }
    }
  }

  return salesforceOpportunity
}

/**
 * Transform Salesforce Opportunity to ADSapp deal
 */
export function transformFromSalesforceOpportunity(salesforceOpportunity: any): any {
  const adsappDeal: any = {}

  const mappings = getSalesforceFieldMappings('Opportunity')

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      const value = salesforceOpportunity[mapping.crmField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappDeal[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add Salesforce metadata
  adsappDeal.salesforceId = salesforceOpportunity.Id
  adsappDeal.salesforceCreatedDate = salesforceOpportunity.CreatedDate
  adsappDeal.salesforceLastModifiedDate = salesforceOpportunity.LastModifiedDate

  return adsappDeal
}
