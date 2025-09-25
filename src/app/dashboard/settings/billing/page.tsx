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

  // Get current usage data
  const usageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/usage`, {
    headers: {
      'Authorization': `Bearer ${profile.id}`, // This would need proper auth
    },
  })

  let usage = null
  if (usageResponse.ok) {
    const data = await usageResponse.json()
    usage = data.usage
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