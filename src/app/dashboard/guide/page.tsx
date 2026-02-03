'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  MessageSquare,
  Users,
  Zap,
  BarChart3,
  Settings,
  Shield,
  Sparkles,
  Bell,
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Workflow,
  Bot,
  Target,
  TrendingUp,
  Globe,
  Palette,
  Key,
  UserPlus,
  Mail,
  Phone,
  Building,
  Calendar,
  RefreshCw,
  Send,
  Layers,
  Database,
  Lock,
  Eye,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Save,
  Image,
  Paperclip,
  Mic,
  Video,
  File,
  MapPin,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Reply,
  Forward,
  Archive,
  Inbox,
  FolderOpen,
  Home,
  DollarSign,
  CreditCard,
  Receipt,
  PieChart,
  Activity,
  Gauge,
  Maximize2,
  Monitor,
  Smartphone,
} from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  subsections: GuideSubsection[]
}

interface GuideSubsection {
  id: string
  title: string
  content: string
  tips?: string[]
  warnings?: string[]
  steps?: string[]
  shortcuts?: { key: string; action: string }[]
}

const guideData: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Aan de Slag',
    icon: Home,
    description: 'Alles wat je moet weten om te beginnen met ADSapp',
    subsections: [
      {
        id: 'first-login',
        title: 'Eerste Keer Inloggen',
        content: 'Na het ontvangen van je uitnodigingsmail, klik op de activatielink om je account aan te maken. Kies een sterk wachtwoord (minimaal 12 karakters, letters, cijfers en speciale tekens). Je wordt automatisch doorgestuurd naar de onboarding wizard.',
        steps: [
          'Open de uitnodigingsmail en klik op "Account Activeren"',
          'Maak een sterk wachtwoord aan',
          'Vul je profiel gegevens in (naam, functie)',
          'Configureer je notificatie voorkeuren',
          'Voltooi de onboarding tour'
        ],
        tips: [
          'Gebruik een wachtwoord manager voor veilige wachtwoorden',
          'Schakel twee-factor authenticatie (2FA) direct in voor extra beveiliging'
        ]
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overzicht',
        content: 'Het dashboard is je centrale werkplek. Links vind je de navigatie, in het midden je werkgebied, en rechts context-afhankelijke informatie. De topbar toont notificaties, zoekfunctie en je profiel.',
        tips: [
          'Gebruik Ctrl+K (of Cmd+K op Mac) voor snelzoeken',
          'Klik op je profielfoto voor snelle toegang tot instellingen',
          'Het dashboard past zich automatisch aan op mobiele apparaten'
        ],
        shortcuts: [
          { key: 'Ctrl + K', action: 'Snelzoeken openen' },
          { key: 'Ctrl + N', action: 'Nieuw gesprek starten' },
          { key: 'Ctrl + /', action: 'Alle sneltoetsen tonen' },
          { key: 'Esc', action: 'Huidige actie annuleren' }
        ]
      },
      {
        id: 'navigation',
        title: 'Navigatie & Menu',
        content: 'De linker sidebar bevat alle hoofdsecties: Inbox, Contacten, Templates, Automatisering, Analytics, en Instellingen. Hover over iconen voor labels, of klap de sidebar uit voor volledige weergave.',
        tips: [
          'De sidebar is inklapbaar voor meer werkruimte',
          'Veelgebruikte secties worden automatisch bovenaan getoond',
          'Je rol bepaalt welke menu-items zichtbaar zijn'
        ]
      }
    ]
  },
  {
    id: 'inbox',
    title: 'WhatsApp Inbox',
    icon: MessageSquare,
    description: 'Beheer al je WhatsApp gesprekken in één overzichtelijke inbox',
    subsections: [
      {
        id: 'conversation-list',
        title: 'Gesprekkenlijst',
        content: 'De gesprekkenlijst toont alle actieve en recente conversaties. Elke entry toont: contactnaam, laatste bericht preview, timestamp, status badge, en eventuele tags. Ongelezenberichten worden gemarkeerd met een blauwe indicator.',
        tips: [
          'Klik op een gesprek om het te openen in het chatpaneel',
          'Rechtermuisknop voor snelacties (archiveren, taggen, toewijzen)',
          'Sleep gesprekken om ze handmatig te herschikken'
        ]
      },
      {
        id: 'filters-search',
        title: 'Filters & Zoeken',
        content: 'Gebruik de zoekbalk bovenaan om gesprekken te doorzoeken op naam, telefoonnummer, of berichtinhoud. Filters helpen bij het verfijnen: status (open/pending/resolved), tags, toegewezen agent, en datumbereik.',
        steps: [
          'Klik op het filtericon naast de zoekbalk',
          'Selecteer één of meerdere filtercriteria',
          'Combineer filters voor specifieke resultaten',
          'Sla veelgebruikte filters op als "Saved View"'
        ],
        shortcuts: [
          { key: 'Ctrl + F', action: 'Zoeken in gesprekken' },
          { key: 'Ctrl + Shift + F', action: 'Geavanceerde filters' }
        ]
      },
      {
        id: 'sending-messages',
        title: 'Berichten Versturen',
        content: 'Type je bericht in het invoerveld onderaan het chatpaneel. Druk op Enter om te verzenden, of Shift+Enter voor een nieuwe regel. Gebruik het paperclip-icoon voor bijlagen (afbeeldingen, video\'s, documenten tot 100MB).',
        tips: [
          'Drag & drop bestanden direct in het tekstveld',
          'Gebruik @mentions om collega\'s te taggen in interne notities',
          'Templates zijn beschikbaar via de "/" sneltoets'
        ],
        shortcuts: [
          { key: 'Enter', action: 'Bericht versturen' },
          { key: 'Shift + Enter', action: 'Nieuwe regel' },
          { key: '/', action: 'Template selecteren' },
          { key: 'Ctrl + Shift + E', action: 'Emoji picker openen' }
        ]
      },
      {
        id: 'media-attachments',
        title: 'Media & Bijlagen',
        content: 'ADSapp ondersteunt alle WhatsApp media types: afbeeldingen (JPG, PNG, GIF), video\'s (MP4), audio (MP3, WAV), documenten (PDF, Word, Excel), en locaties. Maximum bestandsgrootte is 100MB voor video, 16MB voor overige bestanden.',
        tips: [
          'Afbeeldingen worden automatisch gecomprimeerd voor snellere verzending',
          'Preview documenten voordat je ze verstuurt',
          'Locaties kunnen worden geselecteerd via de kaart of coördinaten'
        ],
        warnings: [
          'Grote bestanden kunnen langer duren om te verzenden',
          'Sommige bestandstypen (.exe, .bat) zijn geblokkeerd voor veiligheid'
        ]
      },
      {
        id: 'conversation-status',
        title: 'Gespreksstatus & Workflow',
        content: 'Elk gesprek heeft een status: Open (nieuw/actief), Pending (wacht op reactie), Resolved (opgelost), Closed (gearchiveerd). Status wijzigingen worden gelogd voor audit purposes.',
        steps: [
          'Open: Nieuw bericht ontvangen, actie vereist',
          'Pending: Wacht op klantreactie of externe actie',
          'Resolved: Vraag beantwoord, maar nog niet formeel afgesloten',
          'Closed: Gesprek volledig afgerond en gearchiveerd'
        ],
        tips: [
          'Automatische status updates kunnen worden geconfigureerd in Automation',
          'Closed gesprekken heropenen automatisch bij nieuwe berichten'
        ]
      },
      {
        id: 'tags-labels',
        title: 'Tags & Labels',
        content: 'Tags helpen bij het organiseren en categoriseren van gesprekken. Standaard tags zijn beschikbaar, en admins kunnen custom tags aanmaken. Tags zijn doorzoekbaar en kunnen worden gebruikt in automation rules en analytics.',
        tips: [
          'Gebruik consistente tag-naming voor betere organisatie',
          'Kleurcodes maken tags visueel herkenbaar',
          'Meerdere tags per gesprek zijn mogelijk'
        ]
      },
      {
        id: 'assignment',
        title: 'Gesprek Toewijzing',
        content: 'Gesprekken kunnen worden toegewezen aan specifieke agenten of teams. Toewijzing kan handmatig of automatisch via assignment rules. De toegewezen agent krijgt een notificatie en het gesprek verschijnt in hun persoonlijke queue.',
        steps: [
          'Klik op "Assign" in de gesprek header',
          'Selecteer een agent of team uit de dropdown',
          'Optioneel: voeg een interne notitie toe voor context',
          'De agent ontvangt direct een notificatie'
        ]
      }
    ]
  },
  {
    id: 'ai-features',
    title: 'AI Functies',
    icon: Sparkles,
    description: 'Slimme AI-ondersteuning voor efficiëntere communicatie',
    subsections: [
      {
        id: 'ai-drafts',
        title: 'AI Draft Suggestions',
        content: 'AI analyseert de volledige conversatie-context en genereert 3 antwoordsuggesties in verschillende tonen: professioneel, vriendelijk, en empathisch. Klik op het Sparkles-icoon (✨) in het berichtenveld om suggesties te genereren.',
        tips: [
          'Suggesties worden beter naarmate meer context beschikbaar is',
          'Je kunt suggesties bewerken voordat je ze verstuurt',
          'Feedback geven op suggesties verbetert toekomstige resultaten'
        ],
        shortcuts: [
          { key: 'Ctrl + Shift + A', action: 'AI suggesties genereren' }
        ]
      },
      {
        id: 'sentiment-analysis',
        title: 'Sentiment Analyse',
        content: 'Automatische analyse van de emotionele toon van berichten. Badges tonen: 😊 Positief, 😐 Neutraal, 😠 Negatief, 🤔 Gemengd. Urgency levels (Laag/Medium/Hoog/Kritiek) helpen bij prioritering.',
        tips: [
          'Negatief sentiment triggert automatische escalatie (indien geconfigureerd)',
          'Sentiment trends zijn zichtbaar in Analytics',
          'Gebruik sentiment data voor proactieve klantbenadering'
        ]
      },
      {
        id: 'conversation-summary',
        title: 'Gesprekssamenvatting',
        content: 'Genereer een uitgebreide samenvatting van elk gesprek met één klik. Bevat: executive summary, key points, action items, resolved issues, open questions, en gespreksstatistieken.',
        steps: [
          'Open het gesprek dat je wilt samenvatten',
          'Klik op "Summarize" in de header',
          'Wacht 5-10 seconden voor generatie',
          'Kopieer of deel de samenvatting'
        ],
        tips: [
          'Perfect voor overdracht aan collega\'s',
          'Samenvattingen worden opgeslagen voor later gebruik',
          'Export naar PDF voor rapportages'
        ]
      },
      {
        id: 'auto-categorization',
        title: 'Auto-Categorisatie',
        content: 'AI categoriseert binnenkomende berichten automatisch: vraag, klacht, compliment, sales inquiry, support request, feedback. Categorieën worden als tags toegevoegd en zijn bruikbaar voor routing en analytics.',
        tips: [
          'Custom categorieën kunnen worden getraind',
          'Categorisatie accuracy verbetert met feedback',
          'Gecombineerd met automation voor slimme routing'
        ]
      },
      {
        id: 'ai-settings',
        title: 'AI Instellingen',
        content: 'Configureer AI features per organisatie: model selectie (Opus/Sonnet/Haiku), feature toggles, budget limieten, en custom prompts. Alleen beschikbaar voor Admin+ rollen.',
        tips: [
          'Start met Sonnet voor beste prijs/kwaliteit balans',
          'Stel budget alerts in om overschrijding te voorkomen',
          'Test AI features met een klein team voor uitrol'
        ],
        warnings: [
          'Model wijzigingen zijn direct actief',
          'Budget overschrijding kan AI features tijdelijk uitschakelen'
        ]
      }
    ]
  },
  {
    id: 'contacts',
    title: 'Contacten',
    icon: Users,
    description: 'Beheer je klantendatabase en contactinformatie',
    subsections: [
      {
        id: 'contact-list',
        title: 'Contactenlijst',
        content: 'Overzicht van alle contacten in je organisatie. Toont naam, telefoonnummer, laatste interactie, tags, en custom velden. Sorteer op naam, datum, of activiteit.',
        shortcuts: [
          { key: 'Ctrl + Shift + N', action: 'Nieuw contact aanmaken' }
        ]
      },
      {
        id: 'add-contact',
        title: 'Contact Toevoegen',
        content: 'Handmatig contacten toevoegen via "Nieuw Contact". Minimaal vereist: telefoonnummer in internationaal formaat (+31612345678). Optioneel: naam, email, bedrijf, notities, custom velden.',
        steps: [
          'Klik op "Nieuw Contact" of Ctrl+Shift+N',
          'Vul telefoonnummer in (internationale notatie)',
          'Voeg optionele informatie toe',
          'Klik op "Opslaan"'
        ],
        tips: [
          'Telefoonnummers worden automatisch gevalideerd',
          'Duplicaat detectie voorkomt dubbele entries',
          'Contacten worden ook automatisch aangemaakt bij inkomende berichten'
        ]
      },
      {
        id: 'import-export',
        title: 'Import & Export',
        content: 'Bulk import via CSV/Excel met kolommen: phone (verplicht), name, email, company, notes, tags. Export naar CSV, Excel, of JSON met selecteerbare velden en filters.',
        steps: [
          'Ga naar Contacten → Import',
          'Download de template voor correct formaat',
          'Vul je data in de template in',
          'Upload het bestand',
          'Review de preview en bevestig import'
        ],
        warnings: [
          'Maximum 10.000 contacten per import',
          'Validatie kan enige tijd duren bij grote imports',
          'Duplicaten worden automatisch gedetecteerd'
        ]
      },
      {
        id: 'custom-fields',
        title: 'Custom Velden',
        content: 'Definieer extra velden voor contacten: tekst, nummer, datum, dropdown, of checkbox. Custom velden zijn doorzoekbaar, filterbaar, en bruikbaar in templates en automation.',
        tips: [
          'Plan je velden vooraf voor consistentie',
          'Gebruik dropdowns voor gestandaardiseerde data',
          'Custom velden kunnen worden geïmporteerd via CSV'
        ]
      },
      {
        id: 'segments',
        title: 'Segmenten',
        content: 'Groepeer contacten op basis van criteria: tags, custom velden, activiteit, sentiment score. Segments zijn dynamisch (auto-update) of statisch (handmatige selectie).',
        tips: [
          'Gebruik segmenten voor targeted broadcasts',
          'Dynamische segmenten updaten automatisch',
          'Combineer meerdere criteria voor specifieke targeting'
        ]
      }
    ]
  },
  {
    id: 'templates',
    title: 'Message Templates',
    icon: FileText,
    description: 'Herbruikbare berichten voor snelle en consistente communicatie',
    subsections: [
      {
        id: 'template-types',
        title: 'Template Types',
        content: 'Twee types templates: Quick Replies (interne gebruik, vrij tekst) en WhatsApp Templates (goedgekeurd door Meta, vereist voor eerste contact en marketing). Quick Replies zijn direct beschikbaar, WhatsApp Templates hebben een review proces.',
        tips: [
          'Quick Replies zijn perfect voor interne FAQ\'s',
          'WhatsApp Templates hebben strikte formatting regels',
          'Plan template content vooraf voor snellere goedkeuring'
        ]
      },
      {
        id: 'create-template',
        title: 'Template Aanmaken',
        content: 'Maak templates met variabelen voor personalisatie: {{firstName}}, {{company}}, {{orderId}}. Preview toont hoe het bericht eruitziet met echte data. Templates kunnen media bevatten: afbeeldingen, documenten, video.',
        steps: [
          'Ga naar Templates → Nieuw Template',
          'Kies type: Quick Reply of WhatsApp Template',
          'Schrijf je bericht met variabelen',
          'Voeg optionele media toe',
          'Preview en opslaan'
        ],
        tips: [
          'Houd templates kort en duidelijk',
          'Test variabelen met verschillende waarden',
          'Gebruik categorieën voor organisatie'
        ]
      },
      {
        id: 'using-templates',
        title: 'Templates Gebruiken',
        content: 'In de inbox, type "/" om het template menu te openen. Zoek op naam of categorie, selecteer, en het template wordt ingevoegd met variabelen automatisch ingevuld op basis van contactdata.',
        shortcuts: [
          { key: '/', action: 'Template menu openen' },
          { key: 'Tab', action: 'Navigeer variabelen' }
        ]
      },
      {
        id: 'whatsapp-approval',
        title: 'WhatsApp Template Goedkeuring',
        content: 'WhatsApp Templates worden gereviewd door Meta (1-24 uur). Status: Pending (in review), Approved (beschikbaar), Rejected (afgekeurd met reden). Afgekeurde templates kunnen worden aangepast en opnieuw ingediend.',
        warnings: [
          'Marketing content heeft strengere regels',
          'Vermijd spam-achtige taal',
          'Personalisatie moet waarde toevoegen'
        ]
      }
    ]
  },
  {
    id: 'automation',
    title: 'Automatisering',
    icon: Zap,
    description: 'Automatische workflows voor efficiëntere operaties',
    subsections: [
      {
        id: 'auto-replies',
        title: 'Auto-Replies',
        content: 'Automatische antwoorden op basis van triggers: keywords, tijdstip, sentiment, of contact tags. Configureer condities en acties voor complexe workflows.',
        steps: [
          'Ga naar Automation → Auto-Replies',
          'Klik op "Nieuwe Regel"',
          'Definieer trigger(s): keyword, tijd, sentiment',
          'Configureer conditie(s): business hours, contact tags',
          'Selecteer actie: stuur template, tag gesprek, assign agent',
          'Test met simulator en activeer'
        ]
      },
      {
        id: 'business-hours',
        title: 'Business Hours',
        content: 'Definieer openingstijden per dag. Buiten kantooruren worden auto-replies verzonden. Configureer verschillende berichten voor avond, weekend, en feestdagen.',
        tips: [
          'Timezone wordt automatisch gedetecteerd',
          'Feestdagen kunnen handmatig worden toegevoegd',
          'Meerdere tijdzones mogelijk voor internationale teams'
        ]
      },
      {
        id: 'escalation',
        title: 'Escalatie Regels',
        content: 'Automatische escalatie bij negatief sentiment, specifieke keywords, of lange wachttijd. Escalatie stuurt notificaties, wijzigt toewijzing, of triggert externe webhooks.',
        tips: [
          'Configureer escalatie levels voor gradual response',
          'Notificeer managers bij kritieke escalaties',
          'Log alle escalaties voor analyse'
        ]
      },
      {
        id: 'workflow-builder',
        title: 'Visual Workflow Builder',
        content: 'Drag-and-drop canvas voor complexe workflows. Nodes: Trigger, Message, Delay, Condition, Action, End. Verbind nodes om flows te creëren met conditional branching.',
        tips: [
          'Start simpel en bouw geleidelijk uit',
          'Gebruik de test functie voor validatie',
          'Documenteer complexe workflows'
        ]
      },
      {
        id: 'drip-campaigns',
        title: 'Drip Campaigns',
        content: 'Geautomatiseerde berichtsequenties over tijd. Triggers: tag toegevoegd, nieuw contact, scheduled, API. Stappen met delays (minuten, uren, dagen) en conditionele exits.',
        steps: [
          'Ga naar Drip Campaigns → Nieuwe Campaign',
          'Kies trigger: wanneer start de sequence',
          'Voeg stappen toe: bericht + delay',
          'Configureer exit condities',
          'Activeer de campaign'
        ]
      },
      {
        id: 'broadcasts',
        title: 'Broadcast Campaigns',
        content: 'Bulk berichten naar geselecteerde contacten. Targeting: alle contacten, tags, custom selectie, CSV upload. Schedule voor later of verstuur direct.',
        warnings: [
          'Respecteer WhatsApp rate limits',
          'Gebruik alleen voor relevante communicatie',
          'Monitor delivery rates voor list hygiene'
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics & Rapportage',
    icon: BarChart3,
    description: 'Inzichten in prestaties en trends',
    subsections: [
      {
        id: 'dashboard-metrics',
        title: 'Dashboard Metrics',
        content: 'Real-time overzicht van key metrics: totaal gesprekken, gemiddelde response tijd, resolution rate, klanttevredenheid, agent performance. Filters voor datumbereik en team.',
        tips: [
          'Hover over grafieken voor details',
          'Klik op metrics voor drill-down',
          'Export data voor externe analyse'
        ]
      },
      {
        id: 'agent-performance',
        title: 'Agent Performance',
        content: 'Per-agent metrics: afgehandelde gesprekken, response tijd, resolution tijd, customer satisfaction, actieve uren. Vergelijk agents en identificeer coaching opportunities.',
        tips: [
          'Gebruik voor 1-on-1 gesprekken',
          'Identificeer best practices van top performers',
          'Monitor workload balans tussen agents'
        ]
      },
      {
        id: 'ai-analytics',
        title: 'AI Analytics',
        content: 'AI usage en kosten tracking: requests per feature, model breakdown, kosten per dag/week/maand. Budget utilization en alerts. ROI berekening op basis van tijdsbesparing.',
        tips: [
          'Monitor adoption rates per feature',
          'Vergelijk kosten met productiviteitswinst',
          'Optimaliseer model keuze op basis van use case'
        ]
      },
      {
        id: 'reports',
        title: 'Geautomatiseerde Rapporten',
        content: 'Schedule automated reports: dagelijks, wekelijks, maandelijks. Selecteer metrics, format (CSV/Excel/PDF), en ontvangers. Rapporten worden per email verstuurd.',
        steps: [
          'Ga naar Analytics → Reports',
          'Klik op "Schedule Report"',
          'Selecteer frequentie en timing',
          'Kies metrics en format',
          'Voeg email ontvangers toe',
          'Activeer het rapport'
        ]
      }
    ]
  },
  {
    id: 'team',
    title: 'Team Management',
    icon: Users,
    description: 'Beheer je team, rollen en permissies',
    subsections: [
      {
        id: 'roles',
        title: 'Gebruikersrollen',
        content: 'Vier rollen met verschillende permissies: Agent (inbox, messaging, basic analytics), Manager (+ team analytics, automation, broadcasts), Admin (+ billing, AI settings, team management), Owner (alle permissies).',
        tips: [
          'Wijs de minimaal benodigde rol toe',
          'Review rollen periodiek',
          'Document rol-specifieke verantwoordelijkheden'
        ]
      },
      {
        id: 'invites',
        title: 'Teamleden Uitnodigen',
        content: 'Nodig nieuwe teamleden uit via email. Selecteer rol, optioneel: assign to team. Uitnodigingen verlopen na 7 dagen. Track pending invites in Team → Invitations.',
        steps: [
          'Ga naar Settings → Team',
          'Klik op "Invite User"',
          'Vul email en rol in',
          'Optioneel: assign to team',
          'Verstuur uitnodiging'
        ]
      },
      {
        id: 'teams',
        title: 'Teams Configureren',
        content: 'Groepeer agents in teams voor assignment routing. Configureer: naam, leden, assignment mode (round-robin, load-based, skill-based), availability schedule.',
        tips: [
          'Maak teams gebaseerd op specialisatie of tijdzone',
          'Configureer backup teams voor overflow',
          'Monitor team workload in Analytics'
        ]
      }
    ]
  },
  {
    id: 'settings',
    title: 'Instellingen',
    icon: Settings,
    description: 'Configureer je organisatie en persoonlijke voorkeuren',
    subsections: [
      {
        id: 'organization',
        title: 'Organisatie Instellingen',
        content: 'Configureer: bedrijfsnaam, logo, business hours, timezone, default language, chat bubble styling. Alleen beschikbaar voor Admin+ rollen.',
        tips: [
          'Upload logo in vierkant formaat (512x512px)',
          'Kies merkkleur voor consistente branding',
          'Configureer business hours per dag'
        ]
      },
      {
        id: 'notifications',
        title: 'Notificatie Voorkeuren',
        content: 'Persoonlijke notificatie settings: desktop notifications, email digest, sound alerts, mention alerts. Configureer per event type en urgency level.',
        tips: [
          'Balanceer alertheid met focus tijd',
          'Gebruik "Do Not Disturb" tijdens meetings',
          'Email digest voor niet-urgente updates'
        ]
      },
      {
        id: 'security',
        title: 'Beveiliging',
        content: 'Account beveiliging: wachtwoord wijzigen, 2FA inschakelen, active sessions bekijken, login history. Admins: enforce 2FA, password policies, IP whitelisting.',
        tips: [
          'Schakel 2FA in voor alle accounts',
          'Review active sessions regelmatig',
          'Gebruik unieke wachtwoorden'
        ],
        warnings: [
          'Log out van onbekende sessies direct',
          'Meld verdachte activiteit aan je admin'
        ]
      },
      {
        id: 'integrations',
        title: 'Integraties',
        content: 'Configureer externe integraties: WhatsApp Business API, CRM systemen, webhooks, API keys. Elke integratie heeft een status indicator en test functie.',
        tips: [
          'Test webhooks met de built-in simulator',
          'Roteer API keys periodiek',
          'Monitor integratie health in dashboard'
        ]
      },
      {
        id: 'billing',
        title: 'Facturatie',
        content: 'Beheer je subscription: huidig plan, usage, upgrade/downgrade, payment methods, invoices. Alleen beschikbaar voor Admin+ rollen.',
        tips: [
          'Monitor usage om over-charges te voorkomen',
          'Jaarlijkse betaling geeft korting',
          'Download invoices voor boekhouding'
        ]
      }
    ]
  },
  {
    id: 'security-privacy',
    title: 'Beveiliging & Privacy',
    icon: Shield,
    description: 'Hoe we je data beschermen',
    subsections: [
      {
        id: 'data-protection',
        title: 'Data Bescherming',
        content: 'Alle data is versleuteld: in transit (TLS 1.3) en at rest (AES-256). Multi-tenant architectuur zorgt voor strikte data isolatie. Dagelijkse backups met 30 dagen retentie.',
        tips: [
          'Je data wordt nooit gedeeld met andere organisaties',
          'Backups zijn versleuteld en geografisch verspreid',
          'Data kan op verzoek worden verwijderd (GDPR)'
        ]
      },
      {
        id: 'gdpr-compliance',
        title: 'GDPR Compliance',
        content: 'ADSapp is volledig GDPR compliant: data minimalisatie, recht op vergetelheid, data portability, consent management. DPA beschikbaar op aanvraag.',
        tips: [
          'Exporteer klantdata voor DSAR verzoeken',
          'Documenteer consent voor marketing',
          'Review data retention policies'
        ]
      },
      {
        id: 'audit-logging',
        title: 'Audit Logging',
        content: 'Alle user acties worden gelogd: logins, data access, settings wijzigingen, exports. Logs zijn 90 dagen beschikbaar voor compliance en troubleshooting.',
        tips: [
          'Review audit logs bij security incidents',
          'Export logs voor compliance audits',
          'Monitor voor ongebruikelijke patronen'
        ]
      }
    ]
  }
]

export default function UserGuidePage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started')
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSubsection = (id: string) => {
    const newExpanded = new Set(expandedSubsections)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSubsections(newExpanded)
  }

  const filteredSections = guideData.filter(section => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (section.title.toLowerCase().includes(query)) return true
    if (section.description.toLowerCase().includes(query)) return true
    return section.subsections.some(
      sub =>
        sub.title.toLowerCase().includes(query) ||
        sub.content.toLowerCase().includes(query)
    )
  })

  const currentSection = guideData.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center gap-3">
            <BookOpen className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Gebruikershandleiding</h1>
          </div>
          <p className="mb-8 text-xl text-emerald-100">
            Complete handleiding voor alle functies in ADSapp
          </p>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek in de handleiding..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-0 py-4 pl-12 pr-4 text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">Hoofdstukken</h2>
              <nav className="space-y-1">
                {filteredSections.map(section => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </button>
                  )
                })}
              </nav>

              {/* Quick Links */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Snelle Links</h3>
                <div className="space-y-2">
                  <Link
                    href="/dashboard/help"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Help Center
                  </Link>
                  <Link
                    href="/faq"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <FileText className="h-4 w-4" />
                    Publieke FAQ
                  </Link>
                  <a
                    href="mailto:support@adsapp.nl"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentSection && (
              <div>
                {/* Section Header */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-3">
                    {(() => {
                      const Icon = currentSection.icon
                      return <Icon className="h-8 w-8 text-emerald-600" />
                    })()}
                    <h2 className="text-3xl font-bold text-gray-900">{currentSection.title}</h2>
                  </div>
                  <p className="text-lg text-gray-600">{currentSection.description}</p>
                </div>

                {/* Subsections */}
                <div className="space-y-4">
                  {currentSection.subsections.map(subsection => {
                    const isExpanded = expandedSubsections.has(subsection.id)
                    return (
                      <div
                        key={subsection.id}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                      >
                        <button
                          onClick={() => toggleSubsection(subsection.id)}
                          className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50"
                        >
                          <h3 className="text-xl font-semibold text-gray-900">
                            {subsection.title}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 p-6">
                            {/* Main Content */}
                            <p className="mb-6 leading-relaxed text-gray-700">
                              {subsection.content}
                            </p>

                            {/* Steps */}
                            {subsection.steps && subsection.steps.length > 0 && (
                              <div className="mb-6">
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  Stappen
                                </h4>
                                <ol className="ml-6 list-decimal space-y-2 text-gray-700">
                                  {subsection.steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {/* Tips */}
                            {subsection.tips && subsection.tips.length > 0 && (
                              <div className="mb-6 rounded-lg bg-emerald-50 p-4">
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-800">
                                  <Sparkles className="h-4 w-4" />
                                  Tips
                                </h4>
                                <ul className="space-y-2">
                                  {subsection.tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
                                      <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Warnings */}
                            {subsection.warnings && subsection.warnings.length > 0 && (
                              <div className="mb-6 rounded-lg bg-amber-50 p-4">
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
                                  <AlertTriangle className="h-4 w-4" />
                                  Let op
                                </h4>
                                <ul className="space-y-2">
                                  {subsection.warnings.map((warning, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                                      <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Shortcuts */}
                            {subsection.shortcuts && subsection.shortcuts.length > 0 && (
                              <div className="rounded-lg bg-gray-100 p-4">
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                  <Key className="h-4 w-4" />
                                  Sneltoetsen
                                </h4>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {subsection.shortcuts.map((shortcut, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <kbd className="rounded bg-white px-2 py-1 text-xs font-mono text-gray-800 shadow">
                                        {shortcut.key}
                                      </kbd>
                                      <span className="text-sm text-gray-600">{shortcut.action}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Navigation */}
                <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
                  {(() => {
                    const currentIndex = guideData.findIndex(s => s.id === activeSection)
                    const prevSection = currentIndex > 0 ? guideData[currentIndex - 1] : null
                    const nextSection = currentIndex < guideData.length - 1 ? guideData[currentIndex + 1] : null

                    return (
                      <>
                        {prevSection ? (
                          <button
                            onClick={() => setActiveSection(prevSection.id)}
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                          >
                            <ArrowRight className="h-4 w-4 rotate-180" />
                            {prevSection.title}
                          </button>
                        ) : (
                          <div />
                        )}
                        {nextSection && (
                          <button
                            onClick={() => setActiveSection(nextSection.id)}
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                          >
                            {nextSection.title}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Nog vragen?
          </h2>
          <p className="mb-8 text-gray-600">
            Ons support team staat klaar om je te helpen
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard/help"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageSquare className="h-5 w-5" />
              Help Center
            </Link>
            <a
              href="mailto:support@adsapp.nl"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-emerald-600 px-6 py-3 font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              <Mail className="h-5 w-5" />
              Email Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
