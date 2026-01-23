import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/status
 * Check status of all integrations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('whatsapp_business_account_id, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (orgError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check all integration statuses in parallel
    const [whatsappStatus, stripeStatus, emailStatus, databaseStatus] = await Promise.all([
      checkWhatsAppStatus(organization.whatsapp_business_account_id),
      checkStripeStatus(organization.stripe_customer_id),
      checkEmailStatus(),
      checkDatabaseStatus(supabase),
    ])

    return NextResponse.json({
      integrations: {
        whatsapp: whatsappStatus,
        stripe: stripeStatus,
        email: emailStatus,
        database: databaseStatus,
      },
      overall_status: calculateOverallStatus([
        whatsappStatus,
        stripeStatus,
        emailStatus,
        databaseStatus,
      ]),
      last_checked: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking integration status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Check WhatsApp Business API status
 */
async function checkWhatsAppStatus(businessAccountId: string | null) {
  if (!businessAccountId) {
    return {
      status: 'not_configured',
      message: 'WhatsApp Business Account not configured',
      healthy: false,
    }
  }

  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    if (!accessToken) {
      return {
        status: 'error',
        message: 'WhatsApp access token not configured',
        healthy: false,
      }
    }

    // Check if we can access the business account
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}?fields=id,name`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      return {
        status: 'connected',
        message: `Connected to ${data.name || 'WhatsApp Business'}`,
        healthy: true,
        details: {
          account_id: data.id,
          account_name: data.name,
        },
      }
    } else {
      const error = await response.json()
      return {
        status: 'error',
        message: error.error?.message || 'Failed to connect to WhatsApp',
        healthy: false,
      }
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'WhatsApp API unreachable',
      healthy: false,
    }
  }
}

/**
 * Check Stripe status
 */
async function checkStripeStatus(customerId: string | null) {
  if (!customerId) {
    return {
      status: 'not_configured',
      message: 'Stripe customer not configured',
      healthy: true, // Not required for basic functionality
    }
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return {
        status: 'error',
        message: 'Stripe secret key not configured',
        healthy: false,
      }
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    // Try to retrieve the customer
    const customer = await stripe.customers.retrieve(customerId)

    if (customer.deleted) {
      return {
        status: 'error',
        message: 'Stripe customer has been deleted',
        healthy: false,
      }
    }

    return {
      status: 'connected',
      message: 'Stripe connected successfully',
      healthy: true,
      details: {
        customer_id: customer.id,
        email: customer.email,
      },
    }
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return {
        status: 'error',
        message: error.message,
        healthy: false,
      }
    }
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Stripe API unreachable',
      healthy: false,
    }
  }
}

/**
 * Check Email service (Resend) status
 */
async function checkEmailStatus() {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return {
      status: 'not_configured',
      message: 'Email service (Resend) not configured',
      healthy: true, // Optional for basic functionality
    }
  }

  try {
    // Try to list domains (lightweight API call)
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    })

    if (response.ok) {
      return {
        status: 'connected',
        message: 'Email service ready',
        healthy: true,
      }
    } else {
      const error = await response.json()
      return {
        status: 'error',
        message: error.message || 'Failed to connect to email service',
        healthy: false,
      }
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Email service unreachable',
      healthy: false,
    }
  }
}

/**
 * Check Database connectivity
 */
async function checkDatabaseStatus(supabase: any) {
  try {
    // Simple query to check connection
    const { error } = await supabase.from('organizations').select('id').limit(1)

    if (error) {
      return {
        status: 'error',
        message: error.message,
        healthy: false,
      }
    }

    return {
      status: 'connected',
      message: 'Database connected',
      healthy: true,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database unreachable',
      healthy: false,
    }
  }
}

/**
 * Calculate overall status from individual integrations
 */
function calculateOverallStatus(statuses: any[]) {
  const allHealthy = statuses.every(s => s.healthy)
  const someUnhealthy = statuses.some(s => !s.healthy && s.status !== 'not_configured')

  if (allHealthy) {
    return 'healthy'
  } else if (someUnhealthy) {
    return 'degraded'
  } else {
    return 'partial'
  }
}
