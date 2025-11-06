'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageSquare,
  BarChart3,
  Users,
  Bell,
  Shield,
  Sparkles,
  DollarSign,
  Filter,
} from 'lucide-react'

type UserRole = 'agent' | 'manager' | 'admin' | 'super_admin'

interface FAQItem {
  id: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  question: string
  answer: string
  roles: UserRole[] // Which roles can see this FAQ item
  tags: string[]
}

const faqData: FAQItem[] = [
  // INBOX & MESSAGING (All roles)
  {
    id: 'inbox-1',
    category: 'Inbox & Berichten',
    icon: MessageSquare,
    question: 'Hoe verstuur ik een bericht naar een contact?',
    answer:
      'Selecteer een conversatie in de linker sidebar, of klik op &quot;Nieuw Bericht&quot; rechtsboven. Type je bericht in het tekstveld onderaan en klik op de verzend-knop of druk op Enter. Je kunt ook bijlagen toevoegen met het paperclip-icoon.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['inbox', 'messaging', 'basics'],
  },
  {
    id: 'inbox-2',
    category: 'Inbox & Berichten',
    icon: MessageSquare,
    question: 'Hoe gebruik ik AI Draft Suggestions?',
    answer:
      'Klik op het Sparkles-icoon (✨) in het message input veld. Het systeem genereert automatisch 3 antwoordopties in verschillende tonen (professioneel, vriendelijk, empathisch). Klik op een suggestie om deze over te nemen, of pas aan naar wens. De AI analyseert de volledige conversatie-context voor relevante antwoorden.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['ai', 'drafts', 'suggestions'],
  },
  {
    id: 'inbox-3',
    category: 'Inbox & Berichten',
    icon: MessageSquare,
    question: 'Wat betekenen de sentiment badges?',
    answer:
      'Sentiment badges tonen de emotionele toon van conversaties: 😊 Positief (tevreden klant), 😐 Neutraal (informatief), 😠 Negatief (ontevreden), 🤔 Gemengd. Urgency levels (Laag/Medium/Hoog/Kritiek) geven prioriteit aan. Gebruik deze voor proactieve escalatie van kritieke gesprekken.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['ai', 'sentiment', 'priority'],
  },
  {
    id: 'inbox-4',
    category: 'Inbox & Berichten',
    icon: MessageSquare,
    question: 'Hoe maak ik een conversatie-samenvatting?',
    answer:
      'Klik op &quot;Summarize&quot; in de conversation header (rechtsboven). Het systeem genereert automatisch: executive summary, key points, next steps, resolved issues, open questions, en gespreksstatistieken. Perfect voor overdracht aan collega\'s of management rapportage.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['ai', 'summary', 'reporting'],
  },
  {
    id: 'inbox-5',
    category: 'Inbox & Berichten',
    icon: MessageSquare,
    question: 'Kan ik berichten taggen of labelen?',
    answer:
      'Ja, gebruik de tag selector in het message detail panel. Standaard tags: vraag, klacht, compliment, sales, support. Admins kunnen custom tags toevoegen in Settings → Tags. Tags zijn doorzoekbaar en helpen bij analytics.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['inbox', 'tags', 'organization'],
  },

  // CONTACTS (All roles, some manager+)
  {
    id: 'contacts-1',
    category: 'Contacten',
    icon: Users,
    question: 'Hoe voeg ik handmatig contacten toe?',
    answer:
      'Ga naar Contacten → Nieuw Contact. Vul minimaal telefoonnummer in (internationaal formaat: +31612345678). Optioneel: naam, email, bedrijf, notities, custom velden. Contacten worden ook automatisch aangemaakt bij binnenkomende berichten.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['contacts', 'crud'],
  },
  {
    id: 'contacts-2',
    category: 'Contacten',
    icon: Users,
    question: 'Kan ik contacten importeren vanuit CSV/Excel?',
    answer:
      'Ja (Manager+ rol). Ga naar Contacten → Import. Upload CSV met kolommen: phone (verplicht), name, email, company, notes. Het systeem valideert telefoonnummers automatisch en dupliceert niet. Max 10.000 contacten per import.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['contacts', 'import', 'bulk'],
  },
  {
    id: 'contacts-3',
    category: 'Contacten',
    icon: Users,
    question: 'Hoe segmenteer ik contacten voor gerichte campaigns?',
    answer:
      'Gebruik filters (Manager+ rol): Tags, custom velden, conversatie-geschiedenis, sentiment score, laatste interactie datum. Sla filters op als segments voor hergebruik. Exporteer geselecteerde contacten of start broadcast direct vanuit segment.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['contacts', 'segmentation', 'campaigns'],
  },

  // AUTOMATION (Manager+)
  {
    id: 'automation-1',
    category: 'Automation',
    icon: Bell,
    question: 'Hoe stel ik auto-replies in?',
    answer:
      'Ga naar Automation → Auto-Replies (Manager+ rol). Klik op &quot;Nieuwe Regel&quot;. Definieer trigger (keywords, tijd, sentiment), conditie (businesshours, contact tags), en actie (stuur template, tag conversatie, assign agent, escaleer). Test regel met simulator voordat je activeert.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['automation', 'auto-reply', 'setup'],
  },
  {
    id: 'automation-2',
    category: 'Automation',
    icon: Bell,
    question: 'Wat is de escalatie flow?',
    answer:
      'Escalatie regels monitoren real-time voor triggers: negatief sentiment, keywords (&quot;manager&quot;, &quot;klacht&quot;), urgency level, response tijd. Bij trigger: notificeer manager, auto-assign naar senior agent, tag conversatie, log escalatie. Configureer in Automation → Escalatie.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['automation', 'escalation', 'workflows'],
  },
  {
    id: 'automation-3',
    category: 'Automation',
    icon: Bell,
    question: 'Kan ik out-of-office berichten instellen?',
    answer:
      'Ja. Automation → Business Hours → Out of Office. Stel actieve tijden in (bijv. ma-vr 9-17u), selecteer auto-reply template voor buiten kantooruren. Optioneel: verschillende templates voor weekend vs avond, urgency-based doorschakeling naar on-call agent.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['automation', 'business-hours', 'ooo'],
  },

  // ANALYTICS (Manager+, detailed for Admin+)
  {
    id: 'analytics-1',
    category: 'Analytics',
    icon: BarChart3,
    question: 'Welke metrics zie ik in het dashboard?',
    answer:
      'Manager rol: eigen team metrics (response tijd, resolution rate, conversatie volume, sentiment trends). Admin rol: organisatie-breed (alle agents, teams, channels, kosten). Key metrics: First Response Time, Resolution Time, Customer Satisfaction, Message Volume, Agent Performance.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['analytics', 'metrics', 'kpi'],
  },
  {
    id: 'analytics-2',
    category: 'Analytics',
    icon: BarChart3,
    question: 'Hoe exporteer ik rapporten?',
    answer:
      'Analytics → Export (rechtsboven). Kies periode (vandaag/week/maand/custom), metrics, format (CSV/Excel/PDF). Automated reports: Admin → Reports → Schedule, kies frequentie (dagelijks/wekelijks/maandelijks) en email ontvangers. Rapporten worden automatisch verstuurd.',
    roles: ['manager', 'admin', 'super_admin'],
    tags: ['analytics', 'export', 'reports'],
  },
  {
    id: 'analytics-3',
    category: 'Analytics',
    icon: BarChart3,
    question: 'Wat betekent de AI Cost Tracking grafiek?',
    answer:
      'AI Analytics → Kosten (Admin+ rol). Toont: totale AI costs per dag/week/maand, breakdown per feature (drafts/sentiment/summaries), per model (Claude Opus/Sonnet/Haiku), per agent. Budget alerts waarschuwen bij 80% en 100% van maandbudget. Gebruik voor ROI berekening en cost optimization.',
    roles: ['admin', 'super_admin'],
    tags: ['analytics', 'ai', 'costs', 'budget'],
  },

  // AI SETTINGS (Admin+)
  {
    id: 'ai-settings-1',
    category: 'AI Instellingen',
    icon: Sparkles,
    question: 'Hoe schakel ik specifieke AI features in/uit?',
    answer:
      'Settings → AI (Admin+ rol). Toggle switches voor: Draft Suggestions, Auto-Response, Sentiment Analysis, Summarization, Template Suggestions. Wijzigingen zijn instant actief voor alle agents. Monitoring: check AI Analytics voor adoption rates per feature.',
    roles: ['admin', 'super_admin'],
    tags: ['ai', 'settings', 'features'],
  },
  {
    id: 'ai-settings-2',
    category: 'AI Instellingen',
    icon: Sparkles,
    question: 'Welk AI model moet ik kiezen?',
    answer:
      'Claude Opus: Hoogste kwaliteit, complexe taken, €15/M tokens. Claude Sonnet (recommended): Balans kwaliteit/snelheid/kosten, €3/M tokens. Claude Haiku: Snelste, simpele taken, €0.25/M tokens. Default: Sonnet. Test verschillende models in AI Settings → Model Preferences om kosten vs kwaliteit te optimaliseren.',
    roles: ['admin', 'super_admin'],
    tags: ['ai', 'models', 'costs'],
  },
  {
    id: 'ai-settings-3',
    category: 'AI Instellingen',
    icon: Sparkles,
    question: 'Hoe stel ik een AI budget in?',
    answer:
      'Settings → AI → Budget Management (Admin rol). Stel monthly budget in (€ per maand). Configureer alerts: 80% = waarschuwing, 100% = stop AI features (optioneel). Real-time tracking in AI Analytics. Budget resets automatisch elke maand. Historische data blijft beschikbaar voor trends.',
    roles: ['admin', 'super_admin'],
    tags: ['ai', 'budget', 'cost-control'],
  },

  // TEAM MANAGEMENT (Admin+)
  {
    id: 'team-1',
    category: 'Team Management',
    icon: Users,
    question: 'Hoe voeg ik nieuwe teamleden toe?',
    answer:
      'Settings → Team → Invite User (Admin+ rol). Vul email in, selecteer rol (Agent/Manager/Admin), optioneel: assign naar team. User ontvangt invite email met onboarding link. Acceptatie binnen 7 dagen vereist, anders verloopt invite. Track pending invites in Team → Invitations.',
    roles: ['admin', 'super_admin'],
    tags: ['team', 'users', 'invites'],
  },
  {
    id: 'team-2',
    category: 'Team Management',
    icon: Users,
    question: 'Wat is het verschil tussen Agent, Manager en Admin rollen?',
    answer:
      'Agent: Inbox, contacten, messaging, basic analytics (eigen performance). Manager: + team analytics, automation, broadcasts, contact import/export. Admin: + billing, AI settings, team management, organisatie instellingen. Super Admin: + cross-tenant access, system configuration.',
    roles: ['admin', 'super_admin'],
    tags: ['team', 'roles', 'permissions'],
  },
  {
    id: 'team-3',
    category: 'Team Management',
    icon: Users,
    question: 'Hoe configureer ik teams voor round-robin assignment?',
    answer:
      'Settings → Teams → Create Team (Admin rol). Voeg agents toe, selecteer assignment mode: Round-robin (eerlijk verdeeld), Load-based (minste open conversations), Skill-based (match tags). Configureer availability schedule per agent. Test assignment met simulator.',
    roles: ['admin', 'super_admin'],
    tags: ['team', 'assignment', 'routing'],
  },

  // BILLING (Admin+)
  {
    id: 'billing-1',
    category: 'Billing & Subscription',
    icon: DollarSign,
    question: 'Hoe upgrade ik mijn plan?',
    answer:
      'Settings → Billing → Change Plan (Admin+ rol). Vergelijk plannen: Starter (€49/maand, 3 users), Growth (€149/maand, 10 users), Business (€399/maand, 25 users), Enterprise (custom). Upgrade instant actief, pro-rata berekening. Downgrade ingangsdatum volgend facturatie-cycle.',
    roles: ['admin', 'super_admin'],
    tags: ['billing', 'subscription', 'plans'],
  },
  {
    id: 'billing-2',
    category: 'Billing & Subscription',
    icon: DollarSign,
    question: 'Wat zijn de AI kosten bovenop mijn subscription?',
    answer:
      'AI features hebben usage-based pricing bovenop je subscription: Drafts €0.01/request, Sentiment €0.005/analysis, Summaries €0.02/summary. Gemiddeld €50-200/maand voor 10 agents bij normaal gebruik. Exact tracking in AI Analytics. Maandbudget configureerbaar om overschrijding te voorkomen.',
    roles: ['admin', 'super_admin'],
    tags: ['billing', 'ai', 'costs'],
  },

  // SECURITY (Admin+)
  {
    id: 'security-1',
    category: 'Beveiliging & Privacy',
    icon: Shield,
    question: 'Hoe werkt multi-factor authentication (MFA)?',
    answer:
      'Settings → Security → Enable MFA (alle rollen). Scan QR code met authenticator app (Google Authenticator, Authy). Voer 6-digit code in bij login. Backup codes downloaden voor noodgeval. Admin kan MFA verplichten voor alle users: Settings → Security → Enforce MFA.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['security', 'mfa', '2fa'],
  },
  {
    id: 'security-2',
    category: 'Beveiliging & Privacy',
    icon: Shield,
    question: 'Waar worden mijn gegevens opgeslagen?',
    answer:
      'Data opslag: EU (AWS Frankfurt) voor GDPR compliance. End-to-end encryptie voor berichten in transit (TLS 1.3). Data at rest: AES-256 encryptie. WhatsApp media: tijdelijk cached (24u), daarna verwijderd. Backup: dagelijks, 30 dagen retentie. Data export: Settings → Privacy → Download Data.',
    roles: ['admin', 'super_admin'],
    tags: ['security', 'privacy', 'gdpr'],
  },

  // TROUBLESHOOTING (All roles)
  {
    id: 'trouble-1',
    category: 'Probleemoplossing',
    icon: HelpCircle,
    question: 'Berichten worden niet verzonden, wat te doen?',
    answer:
      'Check: 1) WhatsApp Business nummer actief? (Settings → WhatsApp). 2) Geen rate limit bereikt? (max 1000 berichten/24u per nummer). 3) Contact heeft je niet geblokkeerd? 4) Telefoonnummer correct formaat? (+31612345678). Persistent probleem: contact support met conversatie ID.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['troubleshooting', 'messaging', 'errors'],
  },
  {
    id: 'trouble-2',
    category: 'Probleemoplossing',
    icon: HelpCircle,
    question: 'AI Draft Suggestions laden niet, waarom?',
    answer:
      'Mogelijke oorzaken: 1) AI feature uitgeschakeld (Admin: check Settings → AI). 2) Budget limiet bereikt (Admin: check AI Analytics → Budget). 3) Conversatie te kort (min 2 berichten nodig). 4) API rate limit (max 60 requests/min). Wait 1 minuut en probeer opnieuw. Persistent: check Status Page.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['troubleshooting', 'ai', 'errors'],
  },
  {
    id: 'trouble-3',
    category: 'Probleemoplossing',
    icon: HelpCircle,
    question: 'Dashboard laadt traag, hoe optimaliseer ik?',
    answer:
      'Tips: 1) Filter conversaties op datum (default: laatste 7 dagen). 2) Disable real-time updates tijdelijk (toggle in header). 3) Clear browser cache (Ctrl+Shift+Del). 4) Check internet snelheid (min 5 Mbps). 5) Browser up-to-date? (Chrome/Firefox/Safari recommended). Contact support bij aanhoudende issues.',
    roles: ['agent', 'manager', 'admin', 'super_admin'],
    tags: ['troubleshooting', 'performance', 'optimization'],
  },
]

const categories = [
  'Alle Categorieën',
  'Inbox & Berichten',
  'Contacten',
  'Automation',
  'Analytics',
  'AI Instellingen',
  'Team Management',
  'Billing & Subscription',
  'Beveiliging & Privacy',
  'Probleemoplossing',
]

export default function HelpCenter() {
  const [userRole, setUserRole] = useState<UserRole>('agent')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState('Alle Categorieën')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role) {
        setUserRole(profile.role as UserRole)
      }
    } catch (err) {
      console.error('Load user role error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id)
    } else {
      newOpenItems.add(id)
    }
    setOpenItems(newOpenItems)
  }

  const filteredFAQs = faqData.filter(item => {
    // Role-based filtering
    if (!item.roles.includes(userRole)) return false

    // Category filtering
    if (selectedCategory !== 'Alle Categorieën' && item.category !== selectedCategory) {
      return false
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.includes(query))
      )
    }

    return true
  })

  const groupedFAQs = filteredFAQs.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, FAQItem[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-3">
            <HelpCircle className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Help Center</h1>
          </div>
          <p className="mb-8 text-xl text-blue-100">
            Uitgebreide handleiding voor alle functies in je dashboard
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek in help artikelen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-0 py-4 pl-12 pr-4 text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Role Badge */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">
              Je rol:{' '}
              <span className="font-semibold capitalize">
                {userRole === 'super_admin' ? 'Super Admin' : userRole}
              </span>
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {filteredFAQs.length} artikelen beschikbaar
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Categorie:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        {Object.keys(groupedFAQs).length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <HelpCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg text-gray-600">
              Geen help artikelen gevonden voor je zoekopdracht.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('Alle Categorieën')
              }}
              className="mt-4 text-blue-600 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedFAQs).map(([category, items]) => {
              const Icon = items[0]?.icon
              return (
                <div key={category}>
                  <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-gray-900">
                    {Icon && <Icon className="h-6 w-6 text-blue-600" />}
                    {category}
                  </h2>
                <div className="space-y-3">
                  {items.map(item => {
                    const isOpen = openItems.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                        >
                          <span className="pr-8 text-lg font-medium text-gray-900">
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-100 bg-gray-50 p-5">
                            <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <h3 className="mb-2 text-xl font-bold text-gray-900">
            Niet gevonden wat je zocht?
          </h3>
          <p className="mb-6 text-gray-700">
            Ons support team staat klaar om je te helpen met je vraag.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@adsapp.nl"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <MessageSquare className="h-5 w-5" />
              Email Support
            </a>
            <a
              href="/faq/ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-blue-600 px-6 py-3 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <HelpCircle className="h-5 w-5" />
              Publieke FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
