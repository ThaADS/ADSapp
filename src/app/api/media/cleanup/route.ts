// @ts-nocheck - Type definitions need review
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { MediaStorageService } from '@/lib/media/storage'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (must be admin)
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Check if user has admin privileges
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const { dryRun = true, olderThanDays = 30 } = body

    const supabase = await createClient()
    const mediaStorage = new MediaStorageService()

    // Find orphaned files
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: orphanedFiles, error } = await supabase
      .from('media_files')
      .select('id, original_name, file_size, created_at')
      .eq('organization_id', profile.organization_id)
      .lt('created_at', cutoffDate)
      .not(
        'id',
        'in',
        `(
        SELECT DISTINCT media_file_id
        FROM messages
        WHERE media_file_id IS NOT NULL
        AND organization_id = '${profile.organization_id}'
      )`
      )

    if (error) {
      throw error
    }

    const filesToDelete = orphanedFiles || []
    let totalSize = 0
    let deletedCount = 0

    if (!dryRun && filesToDelete.length > 0) {
      // Actually delete the files
      for (const file of filesToDelete) {
        try {
          await mediaStorage.deleteFile(file.id, profile.organization_id)
          totalSize += file.file_size
          deletedCount++
        } catch (error) {
          console.error(`Failed to delete file ${file.id}:`, error)
        }
      }
    } else {
      // Just calculate what would be deleted
      totalSize = filesToDelete.reduce((sum, file) => sum + file.file_size, 0)
    }

    return createSuccessResponse({
      dryRun,
      filesFound: filesToDelete.length,
      filesDeleted: dryRun ? 0 : deletedCount,
      spaceSaved: totalSize,
      spaceSavedMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      files: dryRun
        ? filesToDelete.map(f => ({
            id: f.id,
            name: f.original_name,
            size: f.file_size,
            createdAt: f.created_at,
          }))
        : undefined,
    })
  } catch (error) {
    console.error('Media cleanup error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Get storage statistics
    const { data: stats, error } = await supabase
      .from('media_files')
      .select('file_size, mime_type, created_at')
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    const totalFiles = stats?.length || 0
    const totalSize = stats?.reduce((sum, file) => sum + file.file_size, 0) || 0

    // Group by file type
    const byType = (stats || []).reduce(
      (acc, file) => {
        const type = file.mime_type.split('/')[0]
        if (!acc[type]) {
          acc[type] = { count: 0, size: 0 }
        }
        acc[type].count++
        acc[type].size += file.file_size
        return acc
      },
      {} as Record<string, { count: number; size: number }>
    )

    // Group by month
    const byMonth = (stats || []).reduce(
      (acc, file) => {
        const month = new Date(file.created_at).toISOString().substring(0, 7) // YYYY-MM
        if (!acc[month]) {
          acc[month] = { count: 0, size: 0 }
        }
        acc[month].count++
        acc[month].size += file.file_size
        return acc
      },
      {} as Record<string, { count: number; size: number }>
    )

    return createSuccessResponse({
      totalFiles,
      totalSize,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      byType,
      byMonth: Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12) // Last 12 months
        .reduce(
          (acc, [month, data]) => {
            acc[month] = data
            return acc
          },
          {} as Record<string, { count: number; size: number }>
        ),
    })
  } catch (error) {
    console.error('Media stats error:', error)
    return createErrorResponse(error)
  }
}
