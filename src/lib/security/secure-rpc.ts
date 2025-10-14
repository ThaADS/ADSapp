/**
 * Secure RPC Wrapper for SQL Injection Prevention
 *
 * Provides a secure wrapper around Supabase RPC function calls with automatic
 * input validation, parameter sanitization, and SQL injection prevention.
 *
 * Security Features:
 * - Automatic parameter validation and sanitization
 * - Function name whitelist enforcement
 * - SQL injection detection and blocking
 * - Audit logging of all RPC calls
 * - Rate limiting support
 * - Type-safe parameter passing
 *
 * Usage:
 * ```typescript
 * import { secureRpc } from '@/lib/security/secure-rpc';
 *
 * const result = await secureRpc(supabase, 'get_user_conversations', {
 *   user_id: userId,
 *   limit: 10
 * });
 * ```
 *
 * @module secure-rpc
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  InputValidator,
  ValidationResult,
  ValidationErrorCodes,
  type ValidationSchema,
} from './input-validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SecureRpcOptions {
  skipValidation?: boolean;  // Bypass validation (use with extreme caution)
  skipAuditLog?: boolean;  // Skip audit logging
  timeout?: number;  // Timeout in milliseconds
  retries?: number;  // Number of retry attempts
  customValidators?: Record<string, (value: any) => ValidationResult>;
}

export interface SecureRpcResult<T = any> {
  data: T | null;
  error: Error | null;
  validationErrors?: Record<string, string>;
  executionTime?: number;
}

export interface RpcFunctionConfig {
  name: string;
  description: string;
  parameterSchema: ValidationSchema;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresAuth: boolean;
  rateLimitPerMinute?: number;
}

// ============================================================================
// WHITELISTED RPC FUNCTIONS
// ============================================================================

/**
 * Whitelist of allowed RPC functions with their validation schemas
 * This prevents calling arbitrary functions and ensures proper validation
 */
export const WHITELISTED_RPC_FUNCTIONS: Record<string, RpcFunctionConfig> = {
  // ========================================
  // REPORTING & ANALYTICS FUNCTIONS
  // ========================================
  get_revenue_analytics: {
    name: 'get_revenue_analytics',
    description: 'Get comprehensive revenue analytics for a period',
    parameterSchema: {
      start_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      end_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      granularity: {
        validator: (value) => InputValidator.validateEnum(value, ['day', 'week', 'month']),
        required: false,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 60,
  },

  get_user_engagement_metrics: {
    name: 'get_user_engagement_metrics',
    description: 'Get user engagement metrics for analytics',
    parameterSchema: {
      start_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      end_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      organization_id: {
        validator: InputValidator.validateUUID,
        required: false,
        options: { allowNull: true },
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 60,
  },

  get_system_performance_metrics: {
    name: 'get_system_performance_metrics',
    description: 'Get system performance monitoring metrics',
    parameterSchema: {
      start_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      end_date: {
        validator: InputValidator.validateDate,
        required: true,
      },
      interval_type: {
        validator: (value) => InputValidator.validateEnum(value, ['minute', 'hour', 'day']),
        required: false,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 60,
  },

  predict_churn_rate: {
    name: 'predict_churn_rate',
    description: 'Predict churn rate for future periods',
    parameterSchema: {
      periods_ahead: {
        validator: InputValidator.validateInteger,
        required: true,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 30,
  },

  predict_new_customers: {
    name: 'predict_new_customers',
    description: 'Predict new customer acquisition',
    parameterSchema: {
      periods_ahead: {
        validator: InputValidator.validateInteger,
        required: true,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 30,
  },

  // ========================================
  // SUPER ADMIN FUNCTIONS
  // ========================================
  log_super_admin_action: {
    name: 'log_super_admin_action',
    description: 'Log super admin actions for audit trail',
    parameterSchema: {
      admin_user_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      action_name: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 100 }),
        required: true,
      },
      target_type: {
        validator: (value) =>
          InputValidator.validateEnum(value, ['organization', 'profile', 'system', 'billing']),
        required: true,
      },
      target_id: {
        validator: InputValidator.validateUUID,
        required: false,
        options: { allowNull: true },
      },
      action_details: {
        validator: InputValidator.validateJSON,
        required: false,
      },
      ip_addr: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 45, allowNull: true }),
        required: false,
      },
      user_agent: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 500, allowNull: true }),
        required: false,
      },
    },
    riskLevel: 'high',
    requiresAuth: true,
    rateLimitPerMinute: 100,
  },

  get_organization_metrics_summary: {
    name: 'get_organization_metrics_summary',
    description: 'Get organization metrics summary for super admin',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      days: {
        validator: InputValidator.validateInteger,
        required: false,
      },
    },
    riskLevel: 'medium',
    requiresAuth: true,
    rateLimitPerMinute: 60,
  },

  suspend_organization: {
    name: 'suspend_organization',
    description: 'Suspend an organization (super admin only)',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      reason: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 500 }),
        required: true,
      },
      suspended_by_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
    },
    riskLevel: 'critical',
    requiresAuth: true,
    rateLimitPerMinute: 10,
  },

  reactivate_organization: {
    name: 'reactivate_organization',
    description: 'Reactivate a suspended organization',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      reactivated_by_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
    },
    riskLevel: 'critical',
    requiresAuth: true,
    rateLimitPerMinute: 10,
  },

  // ========================================
  // TENANT & USAGE FUNCTIONS
  // ========================================
  track_usage_event: {
    name: 'track_usage_event',
    description: 'Track usage events for billing and analytics',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      event_type_param: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 50 }),
        required: true,
      },
      event_category_param: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 30 }),
        required: true,
      },
      resource_amount_param: {
        validator: InputValidator.validateInteger,
        required: false,
      },
      bytes_consumed_param: {
        validator: InputValidator.validateInteger,
        required: false,
      },
      additional_metadata: {
        validator: InputValidator.validateJSON,
        required: false,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 120,
  },

  check_usage_limits: {
    name: 'check_usage_limits',
    description: 'Check if organization is within usage limits',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      limit_type_param: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 50 }),
        required: true,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 120,
  },

  get_tenant_by_domain: {
    name: 'get_tenant_by_domain',
    description: 'Get tenant organization by domain name',
    parameterSchema: {
      domain_name: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 255 }),
        required: true,
      },
    },
    riskLevel: 'medium',
    requiresAuth: false,
    rateLimitPerMinute: 60,
  },

  // ========================================
  // CONVERSATION & MESSAGE FUNCTIONS
  // ========================================
  get_conversation_unread_count: {
    name: 'get_conversation_unread_count',
    description: 'Get unread message count for a conversation',
    parameterSchema: {
      conv_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 120,
  },

  // ========================================
  // MEDIA & STORAGE FUNCTIONS
  // ========================================
  update_media_storage_usage: {
    name: 'update_media_storage_usage',
    description: 'Update media storage quota usage',
    parameterSchema: {
      org_id: {
        validator: InputValidator.validateUUID,
        required: true,
      },
      quota_type: {
        validator: (value) => InputValidator.validateText(value, { maxLength: 50 }),
        required: true,
      },
      usage_delta: {
        validator: InputValidator.validateInteger,
        required: true,
      },
    },
    riskLevel: 'medium',
    requiresAuth: true,
    rateLimitPerMinute: 60,
  },

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  is_super_admin: {
    name: 'is_super_admin',
    description: 'Check if user is a super admin',
    parameterSchema: {
      user_id: {
        validator: InputValidator.validateUUID,
        required: false,
        options: { allowNull: true },
      },
    },
    riskLevel: 'low',
    requiresAuth: true,
    rateLimitPerMinute: 120,
  },
};

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

function checkRateLimit(functionName: string, userId: string | null): boolean {
  const config = WHITELISTED_RPC_FUNCTIONS[functionName];
  if (!config || !config.rateLimitPerMinute) {
    return true; // No rate limit configured
  }

  const key = `${functionName}:${userId || 'anonymous'}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + 60000, // 1 minute from now
    });
    return true;
  }

  if (entry.count >= config.rateLimitPerMinute) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditLogEntry {
  timestamp: string;
  functionName: string;
  userId: string | null;
  parameters: Record<string, any>;
  success: boolean;
  error?: string;
  executionTime?: number;
  riskLevel: string;
}

const auditLog: AuditLogEntry[] = [];

async function logRpcCall(
  functionName: string,
  userId: string | null,
  parameters: Record<string, any>,
  success: boolean,
  error?: string,
  executionTime?: number
): Promise<void> {
  const config = WHITELISTED_RPC_FUNCTIONS[functionName];

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    functionName,
    userId,
    parameters: sanitizeParametersForLogging(parameters),
    success,
    error,
    executionTime,
    riskLevel: config?.riskLevel || 'unknown',
  };

  auditLog.push(entry);

  // Keep only last 1000 entries in memory
  if (auditLog.length > 1000) {
    auditLog.shift();
  }

  // For critical operations, log to database or external service
  if (config?.riskLevel === 'critical' || !success) {
    // TODO: Implement database logging for critical operations
    console.warn('[SECURE RPC AUDIT]', entry);
  }
}

function sanitizeParametersForLogging(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Redact sensitive fields
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      sanitized[key] = value.substring(0, 100) + '...[TRUNCATED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// SECURE RPC IMPLEMENTATION
// ============================================================================

/**
 * Secure wrapper around Supabase RPC function calls
 *
 * @param supabase - Supabase client instance
 * @param functionName - Name of the RPC function to call
 * @param params - Parameters to pass to the function
 * @param options - Additional options for the call
 * @returns Promise with result and error
 */
export async function secureRpc<T = any>(
  supabase: SupabaseClient,
  functionName: string,
  params: Record<string, any> = {},
  options: SecureRpcOptions = {}
): Promise<SecureRpcResult<T>> {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Get current user for audit logging and rate limiting
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id || null;

    // Step 1: Validate function name is whitelisted
    const functionConfig = WHITELISTED_RPC_FUNCTIONS[functionName];
    if (!functionConfig) {
      const error = new Error(`RPC function '${functionName}' is not whitelisted`);
      await logRpcCall(functionName, userId, params, false, error.message);
      return {
        data: null,
        error,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 2: Check authentication requirement
    if (functionConfig.requiresAuth && !userId) {
      const error = new Error(`Authentication required for '${functionName}'`);
      await logRpcCall(functionName, userId, params, false, error.message);
      return {
        data: null,
        error,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 3: Check rate limit
    if (!checkRateLimit(functionName, userId)) {
      const error = new Error(`Rate limit exceeded for '${functionName}'`);
      await logRpcCall(functionName, userId, params, false, error.message);
      return {
        data: null,
        error,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 4: Validate and sanitize parameters
    let sanitizedParams = params;
    let validationErrors: Record<string, string> = {};

    if (!options.skipValidation) {
      const validationResult = InputValidator.validateSchema(params, functionConfig.parameterSchema);

      if (!validationResult.isValid) {
        const error = new Error('Parameter validation failed');
        await logRpcCall(functionName, userId, params, false, error.message);
        return {
          data: null,
          error,
          validationErrors: validationResult.errors,
          executionTime: Date.now() - startTime,
        };
      }

      sanitizedParams = validationResult.sanitizedData;
    }

    // Step 5: Apply custom validators if provided
    if (options.customValidators) {
      for (const [key, validator] of Object.entries(options.customValidators)) {
        if (key in sanitizedParams) {
          const result = validator(sanitizedParams[key]);
          if (!result.isValid) {
            const error = new Error(`Custom validation failed for parameter '${key}'`);
            await logRpcCall(functionName, userId, params, false, error.message);
            return {
              data: null,
              error,
              validationErrors: { [key]: result.error || 'Validation failed' },
              executionTime: Date.now() - startTime,
            };
          }
          sanitizedParams[key] = result.sanitizedValue;
        }
      }
    }

    // Step 6: Execute the RPC function
    const { data, error } = await supabase.rpc(functionName, sanitizedParams);

    const executionTime = Date.now() - startTime;

    // Step 7: Log the call
    if (!options.skipAuditLog) {
      await logRpcCall(
        functionName,
        userId,
        sanitizedParams,
        !error,
        error?.message,
        executionTime
      );
    }

    // Step 8: Return result
    if (error) {
      return {
        data: null,
        error: new Error(error.message),
        executionTime,
      };
    }

    return {
      data: data as T,
      error: null,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error('Unknown error');

    await logRpcCall(functionName, userId, params, false, err.message, executionTime);

    return {
      data: null,
      error: err,
      executionTime,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get audit log for analysis
 */
export function getAuditLog(): AuditLogEntry[] {
  return [...auditLog]; // Return copy
}

/**
 * Clear audit log (use with caution)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): Map<string, RateLimitEntry> {
  return new Map(rateLimitStore); // Return copy
}

/**
 * Clear rate limit cache
 */
export function clearRateLimitCache(): void {
  rateLimitStore.clear();
}

/**
 * Check if a function is whitelisted
 */
export function isWhitelisted(functionName: string): boolean {
  return functionName in WHITELISTED_RPC_FUNCTIONS;
}

/**
 * Get function configuration
 */
export function getFunctionConfig(functionName: string): RpcFunctionConfig | null {
  return WHITELISTED_RPC_FUNCTIONS[functionName] || null;
}

/**
 * Add a new function to whitelist (use with caution in production)
 */
export function addToWhitelist(config: RpcFunctionConfig): void {
  if (WHITELISTED_RPC_FUNCTIONS[config.name]) {
    throw new Error(`Function '${config.name}' is already whitelisted`);
  }
  WHITELISTED_RPC_FUNCTIONS[config.name] = config;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default secureRpc;
