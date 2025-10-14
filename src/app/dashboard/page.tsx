import { requireOrganization } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { OptimizedDashboardStats } from '@/components/dashboard/optimized-stats'
import { RecentConversations } from '@/components/dashboard/recent-conversations'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

export default async function DashboardPage() {
  const profile = await requireOrganization()
  const supabase = await createClient()

  // Fetch dashboard data
  const [
    { data: conversations },
    { data: messages },
    { data: contacts },
  ] = await Promise.all([
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

    supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', profile.organization_id)
  ])

  const stats = {
    totalConversations: conversations?.length || 0,
    todayMessages: messages?.length || 0,
    totalContacts: contacts?.length || 0,
    openConversations: conversations?.filter(c => c.status === 'open').length || 0,
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Welcome back, {profile.full_name}. Here's what's happening with your WhatsApp inbox.
        </p>
      </div>

      {/* Stats */}
      <OptimizedDashboardStats stats={stats} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent conversations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Conversations
            </h3>
          </div>
          <RecentConversations conversations={conversations || []} />
        </div>

        {/* Activity feed */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity
            </h3>
          </div>
          <ActivityFeed messages={messages || []} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center p-4 text-center bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div className="w-8 h-8 mb-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">New Conversation</span>
            </button>

            <button className="flex flex-col items-center p-4 text-center bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="w-8 h-8 mb-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Add Contact</span>
            </button>

            <button className="flex flex-col items-center p-4 text-center bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <div className="w-8 h-8 mb-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-purple-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Create Template</span>
            </button>

            <button className="flex flex-col items-center p-4 text-center bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="w-8 h-8 mb-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-orange-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Setup Automation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}