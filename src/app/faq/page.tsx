'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Users,
  Zap,
  Shield,
  BarChart,
  Settings,
  CreditCard,
  Globe,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Bot,
  Lock,
  Smartphone,
  Mail,
  UserPlus,
} from 'lucide-react'

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  tags: string[]
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'gs-1',
    category: 'Aan de slag',
    question: 'Hoe start ik met ADSapp?',
    answer:
      'Registreer een account op adsapp.nl, bevestig je email, en volg de onboarding wizard. Verbind je WhatsApp Business API nummer en je bent klaar om berichten te ontvangen.',
    tags: ['onboarding', 'setup', 'start'],
  },
  {
    id: 'gs-2',
    category: 'Aan de slag',
    question: 'Wat heb ik nodig om te starten?',
    answer:
      'Je hebt een WhatsApp Business API nummer nodig (via Meta Business), een geldige email, en een van onze abonnementen. We bieden gratis trials voor 14 dagen.',
    tags: ['requirements', 'setup'],
  },
  {
    id: 'gs-3',
    category: 'Aan de slag',
    question: 'Kan ik ADSapp eerst gratis uitproberen?',
    answer:
      'Ja! We bieden een 14-dagen gratis trial aan voor alle nieuwe accounts. Geen creditcard vereist bij aanmelding.',
    tags: ['trial', 'pricing', 'free'],
  },

  // WhatsApp Inbox
  {
    id: 'inbox-1',
    category: 'WhatsApp Inbox',
    question: 'Hoe werkt de WhatsApp inbox?',
    answer:
      'Alle WhatsApp berichten komen real-time binnen in je inbox. Je kunt gesprekken filteren, labels toevoegen, prioriteit instellen, en toewijzen aan teamleden. Gebruik de zoekfunctie om oude gesprekken terug te vinden.',
    tags: ['inbox', 'messages', 'conversations'],
  },
  {
    id: 'inbox-2',
    category: 'WhatsApp Inbox',
    question: 'Kan ik media (afbeeldingen, video\'s) verzenden?',
    answer:
      'Ja! ADSapp ondersteunt alle WhatsApp media types: afbeeldingen, video\'s, documenten (PDF, Word), audio bestanden, en contactkaarten. Sleep & drop bestanden direct in het berichten veld.',
    tags: ['media', 'images', 'files', 'attachments'],
  },
  {
    id: 'inbox-3',
    category: 'WhatsApp Inbox',
    question: 'Hoe kan ik gesprekken taggen en organiseren?',
    answer:
      'Klik op een gesprek en voeg tags toe via het tag menu. Creëer custom tags met kleuren in Settings > Tags. Filter vervolgens op tags om specifieke gesprekken te vinden.',
    tags: ['tags', 'organization', 'labels'],
  },
  {
    id: 'inbox-4',
    category: 'WhatsApp Inbox',
    question: 'Wat zijn de verschillende gespreks-statussen?',
    answer:
      'Gesprekken kunnen 4 statussen hebben: Open (nieuw bericht), Pending (wacht op reactie), Resolved (opgelost), Closed (gearchiveerd). Wijzig status via het dropdown menu.',
    tags: ['status', 'workflow', 'organization'],
  },
  {
    id: 'inbox-5',
    category: 'WhatsApp Inbox',
    question: 'Kan ik gepersonaliseerde chat bubble kleuren instellen?',
    answer:
      'Ja! Elke organisatie kan custom bubble kleuren instellen voor uitgaande berichten. Ga naar Settings > Organization > Chat Styling om jouw merkkleur in te stellen.',
    tags: ['customization', 'branding', 'styling'],
  },

  // Team Samenwerking
  {
    id: 'team-1',
    category: 'Team Samenwerking',
    question: 'Hoe voeg ik teamleden toe?',
    answer:
      'Ga naar Settings > Team, klik op "Invite Member", voer het email adres in. De uitnodiging wordt verstuurd en het nieuwe lid kan zich registreren en direct meedoen.',
    tags: ['team', 'invites', 'collaboration'],
  },
  {
    id: 'team-2',
    category: 'Team Samenwerking',
    question: 'Wat zijn de verschillende gebruikersrollen?',
    answer:
      'ADSapp heeft 3 rollen: Admin (volledige controle), Agent (kan gesprekken afhandelen), en Viewer (alleen lezen). Admins kunnen instellingen wijzigen en teamleden beheren.',
    tags: ['roles', 'permissions', 'security'],
  },
  {
    id: 'team-3',
    category: 'Team Samenwerking',
    question: 'Kunnen meerdere mensen tegelijk aan hetzelfde gesprek werken?',
    answer:
      'Ja! Real-time updates zorgen ervoor dat teamleden direct zien wanneer iemand anders typt of een bericht verstuurt. Gesprek toewijzing voorkomt duplicate reacties.',
    tags: ['realtime', 'collaboration', 'concurrent'],
  },
  {
    id: 'team-4',
    category: 'Team Samenwerking',
    question: 'Hoe wijs ik gesprekken toe aan teamleden?',
    answer:
      'Klik op een gesprek, gebruik het "Assign to" dropdown menu bovenaan, en selecteer een teamlid. Ze ontvangen een notificatie en het gesprek verschijnt in hun wachtrij.',
    tags: ['assignment', 'workflow', 'distribution'],
  },

  // Automatisering
  {
    id: 'auto-1',
    category: 'Automatisering',
    question: 'Wat zijn automation rules?',
    answer:
      'Automation rules zijn triggers die automatisch acties uitvoeren. Bijvoorbeeld: auto-tag berichten met specifieke keywords, auto-assign gesprekken gebaseerd op tijdstip, of verstuur welkomstberichten.',
    tags: ['automation', 'workflows', 'triggers'],
  },
  {
    id: 'auto-2',
    category: 'Automatisering',
    question: 'Kan ik automatische antwoorden instellen?',
    answer:
      'Ja! Creëer message templates en koppel ze aan automation rules. Gebruik placeholders zoals {{name}} en {{company}} voor personalisatie. Perfect voor FAQ\'s en welkomstberichten.',
    tags: ['auto-reply', 'templates', 'personalization'],
  },
  {
    id: 'auto-3',
    category: 'Automatisering',
    question: 'Hoe werk ik met message templates?',
    answer:
      'Ga naar Dashboard > Templates, maak een nieuwe template met variabelen zoals {{firstName}}. Gebruik templates in de inbox via de "/" shortcut of selecteer ze uit het dropdown menu.',
    tags: ['templates', 'quickreplies', 'efficiency'],
  },
  {
    id: 'auto-4',
    category: 'Automatisering',
    question: 'Wat is AI-powered automation?',
    answer:
      'Onze AI kan automatisch berichten categoriseren, sentiment analyseren, antwoord-suggesties geven, en draft berichten genereren. Activeer AI features in Settings > AI Configuration.',
    tags: ['ai', 'automation', 'intelligence'],
  },
  {
    id: 'auto-5',
    category: 'Automatisering',
    question: 'Kan ik business hours instellen?',
    answer:
      'Ja! Configureer business hours in Settings > Organization. Stel auto-replies in voor buiten kantooruren en weekend. Gesprekken worden automatisch geparkeerd tot de volgende werkdag.',
    tags: ['business-hours', 'scheduling', 'availability'],
  },
  {
    id: 'auto-6',
    category: 'Automatisering',
    question: 'Wat zijn Drip Campaigns?',
    answer:
      'Drip Campaigns zijn geautomatiseerde berichtreeksen die in een bepaalde volgorde worden verstuurd. Ideaal voor onboarding, nurturing, en opvolging. Configureer stappen met tijdsintervallen (minuten, uren, dagen) en personaliseer berichten per contact.',
    tags: ['drip-campaigns', 'automation', 'sequences', 'nurturing'],
  },
  {
    id: 'auto-7',
    category: 'Automatisering',
    question: 'Hoe maak ik een Drip Campaign aan?',
    answer:
      'Ga naar Dashboard > Drip Campaigns > Nieuwe Campaign. Kies een trigger (tag toegevoegd, nieuw contact, handmatig, scheduled, of API), voeg stappen toe met berichten en delays, en activeer de campaign. Contacten worden automatisch ingeschreven wanneer de trigger voorkomt.',
    tags: ['drip-campaigns', 'setup', 'triggers', 'workflow'],
  },
  {
    id: 'auto-8',
    category: 'Automatisering',
    question: 'Wat zijn Broadcast Campaigns?',
    answer:
      'Broadcast Campaigns zijn bulk berichten naar grote groepen contacten tegelijk. Perfect voor announcements, promoties, en nieuwsbrieven. Selecteer je doelgroep (alle contacten, specifieke tags, CSV upload, of custom selectie), stel een schema in, en verstuur.',
    tags: ['broadcast', 'bulk-messaging', 'campaigns', 'announcements'],
  },
  {
    id: 'auto-9',
    category: 'Automatisering',
    question: 'Hoe target ik de juiste contacten voor een Broadcast?',
    answer:
      'ADSapp biedt 4 targeting opties: 1) Alle contacten (gefilterd op blocked status), 2) Tags (selecteer meerdere tags), 3) Custom selectie (kies specifieke contacten), 4) CSV upload (importeer een lijst). Je ziet altijd het aantal targets voordat je verstuurt.',
    tags: ['broadcast', 'targeting', 'segmentation', 'audience'],
  },
  {
    id: 'auto-10',
    category: 'Automatisering',
    question: 'Kan ik campaign resultaten exporteren?',
    answer:
      'Ja! Exporteer campaign data naar CSV of PDF. Zie statistieken zoals verzonden, afgeleverd, gelezen, en failed berichten per contact. Gebruik deze data voor analyse en rapportage. Export via Dashboard > Campaigns > [Campaign] > Export.',
    tags: ['export', 'analytics', 'reporting', 'campaigns'],
  },

  // Contacten Management
  {
    id: 'contact-1',
    category: 'Contacten',
    question: 'Hoe beheer ik mijn contacten?',
    answer:
      'Ga naar Dashboard > Contacts voor een volledig overzicht. Voeg custom velden toe, importeer contacten via CSV, en segmenteer op tags, activiteit, of custom eigenschappen.',
    tags: ['contacts', 'crm', 'management'],
  },
  {
    id: 'contact-2',
    category: 'Contacten',
    question: 'Kan ik contacten importeren?',
    answer:
      'Ja! Upload een CSV/Excel bestand met kolommen: phone, firstName, lastName, email, tags. Wij valideren automatisch telefoonnummers naar E.164 formaat, detecteren duplicaten, en rapporteren errors per rij. Custom fields worden ook ondersteund. Download een template via Dashboard > Contacts > Import.',
    tags: ['import', 'csv', 'excel', 'bulk'],
  },
  {
    id: 'contact-3',
    category: 'Contacten',
    question: 'Worden contacten automatisch aangemaakt?',
    answer:
      'Ja! Wanneer een nieuw nummer je een bericht stuurt, wordt automatisch een contact aangemaakt met het telefoonnummer. Je kunt daarna handmatig naam en details toevoegen.',
    tags: ['auto-creation', 'contacts', 'workflow'],
  },
  {
    id: 'contact-4',
    category: 'Contacten',
    question: 'Wat zijn custom contact velden?',
    answer:
      'Voeg eigen velden toe zoals "Order Number", "Subscription Type", of "Lead Score". Configureer in Settings > Contact Fields en gebruik ze voor filtering en personalisatie.',
    tags: ['custom-fields', 'personalization', 'data'],
  },
  {
    id: 'contact-5',
    category: 'Contacten',
    question: 'Kan ik contacten exporteren?',
    answer:
      'Ja! Exporteer contacten naar CSV, Excel, of JSON. Filter op tags, segments (actief/inactief/nieuw/VIP), of datum ranges. Kies welke velden je wilt exporteren. Voor kleine exports (< 100 contacten) direct downloaden, grotere exports worden asynchroon verwerkt.',
    tags: ['export', 'csv', 'excel', 'json', 'bulk'],
  },

  // Analytics & Rapportage
  {
    id: 'analytics-1',
    category: 'Analytics',
    question: 'Welke analytics zijn beschikbaar?',
    answer:
      'Dashboard toont: totaal berichten, response times, gesprek volumes, team performance, klanttevredenheid scores, en conversion metrics. Export data naar CSV voor diepere analyse.',
    tags: ['analytics', 'reporting', 'metrics'],
  },
  {
    id: 'analytics-2',
    category: 'Analytics',
    question: 'Kan ik team performance meten?',
    answer:
      'Ja! Zie per agent: aantal afgehandelde gesprekken, gemiddelde response time, klant-ratings, en actieve uren. Perfect voor performance reviews en coaching.',
    tags: ['team-metrics', 'performance', 'kpi'],
  },
  {
    id: 'analytics-3',
    category: 'Analytics',
    question: 'Hoe werkt revenue analytics?',
    answer:
      'Koppel gesprekken aan orders via custom fields. Track conversie van gesprek naar verkoop, gemiddelde order waarde, en ROI. Alleen beschikbaar in Business en Enterprise plannen.',
    tags: ['revenue', 'sales', 'conversions'],
  },
  {
    id: 'analytics-4',
    category: 'Analytics',
    question: 'Kan ik AI usage en kosten bijhouden?',
    answer:
      'Ja! Dashboard > Analytics > AI toont je AI request volume, kosten per feature, model usage breakdown, en budget utilization. Stel budget alerts in om overschrijdingen te voorkomen.',
    tags: ['ai-analytics', 'costs', 'budget'],
  },

  // Beveiliging & Privacy
  {
    id: 'security-1',
    category: 'Beveiliging',
    question: 'Is ADSapp GDPR compliant?',
    answer:
      'Ja! Alle data wordt opgeslagen in EU datacenters (Supabase). We hebben Data Processing Agreements, user consent tracking, en right-to-deletion functionaliteit geïmplementeerd.',
    tags: ['gdpr', 'privacy', 'compliance'],
  },
  {
    id: 'security-2',
    category: 'Beveiliging',
    question: 'Hoe beveilig ik mijn account?',
    answer:
      'Gebruik strong passwords (minimaal 12 karakters), enable two-factor authentication (2FA) in Settings > Security, en review active sessions regelmatig. Admins kunnen 2FA verplicht stellen.',
    tags: ['2fa', 'security', 'authentication'],
  },
  {
    id: 'security-3',
    category: 'Beveiliging',
    question: 'Wat is Row Level Security (RLS)?',
    answer:
      'Elke organisatie heeft strikte data isolatie. Gebruikers zien ALLEEN data van hun eigen organisatie. Multi-tenant architectuur voorkomt data leaks tussen klanten.',
    tags: ['rls', 'multi-tenant', 'isolation'],
  },
  {
    id: 'security-4',
    category: 'Beveiliging',
    question: 'Worden berichten encrypted?',
    answer:
      'Ja! End-to-end encryption via WhatsApp Business API. Data-at-rest is encrypted in onze database. TLS 1.3 voor alle API communicatie. Webhook signatures voorkomen message tampering.',
    tags: ['encryption', 'security', 'e2ee'],
  },
  {
    id: 'security-5',
    category: 'Beveiliging',
    question: 'Hoe werkt audit logging?',
    answer:
      'Super admins kunnen alle user acties bekijken in Admin > Audit Logs. Zie wie wat wanneer heeft gedaan: logins, settings wijzigingen, data exports, en user management.',
    tags: ['audit', 'logging', 'compliance'],
  },

  // Facturatie & Abonnementen
  {
    id: 'billing-1',
    category: 'Facturatie',
    question: 'Welke betaalmethoden accepteren jullie?',
    answer:
      'We accepteren alle major credit cards (Visa, Mastercard, Amex) via Stripe. Automatische maandelijkse of jaarlijkse facturatie. Facturen ontvang je via email.',
    tags: ['payment', 'billing', 'stripe'],
  },
  {
    id: 'billing-2',
    category: 'Facturatie',
    question: 'Kan ik upgraden of downgraden?',
    answer:
      'Ja! Upgrade direct in Settings > Billing. Downgrade neemt effect aan het eind van je huidige facturatieperiode. Pro-rated credits worden automatisch toegepast.',
    tags: ['upgrade', 'downgrade', 'plan-change'],
  },
  {
    id: 'billing-3',
    category: 'Facturatie',
    question: 'Wat gebeurt er als ik mijn limiet bereik?',
    answer:
      'Je ontvangt waarschuwingen bij 75% en 90% gebruik. Bij 100% worden nieuwe berichten geblokkeerd tot je upgrade of je limiet reset (volgende maand). Geen overages fees.',
    tags: ['limits', 'usage', 'warnings'],
  },
  {
    id: 'billing-4',
    category: 'Facturatie',
    question: 'Krijg ik korting bij jaarlijkse betaling?',
    answer:
      'Ja! Betaal jaarlijks en ontvang 2 maanden gratis (17% korting). Alle plannen hebben jaarlijkse optie. Switch in Settings > Billing.',
    tags: ['annual', 'discount', 'pricing'],
  },
  {
    id: 'billing-5',
    category: 'Facturatie',
    question: 'Hoe kan ik mijn abonnement opzeggen?',
    answer:
      'Ga naar Settings > Billing > Cancel Subscription. Je account blijft actief tot het einde van je betaalde periode. Data blijft 30 dagen beschikbaar voor export.',
    tags: ['cancellation', 'refund', 'termination'],
  },

  // Integraties
  {
    id: 'integration-1',
    category: 'Integraties',
    question: 'Welke integraties ondersteunen jullie?',
    answer:
      'Native integraties: WhatsApp Business API, Stripe (payments), Resend (email). Via Webhooks: Zapier, Make, custom CRM systemen. API docs beschikbaar voor developers.',
    tags: ['integrations', 'api', 'webhooks'],
  },
  {
    id: 'integration-2',
    category: 'Integraties',
    question: 'Hoe gebruik ik de API?',
    answer:
      'Genereer een API key in Settings > Integrations. Lees onze API docs op docs.adsapp.nl. Alle endpoints zijn RESTful met JSON responses. Rate limits: 1000 req/min.',
    tags: ['api', 'development', 'integration'],
  },
  {
    id: 'integration-3',
    category: 'Integraties',
    question: 'Kan ik webhooks instellen?',
    answer:
      'Ja! Configureer webhooks voor events: nieuwe berichten, gesprek updates, contact wijzigingen. Gebruik HMAC signatures voor verificatie. Test webhooks met ngrok tijdens development.',
    tags: ['webhooks', 'events', 'notifications'],
  },

  // AI Features
  {
    id: 'ai-1',
    category: 'AI Features',
    question: 'Welke AI functies zijn beschikbaar?',
    answer:
      'AI kan: automatische berichten drafts genereren, sentiment analyse, auto-categorisatie, antwoord-suggesties, samenvatten van lange gesprekken, en template aanbevelingen.',
    tags: ['ai', 'features', 'automation'],
  },
  {
    id: 'ai-2',
    category: 'AI Features',
    question: 'Hoe werkt AI message drafting?',
    answer:
      'Klik op de AI icon in de message composer. AI analyseert het gesprek en genereert een passend antwoord. Review, edit indien nodig, en verstuur. Leer uit je feedback.',
    tags: ['ai-drafting', 'suggestions', 'automation'],
  },
  {
    id: 'ai-3',
    category: 'AI Features',
    question: 'Wat kost AI usage?',
    answer:
      'AI features hebben een credit systeem. Starter plan: 1000 credits/maand. Pro: 5000 credits. Business: 20000 credits. Extra credits: €0.10 per 100 credits. Monitor usage in Analytics > AI.',
    tags: ['ai-pricing', 'credits', 'costs'],
  },
  {
    id: 'ai-4',
    category: 'AI Features',
    question: 'Is mijn data veilig bij AI features?',
    answer:
      'Ja! We gebruiken OpenAI API met strict data retention (30 dagen). Geen training op je data. GDPR compliant. Je kunt AI features volledig uitschakelen in Settings.',
    tags: ['ai-security', 'privacy', 'data-protection'],
  },

  // Super Admin
  {
    id: 'admin-1',
    category: 'Super Admin',
    question: 'Wat kan een Super Admin doen?',
    answer:
      'Super Admins zien: alle organisaties, system-wide analytics, security monitoring, webhook events, audit logs, en kunnen organisaties aanpassen, pauzeren, of verwijderen.',
    tags: ['super-admin', 'administration', 'management'],
  },
  {
    id: 'admin-2',
    category: 'Super Admin',
    question: 'Hoe monitor ik platform security?',
    answer:
      'Admin > Security dashboard toont: failed login attempts, rate limit hits, webhook failures, suspicious activity patterns. Configureer alerts voor security events.',
    tags: ['security-monitoring', 'admin', 'alerts'],
  },

  // Troubleshooting
  {
    id: 'trouble-1',
    category: 'Probleemoplossing',
    question: 'Waarom ontvang ik geen berichten?',
    answer:
      'Check: 1) WhatsApp Business API configuratie correct? 2) Webhook URL bereikbaar? 3) Geen rate limiting? 4) WhatsApp nummer actief? Zie Settings > WhatsApp Integration voor status.',
    tags: ['troubleshooting', 'webhooks', 'connectivity'],
  },
  {
    id: 'trouble-2',
    category: 'Probleemoplossing',
    question: 'Berichten worden niet verstuurd, wat nu?',
    answer:
      'Check: 1) WhatsApp Business API quota niet overschreden? 2) Ontvanger nummer correct format? 3) Template approved (voor eerste bericht)? Zie error details in gesprek.',
    tags: ['sending-errors', 'troubleshooting', 'whatsapp'],
  },
  {
    id: 'trouble-3',
    category: 'Probleemoplossing',
    question: 'Real-time updates werken niet?',
    answer:
      'Ververs de pagina. Check browser console voor errors. Zorg dat Supabase realtime niet geblokkeerd wordt door firewall. Werkt niet in private/incognito mode met strict tracking prevention.',
    tags: ['realtime', 'troubleshooting', 'connectivity'],
  },
  {
    id: 'trouble-4',
    category: 'Probleemoplossing',
    question: 'Ik zie een "Unauthorized" error?',
    answer:
      'Log uit en opnieuw in. Check of je sessie niet verlopen is. Clearing browser cache kan helpen. Blijft het probleem? Contact support met screenshot.',
    tags: ['authentication', 'errors', 'troubleshooting'],
  },
]

const categories = [
  { name: 'Alle', icon: FileText, count: faqData.length },
  {
    name: 'Aan de slag',
    icon: Smartphone,
    count: faqData.filter(f => f.category === 'Aan de slag').length,
  },
  {
    name: 'WhatsApp Inbox',
    icon: MessageSquare,
    count: faqData.filter(f => f.category === 'WhatsApp Inbox').length,
  },
  {
    name: 'Team Samenwerking',
    icon: Users,
    count: faqData.filter(f => f.category === 'Team Samenwerking').length,
  },
  {
    name: 'Automatisering',
    icon: Zap,
    count: faqData.filter(f => f.category === 'Automatisering').length,
  },
  {
    name: 'Contacten',
    icon: UserPlus,
    count: faqData.filter(f => f.category === 'Contacten').length,
  },
  {
    name: 'Analytics',
    icon: BarChart,
    count: faqData.filter(f => f.category === 'Analytics').length,
  },
  {
    name: 'Beveiliging',
    icon: Shield,
    count: faqData.filter(f => f.category === 'Beveiliging').length,
  },
  {
    name: 'Facturatie',
    icon: CreditCard,
    count: faqData.filter(f => f.category === 'Facturatie').length,
  },
  {
    name: 'Integraties',
    icon: Globe,
    count: faqData.filter(f => f.category === 'Integraties').length,
  },
  {
    name: 'AI Features',
    icon: Bot,
    count: faqData.filter(f => f.category === 'AI Features').length,
  },
  {
    name: 'Super Admin',
    icon: Lock,
    count: faqData.filter(f => f.category === 'Super Admin').length,
  },
  {
    name: 'Probleemoplossing',
    icon: Settings,
    count: faqData.filter(f => f.category === 'Probleemoplossing').length,
  },
]

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alle')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'Alle' || faq.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Header */}
      <header className='border-b border-gray-200 bg-white shadow-sm'>
        <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between'>
            <div>
              <Link href='/' className='text-2xl font-bold text-gray-900'>
                ADS<span className='text-green-600'>app</span>
              </Link>
              <p className='mt-1 text-sm text-gray-500'>Veelgestelde Vragen</p>
            </div>
            <div className='flex gap-4'>
              <Link
                href='/'
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Home
              </Link>
              <Link
                href='/auth/signin'
                className='rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700'
              >
                Inloggen
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className='bg-gradient-to-r from-green-600 to-blue-600 py-16 text-white'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold sm:text-5xl'>Veelgestelde Vragen</h1>
            <p className='mx-auto mt-4 max-w-2xl text-xl text-green-100'>
              Alles wat je moet weten over ADSapp - WhatsApp Business Inbox Platform
            </p>

            {/* Search Bar */}
            <div className='mx-auto mt-8 max-w-2xl'>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='Zoek in FAQ...'
                  className='w-full rounded-lg border-0 py-4 pl-12 pr-4 text-gray-900 shadow-lg focus:ring-2 focus:ring-green-500'
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
          {/* Category Sidebar */}
          <div className='lg:col-span-1'>
            <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
              <h2 className='mb-4 font-semibold text-gray-900'>Categorieën</h2>
              <nav className='space-y-1'>
                {categories.map(category => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        selectedCategory === category.name
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className='flex items-center'>
                        <Icon className='mr-2 h-4 w-4' />
                        <span>{category.name}</span>
                      </div>
                      <span className='text-xs text-gray-500'>({category.count})</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Quick Links */}
            <div className='mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
              <h2 className='mb-4 font-semibold text-gray-900'>Hulp nodig?</h2>
              <div className='space-y-3'>
                <Link
                  href='/dashboard/help'
                  className='flex items-center text-sm text-green-600 hover:text-green-700'
                >
                  <Mail className='mr-2 h-4 w-4' />
                  Contact Support
                </Link>
                <Link
                  href='/demo'
                  className='flex items-center text-sm text-green-600 hover:text-green-700'
                >
                  <Smartphone className='mr-2 h-4 w-4' />
                  Demo Bekijken
                </Link>
                <Link href='/#pricing' className='flex items-center text-sm text-green-600 hover:text-green-700'>
                  <CreditCard className='mr-2 h-4 w-4' />
                  Prijzen
                </Link>
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className='lg:col-span-3'>
            <div className='mb-6 flex items-center justify-between'>
              <h2 className='text-2xl font-bold text-gray-900'>
                {selectedCategory === 'Alle' ? 'Alle vragen' : selectedCategory}
              </h2>
              <p className='text-sm text-gray-500'>{filteredFAQs.length} vragen gevonden</p>
            </div>

            {filteredFAQs.length === 0 ? (
              <div className='rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm'>
                <Search className='mx-auto h-12 w-12 text-gray-400' />
                <h3 className='mt-4 text-lg font-medium text-gray-900'>Geen resultaten gevonden</h3>
                <p className='mt-2 text-sm text-gray-500'>
                  Probeer een andere zoekopdracht of selecteer een andere categorie
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {filteredFAQs.map(faq => {
                  const isExpanded = expandedItems.has(faq.id)
                  return (
                    <div key={faq.id} className='rounded-lg border border-gray-200 bg-white shadow-sm'>
                      <button
                        onClick={() => toggleItem(faq.id)}
                        className='flex w-full items-start justify-between p-6 text-left transition-colors hover:bg-gray-50'
                      >
                        <div className='flex-1'>
                          <h3 className='font-semibold text-gray-900'>{faq.question}</h3>
                          <div className='mt-2 flex flex-wrap gap-2'>
                            {faq.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className='ml-4'>
                          {isExpanded ? (
                            <ChevronUp className='h-5 w-5 text-gray-400' />
                          ) : (
                            <ChevronDown className='h-5 w-5 text-gray-400' />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className='border-t border-gray-200 bg-gray-50 p-6'>
                          <p className='leading-relaxed text-gray-700'>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className='border-t border-gray-200 bg-white py-16'>
        <div className='mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
          <h2 className='text-3xl font-bold text-gray-900'>Klaar om te starten?</h2>
          <p className='mx-auto mt-4 max-w-2xl text-lg text-gray-600'>
            Probeer ADSapp 14 dagen gratis. Geen creditcard vereist.
          </p>
          <div className='mt-8 flex justify-center gap-4'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700'
            >
              Gratis Proberen
            </Link>
            <Link
              href='/demo'
              className='rounded-lg border border-gray-300 bg-white px-8 py-3 font-medium text-gray-700 hover:bg-gray-50'
            >
              Demo Bekijken
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
