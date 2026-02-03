/**
 * API Utilities Entry Point
 * Phase 31: Code Quality & Documentation
 *
 * Centralized exports for API route utilities
 */

// Error handling
export {
  // Error classes
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  // Error factory
  Errors,
  ErrorCode,
  type ErrorCodeType,
  type ErrorResponse,
  // Response helpers
  createErrorResponse,
  withErrorHandler,
  successResponse,
  paginatedResponse,
  noContentResponse,
  createdResponse,
  type HandlerOptions,
} from './error-handler'
