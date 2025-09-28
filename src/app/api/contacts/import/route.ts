import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { BulkOperationQueue, BulkContactImportConfig } from '@/lib/bulk-operations/queue'
import { MediaStorageService } from '@/lib/media/storage'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mapping = JSON.parse(formData.get('mapping') as string || '{}')
    const options = JSON.parse(formData.get('options') as string || '{}')

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, Excel, or JSON files.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate mapping
    if (!mapping.phone_number) {
      return NextResponse.json(
        { error: 'Phone number field mapping is required' },
        { status: 400 }
      )
    }

    // Upload file to storage
    const mediaStorage = new MediaStorageService()
    const buffer = Buffer.from(await file.arrayBuffer())

    const uploadedFile = await mediaStorage.uploadFile(
      buffer,
      file.name,
      file.type,
      {
        organizationId: profile.organization_id,
        uploadedBy: user.id
      }
    )

    // Determine file format
    let format: 'csv' | 'json' | 'xlsx'
    if (file.type.includes('csv') || file.name.endsWith('.csv')) {
      format = 'csv'
    } else if (file.type.includes('json') || file.name.endsWith('.json')) {
      format = 'json'
    } else {
      format = 'xlsx'
    }

    // Create import configuration
    const importConfig: BulkContactImportConfig = {
      file: {
        url: uploadedFile.url,
        format
      },
      mapping,
      options: {
        skipDuplicates: options.skipDuplicates !== false,
        updateExisting: options.updateExisting === true,
        tagAll: options.tagAll || []
      }
    }

    // Estimate number of contacts
    const estimatedContacts = await estimateContactCount(file, format)

    // Create bulk operation
    const queue = new BulkOperationQueue()
    const operation = await queue.createOperation({
      organizationId: profile.organization_id,
      userId: user.id,
      type: 'bulk_contact_import',
      status: 'queued',
      totalItems: estimatedContacts,
      configuration: importConfig
    })

    return createSuccessResponse({
      operation,
      uploadedFile: {
        id: uploadedFile.id,
        name: uploadedFile.originalName,
        size: uploadedFile.size,
        url: uploadedFile.url
      },
      estimatedContacts,
      mapping,
      options: importConfig.options
    }, 201)

  } catch (error) {
    console.error('Contact import error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    const queue = new BulkOperationQueue()
    const result = await queue.listOperations(profile.organization_id, {
      type: 'bulk_contact_import',
      limit,
      offset
    })

    return createSuccessResponse({
      imports: result.operations,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: offset + limit < result.total
      }
    })

  } catch (error) {
    console.error('List contact imports error:', error)
    return createErrorResponse(error)
  }
}

async function estimateContactCount(file: File, format: string): Promise<number> {
  try {
    const text = await file.text()

    switch (format) {
      case 'csv':
        // Count lines minus header
        const lines = text.split('\n').filter(line => line.trim())
        return Math.max(0, lines.length - 1)

      case 'json':
        const data = JSON.parse(text)
        return Array.isArray(data) ? data.length : 1

      case 'xlsx':
        // For Excel files, we'll estimate based on file size
        // This is rough but works for the queue setup
        return Math.floor(file.size / 100) // ~100 bytes per row

      default:
        return 1
    }
  } catch (error) {
    console.error('Error estimating contact count:', error)
    return Math.floor(file.size / 100) // Fallback estimate
  }
}