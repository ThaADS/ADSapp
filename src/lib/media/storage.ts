// @ts-nocheck - Type definitions need review
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export interface MediaFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  organizationId: string
  uploadedBy: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    [key: string]: any
  }
}

export interface UploadOptions {
  organizationId: string
  uploadedBy: string
  generateThumbnail?: boolean
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

export class MediaStorageService {
  private supabase = createClient()
  private bucketName = 'media'

  constructor() {
    this.supabase = createClient()
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<MediaFile> {
    // Validate file size
    if (options.maxSize && file.length > options.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${options.maxSize} bytes`)
    }

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    const fileId = uuidv4()
    const fileExtension = this.getFileExtension(originalName, mimeType)
    const fileName = `${options.organizationId}/${fileId}${fileExtension}`

    try {
      // Upload original file
      const { data: uploadData, error: uploadError } = await (await this.supabase).storage
        .from(this.bucketName)
        .upload(fileName, file, {
          contentType: mimeType,
          cacheControl: '3600',
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = await (await this.supabase).storage
        .from(this.bucketName)
        .getPublicUrl(fileName)

      let thumbnailUrl: string | undefined
      let metadata: any = {}

      // Generate thumbnail for images
      if (options.generateThumbnail && this.isImageType(mimeType)) {
        thumbnailUrl = await this.generateThumbnail(file, fileName, options.organizationId)
        metadata = await this.getImageMetadata(file)
      }

      // Store file record in database
      const mediaFile: MediaFile = {
        id: fileId,
        originalName,
        mimeType,
        size: file.length,
        url: urlData.publicUrl,
        thumbnailUrl,
        organizationId: options.organizationId,
        uploadedBy: options.uploadedBy,
        metadata,
      }

      const { error: dbError } = await (await this.supabase).from('media_files').insert({
        id: fileId,
        original_name: originalName,
        mime_type: mimeType,
        file_size: file.length,
        storage_path: fileName,
        url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        organization_id: options.organizationId,
        uploaded_by: options.uploadedBy,
        metadata,
      })

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await (await this.supabase).storage.from(this.bucketName).remove([fileName])
        throw new Error(`Failed to store file record: ${dbError.message}`)
      }

      return mediaFile
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  async getFile(fileId: string, organizationId: string): Promise<MediaFile | null> {
    const { data, error } = await (await this.supabase)
      .from('media_files')
      .select('*')
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      originalName: data.original_name,
      mimeType: data.mime_type,
      size: data.file_size,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      organizationId: data.organization_id,
      uploadedBy: data.uploaded_by,
      metadata: data.metadata,
    }
  }

  async deleteFile(fileId: string, organizationId: string): Promise<void> {
    const file = await this.getFile(fileId, organizationId)
    if (!file) {
      throw new Error('File not found')
    }

    try {
      // Extract storage path from URL or construct it
      const storagePath = `${organizationId}/${fileId}${this.getFileExtension(file.originalName, file.mimeType)}`

      // Delete from storage
      const { error: storageError } = await (await this.supabase).storage
        .from(this.bucketName)
        .remove([storagePath])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
      }

      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbnailPath = `${organizationId}/thumbnails/${fileId}.jpg`
        await (await this.supabase).storage.from(this.bucketName).remove([thumbnailPath])
      }

      // Delete from database
      const { error: dbError } = await (await this.supabase)
        .from('media_files')
        .delete()
        .eq('id', fileId)
        .eq('organization_id', organizationId)

      if (dbError) {
        throw new Error(`Failed to delete file record: ${dbError.message}`)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  async listFiles(
    organizationId: string,
    options?: {
      limit?: number
      offset?: number
      mimeType?: string
      uploadedBy?: string
    }
  ): Promise<{ files: MediaFile[]; total: number }> {
    let query = (await this.supabase)
      .from('media_files')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (options?.mimeType) {
      query = query.ilike('mime_type', `${options.mimeType}%`)
    }

    if (options?.uploadedBy) {
      query = query.eq('uploaded_by', options.uploadedBy)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    const { data, error, count } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    const files = (data || []).map(item => ({
      id: item.id,
      originalName: item.original_name,
      mimeType: item.mime_type,
      size: item.file_size,
      url: item.url,
      thumbnailUrl: item.thumbnail_url,
      organizationId: item.organization_id,
      uploadedBy: item.uploaded_by,
      metadata: item.metadata,
    }))

    return {
      files,
      total: count || 0,
    }
  }

  private async generateThumbnail(
    imageBuffer: Buffer,
    originalFileName: string,
    organizationId: string
  ): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      const fileId = originalFileName.split('/')[1].split('.')[0]
      const thumbnailPath = `${organizationId}/thumbnails/${fileId}.jpg`

      const { error } = await (await this.supabase).storage
        .from(this.bucketName)
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })

      if (error) {
        console.error('Error uploading thumbnail:', error)
        return ''
      }

      const { data: urlData } = await (await this.supabase).storage
        .from(this.bucketName)
        .getPublicUrl(thumbnailPath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      return ''
    }
  }

  private async getImageMetadata(imageBuffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(imageBuffer).metadata()
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
      }
    } catch (error) {
      console.error('Error getting image metadata:', error)
      return {}
    }
  }

  private isImageType(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  private getFileExtension(fileName: string, mimeType: string): string {
    // Try to get extension from filename
    const extensionFromName = fileName.split('.').pop()?.toLowerCase()
    if (extensionFromName && extensionFromName.length <= 4) {
      return `.${extensionFromName}`
    }

    // Fallback to mime type mapping
    const mimeTypeExtensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/json': '.json',
    }

    return mimeTypeExtensions[mimeType] || ''
  }

  async cleanupOrphanedFiles(organizationId: string): Promise<void> {
    // This method can be called periodically to clean up files that are no longer referenced
    try {
      // Find files that haven't been accessed in 30 days and aren't referenced in messages
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: orphanedFiles } = await (await this.supabase)
        .from('media_files')
        .select('id')
        .eq('organization_id', organizationId)
        .lt('created_at', thirtyDaysAgo)
        .not(
          'id',
          'in',
          `(SELECT DISTINCT media_file_id FROM messages WHERE media_file_id IS NOT NULL)`
        )

      if (orphanedFiles) {
        for (const file of orphanedFiles) {
          await this.deleteFile(file.id, organizationId)
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error)
    }
  }
}
