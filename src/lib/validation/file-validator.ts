/**
 * File Upload Validation with Magic Byte Detection
 * Phase 30: Input Validation & Security
 *
 * Validates file uploads by checking:
 * - MIME type against whitelist
 * - File extension
 * - Magic bytes (file signature)
 * - File size
 */

// ============================================================================
// MAGIC BYTE SIGNATURES
// ============================================================================

/**
 * File type signatures (magic bytes)
 * Maps file types to their byte signatures for validation
 */
const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number; mask?: number[] }[]> = {
  // Images
  'image/jpeg': [
    { bytes: [0xff, 0xd8, 0xff] },
  ],
  'image/png': [
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP (need both)
  ],
  'image/bmp': [
    { bytes: [0x42, 0x4d] }, // BM
  ],
  'image/svg+xml': [
    { bytes: [0x3c, 0x73, 0x76, 0x67] }, // <svg
    { bytes: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] }, // <?xml
  ],

  // Videos
  'video/mp4': [
    { bytes: [0x00, 0x00, 0x00], offset: 0 }, // ftyp box
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp
  ],
  'video/webm': [
    { bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  ],
  'video/quicktime': [
    { bytes: [0x00, 0x00, 0x00], offset: 0 },
    { bytes: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], offset: 4 }, // ftypqt
  ],

  // Audio
  'audio/mpeg': [
    { bytes: [0xff, 0xfb] }, // MP3 frame sync
    { bytes: [0xff, 0xfa] },
    { bytes: [0xff, 0xf3] },
    { bytes: [0xff, 0xf2] },
    { bytes: [0x49, 0x44, 0x33] }, // ID3 tag
  ],
  'audio/wav': [
    { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  ],
  'audio/ogg': [
    { bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  ],
  'audio/webm': [
    { bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  ],
  'audio/aac': [
    { bytes: [0xff, 0xf1] }, // ADTS
    { bytes: [0xff, 0xf9] },
  ],

  // Documents
  'application/pdf': [
    { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  'application/msword': [
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // OLE
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  ],
  'application/vnd.ms-excel': [
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // OLE
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  ],
  'application/vnd.ms-powerpoint': [
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // OLE
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  ],

  // Archives
  'application/zip': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK
    { bytes: [0x50, 0x4b, 0x05, 0x06] }, // Empty archive
    { bytes: [0x50, 0x4b, 0x07, 0x08] }, // Spanned archive
  ],
  'application/gzip': [
    { bytes: [0x1f, 0x8b] },
  ],
  'application/x-rar-compressed': [
    { bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] }, // Rar!
  ],

  // Text/Data
  'application/json': [
    { bytes: [0x7b] }, // {
    { bytes: [0x5b] }, // [
  ],
  'text/csv': [
    // CSV doesn't have magic bytes, validated by extension only
  ],
  'text/plain': [
    // Plain text doesn't have magic bytes
  ],
}

// ============================================================================
// ALLOWED FILE TYPES BY CATEGORY
// ============================================================================

/**
 * Allowed file types for different upload contexts
 */
export const AllowedFileTypes = {
  /** Images allowed for general uploads */
  IMAGES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ] as const,

  /** Images for WhatsApp messages */
  WHATSAPP_IMAGES: [
    'image/jpeg',
    'image/png',
  ] as const,

  /** Videos allowed for uploads */
  VIDEOS: [
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ] as const,

  /** Audio files */
  AUDIO: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
  ] as const,

  /** Document files */
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ] as const,

  /** WhatsApp media (all supported types) */
  WHATSAPP_MEDIA: [
    'image/jpeg',
    'image/png',
    'video/mp4',
    'audio/mpeg',
    'audio/ogg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,

  /** CSV/data imports */
  DATA_IMPORT: [
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,

  /** Profile/avatar images */
  AVATAR: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const,

  /** All allowed types */
  ALL: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'application/json',
  ] as const,
}

export type AllowedFileCategory = keyof typeof AllowedFileTypes

// ============================================================================
// SIZE LIMITS
// ============================================================================

/**
 * File size limits by category (in bytes)
 */
export const FileSizeLimits = {
  /** Standard image: 10MB */
  IMAGE: 10 * 1024 * 1024,

  /** Avatar/profile image: 5MB */
  AVATAR: 5 * 1024 * 1024,

  /** Video: 100MB */
  VIDEO: 100 * 1024 * 1024,

  /** Audio: 25MB */
  AUDIO: 25 * 1024 * 1024,

  /** Document: 25MB */
  DOCUMENT: 25 * 1024 * 1024,

  /** WhatsApp image: 5MB (API limit) */
  WHATSAPP_IMAGE: 5 * 1024 * 1024,

  /** WhatsApp video: 16MB (API limit) */
  WHATSAPP_VIDEO: 16 * 1024 * 1024,

  /** WhatsApp audio: 16MB (API limit) */
  WHATSAPP_AUDIO: 16 * 1024 * 1024,

  /** WhatsApp document: 100MB (API limit) */
  WHATSAPP_DOCUMENT: 100 * 1024 * 1024,

  /** CSV/data import: 50MB */
  DATA_IMPORT: 50 * 1024 * 1024,

  /** Default max: 100MB */
  DEFAULT: 100 * 1024 * 1024,
}

export type FileSizeCategory = keyof typeof FileSizeLimits

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  errorCode?: string
  detectedType?: string
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  /** Allowed MIME types */
  allowedTypes?: readonly string[]
  /** Maximum file size in bytes */
  maxSize?: number
  /** Whether to check magic bytes */
  checkMagicBytes?: boolean
  /** Allowed file extensions (without dot) */
  allowedExtensions?: string[]
}

/**
 * Checks if file bytes match a signature
 */
function matchesSignature(
  buffer: Uint8Array,
  signature: { bytes: number[]; offset?: number; mask?: number[] }
): boolean {
  const offset = signature.offset || 0

  if (buffer.length < offset + signature.bytes.length) {
    return false
  }

  for (let i = 0; i < signature.bytes.length; i++) {
    const byte = buffer[offset + i]
    const expected = signature.bytes[i]
    const mask = signature.mask?.[i] ?? 0xff

    if ((byte & mask) !== (expected & mask)) {
      return false
    }
  }

  return true
}

/**
 * Detects file type from magic bytes
 */
export function detectFileType(buffer: Uint8Array): string | null {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (matchesSignature(buffer, signature)) {
        return mimeType
      }
    }
  }
  return null
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * Maps MIME type to expected extensions
 */
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/svg+xml': ['svg'],
  'image/bmp': ['bmp'],
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov', 'qt'],
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/ogg': ['ogg', 'oga'],
  'audio/webm': ['weba'],
  'audio/aac': ['aac'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/zip': ['zip'],
  'application/gzip': ['gz', 'gzip'],
  'text/csv': ['csv'],
  'application/json': ['json'],
  'text/plain': ['txt'],
}

/**
 * Validates file extension matches declared MIME type
 */
export function validateExtension(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename)
  if (!extension) return false

  const allowedExtensions = MIME_TO_EXTENSIONS[mimeType]
  if (!allowedExtensions) return true // Unknown type, skip extension check

  return allowedExtensions.includes(extension)
}

/**
 * Validates a file upload
 *
 * @param file - File object or file data
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateFile(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const {
    allowedTypes = AllowedFileTypes.ALL,
    maxSize = FileSizeLimits.DEFAULT,
    checkMagicBytes = true,
    allowedExtensions,
  } = options

  // Check file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxMB}MB`,
      errorCode: 'FILE_TOO_LARGE',
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
      errorCode: 'FILE_EMPTY',
    }
  }

  // Check MIME type against whitelist
  if (!allowedTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
      errorCode: 'INVALID_FILE_TYPE',
    }
  }

  // Check file extension
  const extension = getFileExtension(file.name)
  if (allowedExtensions && allowedExtensions.length > 0) {
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed`,
        errorCode: 'INVALID_EXTENSION',
      }
    }
  } else {
    // Validate extension matches MIME type
    if (!validateExtension(file.name, file.type)) {
      return {
        valid: false,
        error: `File extension .${extension} does not match declared type ${file.type}`,
        errorCode: 'EXTENSION_MISMATCH',
      }
    }
  }

  // Check magic bytes
  if (checkMagicBytes && FILE_SIGNATURES[file.type]) {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer.slice(0, 20)) // First 20 bytes are enough

      const detectedType = detectFileType(bytes)

      // For some types (like Office docs), we need special handling
      // as they share ZIP signature
      const zipBasedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ]

      if (zipBasedTypes.includes(file.type)) {
        // For Office formats, just check it's a valid ZIP
        if (detectedType !== 'application/zip' && detectedType !== file.type) {
          return {
            valid: false,
            error: 'File content does not match declared type',
            errorCode: 'MAGIC_BYTES_MISMATCH',
            detectedType: detectedType || undefined,
          }
        }
      } else if (detectedType && detectedType !== file.type) {
        // For other types, exact match required (with some exceptions)
        const compatibleTypes: Record<string, string[]> = {
          'audio/wav': ['audio/wav', 'video/avi'], // WAV and AVI share RIFF
        }

        const compatible = compatibleTypes[file.type]
        if (!compatible || !compatible.includes(detectedType)) {
          return {
            valid: false,
            error: 'File content does not match declared type',
            errorCode: 'MAGIC_BYTES_MISMATCH',
            detectedType,
          }
        }
      }
    } catch (error) {
      console.error('Error checking magic bytes:', error)
      // Don't fail on read errors, let the file through
    }
  }

  return { valid: true }
}

/**
 * Validates multiple files
 */
export async function validateFiles(
  files: Array<File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }>,
  options: FileValidationOptions & { maxFiles?: number } = {}
): Promise<{ valid: boolean; errors: Array<{ index: number; filename: string; error: string }> }> {
  const { maxFiles = 10, ...fileOptions } = options
  const errors: Array<{ index: number; filename: string; error: string }> = []

  if (files.length > maxFiles) {
    return {
      valid: false,
      errors: [{ index: -1, filename: '', error: `Maximum ${maxFiles} files allowed` }],
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const result = await validateFile(file, fileOptions)

    if (!result.valid) {
      errors.push({
        index: i,
        filename: file.name,
        error: result.error || 'Validation failed',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// CONVENIENCE VALIDATORS
// ============================================================================

/**
 * Validates an image upload
 */
export async function validateImageUpload(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  maxSize: number = FileSizeLimits.IMAGE
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: AllowedFileTypes.IMAGES,
    maxSize,
    checkMagicBytes: true,
  })
}

/**
 * Validates an avatar upload
 */
export async function validateAvatarUpload(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: AllowedFileTypes.AVATAR,
    maxSize: FileSizeLimits.AVATAR,
    checkMagicBytes: true,
  })
}

/**
 * Validates a WhatsApp media upload
 */
export async function validateWhatsAppMedia(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<FileValidationResult> {
  // Determine size limit based on type
  let maxSize = FileSizeLimits.WHATSAPP_DOCUMENT
  if (file.type.startsWith('image/')) {
    maxSize = FileSizeLimits.WHATSAPP_IMAGE
  } else if (file.type.startsWith('video/')) {
    maxSize = FileSizeLimits.WHATSAPP_VIDEO
  } else if (file.type.startsWith('audio/')) {
    maxSize = FileSizeLimits.WHATSAPP_AUDIO
  }

  return validateFile(file, {
    allowedTypes: AllowedFileTypes.WHATSAPP_MEDIA,
    maxSize,
    checkMagicBytes: true,
  })
}

/**
 * Validates a data import file (CSV, JSON, Excel)
 */
export async function validateDataImport(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: AllowedFileTypes.DATA_IMPORT,
    maxSize: FileSizeLimits.DATA_IMPORT,
    checkMagicBytes: true,
  })
}

/**
 * Validates a document upload
 */
export async function validateDocumentUpload(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<FileValidationResult> {
  return validateFile(file, {
    allowedTypes: AllowedFileTypes.DOCUMENTS,
    maxSize: FileSizeLimits.DOCUMENT,
    checkMagicBytes: true,
  })
}
