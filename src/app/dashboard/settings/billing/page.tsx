import { requireOrganization } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { BillingDashboard } from '@/components/billing/billing-dashboard'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/server'

export default async function BillingPage() {
  const profile = await requireOrganization()
  const supabase = await createClient()

  // Get organization with billing info
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  if (!organization) {
    throw new Error('Organization not found')
  }

  // Get current usage data directly from database (server-side)
  // Get plan limits based on subscription tier
  const planLimits = {
    starter: { users: 5, contacts: 1000, messages: 5000 },
    professional: { users: 20, contacts: 10000, messages: 50000 },
    enterprise: { users: -1, contacts: -1, messages: -1 }, // unlimited
  }

  const currentPlan = organization.subscription_tier || 'starter'
  const limits = planLimits[currentPlan as keyof typeof planLimits] || planLimits.starter

  // Fetch actual usage counts
  const [usersCount, contactsCount, messagesCount] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id),
  ])

  const usage = {
    users: {
      current: usersCount.count || 0,
      limit: limits.users,
      unlimited: limits.users === -1,
    },
    contacts: {
      current: contactsCount.count || 0,
      limit: limits.contacts,
      unlimited: limits.contacts === -1,
    },
    messages: {
      current: messagesCount.count || 0,
      limit: limits.messages,
      unlimited: limits.messages === -1,
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your subscription, view usage, and update billing information.
        </p>
      </div>

      <BillingDashboard
        organization={organization}
        profile={profile}
        usage={usage}
        plans={SUBSCRIPTION_PLANS}
      />
    </div>
  )
}