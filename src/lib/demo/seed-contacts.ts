/**
 * Seed Contacts for Demo Organization
 * Creates 100 realistic Dutch contacts with varied statuses, tags, and interaction history
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  DEMO_ORG_ID,
  DUTCH_FIRST_NAMES,
  DUTCH_LAST_NAMES,
  DUTCH_COMPANIES,
  CONTACT_TAGS,
  getRandomItem,
  getRandomItems,
  generateDutchPhoneNumber,
  generateDutchEmail,
  generateDutchAddress,
  generateRandomDate,
} from './dutch-data'

export interface SeedContact {
  id?: string
  organization_id: string
  phone_number: string
  name: string
  email: string | null
  company: string | null
  notes: string | null
  tags: string[]
  is_blocked: boolean
  opted_in: boolean
  opted_in_at: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

// Contact note templates (Dutch)
const CONTACT_NOTES = [
  'Terugkerende klant, altijd tevreden',
  'Heeft voorkeur voor ochtendafspraken',
  'Betaalt altijd op tijd',
  'Let op: is doof, alleen WhatsApp gebruiken',
  'Zakelijke klant, factuur naar boekhouding',
  'Vraagt vaak om extra korting',
  'VIP klant sinds 2020',
  'Verwijst regelmatig nieuwe klanten',
  'Wil updates over nieuwe producten',
  'Alleen contact via WhatsApp',
  'Reageert snel, prettige communicatie',
  'Let op: heeft eerder klacht gehad',
  'Interesse in B2B samenwerking',
  'Student, vraag naar studiekorting',
  'Senior, extra uitleg nodig',
  '',
  '',
  '',
]

// Customer types with distribution
const CUSTOMER_TYPES = [
  { type: 'regular', probability: 0.4 },
  { type: 'vip', probability: 0.15 },
  { type: 'lead', probability: 0.2 },
  { type: 'inactive', probability: 0.1 },
  { type: 'new', probability: 0.1 },
  { type: 'b2b', probability: 0.05 },
]

function getCustomerType(): string {
  const rand = Math.random()
  let cumulative = 0
  for (const ct of CUSTOMER_TYPES) {
    cumulative += ct.probability
    if (rand <= cumulative) return ct.type
  }
  return 'regular'
}

function getTagsForType(type: string): string[] {
  const tagNames = CONTACT_TAGS.map(t => t.name)

  switch (type) {
    case 'vip':
      return ['VIP', ...(Math.random() > 0.5 ? ['Trouw'] : [])]
    case 'lead':
      return ['Lead', ...(Math.random() > 0.7 ? ['Prospect'] : [])]
    case 'inactive':
      return ['Inactief']
    case 'new':
      return ['Nieuw']
    case 'b2b':
      return ['B2B', ...(Math.random() > 0.6 ? ['VIP'] : [])]
    case 'regular':
    default:
      if (Math.random() > 0.6) {
        return [getRandomItem(['Trouw', 'Wachtend', ''])]
          .filter(t => t !== '')
      }
      return []
  }
}

export function generateContacts(count: number = 100): SeedContact[] {
  const contacts: SeedContact[] = []
  const usedPhones = new Set<string>()

  for (let i = 0; i < count; i++) {
    // Generate unique phone number
    let phone = generateDutchPhoneNumber()
    while (usedPhones.has(phone)) {
      phone = generateDutchPhoneNumber()
    }
    usedPhones.add(phone)

    const firstName = getRandomItem(DUTCH_FIRST_NAMES)
    const lastName = getRandomItem(DUTCH_LAST_NAMES)
    const fullName = `${firstName} ${lastName}`

    const customerType = getCustomerType()
    const hasCompany = customerType === 'b2b' || Math.random() > 0.7
    const company = hasCompany ? getRandomItem(DUTCH_COMPANIES) : null

    const tags = getTagsForType(customerType)
    const hasNote = Math.random() > 0.6
    const note = hasNote ? getRandomItem(CONTACT_NOTES) : null

    // Generate dates based on customer type
    let createdDaysAgo: number
    let lastContactedDaysAgo: number | null

    switch (customerType) {
      case 'vip':
        createdDaysAgo = Math.floor(180 + Math.random() * 365) // 6 months to 1.5 years ago
        lastContactedDaysAgo = Math.floor(Math.random() * 14) // Within 2 weeks
        break
      case 'new':
        createdDaysAgo = Math.floor(Math.random() * 14) // Within 2 weeks
        lastContactedDaysAgo = createdDaysAgo
        break
      case 'inactive':
        createdDaysAgo = Math.floor(60 + Math.random() * 180) // 2-8 months ago
        lastContactedDaysAgo = Math.floor(60 + Math.random() * 120) // 2-6 months ago
        break
      case 'lead':
        createdDaysAgo = Math.floor(7 + Math.random() * 30) // 1-5 weeks ago
        lastContactedDaysAgo = Math.floor(Math.random() * 7) // Within a week
        break
      default:
        createdDaysAgo = Math.floor(30 + Math.random() * 180) // 1-7 months ago
        lastContactedDaysAgo = Math.floor(Math.random() * 30) // Within a month
    }

    const createdAt = generateRandomDate(createdDaysAgo)
    const lastContactedAt = lastContactedDaysAgo !== null
      ? generateRandomDate(lastContactedDaysAgo)
      : null

    // Opted in status
    const isOptedIn = customerType !== 'inactive' && Math.random() > 0.1
    const optedInAt = isOptedIn
      ? new Date(createdAt.getTime() + Math.random() * 60000).toISOString()
      : null

    // Address metadata for some contacts
    const hasAddress = Math.random() > 0.5
    const address = hasAddress ? generateDutchAddress() : null

    const contact: SeedContact = {
      organization_id: DEMO_ORG_ID,
      phone_number: phone,
      name: fullName,
      email: Math.random() > 0.3 ? generateDutchEmail(firstName, lastName, company ?? undefined) : null,
      company,
      notes: note,
      tags,
      is_blocked: Math.random() > 0.98, // Very rare
      opted_in: isOptedIn,
      opted_in_at: optedInAt,
      last_contacted_at: lastContactedAt?.toISOString() ?? null,
      created_at: createdAt.toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        customer_type: customerType,
        source: getRandomItem(['whatsapp', 'website', 'referral', 'advertising', 'walk_in']),
        ...(address && {
          address: {
            street: address.street,
            number: address.number,
            postal: address.postal,
            city: address.city,
          },
        }),
        ...(customerType === 'vip' && {
          lifetime_value: Math.floor(500 + Math.random() * 4500),
          orders_count: Math.floor(5 + Math.random() * 20),
        }),
        ...(customerType === 'b2b' && {
          kvk_number: String(Math.floor(10000000 + Math.random() * 90000000)),
          btw_number: `NL${Math.floor(100000000 + Math.random() * 900000000)}B01`,
        }),
      },
    }

    contacts.push(contact)
  }

  return contacts
}

export async function seedContacts(supabase: SupabaseClient): Promise<string[]> {
  console.log('Seeding contacts...')

  // First, check if contacts already exist for demo org
  const { data: existingContacts, error: checkError } = await supabase
    .from('contacts')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (checkError) {
    console.error('Error checking existing contacts:', checkError)
    throw checkError
  }

  if (existingContacts && existingContacts.length > 0) {
    console.log('Contacts already exist for demo org, fetching existing IDs...')
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    return allContacts?.map(c => c.id) || []
  }

  // Generate and insert contacts
  const contacts = generateContacts(100)

  const { data, error } = await supabase
    .from('contacts')
    .insert(contacts)
    .select('id')

  if (error) {
    console.error('Error seeding contacts:', error)
    throw error
  }

  console.log(`Successfully seeded ${data.length} contacts`)
  return data.map(c => c.id)
}

export async function seedContactTags(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding contact tags...')

  // Check if tags already exist
  const { data: existingTags } = await supabase
    .from('tags')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingTags && existingTags.length > 0) {
    console.log('Tags already exist for demo org, skipping...')
    return
  }

  const tags = CONTACT_TAGS.map(tag => ({
    organization_id: DEMO_ORG_ID,
    name: tag.name,
    color: tag.color,
    description: tag.description,
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('tags')
    .insert(tags)

  if (error) {
    // Tags table might not exist, log and continue
    console.warn('Could not seed tags (table may not exist):', error.message)
    return
  }

  console.log(`Successfully seeded ${tags.length} contact tags`)
}
