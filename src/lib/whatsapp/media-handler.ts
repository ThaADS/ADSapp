// @ts-nocheck - Type definitions need review
import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from './client'

export interface MediaFile {
  id: string
  messageId: string
  whatsappMediaId: string
  filename: string
  mimeType: string
  fileSize: number
  url?: string
  thumbnailUrl?: string
  downloadUrl?: string
  uploadedAt: Date
  expiresAt?: Date
}

export interface MediaUploadResult {
  success: boolean
  mediaId?: string
  url?: string
  error?: string
}

export interface MediaProcessingOptions {
  generateThumbnail?: boolean
  compressionLevel?: 'low' | 'medium' | 'high'
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export class WhatsAppMediaHandler {
  private client: WhatsAppClient
  private supabase = createClient()

  constructor(accessToken: string, phoneNumberId: string) {
    this.client = new WhatsAppClient(accessToken, phoneNumberId)
  }

  /**
   * Download media file from WhatsApp
   */
  async downloadMedia(
    mediaId: string,
    messageId: string,
    organizationId: string,
    options?: MediaProcessingOptions
  ): Promise<MediaFile> {
    try {
      // Get media info from WhatsApp API
      const mediaInfo = await this.getMediaInfo(mediaId)

      // Download the actual media file
      const mediaResponse = await this.downloadMediaFile(mediaInfo.url)
      const buffer = await mediaResponse.arrayBuffer()

      // Generate filename if not provided
      const filename = this.generateFilename(mediaInfo.mime_type, mediaId)

      // Upload to storage (Supabase Storage)
      const storagePath = `media/${organizationId}/${mediaId}/${filename}`
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('whatsapp-media')
        .upload(storagePath, buffer, {
          contentType: mediaInfo.mime_type,
          cacheControl: '3600',
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(storagePath)

      // Process media if needed (thumbnails, compression)
      let thumbnailUrl: string | undefined
      if (options?.generateThumbnail && this.isImage(mediaInfo.mime_type)) {
        thumbnailUrl = await this.generateThumbnail(buffer, mediaInfo.mime_type, storagePath)
      }

      // Create media record in database
      const mediaFile: MediaFile = {
        id: crypto.randomUUID(),
        messageId,
        whatsappMediaId: mediaId,
        filename,
        mimeType: mediaInfo.mime_type,
        fileSize: buffer.byteLength,
        url: urlData.publicUrl,
        thumbnailUrl,
        downloadUrl: urlData.publicUrl,
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }

      // Store media info in database
      const { error: dbError } = await this.supabase.from('message_media').insert({
        id: mediaFile.id,
        message_id: messageId,
        whatsapp_media_id: mediaId,
        filename: mediaFile.filename,
        mime_type: mediaFile.mimeType,
        file_size: mediaFile.fileSize,
        storage_path: storagePath,
        url: mediaFile.url,
        thumbnail_url: thumbnailUrl,
        expires_at: mediaFile.expiresAt?.toISOString(),
      })

      if (dbError) {
        console.error('Failed to store media info:', dbError)
        // Don't throw error, media is already uploaded
      }

      return mediaFile
    } catch (error) {
      throw new Error(
        `Media download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Upload media file to WhatsApp for sending
   */
  async uploadMedia(
    file: File | Buffer,
    mimeType: string,
    filename?: string
  ): Promise<MediaUploadResult> {
    try {
      const formData = new FormData()

      if (file instanceof Buffer) {
        const blob = new Blob([file], { type: mimeType })
        formData.append('file', blob, filename || 'media')
      } else {
        formData.append('file', file)
      }

      formData.append('messaging_product', 'whatsapp')
      formData.append('type', this.getMediaType(mimeType))

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.client.phoneNumberId}/media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.client.accessToken}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Upload failed: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      return {
        success: true,
        mediaId: result.id,
        url: result.url,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get media information from WhatsApp API
   */
  private async getMediaInfo(
    mediaId: string
  ): Promise<{ url: string; mime_type: string; sha256: string; file_size: number; id: string }> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.client.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get media info: ${error.error?.message || 'Unknown error'}`)
    }

    return await response.json()
  }

  /**
   * Download media file from WhatsApp URL
   */
  private async downloadMediaFile(url: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.client.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to download media file')
    }

    return response
  }

  /**
   * Generate thumbnail for images
   */
  private async generateThumbnail(
    buffer: ArrayBuffer,
    mimeType: string,
    originalPath: string
  ): Promise<string | undefined> {
    try {
      if (!this.isImage(mimeType)) {
        return undefined
      }

      // This would use a proper image processing library like sharp
      // For now, we'll just return the original image for thumbnails
      const thumbnailPath = originalPath.replace(/(\.[^.]+)$/, '_thumb$1')

      const { data: thumbnailData, error } = await this.supabase.storage
        .from('whatsapp-media')
        .upload(thumbnailPath, buffer, {
          contentType: mimeType,
          cacheControl: '3600',
        })

      if (error) {
        console.error('Thumbnail generation failed:', error)
        return undefined
      }

      const { data: urlData } = this.supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(thumbnailPath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      return undefined
    }
  }

  /**
   * Generate appropriate filename based on MIME type
   */
  private generateFilename(mimeType: string, mediaId: string): string {
    const timestamp = Date.now()
    const extension = this.getFileExtension(mimeType)
    return `${mediaId}_${timestamp}.${extension}`
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
      'text/csv': 'csv',
    }

    return mimeMap[mimeType] || 'bin'
  }

  /**
   * Get WhatsApp media type from MIME type
   */
  private getMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  /**
   * Check if MIME type is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Check if MIME type is a video
   */
  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/')
  }

  /**
   * Check if MIME type is audio
   */
  private isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/')
  }

  /**
   * Get media files for a conversation
   */
  async getConversationMedia(conversationId: string): Promise<MediaFile[]> {
    try {
      const { data, error } = await this.supabase
        .from('message_media')
        .select(
          `
          *,
          message:messages(id, conversation_id, created_at)
        `
        )
        .eq('message.conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get conversation media: ${error.message}`)
      }

      return (
        data?.map(item => ({
          id: item.id,
          messageId: item.message_id,
          whatsappMediaId: item.whatsapp_media_id,
          filename: item.filename,
          mimeType: item.mime_type,
          fileSize: item.file_size,
          url: item.url,
          thumbnailUrl: item.thumbnail_url,
          downloadUrl: item.url,
          uploadedAt: new Date(item.created_at),
          expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        })) || []
      )
    } catch (error) {
      throw new Error(
        `Failed to get conversation media: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get media gallery for organization
   */
  async getMediaGallery(
    organizationId: string,
    options?: {
      type?: 'image' | 'video' | 'audio' | 'document'
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
    }
  ): Promise<{
    media: MediaFile[]
    total: number
    hasMore: boolean
  }> {
    try {
      let query = this.supabase
        .from('message_media')
        .select(
          `
          *,
          message:messages!inner(
            id,
            conversation:conversations!inner(
              id,
              organization_id
            )
          )
        `,
          { count: 'exact' }
        )
        .eq('message.conversation.organization_id', organizationId)

      // Apply filters
      if (options?.type) {
        const mimePrefix = options.type === 'document' ? 'application/' : `${options.type}/`
        query = query.like('mime_type', `${mimePrefix}%`)
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString())
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString())
      }

      // Apply pagination
      const limit = options?.limit || 50
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1)
      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to get media gallery: ${error.message}`)
      }

      const media: MediaFile[] =
        data?.map(item => ({
          id: item.id,
          messageId: item.message_id,
          whatsappMediaId: item.whatsapp_media_id,
          filename: item.filename,
          mimeType: item.mime_type,
          fileSize: item.file_size,
          url: item.url,
          thumbnailUrl: item.thumbnail_url,
          downloadUrl: item.url,
          uploadedAt: new Date(item.created_at),
          expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
        })) || []

      return {
        media,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      }
    } catch (error) {
      throw new Error(
        `Failed to get media gallery: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete expired media files
   */
  async cleanupExpiredMedia(): Promise<{ deletedCount: number }> {
    try {
      const { data: expiredMedia, error: selectError } = await this.supabase
        .from('message_media')
        .select('id, storage_path')
        .lt('expires_at', new Date().toISOString())

      if (selectError) {
        throw new Error(`Failed to get expired media: ${selectError.message}`)
      }

      if (!expiredMedia || expiredMedia.length === 0) {
        return { deletedCount: 0 }
      }

      // Delete from storage
      const storagePaths = expiredMedia.map(item => item.storage_path)
      const { error: storageError } = await this.supabase.storage
        .from('whatsapp-media')
        .remove(storagePaths)

      if (storageError) {
        console.error('Failed to delete from storage:', storageError)
      }

      // Delete from database
      const mediaIds = expiredMedia.map(item => item.id)
      const { error: deleteError } = await this.supabase
        .from('message_media')
        .delete()
        .in('id', mediaIds)

      if (deleteError) {
        throw new Error(`Failed to delete from database: ${deleteError.message}`)
      }

      return { deletedCount: expiredMedia.length }
    } catch (error) {
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get media file size limits for WhatsApp
   */
  static getFileSizeLimits(): Record<string, number> {
    return {
      image: 5 * 1024 * 1024, // 5MB
      video: 16 * 1024 * 1024, // 16MB
      audio: 16 * 1024 * 1024, // 16MB
      document: 100 * 1024 * 1024, // 100MB
    }
  }

  /**
   * Validate media file before upload
   */
  static validateMediaFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const limits = WhatsAppMediaHandler.getFileSizeLimits()

    // Check file size
    const mediaType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'document'

    if (file.size > limits[mediaType]) {
      errors.push(`File size exceeds limit of ${limits[mediaType] / (1024 * 1024)}MB`)
    }

    // Check supported formats
    const supportedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/webp',
      // Videos
      'video/mp4',
      'video/3gpp',
      // Audio
      'audio/aac',
      'audio/mp4',
      'audio/mpeg',
      'audio/amr',
      'audio/ogg',
      // Documents
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ]

    if (!supportedTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Media Gallery Interface
 */
export interface MediaGalleryItem {
  id: string
  filename: string
  mimeType: string
  fileSize: number
  url: string
  thumbnailUrl?: string
  uploadedAt: Date
  conversationId: string
  contactName?: string
}

/**
 * Media Statistics
 */
export interface MediaStats {
  totalFiles: number
  totalSize: number
  byType: {
    images: number
    videos: number
    audio: number
    documents: number
  }
  recentUploads: number
  storageUsed: string
}

/**
 * Media Gallery Manager
 */
export class MediaGalleryManager {
  private supabase = createClient()

  async getMediaStats(organizationId: string): Promise<MediaStats> {
    try {
      const { data, error } = await this.supabase
        .from('message_media')
        .select(
          `
          mime_type,
          file_size,
          created_at,
          message:messages!inner(
            conversation:conversations!inner(organization_id)
          )
        `
        )
        .eq('message.conversation.organization_id', organizationId)

      if (error) {
        throw new Error(`Failed to get media stats: ${error.message}`)
      }

      const stats: MediaStats = {
        totalFiles: data?.length || 0,
        totalSize: data?.reduce((sum, item) => sum + item.file_size, 0) || 0,
        byType: {
          images: 0,
          videos: 0,
          audio: 0,
          documents: 0,
        },
        recentUploads: 0,
        storageUsed: '',
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      data?.forEach(item => {
        if (item.mime_type.startsWith('image/')) stats.byType.images++
        else if (item.mime_type.startsWith('video/')) stats.byType.videos++
        else if (item.mime_type.startsWith('audio/')) stats.byType.audio++
        else stats.byType.documents++

        if (new Date(item.created_at) > weekAgo) {
          stats.recentUploads++
        }
      })

      // Format storage used
      stats.storageUsed = this.formatFileSize(stats.totalSize)

      return stats
    } catch (error) {
      throw new Error(
        `Failed to get media stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
