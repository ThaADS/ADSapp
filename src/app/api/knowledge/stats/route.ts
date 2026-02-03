/**
 * Knowledge Stats API
 * Purpose: Get knowledge base statistics and analytics
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKnowledgeStats } from '@/lib/knowledge'

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const stats = await getKnowledgeStats(profile.organization_id)

    // Get settings for limits
    const { data: settings } = await supabase
      .from('knowledge_settings')
      .select('max_documents, max_storage_mb, max_queries_per_day')
      .eq('organization_id', profile.organization_id)
      .single()

    return NextResponse.json({
      stats,
      limits: {
        maxDocuments: settings?.max_documents || 100,
        maxStorageMb: settings?.max_storage_mb || 500,
        maxQueriesPerDay: settings?.max_queries_per_day || 1000,
      },
      usage: {
        documentsUsedPercent: Math.round(
          (stats.totalDocuments / (settings?.max_documents || 100)) * 100
        ),
        storageUsedPercent: Math.round(
          (stats.totalStorageBytes / ((settings?.max_storage_mb || 500) * 1024 * 1024)) * 100
        ),
        queriesUsedPercent: Math.round(
          (stats.queriesToday / (settings?.max_queries_per_day || 1000)) * 100
        ),
      },
    })
  } catch (error) {
    console.error('Get knowledge stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
