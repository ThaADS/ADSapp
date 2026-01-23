/**
 * Seed Message Templates for Demo Organization
 * Creates 25 realistic Dutch WhatsApp message templates
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ORG_ID, DEMO_USERS, MESSAGE_TEMPLATES } from './dutch-data'

export interface SeedTemplate {
  id?: string
  organization_id: string
  name: string
  content: string
  category: string
  language: string
  status: 'pending' | 'approved' | 'rejected'
  variables: string[]
  usage_count: number
  created_by: string
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

// All templates with full Dutch content
const ALL_TEMPLATES: Omit<SeedTemplate, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>[] = [
  // Welcome templates
  {
    name: 'welkom_nieuw',
    content: 'Welkom bij Demo Company! 🎉 Wij helpen u graag met al uw vragen. Hoe kunnen we u van dienst zijn?',
    category: 'welkom',
    language: 'nl',
    status: 'approved',
    variables: [],
    usage_count: 234,
    metadata: { whatsapp_template_id: 'welcome_new_customer' },
  },
  {
    name: 'welkom_terugkerend',
    content: 'Welkom terug, {{naam}}! Fijn dat u weer contact opneemt. Waarmee kan ik u helpen?',
    category: 'welkom',
    language: 'nl',
    status: 'approved',
    variables: ['naam'],
    usage_count: 156,
    metadata: { whatsapp_template_id: 'welcome_returning' },
  },
  {
    name: 'welkom_webformulier',
    content: 'Bedankt voor uw bericht via onze website! Een medewerker neemt zo spoedig mogelijk contact met u op.',
    category: 'welkom',
    language: 'nl',
    status: 'approved',
    variables: [],
    usage_count: 89,
    metadata: { whatsapp_template_id: 'welcome_webform' },
  },

  // Appointment templates
  {
    name: 'afspraak_bevestiging',
    content: 'Uw afspraak is bevestigd voor {{datum}} om {{tijd}}. 📅\n\nLocatie: {{adres}}\n\nTot dan!',
    category: 'afspraak',
    language: 'nl',
    status: 'approved',
    variables: ['datum', 'tijd', 'adres'],
    usage_count: 312,
    metadata: { whatsapp_template_id: 'appointment_confirm' },
  },
  {
    name: 'afspraak_herinnering',
    content: 'Herinnering: Morgen heeft u een afspraak bij ons om {{tijd}}. ⏰\n\nVergeet niet om {{documenten}} mee te nemen.\n\nKunt u niet? Laat het ons weten!',
    category: 'afspraak',
    language: 'nl',
    status: 'approved',
    variables: ['tijd', 'documenten'],
    usage_count: 278,
    metadata: { whatsapp_template_id: 'appointment_reminder' },
  },
  {
    name: 'afspraak_wijziging',
    content: 'Uw afspraak is gewijzigd naar {{nieuwe_datum}} om {{nieuwe_tijd}}.\n\nKomt dit uit? Reageer met JA of NEE.',
    category: 'afspraak',
    language: 'nl',
    status: 'approved',
    variables: ['nieuwe_datum', 'nieuwe_tijd'],
    usage_count: 67,
    metadata: { whatsapp_template_id: 'appointment_change' },
  },
  {
    name: 'afspraak_annulering',
    content: 'Uw afspraak op {{datum}} is geannuleerd. 🚫\n\nWilt u een nieuwe afspraak maken? Neem contact op via WhatsApp of bel ons.',
    category: 'afspraak',
    language: 'nl',
    status: 'approved',
    variables: ['datum'],
    usage_count: 23,
    metadata: { whatsapp_template_id: 'appointment_cancel' },
  },

  // Order templates
  {
    name: 'bestelling_ontvangen',
    content: 'Bedankt voor uw bestelling! 📦\n\nOrdernummer: {{ordernummer}}\nBedrag: €{{bedrag}}\n\nWe gaan direct aan de slag.',
    category: 'bestelling',
    language: 'nl',
    status: 'approved',
    variables: ['ordernummer', 'bedrag'],
    usage_count: 456,
    metadata: { whatsapp_template_id: 'order_received' },
  },
  {
    name: 'bestelling_verzonden',
    content: 'Goed nieuws! Uw bestelling is onderweg. 🚚\n\nTrack & trace: {{tracking_link}}\n\nVerwachte levering: {{leverdatum}}',
    category: 'bestelling',
    language: 'nl',
    status: 'approved',
    variables: ['tracking_link', 'leverdatum'],
    usage_count: 423,
    metadata: { whatsapp_template_id: 'order_shipped' },
  },
  {
    name: 'bestelling_afgeleverd',
    content: 'Uw pakket is bezorgd! 🎁\n\nHeeft u alles goed ontvangen? Laat het ons weten als er iets niet klopt.\n\nBedankt voor uw bestelling!',
    category: 'bestelling',
    language: 'nl',
    status: 'approved',
    variables: [],
    usage_count: 389,
    metadata: { whatsapp_template_id: 'order_delivered' },
  },
  {
    name: 'bestelling_vertraagd',
    content: 'Helaas is er vertraging bij uw bestelling. 😔\n\nNieuwe verwachte leverdatum: {{nieuwe_datum}}\n\nOnze excuses voor het ongemak.',
    category: 'bestelling',
    language: 'nl',
    status: 'approved',
    variables: ['nieuwe_datum'],
    usage_count: 34,
    metadata: { whatsapp_template_id: 'order_delayed' },
  },

  // Payment templates
  {
    name: 'betaling_herinnering',
    content: 'Vriendelijke herinnering: Factuur {{factuurnummer}} staat nog open.\n\n💰 Bedrag: €{{bedrag}}\n📅 Vervaldatum: {{vervaldatum}}\n\nBetalen kan via: {{betaallink}}',
    category: 'betaling',
    language: 'nl',
    status: 'approved',
    variables: ['factuurnummer', 'bedrag', 'vervaldatum', 'betaallink'],
    usage_count: 187,
    metadata: { whatsapp_template_id: 'payment_reminder' },
  },
  {
    name: 'betaling_bevestiging',
    content: 'Bedankt! ✅ Uw betaling van €{{bedrag}} is ontvangen.\n\nFactuur: {{factuurnummer}}\nDatum: {{datum}}',
    category: 'betaling',
    language: 'nl',
    status: 'approved',
    variables: ['bedrag', 'factuurnummer', 'datum'],
    usage_count: 234,
    metadata: { whatsapp_template_id: 'payment_confirmed' },
  },
  {
    name: 'betaling_link',
    content: 'Hier is uw betaallink: {{betaallink}}\n\nBedrag: €{{bedrag}}\nOmschrijving: {{omschrijving}}\n\nVragen? Neem contact op!',
    category: 'betaling',
    language: 'nl',
    status: 'approved',
    variables: ['betaallink', 'bedrag', 'omschrijving'],
    usage_count: 156,
    metadata: { whatsapp_template_id: 'payment_link' },
  },

  // Service templates
  {
    name: 'service_beoordeling',
    content: 'Hoe was uw ervaring met ons? Wij horen graag uw feedback! ⭐\n\nBeoordeel ons via: {{review_link}}\n\nBedankt voor uw hulp!',
    category: 'service',
    language: 'nl',
    status: 'approved',
    variables: ['review_link'],
    usage_count: 345,
    metadata: { whatsapp_template_id: 'review_request' },
  },
  {
    name: 'service_wachttijd',
    content: 'Momenteel is het erg druk bij ons. 🔄\n\nWe reageren binnen {{wachttijd}} op uw bericht.\n\nExcuses voor het ongemak!',
    category: 'service',
    language: 'nl',
    status: 'approved',
    variables: ['wachttijd'],
    usage_count: 89,
    metadata: { whatsapp_template_id: 'wait_time' },
  },
  {
    name: 'service_gesloten',
    content: 'We zijn momenteel gesloten. 🌙\n\nOpeningstijden: {{openingstijden}}\n\nWe beantwoorden uw bericht zodra we weer open zijn.',
    category: 'service',
    language: 'nl',
    status: 'approved',
    variables: ['openingstijden'],
    usage_count: 567,
    metadata: { whatsapp_template_id: 'outside_hours' },
  },
  {
    name: 'service_bedankt',
    content: 'Bedankt voor uw bericht! 🙏\n\nWe hebben uw vraag ontvangen en antwoorden zo snel mogelijk.',
    category: 'service',
    language: 'nl',
    status: 'approved',
    variables: [],
    usage_count: 678,
    metadata: { whatsapp_template_id: 'thank_you' },
  },

  // Marketing templates
  {
    name: 'marketing_aanbieding',
    content: '🔥 SPECIALE AANBIEDING!\n\n{{product}} nu met {{korting}}% korting!\n\nGeldig t/m {{einddatum}}\n\nBestel via: {{link}}',
    category: 'marketing',
    language: 'nl',
    status: 'approved',
    variables: ['product', 'korting', 'einddatum', 'link'],
    usage_count: 1234,
    metadata: { whatsapp_template_id: 'promo_offer' },
  },
  {
    name: 'marketing_nieuwsbrief',
    content: '📰 Onze nieuwste collectie is binnen!\n\nBekijk de highlights: {{link}}\n\nAfmelden? {{afmelden_link}}',
    category: 'marketing',
    language: 'nl',
    status: 'approved',
    variables: ['link', 'afmelden_link'],
    usage_count: 890,
    metadata: { whatsapp_template_id: 'newsletter' },
  },
  {
    name: 'marketing_seizoen',
    content: '🌸 {{seizoen}} ACTIE!\n\nGeniet van {{voordeel}}\n\nAlleen deze week!\n\nShop nu: {{link}}',
    category: 'marketing',
    language: 'nl',
    status: 'approved',
    variables: ['seizoen', 'voordeel', 'link'],
    usage_count: 456,
    metadata: { whatsapp_template_id: 'seasonal' },
  },
  {
    name: 'marketing_verjaardag',
    content: '🎂 Gefeliciteerd met uw verjaardag, {{naam}}!\n\nAls cadeau: {{korting}}% korting op uw volgende aankoop!\n\nCode: BIRTHDAY{{jaar}}',
    category: 'marketing',
    language: 'nl',
    status: 'approved',
    variables: ['naam', 'korting', 'jaar'],
    usage_count: 234,
    metadata: { whatsapp_template_id: 'birthday' },
  },

  // Status pending/rejected for variety
  {
    name: 'marketing_flash_sale',
    content: '⚡ FLASH SALE - ALLEEN VANDAAG!\n\nAlles met {{korting}}% korting!\n\nOp=Op!\n\nShop: {{link}}',
    category: 'marketing',
    language: 'nl',
    status: 'pending',
    variables: ['korting', 'link'],
    usage_count: 0,
    metadata: { whatsapp_template_id: 'flash_sale', submitted_at: new Date().toISOString() },
  },
  {
    name: 'marketing_exclusief',
    content: '💎 EXCLUSIEF VOOR VIP KLANTEN\n\nU krijgt vroege toegang tot onze nieuwe collectie!\n\nBekijk: {{link}}',
    category: 'marketing',
    language: 'nl',
    status: 'rejected',
    variables: ['link'],
    usage_count: 0,
    metadata: {
      whatsapp_template_id: 'vip_exclusive',
      rejection_reason: 'Template bevat te veel promotionele inhoud zonder opt-out optie'
    },
  },
]

export async function seedTemplates(supabase: SupabaseClient): Promise<string[]> {
  console.log('Seeding message templates...')

  // Check if templates already exist
  const { data: existingTemplates } = await supabase
    .from('message_templates')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingTemplates && existingTemplates.length > 0) {
    console.log('Templates already exist for demo org, fetching existing...')
    const { data: allTemplates } = await supabase
      .from('message_templates')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    return allTemplates?.map(t => t.id) || []
  }

  // Prepare templates with full data
  const templates = ALL_TEMPLATES.map((template, index) => ({
    ...template,
    organization_id: DEMO_ORG_ID,
    created_by: Object.values(DEMO_USERS)[index % 3],
    created_at: new Date(Date.now() - (90 - index * 3) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('message_templates')
    .insert(templates)
    .select('id')

  if (error) {
    console.error('Error seeding templates:', error)
    throw error
  }

  console.log(`Successfully seeded ${data.length} message templates`)
  return data.map(t => t.id)
}
