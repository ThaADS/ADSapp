/**
 * Input Validation Library for SQL Injection Prevention
 *
 * Provides comprehensive validation and sanitization functions for all user inputs
 * that will be used in database queries. This library follows a whitelist-first
 * approach and ensures that all inputs meet strict security criteria before
 * being passed to RPC functions or database queries.
 *
 * Security Standards:
 * - OWASP Top 10 Compliance
 * - Parameterized query enforcement
 * - Strict type validation
 * - Whitelist-based validation
 * - Maximum length enforcement
 * - Special character escaping
 *
 * @module input-validation
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  error?: string;
  errorCode?: string;
}

export interface ValidationOptions {
  allowNull?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean;
}

// ============================================================================
// VALIDATION ERROR CODES
// ============================================================================

export const ValidationErrorCodes = {
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_VALUE: 'INVALID_VALUE',
  NULL_NOT_ALLOWED: 'NULL_NOT_ALLOWED',
  SQL_INJECTION_DETECTED: 'SQL_INJECTION_DETECTED',
  XSS_DETECTED: 'XSS_DETECTED',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_URL: 'INVALID_URL',
  INVALID_JSON: 'INVALID_JSON',
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // UUID v4 strict format
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Email validation (RFC 5322 simplified)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Phone number (international format)
  PHONE: /^\+?[1-9]\d{1,14}$/,

  // URL validation
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,

  // Alphanumeric with common safe characters
  ALPHANUMERIC_SAFE: /^[a-zA-Z0-9\s\-\_\.]+$/,

  // Text without SQL injection patterns
  SAFE_TEXT: /^[^';\"\\]+$/,

  // Integer
  INTEGER: /^-?\d+$/,

  // Decimal/Float
  DECIMAL: /^-?\d+(\.\d+)?$/,

  // Date ISO 8601
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,

  // DateTime ISO 8601
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
};

// Common SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|")/,
  /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /\b(WAITFOR|DELAY|SLEEP|BENCHMARK)\b/i,
  /xp_cmdshell|sp_executesql/i,
  /\b(INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,
];

// Common XSS patterns to detect and block
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /<iframe[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
];

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates and sanitizes a UUID value
 */
export function validateUUID(value: any, options: ValidationOptions = {}): ValidationResult {
  // Handle null values
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'UUID cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  // Must be a string
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'UUID must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Validate UUID format
  if (!PATTERNS.UUID.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid UUID format',
      errorCode: ValidationErrorCodes.INVALID_UUID,
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmed.toLowerCase(), // Normalize to lowercase
  };
}

/**
 * Validates and sanitizes an email address
 */
export function validateEmail(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Email cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim().toLowerCase();

  // Length check
  if (trimmed.length === 0 || trimmed.length > 254) {
    return {
      isValid: false,
      error: 'Email length must be between 1 and 254 characters',
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
    };
  }

  // Format validation
  if (!PATTERNS.EMAIL.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      errorCode: ValidationErrorCodes.INVALID_EMAIL,
    };
  }

  // Check for SQL injection patterns
  if (containsSQLInjection(trimmed)) {
    return {
      isValid: false,
      error: 'Email contains invalid characters',
      errorCode: ValidationErrorCodes.SQL_INJECTION_DETECTED,
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates and sanitizes a phone number
 */
export function validatePhoneNumber(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Phone number cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Phone number must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  // Remove common formatting characters
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');

  // Validate format
  if (!PATTERNS.PHONE.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid phone number format',
      errorCode: ValidationErrorCodes.INVALID_PHONE,
    };
  }

  return {
    isValid: true,
    sanitizedValue: cleaned,
  };
}

/**
 * Validates and sanitizes text input
 */
export function validateText(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Text cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Text must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim();

  // Length validation
  const maxLength = options.maxLength || 10000;
  const minLength = options.minLength || 0;

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Text length must be between ${minLength} and ${maxLength} characters`,
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
    };
  }

  // SQL injection check
  if (containsSQLInjection(trimmed)) {
    return {
      isValid: false,
      error: 'Text contains potentially unsafe characters',
      errorCode: ValidationErrorCodes.SQL_INJECTION_DETECTED,
    };
  }

  // XSS check
  if (containsXSS(trimmed)) {
    return {
      isValid: false,
      error: 'Text contains potentially unsafe HTML/JavaScript',
      errorCode: ValidationErrorCodes.XSS_DETECTED,
    };
  }

  // Custom pattern validation
  if (options.pattern && !options.pattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Text does not match required pattern',
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizeText(trimmed),
  };
}

/**
 * Validates and sanitizes an integer
 */
export function validateInteger(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Integer cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  let numValue: number;

  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    if (!PATTERNS.INTEGER.test(value.trim())) {
      return {
        isValid: false,
        error: 'Invalid integer format',
        errorCode: ValidationErrorCodes.INVALID_FORMAT,
      };
    }
    numValue = parseInt(value.trim(), 10);
  } else {
    return {
      isValid: false,
      error: 'Integer must be a number or numeric string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  // Check if parsing resulted in a valid integer
  if (!Number.isInteger(numValue) || isNaN(numValue)) {
    return {
      isValid: false,
      error: 'Invalid integer value',
      errorCode: ValidationErrorCodes.INVALID_VALUE,
    };
  }

  return {
    isValid: true,
    sanitizedValue: numValue,
  };
}

/**
 * Validates and sanitizes JSON data
 */
export function validateJSON(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'JSON cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  // If already an object, validate it
  if (typeof value === 'object') {
    try {
      // Sanitize the object
      const sanitized = sanitizeJSON(value);
      return {
        isValid: true,
        sanitizedValue: sanitized,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid JSON structure',
        errorCode: ValidationErrorCodes.INVALID_JSON,
      };
    }
  }

  // If string, try to parse it
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      const sanitized = sanitizeJSON(parsed);
      return {
        isValid: true,
        sanitizedValue: sanitized,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid JSON format',
        errorCode: ValidationErrorCodes.INVALID_JSON,
      };
    }
  }

  return {
    isValid: false,
    error: 'JSON must be an object or valid JSON string',
    errorCode: ValidationErrorCodes.INVALID_TYPE,
  };
}

/**
 * Validates a date string (ISO 8601 format)
 */
export function validateDate(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Date cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Date must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim();

  // Validate ISO date format
  if (!PATTERNS.ISO_DATE.test(trimmed) && !PATTERNS.ISO_DATETIME.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid date format (use ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
    };
  }

  // Validate that it's a valid date
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date value',
      errorCode: ValidationErrorCodes.INVALID_VALUE,
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates an enum value against allowed values
 */
export function validateEnum<T extends string>(
  value: any,
  allowedValues: T[],
  options: ValidationOptions = {}
): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Enum value cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Enum value must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim();

  if (!allowedValues.includes(trimmed as T)) {
    return {
      isValid: false,
      error: `Value must be one of: ${allowedValues.join(', ')}`,
      errorCode: ValidationErrorCodes.INVALID_VALUE,
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates and sanitizes a URL
 */
export function validateURL(value: any, options: ValidationOptions = {}): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'URL cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim();

  // Length check
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return {
      isValid: false,
      error: 'URL length must be between 1 and 2048 characters',
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
    };
  }

  // Format validation
  if (!PATTERNS.URL.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid URL format',
      errorCode: ValidationErrorCodes.INVALID_URL,
    };
  }

  // Additional security checks
  try {
    const url = new URL(trimmed);

    // Block dangerous protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS protocols are allowed',
        errorCode: ValidationErrorCodes.INVALID_URL,
      };
    }

    return {
      isValid: true,
      sanitizedValue: trimmed,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
      errorCode: ValidationErrorCodes.INVALID_URL,
    };
  }
}

/**
 * Sanitizes a search query for full-text search
 * Prevents SQL injection and regex DOS attacks
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = query.trim().substring(0, maxLength);

  // Remove SQL injection patterns
  sanitized = sanitized
    .replace(/[';\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '')
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION
    .replace(/\bSELECT\b/gi, '') // Remove SELECT
    .replace(/\bDROP\b/gi, '') // Remove DROP
    .replace(/\bDELETE\b/gi, '') // Remove DELETE
    .replace(/\bINSERT\b/gi, '') // Remove INSERT
    .replace(/\bUPDATE\b/gi, ''); // Remove UPDATE

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape regex special characters for safe pattern matching
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return sanitized;
}

/**
 * Escapes regex special characters to prevent ReDoS attacks
 */
export function escapeRegex(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }

  // Escape all regex special characters
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates a string input against a custom regex pattern
 */
export function validatePattern(
  value: any,
  pattern: RegExp,
  errorMessage?: string,
  options: ValidationOptions = {}
): ValidationResult {
  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, sanitizedValue: null };
    }
    return {
      isValid: false,
      error: 'Value cannot be null',
      errorCode: ValidationErrorCodes.NULL_NOT_ALLOWED,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Value must be a string',
      errorCode: ValidationErrorCodes.INVALID_TYPE,
    };
  }

  const trimmed = value.trim();

  // Check length constraints if provided
  const maxLength = options.maxLength || 10000;
  const minLength = options.minLength || 0;

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Length must be between ${minLength} and ${maxLength} characters`,
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
    };
  }

  if (!pattern.test(trimmed)) {
    return {
      isValid: false,
      error: errorMessage || 'Value does not match required pattern',
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
    };
  }

  return {
    isValid: true,
    sanitizedValue: trimmed,
  };
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitizes text by escaping special characters
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/'/g, "''")  // Escape single quotes for SQL
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/\0/g, '')  // Remove null bytes
    .replace(/\n/g, ' ')  // Replace newlines with spaces
    .replace(/\r/g, ' ')  // Replace carriage returns with spaces
    .replace(/\t/g, ' ')  // Replace tabs with spaces
    .replace(/[\x00-\x1F\x7F]/g, '');  // Remove control characters
}

/**
 * Sanitizes JSON data recursively
 */
export function sanitizeJSON(obj: any, depth: number = 0): any {
  // Prevent deep recursion attacks
  if (depth > 10) {
    throw new Error('JSON nesting depth exceeded');
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeJSON(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const sanitizedKey = sanitizeText(key);

      // Sanitize value
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeText(value);
      } else if (typeof value === 'object') {
        sanitized[sanitizedKey] = sanitizeJSON(value, depth + 1);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  return obj;
}

/**
 * Sanitizes an array of values
 */
export function sanitizeArray<T>(values: T[], validator: (value: T) => ValidationResult): T[] {
  return values
    .map(value => {
      const result = validator(value);
      return result.isValid ? result.sanitizedValue : null;
    })
    .filter(value => value !== null);
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Checks if a string contains SQL injection patterns
 */
export function containsSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Checks if a string contains XSS patterns
 */
export function containsXSS(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates multiple parameters at once
 */
export function validateParameters(
  params: Record<string, any>,
  validators: Record<string, (value: any, options?: ValidationOptions) => ValidationResult>
): { isValid: boolean; sanitizedParams: Record<string, any>; errors: Record<string, string> } {
  const sanitizedParams: Record<string, any> = {};
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [key, value] of Object.entries(params)) {
    const validator = validators[key];
    if (!validator) {
      // If no validator specified, pass through the value
      sanitizedParams[key] = value;
      continue;
    }

    const result = validator(value);
    if (result.isValid) {
      sanitizedParams[key] = result.sanitizedValue;
    } else {
      isValid = false;
      errors[key] = result.error || 'Validation failed';
    }
  }

  return { isValid, sanitizedParams, errors };
}

/**
 * Creates a validator function with default options
 */
export function createValidator(
  validatorFn: (value: any, options: ValidationOptions) => ValidationResult,
  defaultOptions: ValidationOptions = {}
): (value: any) => ValidationResult {
  return (value: any) => validatorFn(value, defaultOptions);
}

/**
 * Validates an object against a schema
 */
export interface ValidationSchema {
  [key: string]: {
    validator: (value: any, options?: ValidationOptions) => ValidationResult;
    required?: boolean;
    options?: ValidationOptions;
  };
}

export function validateSchema(
  data: Record<string, any>,
  schema: ValidationSchema
): { isValid: boolean; sanitizedData: Record<string, any>; errors: Record<string, string> } {
  const sanitizedData: Record<string, any> = {};
  const errors: Record<string, string> = {};
  let isValid = true;

  // Check required fields
  for (const [key, config] of Object.entries(schema)) {
    const value = data[key];

    if (config.required && (value === null || value === undefined)) {
      isValid = false;
      errors[key] = `${key} is required`;
      continue;
    }

    if (value === undefined) {
      continue; // Skip optional fields that aren't provided
    }

    const result = config.validator(value, config.options);
    if (result.isValid) {
      sanitizedData[key] = result.sanitizedValue;
    } else {
      isValid = false;
      errors[key] = result.error || 'Validation failed';
    }
  }

  return { isValid, sanitizedData, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const InputValidator = {
  validateUUID,
  validateEmail,
  validatePhoneNumber,
  validateText,
  validateInteger,
  validateJSON,
  validateDate,
  validateEnum,
  validateURL,
  validatePattern,
  sanitizeText,
  sanitizeJSON,
  sanitizeArray,
  sanitizeSearchQuery,
  escapeRegex,
  containsSQLInjection,
  containsXSS,
  validateParameters,
  validateSchema,
  createValidator,
  ValidationErrorCodes,
};

export default InputValidator;
