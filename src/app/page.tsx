import Link from 'next/link'
import { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getServerLocale } from '@/lib/i18n/server'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

// Dynamic metadata based on locale
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const translations = await import(`@/locales/${locale}/landing.json`).then(m => m.default).catch(() => ({}))

  return {
    title: translations.meta?.title || 'ADSapp - Professional WhatsApp Business Inbox | Multi-Tenant SaaS Platform',
    description: translations.meta?.description || "Transform your WhatsApp business communication with ADSapp's professional inbox.",
    keywords: 'WhatsApp Business, Customer Support, Business Communication, SaaS, Multi-tenant, Team Collaboration, Automation',
    openGraph: {
      title: translations.meta?.title || 'ADSapp - Professional WhatsApp Business Inbox',
      description: translations.meta?.description || 'Transform your WhatsApp business communication with enterprise-grade features',
      url: 'https://adsapp.com',
      siteName: 'ADSapp',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: translations.meta?.title || 'ADSapp - Professional WhatsApp Business Inbox',
      description: translations.meta?.description || 'Transform your WhatsApp business communication with enterprise-grade features',
    },
  }
}

interface TestimonialProps {
  quote: string
  author: string
  title: string
  company: string
  avatar: string
}

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
  benefits: string[]
}

interface PricingPlanProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  cta: string
}

interface FAQProps {
  question: string
  answer: string
}

const Testimonial: React.FC<TestimonialProps> = ({ quote, author, title, company, avatar }) => (
  <div className='rounded-xl border border-gray-100 bg-white p-8 shadow-sm'>
    <div className='mb-4 flex items-center'>
      <div className='flex text-yellow-400'>
        {[...Array(5)].map((_, i) => (
          <svg key={i} className='h-5 w-5 fill-current' viewBox='0 0 20 20'>
            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
          </svg>
        ))}
      </div>
    </div>
    <blockquote className='mb-6 text-lg leading-relaxed text-gray-600'>
      &ldquo;{quote}&rdquo;
    </blockquote>
    <div className='flex items-center'>
      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-lg font-semibold text-white'>
        {avatar}
      </div>
      <div className='ml-4'>
        <div className='font-semibold text-gray-900'>{author}</div>
        <div className='text-sm text-gray-600'>
          {title}, {company}
        </div>
      </div>
    </div>
  </div>
)

const Feature: React.FC<FeatureProps> = ({ icon, title, description, benefits }) => (
  <div className='rounded-xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-md'>
    <div className='mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-blue-100'>
      {icon}
    </div>
    <h3 className='mb-3 text-xl font-semibold text-gray-900'>{title}</h3>
    <p className='mb-4 leading-relaxed text-gray-600'>{description}</p>
    <ul className='space-y-2'>
      {benefits.map((benefit, index) => (
        <li key={index} className='flex items-center text-sm text-gray-600'>
          <svg
            className='mr-2 h-4 w-4 flex-shrink-0 text-green-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          {benefit}
        </li>
      ))}
    </ul>
  </div>
)

const PricingPlan: React.FC<PricingPlanProps> = ({
  name,
  price,
  period,
  description,
  features,
  popular,
  cta,
}) => (
  <div
    className={`relative rounded-xl border-2 bg-white p-8 shadow-sm ${popular ? 'scale-105 transform border-green-500' : 'border-gray-100'}`}
  >
    {popular && (
      <div className='absolute -top-4 left-1/2 -translate-x-1/2 transform'>
        <span className='rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white'>
          {/* Popular badge - passed via cta prop context */}
        </span>
      </div>
    )}
    <div className='mb-8 text-center'>
      <h3 className='mb-2 text-xl font-semibold text-gray-900'>{name}</h3>
      <p className='mb-4 text-gray-600'>{description}</p>
      <div className='mb-2'>
        <span className='text-4xl font-bold text-gray-900'>{price}</span>
        <span className='ml-1 text-gray-500'>/{period}</span>
      </div>
    </div>
    <ul className='mb-8 space-y-3'>
      {features.map((feature, index) => (
        <li key={index} className='flex items-start'>
          <svg
            className='mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-green-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          <span className='text-gray-600'>{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      href='/auth/signup'
      className={`block w-full rounded-lg px-6 py-3 text-center font-semibold transition-colors ${
        popular
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
      }`}
    >
      {cta}
    </Link>
  </div>
)

const FAQ: React.FC<FAQProps> = ({ question, answer }) => (
  <div className='border-b border-gray-200 pb-8'>
    <h3 className='mb-3 text-lg font-semibold text-gray-900'>{question}</h3>
    <p className='leading-relaxed text-gray-600'>{answer}</p>
  </div>
)

export default async function Home() {
  // Check if user is logged in and redirect appropriately
  const user = await getUser()
  if (user) {
    redirect('/redirect')
  }

  // Load translations
  const locale = await getServerLocale()
  const t = await import(`@/locales/${locale}/landing.json`).then(m => m.default).catch(() => ({}))

  const testimonials: TestimonialProps[] = [
    {
      quote: t.testimonials?.quote1 || "ADSapp transformed our customer support. We've reduced response times by 60% and our customer satisfaction scores have never been higher.",
      author: t.testimonials?.author1 || 'Sarah Chen',
      title: t.testimonials?.title1 || 'Head of Customer Success',
      company: t.testimonials?.company1 || 'TechFlow Solutions',
      avatar: 'SC',
    },
    {
      quote: t.testimonials?.quote2 || 'The automation features alone saved us 20 hours per week. Our team can now focus on complex customer issues while ADSapp handles the routine inquiries.',
      author: t.testimonials?.author2 || 'Marcus Rodriguez',
      title: t.testimonials?.title2 || 'Operations Manager',
      company: t.testimonials?.company2 || 'Global Commerce Ltd',
      avatar: 'MR',
    },
    {
      quote: t.testimonials?.quote3 || 'Finally, a WhatsApp solution built for enterprise. The multi-tenant architecture and security features give us complete confidence.',
      author: t.testimonials?.author3 || 'Elena Petrov',
      title: t.testimonials?.title3 || 'CTO',
      company: t.testimonials?.company3 || 'FinanceFirst Group',
      avatar: 'EP',
    },
  ]

  const features: FeatureProps[] = [
    {
      icon: (
        <svg className='h-8 w-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
        </svg>
      ),
      title: t.features?.inbox?.title || 'Unified Team Inbox',
      description: t.features?.inbox?.description || 'Centralize all WhatsApp Business conversations in one powerful dashboard designed for team collaboration.',
      benefits: [
        t.features?.inbox?.benefit1 || 'Multi-agent support',
        t.features?.inbox?.benefit2 || 'Real-time collaboration',
        t.features?.inbox?.benefit3 || 'Conversation assignment',
        t.features?.inbox?.benefit4 || 'Internal notes & tags',
      ],
    },
    {
      icon: (
        <svg className='h-8 w-8 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
        </svg>
      ),
      title: t.features?.automation?.title || 'Intelligent Automation',
      description: t.features?.automation?.description || "Automate repetitive tasks with smart workflows that learn from your team's responses and improve over time.",
      benefits: [
        t.features?.automation?.benefit1 || 'Auto-responses',
        t.features?.automation?.benefit2 || 'Smart routing',
        t.features?.automation?.benefit3 || 'Workflow triggers',
        t.features?.automation?.benefit4 || 'AI-powered suggestions',
      ],
    },
    {
      icon: (
        <svg className='h-8 w-8 text-purple-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
        </svg>
      ),
      title: t.features?.analytics?.title || 'Advanced Analytics',
      description: t.features?.analytics?.description || 'Gain deep insights into customer interactions, team performance, and business impact with comprehensive reporting.',
      benefits: [
        t.features?.analytics?.benefit1 || 'Response time metrics',
        t.features?.analytics?.benefit2 || 'Customer satisfaction tracking',
        t.features?.analytics?.benefit3 || 'Team performance analytics',
        t.features?.analytics?.benefit4 || 'Custom dashboards',
      ],
    },
    {
      icon: (
        <svg className='h-8 w-8 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
        </svg>
      ),
      title: t.features?.security?.title || 'Enterprise Security',
      description: t.features?.security?.description || 'Bank-grade security with end-to-end encryption, compliance certifications, and complete data sovereignty.',
      benefits: [
        t.features?.security?.benefit1 || 'SOC 2 Type II certified',
        t.features?.security?.benefit2 || 'GDPR compliant',
        t.features?.security?.benefit3 || 'End-to-end encryption',
        t.features?.security?.benefit4 || 'Regular security audits',
      ],
    },
    {
      icon: (
        <svg className='h-8 w-8 text-orange-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
        </svg>
      ),
      title: t.features?.multiTenant?.title || 'Multi-Tenant Architecture',
      description: t.features?.multiTenant?.description || 'Purpose-built for agencies and enterprises managing multiple brands or clients with complete data isolation.',
      benefits: [
        t.features?.multiTenant?.benefit1 || 'Client isolation',
        t.features?.multiTenant?.benefit2 || 'White-label options',
        t.features?.multiTenant?.benefit3 || 'Branded interfaces',
        t.features?.multiTenant?.benefit4 || 'Centralized billing',
      ],
    },
    {
      icon: (
        <svg className='h-8 w-8 text-teal-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
        </svg>
      ),
      title: t.features?.integrations?.title || 'Seamless Integrations',
      description: t.features?.integrations?.description || 'Connect with your existing CRM, helpdesk, and business tools for a unified customer experience.',
      benefits: [
        t.features?.integrations?.benefit1 || 'CRM integrations',
        t.features?.integrations?.benefit2 || 'API access',
        t.features?.integrations?.benefit3 || 'Webhook support',
        t.features?.integrations?.benefit4 || 'Custom integrations',
      ],
    },
  ]

  const pricingPlans: PricingPlanProps[] = [
    {
      name: t.pricing?.starter?.name || 'Starter',
      price: t.pricing?.starter?.price || '$29',
      period: t.pricing?.starter?.period || 'month',
      description: t.pricing?.starter?.description || 'Perfect for small businesses getting started with WhatsApp Business',
      features: [
        t.pricing?.starter?.feature1 || 'Up to 3 team members',
        t.pricing?.starter?.feature2 || '1,000 conversations/month',
        t.pricing?.starter?.feature3 || 'Basic automation',
        t.pricing?.starter?.feature4 || 'Standard support',
        t.pricing?.starter?.feature5 || 'Mobile & web apps',
        t.pricing?.starter?.feature6 || 'Basic analytics',
      ],
      cta: t.pricing?.starter?.cta || 'Start Free Trial',
    },
    {
      name: t.pricing?.professional?.name || 'Professional',
      price: t.pricing?.professional?.price || '$99',
      period: t.pricing?.professional?.period || 'month',
      description: t.pricing?.professional?.description || 'Ideal for growing businesses that need advanced features and higher limits',
      features: [
        t.pricing?.professional?.feature1 || 'Up to 15 team members',
        t.pricing?.professional?.feature2 || '10,000 conversations/month',
        t.pricing?.professional?.feature3 || 'Advanced automation',
        t.pricing?.professional?.feature4 || 'Priority support',
        t.pricing?.professional?.feature5 || 'Custom workflows',
        t.pricing?.professional?.feature6 || 'Advanced analytics',
        t.pricing?.professional?.feature7 || 'API access',
        t.pricing?.professional?.feature8 || 'Custom integrations',
      ],
      popular: true,
      cta: t.pricing?.professional?.cta || 'Start Free Trial',
    },
    {
      name: t.pricing?.enterprise?.name || 'Enterprise',
      price: t.pricing?.enterprise?.price || 'Custom',
      period: t.pricing?.enterprise?.period || 'month',
      description: t.pricing?.enterprise?.description || 'For large organizations requiring unlimited scale and custom solutions',
      features: [
        t.pricing?.enterprise?.feature1 || 'Unlimited team members',
        t.pricing?.enterprise?.feature2 || 'Unlimited conversations',
        t.pricing?.enterprise?.feature3 || 'Enterprise automation',
        t.pricing?.enterprise?.feature4 || 'Dedicated success manager',
        t.pricing?.enterprise?.feature5 || 'White-label options',
        t.pricing?.enterprise?.feature6 || 'Custom analytics',
        t.pricing?.enterprise?.feature7 || 'Premium integrations',
        t.pricing?.enterprise?.feature8 || 'SLA guarantees',
        t.pricing?.enterprise?.feature9 || 'On-premise deployment',
      ],
      cta: t.pricing?.enterprise?.cta || 'Contact Sales',
    },
  ]

  const faqs: FAQProps[] = [
    {
      question: t.faq?.q1 || 'How does ADSapp integrate with WhatsApp Business?',
      answer: t.faq?.a1 || "ADSapp connects directly to the official WhatsApp Business Cloud API, ensuring full compliance with WhatsApp's terms of service.",
    },
    {
      question: t.faq?.q2 || 'Can multiple team members manage the same WhatsApp number?',
      answer: t.faq?.a2 || 'Yes! ADSapp is built for team collaboration. Multiple agents can simultaneously manage conversations.',
    },
    {
      question: t.faq?.q3 || 'Is my customer data secure and private?',
      answer: t.faq?.a3 || 'Absolutely. We implement bank-grade security with end-to-end encryption, SOC 2 Type II compliance, and GDPR compliance.',
    },
    {
      question: t.faq?.q4 || 'Do you offer a free trial?',
      answer: t.faq?.a4 || 'Yes, all plans include a 14-day free trial with full access to features.',
    },
    {
      question: t.faq?.q5 || 'Can I use ADSapp for multiple businesses or clients?',
      answer: t.faq?.a5 || 'Yes! Our multi-tenant architecture is perfect for agencies and enterprises managing multiple brands or clients.',
    },
    {
      question: t.faq?.q6 || 'What kind of support do you provide?',
      answer: t.faq?.a6 || 'We offer comprehensive support including detailed documentation, video tutorials, email support, and priority support for Professional and Enterprise plans.',
    },
  ]

  return (
    <div className='min-h-screen bg-white'>
      {/* Header */}
      <header className='border-b border-gray-200 bg-white'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center'>
              <Link href='/' className='text-2xl font-bold text-gray-900'>
                ADS<span className='text-green-600'>app</span>
              </Link>
            </div>
            <nav className='hidden space-x-8 md:flex'>
              <Link href='#features' className='text-gray-600 transition-colors hover:text-gray-900'>
                {t.nav?.features || 'Features'}
              </Link>
              <Link href='#pricing' className='text-gray-600 transition-colors hover:text-gray-900'>
                {t.nav?.pricing || 'Pricing'}
              </Link>
              <Link href='#demo' className='text-gray-600 transition-colors hover:text-gray-900'>
                {t.nav?.demo || 'Demo'}
              </Link>
              <Link href='/faq' className='text-gray-600 transition-colors hover:text-gray-900'>
                {t.nav?.faq || 'FAQ'}
              </Link>
            </nav>
            <div className='flex items-center space-x-4'>
              <LanguageSwitcher compact />
              <Link href='/auth/signin' className='text-gray-600 transition-colors hover:text-gray-900'>
                {t.nav?.signIn || 'Sign In'}
              </Link>
              <Link
                href='/auth/signup'
                className='rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700'
              >
                {t.nav?.startTrial || 'Start Free Trial'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 py-20'>
        <div className='bg-grid-pattern absolute inset-0 opacity-5'></div>
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='items-center lg:grid lg:grid-cols-2 lg:gap-8'>
            <div className='mb-12 lg:mb-0'>
              <h1 className='mb-6 text-4xl leading-tight font-bold text-gray-900 lg:text-6xl'>
                {t.hero?.title1 || 'Transform Your'}
                <span className='block text-green-600'>{t.hero?.title2 || 'WhatsApp Business'}</span>
                {t.hero?.title3 || 'Into a Powerhouse'}
              </h1>
              <p className='mb-8 text-xl leading-relaxed text-gray-600'>
                {t.hero?.description || 'The only professional WhatsApp Business inbox you need. Manage conversations, automate responses, and scale your customer support with enterprise-grade features designed for modern businesses.'}
              </p>
              <div className='mb-8 flex flex-col gap-4 sm:flex-row'>
                <Link
                  href='/auth/signup'
                  className='rounded-lg bg-green-600 px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-green-700'
                >
                  {t.hero?.cta || 'Start Free Trial'}
                </Link>
                <Link
                  href='/demo'
                  className='rounded-lg border-2 border-green-600 bg-white px-8 py-4 text-center font-semibold text-green-600 transition-colors hover:bg-gray-50'
                >
                  {t.hero?.ctaDemo || 'Try Interactive Demo'}
                </Link>
              </div>
              <div className='flex items-center space-x-6 text-sm text-gray-600'>
                <div className='flex items-center'>
                  <svg className='mr-2 h-4 w-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  {t.hero?.benefit1 || '14-day free trial'}
                </div>
                <div className='flex items-center'>
                  <svg className='mr-2 h-4 w-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  {t.hero?.benefit2 || 'No credit card required'}
                </div>
                <div className='flex items-center'>
                  <svg className='mr-2 h-4 w-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  {t.hero?.benefit3 || 'Setup in 5 minutes'}
                </div>
              </div>
            </div>
            <div className='relative'>
              <Link href='/demo' className='group block'>
                <div className='rotate-2 transform cursor-pointer rounded-2xl bg-white p-8 shadow-2xl transition-transform duration-300 group-hover:rotate-0'>
                  <div className='relative flex h-64 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 text-gray-500'>
                    <div className='absolute inset-0 opacity-10'>
                      <div className='grid h-full grid-cols-8 gap-1 p-4'>
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div key={i} className={`rounded ${i % 3 === 0 ? 'bg-green-300' : i % 3 === 1 ? 'bg-blue-300' : 'bg-purple-300'}`} />
                        ))}
                      </div>
                    </div>
                    <div className='relative z-10 text-center'>
                      <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-blue-600 transition-transform duration-300 group-hover:scale-110'>
                        <svg className='h-10 w-10 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                      </div>
                      <p className='mb-2 text-xl font-bold text-gray-900'>{t.demo?.previewTitle || 'Interactive Demo'}</p>
                      <p className='mb-3 text-sm text-gray-600'>{t.demo?.previewDescription || 'Experience WhatsApp Business Inbox'}</p>
                      <div className='inline-flex items-center text-sm font-semibold text-green-600 transition-colors group-hover:text-green-700'>
                        {t.demo?.previewCta || 'Start Demo'}
                        <svg className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className='bg-gray-50 py-12'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-8 text-center'>
            <p className='text-lg text-gray-600'>{t.socialProof?.trustedBy || 'Trusted by 2,500+ businesses worldwide'}</p>
          </div>
          <div className='grid grid-cols-2 items-center gap-8 opacity-60 md:grid-cols-4'>
            {['TechFlow', 'GlobalCorp', 'FinanceFirst', 'InnovateLabs'].map((company, index) => (
              <div key={index} className='flex h-16 items-center justify-center rounded-lg bg-gray-200'>
                <span className='font-semibold text-gray-600'>{company}</span>
              </div>
            ))}
          </div>
          <div className='mt-12 grid grid-cols-1 gap-6 text-center md:grid-cols-3'>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>99.9%</div>
              <div className='text-gray-600'>{t.socialProof?.uptime || 'Uptime guarantee'}</div>
            </div>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>2.5M+</div>
              <div className='text-gray-600'>{t.socialProof?.messages || 'Messages processed daily'}</div>
            </div>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>60%</div>
              <div className='text-gray-600'>{t.socialProof?.fasterResponse || 'Faster response times'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='bg-white py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.features?.title || 'Everything You Need to Scale Your WhatsApp Business'}
            </h2>
            <p className='mx-auto max-w-3xl text-xl text-gray-600'>
              {t.features?.description || 'From startups to enterprises, ADSapp provides the tools and infrastructure to deliver exceptional customer experiences at scale.'}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='bg-gray-50 py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.howItWorks?.title || 'How It Works'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.howItWorks?.description || 'Get started in 4 simple steps'}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
            {[
              { num: '1', title: t.howItWorks?.step1?.title || 'Create Account', desc: t.howItWorks?.step1?.description || 'Sign up for free and connect your WhatsApp Business number in less than 5 minutes', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
              { num: '2', title: t.howItWorks?.step2?.title || 'Invite Team', desc: t.howItWorks?.step2?.description || 'Add team members and configure roles and permissions', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { num: '3', title: t.howItWorks?.step3?.title || 'Set Up Workflows', desc: t.howItWorks?.step3?.description || 'Configure automations, templates, and routing rules', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
              { num: '4', title: t.howItWorks?.step4?.title || 'Start Chatting', desc: t.howItWorks?.step4?.description || 'Begin professionally handling customer conversations', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
            ].map((step, index) => (
              <div key={index} className='relative text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-2xl font-bold text-white'>
                  {step.num}
                </div>
                <h3 className='mb-2 text-lg font-semibold text-gray-900'>{step.title}</h3>
                <p className='text-gray-600'>{step.desc}</p>
                {index < 3 && (
                  <div className='absolute top-8 left-1/2 hidden w-full lg:block'>
                    <svg className='ml-8 h-0.5 w-full text-gray-300' fill='currentColor'>
                      <rect width='100%' height='2' />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extended Features Showcase */}
      <section className='bg-white py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.extendedFeatures?.title || 'Discover All Features'}
            </h2>
            <p className='mx-auto max-w-3xl text-xl text-gray-600'>
              {t.extendedFeatures?.description || 'ADSapp offers a complete suite of features for professional WhatsApp Business management'}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
            {[
              { key: 'ai', icon: '🤖', color: 'from-purple-500 to-indigo-600' },
              { key: 'communication', icon: '💬', color: 'from-green-500 to-teal-600' },
              { key: 'campaigns', icon: '📢', color: 'from-orange-500 to-red-600' },
              { key: 'workflows', icon: '⚡', color: 'from-blue-500 to-cyan-600' },
              { key: 'analytics', icon: '📊', color: 'from-pink-500 to-rose-600' },
              { key: 'team', icon: '👥', color: 'from-yellow-500 to-orange-600' },
              { key: 'contacts', icon: '📇', color: 'from-emerald-500 to-green-600' },
              { key: 'integrations', icon: '🔗', color: 'from-violet-500 to-purple-600' },
              { key: 'security', icon: '🛡️', color: 'from-slate-600 to-gray-800' },
            ].map((cat) => {
              const category = t.extendedFeatures?.categories?.[cat.key]
              if (!category) return null
              return (
                <div key={cat.key} className='group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg'>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-2xl`}>
                    {cat.icon}
                  </div>
                  <h3 className='mb-2 text-lg font-semibold text-gray-900'>{category.title}</h3>
                  <p className='mb-4 text-sm text-gray-600'>{category.description}</p>
                  <ul className='space-y-2'>
                    {Object.values(category.features || {}).slice(0, 4).map((feature: any, idx: number) => (
                      <li key={idx} className='flex items-start text-sm'>
                        <svg className='mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                        </svg>
                        <span className='text-gray-700'>{feature.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className='bg-gradient-to-br from-gray-50 to-blue-50 py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.useCases?.title || 'Ideal for Every Industry'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.useCases?.description || 'Discover how businesses in different sectors use ADSapp'}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {[
              { key: 'ecommerce', icon: '🛒', gradient: 'from-orange-400 to-pink-500' },
              { key: 'healthcare', icon: '🏥', gradient: 'from-blue-400 to-cyan-500' },
              { key: 'finance', icon: '🏦', gradient: 'from-green-400 to-emerald-500' },
              { key: 'travel', icon: '✈️', gradient: 'from-purple-400 to-indigo-500' },
              { key: 'education', icon: '🎓', gradient: 'from-yellow-400 to-orange-500' },
              { key: 'agencies', icon: '🏢', gradient: 'from-gray-400 to-slate-500' },
            ].map((useCase) => {
              const data = t.useCases?.[useCase.key]
              if (!data) return null
              return (
                <div key={useCase.key} className='overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-md'>
                  <div className={`bg-gradient-to-r ${useCase.gradient} p-4`}>
                    <div className='flex items-center gap-3'>
                      <span className='text-3xl'>{useCase.icon}</span>
                      <h3 className='text-lg font-semibold text-white'>{data.title}</h3>
                    </div>
                  </div>
                  <div className='p-6'>
                    <p className='mb-4 text-gray-600'>{data.description}</p>
                    <ul className='space-y-2'>
                      {(data.benefits || []).map((benefit: string, idx: number) => (
                        <li key={idx} className='flex items-center text-sm text-gray-700'>
                          <svg className='mr-2 h-4 w-4 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                          </svg>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className='bg-white py-16'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-12 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900'>
              {t.stats?.title || 'ADSapp by the Numbers'}
            </h2>
          </div>
          <div className='grid grid-cols-2 gap-8 md:grid-cols-5'>
            {[
              { label: t.stats?.businesses || 'Active Businesses', value: t.stats?.businessesValue || '2,500+' },
              { label: t.stats?.messages || 'Messages Per Day', value: t.stats?.messagesValue || '1M+' },
              { label: t.stats?.countries || 'Countries', value: t.stats?.countriesValue || '45+' },
              { label: t.stats?.uptime || 'Uptime', value: t.stats?.uptimeValue || '99.9%' },
              { label: t.stats?.satisfaction || 'Customer Satisfaction', value: t.stats?.satisfactionValue || '4.9/5' },
            ].map((stat, index) => (
              <div key={index} className='text-center'>
                <div className='mb-2 text-3xl font-bold text-green-600 lg:text-4xl'>{stat.value}</div>
                <div className='text-sm text-gray-600'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='bg-gray-50 py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.testimonials?.title || 'Loved by Teams Worldwide'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.testimonials?.description || 'See what our customers have to say about their ADSapp experience'}
            </p>
          </div>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            {testimonials.map((testimonial, index) => (
              <Testimonial key={index} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id='pricing' className='bg-white py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.pricing?.title || 'Simple, Transparent Pricing'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.pricing?.description || 'Choose the plan that fits your business size and needs. All plans include a 14-day free trial.'}
            </p>
          </div>
          <div className='mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3'>
            {pricingPlans.map((plan, index) => (
              <PricingPlan key={index} {...plan} />
            ))}
          </div>
          <div className='mt-12 text-center'>
            <p className='mb-4 text-gray-600'>{t.pricing?.trialNote || 'All plans include a 14-day free trial. No credit card required.'}</p>
            <p className='text-gray-600'>
              {t.pricing?.customSolution || 'Need a custom solution?'}{' '}
              <Link href='mailto:sales@adsapp.com' className='font-semibold text-green-600 hover:text-green-500'>
                {t.pricing?.contactSales || 'Contact our sales team'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id='demo' className='bg-gradient-to-br from-green-50 to-blue-50 py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='items-center lg:grid lg:grid-cols-2 lg:gap-8'>
            <div className='mb-12 lg:mb-0'>
              <h2 className='mb-6 text-3xl font-bold text-gray-900 lg:text-4xl'>
                {t.demo?.title || 'See ADSapp in Action'}
              </h2>
              <p className='mb-8 text-xl text-gray-600'>
                {t.demo?.description || 'Experience the power of professional WhatsApp Business management. See how ADSapp transforms customer conversations into business growth.'}
              </p>
              <div className='mb-8 space-y-4'>
                <div className='flex items-center'>
                  <svg className='mr-3 h-6 w-6 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  <span className='text-gray-700'>{t.demo?.benefit1 || 'Live demo with sample conversations'}</span>
                </div>
                <div className='flex items-center'>
                  <svg className='mr-3 h-6 w-6 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  <span className='text-gray-700'>{t.demo?.benefit2 || 'Personalized setup consultation'}</span>
                </div>
                <div className='flex items-center'>
                  <svg className='mr-3 h-6 w-6 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  <span className='text-gray-700'>{t.demo?.benefit3 || 'Q&A with our product experts'}</span>
                </div>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row'>
                <Link href='/demo' className='inline-block rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-700'>
                  {t.demo?.cta || 'Try Interactive Demo'}
                </Link>
                <Link href='#contact' className='inline-block rounded-lg border-2 border-green-600 px-8 py-3 font-semibold text-green-600 transition-colors hover:bg-green-600 hover:text-white'>
                  {t.demo?.ctaBook || 'Book Live Demo'}
                </Link>
              </div>
            </div>
            <div className='relative'>
              <Link href='/demo' className='group block'>
                <div className='group-hover:shadow-3xl rounded-2xl bg-white p-8 shadow-2xl transition-shadow duration-300'>
                  <div className='relative flex h-80 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 text-gray-500'>
                    <div className='absolute inset-0 opacity-20'>
                      <div className='flex h-full flex-col'>
                        <div className='mb-2 h-12 rounded-t-lg bg-green-200'></div>
                        <div className='flex flex-1'>
                          <div className='mr-2 w-1/3 bg-blue-200'></div>
                          <div className='flex-1 bg-purple-200'></div>
                        </div>
                      </div>
                    </div>
                    <div className='relative z-10 text-center'>
                      <div className='mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-blue-600 transition-transform duration-300 group-hover:scale-110'>
                        <svg className='h-12 w-12 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                      </div>
                      <p className='mb-3 text-2xl font-bold text-gray-900'>{t.demo?.previewTitle || 'Interactive Demo'}</p>
                      <p className='mb-4 text-gray-600'>{t.demo?.previewDescription || 'Experience the full WhatsApp Business Inbox'}</p>
                      <div className='inline-flex items-center rounded-lg border border-green-200 bg-white px-4 py-2 font-semibold text-green-600 shadow-sm transition-shadow group-hover:shadow-md'>
                        {t.demo?.previewCta || 'Try Demo Free'}
                        <svg className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className='bg-white py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.security?.title || 'Enterprise-Grade Security & Compliance'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.security?.description || 'Your data security is our top priority. ADSapp meets the highest industry standards.'}
            </p>
          </div>
          <div className='mb-16 grid grid-cols-2 gap-8 md:grid-cols-4'>
            {[
              { name: t.security?.soc2 || 'SOC 2', desc: t.security?.soc2Desc || 'Type II Certified' },
              { name: t.security?.gdpr || 'GDPR', desc: t.security?.gdprDesc || 'Compliant' },
              { name: t.security?.iso || 'ISO 27001', desc: t.security?.isoDesc || 'Certified' },
              { name: t.security?.uptime || '99.9%', desc: t.security?.uptimeDesc || 'Uptime SLA' },
            ].map((cert, index) => (
              <div key={index} className='rounded-lg bg-gray-50 p-6 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                  <svg className='h-8 w-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <div className='font-semibold text-gray-900'>{cert.name}</div>
                <div className='text-sm text-gray-600'>{cert.desc}</div>
              </div>
            ))}
          </div>
          <div className='grid grid-cols-1 gap-8 text-center md:grid-cols-3'>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>{t.security?.encryption || 'Data Encryption'}</h3>
              <p className='text-gray-600'>{t.security?.encryptionDesc || 'End-to-end encryption for all data in transit and at rest using AES-256 standards.'}</p>
            </div>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>{t.security?.accessControl || 'Access Controls'}</h3>
              <p className='text-gray-600'>{t.security?.accessControlDesc || 'Role-based permissions, single sign-on (SSO), and multi-factor authentication (MFA).'}</p>
            </div>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>{t.security?.audits || 'Regular Audits'}</h3>
              <p className='text-gray-600'>{t.security?.auditsDesc || 'Continuous security monitoring and regular third-party security assessments.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id='faq' className='bg-gray-50 py-20'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              {t.faq?.title || 'Frequently Asked Questions'}
            </h2>
            <p className='text-xl text-gray-600'>
              {t.faq?.description || 'Have questions? Check out our comprehensive FAQ for answers to all your questions about ADSapp.'}
            </p>
          </div>
          <div className='space-y-8'>
            {faqs.map((faq, index) => (
              <FAQ key={index} {...faq} />
            ))}
          </div>
          <div className='mt-12 text-center'>
            <Link href='/faq' className='inline-flex items-center gap-2 rounded-lg bg-green-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-green-700'>
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
              {t.faq?.viewAll || 'View All FAQs'}
            </Link>
            <p className='mt-4 text-gray-600'>
              {t.faq?.orContact || 'Or'}{' '}
              <Link href='mailto:support@adsapp.com' className='font-semibold text-green-600 hover:text-green-500'>
                {t.faq?.contactSupport || 'contact our support team'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='bg-gradient-to-r from-green-600 to-blue-600 py-20'>
        <div className='mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8'>
          <h2 className='mb-6 text-3xl font-bold text-white lg:text-4xl'>
            {t.cta?.title || 'Ready to Transform Your WhatsApp Business?'}
          </h2>
          <p className='mb-8 text-xl text-green-100'>
            {t.cta?.description || 'Join thousands of businesses already using ADSapp to deliver exceptional customer experiences.'}
          </p>
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link href='/auth/signup' className='rounded-lg bg-white px-8 py-4 font-semibold text-green-600 transition-colors hover:bg-gray-100'>
              {t.cta?.startTrial || 'Start Free Trial'}
            </Link>
            <Link href='/demo' className='rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition-colors hover:bg-white hover:text-green-600'>
              {t.cta?.tryDemo || 'Try Demo'}
            </Link>
          </div>
          <p className='mt-4 text-sm text-green-100'>
            {t.cta?.trialNote || '14-day free trial • No credit card required • Setup in 5 minutes'}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className='bg-gray-900 text-gray-300'>
        <div className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-4'>
            <div className='col-span-1 md:col-span-2'>
              <div className='mb-4 text-2xl font-bold text-white'>
                ADS<span className='text-green-400'>app</span>
              </div>
              <p className='mb-6 max-w-md text-gray-400'>
                {t.footer?.description || 'The professional WhatsApp Business inbox for modern teams. Transform your customer communication with enterprise-grade features and unmatched reliability.'}
              </p>
              <div className='flex space-x-4'>
                {['twitter', 'linkedin', 'facebook'].map(social => (
                  <a key={social} href='#' className='text-gray-400 transition-colors hover:text-white'>
                    <span className='sr-only'>{social}</span>
                    <div className='h-6 w-6 rounded bg-gray-600'></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className='mb-4 font-semibold text-white'>{t.footer?.product || 'Product'}</h3>
              <ul className='space-y-2'>
                <li><Link href='#features' className='transition-colors hover:text-white'>{t.footer?.features || 'Features'}</Link></li>
                <li><Link href='#pricing' className='transition-colors hover:text-white'>{t.footer?.pricing || 'Pricing'}</Link></li>
                <li><Link href='#demo' className='transition-colors hover:text-white'>{t.footer?.demo || 'Demo'}</Link></li>
                <li><Link href='/integrations' className='transition-colors hover:text-white'>{t.footer?.integrations || 'Integrations'}</Link></li>
                <li><Link href='/api' className='transition-colors hover:text-white'>{t.footer?.api || 'API'}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className='mb-4 font-semibold text-white'>{t.footer?.company || 'Company'}</h3>
              <ul className='space-y-2'>
                <li><Link href='/about' className='transition-colors hover:text-white'>{t.footer?.about || 'About'}</Link></li>
                <li><Link href='/careers' className='transition-colors hover:text-white'>{t.footer?.careers || 'Careers'}</Link></li>
                <li><Link href='/blog' className='transition-colors hover:text-white'>{t.footer?.blog || 'Blog'}</Link></li>
                <li><Link href='/press' className='transition-colors hover:text-white'>{t.footer?.press || 'Press'}</Link></li>
                <li><Link href='/contact' className='transition-colors hover:text-white'>{t.footer?.contact || 'Contact'}</Link></li>
              </ul>
            </div>
          </div>
          <div className='mt-12 flex flex-col items-center justify-between border-t border-gray-800 pt-8 md:flex-row'>
            <p className='text-gray-400'>{t.footer?.copyright || '© 2024 ADSapp. All rights reserved.'}</p>
            <div className='mt-4 flex space-x-6 md:mt-0'>
              <Link href='/privacy' className='text-gray-400 transition-colors hover:text-white'>{t.footer?.privacy || 'Privacy Policy'}</Link>
              <Link href='/terms' className='text-gray-400 transition-colors hover:text-white'>{t.footer?.terms || 'Terms of Service'}</Link>
              <Link href='/security' className='text-gray-400 transition-colors hover:text-white'>{t.footer?.security || 'Security'}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
