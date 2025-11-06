'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AIAnalytics } from '@/components/dashboard/ai-analytics'

export default function AIAnalyticsPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizationId()
  }, [])

  const loadOrganizationId = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id)
      }
    } catch (err) {
      console.error('Load organization error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-12'>
        <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
        <p className='text-red-800'>Organization not found</p>
      </div>
    )
  }

  return <AIAnalytics organizationId={organizationId} />
}
