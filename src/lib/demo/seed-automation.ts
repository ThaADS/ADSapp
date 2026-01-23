/**
 * Seed Automation Rules for Demo Organization
 * Creates 12 realistic automation rules with Dutch content
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ORG_ID, DEMO_USERS } from './dutch-data'

export interface SeedAutomationRule {
  id?: string
  organization_id: string
  name: string
  description: string
  trigger_type: string
  trigger_conditions: Record<string, unknown>
  actions: Record<string, unknown>[]
  is_active: boolean
  priority: number
  execution_count: number
  last_executed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

const AUTOMATION_RULES = [
  {
    name: 'Automatisch antwoord buiten kantooruren',
    description: 'Stuurt automatisch een bericht wanneer klanten buiten kantooruren (ma-vr 9:00-17:00) contact opnemen via WhatsApp.',
    trigger_type: 'message_received',
    trigger_conditions: {
      channel: 'whatsapp',
      time_conditions: {
        type: 'outside_hours',
        business_hours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: null,
          sunday: null,
        },
        timezone: 'Europe/Amsterdam',
      },
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'service_gesloten',
        variables: {
          openingstijden: 'ma-vr 9:00-17:00',
        },
        delay_seconds: 5,
      },
    ],
    is_active: true,
    priority: 1,
    execution_count: 567,
  },
  {
    name: 'Welkomstbericht nieuwe contacten',
    description: 'Stuurt automatisch een welkomstbericht naar nieuwe contacten die voor het eerst een bericht sturen.',
    trigger_type: 'new_contact',
    trigger_conditions: {
      first_message: true,
      channel: 'whatsapp',
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'welkom_nieuw',
        delay_seconds: 3,
      },
      {
        type: 'add_tag',
        tag: 'Nieuw',
      },
    ],
    is_active: true,
    priority: 2,
    execution_count: 234,
  },
  {
    name: 'VIP klant herkenning',
    description: 'Herkent VIP klanten automatisch en wijst gesprek toe aan senior medewerker.',
    trigger_type: 'message_received',
    trigger_conditions: {
      contact_tags_include: ['VIP'],
    },
    actions: [
      {
        type: 'set_priority',
        priority: 'high',
      },
      {
        type: 'assign_to',
        user_id: DEMO_USERS.owner,
        assignment_reason: 'VIP klant',
      },
      {
        type: 'send_internal_notification',
        message: 'VIP klant heeft contact opgenomen',
      },
    ],
    is_active: true,
    priority: 1,
    execution_count: 89,
  },
  {
    name: 'Klacht detectie en escalatie',
    description: 'Detecteert klachten op basis van trefwoorden en escaleert automatisch.',
    trigger_type: 'message_received',
    trigger_conditions: {
      content_contains: ['klacht', 'ontevreden', 'slecht', 'niet goed', 'terugbetaling', 'probleem', 'kapot'],
      match_type: 'any',
    },
    actions: [
      {
        type: 'add_tag',
        tag: 'Klacht',
      },
      {
        type: 'set_priority',
        priority: 'urgent',
      },
      {
        type: 'assign_to',
        user_id: DEMO_USERS.admin,
        assignment_reason: 'Klacht gedetecteerd',
      },
      {
        type: 'send_internal_notification',
        message: 'Mogelijke klacht ontvangen - controleer gesprek',
        notify_users: [DEMO_USERS.owner, DEMO_USERS.admin],
      },
    ],
    is_active: true,
    priority: 1,
    execution_count: 45,
  },
  {
    name: 'Automatische wachttijd melding',
    description: 'Stuurt een bericht als een gesprek langer dan 5 minuten onbeantwoord blijft tijdens kantooruren.',
    trigger_type: 'conversation_idle',
    trigger_conditions: {
      idle_minutes: 5,
      status: 'open',
      during_business_hours: true,
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'service_wachttijd',
        variables: {
          wachttijd: '10 minuten',
        },
      },
    ],
    is_active: true,
    priority: 3,
    execution_count: 123,
  },
  {
    name: 'Lead nurturing trigger',
    description: 'Start leadnurturing workflow voor nieuwe leads die interesse tonen.',
    trigger_type: 'message_received',
    trigger_conditions: {
      content_contains: ['prijs', 'kosten', 'offerte', 'informatie', 'geïnteresseerd'],
      contact_tags_exclude: ['Klant', 'VIP'],
    },
    actions: [
      {
        type: 'add_tag',
        tag: 'Lead',
      },
      {
        type: 'start_workflow',
        workflow_name: 'Leadnurturing Campagne',
      },
      {
        type: 'send_internal_notification',
        message: 'Nieuwe lead gedetecteerd',
      },
    ],
    is_active: true,
    priority: 2,
    execution_count: 78,
  },
  {
    name: 'Afspraak herinnering 24 uur',
    description: 'Stuurt automatisch een herinnering 24 uur voor een geplande afspraak.',
    trigger_type: 'scheduled',
    trigger_conditions: {
      event_type: 'appointment',
      time_before: '24h',
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'afspraak_herinnering',
        variables: {
          tijd: '{{appointment.time}}',
          documenten: 'identiteitsbewijs',
        },
      },
    ],
    is_active: true,
    priority: 2,
    execution_count: 312,
  },
  {
    name: 'Review verzoek na aankoop',
    description: 'Vraagt om een review 3 dagen na succesvolle levering van een bestelling.',
    trigger_type: 'order_event',
    trigger_conditions: {
      event: 'delivered',
      days_after: 3,
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'service_beoordeling',
        variables: {
          review_link: 'https://example.nl/review',
        },
      },
    ],
    is_active: true,
    priority: 4,
    execution_count: 456,
  },
  {
    name: 'Betalingsherinnering 7 dagen',
    description: 'Stuurt automatisch een betalingsherinnering wanneer een factuur 7 dagen te laat is.',
    trigger_type: 'invoice_event',
    trigger_conditions: {
      status: 'overdue',
      days_overdue: 7,
    },
    actions: [
      {
        type: 'send_template',
        template_name: 'betaling_herinnering',
        variables: {
          factuurnummer: '{{invoice.number}}',
          bedrag: '{{invoice.amount}}',
          vervaldatum: '{{invoice.due_date}}',
          betaallink: '{{invoice.payment_link}}',
        },
      },
    ],
    is_active: true,
    priority: 2,
    execution_count: 89,
  },
  {
    name: 'B2B detectie en tagging',
    description: 'Herkent zakelijke aanvragen en voegt B2B tag toe.',
    trigger_type: 'message_received',
    trigger_conditions: {
      content_contains: ['bedrijf', 'B2B', 'zakelijk', 'KVK', 'BTW', 'factuur op naam', 'grote bestelling'],
      match_type: 'any',
    },
    actions: [
      {
        type: 'add_tag',
        tag: 'B2B',
      },
      {
        type: 'set_priority',
        priority: 'high',
      },
      {
        type: 'assign_to',
        user_id: DEMO_USERS.owner,
        assignment_reason: 'Zakelijke aanvraag',
      },
    ],
    is_active: true,
    priority: 2,
    execution_count: 34,
  },
  {
    name: 'Inactieve klant heractivatie',
    description: 'Start heractivatie campagne voor klanten die 90 dagen niet actief zijn geweest.',
    trigger_type: 'contact_inactive',
    trigger_conditions: {
      inactive_days: 90,
      has_previous_orders: true,
    },
    actions: [
      {
        type: 'add_tag',
        tag: 'Inactief',
      },
      {
        type: 'start_workflow',
        workflow_name: 'Heractivatie Inactieve Klanten',
      },
    ],
    is_active: true,
    priority: 5,
    execution_count: 67,
  },
  {
    name: 'Urgente zoekwoorden detectie',
    description: 'Detecteert urgente berichten en geeft hoge prioriteit.',
    trigger_type: 'message_received',
    trigger_conditions: {
      content_contains: ['spoed', 'urgent', 'dringend', 'onmiddellijk', 'nu', 'ASAP', 'noodgeval'],
      match_type: 'any',
    },
    actions: [
      {
        type: 'set_priority',
        priority: 'urgent',
      },
      {
        type: 'send_internal_notification',
        message: 'Urgent bericht ontvangen',
        notify_all: true,
      },
    ],
    is_active: true,
    priority: 1,
    execution_count: 23,
  },
]

export async function seedAutomationRules(supabase: SupabaseClient): Promise<string[]> {
  console.log('Seeding automation rules...')

  // Check if rules already exist
  const { data: existingRules } = await supabase
    .from('automation_rules')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingRules && existingRules.length > 0) {
    console.log('Automation rules already exist for demo org, fetching existing...')
    const { data: allRules } = await supabase
      .from('automation_rules')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    return allRules?.map(r => r.id) || []
  }

  // Prepare rules with full data
  const rules = AUTOMATION_RULES.map((rule, index) => ({
    ...rule,
    organization_id: DEMO_ORG_ID,
    created_by: Object.values(DEMO_USERS)[index % 3],
    last_executed_at: rule.execution_count > 0
      ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      : null,
    created_at: new Date(Date.now() - (60 - index * 4) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('automation_rules')
    .insert(rules)
    .select('id')

  if (error) {
    console.error('Error seeding automation rules:', error)
    throw error
  }

  console.log(`Successfully seeded ${data.length} automation rules`)
  return data.map(r => r.id)
}
