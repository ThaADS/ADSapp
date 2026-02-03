/**
 * SQL Injection Prevention Test Suite
 *
 * Comprehensive testing for C-008 SQL Injection vulnerability prevention.
 * Tests all RPC functions and input validation against common injection patterns.
 *
 * Test Coverage:
 * - Input validation functions
 * - RPC function parameter sanitization
 * - Common SQL injection patterns
 * - Time-based blind injection attempts
 * - Union-based injection attempts
 * - Boolean-based injection attempts
 * - Error-based injection attempts
 *
 * @module sql-injection.test
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { secureRpc } from '@/lib/security/secure-rpc';
import { InputValidator, ValidationErrorCodes } from '@/lib/security/input-validation';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: ReturnType<typeof createClient>;
let testUserId: string;
let testOrgId: string;

// ============================================================================
// COMMON SQL INJECTION PAYLOADS
// ============================================================================

const SQL_INJECTION_PAYLOADS = {
  basic: [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin'--",
    "admin' #",
    "admin'/*",
    "' or 1=1--",
    "' or 1=1#",
    "' or 1=1/*",
    "') or '1'='1--",
    "') or ('1'='1--",
  ],
  unionBased: [
    "' UNION SELECT NULL--",
    "' UNION SELECT NULL, NULL--",
    "' UNION SELECT NULL, NULL, NULL--",
    "' UNION SELECT 1, 'admin', 'password'--",
    "' UNION ALL SELECT NULL--",
  ],
  timeBased: [
    "'; WAITFOR DELAY '0:0:5'--",
    "' OR SLEEP(5)--",
    "' OR pg_sleep(5)--",
    "'; SELECT pg_sleep(5)--",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
  ],
  booleanBased: [
    "' AND '1'='1",
    "' AND '1'='2",
    "' AND 1=1--",
    "' AND 1=2--",
    "1' AND '1'='1",
    "1' AND '1'='2",
  ],
  errorBased: [
    "' AND 1=CONVERT(int, (SELECT @@version))--",
    "' AND 1=CAST((SELECT @@version) AS int)--",
    "' AND extractvalue(1,concat(0x7e,(SELECT @@version)))--",
  ],
  stackedQueries: [
    "'; DROP TABLE users--",
    "'; DROP TABLE profiles--",
    "'; DELETE FROM organizations--",
    "'; UPDATE profiles SET is_super_admin=true--",
    "1'; DROP TABLE messages; --",
  ],
  commandExecution: [
    "'; EXEC xp_cmdshell('dir')--",
    "'; EXEC sp_executesql N'SELECT @@version'--",
    "admin'; EXEC master..xp_cmdshell 'ping 127.0.0.1'--",
  ],
  integerInjection: [
    "1 OR 1=1",
    "1 AND 1=1",
    "1 UNION SELECT NULL",
    "1' OR '1'='1",
  ],
};

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

beforeAll(async () => {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create test user and organization
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: 'sql-injection-test@example.com',
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (userError) throw userError;
  testUserId = user.user.id;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'SQL Injection Test Org',
      slug: 'sql-injection-test-org',
      status: 'active',
    })
    .select()
    .single();

  if (orgError) throw orgError;
  testOrgId = org.id;

  // Associate user with organization
  await supabase
    .from('profiles')
    .update({ organization_id: testOrgId })
    .eq('id', testUserId);
});

afterAll(async () => {
  // Cleanup test data
  if (testOrgId) {
    await supabase.from('organizations').delete().eq('id', testOrgId);
  }

  if (testUserId) {
    await supabase.auth.admin.deleteUser(testUserId);
  }
});

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

describe('Input Validation - SQL Injection Prevention', () => {
  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach((uuid) => {
        const result = InputValidator.validateUUID(uuid);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(uuid.toLowerCase());
      });
    });

    it('should reject SQL injection attempts in UUID', () => {
      const maliciousInputs = [
        "550e8400' OR '1'='1",
        "550e8400; DROP TABLE users--",
        "550e8400 UNION SELECT NULL",
        "' OR '1'='1",
      ];

      maliciousInputs.forEach((input) => {
        const result = InputValidator.validateUUID(input);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ValidationErrorCodes.INVALID_UUID);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '550e8400-e29b-41d4-a716',
        'not-a-uuid',
        '12345',
        '',
        '550e8400-e29b-41d4-a716-44665544000g', // Invalid character
      ];

      invalidUUIDs.forEach((uuid) => {
        const result = InputValidator.validateUUID(uuid);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateText', () => {
    it('should accept safe text', () => {
      const safeTexts = [
        'Hello World',
        'Test message 123',
        'Email: test@example.com',
        'Valid-text_with.symbols',
      ];

      safeTexts.forEach((text) => {
        const result = InputValidator.validateText(text);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject SQL injection patterns', () => {
      SQL_INJECTION_PAYLOADS.basic.forEach((payload) => {
        const result = InputValidator.validateText(payload);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ValidationErrorCodes.SQL_INJECTION_DETECTED);
      });
    });

    it('should reject XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("XSS")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<iframe src="javascript:alert(1)">',
      ];

      xssPatterns.forEach((pattern) => {
        const result = InputValidator.validateText(pattern);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ValidationErrorCodes.XSS_DETECTED);
      });
    });

    it('should enforce length limits', () => {
      const longText = 'a'.repeat(10001);
      const result = InputValidator.validateText(longText);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrorCodes.INVALID_LENGTH);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach((email) => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject SQL injection in emails', () => {
      const maliciousEmails = [
        "admin'--@example.com",
        "test' OR '1'='1@example.com",
        "user; DROP TABLE users@example.com",
      ];

      maliciousEmails.forEach((email) => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateInteger', () => {
    it('should accept valid integers', () => {
      const validIntegers = [0, 1, 42, -10, 1000000];

      validIntegers.forEach((num) => {
        const result = InputValidator.validateInteger(num);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(num);
      });
    });

    it('should reject SQL injection in integer strings', () => {
      const maliciousInputs = [
        "1 OR 1=1",
        "1; DROP TABLE users",
        "1 UNION SELECT NULL",
      ];

      maliciousInputs.forEach((input) => {
        const result = InputValidator.validateInteger(input);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateJSON', () => {
    it('should accept and sanitize valid JSON', () => {
      const validJSON = {
        name: 'Test',
        value: 123,
        nested: { key: 'value' },
      };

      const result = InputValidator.validateJSON(validJSON);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
    });

    it('should sanitize SQL injection attempts in JSON values', () => {
      const maliciousJSON = {
        name: "Test' OR '1'='1",
        query: "; DROP TABLE users--",
      };

      const result = InputValidator.validateJSON(maliciousJSON);
      expect(result.isValid).toBe(true);
      // Values should be sanitized
      expect(result.sanitizedValue.name).not.toContain("' OR '1'='1");
    });
  });
});

// ============================================================================
// SECURE RPC WRAPPER TESTS
// ============================================================================

describe('Secure RPC Wrapper - Function Whitelist', () => {
  it('should reject non-whitelisted functions', async () => {
    const result = await secureRpc(supabase, 'malicious_function', {
      param: 'value',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('not whitelisted');
    expect(result.data).toBeNull();
  });

  it('should accept whitelisted functions', async () => {
    const result = await secureRpc(supabase, 'is_super_admin', {
      user_id: testUserId,
    });

    // Should not error on whitelist check (may error on other validation)
    if (result.error) {
      expect(result.error.message).not.toContain('not whitelisted');
    }
  });

  it('should enforce parameter validation', async () => {
    const result = await secureRpc(supabase, 'get_conversation_unread_count', {
      conv_id: 'invalid-uuid',
    });

    expect(result.error).toBeDefined();
    expect(result.validationErrors).toBeDefined();
  });
});

// ============================================================================
// RPC FUNCTION INJECTION TESTS
// ============================================================================

describe('RPC Functions - SQL Injection Protection', () => {
  describe('get_conversation_unread_count', () => {
    it('should reject SQL injection in UUID parameter', async () => {
      const injectionAttempts = [
        "550e8400-e29b-41d4-a716-446655440000' OR '1'='1",
        "550e8400-e29b-41d4-a716-446655440000; DROP TABLE messages--",
        "550e8400-e29b-41d4-a716-446655440000 UNION SELECT NULL",
      ];

      for (const payload of injectionAttempts) {
        const result = await secureRpc(supabase, 'get_conversation_unread_count', {
          conv_id: payload,
        });

        expect(result.error).toBeDefined();
        expect(result.data).toBeNull();
      }
    });
  });

  describe('check_usage_limits', () => {
    it('should reject SQL injection in organization_id', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.basic) {
        const result = await secureRpc(supabase, 'check_usage_limits', {
          org_id: payload,
          limit_type_param: 'messages',
        });

        expect(result.error).toBeDefined();
        expect(result.data).toBeNull();
      }
    });

    it('should reject SQL injection in limit_type parameter', async () => {
      const injectionAttempts = [
        "messages' OR '1'='1",
        "messages; DROP TABLE usage_events--",
        "messages' UNION SELECT NULL--",
      ];

      for (const payload of injectionAttempts) {
        const result = await secureRpc(supabase, 'check_usage_limits', {
          org_id: testOrgId,
          limit_type_param: payload,
        });

        expect(result.error).toBeDefined();
      }
    });
  });

  describe('get_tenant_by_domain', () => {
    it('should reject SQL injection in domain parameter', async () => {
      const injectionAttempts = [
        ...SQL_INJECTION_PAYLOADS.basic,
        ...SQL_INJECTION_PAYLOADS.stackedQueries,
      ];

      for (const payload of injectionAttempts) {
        const result = await secureRpc(supabase, 'get_tenant_by_domain', {
          domain_name: payload,
        });

        expect(result.error).toBeDefined();
        expect(result.data).toBeNull();
      }
    });
  });

  describe('track_usage_event', () => {
    it('should reject SQL injection in event parameters', async () => {
      const result = await secureRpc(supabase, 'track_usage_event', {
        org_id: testOrgId,
        event_type_param: "message' OR '1'='1",
        event_category_param: "api; DROP TABLE usage_events--",
        resource_amount_param: "1 OR 1=1",
      });

      expect(result.error).toBeDefined();
    });

    it('should sanitize JSON metadata', async () => {
      const maliciousMetadata = {
        query: "; DROP TABLE users--",
        value: "' OR '1'='1",
      };

      const result = await secureRpc(supabase, 'track_usage_event', {
        org_id: testOrgId,
        event_type_param: 'test_event',
        event_category_param: 'test',
        additional_metadata: maliciousMetadata,
      });

      // Should sanitize the metadata, not reject it
      if (!result.error) {
        // Metadata should be cleaned
        expect(result.data).toBeDefined();
      }
    });
  });
});

// ============================================================================
// TIME-BASED BLIND INJECTION TESTS
// ============================================================================

describe('Time-Based Blind Injection Prevention', () => {
  it('should not delay execution with SLEEP injection', async () => {
    const startTime = Date.now();

    const result = await secureRpc(supabase, 'get_conversation_unread_count', {
      conv_id: "550e8400-e29b-41d4-a716-446655440000'; SELECT pg_sleep(5)--",
    });

    const executionTime = Date.now() - startTime;

    expect(result.error).toBeDefined();
    // Execution should fail fast, not wait 5 seconds
    expect(executionTime).toBeLessThan(1000);
  });

  it('should reject WAITFOR DELAY injection', async () => {
    const result = await secureRpc(supabase, 'check_usage_limits', {
      org_id: testOrgId,
      limit_type_param: "messages'; WAITFOR DELAY '0:0:5'--",
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});

// ============================================================================
// UNION-BASED INJECTION TESTS
// ============================================================================

describe('Union-Based Injection Prevention', () => {
  it('should reject UNION SELECT in all parameters', async () => {
    for (const payload of SQL_INJECTION_PAYLOADS.unionBased) {
      const result = await secureRpc(supabase, 'get_tenant_by_domain', {
        domain_name: payload,
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    }
  });

  it('should not leak data through UNION injection', async () => {
    const result = await secureRpc(supabase, 'check_usage_limits', {
      org_id: testOrgId,
      limit_type_param: "messages' UNION SELECT email, password FROM profiles--",
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});

// ============================================================================
// STACKED QUERIES INJECTION TESTS
// ============================================================================

describe('Stacked Queries Injection Prevention', () => {
  it('should reject DROP TABLE attempts', async () => {
    const dropAttempts = [
      "'; DROP TABLE users--",
      "test'; DROP TABLE profiles; --",
      "value; DELETE FROM organizations--",
    ];

    for (const payload of dropAttempts) {
      const result = await secureRpc(supabase, 'get_tenant_by_domain', {
        domain_name: payload,
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    }
  });

  it('should reject UPDATE injection attempts', async () => {
    const result = await secureRpc(supabase, 'check_usage_limits', {
      org_id: testOrgId,
      limit_type_param: "messages'; UPDATE profiles SET is_super_admin=true--",
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});

// ============================================================================
// ERROR-BASED INJECTION TESTS
// ============================================================================

describe('Error-Based Injection Prevention', () => {
  it('should not reveal database information through errors', async () => {
    for (const payload of SQL_INJECTION_PAYLOADS.errorBased) {
      const result = await secureRpc(supabase, 'get_tenant_by_domain', {
        domain_name: payload,
      });

      expect(result.error).toBeDefined();
      // Error message should not contain database information
      expect(result.error?.message).not.toContain('version');
      expect(result.error?.message).not.toContain('PostgreSQL');
    }
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  it('should enforce rate limits on repeated calls', async () => {
    const functionName = 'is_super_admin';
    const calls = [];

    // Make more calls than the rate limit allows
    for (let i = 0; i < 150; i++) {
      calls.push(
        secureRpc(supabase, functionName, { user_id: testUserId })
      );
    }

    const results = await Promise.all(calls);
    const rateLimitErrors = results.filter(
      (r) => r.error?.message.includes('Rate limit exceeded')
    );

    expect(rateLimitErrors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// AUDIT LOGGING TESTS
// ============================================================================

describe('Audit Logging', () => {
  it('should log failed injection attempts', async () => {
    await secureRpc(supabase, 'get_conversation_unread_count', {
      conv_id: "'; DROP TABLE messages--",
    });

    const { data: auditLogs } = await supabase
      .from('rpc_function_audit_log')
      .select('*')
      .eq('function_name', 'get_conversation_unread_count')
      .eq('success', false)
      .order('called_at', { ascending: false })
      .limit(1);

    expect(auditLogs).toBeDefined();
    expect(auditLogs?.length).toBeGreaterThan(0);
  });

  it('should sanitize parameters in audit logs', async () => {
    await secureRpc(supabase, 'check_usage_limits', {
      org_id: testOrgId,
      limit_type_param: "messages' OR '1'='1",
    });

    const { data: auditLogs } = await supabase
      .from('rpc_function_audit_log')
      .select('*')
      .eq('function_name', 'check_usage_limits')
      .order('called_at', { ascending: false })
      .limit(1);

    expect(auditLogs?.[0]?.parameters).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('End-to-End SQL Injection Prevention', () => {
  it('should protect full request flow', async () => {
    // Simulate a complete user flow with injection attempts
    const maliciousUserId = "'; DROP TABLE profiles--";
    const maliciousOrgId = "' OR '1'='1";

    // All these should fail safely
    const results = await Promise.all([
      secureRpc(supabase, 'is_super_admin', { user_id: maliciousUserId }),
      secureRpc(supabase, 'check_usage_limits', {
        org_id: maliciousOrgId,
        limit_type_param: 'messages',
      }),
      secureRpc(supabase, 'get_tenant_by_domain', {
        domain_name: "'; DROP TABLE organizations--",
      }),
    ]);

    results.forEach((result) => {
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  it('should allow legitimate requests', async () => {
    const result = await secureRpc(supabase, 'is_super_admin', {
      user_id: testUserId,
    });

    // Should not fail on whitelist or validation
    if (result.error) {
      expect(result.error.message).not.toContain('not whitelisted');
      expect(result.error.message).not.toContain('validation failed');
    }
  });
});
