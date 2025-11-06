import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
  rateLimit,
} from '@/lib/api-utils'
import { MediaStorageService } from '@/lib/media/storage'

// Rate limit media uploads
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 uploads per minute
  keyGenerator: request => request.headers.get('x-user-id') || 'anonymous',
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    await uploadRateLimit(request)

    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const generateThumbnail = formData.get('generateThumbnail') === 'true'
    const category = (formData.get('category') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} is not allowed` }, { status: 400 })
    }

    const maxSize = 16 * 1024 * 1024 // 16MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSize} bytes` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload file
    const mediaStorage = new MediaStorageService()
    const mediaFile = await mediaStorage.uploadFile(buffer, file.name, file.type, {
      organizationId: profile.organization_id,
      uploadedBy: user.id,
      generateThumbnail,
      maxSize,
      allowedTypes,
    })

    return createSuccessResponse(
      {
        file: mediaFile,
        category,
      },
      201
    )
  } catch (error) {
    console.error('Media upload error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
    const mimeType = searchParams.get('mimeType') || undefined
    const uploadedBy = searchParams.get('uploadedBy') || undefined

    const mediaStorage = new MediaStorageService()
    const result = await mediaStorage.listFiles(profile.organization_id, {
      limit,
      offset,
      mimeType,
      uploadedBy,
    })

    return createSuccessResponse({
      files: result.files,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    console.error('Media list error:', error)
    return createErrorResponse(error)
  }
}
