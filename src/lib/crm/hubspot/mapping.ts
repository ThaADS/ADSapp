/**
 * HubSpot Field Mapping
 *
 * Defines field mappings between ADSapp and HubSpot objects
 */

import { FieldMapping } from '../base-client'

/**
 * Standard field mappings for HubSpot Contact
 */
export const HUBSPOT_CONTACT_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'firstName',
    crmField: 'firstname',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastName',
    crmField: 'lastname',
    direction: 'bidirectional',
  },
  {
    adsappField: 'email',
    crmField: 'email',
    direction: 'bidirectional',
  },
  {
    adsappField: 'phone',
    crmField: 'phone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'mobilePhone',
    crmField: 'mobilephone',
    direction: 'bidirectional',
  },
  {
    adsappField: 'company',
    crmField: 'company',
    direction: 'bidirectional',
  },
  {
    adsappField: 'title',
    crmField: 'jobtitle',
    direction: 'bidirectional',
  },
  {
    adsappField: 'website',
    crmField: 'website',
    direction: 'bidirectional',
  },
  {
    adsappField: 'address',
    crmField: 'address',
    direction: 'bidirectional',
  },
  {
    adsappField: 'city',
    crmField: 'city',
    direction: 'bidirectional',
  },
  {
    adsappField: 'state',
    crmField: 'state',
    direction: 'bidirectional',
  },
  {
    adsappField: 'zip',
    crmField: 'zip',
    direction: 'bidirectional',
  },
  {
    adsappField: 'country',
    crmField: 'country',
    direction: 'bidirectional',
  },
]

/**
 * Custom field mappings (custom properties in HubSpot)
 */
export const HUBSPOT_CUSTOM_CONTACT_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'tags',
    crmField: 'adsapp_tags',
    direction: 'bidirectional',
    transform: (value: string[] | string) => {
      // Convert array to semicolon-separated string for HubSpot
      if (Array.isArray(value)) {
        return value.join(';')
      }
      // Convert semicolon-separated string to array for ADSapp
      if (typeof value === 'string') {
        return value.split(';').map(tag => tag.trim())
      }
      return value
    },
  },
  {
    adsappField: 'customFields',
    crmField: 'adsapp_custom_fields',
    direction: 'bidirectional',
    transform: (value: any) => {
      // Convert object to JSON string for HubSpot
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
    crmField: 'whatsapp_opt_in',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastWhatsAppMessageDate',
    crmField: 'last_whatsapp_message_date',
    direction: 'to_crm',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.getTime() // HubSpot uses milliseconds since epoch
      }
      return value
    },
  },
  {
    adsappField: 'whatsappConversationCount',
    crmField: 'whatsapp_conversation_count',
    direction: 'to_crm',
  },
  {
    adsappField: 'lifecycleStage',
    crmField: 'lifecyclestage',
    direction: 'bidirectional',
  },
  {
    adsappField: 'leadStatus',
    crmField: 'hs_lead_status',
    direction: 'bidirectional',
  },
]

/**
 * Standard field mappings for HubSpot Deal
 */
export const HUBSPOT_DEAL_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'title',
    crmField: 'dealname',
    direction: 'bidirectional',
  },
  {
    adsappField: 'value',
    crmField: 'amount',
    direction: 'bidirectional',
  },
  {
    adsappField: 'stage',
    crmField: 'dealstage',
    direction: 'bidirectional',
  },
  {
    adsappField: 'expectedCloseDate',
    crmField: 'closedate',
    direction: 'bidirectional',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.getTime() // HubSpot uses milliseconds since epoch
      }
      return value
    },
  },
  {
    adsappField: 'pipeline',
    crmField: 'pipeline',
    direction: 'bidirectional',
  },
  {
    adsappField: 'description',
    crmField: 'description',
    direction: 'bidirectional',
  },
  {
    adsappField: 'dealType',
    crmField: 'dealtype',
    direction: 'bidirectional',
  },
]

/**
 * Get default field mappings for a HubSpot object type
 */
export function getHubSpotFieldMappings(
  objectType: 'contacts' | 'deals' | 'companies',
  includeCustomFields = true
): FieldMapping[] {
  switch (objectType) {
    case 'contacts':
      return includeCustomFields
        ? [...HUBSPOT_CONTACT_MAPPINGS, ...HUBSPOT_CUSTOM_CONTACT_MAPPINGS]
        : HUBSPOT_CONTACT_MAPPINGS
    case 'deals':
      return HUBSPOT_DEAL_MAPPINGS
    default:
      return []
  }
}

/**
 * Transform ADSapp contact to HubSpot Contact
 */
export function transformToHubSpotContact(adsappContact: any): any {
  const hubspotContact: any = { properties: {} }

  const mappings = getHubSpotFieldMappings('contacts')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappContact[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        hubspotContact.properties[mapping.crmField] = transformedValue
      }
    }
  }

  return hubspotContact
}

/**
 * Transform HubSpot Contact to ADSapp contact
 */
export function transformFromHubSpotContact(hubspotContact: any): any {
  const adsappContact: any = {}

  const mappings = getHubSpotFieldMappings('contacts')
  const properties = hubspotContact.properties || {}

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      const value = properties[mapping.crmField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappContact[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add HubSpot metadata
  adsappContact.hubspotId = hubspotContact.id
  adsappContact.hubspotCreatedAt = properties.createdate
  adsappContact.hubspotUpdatedAt = properties.lastmodifieddate

  return adsappContact
}

/**
 * Transform ADSapp deal to HubSpot Deal
 */
export function transformToHubSpotDeal(adsappDeal: any): any {
  const hubspotDeal: any = { properties: {} }

  const mappings = getHubSpotFieldMappings('deals')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappDeal[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        hubspotDeal.properties[mapping.crmField] = transformedValue
      }
    }
  }

  return hubspotDeal
}

/**
 * Transform HubSpot Deal to ADSapp deal
 */
export function transformFromHubSpotDeal(hubspotDeal: any): any {
  const adsappDeal: any = {}

  const mappings = getHubSpotFieldMappings('deals')
  const properties = hubspotDeal.properties || {}

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      const value = properties[mapping.crmField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappDeal[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add HubSpot metadata
  adsappDeal.hubspotId = hubspotDeal.id
  adsappDeal.hubspotCreatedAt = properties.createdate
  adsappDeal.hubspotUpdatedAt = properties.lastmodifieddate

  return adsappDeal
}
