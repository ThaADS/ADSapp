/**
 * CRM Integrations Settings Page
 *
 * Manage CRM connections, field mappings, and sync settings
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CRMSettings from '@/components/settings/crm/CRMSettings'

export const metadata = {
  title: 'CRM Integrations - Settings',
  description: 'Connect and manage your CRM integrations',
}

export default async function CRMSettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/signin')
  }

  // Get user profile and organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Check permissions (only admin/owner can manage CRM)
  if (profile.role !== 'admin' && profile.role !== 'owner') {
    redirect('/dashboard')
  }

  // Get existing CRM connections
  const { data: connections } = await supabase
    .from('crm_connections')
    .select('*')
    .eq('organization_id', profile.organization_id)

  // Get sync history for all connections
  const syncHistory = connections
    ? await Promise.all(
        connections.map(async conn => {
          const { data: logs } = await supabase
            .from('crm_sync_logs')
            .select('*')
            .eq('connection_id', conn.id)
            .order('started_at', { ascending: false })
            .limit(5)

          return {
            connectionId: conn.id,
            crmType: conn.crm_type,
            logs: logs || [],
          }
        })
      )
    : []

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CRM Integrations</h1>
        <p className="text-gray-600">
          Connect your CRM to sync contacts, deals, and activities automatically
        </p>
      </div>

      <Suspense fallback={<CRMSettingsSkeleton />}>
        <CRMSettings
          organizationId={profile.organization_id}
          connections={connections || []}
          syncHistory={syncHistory}
        />
      </Suspense>
    </div>
  )
}

function CRMSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 rounded mb-4" />
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
