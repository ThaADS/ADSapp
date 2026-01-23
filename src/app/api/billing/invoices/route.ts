import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (!organization?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: organization.stripe_customer_id,
      limit: 100,
      status: 'paid',
    })

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      number: invoice.number,
      description: invoice.lines.data[0]?.description || 'Subscription',
    }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
