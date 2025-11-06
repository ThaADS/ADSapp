// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { MediaStorageService } from '@/lib/media/storage'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { fileId, operations } = body

    if (!fileId || !operations) {
      return NextResponse.json({ error: 'File ID and operations are required' }, { status: 400 })
    }

    const mediaStorage = new MediaStorageService()
    const file = await mediaStorage.getFile(fileId, profile.organization_id)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Only process image files
    if (!file.mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Download original file
    const response = await fetch(file.url)
    const originalBuffer = Buffer.from(await response.arrayBuffer())

    let processedBuffer = originalBuffer
    let processor = sharp(originalBuffer)

    // Apply operations
    for (const operation of operations) {
      switch (operation.type) {
        case 'resize':
          processor = processor.resize(operation.width, operation.height, {
            fit: operation.fit || 'cover',
            withoutEnlargement: operation.withoutEnlargement || false,
          })
          break

        case 'crop':
          processor = processor.extract({
            left: operation.left,
            top: operation.top,
            width: operation.width,
            height: operation.height,
          })
          break

        case 'rotate':
          processor = processor.rotate(operation.angle)
          break

        case 'blur':
          processor = processor.blur(operation.sigma || 1)
          break

        case 'sharpen':
          processor = processor.sharpen()
          break

        case 'grayscale':
          processor = processor.grayscale()
          break

        case 'format':
          switch (operation.format) {
            case 'jpeg':
              processor = processor.jpeg({ quality: operation.quality || 80 })
              break
            case 'png':
              processor = processor.png({ quality: operation.quality || 80 })
              break
            case 'webp':
              processor = processor.webp({ quality: operation.quality || 80 })
              break
          }
          break

        case 'watermark':
          if (operation.text) {
            // Text watermark
            const svgText = `
              <svg width="${operation.width || 200}" height="${operation.height || 50}">
                <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
                      font-family="${operation.fontFamily || 'Arial'}"
                      font-size="${operation.fontSize || 16}"
                      fill="${operation.color || 'white'}"
                      opacity="${operation.opacity || 0.5}">
                  ${operation.text}
                </text>
              </svg>
            `
            const textBuffer = Buffer.from(svgText)
            processor = processor.composite([
              {
                input: textBuffer,
                gravity: operation.position || 'southeast',
              },
            ])
          }
          break
      }
    }

    // Process the image
    processedBuffer = await processor.toBuffer()

    // Upload processed file
    const processedFile = await mediaStorage.uploadFile(
      processedBuffer,
      `processed_${file.originalName}`,
      file.mimeType,
      {
        organizationId: profile.organization_id,
        uploadedBy: user.id,
        generateThumbnail: true,
      }
    )

    return createSuccessResponse({
      originalFile: file,
      processedFile,
      operations,
    })
  } catch (error) {
    console.error('Media processing error:', error)
    return createErrorResponse(error)
  }
}
