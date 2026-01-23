import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { MediaStorageService } from '@/lib/media/storage'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const profile = await getUserOrganization(user.id)

    const mediaStorage = new MediaStorageService()
    const file = await mediaStorage.getFile(id, profile.organization_id)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return createSuccessResponse({ file })
  } catch (error) {
    console.error('Media get error:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const profile = await getUserOrganization(user.id)

    const mediaStorage = new MediaStorageService()
    await mediaStorage.deleteFile(id, profile.organization_id)

    return createSuccessResponse({ deleted: true })
  } catch (error) {
    console.error('Media delete error:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const { id } = await params
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { metadata } = body

    if (!metadata) {
      return NextResponse.json({ error: 'Metadata is required' }, { status: 400 })
    }

    // Update file metadata
    const mediaStorage = new MediaStorageService()
    const file = await mediaStorage.getFile(id, profile.organization_id)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Update metadata in database
    const supabase = await createClient()
    const { data: updatedFile, error } = await supabase
      .from('media_files')
      .update({
        metadata: { ...file.metadata, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return createSuccessResponse({ file: updatedFile })
  } catch (error) {
    console.error('Media update error:', error)
    return createErrorResponse(error)
  }
}
