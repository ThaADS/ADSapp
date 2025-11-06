import Link from 'next/link'
import { Sparkles, Zap, Brain, TrendingUp, Shield, DollarSign } from 'lucide-react'

export default function AIFeaturesPage() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-white to-gray-50'>
      {/* Hero Section */}
      <section className='bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-20 text-white'>
        <div className='container mx-auto max-w-6xl'>
          <div className='flex items-center justify-center gap-2 mb-6'>
            <Sparkles className='h-12 w-12' />
            <h1 className='text-5xl font-bold'>AI-Powered Features</h1>
          </div>
          <p className='text-xl text-center text-emerald-50 max-w-3xl mx-auto'>
            Transformeer uw WhatsApp klantenservice met geavanceerde AI-functionaliteit. Bespaar
            tijd, verhoog klanttevredenheid en behaal meetbare resultaten.
          </p>
          <div className='mt-10 flex justify-center gap-4'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-white px-8 py-3 font-semibold text-emerald-600 hover:bg-emerald-50'
            >
              Start Gratis Trial
            </Link>
            <Link
              href='/features/ai#demo'
              className='rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10'
            >
              Bekijk Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className='px-4 py-16'>
        <div className='container mx-auto max-w-6xl'>
          <h2 className='mb-12 text-center text-4xl font-bold text-gray-900'>
            Meetbare Resultaten
          </h2>
          <div className='grid gap-8 md:grid-cols-3'>
            <div className='rounded-xl bg-white p-8 shadow-lg'>
              <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100'>
                <Zap className='h-8 w-8 text-emerald-600' />
              </div>
              <h3 className='mb-2 text-2xl font-bold text-gray-900'>75% Sneller</h3>
              <p className='text-gray-600'>
                Antwoordtijd met AI Draft Suggestions - genereer in seconden professionele
                antwoorden in 3 verschillende tonen
              </p>
            </div>
            <div className='rounded-xl bg-white p-8 shadow-lg'>
              <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100'>
                <TrendingUp className='h-8 w-8 text-blue-600' />
              </div>
              <h3 className='mb-2 text-2xl font-bold text-gray-900'>40% Minder Escalaties</h3>
              <p className='text-gray-600'>
                Door proactieve sentiment analyse en urgentie detectie - los problemen op voordat ze
                escaleren
              </p>
            </div>
            <div className='rounded-xl bg-white p-8 shadow-lg'>
              <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100'>
                <Brain className='h-8 w-8 text-purple-600' />
              </div>
              <h3 className='mb-2 text-2xl font-bold text-gray-900'>100% Context Behoud</h3>
              <p className='text-gray-600'>
                Bij agent transitions met automatische conversatie samenvattingen - geen informatie
                verlies meer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className='bg-white px-4 py-16'>
        <div className='container mx-auto max-w-6xl'>
          <h2 className='mb-16 text-center text-4xl font-bold text-gray-900'>
            Complete AI Suite
          </h2>

          {/* Feature 1: Draft Suggestions */}
          <div className='mb-20 grid gap-12 md:grid-cols-2 md:items-center'>
            <div>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100'>
                  <Sparkles className='h-6 w-6 text-emerald-600' />
                </div>
                <h3 className='text-3xl font-bold text-gray-900'>AI Draft Suggestions</h3>
              </div>
              <p className='mb-6 text-lg text-gray-600'>
                Genereer in seconden context-aware antwoorden in 3 verschillende tonen: professional,
                vriendelijk en empathisch. De AI analyseert de conversatie en biedt direct bruikbare
                suggesties.
              </p>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-emerald-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>3 Toon Opties:</strong> Kies tussen professional, vriendelijk of empathisch
                    gebaseerd op de situatie
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-emerald-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Confidence Scores:</strong> Zie hoe zeker de AI is van elke suggestie
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-emerald-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>One-Click Insert:</strong> Voeg antwoorden direct in met 1 klik
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-emerald-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Context Aware:</strong> Analyseert volledige conversatie geschiedenis
                  </span>
                </li>
              </ul>
            </div>
            <div className='rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 p-8'>
              <div className='aspect-video rounded-lg bg-white p-4 shadow-lg'>
                <div className='mb-4 text-sm font-medium text-gray-600'>💬 Conversatie Context</div>
                <div className='space-y-2 mb-6'>
                  <div className='rounded bg-gray-100 p-2 text-xs text-gray-700'>
                    Klant: &quot;Mijn bestelling is nog niet aangekomen...&quot;
                  </div>
                </div>
                <div className='text-sm font-medium text-emerald-600 mb-2'>✨ AI Suggesties:</div>
                <div className='space-y-2'>
                  <div className='rounded border-2 border-emerald-200 bg-emerald-50 p-2'>
                    <div className='text-xs font-medium text-emerald-700'>😊 Vriendelijk</div>
                    <div className='text-xs text-gray-700'>
                      &quot;Wat vervelend dat je bestelling...&quot;
                    </div>
                  </div>
                  <div className='rounded border border-gray-200 bg-white p-2'>
                    <div className='text-xs font-medium text-blue-700'>💼 Professional</div>
                    <div className='text-xs text-gray-700'>&quot;Wij begrijpen uw...&quot;</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Sentiment Analysis */}
          <div className='mb-20 grid gap-12 md:grid-cols-2 md:items-center'>
            <div className='order-2 md:order-1'>
              <div className='rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-8'>
                <div className='aspect-video rounded-lg bg-white p-4 shadow-lg'>
                  <div className='mb-4 text-sm font-medium text-gray-600'>
                    📊 Real-time Sentiment Tracking
                  </div>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between rounded-lg border-l-4 border-red-500 bg-red-50 p-3'>
                      <div>
                        <div className='text-xs font-medium text-red-700'>😠 Negatief</div>
                        <div className='text-xs text-red-600'>Score: -0.8</div>
                      </div>
                      <div className='rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'>
                        🚨 URGENT
                      </div>
                    </div>
                    <div className='flex items-center justify-between rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-3'>
                      <div>
                        <div className='text-xs font-medium text-yellow-700'>😐 Neutraal</div>
                        <div className='text-xs text-yellow-600'>Score: 0.1</div>
                      </div>
                      <div className='rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700'>
                        Normaal
                      </div>
                    </div>
                    <div className='flex items-center justify-between rounded-lg border-l-4 border-green-500 bg-green-50 p-3'>
                      <div>
                        <div className='text-xs font-medium text-green-700'>😊 Positief</div>
                        <div className='text-xs text-green-600'>Score: 0.9</div>
                      </div>
                      <div className='rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'>
                        Tevreden
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='order-1 md:order-2'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-purple-100'>
                  <Brain className='h-6 w-6 text-purple-600' />
                </div>
                <h3 className='text-3xl font-bold text-gray-900'>Sentiment Analyse</h3>
              </div>
              <p className='mb-6 text-lg text-gray-600'>
                Real-time emotie detectie en urgentie tracking. Identificeer ontevreden klanten
                automatisch en escaleer kritieke situaties voordat ze uit de hand lopen.
              </p>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-purple-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Real-time Detectie:</strong> Elk bericht wordt automatisch geanalyseerd
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-purple-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Urgentie Levels:</strong> Low, Medium, High, Critical - automatische
                    prioritering
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-purple-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Visual Indicators:</strong> Color-coded badges met emoji voor snelle
                    herkenning
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-purple-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Proactieve Escalatie:</strong> Automatische notificaties bij kritieke
                    sentiment
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Conversation Summaries */}
          <div className='mb-20 grid gap-12 md:grid-cols-2 md:items-center'>
            <div>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-100'>
                  <TrendingUp className='h-6 w-6 text-blue-600' />
                </div>
                <h3 className='text-3xl font-bold text-gray-900'>Conversatie Samenvattingen</h3>
              </div>
              <p className='mb-6 text-lg text-gray-600'>
                Genereer in seconden uitgebreide samenvattingen van hele conversaties. Perfect voor
                agent transitions, rapportages en knowledge management.
              </p>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-blue-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Gestructureerde Output:</strong> Key Points, Resolved Issues, Next Steps,
                    Open Questions
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-blue-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Instant Generation:</strong> Volledige analyse in minder dan 5 seconden
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-blue-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Statistieken:</strong> Bericht count, duur, belangrijkste punten
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-blue-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Export Ready:</strong> Copy-paste voor rapportages en notities
                  </span>
                </li>
              </ul>
            </div>
            <div className='rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8'>
              <div className='aspect-video rounded-lg bg-white p-4 shadow-lg'>
                <div className='mb-3 text-sm font-medium text-gray-600'>📝 Conversatie Samenvatting</div>
                <div className='space-y-2 text-xs'>
                  <div className='rounded bg-blue-50 p-2'>
                    <div className='font-medium text-blue-700'>🎯 Key Points</div>
                    <div className='text-gray-600'>• Verzending vertraagd door...</div>
                  </div>
                  <div className='rounded bg-green-50 p-2'>
                    <div className='font-medium text-green-700'>✅ Opgelost</div>
                    <div className='text-gray-600'>• Track & trace verstrekt</div>
                  </div>
                  <div className='rounded bg-yellow-50 p-2'>
                    <div className='font-medium text-yellow-700'>📌 Volgende Stappen</div>
                    <div className='text-gray-600'>• Follow-up na levering</div>
                  </div>
                  <div className='rounded bg-gray-50 p-2'>
                    <div className='font-medium text-gray-700'>❓ Open Vragen</div>
                    <div className='text-gray-600'>• Klant wacht op levering</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Analytics & Cost Tracking */}
          <div className='mb-20 grid gap-12 md:grid-cols-2 md:items-center'>
            <div className='order-2 md:order-1'>
              <div className='rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-8'>
                <div className='aspect-video rounded-lg bg-white p-4 shadow-lg'>
                  <div className='mb-3 text-sm font-medium text-gray-600'>📊 AI Analytics Dashboard</div>
                  <div className='space-y-2'>
                    <div className='rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 p-3 text-white'>
                      <div className='text-xs opacity-90'>Totaal AI Verzoeken</div>
                      <div className='text-2xl font-bold'>1,247</div>
                      <div className='text-xs opacity-75'>Laatste 30 dagen</div>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='rounded bg-gray-50 p-2'>
                        <div className='text-xs text-gray-600'>Kosten</div>
                        <div className='font-bold text-gray-900'>$12.34</div>
                      </div>
                      <div className='rounded bg-gray-50 p-2'>
                        <div className='text-xs text-gray-600'>Acceptatie</div>
                        <div className='font-bold text-gray-900'>87.3%</div>
                      </div>
                    </div>
                    <div className='rounded bg-blue-50 p-2'>
                      <div className='mb-1 flex justify-between text-xs'>
                        <span className='text-blue-700'>Budget Status</span>
                        <span className='font-medium text-blue-900'>62%</span>
                      </div>
                      <div className='h-2 overflow-hidden rounded-full bg-blue-200'>
                        <div className='h-full w-3/5 rounded-full bg-blue-600'></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='order-1 md:order-2'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                  <DollarSign className='h-6 w-6 text-green-600' />
                </div>
                <h3 className='text-3xl font-bold text-gray-900'>Analytics & Cost Tracking</h3>
              </div>
              <p className='mb-6 text-lg text-gray-600'>
                Volledige transparantie over AI gebruik en kosten. Stel budgets in, ontvang
                waarschuwingen en optimaliseer je AI strategie op basis van data.
              </p>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-green-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Real-time Tracking:</strong> Live kosten per feature, model en periode
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-green-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Budget Management:</strong> Stel maandelijkse limieten in met automatische
                    alerts
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-green-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Usage Insights:</strong> Acceptance rates, latency, token consumption
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-green-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Export & Reporting:</strong> Download analytics voor interne rapportages
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 5: AI Settings & Control */}
          <div className='grid gap-12 md:grid-cols-2 md:items-center'>
            <div>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100'>
                  <Shield className='h-6 w-6 text-indigo-600' />
                </div>
                <h3 className='text-3xl font-bold text-gray-900'>Volledige Controle</h3>
              </div>
              <p className='mb-6 text-lg text-gray-600'>
                Beheer alle AI features vanuit één centrale plek. Schakel features in/uit, kies je
                voorkeurs AI model en stel budgets in per organisatie.
              </p>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-indigo-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Feature Toggles:</strong> Schakel elke AI functie individueel in of uit
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-indigo-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Model Selectie:</strong> Kies tussen Claude 3.5, GPT-4 of budget-vriendelijke
                    opties
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-indigo-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Temperature Control:</strong> Pas creativiteit en consistentie aan per use
                    case
                  </span>
                </li>
                <li className='flex items-start gap-3'>
                  <svg
                    className='mt-1 h-5 w-5 text-indigo-600'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>
                    <strong>Fallback Models:</strong> Automatische backup als primair model niet
                    beschikbaar is
                  </span>
                </li>
              </ul>
            </div>
            <div className='rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-8'>
              <div className='aspect-video rounded-lg bg-white p-4 shadow-lg'>
                <div className='mb-3 text-sm font-medium text-gray-600'>⚙️ AI Instellingen</div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between rounded-lg border border-gray-200 p-2'>
                    <div className='text-xs font-medium text-gray-700'>Master AI Toggle</div>
                    <div className='h-6 w-11 rounded-full bg-emerald-600'></div>
                  </div>
                  <div className='ml-4 space-y-2 border-l-2 border-gray-200 pl-3'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-gray-600'>Draft Suggestions</span>
                      <div className='h-5 w-9 rounded-full bg-emerald-600'></div>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-gray-600'>Sentiment Analyse</span>
                      <div className='h-5 w-9 rounded-full bg-emerald-600'></div>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-gray-600'>Samenvattingen</span>
                      <div className='h-5 w-9 rounded-full bg-gray-300'></div>
                    </div>
                  </div>
                  <div className='rounded-lg border border-gray-200 p-2'>
                    <div className='mb-1 text-xs font-medium text-gray-700'>Primair Model</div>
                    <div className='rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700'>
                      Claude 3.5 Sonnet
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className='bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-20 text-white'>
        <div className='container mx-auto max-w-4xl text-center'>
          <h2 className='mb-6 text-4xl font-bold'>Klaar om AI-Powered te worden?</h2>
          <p className='mb-10 text-xl text-emerald-50'>
            Start vandaag nog met een gratis 14-dagen trial. Geen creditcard vereist.
          </p>
          <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-white px-8 py-4 text-lg font-semibold text-emerald-600 hover:bg-emerald-50'
            >
              Start Gratis Trial
            </Link>
            <Link
              href='/faq/ai'
              className='rounded-lg border-2 border-white px-8 py-4 text-lg font-semibold text-white hover:bg-white/10'
            >
              Bekijk FAQ
            </Link>
          </div>
          <p className='mt-6 text-sm text-emerald-100'>
            AI features beschikbaar op alle paid plannen · Volume discounts beschikbaar
          </p>
        </div>
      </section>

      {/* Trust Signals */}
      <section className='px-4 py-16'>
        <div className='container mx-auto max-w-6xl'>
          <div className='grid gap-8 md:grid-cols-3'>
            <div className='text-center'>
              <div className='mb-4 text-4xl font-bold text-emerald-600'>99.9%</div>
              <div className='text-lg font-medium text-gray-900'>Uptime Guarantee</div>
              <div className='text-gray-600'>Enterprise-grade betrouwbaarheid</div>
            </div>
            <div className='text-center'>
              <div className='mb-4 text-4xl font-bold text-blue-600'>GDPR</div>
              <div className='text-lg font-medium text-gray-900'>Compliant</div>
              <div className='text-gray-600'>Nederlandse data storage beschikbaar</div>
            </div>
            <div className='text-center'>
              <div className='mb-4 text-4xl font-bold text-purple-600'>24/7</div>
              <div className='text-lg font-medium text-gray-900'>Support</div>
              <div className='text-gray-600'>Nederlands-talig support team</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
