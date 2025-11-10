import Link from 'next/link'
import { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'ADSapp - Professional WhatsApp Business Inbox | Multi-Tenant SaaS Platform',
  description:
    "Transform your WhatsApp business communication with ADSapp's professional inbox. Manage conversations, automate responses, and scale your customer support with our enterprise-grade platform.",
  keywords:
    'WhatsApp Business, Customer Support, Business Communication, SaaS, Multi-tenant, Team Collaboration, Automation',
  openGraph: {
    title: 'ADSapp - Professional WhatsApp Business Inbox',
    description: 'Transform your WhatsApp business communication with enterprise-grade features',
    url: 'https://adsapp.com',
    siteName: 'ADSapp',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADSapp - Professional WhatsApp Business Inbox',
    description: 'Transform your WhatsApp business communication with enterprise-grade features',
  },
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
          Most Popular
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
  const testimonials: TestimonialProps[] = [
    {
      quote:
        "ADSapp transformed our customer support. We've reduced response times by 60% and our customer satisfaction scores have never been higher.",
      author: 'Sarah Chen',
      title: 'Head of Customer Success',
      company: 'TechFlow Solutions',
      avatar: 'SC',
    },
    {
      quote:
        'The automation features alone saved us 20 hours per week. Our team can now focus on complex customer issues while ADSapp handles the routine inquiries.',
      author: 'Marcus Rodriguez',
      title: 'Operations Manager',
      company: 'Global Commerce Ltd',
      avatar: 'MR',
    },
    {
      quote:
        'Finally, a WhatsApp solution built for enterprise. The multi-tenant architecture and security features give us complete confidence.',
      author: 'Elena Petrov',
      title: 'CTO',
      company: 'FinanceFirst Group',
      avatar: 'EP',
    },
  ]

  const features: FeatureProps[] = [
    {
      icon: (
        <svg
          className='h-8 w-8 text-green-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          />
        </svg>
      ),
      title: 'Unified Team Inbox',
      description:
        'Centralize all WhatsApp Business conversations in one powerful dashboard designed for team collaboration.',
      benefits: [
        'Multi-agent support',
        'Real-time collaboration',
        'Conversation assignment',
        'Internal notes & tags',
      ],
    },
    {
      icon: (
        <svg
          className='h-8 w-8 text-blue-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
      title: 'Intelligent Automation',
      description:
        "Automate repetitive tasks with smart workflows that learn from your team's responses and improve over time.",
      benefits: ['Auto-responses', 'Smart routing', 'Workflow triggers', 'AI-powered suggestions'],
    },
    {
      icon: (
        <svg
          className='h-8 w-8 text-purple-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      ),
      title: 'Advanced Analytics',
      description:
        'Gain deep insights into customer interactions, team performance, and business impact with comprehensive reporting.',
      benefits: [
        'Response time metrics',
        'Customer satisfaction tracking',
        'Team performance analytics',
        'Custom dashboards',
      ],
    },
    {
      icon: (
        <svg
          className='h-8 w-8 text-indigo-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
          />
        </svg>
      ),
      title: 'Enterprise Security',
      description:
        'Bank-grade security with end-to-end encryption, compliance certifications, and complete data sovereignty.',
      benefits: [
        'SOC 2 Type II certified',
        'GDPR compliant',
        'End-to-end encryption',
        'Regular security audits',
      ],
    },
    {
      icon: (
        <svg
          className='h-8 w-8 text-orange-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
          />
        </svg>
      ),
      title: 'Multi-Tenant Architecture',
      description:
        'Purpose-built for agencies and enterprises managing multiple brands or clients with complete data isolation.',
      benefits: [
        'Client isolation',
        'White-label options',
        'Branded interfaces',
        'Centralized billing',
      ],
    },
    {
      icon: (
        <svg
          className='h-8 w-8 text-teal-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
          />
        </svg>
      ),
      title: 'Seamless Integrations',
      description:
        'Connect with your existing CRM, helpdesk, and business tools for a unified customer experience.',
      benefits: ['CRM integrations', 'API access', 'Webhook support', 'Custom integrations'],
    },
  ]

  const pricingPlans: PricingPlanProps[] = [
    {
      name: 'Starter',
      price: '$29',
      period: 'month',
      description: 'Perfect for small businesses getting started with WhatsApp Business',
      features: [
        'Up to 3 team members',
        '1,000 conversations/month',
        'Basic automation',
        'Standard support',
        'Mobile & web apps',
        'Basic analytics',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Professional',
      price: '$99',
      period: 'month',
      description: 'Ideal for growing businesses that need advanced features and higher limits',
      features: [
        'Up to 15 team members',
        '10,000 conversations/month',
        'Advanced automation',
        'Priority support',
        'Custom workflows',
        'Advanced analytics',
        'API access',
        'Custom integrations',
      ],
      popular: true,
      cta: 'Start Free Trial',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'month',
      description: 'For large organizations requiring unlimited scale and custom solutions',
      features: [
        'Unlimited team members',
        'Unlimited conversations',
        'Enterprise automation',
        'Dedicated success manager',
        'White-label options',
        'Custom analytics',
        'Premium integrations',
        'SLA guarantees',
        'On-premise deployment',
      ],
      cta: 'Contact Sales',
    },
  ]

  const faqs: FAQProps[] = [
    {
      question: 'How does ADSapp integrate with WhatsApp Business?',
      answer:
        "ADSapp connects directly to the official WhatsApp Business Cloud API, ensuring full compliance with WhatsApp's terms of service. This provides real-time message synchronization, delivery status updates, and access to all WhatsApp Business features including rich media, templates, and interactive messages.",
    },
    {
      question: 'Can multiple team members manage the same WhatsApp number?',
      answer:
        'Yes! ADSapp is built for team collaboration. Multiple agents can simultaneously manage conversations from the same WhatsApp Business number with features like conversation assignment, internal notes, and real-time collaboration tools.',
    },
    {
      question: 'Is my customer data secure and private?',
      answer:
        'Absolutely. We implement bank-grade security with end-to-end encryption, SOC 2 Type II compliance, and GDPR compliance. Your data is stored in secure, geo-distributed data centers with regular security audits and complete data sovereignty.',
    },
    {
      question: 'Do you offer a free trial?',
      answer:
        'Yes, all plans include a 14-day free trial with full access to features. No credit card required to start, and you can cancel anytime during the trial period.',
    },
    {
      question: 'Can I use ADSapp for multiple businesses or clients?',
      answer:
        'Yes! Our multi-tenant architecture is perfect for agencies and enterprises managing multiple brands or clients. Each tenant has complete data isolation, branded interfaces, and separate billing.',
    },
    {
      question: 'What kind of support do you provide?',
      answer:
        'We offer comprehensive support including detailed documentation, video tutorials, email support, and priority support for Professional and Enterprise plans. Enterprise customers also receive a dedicated success manager.',
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
              <Link
                href='#features'
                className='text-gray-600 transition-colors hover:text-gray-900'
              >
                Features
              </Link>
              <Link href='#pricing' className='text-gray-600 transition-colors hover:text-gray-900'>
                Pricing
              </Link>
              <Link href='#demo' className='text-gray-600 transition-colors hover:text-gray-900'>
                Demo
              </Link>
              <Link href='/faq' className='text-gray-600 transition-colors hover:text-gray-900'>
                FAQ
              </Link>
            </nav>
            <div className='flex items-center space-x-4'>
              <Link
                href='/auth/signin'
                className='text-gray-600 transition-colors hover:text-gray-900'
              >
                Sign In
              </Link>
              <Link
                href='/auth/signup'
                className='rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700'
              >
                Start Free Trial
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
                Transform Your
                <span className='block text-green-600'>WhatsApp Business</span>
                Into a Powerhouse
              </h1>
              <p className='mb-8 text-xl leading-relaxed text-gray-600'>
                The only professional WhatsApp Business inbox you need. Manage conversations,
                automate responses, and scale your customer support with enterprise-grade features
                designed for modern businesses.
              </p>
              <div className='mb-8 flex flex-col gap-4 sm:flex-row'>
                <Link
                  href='/auth/signup'
                  className='rounded-lg bg-green-600 px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-green-700'
                >
                  Start Free Trial
                </Link>
                <Link
                  href='/demo'
                  className='rounded-lg border-2 border-green-600 bg-white px-8 py-4 text-center font-semibold text-green-600 transition-colors hover:bg-gray-50'
                >
                  Try Interactive Demo
                </Link>
              </div>
              <div className='flex items-center space-x-6 text-sm text-gray-600'>
                <div className='flex items-center'>
                  <svg
                    className='mr-2 h-4 w-4 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  14-day free trial
                </div>
                <div className='flex items-center'>
                  <svg
                    className='mr-2 h-4 w-4 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  No credit card required
                </div>
                <div className='flex items-center'>
                  <svg
                    className='mr-2 h-4 w-4 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  Setup in 5 minutes
                </div>
              </div>
            </div>
            <div className='relative'>
              <Link href='/demo' className='group block'>
                <div className='rotate-2 transform cursor-pointer rounded-2xl bg-white p-8 shadow-2xl transition-transform duration-300 group-hover:rotate-0'>
                  <div className='relative flex h-64 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 text-gray-500'>
                    {/* Demo preview */}
                    <div className='absolute inset-0 opacity-10'>
                      <div className='grid h-full grid-cols-8 gap-1 p-4'>
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded ${i % 3 === 0 ? 'bg-green-300' : i % 3 === 1 ? 'bg-blue-300' : 'bg-purple-300'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className='relative z-10 text-center'>
                      <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-blue-600 transition-transform duration-300 group-hover:scale-110'>
                        <svg
                          className='h-10 w-10 text-white'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                      </div>
                      <p className='mb-2 text-xl font-bold text-gray-900'>Try Interactive Demo</p>
                      <p className='mb-3 text-sm text-gray-600'>
                        Experience WhatsApp Business Inbox
                      </p>
                      <div className='inline-flex items-center text-sm font-semibold text-green-600 transition-colors group-hover:text-green-700'>
                        Start Demo
                        <svg
                          className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-1'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5l7 7-7 7'
                          />
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
            <p className='text-lg text-gray-600'>Trusted by 2,500+ businesses worldwide</p>
          </div>
          <div className='grid grid-cols-2 items-center gap-8 opacity-60 md:grid-cols-4'>
            {['TechFlow', 'GlobalCorp', 'FinanceFirst', 'InnovateLabs'].map((company, index) => (
              <div
                key={index}
                className='flex h-16 items-center justify-center rounded-lg bg-gray-200'
              >
                <span className='font-semibold text-gray-600'>{company}</span>
              </div>
            ))}
          </div>
          <div className='mt-12 grid grid-cols-1 gap-6 text-center md:grid-cols-3'>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>99.9%</div>
              <div className='text-gray-600'>Uptime guarantee</div>
            </div>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>2.5M+</div>
              <div className='text-gray-600'>Messages processed daily</div>
            </div>
            <div>
              <div className='mb-2 text-3xl font-bold text-green-600'>60%</div>
              <div className='text-gray-600'>Faster response times</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='bg-white py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              Everything You Need to Scale Your WhatsApp Business
            </h2>
            <p className='mx-auto max-w-3xl text-xl text-gray-600'>
              From startups to enterprises, ADSapp provides the tools and infrastructure to deliver
              exceptional customer experiences at scale.
            </p>
          </div>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='bg-gray-50 py-20'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              Loved by Teams Worldwide
            </h2>
            <p className='text-xl text-gray-600'>
              See what our customers have to say about their ADSapp experience
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
              Simple, Transparent Pricing
            </h2>
            <p className='text-xl text-gray-600'>
              Choose the plan that fits your business size and needs. All plans include a 14-day
              free trial.
            </p>
          </div>
          <div className='mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3'>
            {pricingPlans.map((plan, index) => (
              <PricingPlan key={index} {...plan} />
            ))}
          </div>
          <div className='mt-12 text-center'>
            <p className='mb-4 text-gray-600'>
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className='text-gray-600'>
              Need a custom solution?{' '}
              <Link
                href='mailto:sales@adsapp.com'
                className='font-semibold text-green-600 hover:text-green-500'
              >
                Contact our sales team
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
                See ADSapp in Action
              </h2>
              <p className='mb-8 text-xl text-gray-600'>
                Experience the power of professional WhatsApp Business management. See how ADSapp
                transforms customer conversations into business growth.
              </p>
              <div className='mb-8 space-y-4'>
                <div className='flex items-center'>
                  <svg
                    className='mr-3 h-6 w-6 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>Live demo with sample conversations</span>
                </div>
                <div className='flex items-center'>
                  <svg
                    className='mr-3 h-6 w-6 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>Personalized setup consultation</span>
                </div>
                <div className='flex items-center'>
                  <svg
                    className='mr-3 h-6 w-6 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-700'>Q&A with our product experts</span>
                </div>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row'>
                <Link
                  href='/demo'
                  className='inline-block rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-700'
                >
                  Try Interactive Demo
                </Link>
                <Link
                  href='#contact'
                  className='inline-block rounded-lg border-2 border-green-600 px-8 py-3 font-semibold text-green-600 transition-colors hover:bg-green-600 hover:text-white'
                >
                  Book Live Demo
                </Link>
              </div>
            </div>
            <div className='relative'>
              <Link href='/demo' className='group block'>
                <div className='group-hover:shadow-3xl rounded-2xl bg-white p-8 shadow-2xl transition-shadow duration-300'>
                  <div className='relative flex h-80 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 text-gray-500'>
                    {/* Demo preview background */}
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
                        <svg
                          className='h-12 w-12 text-white'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                      </div>
                      <p className='mb-3 text-2xl font-bold text-gray-900'>Interactive Demo</p>
                      <p className='mb-4 text-gray-600'>
                        Experience the full WhatsApp Business Inbox
                      </p>
                      <div className='inline-flex items-center rounded-lg border border-green-200 bg-white px-4 py-2 font-semibold text-green-600 shadow-sm transition-shadow group-hover:shadow-md'>
                        Try Demo Free
                        <svg
                          className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5l7 7-7 7'
                          />
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
              Enterprise-Grade Security & Compliance
            </h2>
            <p className='text-xl text-gray-600'>
              Your data security is our top priority. ADSapp meets the highest industry standards.
            </p>
          </div>
          <div className='mb-16 grid grid-cols-2 gap-8 md:grid-cols-4'>
            {[
              { name: 'SOC 2', desc: 'Type II Certified' },
              { name: 'GDPR', desc: 'Compliant' },
              { name: 'ISO 27001', desc: 'Certified' },
              { name: '99.9%', desc: 'Uptime SLA' },
            ].map((cert, index) => (
              <div key={index} className='rounded-lg bg-gray-50 p-6 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                  <svg
                    className='h-8 w-8 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <div className='font-semibold text-gray-900'>{cert.name}</div>
                <div className='text-sm text-gray-600'>{cert.desc}</div>
              </div>
            ))}
          </div>
          <div className='grid grid-cols-1 gap-8 text-center md:grid-cols-3'>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>Data Encryption</h3>
              <p className='text-gray-600'>
                End-to-end encryption for all data in transit and at rest using AES-256 standards.
              </p>
            </div>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>Access Controls</h3>
              <p className='text-gray-600'>
                Role-based permissions, single sign-on (SSO), and multi-factor authentication (MFA).
              </p>
            </div>
            <div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>Regular Audits</h3>
              <p className='text-gray-600'>
                Continuous security monitoring and regular third-party security assessments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id='faq' className='bg-gray-50 py-20'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>
              Veelgestelde Vragen
            </h2>
            <p className='text-xl text-gray-600'>
              Heb je vragen? Bekijk onze uitgebreide FAQ voor antwoorden op alle vragen over ADSapp.
            </p>
          </div>
          <div className='space-y-8'>
            {faqs.map((faq, index) => (
              <FAQ key={index} {...faq} />
            ))}
          </div>
          <div className='mt-12 text-center'>
            <Link
              href='/faq'
              className='inline-flex items-center gap-2 rounded-lg bg-green-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-green-700'
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              Bekijk Alle FAQ&apos;s
            </Link>
            <p className='mt-4 text-gray-600'>
              Of{' '}
              <Link
                href='mailto:support@adsapp.com'
                className='font-semibold text-green-600 hover:text-green-500'
              >
                contact onze support team
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='bg-gradient-to-r from-green-600 to-blue-600 py-20'>
        <div className='mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8'>
          <h2 className='mb-6 text-3xl font-bold text-white lg:text-4xl'>
            Ready to Transform Your WhatsApp Business?
          </h2>
          <p className='mb-8 text-xl text-green-100'>
            Join thousands of businesses already using ADSapp to deliver exceptional customer
            experiences.
          </p>
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-white px-8 py-4 font-semibold text-green-600 transition-colors hover:bg-gray-100'
            >
              Start Free Trial
            </Link>
            <Link
              href='/demo'
              className='rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition-colors hover:bg-white hover:text-green-600'
            >
              Try Demo
            </Link>
          </div>
          <p className='mt-4 text-sm text-green-100'>
            14-day free trial • No credit card required • Setup in 5 minutes
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
                The professional WhatsApp Business inbox for modern teams. Transform your customer
                communication with enterprise-grade features and unmatched reliability.
              </p>
              <div className='flex space-x-4'>
                {['twitter', 'linkedin', 'facebook'].map(social => (
                  <a
                    key={social}
                    href='#'
                    className='text-gray-400 transition-colors hover:text-white'
                  >
                    <span className='sr-only'>{social}</span>
                    <div className='h-6 w-6 rounded bg-gray-600'></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className='mb-4 font-semibold text-white'>Product</h3>
              <ul className='space-y-2'>
                <li>
                  <Link href='#features' className='transition-colors hover:text-white'>
                    Features
                  </Link>
                </li>
                <li>
                  <Link href='#pricing' className='transition-colors hover:text-white'>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href='#demo' className='transition-colors hover:text-white'>
                    Demo
                  </Link>
                </li>
                <li>
                  <Link href='/integrations' className='transition-colors hover:text-white'>
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href='/api' className='transition-colors hover:text-white'>
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='mb-4 font-semibold text-white'>Company</h3>
              <ul className='space-y-2'>
                <li>
                  <Link href='/about' className='transition-colors hover:text-white'>
                    About
                  </Link>
                </li>
                <li>
                  <Link href='/careers' className='transition-colors hover:text-white'>
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href='/blog' className='transition-colors hover:text-white'>
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href='/press' className='transition-colors hover:text-white'>
                    Press
                  </Link>
                </li>
                <li>
                  <Link href='/contact' className='transition-colors hover:text-white'>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className='mt-12 flex flex-col items-center justify-between border-t border-gray-800 pt-8 md:flex-row'>
            <p className='text-gray-400'>&copy; 2024 ADSapp. All rights reserved.</p>
            <div className='mt-4 flex space-x-6 md:mt-0'>
              <Link href='/privacy' className='text-gray-400 transition-colors hover:text-white'>
                Privacy Policy
              </Link>
              <Link href='/terms' className='text-gray-400 transition-colors hover:text-white'>
                Terms of Service
              </Link>
              <Link href='/security' className='text-gray-400 transition-colors hover:text-white'>
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
