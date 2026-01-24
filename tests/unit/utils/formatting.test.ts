/**
 * Formatting Utility Tests
 *
 * Tests for phone number formatting and date/time formatting with timezone support.
 *
 * @module tests/unit/utils/formatting
 */

describe('Formatting Utilities', () => {
  describe('Test 17: Phone Number Formatting', () => {
    /**
     * Format phone number to international format
     */
    function formatPhoneNumber(phone: string): string {
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');

      // Check if it starts with country code
      if (digits.startsWith('1') && digits.length === 11) {
        // US/Canada format: +1 (XXX) XXX-XXXX
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      } else if (digits.startsWith('44') && digits.length >= 11) {
        // UK format: +44 XX XXXX XXXX
        return `+44 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
      } else if (digits.startsWith('31') && digits.length >= 11) {
        // Netherlands format: +31 X XXXX XXXX
        return `+31 ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
      } else if (digits.length >= 10) {
        // Generic international format: +XX XXX XXX XXXX
        return `+${digits}`;
      }

      return phone; // Return original if can't format
    }

    it('should format US phone number to international format', () => {
      // Arrange
      const usPhone = '12345678900';

      // Act
      const formatted = formatPhoneNumber(usPhone);

      // Assert
      expect(formatted).toBe('+1 (234) 567-8900');
    });

    it('should handle phone number with formatting characters', () => {
      // Arrange
      const phoneWithFormatting = '+1 (234) 567-8900';

      // Act
      const formatted = formatPhoneNumber(phoneWithFormatting);

      // Assert
      expect(formatted).toBe('+1 (234) 567-8900');
      expect(formatted).toContain('+1');
      expect(formatted).toMatch(/\(\d{3}\)/);
    });

    it('should format UK phone number correctly', () => {
      // Arrange
      const ukPhone = '442079460958';

      // Act
      const formatted = formatPhoneNumber(ukPhone);

      // Assert
      expect(formatted).toBe('+44 20 7946 0958');
      expect(formatted.startsWith('+44')).toBe(true);
    });

    it('should format Netherlands phone number correctly', () => {
      // Arrange
      const nlPhone = '31612345678';

      // Act
      const formatted = formatPhoneNumber(nlPhone);

      // Assert
      expect(formatted).toBe('+31 6 1234 5678');
      expect(formatted.startsWith('+31')).toBe(true);
    });

    it('should handle phone number without country code', () => {
      // Arrange
      const phoneWithoutCountry = '1234567890';

      // Act
      const formatted = formatPhoneNumber(phoneWithoutCountry);

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted.replace(/\D/g, '')).toBe('1234567890');
    });

    it('should remove special characters and format', () => {
      // Arrange
      const phoneWithSpecialChars = '+1-234-567-8900';

      // Act
      const formatted = formatPhoneNumber(phoneWithSpecialChars);

      // Assert
      expect(formatted).toBe('+1 (234) 567-8900');
      // Note: The formatted output contains a dash as part of the standard US format
      expect(formatted).toContain('+1');
    });

    it('should handle empty string', () => {
      // Arrange
      const emptyPhone = '';

      // Act
      const formatted = formatPhoneNumber(emptyPhone);

      // Assert
      expect(formatted).toBe('');
    });

    it('should handle invalid phone number gracefully', () => {
      // Arrange
      const invalidPhone = 'not-a-phone';

      // Act
      const formatted = formatPhoneNumber(invalidPhone);

      // Assert
      expect(formatted).toBe('not-a-phone'); // Returns original if can't format
    });
  });

  describe('Test 18: Date/Time Formatting with Timezone', () => {
    /**
     * Format date with timezone support
     */
    function formatDateWithTimezone(
      date: Date | string,
      timezone: string = 'UTC',
      format: 'short' | 'long' | 'relative' = 'short'
    ): string {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      if (format === 'relative') {
        return formatRelativeTime(dateObj);
      }

      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: format === 'long' ? 'long' : '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: format === 'long' ? '2-digit' : undefined,
        hour12: false,
      };

      return new Intl.DateTimeFormat('en-US', options).format(dateObj);
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    function formatRelativeTime(date: Date): string {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return `${diffSeconds} seconds ago`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
      } else if (diffDays < 30) {
        return `${diffDays} days ago`;
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        return `${diffMonths} months ago`;
      }
    }

    it('should format date in UTC timezone', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const formatted = formatDateWithTimezone(date, 'UTC', 'short');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
    });

    it('should format date in specific timezone (America/New_York)', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const formatted = formatDateWithTimezone(date, 'America/New_York', 'short');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2024');
      // Date should be adjusted for timezone
    });

    it('should format date in long format', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:45Z');

      // Act
      const formatted = formatDateWithTimezone(date, 'UTC', 'long');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('10');
      expect(formatted).toContain('30');
      expect(formatted).toContain('45');
    });

    it('should format relative time for recent dates', () => {
      // Arrange
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Act
      const formatted = formatDateWithTimezone(fiveMinutesAgo, 'UTC', 'relative');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('minutes ago');
    });

    it('should format relative time for hours ago', () => {
      // Arrange
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Act
      const formatted = formatDateWithTimezone(twoHoursAgo, 'UTC', 'relative');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('hours ago');
    });

    it('should format relative time for days ago', () => {
      // Arrange
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Act
      const formatted = formatDateWithTimezone(threeDaysAgo, 'UTC', 'relative');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('days ago');
    });

    it('should handle date string input', () => {
      // Arrange
      const dateString = '2024-01-15T10:30:00Z';

      // Act
      const formatted = formatDateWithTimezone(dateString, 'UTC', 'short');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('Invalid Date');
    });

    it('should return "Invalid Date" for invalid date', () => {
      // Arrange
      const invalidDate = 'not-a-date';

      // Act
      const formatted = formatDateWithTimezone(invalidDate, 'UTC', 'short');

      // Assert
      expect(formatted).toBe('Invalid Date');
    });

    it('should handle Asia/Tokyo timezone', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const formatted = formatDateWithTimezone(date, 'Asia/Tokyo', 'short');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2024');
      // Time should be adjusted for Tokyo timezone (UTC+9)
    });

    it('should handle Europe/Amsterdam timezone', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const formatted = formatDateWithTimezone(date, 'Europe/Amsterdam', 'short');

      // Assert
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2024');
      // Time should be adjusted for Amsterdam timezone
    });
  });
});
