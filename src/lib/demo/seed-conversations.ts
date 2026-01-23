/**
 * Seed Conversations and Messages for Demo Organization
 * Creates 50 realistic WhatsApp conversations with 500+ messages
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  DEMO_ORG_ID,
  DEMO_USERS,
  CUSTOMER_INQUIRY_MESSAGES,
  CUSTOMER_FOLLOWUP_MESSAGES,
  AGENT_REPLY_MESSAGES,
  getRandomItem,
  generateRandomDate,
} from './dutch-data'

export interface SeedConversation {
  id?: string
  organization_id: string
  contact_id: string
  assigned_to: string | null
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channel: string
  subject: string | null
  last_message_at: string
  last_message_preview: string
  unread_count: number
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

export interface SeedMessage {
  id?: string
  conversation_id: string
  organization_id: string
  contact_id: string
  direction: 'inbound' | 'outbound'
  content: string
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  sent_by: string | null
  whatsapp_message_id: string | null
  created_at: string
  metadata: Record<string, unknown>
}

// Conversation scenarios with realistic Dutch content
const CONVERSATION_SCENARIOS = [
  {
    subject: 'Vraag over bestelling',
    messages: [
      { dir: 'in', content: 'Hallo, ik heb een vraag over mijn bestelling van vorige week.' },
      { dir: 'out', content: 'Goedemiddag! Natuurlijk help ik u graag. Kunt u het ordernummer geven?' },
      { dir: 'in', content: 'Ja, ordernummer is #12345.' },
      { dir: 'out', content: 'Ik zie uw bestelling. Het pakket is gisteren verzonden en wordt morgen bezorgd.' },
      { dir: 'in', content: 'Super, dank u wel!' },
      { dir: 'out', content: 'Graag gedaan! Tot de volgende keer.' },
    ],
    status: 'resolved' as const,
    priority: 'normal' as const,
  },
  {
    subject: 'Klacht afhandeling',
    messages: [
      { dir: 'in', content: 'Ik heb een kapot product ontvangen. Echt niet te geloven!' },
      { dir: 'out', content: 'Dat spijt me zeer te horen. Ik begrijp uw frustratie volledig.' },
      { dir: 'out', content: 'Kunt u een foto sturen van de beschadiging?' },
      { dir: 'in', content: 'Ja, hier is de foto. [afbeelding]' },
      { dir: 'out', content: 'Ik zie het. We sturen direct een vervanging en u hoeft het kapotte product niet terug te sturen.' },
      { dir: 'in', content: 'Oké dat is fair. Wanneer kan ik het verwachten?' },
      { dir: 'out', content: 'Het wordt morgen verzonden, dus overmorgen bij u. Mijn excuses voor het ongemak!' },
      { dir: 'in', content: 'Prima, bedankt voor de snelle oplossing.' },
    ],
    status: 'resolved' as const,
    priority: 'high' as const,
  },
  {
    subject: 'Afspraak plannen',
    messages: [
      { dir: 'in', content: 'Goedemorgen, kan ik een afspraak maken voor volgende week?' },
      { dir: 'out', content: 'Goedemorgen! Ja hoor. Wat is uw voorkeur qua dag en tijd?' },
      { dir: 'in', content: 'Dinsdag of woensdag, liefst in de ochtend.' },
      { dir: 'out', content: 'Ik heb beschikbaarheid op dinsdag om 10:00 of woensdag om 09:30. Wat heeft uw voorkeur?' },
      { dir: 'in', content: 'Woensdag 09:30 is perfect.' },
      { dir: 'out', content: 'Genoteerd! U ontvangt zo een bevestiging. Tot woensdag!' },
    ],
    status: 'closed' as const,
    priority: 'normal' as const,
  },
  {
    subject: 'Productinformatie',
    messages: [
      { dir: 'in', content: 'Hi, ik zag jullie nieuwe product online. Hebben jullie dit op voorraad?' },
      { dir: 'out', content: 'Hi! Ja, dit product is op voorraad. Kan ik u meer informatie geven?' },
      { dir: 'in', content: 'Ja graag, wat zijn de afmetingen en is het ook in blauw beschikbaar?' },
      { dir: 'out', content: 'De afmetingen zijn 50x30x20cm. Helaas is blauw momenteel niet beschikbaar, wel in zwart en grijs.' },
      { dir: 'in', content: 'Grijs is ook goed. Wat kost de verzending?' },
      { dir: 'out', content: 'Verzending is gratis boven de €50. Dit product kost €59, dus gratis verzending!' },
      { dir: 'in', content: 'Top, ik bestel via de website. Bedankt!' },
    ],
    status: 'closed' as const,
    priority: 'normal' as const,
  },
  {
    subject: 'Retour aanvraag',
    messages: [
      { dir: 'in', content: 'Ik wil graag een product retourneren. Het past niet goed.' },
      { dir: 'out', content: 'Geen probleem. Retourneren kan binnen 14 dagen. Heeft u de originele verpakking nog?' },
      { dir: 'in', content: 'Ja die heb ik nog.' },
      { dir: 'out', content: 'Perfect. Ik stuur u een retourlabel per e-mail. Na ontvangst storten we het bedrag binnen 5 werkdagen terug.' },
      { dir: 'in', content: 'Fijn, dank u wel voor de hulp.' },
    ],
    status: 'pending' as const,
    priority: 'normal' as const,
  },
  {
    subject: 'Offerte aanvraag B2B',
    messages: [
      { dir: 'in', content: 'Goedendag, wij zijn geïnteresseerd in een grotere bestelling voor ons bedrijf.' },
      { dir: 'out', content: 'Goedendag! Fijn om te horen. Om welk product gaat het en welke hoeveelheden?' },
      { dir: 'in', content: 'We zoeken 500 stuks van product X, graag met bedrijfslogo.' },
      { dir: 'out', content: 'Dat kunnen we zeker verzorgen. Ik laat onze salesafdeling een offerte opstellen.' },
      { dir: 'out', content: 'Kunt u mij uw e-mailadres en bedrijfsnaam doorgeven voor de offerte?' },
      { dir: 'in', content: 'info@bedrijfxyz.nl, Bedrijf XYZ B.V.' },
      { dir: 'out', content: 'Ontvangen! U ontvangt de offerte binnen 2 werkdagen. Heeft u verder nog vragen?' },
      { dir: 'in', content: 'Nee, voorlopig niet. Ik kijk uit naar de offerte.' },
    ],
    status: 'open' as const,
    priority: 'high' as const,
  },
  {
    subject: 'Technische vraag',
    messages: [
      { dir: 'in', content: 'Ik heb een probleem met de installatie van het product. De handleiding helpt niet.' },
      { dir: 'out', content: 'Vervelend! Ik help u graag. Kunt u beschrijven waar u precies vastloopt?' },
      { dir: 'in', content: 'Bij stap 3 moet ik iets aansluiten maar de kabel past niet.' },
      { dir: 'out', content: 'Ah ik begrijp het. Er zijn 2 kabeltypes: A en B. Check even welk type u heeft.' },
      { dir: 'in', content: 'Het is type A.' },
      { dir: 'out', content: 'Type A moet in de bovenste poort, niet de onderste. Probeer dat eens.' },
      { dir: 'in', content: 'Ja!! Het werkt nu! Bedankt, ik keek er helemaal over heen.' },
      { dir: 'out', content: 'Mooi! Fijn dat het opgelost is. Succes met het gebruik!' },
    ],
    status: 'resolved' as const,
    priority: 'normal' as const,
  },
  {
    subject: 'Wachtend op reactie',
    messages: [
      { dir: 'in', content: 'Hallo, ik wacht al 3 dagen op een reactie over mijn vraag.' },
      { dir: 'out', content: 'Mijn excuses voor de vertraging. Ik zoek dit direct voor u uit.' },
    ],
    status: 'open' as const,
    priority: 'urgent' as const,
  },
  {
    subject: 'Prijsvraag',
    messages: [
      { dir: 'in', content: 'Wat kost jullie premium abonnement per maand?' },
      { dir: 'out', content: 'Ons premium abonnement kost €29,99 per maand. Jaarabonnement is €299 (2 maanden gratis).' },
      { dir: 'in', content: 'Kan ik eerst een proefperiode?' },
      { dir: 'out', content: 'Zeker! U kunt 14 dagen gratis proberen zonder verplichtingen.' },
      { dir: 'in', content: 'Oké, hoe start ik de proefperiode?' },
      { dir: 'out', content: 'Ga naar onze website en klik op "Gratis proberen". U hoeft geen creditcard in te vullen.' },
    ],
    status: 'closed' as const,
    priority: 'low' as const,
  },
  {
    subject: 'Bezorgprobleem',
    messages: [
      { dir: 'in', content: 'Mijn pakket zou vandaag geleverd worden maar is nog niet aangekomen.' },
      { dir: 'out', content: 'Ik begrijp uw bezorgdheid. Ik check de status voor u.' },
      { dir: 'out', content: 'Ik zie dat de bezorger vertraging heeft. Verwachte levering is nu morgen tussen 12:00-14:00.' },
      { dir: 'in', content: 'Morgen kan ik niet thuis zijn in die tijd.' },
      { dir: 'out', content: 'Ik kan het pakket laten afleveren bij een afhaalpunt. Schikt dat beter?' },
      { dir: 'in', content: 'Ja graag, naar het dichtstbijzijnde punt.' },
      { dir: 'out', content: 'Geregeld! U krijgt een notificatie zodra het pakket klaar ligt.' },
    ],
    status: 'pending' as const,
    priority: 'normal' as const,
  },
]

// Additional standalone messages for variety
const STANDALONE_OPENER_MESSAGES = [
  'Goedemorgen, ik heb een vraag.',
  'Hi! Hebben jullie deze week nog aanbiedingen?',
  'Ik zoek informatie over jullie diensten.',
  'Kan ik een afspraak maken?',
  'Is er iemand beschikbaar om te helpen?',
  'Hallo, ik ben klant en heb een probleem.',
  'Beste, graag meer informatie over product Y.',
  'Wanneer zijn jullie open morgen?',
]

function generateConversationMessages(
  scenario: typeof CONVERSATION_SCENARIOS[0],
  conversationId: string,
  contactId: string,
  startDate: Date
): SeedMessage[] {
  const messages: SeedMessage[] = []
  let currentDate = new Date(startDate)

  for (let i = 0; i < scenario.messages.length; i++) {
    const msg = scenario.messages[i]

    // Add realistic time gaps between messages
    if (i > 0) {
      const minGap = msg.dir === 'out' ? 1 : 2 // Agent responds faster
      const maxGap = msg.dir === 'out' ? 15 : 60 // Customer takes longer
      currentDate = new Date(currentDate.getTime() + (minGap + Math.random() * maxGap) * 60000)
    }

    const message: SeedMessage = {
      conversation_id: conversationId,
      organization_id: DEMO_ORG_ID,
      contact_id: contactId,
      direction: msg.dir === 'in' ? 'inbound' : 'outbound',
      content: msg.content,
      message_type: 'text',
      status: 'read',
      sent_by: msg.dir === 'out' ? getRandomItem(Object.values(DEMO_USERS)) : null,
      whatsapp_message_id: `wamid.${Math.random().toString(36).substring(2, 15)}`,
      created_at: currentDate.toISOString(),
      metadata: {},
    }

    messages.push(message)
  }

  return messages
}

function generateRandomConversation(
  contactId: string,
  daysAgo: number
): { conversation: Partial<SeedConversation>; messages: Partial<SeedMessage>[] } {
  // Pick a random scenario
  const scenario = getRandomItem(CONVERSATION_SCENARIOS)
  const startDate = generateRandomDate(daysAgo, Math.floor(daysAgo * 0.5))

  const lastMessage = scenario.messages[scenario.messages.length - 1]
  const lastMessageDate = new Date(startDate)
  lastMessageDate.setMinutes(lastMessageDate.getMinutes() + scenario.messages.length * 10)

  const conversation: Partial<SeedConversation> = {
    organization_id: DEMO_ORG_ID,
    contact_id: contactId,
    assigned_to: scenario.status === 'open' || scenario.status === 'pending'
      ? getRandomItem(Object.values(DEMO_USERS))
      : null,
    status: scenario.status,
    priority: scenario.priority,
    channel: 'whatsapp',
    subject: scenario.subject,
    last_message_at: lastMessageDate.toISOString(),
    last_message_preview: lastMessage.content.substring(0, 100),
    unread_count: scenario.status === 'open' ? Math.floor(Math.random() * 3) : 0,
    created_at: startDate.toISOString(),
    updated_at: lastMessageDate.toISOString(),
    metadata: {
      scenario_type: scenario.subject.toLowerCase().replace(/\s/g, '_'),
      message_count: scenario.messages.length,
    },
  }

  return { conversation, messages: [] }
}

export async function seedConversations(
  supabase: SupabaseClient,
  contactIds: string[]
): Promise<{ conversationIds: string[]; messageCount: number }> {
  console.log('Seeding conversations...')

  // Check if conversations already exist
  const { data: existingConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingConversations && existingConversations.length > 0) {
    console.log('Conversations already exist for demo org, fetching existing...')
    const { data: allConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', DEMO_ORG_ID)

    return {
      conversationIds: allConvs?.map(c => c.id) || [],
      messageCount: count || 0,
    }
  }

  // Select contacts for conversations (50 conversations from 100 contacts)
  const conversationContacts = contactIds
    .sort(() => 0.5 - Math.random())
    .slice(0, 50)

  const allConversations: Partial<SeedConversation>[] = []
  const allMessages: Partial<SeedMessage>[] = []

  for (let i = 0; i < conversationContacts.length; i++) {
    const contactId = conversationContacts[i]
    const daysAgo = Math.floor(Math.random() * 60) // Conversations from last 60 days

    // Pick a scenario
    const scenario = CONVERSATION_SCENARIOS[i % CONVERSATION_SCENARIOS.length]
    const startDate = generateRandomDate(daysAgo, Math.floor(daysAgo * 0.3))

    // Temp ID for linking messages
    const tempConvId = `temp_${i}`

    allConversations.push({
      organization_id: DEMO_ORG_ID,
      contact_id: contactId,
      assigned_to: scenario.status === 'open' || scenario.status === 'pending'
        ? getRandomItem(Object.values(DEMO_USERS))
        : null,
      status: scenario.status,
      priority: scenario.priority,
      channel: 'whatsapp',
      subject: scenario.subject,
      last_message_at: startDate.toISOString(), // Will be updated after messages
      last_message_preview: scenario.messages[scenario.messages.length - 1].content.substring(0, 100),
      unread_count: scenario.status === 'open' ? Math.floor(Math.random() * 3) : 0,
      created_at: startDate.toISOString(),
      updated_at: startDate.toISOString(),
      metadata: {
        temp_id: tempConvId,
        scenario_index: i % CONVERSATION_SCENARIOS.length,
      },
    })
  }

  // Insert conversations first
  const { data: insertedConversations, error: convError } = await supabase
    .from('conversations')
    .insert(allConversations)
    .select('id, contact_id, metadata, created_at')

  if (convError) {
    console.error('Error seeding conversations:', convError)
    throw convError
  }

  console.log(`Successfully seeded ${insertedConversations.length} conversations`)

  // Now create messages for each conversation
  for (const conv of insertedConversations) {
    const scenarioIndex = (conv.metadata as { scenario_index?: number })?.scenario_index || 0
    const scenario = CONVERSATION_SCENARIOS[scenarioIndex]
    const startDate = new Date(conv.created_at)

    const messages = generateConversationMessages(
      scenario,
      conv.id,
      conv.contact_id,
      startDate
    )

    allMessages.push(...messages)
  }

  // Insert messages in batches
  const BATCH_SIZE = 100
  let insertedCount = 0

  for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
    const batch = allMessages.slice(i, i + BATCH_SIZE)
    const { error: msgError } = await supabase
      .from('messages')
      .insert(batch)

    if (msgError) {
      console.error('Error seeding messages batch:', msgError)
      throw msgError
    }

    insertedCount += batch.length
  }

  console.log(`Successfully seeded ${insertedCount} messages`)

  // Update conversation last_message_at based on actual messages
  for (const conv of insertedConversations) {
    const convMessages = allMessages.filter(m => m.conversation_id === conv.id)
    if (convMessages.length > 0) {
      const lastMessage = convMessages[convMessages.length - 1]
      await supabase
        .from('conversations')
        .update({
          last_message_at: lastMessage.created_at,
          last_message_preview: lastMessage.content?.substring(0, 100),
          updated_at: lastMessage.created_at,
        })
        .eq('id', conv.id)
    }
  }

  return {
    conversationIds: insertedConversations.map(c => c.id),
    messageCount: insertedCount,
  }
}
