/**
 * Input Validation Unit Tests
 *
 * Tests SQL injection prevention, XSS prevention, and comprehensive
 * input sanitization for all user-provided data.
 */

import {
  validateUUID,
  validateEmail,
  validatePhoneNumber,
  validateText,
  validateInteger,
  validateJSON,
  validateDate,
  validateEnum,
  validateURL,
  sanitizeText,
  sanitizeJSON,
  sanitizeSearchQuery,
  containsSQLInjection,
  containsXSS,
  validateParameters,
  validateSchema,
  ValidationErrorCodes,
} from '@/lib/security/input-validation';

describe('Input Validation - SQL Injection Prevention', () => {
  describe('SQL Injection Detection', () => {
    it('should detect common SQL injection patterns', () => {
      // Arrange
      const maliciousInputs = [
        "' OR '1'='1",
        "1'; DROP TABLE users--",
        "admin'--",
        "' UNION SELECT * FROM passwords--",
        "1' AND 1=1--",
        "; DELETE FROM users WHERE '1'='1",
        "' OR 1=1/*",
        "1' WAITFOR DELAY '00:00:05'--",
        "1' AND SLEEP(5)--",
        "' OR EXISTS(SELECT * FROM users)--",
      ];

      // Act & Assert
      maliciousInputs.forEach((input) => {
        expect(containsSQLInjection(input)).toBe(true);
      });
    });

    it('should allow safe text without SQL patterns', () => {
      // Arrange
      const safeInputs = [
        'John Doe',
        'hello@example.com',
        'This is a normal message with no SQL',
        'Product name: Widget v2.0',
        'Meeting scheduled for 2:00 PM',
      ];

      // Act & Assert
      safeInputs.forEach((input) => {
        expect(containsSQLInjection(input)).toBe(false);
      });
    });

    it('should sanitize text input to prevent SQL injection', () => {
      // Arrange
      const input = "User's input with 'quotes' and special chars";

      // Act
      const result = validateText(input);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
      expect(result.sanitizedValue).not.toContain("'");
    });

    it('should reject text with SQL injection attempts', () => {
      // Arrange
      const maliciousInput = "'; DROP TABLE users--";

      // Act
      const result = validateText(maliciousInput);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrorCodes.SQL_INJECTION_DETECTED);
      expect(result.error).toContain('unsafe characters');
    });
  });

  describe('XSS Prevention', () => {
    it('should detect XSS patterns', () => {
      // Arrange
      const xssInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>',
        '<embed src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
      ];

      // Act & Assert
      xssInputs.forEach((input) => {
        expect(containsXSS(input)).toBe(true);
      });
    });

    it('should reject text with XSS attempts', () => {
      // Arrange
      const xssInput = '<script>alert("XSS")</script>';

      // Act
      const result = validateText(xssInput);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ValidationErrorCodes.XSS_DETECTED);
      expect(result.error).toContain('HTML/JavaScript');
    });

    it('should allow safe HTML entities', () => {
      // Arrange
      const safeInput = 'This is a &lt;safe&gt; message with &amp; symbols';

      // Act
      const result = validateText(safeInput);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      // Arrange
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const result = validateUUID(validUUID);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(validUUID.toLowerCase());
    });

    it('should reject invalid UUID format', () => {
      // Arrange
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'g50e8400-e29b-41d4-a716-446655440000', // Invalid character
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-51d4-a716-446655440000', // Wrong version (should be 4)
      ];

      // Act & Assert
      invalidUUIDs.forEach((uuid) => {
        const result = validateUUID(uuid);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(ValidationErrorCodes.INVALID_UUID);
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.org',
        'admin123@test-site.com',
      ];

      // Act & Assert
      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email format', () => {
      // Arrange
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        "user'; DROP TABLE users--@evil.com",
      ];

      // Act & Assert
      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Search Query Sanitization', () => {
    it('should sanitize search queries to prevent injection', () => {
      // Arrange
      const maliciousQuery = "'; DROP TABLE users--";

      // Act
      const sanitized = sanitizeSearchQuery(maliciousQuery);

      // Assert
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('TABLE');
    });

    it('should escape regex special characters to prevent ReDoS', () => {
      // Arrange
      const regexQuery = '.*+?^${}()|[]\\';

      // Act
      const sanitized = sanitizeSearchQuery(regexQuery);

      // Assert
      expect(sanitized).not.toContain('.*');
      expect(sanitized).toContain('\\.');
    });

    it('should limit search query length', () => {
      // Arrange
      const longQuery = 'a'.repeat(200);
      const maxLength = 100;

      // Act
      const sanitized = sanitizeSearchQuery(longQuery, maxLength);

      // Assert
      expect(sanitized.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Integer Validation', () => {
    it('should validate integer values', () => {
      // Arrange
      const validIntegers = [0, 1, -1, 42, 999999, -999999, '123', '-456'];

      // Act & Assert
      validIntegers.forEach((value) => {
        const result = validateInteger(value);
        expect(result.isValid).toBe(true);
        expect(typeof result.sanitizedValue).toBe('number');
      });
    });

    it('should reject non-integer values', () => {
      // Arrange
      const invalidIntegers = [
        '12.34',
        'abc',
        '1e5',
        'NaN',
        Infinity,
        null,
        undefined,
      ];

      // Act & Assert
      invalidIntegers.forEach((value) => {
        const result = validateInteger(value);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('JSON Validation & Sanitization', () => {
    it('should validate and sanitize JSON objects', () => {
      // Arrange
      const jsonInput = {
        name: "User's name",
        email: 'test@example.com',
        metadata: {
          created: '2024-01-01',
        },
      };

      // Act
      const result = validateJSON(jsonInput);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
    });

    it('should sanitize nested JSON structures', () => {
      // Arrange
      const jsonInput = {
        level1: {
          level2: {
            level3: {
              data: "Value with 'quotes'",
            },
          },
        },
      };

      // Act
      const sanitized = sanitizeJSON(jsonInput);

      // Assert
      expect(sanitized).toBeDefined();
      expect(sanitized.level1.level2.level3.data).not.toContain("'");
    });

    it('should prevent JSON nesting depth attacks', () => {
      // Arrange - Create deeply nested object
      let deepObject: any = { value: 'deep' };
      for (let i = 0; i < 15; i++) {
        deepObject = { nested: deepObject };
      }

      // Act & Assert
      expect(() => sanitizeJSON(deepObject)).toThrow(/depth exceeded/i);
    });
  });

  describe('Schema Validation', () => {
    it('should validate object against schema', () => {
      // Arrange
      const schema = {
        id: {
          validator: validateUUID,
          required: true,
        },
        email: {
          validator: validateEmail,
          required: true,
        },
        age: {
          validator: validateInteger,
          required: false,
        },
      };

      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        age: 25,
      };

      // Act
      const result = validateSchema(validData, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitizedData.id).toBeDefined();
      expect(result.sanitizedData.email).toBe('user@example.com');
    });

    it('should reject invalid data against schema', () => {
      // Arrange
      const schema = {
        id: {
          validator: validateUUID,
          required: true,
        },
        email: {
          validator: validateEmail,
          required: true,
        },
      };

      const invalidData = {
        id: 'not-a-uuid',
        email: 'not-an-email',
      };

      // Act
      const result = validateSchema(invalidData, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(result.errors.id).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });
  });
});
