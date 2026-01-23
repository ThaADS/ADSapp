import { NextRequest, NextResponse } from 'next/server'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/server'

export async function GET(request: NextRequest) {
  try {
    // Convert SUBSCRIPTION_PLANS to a format suitable for the frontend
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => ({
      id: planId,
      name: plan.name,
      description: plan.description || `${plan.name} plan with advanced features`,
      price: plan.price,
      currency: 'usd',
      interval: 'month',
      popular: planId === 'professional',
      stripePriceId: plan.stripePriceId,
      features: [
        {
          name: `${plan.limits.maxMessages === -1 ? 'Unlimited' : plan.limits.maxMessages} messages per month`,
          description: 'WhatsApp messages you can send',
          included: true,
          limit: plan.limits.maxMessages,
        },
        {
          name: `${plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers} team members`,
          description: 'Users who can access your account',
          included: true,
          limit: plan.limits.maxUsers,
        },
        {
          name: `${plan.limits.maxContacts === -1 ? 'Unlimited' : plan.limits.maxContacts} contacts`,
          description: 'Contacts in your database',
          included: true,
          limit: plan.limits.maxContacts,
        },
        {
          name: `${plan.limits.automationRules === -1 ? 'Unlimited' : plan.limits.automationRules} automation rules`,
          description: 'Automated workflows',
          included: true,
          limit: plan.limits.automationRules,
        },
        {
          name: 'Analytics & Reporting',
          description: 'Detailed insights and reports',
          included: plan.features.analytics,
        },
        {
          name: 'API Access',
          description: 'Programmatic access to your data',
          included: plan.features.apiAccess,
        },
        {
          name: 'Custom Branding',
          description: 'White-label your workspace',
          included: plan.features.customBranding,
        },
        {
          name: 'Advanced Automation',
          description: 'Complex workflow automation',
          included: plan.features.advancedAutomation,
        },
        {
          name: 'Priority Support',
          description: 'Fast response times and dedicated help',
          included: plan.features.prioritySupport,
        },
        {
          name: 'Phone Support',
          description: 'Direct phone line to our experts',
          included: plan.features.phoneSupport,
        },
        {
          name: 'Account Manager',
          description: 'Dedicated customer success manager',
          included: plan.features.accountManager,
        },
        {
          name: 'Custom Integration',
          description: 'Tailored integrations for your business',
          included: plan.features.customIntegration,
        },
        {
          name: 'SLA Guarantee',
          description: '99.9% uptime service level agreement',
          included: plan.features.slaGuarantee,
        },
      ].filter(feature => feature.included !== false),
    }))

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Plans API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
