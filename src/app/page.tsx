import Link from "next/link";
import { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ADSapp - Professional WhatsApp Business Inbox | Multi-Tenant SaaS Platform",
  description: "Transform your WhatsApp business communication with ADSapp's professional inbox. Manage conversations, automate responses, and scale your customer support with our enterprise-grade platform.",
  keywords: "WhatsApp Business, Customer Support, Business Communication, SaaS, Multi-tenant, Team Collaboration, Automation",
  openGraph: {
    title: "ADSapp - Professional WhatsApp Business Inbox",
    description: "Transform your WhatsApp business communication with enterprise-grade features",
    url: "https://adsapp.com",
    siteName: "ADSapp",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ADSapp - Professional WhatsApp Business Inbox",
    description: "Transform your WhatsApp business communication with enterprise-grade features",
  },
};

interface TestimonialProps {
  quote: string;
  author: string;
  title: string;
  company: string;
  avatar: string;
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

interface PricingPlanProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

interface FAQProps {
  question: string;
  answer: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ quote, author, title, company, avatar }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center mb-4">
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
    <blockquote className="text-gray-600 mb-6 text-lg leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
    <div className="flex items-center">
      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
        {avatar}
      </div>
      <div className="ml-4">
        <div className="font-semibold text-gray-900">{author}</div>
        <div className="text-sm text-gray-600">{title}, {company}</div>
      </div>
    </div>
  </div>
);

const Feature: React.FC<FeatureProps> = ({ icon, title, description, benefits }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>
    <ul className="space-y-2">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {benefit}
        </li>
      ))}
    </ul>
  </div>
);

const PricingPlan: React.FC<PricingPlanProps> = ({ name, price, period, description, features, popular, cta }) => (
  <div className={`relative bg-white rounded-xl shadow-sm border-2 p-8 ${popular ? 'border-green-500 transform scale-105' : 'border-gray-100'}`}>
    {popular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">Most Popular</span>
      </div>
    )}
    <div className="text-center mb-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{name}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="mb-2">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-500 ml-1">/{period}</span>
      </div>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-gray-600">{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      href="/auth/signup"
      className={`block w-full py-3 px-6 rounded-lg text-center font-semibold transition-colors ${
        popular
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
      }`}
    >
      {cta}
    </Link>
  </div>
);

const FAQ: React.FC<FAQProps> = ({ question, answer }) => (
  <div className="border-b border-gray-200 pb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">{question}</h3>
    <p className="text-gray-600 leading-relaxed">{answer}</p>
  </div>
);

export default async function Home() {
  // Check if user is logged in and redirect appropriately
  const user = await getUser()
  if (user) {
    redirect('/redirect')
  }
  const testimonials: TestimonialProps[] = [
    {
      quote: "ADSapp transformed our customer support. We've reduced response times by 60% and our customer satisfaction scores have never been higher.",
      author: "Sarah Chen",
      title: "Head of Customer Success",
      company: "TechFlow Solutions",
      avatar: "SC"
    },
    {
      quote: "The automation features alone saved us 20 hours per week. Our team can now focus on complex customer issues while ADSapp handles the routine inquiries.",
      author: "Marcus Rodriguez",
      title: "Operations Manager",
      company: "Global Commerce Ltd",
      avatar: "MR"
    },
    {
      quote: "Finally, a WhatsApp solution built for enterprise. The multi-tenant architecture and security features give us complete confidence.",
      author: "Elena Petrov",
      title: "CTO",
      company: "FinanceFirst Group",
      avatar: "EP"
    }
  ];

  const features: FeatureProps[] = [
    {
      icon: <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      title: "Unified Team Inbox",
      description: "Centralize all WhatsApp Business conversations in one powerful dashboard designed for team collaboration.",
      benefits: ["Multi-agent support", "Real-time collaboration", "Conversation assignment", "Internal notes & tags"]
    },
    {
      icon: <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      title: "Intelligent Automation",
      description: "Automate repetitive tasks with smart workflows that learn from your team's responses and improve over time.",
      benefits: ["Auto-responses", "Smart routing", "Workflow triggers", "AI-powered suggestions"]
    },
    {
      icon: <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      title: "Advanced Analytics",
      description: "Gain deep insights into customer interactions, team performance, and business impact with comprehensive reporting.",
      benefits: ["Response time metrics", "Customer satisfaction tracking", "Team performance analytics", "Custom dashboards"]
    },
    {
      icon: <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption, compliance certifications, and complete data sovereignty.",
      benefits: ["SOC 2 Type II certified", "GDPR compliant", "End-to-end encryption", "Regular security audits"]
    },
    {
      icon: <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      title: "Multi-Tenant Architecture",
      description: "Purpose-built for agencies and enterprises managing multiple brands or clients with complete data isolation.",
      benefits: ["Client isolation", "White-label options", "Branded interfaces", "Centralized billing"]
    },
    {
      icon: <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
      title: "Seamless Integrations",
      description: "Connect with your existing CRM, helpdesk, and business tools for a unified customer experience.",
      benefits: ["CRM integrations", "API access", "Webhook support", "Custom integrations"]
    }
  ];

  const pricingPlans: PricingPlanProps[] = [
    {
      name: "Starter",
      price: "$29",
      period: "month",
      description: "Perfect for small businesses getting started with WhatsApp Business",
      features: [
        "Up to 3 team members",
        "1,000 conversations/month",
        "Basic automation",
        "Standard support",
        "Mobile & web apps",
        "Basic analytics"
      ],
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$99",
      period: "month",
      description: "Ideal for growing businesses that need advanced features and higher limits",
      features: [
        "Up to 15 team members",
        "10,000 conversations/month",
        "Advanced automation",
        "Priority support",
        "Custom workflows",
        "Advanced analytics",
        "API access",
        "Custom integrations"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "month",
      description: "For large organizations requiring unlimited scale and custom solutions",
      features: [
        "Unlimited team members",
        "Unlimited conversations",
        "Enterprise automation",
        "Dedicated success manager",
        "White-label options",
        "Custom analytics",
        "Premium integrations",
        "SLA guarantees",
        "On-premise deployment"
      ],
      cta: "Contact Sales"
    }
  ];

  const faqs: FAQProps[] = [
    {
      question: "How does ADSapp integrate with WhatsApp Business?",
      answer: "ADSapp connects directly to the official WhatsApp Business Cloud API, ensuring full compliance with WhatsApp's terms of service. This provides real-time message synchronization, delivery status updates, and access to all WhatsApp Business features including rich media, templates, and interactive messages."
    },
    {
      question: "Can multiple team members manage the same WhatsApp number?",
      answer: "Yes! ADSapp is built for team collaboration. Multiple agents can simultaneously manage conversations from the same WhatsApp Business number with features like conversation assignment, internal notes, and real-time collaboration tools."
    },
    {
      question: "Is my customer data secure and private?",
      answer: "Absolutely. We implement bank-grade security with end-to-end encryption, SOC 2 Type II compliance, and GDPR compliance. Your data is stored in secure, geo-distributed data centers with regular security audits and complete data sovereignty."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes, all plans include a 14-day free trial with full access to features. No credit card required to start, and you can cancel anytime during the trial period."
    },
    {
      question: "Can I use ADSapp for multiple businesses or clients?",
      answer: "Yes! Our multi-tenant architecture is perfect for agencies and enterprises managing multiple brands or clients. Each tenant has complete data isolation, branded interfaces, and separate billing."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer comprehensive support including detailed documentation, video tutorials, email support, and priority support for Professional and Enterprise plans. Enterprise customers also receive a dedicated success manager."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                ADS<span className="text-green-600">app</span>
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
              <Link href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">Demo</Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div className="mb-12 lg:mb-0">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your
                <span className="text-green-600 block">WhatsApp Business</span>
                Into a Powerhouse
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The only professional WhatsApp Business inbox you need. Manage conversations, automate responses,
                and scale your customer support with enterprise-grade features designed for modern businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/auth/signup"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/demo"
                  className="bg-white hover:bg-gray-50 text-green-600 font-semibold py-4 px-8 rounded-lg border-2 border-green-600 transition-colors text-center"
                >
                  Try Interactive Demo
                </Link>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  14-day free trial
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Setup in 5 minutes
                </div>
              </div>
            </div>
            <div className="relative">
              <Link href="/demo" className="block group">
                <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2 group-hover:rotate-0 transition-transform duration-300 cursor-pointer">
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg h-64 flex items-center justify-center text-gray-500 relative overflow-hidden">
                    {/* Demo preview */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="grid grid-cols-8 gap-1 h-full p-4">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div key={i} className={`rounded ${i % 3 === 0 ? 'bg-green-300' : i % 3 === 1 ? 'bg-blue-300' : 'bg-purple-300'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="text-center relative z-10">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xl font-bold text-gray-900 mb-2">Try Interactive Demo</p>
                      <p className="text-sm text-gray-600 mb-3">Experience WhatsApp Business Inbox</p>
                      <div className="inline-flex items-center text-green-600 text-sm font-semibold group-hover:text-green-700 transition-colors">
                        Start Demo
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600">Trusted by 2,500+ businesses worldwide</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            {['TechFlow', 'GlobalCorp', 'FinanceFirst', 'InnovateLabs'].map((company, index) => (
              <div key={index} className="bg-gray-200 h-16 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 font-semibold">{company}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime guarantee</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">2.5M+</div>
              <div className="text-gray-600">Messages processed daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">60%</div>
              <div className="text-gray-600">Faster response times</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Scale Your WhatsApp Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From startups to enterprises, ADSapp provides the tools and infrastructure to deliver exceptional customer experiences at scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say about their ADSapp experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Testimonial key={index} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business size and needs. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingPlan key={index} {...plan} />
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">All plans include a 14-day free trial. No credit card required.</p>
            <p className="text-gray-600">
              Need a custom solution? <Link href="mailto:sales@adsapp.com" className="text-green-600 hover:text-green-500 font-semibold">Contact our sales team</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div className="mb-12 lg:mb-0">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                See ADSapp in Action
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Experience the power of professional WhatsApp Business management. See how ADSapp transforms customer conversations into business growth.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Live demo with sample conversations</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Personalized setup consultation</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Q&A with our product experts</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/demo"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Try Interactive Demo
                </Link>
                <Link
                  href="#contact"
                  className="inline-block border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Book Live Demo
                </Link>
              </div>
            </div>
            <div className="relative">
              <Link href="/demo" className="block group">
                <div className="bg-white rounded-2xl shadow-2xl p-8 group-hover:shadow-3xl transition-shadow duration-300">
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg h-80 flex items-center justify-center text-gray-500 relative overflow-hidden">
                    {/* Demo preview background */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="h-full flex flex-col">
                        <div className="h-12 bg-green-200 rounded-t-lg mb-2"></div>
                        <div className="flex-1 flex">
                          <div className="w-1/3 bg-blue-200 mr-2"></div>
                          <div className="flex-1 bg-purple-200"></div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center relative z-10">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-3">Interactive Demo</p>
                      <p className="text-gray-600 mb-4">Experience the full WhatsApp Business Inbox</p>
                      <div className="inline-flex items-center bg-white text-green-600 px-4 py-2 rounded-lg font-semibold shadow-sm group-hover:shadow-md transition-shadow border border-green-200">
                        Try Demo Free
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Security & Compliance
            </h2>
            <p className="text-xl text-gray-600">
              Your data security is our top priority. ADSapp meets the highest industry standards.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {[
              { name: 'SOC 2', desc: 'Type II Certified' },
              { name: 'GDPR', desc: 'Compliant' },
              { name: 'ISO 27001', desc: 'Certified' },
              { name: '99.9%', desc: 'Uptime SLA' }
            ].map((cert, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900">{cert.name}</div>
                <div className="text-sm text-gray-600">{cert.desc}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Encryption</h3>
              <p className="text-gray-600">End-to-end encryption for all data in transit and at rest using AES-256 standards.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Controls</h3>
              <p className="text-gray-600">Role-based permissions, single sign-on (SSO), and multi-factor authentication (MFA).</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Regular Audits</h3>
              <p className="text-gray-600">Continuous security monitoring and regular third-party security assessments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We have answers. If you can&apos;t find what you&apos;re looking for, contact our support team.
            </p>
          </div>
          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <FAQ key={index} {...faq} />
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Link
              href="mailto:support@adsapp.com"
              className="text-green-600 hover:text-green-500 font-semibold"
            >
              Contact our support team
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your WhatsApp Business?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of businesses already using ADSapp to deliver exceptional customer experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-green-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Try Demo
            </Link>
          </div>
          <p className="text-green-100 mt-4 text-sm">14-day free trial • No credit card required • Setup in 5 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="text-2xl font-bold text-white mb-4">
                ADS<span className="text-green-400">app</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The professional WhatsApp Business inbox for modern teams. Transform your customer communication with enterprise-grade features and unmatched reliability.
              </p>
              <div className="flex space-x-4">
                {['twitter', 'linkedin', 'facebook'].map((social) => (
                  <a key={social} href="#" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">{social}</span>
                    <div className="w-6 h-6 bg-gray-600 rounded"></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#demo" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">&copy; 2024 ADSapp. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/security" className="text-gray-400 hover:text-white transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
