'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Sparkles, Clock, TrendingUp, Shield } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    category: 'Aan de Slag',
    question: 'Hoe activeer ik AI features in mijn account?',
    answer:
      'AI features zijn beschikbaar op alle paid plannen en worden automatisch geactiveerd na het upgraden. Ga naar Dashboard → Instellingen → AI om individuele features in of uit te schakelen. U kunt ook het AI model, budget en andere parameters configureren vanuit deze pagina.',
  },
  {
    category: 'Aan de Slag',
    question: 'Hoeveel tijd kan ik besparen met AI features?',
    answer:
      'Gemiddeld bespaart u 75% tijd op het opstellen van antwoorden met AI Draft Suggestions (van 2 minuten naar 30 seconden per bericht). Met automatische samenvattingen bespaart u 5-10 minuten per agent handoff. Sentiment analyse voorkomt 40% van escalaties, wat 15-20 minuten per incident bespaart. Totaal: 2-4 uur per agent per dag.',
  },
  {
    category: 'Aan de Slag',
    question: 'Is er een limiet aan AI verzoeken?',
    answer:
      'Er is geen harde limiet aan AI verzoeken, maar u kunt zelf een maandelijks budget instellen voor kostenbeheer. U ontvangt automatisch waarschuwingen wanneer u 80% (configureerbaar) van uw budget bereikt. De kosten per verzoek varieert tussen $0.001 - $0.05 afhankelijk van het gekozen model en complexiteit.',
  },
  {
    category: 'Aan de Slag',
    question: 'Werken AI features in alle talen?',
    answer:
      'Ja, onze AI models ondersteunen 95+ talen inclusief Nederlands, Engels, Frans, Duits, Spaans en meer. De AI herkent automatisch de taal van de conversatie en genereert antwoorden in dezelfde taal. Voor Nederlands hebben we speciale optimalisatie voor formele en informele toonzetting ("u" vs "je").',
  },

  // AI Draft Suggestions
  {
    category: 'AI Draft Suggestions',
    question: 'Hoe werken de AI Draft Suggestions precies?',
    answer:
      'Wanneer u een conversatie opent, kunt u op het Sparkles (✨) icoon klikken naast het berichtveld. De AI analyseert de volledige conversatie geschiedenis (laatste 50 berichten) en genereert binnen 2-3 seconden drie antwoord opties in verschillende tonen: Professional (formeel en zakelijk), Friendly (warm en persoonlijk) en Empathetic (begripvol en ondersteunend). Elke suggestie bevat een confidence score en reasoning.',
  },
  {
    category: 'AI Draft Suggestions',
    question: 'Kan ik de AI suggesties aanpassen voordat ik verstuur?',
    answer:
      'Absoluut! De suggesties zijn bedoeld als startpunt. U kunt met één klik een suggestie invoegen in het berichtveld en deze vervolgens naar wens bewerken. U kunt ook meerdere suggesties combineren of alleen delen gebruiken. De AI leert van uw acceptatie/wijziging patterns om steeds beter te worden.',
  },
  {
    category: 'AI Draft Suggestions',
    question: 'Welke informatie gebruikt de AI voor suggesties?',
    answer:
      'De AI analyseert: (1) Volledige conversatie geschiedenis inclusief timestamps, (2) Contact informatie en eerdere interacties, (3) Huidige sentiment en urgentie level, (4) Uw organisatie tone of voice instellingen, (5) Eerdere geaccepteerde suggesties als training data. De AI heeft GEEN toegang tot andere conversaties of organisaties - volledige privacy garantie.',
  },
  {
    category: 'AI Draft Suggestions',
    question: 'Hoeveel sneller ben ik met Draft Suggestions?',
    answer:
      'Benchmark data: Zonder AI duurt een gemiddeld antwoord 2-3 minuten (lezen conversatie, bedenken antwoord, typen, corrigeren). Met AI Draft Suggestions: 30-45 seconden (1 klik genereren, selecteer beste optie, optioneel aanpassen, versturen). Dit is 75% tijdbesparing. Bij 50 berichten per dag = 100+ minuten bespaard = 1.5+ uur per agent per dag.',
  },
  {
    category: 'AI Draft Suggestions',
    question: 'Wat betekent de Confidence Score?',
    answer:
      'De confidence score (0-100%) geeft aan hoe zeker de AI is dat deze suggestie passend is. Score > 80% = hoge zekerheid (meestal direct te gebruiken), 60-80% = goede suggestie (check even), < 60% = lage zekerheid (aanpassen aanbevolen). De score is gebaseerd op context volledigheid, sentiment match, tone consistency en historische acceptatie rates.',
  },

  // Sentiment Analysis
  {
    category: 'Sentiment Analyse',
    question: 'Hoe werkt de real-time Sentiment Analysis?',
    answer:
      'Elk inkomend WhatsApp bericht wordt automatisch geanalyseerd op emotie en urgentie. De AI detecteert: Positief (😊), Neutraal (😐), Negatief (😠) of Mixed (😕) sentiment met een score van -1.0 (zeer negatief) tot +1.0 (zeer positief). Daarnaast krijgt elk bericht een urgentie level: Low, Medium, High of Critical. Deze badges verschijnen direct in de inbox zodat u prioriteit kunt stellen.',
  },
  {
    category: 'Sentiment Analyse',
    question: 'Wat gebeurt er bij negatief sentiment?',
    answer:
      'Bij negatief sentiment (score < -0.5) OF critical urgency gebeurt het volgende automatisch: (1) Conversatie krijgt visuele warning badge met pulse animatie, (2) Optioneel: Push notificatie naar supervisor (configureerbaar in Automation Rules), (3) Conversatie wordt hoger geprioriteerd in inbox sorting, (4) Suggested response tone wordt automatisch ingesteld op "Empathetic". U kunt auto-escalatie regels instellen voor immediate supervisor involvement.',
  },
  {
    category: 'Sentiment Analyse',
    question: 'Hoe accuraat is de sentiment detectie?',
    answer:
      'Onze AI bereikt 92% accuracy op Nederlandse tekst en 94% op Engelse tekst (benchmark tegen menselijke annotators). De AI herkent: directe emoties ("Ik ben boos"), impliciete emoties (sarcasme, frustratie), emoji context, hoofdlettergebruik (SCHREEUWEN), interpunctie (!!!, ???) en culturele nuances. Bij twijfel kiest de AI voor "Mixed" sentiment om false positives te vermijden.',
  },
  {
    category: 'Sentiment Analyse',
    question: 'Kan sentiment analyse escalaties voorkomen?',
    answer:
      'Ja, benchmark data toont 40% reductie in escalaties met sentiment tracking. Reden: u ziet frustratie al in vroeg stadium (score -0.3 tot -0.5) en kunt proactief reageren met empathie voordat het escaleert naar -0.8 of lager. Bij 10 escalaties/week (elk 15-20 min supervisor tijd) = 4 escalaties voorkomen = 60-80 minuten bespaard per week = 4-5 uur per maand.',
  },

  // Conversation Summaries
  {
    category: 'Conversatie Samenvattingen',
    question: 'Wanneer moet ik een samenvatting genereren?',
    answer:
      'Gebruik samenvattingen bij: (1) Agent handoff - nieuwe agent neemt conversatie over, (2) Complexe cases - veel berichten met technische details, (3) Follow-ups - klant belt na dagen terug, (4) Management rapportage - executive summary nodig, (5) Training - voorbeelden voor nieuwe medewerkers. Tip: genereer samenvatting VOORDAT u conversatie sluit voor complete documentatie.',
  },
  {
    category: 'Conversatie Samenvattingen',
    question: 'Wat staat er in een AI samenvatting?',
    answer:
      'Elke samenvatting bevat: (1) Executive Summary - 2-3 zinnen kern van gesprek, (2) Key Points - bullet list van belangrijkste informatie (contactgegevens, order numbers, specifieke verzoeken), (3) Resolved Issues - wat is opgelost tijdens gesprek, (4) Next Steps - concrete acties die ondernomen moeten worden, (5) Open Questions - wat is nog niet beantwoord/afgehandeld, (6) Statistics - aantal berichten, duur, sentiment trend.',
  },
  {
    category: 'Conversatie Samenvattingen',
    question: 'Hoeveel tijd bespaart een samenvatting?',
    answer:
      'Bij agent handoff: zonder samenvatting moet nieuwe agent 5-10 minuten conversatie doorlezen en begrijpen. Met AI samenvatting: 30 seconden lezen en direct contextueel kunnen reageren. Besparing: 4.5-9.5 minuten per handoff. Bij 5 handoffs/dag = 22-48 minuten bespaard. Bij teams met veel part-timers of shifts: 2-3 uur bespaard per dag per team.',
  },
  {
    category: 'Conversatie Samenvattingen',
    question: 'Kan ik samenvattingen exporteren?',
    answer:
      'Ja, elke samenvatting heeft een "Copy" knop voor clipboard. Format is Markdown dus perfect te plakken in: Notion, Confluence, Slack, Teams, Google Docs, of uw CRM systeem. De samenvatting bevat ook metadata (conversatie ID, datum, betrokken agents) voor traceability. Pro tip: gebruik samenvattingen in weekly team meetings voor trend analyse en best practices.',
  },

  // Cost & Analytics
  {
    category: 'Kosten & Analytics',
    question: 'Hoeveel kosten de AI features?',
    answer:
      'AI kosten zijn usage-based bovenop uw plan. Gemiddelde kosten per model: Claude 3.5 Sonnet (aanbevolen): $0.003-0.015 per verzoek, Claude 3 Haiku (budget): $0.001-0.004 per verzoek, GPT-4 Turbo: $0.01-0.05 per verzoek. Gemiddelde klant (50 berichten/dag met AI): €25-45/maand AI kosten. ROI: 2-4 uur tijdbesparing/agent/dag = €160-320/maand besparing bij €40/uur = 4-12x return on investment.',
  },
  {
    category: 'Kosten & Analytics',
    question: 'Hoe stel ik een AI budget in?',
    answer:
      'Ga naar Dashboard → Instellingen → AI → Budget Beheer. Stel uw maandelijks budget in (bijv. €50). Kies alert threshold (bijv. 80% = waarschuwing bij €40). U ontvangt email + dashboard notificatie bij threshold. Bij 100% budget: AI features blijven werken maar u krijgt dagelijkse overschrijding emails. U kunt ook per-feature budgets instellen en automatische AI-stop bij limiet configureren (enterprise only).',
  },
  {
    category: 'Kosten & Analytics',
    question: 'Welke analytics zijn beschikbaar?',
    answer:
      'Dashboard → Analytics → AI toont: (1) Usage Metrics - totaal verzoeken per dag/week/maand met trends, (2) Cost Breakdown - kosten per feature (drafts vs sentiment vs summaries), kosten per model, kosten per agent, (3) Performance Metrics - avg latency, acceptance rate per tone, popular draft types, (4) Model Distribution - welke AI models worden gebruikt en waarom, (5) Budget Status - real-time spend vs budget met forecast. Export naar CSV beschikbaar.',
  },
  {
    category: 'Kosten & Analytics',
    question: 'Hoe optimaliseer ik mijn AI kosten?',
    answer:
      'Kosten optimalisatie tips: (1) Gebruik Claude 3 Haiku voor eenvoudige vragen (-70% kosten, minimale kwaliteit verlies), (2) Reserveer Claude 3.5 Sonnet voor complexe cases (+50% accuracy, 3x kosten), (3) Disable auto-response voor low-value contacten, (4) Set draft suggestions op "on-demand" ipv "auto-generate", (5) Gebruik 7-day analytics retention ipv 90-day (-40% storage kosten). Gemiddelde besparing met optimalisatie: 30-50%.',
  },

  // Advanced Features
  {
    category: 'Geavanceerde Features',
    question: 'Kan ik AI gebruiken voor automatische antwoorden?',
    answer:
      'Ja, via Auto-Response feature (Instellingen → AI → Auto-Response). Configureer: (1) Wanneer - buiten kantooruren, bij hoog volume, specifieke keywords, (2) Voorwaarden - alleen bij confidence > 85%, max 1 auto-reply per conversatie, exclude VIP contacts, (3) Safety - require manager approval, human-in-the-loop voor sentiment < 0, (4) Templates - gebruik AI templates of eigen templates. Perfect voor: FAQ responses, order status updates, after-hours coverage.',
  },
  {
    category: 'Geavanceerde Features',
    question: 'Werkt AI met mijn bestaande templates?',
    answer:
      'Ja, volledige integratie. U kunt: (1) Template variabelen laten vullen door AI ({{customer_name}}, {{order_id}}), (2) AI suggesties baseren op templates (AI leert van uw templates), (3) Templates dynamisch aanpassen met AI (personalisatie per klant), (4) Nieuwe templates genereren door AI (gebaseerd op succesvolle berichten). De AI respecteert uw template structuur maar maakt ze persoonlijker en context-specifiek.',
  },
  {
    category: 'Geavanceerde Features',
    question: 'Kan ik verschillende AI modellen per use case gebruiken?',
    answer:
      'Ja, via Model Routing (Instellingen → AI → Geavanceerd). Configureer: Draft Suggestions = Claude 3.5 Sonnet (beste kwaliteit), Sentiment = Claude 3 Haiku (snel + goedkoop), Summaries = Claude 3.5 Sonnet (accurate samenvatting), Auto-response = GPT-3.5 Turbo (supersnel). Of gebruik Smart Routing: AI kiest automatisch model op basis van complexity score. Simple questions → Haiku, complex issues → Sonnet.',
  },
  {
    category: 'Geavanceerde Features',
    question: 'Is er API toegang tot AI features?',
    answer:
      'Ja, volledige REST API beschikbaar op Enterprise plan. Endpoints: POST /api/ai/drafts (genereer suggesties), POST /api/ai/sentiment (analyseer tekst), POST /api/ai/summarize (genereer samenvatting), GET /api/ai/usage (analytics). Rate limits: 1000 requests/min. Gebruik cases: eigen UI, externe integraties, bulk processing, custom workflows. Documentatie: docs.adsapp.nl/api/ai',
  },

  // Security & Privacy
  {
    category: 'Beveiliging & Privacy',
    question: 'Is mijn conversatie data veilig bij AI verwerking?',
    answer:
      'Absolute prioriteit op privacy. Onze garanties: (1) Data wordt NIET gebruikt voor training van basis AI models, (2) Conversaties worden NIET gedeeld tussen organisaties, (3) Verwerking gebeurt in EU data centers (Amsterdam + Frankfurt), (4) Zero data retention - berichten worden direct na verwerking verwijderd, (5) End-to-end encryption tijdens transport, (6) GDPR compliant met volledige audit trail. U behoudt volledige data ownership.',
  },
  {
    category: 'Beveiliging & Privacy',
    question: 'Welke data heeft de AI toegang tot?',
    answer:
      'De AI heeft ALLEEN toegang tot: (1) Conversatie waarin u AI gebruikt - laatste 50 berichten, (2) Contact metadata van die specifieke klant (naam, taal), (3) Uw organisatie tone of voice instellingen, (4) Historical acceptance rates (geanonimiseerd). De AI heeft GEEN toegang tot: andere conversaties, andere organisaties, personal data van agents, financiële informatie, of data van andere features (analytics, billing).',
  },
  {
    category: 'Beveiliging & Privacy',
    question: 'Mag ik AI gebruiken voor gevoelige informatie?',
    answer:
      'Voor medische, financiële of juridische informatie adviseren wij: (1) Disable auto-response - gebruik AI alleen als suggestion tool, (2) Enable human-review - elke AI response moet worden goedgekeurd, (3) Configure data masking - automatisch mask email, telefoon, BSN, credit card, (4) Use private cloud deployment (enterprise) - AI draait on-premise, (5) Enable audit logging - log alle AI interacties voor compliance. Consulteer uw juridisch team voor specifieke requirements.',
  },
  {
    category: 'Beveiliging & Privacy',
    question: 'Kan ik AI uitschakelen voor specifieke contacten?',
    answer:
      'Ja, meerdere opties: (1) Contact level - tag contacten als "No AI" in contact details, (2) Conversation level - disable AI voor specifieke conversatie via toggle in header, (3) VIP contacten - automatically disable AI voor contacts met "VIP" tag, (4) Regex patterns - disable AI voor berichten met keywords (CONFIDENTIAL, PRIVÉ, etc.), (5) Manual control - AI features zijn altijd opt-in, nooit automatisch actief zonder user action.',
  },

  // Troubleshooting
  {
    category: 'Probleemoplossing',
    question: 'AI suggesties zijn niet relevant - wat kan ik doen?',
    answer:
      'Troubleshooting stappen: (1) Check of AI genoeg context heeft - min 3-5 berichten in conversatie, (2) Verifieer tone of voice instellingen - mogelijk verkeerde tone geselecteerd, (3) Check language detection - forceer Nederlands als AI verkeerde taal detecteert, (4) Review conversation history - verwijder irrelevante oude berichten, (5) Probeer ander AI model - Claude 3.5 Sonnet is accurater dan Haiku. Als probleem blijft: gebruik "Report Issue" knop in AI panel voor analyse.',
  },
  {
    category: 'Probleemoplossing',
    question: 'Waarom duurt AI soms lang om te laden?',
    answer:
      'Normale response tijd: 2-4 seconden. Bij langere laadtijd check: (1) Internet verbinding - AI calls vereisen stable internet, (2) Conversatie lengte - 100+ berichten = langere processing tijd, (3) Model keuze - GPT-4 is trager dan Claude 3 Haiku, (4) Concurrent usage - peak hours kunnen vertragingen veroorzaken, (5) Budget status - bij budget limiet worden requests queued. Dashboard toont real-time latency metrics. Contact support bij persistent >10sec load times.',
  },
  {
    category: 'Probleemoplossing',
    question: 'Sentiment score klopt niet - hoe kan dat?',
    answer:
      'AI sentiment is 92-94% accuraat, maar kan missen door: (1) Sarcasme/ironie - moeilijk te detecteren in tekst, (2) Culturele context - Nederlandse directheid vs Amerikaanse vriendelijkheid, (3) Mixed emotions - klant is blij met product maar boos over verzending, (4) Emoji overload - 😂 kan positief of negatief zijn afhankelijk van context. U kunt sentiment handmatig overriden via badge dropdown. Rapporteer persistente mismatches voor AI fine-tuning.',
  },
  {
    category: 'Probleemoplossing',
    question: 'Budget limiet bereikt - wat nu?',
    answer:
      'Opties bij budget limiet: (1) Verhoog maandelijks budget - Instellingen → AI → Budget verhogen, (2) Switch naar goedkoper model - Haiku ipv Sonnet = 70% kostenbesparing, (3) Disable enkele features - bijv alleen drafts, geen auto-summaries, (4) Optimize usage - on-demand ipv automatic generation, (5) Upgrade plan - higher tier plans hebben betere AI rates. Note: AI blijft beschikbaar bij budget overschrijding, u betaalt overage charges (like mobile data).',
  },
]

const categories = [
  'Alle Categorieën',
  ...Array.from(new Set(faqData.map(item => item.category))),
]

export default function AIFAQPage() {
  const [selectedCategory, setSelectedCategory] = useState('Alle Categorieën')
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory =
      selectedCategory === 'Alle Categorieën' || item.category === selectedCategory
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  const scrollToCategory = (category: string) => {
    setSelectedCategory(category)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-16 text-white'>
        <div className='container mx-auto max-w-4xl'>
          <div className='mb-6 flex items-center justify-center gap-3'>
            <Sparkles className='h-10 w-10' />
            <h1 className='text-4xl font-bold'>AI Features FAQ</h1>
          </div>
          <p className='text-center text-xl text-emerald-50'>
            Alles wat u moet weten over onze AI-powered functionaliteit
          </p>

          {/* Search */}
          <div className='mt-8'>
            <input
              type='text'
              placeholder='Zoek in FAQ...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full rounded-lg border-2 border-white/20 bg-white/10 px-6 py-3 text-white placeholder-white/60 backdrop-blur-sm focus:border-white focus:outline-none'
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='border-b border-gray-200 bg-white px-4 py-8'>
        <div className='container mx-auto max-w-6xl'>
          <div className='grid gap-6 md:grid-cols-4'>
            <div className='text-center'>
              <div className='mb-2 flex items-center justify-center'>
                <Clock className='h-8 w-8 text-emerald-600' />
              </div>
              <div className='text-2xl font-bold text-gray-900'>75%</div>
              <div className='text-sm text-gray-600'>Sneller antwoorden</div>
            </div>
            <div className='text-center'>
              <div className='mb-2 flex items-center justify-center'>
                <TrendingUp className='h-8 w-8 text-blue-600' />
              </div>
              <div className='text-2xl font-bold text-gray-900'>40%</div>
              <div className='text-sm text-gray-600'>Minder escalaties</div>
            </div>
            <div className='text-center'>
              <div className='mb-2 flex items-center justify-center'>
                <Sparkles className='h-8 w-8 text-purple-600' />
              </div>
              <div className='text-2xl font-bold text-gray-900'>92%</div>
              <div className='text-sm text-gray-600'>AI Accuracy</div>
            </div>
            <div className='text-center'>
              <div className='mb-2 flex items-center justify-center'>
                <Shield className='h-8 w-8 text-green-600' />
              </div>
              <div className='text-2xl font-bold text-gray-900'>GDPR</div>
              <div className='text-sm text-gray-600'>Volledig Compliant</div>
            </div>
          </div>
        </div>
      </div>

      {/* Jump to Section */}
      <div className='sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4 shadow-sm'>
        <div className='container mx-auto max-w-4xl'>
          <div className='flex flex-wrap gap-2'>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => scrollToCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Items */}
      <div className='px-4 py-12'>
        <div className='container mx-auto max-w-4xl'>
          {filteredFAQ.length === 0 ? (
            <div className='rounded-lg bg-white p-12 text-center shadow'>
              <p className='text-gray-600'>
                Geen resultaten gevonden voor &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredFAQ.map((item, index) => (
                <div key={index} className='overflow-hidden rounded-lg bg-white shadow'>
                  <button
                    onClick={() => toggleItem(index)}
                    className='flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50'
                  >
                    <div className='flex-1'>
                      <div className='mb-1 text-xs font-medium text-emerald-600'>
                        {item.category}
                      </div>
                      <div className='text-lg font-semibold text-gray-900'>{item.question}</div>
                    </div>
                    <div className='ml-4'>
                      {openItems.has(index) ? (
                        <ChevronUp className='h-6 w-6 text-gray-400' />
                      ) : (
                        <ChevronDown className='h-6 w-6 text-gray-400' />
                      )}
                    </div>
                  </button>
                  {openItems.has(index) && (
                    <div className='border-t border-gray-200 bg-gray-50 px-6 py-4'>
                      <p className='whitespace-pre-line text-gray-700'>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className='border-t border-gray-200 bg-white px-4 py-12'>
        <div className='container mx-auto max-w-4xl text-center'>
          <h2 className='mb-4 text-3xl font-bold text-gray-900'>Vraag niet beantwoord?</h2>
          <p className='mb-8 text-lg text-gray-600'>
            Neem contact op met ons support team of probeer onze AI features gratis
          </p>
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link
              href='/contact'
              className='rounded-lg border-2 border-emerald-600 px-8 py-3 font-semibold text-emerald-600 hover:bg-emerald-50'
            >
              Contact Support
            </Link>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-emerald-600 px-8 py-3 font-semibold text-white hover:bg-emerald-700'
            >
              Start Gratis Trial
            </Link>
          </div>
        </div>
      </div>

      {/* Related Links */}
      <div className='border-t border-gray-200 bg-gray-50 px-4 py-12'>
        <div className='container mx-auto max-w-4xl'>
          <h3 className='mb-6 text-center text-2xl font-bold text-gray-900'>
            Gerelateerde Paginas
          </h3>
          <div className='grid gap-6 md:grid-cols-3'>
            <Link
              href='/features/ai'
              className='rounded-lg bg-white p-6 shadow hover:shadow-md'
            >
              <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100'>
                <Sparkles className='h-6 w-6 text-emerald-600' />
              </div>
              <h4 className='mb-2 font-semibold text-gray-900'>AI Features</h4>
              <p className='text-sm text-gray-600'>
                Ontdek alle AI functionaliteit en unique selling points
              </p>
            </Link>
            <Link href='/pricing' className='rounded-lg bg-white p-6 shadow hover:shadow-md'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100'>
                <TrendingUp className='h-6 w-6 text-blue-600' />
              </div>
              <h4 className='mb-2 font-semibold text-gray-900'>Prijzen</h4>
              <p className='text-sm text-gray-600'>
                Bekijk welk plan het beste bij u past inclusief AI kosten
              </p>
            </Link>
            <Link href='/docs/ai' className='rounded-lg bg-white p-6 shadow hover:shadow-md'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100'>
                <Shield className='h-6 w-6 text-purple-600' />
              </div>
              <h4 className='mb-2 font-semibold text-gray-900'>Documentatie</h4>
              <p className='text-sm text-gray-600'>
                Technische documentatie en API reference voor developers
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
