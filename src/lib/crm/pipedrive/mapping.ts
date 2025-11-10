/**
 * Pipedrive Field Mapping
 *
 * Defines field mappings between ADSapp and Pipedrive objects
 */

import { FieldMapping } from '../base-client'

/**
 * Standard field mappings for Pipedrive Person
 */
export const PIPEDRIVE_PERSON_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'firstName',
    crmField: 'first_name',
    direction: 'bidirectional',
  },
  {
    adsappField: 'lastName',
    crmField: 'last_name',
    direction: 'bidirectional',
  },
  {
    adsappField: 'email',
    crmField: 'email',
    direction: 'bidirectional',
    transform: (value: string | string[]) => {
      // Pipedrive stores emails as array of objects
      if (Array.isArray(value)) {
        return value.map(email => ({ value: email, primary: true }))
      }
      if (typeof value === 'string') {
        return [{ value, primary: true }]
      }
      return value
    },
  },
  {
    adsappField: 'phone',
    crmField: 'phone',
    direction: 'bidirectional',
    transform: (value: string | string[]) => {
      // Pipedrive stores phones as array of objects
      if (Array.isArray(value)) {
        return value.map(phone => ({ value: phone, primary: true }))
      }
      if (typeof value === 'string') {
        return [{ value, primary: true }]
      }
      return value
    },
  },
]

/**
 * Custom field mappings (custom fields in Pipedrive)
 */
export const PIPEDRIVE_CUSTOM_PERSON_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'tags',
    crmField: 'tags',
    direction: 'bidirectional',
    transform: (value: string[] | string) => {
      // Pipedrive expects comma-separated string
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
    crmField: 'custom_fields',
    direction: 'bidirectional',
    transform: (value: any) => {
      // Store as JSON
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
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
    crmField: 'last_whatsapp_message',
    direction: 'to_crm',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    },
  },
]

/**
 * Standard field mappings for Pipedrive Deal
 */
export const PIPEDRIVE_DEAL_MAPPINGS: FieldMapping[] = [
  {
    adsappField: 'title',
    crmField: 'title',
    direction: 'bidirectional',
  },
  {
    adsappField: 'value',
    crmField: 'value',
    direction: 'bidirectional',
  },
  {
    adsappField: 'currency',
    crmField: 'currency',
    direction: 'bidirectional',
  },
  {
    adsappField: 'stage',
    crmField: 'stage_id',
    direction: 'bidirectional',
  },
  {
    adsappField: 'expectedCloseDate',
    crmField: 'expected_close_date',
    direction: 'bidirectional',
    transform: (value: Date | string) => {
      if (value instanceof Date) {
        return value.toISOString().split('T')[0] // YYYY-MM-DD format
      }
      return value
    },
  },
  {
    adsappField: 'probability',
    crmField: 'probability',
    direction: 'bidirectional',
  },
  {
    adsappField: 'status',
    crmField: 'status',
    direction: 'bidirectional',
  },
]

/**
 * Get default field mappings for a Pipedrive object type
 */
export function getPipedriveFieldMappings(
  objectType: 'persons' | 'deals' | 'organizations',
  includeCustomFields = true
): FieldMapping[] {
  switch (objectType) {
    case 'persons':
      return includeCustomFields
        ? [...PIPEDRIVE_PERSON_MAPPINGS, ...PIPEDRIVE_CUSTOM_PERSON_MAPPINGS]
        : PIPEDRIVE_PERSON_MAPPINGS
    case 'deals':
      return PIPEDRIVE_DEAL_MAPPINGS
    default:
      return []
  }
}

/**
 * Transform ADSapp contact to Pipedrive Person
 */
export function transformToPipedrivePerson(adsappContact: any): any {
  const pipedrivePerson: any = {}

  const mappings = getPipedriveFieldMappings('persons')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappContact[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        pipedrivePerson[mapping.crmField] = transformedValue
      }
    }
  }

  return pipedrivePerson
}

/**
 * Transform Pipedrive Person to ADSapp contact
 */
export function transformFromPipedrivePerson(pipedrivePerson: any): any {
  const adsappContact: any = {}

  const mappings = getPipedriveFieldMappings('persons')

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      let value = pipedrivePerson[mapping.crmField]

      // Handle Pipedrive's email format
      if (mapping.crmField === 'email' && Array.isArray(value)) {
        value = value.find(e => e.primary)?.value || value[0]?.value
      }

      // Handle Pipedrive's phone format
      if (mapping.crmField === 'phone' && Array.isArray(value)) {
        value = value.find(p => p.primary)?.value || value[0]?.value
      }

      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappContact[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add Pipedrive metadata
  adsappContact.pipedriveId = pipedrivePerson.id
  adsappContact.pipedriveCreatedAt = pipedrivePerson.add_time
  adsappContact.pipedriveUpdatedAt = pipedrivePerson.update_time

  return adsappContact
}

/**
 * Transform ADSapp deal to Pipedrive Deal
 */
export function transformToPipedriveDeal(adsappDeal: any): any {
  const pipedriveDeal: any = {}

  const mappings = getPipedriveFieldMappings('deals')

  for (const mapping of mappings) {
    if (mapping.direction === 'to_crm' || mapping.direction === 'bidirectional') {
      const value = adsappDeal[mapping.adsappField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        pipedriveDeal[mapping.crmField] = transformedValue
      }
    }
  }

  return pipedriveDeal
}

/**
 * Transform Pipedrive Deal to ADSapp deal
 */
export function transformFromPipedriveDeal(pipedriveDeal: any): any {
  const adsappDeal: any = {}

  const mappings = getPipedriveFieldMappings('deals')

  for (const mapping of mappings) {
    if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
      const value = pipedriveDeal[mapping.crmField]
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value
        adsappDeal[mapping.adsappField] = transformedValue
      }
    }
  }

  // Add Pipedrive metadata
  adsappDeal.pipedriveId = pipedriveDeal.id
  adsappDeal.pipedriveCreatedAt = pipedriveDeal.add_time
  adsappDeal.pipedriveUpdatedAt = pipedriveDeal.update_time

  return adsappDeal
}
