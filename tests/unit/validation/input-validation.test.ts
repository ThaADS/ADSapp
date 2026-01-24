/**
 * Input Validation Tests
 *
 * Tests for UUID validation and email validation with edge cases.
 *
 * @module tests/unit/validation/input-validation
 */

import { z } from 'zod';

describe('Input Validation', () => {
  describe('Test 19: UUID Validation (Valid and Invalid)', () => {
    // UUID validation schema
    const uuidSchema = z.string().uuid('Invalid UUID format');

    it('should validate correct UUID v4 format', () => {
      // Arrange
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ];

      // Act & Assert
      for (const uuid of validUUIDs) {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid UUID formats', () => {
      // Arrange
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        '',
        'g50e8400-e29b-41d4-a716-446655440000', // Invalid character 'g'
        '550e8400e29b41d4a716446655440000', // Missing hyphens
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Extra characters
      ];

      // Act & Assert
      for (const uuid of invalidUUIDs) {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid UUID');
        }
      }
    });

    it('should reject null and undefined values', () => {
      // Arrange & Act & Assert
      expect(uuidSchema.safeParse(null).success).toBe(false);
      expect(uuidSchema.safeParse(undefined).success).toBe(false);
    });

    it('should reject UUID with wrong case but accept any case', () => {
      // Arrange
      const upperCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      const lowerCaseUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mixedCaseUUID = '550e8400-E29B-41d4-A716-446655440000';

      // Act & Assert
      // UUIDs are typically case-insensitive
      expect(uuidSchema.safeParse(upperCaseUUID).success).toBe(true);
      expect(uuidSchema.safeParse(lowerCaseUUID).success).toBe(true);
      expect(uuidSchema.safeParse(mixedCaseUUID).success).toBe(true);
    });

    it('should handle UUID with extra whitespace', () => {
      // Arrange
      const uuidWithWhitespace = '  550e8400-e29b-41d4-a716-446655440000  ';

      // Create schema with trim
      const trimmedUuidSchema = z.string().trim().uuid();

      // Act
      const result = trimmedUuidSchema.safeParse(uuidWithWhitespace);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate UUID in database ID context', () => {
      // Arrange
      const organizationIdSchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
      });

      const validOrganization = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Organization',
      };

      const invalidOrganization = {
        id: 'not-a-uuid',
        name: 'Test Organization',
      };

      // Act & Assert
      expect(organizationIdSchema.safeParse(validOrganization).success).toBe(true);
      expect(organizationIdSchema.safeParse(invalidOrganization).success).toBe(false);
    });

    it('should handle UUID arrays validation', () => {
      // Arrange
      const uuidArraySchema = z.array(z.string().uuid());

      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      const mixedUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'not-a-uuid',
      ];

      // Act & Assert
      expect(uuidArraySchema.safeParse(validUUIDs).success).toBe(true);
      expect(uuidArraySchema.safeParse(mixedUUIDs).success).toBe(false);
    });

    it('should validate optional UUID field', () => {
      // Arrange
      const optionalUuidSchema = z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().optional(),
      });

      const withParent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        parentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };

      const withoutParent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act & Assert
      expect(optionalUuidSchema.safeParse(withParent).success).toBe(true);
      expect(optionalUuidSchema.safeParse(withoutParent).success).toBe(true);
    });
  });

  describe('Test 20: Email Validation with Edge Cases', () => {
    // Email validation schema with security checks
    const emailSchema = z
      .string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(254, 'Email must not exceed 254 characters')
      .refine(
        (email) => !email.includes('..'),
        'Email cannot contain consecutive dots'
      )
      .refine(
        (email) => !email.startsWith('.') && !email.endsWith('.'),
        'Email cannot start or end with a dot'
      );

    it('should validate standard email addresses', () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'admin+test@domain.org',
        'name_123@subdomain.example.com',
        'user.name+tag@example.travel',
      ];

      // Act & Assert
      for (const email of validEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid email formats', () => {
      // Arrange
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..name@example.com', // Consecutive dots
        '.user@example.com', // Starts with dot
        'user.@example.com', // Ends with dot before @
        'user@example..com', // Consecutive dots in domain
        'user name@example.com', // Space in email
        'user@.com', // Invalid domain
      ];

      // Act & Assert
      for (const email of invalidEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }
    });

    it('should enforce minimum and maximum length', () => {
      // Arrange
      const validMin = 'a@b.co'; // 6 characters, valid email format
      // Create email that's actually over 254 characters
      const longLocalPart = 'a'.repeat(250); // 250 chars
      const tooLong = longLocalPart + '@example.com'; // 250 + 12 = 262 chars, exceeds 254

      // Act & Assert
      expect(emailSchema.safeParse(validMin).success).toBe(true);
      expect(tooLong.length).toBeGreaterThan(254); // Verify test setup
      expect(emailSchema.safeParse(tooLong).success).toBe(false); // Exceeds maximum
    });

    it('should handle email with special characters', () => {
      // Arrange
      const emailsWithSpecialChars = [
        'user+tag@example.com', // Plus sign (valid)
        'user_name@example.com', // Underscore (valid)
        'user-name@example.com', // Hyphen (valid)
        'user.name@example.com', // Dot (valid)
      ];

      // Act & Assert
      for (const email of emailsWithSpecialChars) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      }
    });

    it('should reject emails with consecutive dots', () => {
      // Arrange
      const emailWithConsecutiveDots = 'user..name@example.com';

      // Act
      const result = emailSchema.safeParse(emailWithConsecutiveDots);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        // The refine function provides the custom message
        const messages = result.error.issues.map(i => i.message);
        const hasConsecutiveDotsMessage = messages.some(m => m.includes('consecutive dots'));
        expect(hasConsecutiveDotsMessage).toBe(true);
      }
    });

    it('should reject emails starting or ending with dot', () => {
      // Arrange
      const startingWithDot = '.user@example.com';
      const endingWithDot = 'user.@example.com';

      // Act & Assert
      expect(emailSchema.safeParse(startingWithDot).success).toBe(false);
      expect(emailSchema.safeParse(endingWithDot).success).toBe(false);
    });

    it('should handle international domain names', () => {
      // Arrange
      const internationalEmails = [
        'user@example.co.uk',
        'user@example.com.br',
        'user@subdomain.example.org',
      ];

      // Act & Assert
      for (const email of internationalEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      }
    });

    it('should reject emails with missing domain parts', () => {
      // Arrange
      const invalidDomainEmails = [
        'user@example',
        'user@.example.com',
        'user@example.',
      ];

      // Act & Assert
      for (const email of invalidDomainEmails) {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      }
    });

    it('should handle email case sensitivity correctly', () => {
      // Arrange
      const upperCaseEmail = 'USER@EXAMPLE.COM';
      const lowerCaseEmail = 'user@example.com';
      const mixedCaseEmail = 'User@Example.Com';

      // Act & Assert
      // Email validation should accept any case
      expect(emailSchema.safeParse(upperCaseEmail).success).toBe(true);
      expect(emailSchema.safeParse(lowerCaseEmail).success).toBe(true);
      expect(emailSchema.safeParse(mixedCaseEmail).success).toBe(true);
    });

    it('should validate email in user registration context', () => {
      // Arrange
      const userSchema = z.object({
        email: emailSchema,
        name: z.string().min(1),
        password: z.string().min(8),
      });

      const validUser = {
        email: 'newuser@example.com',
        name: 'John Doe',
        password: 'SecurePass123!',
      };

      const invalidUser = {
        email: 'invalid-email',
        name: 'John Doe',
        password: 'SecurePass123!',
      };

      // Act & Assert
      expect(userSchema.safeParse(validUser).success).toBe(true);
      expect(userSchema.safeParse(invalidUser).success).toBe(false);
    });

    it('should handle empty and whitespace-only emails', () => {
      // Arrange
      const emptyEmail = '';
      const whitespaceEmail = '   ';

      // Act & Assert
      expect(emailSchema.safeParse(emptyEmail).success).toBe(false);
      expect(emailSchema.safeParse(whitespaceEmail).success).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      // Arrange
      const emailWithWhitespace = '  user@example.com  ';
      const trimmedEmailSchema = z.string().trim().email();

      // Act
      const result = trimmedEmailSchema.safeParse(emailWithWhitespace);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user@example.com');
      }
    });
  });
});
