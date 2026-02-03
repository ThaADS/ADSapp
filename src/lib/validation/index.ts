/**
 * Validation Module Entry Point
 * Phase 30: Input Validation & Security
 *
 * Centralized exports for all validation utilities
 */

// Zod schemas
export * from './schemas'

// Middleware
export {
  // UUID validation
  isValidUUID,
  validateUUIDParam,
  validateUUIDParams,
  // Body/Query validation
  validateBody,
  validateQuery,
  validateRoute,
  // Validation wrapper
  withValidation,
  // Error formatting
  formatZodError,
  // Re-export Zod for convenience
  z,
  ZodError,
  type ZodSchema,
  type ValidationResult,
  type RouteValidationOptions,
  type RouteValidationResult,
} from './middleware'

// File validation
export {
  // Validation functions
  validateFile,
  validateFiles,
  validateImageUpload,
  validateAvatarUpload,
  validateWhatsAppMedia,
  validateDataImport,
  validateDocumentUpload,
  // Detection utilities
  detectFileType,
  getFileExtension,
  validateExtension,
  // Type definitions
  AllowedFileTypes,
  FileSizeLimits,
  type AllowedFileCategory,
  type FileSizeCategory,
  type FileValidationResult,
  type FileValidationOptions,
} from './file-validator'
