/**
 * CSV Parser Utility
 * Parses CSV files for contact imports with validation
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export interface CSVRow {
  phone: string
  firstName?: string
  lastName?: string
  email?: string
  tags?: string[]
  customFields?: Record<string, any>
}

export interface CSVParseResult {
  success: boolean
  data: CSVRow[]
  errors: CSVParseError[]
  stats: {
    total: number
    valid: number
    invalid: number
    duplicates: number
  }
}

export interface CSVParseError {
  row: number
  field: string
  value: string
  error: string
}

/**
 * Parse CSV file content
 * Expected format: phone,firstName,lastName,email,tags
 */
export async function parseContactsCSV(
  content: string,
  organizationId: string
): Promise<CSVParseResult> {
  const lines = content.split('\n').filter(line => line.trim())

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: 'file', value: '', error: 'Empty CSV file' }],
      stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 }
    }
  }

  // Parse header
  const header = parseCSVLine(lines[0])
  const phoneIndex = header.findIndex(h =>
    h.toLowerCase().includes('phone') || h.toLowerCase().includes('telefoon')
  )
  const firstNameIndex = header.findIndex(h =>
    h.toLowerCase().includes('first') || h.toLowerCase().includes('voornaam')
  )
  const lastNameIndex = header.findIndex(h =>
    h.toLowerCase().includes('last') || h.toLowerCase().includes('achternaam')
  )
  const emailIndex = header.findIndex(h =>
    h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail')
  )
  const tagsIndex = header.findIndex(h =>
    h.toLowerCase().includes('tag')
  )

  if (phoneIndex === -1) {
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        field: 'header',
        value: header.join(','),
        error: 'Phone number column not found. Expected column named "phone" or "telefoon"'
      }],
      stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 }
    }
  }

  const data: CSVRow[] = []
  const errors: CSVParseError[] = []
  const seenPhones = new Set<string>()
  let duplicates = 0

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)
    const phone = fields[phoneIndex]?.trim()

    if (!phone) {
      errors.push({
        row: i + 1,
        field: 'phone',
        value: '',
        error: 'Phone number is required'
      })
      continue
    }

    // Validate and normalize phone number
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.valid) {
      errors.push({
        row: i + 1,
        field: 'phone',
        value: phone,
        error: phoneValidation.error || 'Invalid phone number'
      })
      continue
    }

    const normalizedPhone = phoneValidation.normalized!

    // Check for duplicates in CSV
    if (seenPhones.has(normalizedPhone)) {
      duplicates++
      errors.push({
        row: i + 1,
        field: 'phone',
        value: phone,
        error: 'Duplicate phone number in CSV'
      })
      continue
    }
    seenPhones.add(normalizedPhone)

    // Validate email if provided
    const email = fields[emailIndex]?.trim()
    if (email && !isValidEmail(email)) {
      errors.push({
        row: i + 1,
        field: 'email',
        value: email,
        error: 'Invalid email format'
      })
      // Continue processing - email is optional
    }

    // Parse tags
    const tagsStr = fields[tagsIndex]?.trim()
    const tags = tagsStr
      ? tagsStr.split(/[,;|]/).map(t => t.trim()).filter(Boolean)
      : []

    // Build contact object
    const contact: CSVRow = {
      phone: normalizedPhone,
      firstName: fields[firstNameIndex]?.trim(),
      lastName: fields[lastNameIndex]?.trim(),
      email: email || undefined,
      tags: tags.length > 0 ? tags : undefined
    }

    // Parse any custom fields (columns not in standard set)
    const customFields: Record<string, any> = {}
    header.forEach((colName, index) => {
      if (
        index !== phoneIndex &&
        index !== firstNameIndex &&
        index !== lastNameIndex &&
        index !== emailIndex &&
        index !== tagsIndex &&
        fields[index]?.trim()
      ) {
        customFields[colName] = fields[index].trim()
      }
    })

    if (Object.keys(customFields).length > 0) {
      contact.customFields = customFields
    }

    data.push(contact)
  }

  return {
    success: data.length > 0,
    data,
    errors,
    stats: {
      total: lines.length - 1, // Exclude header
      valid: data.length,
      invalid: errors.filter(e => e.error !== 'Duplicate phone number in CSV').length,
      duplicates
    }
  }
}

/**
 * Parse a single CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  fields.push(current)

  return fields
}

/**
 * Validate and normalize phone number
 */
function validatePhoneNumber(phone: string): {
  valid: boolean
  normalized?: string
  error?: string
} {
  try {
    // Try to parse with default region (Netherlands)
    if (!isValidPhoneNumber(phone, 'NL')) {
      // Try without default region (international format)
      if (!isValidPhoneNumber(phone)) {
        return {
          valid: false,
          error: 'Invalid phone number format. Use international format (e.g., +31612345678)'
        }
      }
    }

    const parsed = parsePhoneNumber(phone, 'NL')
    if (!parsed) {
      return {
        valid: false,
        error: 'Could not parse phone number'
      }
    }

    // Normalize to E.164 format
    const normalized = parsed.format('E.164')

    return {
      valid: true,
      normalized
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Phone number validation failed'
    }
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
  const headers = [
    'phone',
    'firstName',
    'lastName',
    'email',
    'tags'
  ]

  const example = [
    '+31612345678',
    'John',
    'Doe',
    'john@example.com',
    'customer,vip'
  ]

  return `${headers.join(',')}\n${example.join(',')}`
}

/**
 * Export contacts to CSV format
 */
export function exportContactsToCSV(contacts: any[]): string {
  const headers = [
    'phone',
    'firstName',
    'lastName',
    'email',
    'tags',
    'createdAt',
    'lastMessageAt'
  ]

  const rows = contacts.map(contact => {
    const tags = contact.tags?.join(';') || ''
    return [
      contact.phone,
      contact.first_name || '',
      contact.last_name || '',
      contact.email || '',
      tags,
      contact.created_at || '',
      contact.last_message_at || ''
    ].map(escapeCSVField).join(',')
  })

  return `${headers.join(',')}\n${rows.join('\n')}`
}

/**
 * Escape CSV field (wrap in quotes if contains comma, quote, or newline)
 */
function escapeCSVField(field: string): string {
  const str = String(field || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
