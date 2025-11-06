import { requireOrganization } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardDemoWrapper } from '@/components/dashboard/dashboard-demo-wrapper'
import { QuickActions } from '@/components/dashboard/quick-actions'

// ⚡ PERFORMANCE: Cache dashboard data for 30 seconds
export const revalidate = 30

export default async function DashboardPage() {
  const profile = await requireOrganization()
  const supabase = await createClient()

  // Fetch dashboard data
  const [{ data: conversations }, { data: messages }, { data: contacts }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, contact:contacts(*), last_message:messages(*)')
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false })
      .limit(5),

    supabase
      .from('messages')
      .select('*, conversation:conversations!inner(*)')
      .eq('conversation.organization_id', profile.organization_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),

    supabase.from('contacts').select('*').eq('organization_id', profile.organization_id),
  ])

  const stats = {
    totalConversations: conversations?.length || 0,
    todayMessages: messages?.length || 0,
    totalContacts: contacts?.length || 0,
    openConversations: conversations?.filter(c => c.status === 'open').length || 0,
  }

  return (
    <div className='space-y-8'>
      {/* Page header */}
      <div>
        <h1 className='text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight'>
          Dashboard
        </h1>
        <p className='mt-2 text-sm text-gray-500'>
          Welcome back, {profile.full_name}. Here's what's happening with your WhatsApp inbox.
        </p>
      </div>

      {/* Dashboard content with demo wrapper */}
      <DashboardDemoWrapper
        serverStats={stats}
        serverConversations={conversations || []}
        serverMessages={messages || []}
        profile={profile}
      />

      {/* Quick actions */}
      <QuickActions />
    </div>
  )
}
