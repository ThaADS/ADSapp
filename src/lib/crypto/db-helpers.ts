/**
 * Database Encryption Helpers
 *
 * Helper functions for transparent encryption/decryption integration
 * with Supabase database operations.
 *
 * Features:
 * - Transparent encryption before insert/update
 * - Transparent decryption after select
 * - Query transformation for encrypted fields
 * - Supabase client integration
 * - Type-safe operations
 *
 * @module crypto/db-helpers
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { FieldEncryptor, fieldEncryptor } from './field-encryptor';
import { ENCRYPTED_FIELDS } from './types';

/**
 * Encrypted database client that transparently handles encryption/decryption
 */
export class EncryptedSupabaseClient {
  constructor(
    private client: SupabaseClient<Database>,
    private encryptor: FieldEncryptor = fieldEncryptor
  ) {}

  /**
   * Insert a contact with automatic field encryption
   *
   * @param contact - Contact data to insert
   * @returns Insert result with encrypted fields
   */
  async insertContact(
    contact: Database['public']['Tables']['contacts']['Insert']
  ): Promise<{
    data: Database['public']['Tables']['contacts']['Row'] | null;
    error: Error | null;
  }> {
    try {
      // Encrypt PII fields
      const encryptedContact = this.encryptor.encryptContact(contact);

      // Perform insert
      const { data, error } = await this.client
        .from('contacts')
        .insert(encryptedContact)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the returned data for consistency
      if (data) {
        const decryptedData = this.encryptor.decryptContact(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update a contact with automatic field encryption
   *
   * @param id - Contact ID
   * @param updates - Contact fields to update
   * @returns Update result with decrypted fields
   */
  async updateContact(
    id: string,
    updates: Database['public']['Tables']['contacts']['Update']
  ): Promise<{
    data: Database['public']['Tables']['contacts']['Row'] | null;
    error: Error | null;
  }> {
    try {
      // Encrypt PII fields in updates
      const encryptedUpdates = this.encryptor.encryptContact(updates);

      // Perform update
      const { data, error } = await this.client
        .from('contacts')
        .update(encryptedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the returned data
      if (data) {
        const decryptedData = this.encryptor.decryptContact(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Select contacts with automatic field decryption
   *
   * @param organizationId - Organization ID to filter by
   * @returns Array of contacts with decrypted fields
   */
  async selectContacts(organizationId: string): Promise<{
    data: Database['public']['Tables']['contacts']['Row'][] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        return { data: null, error };
      }

      // Decrypt all contacts
      if (data) {
        const decryptedData = data.map((contact) =>
          this.encryptor.decryptContact(contact)
        );
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Select a single contact by ID with automatic decryption
   *
   * @param id - Contact ID
   * @returns Contact with decrypted fields
   */
  async selectContactById(id: string): Promise<{
    data: Database['public']['Tables']['contacts']['Row'] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the contact
      if (data) {
        const decryptedData = this.encryptor.decryptContact(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Insert a profile with automatic field encryption
   *
   * @param profile - Profile data to insert
   * @returns Insert result with encrypted fields
   */
  async insertProfile(
    profile: Database['public']['Tables']['profiles']['Insert']
  ): Promise<{
    data: Database['public']['Tables']['profiles']['Row'] | null;
    error: Error | null;
  }> {
    try {
      // Encrypt PII fields
      const encryptedProfile = this.encryptor.encryptProfile(profile);

      // Perform insert
      const { data, error } = await this.client
        .from('profiles')
        .insert(encryptedProfile)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the returned data
      if (data) {
        const decryptedData = this.encryptor.decryptProfile(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update a profile with automatic field encryption
   *
   * @param id - Profile ID
   * @param updates - Profile fields to update
   * @returns Update result with decrypted fields
   */
  async updateProfile(
    id: string,
    updates: Database['public']['Tables']['profiles']['Update']
  ): Promise<{
    data: Database['public']['Tables']['profiles']['Row'] | null;
    error: Error | null;
  }> {
    try {
      // Encrypt PII fields in updates
      const encryptedUpdates = this.encryptor.encryptProfile(updates);

      // Perform update
      const { data, error } = await this.client
        .from('profiles')
        .update(encryptedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the returned data
      if (data) {
        const decryptedData = this.encryptor.decryptProfile(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Select profiles with automatic field decryption
   *
   * @param organizationId - Organization ID to filter by
   * @returns Array of profiles with decrypted fields
   */
  async selectProfiles(organizationId: string): Promise<{
    data: Database['public']['Tables']['profiles']['Row'][] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        return { data: null, error };
      }

      // Decrypt all profiles
      if (data) {
        const decryptedData = data.map((profile) =>
          this.encryptor.decryptProfile(profile)
        );
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Select a single profile by ID with automatic decryption
   *
   * @param id - Profile ID
   * @returns Profile with decrypted fields
   */
  async selectProfileById(id: string): Promise<{
    data: Database['public']['Tables']['profiles']['Row'] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error };
      }

      // Decrypt the profile
      if (data) {
        const decryptedData = this.encryptor.decryptProfile(data);
        return { data: decryptedData, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get the raw Supabase client for non-encrypted operations
   *
   * @returns Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }
}

/**
 * Create an encrypted Supabase client
 *
 * @param client - Supabase client instance
 * @param encryptor - Optional custom field encryptor
 * @returns Encrypted Supabase client
 */
export function createEncryptedClient(
  client: SupabaseClient<Database>,
  encryptor?: FieldEncryptor
): EncryptedSupabaseClient {
  return new EncryptedSupabaseClient(client, encryptor);
}

/**
 * Encrypt data before insert/update
 *
 * @param tableName - Name of the table
 * @param data - Data to encrypt
 * @returns Data with encrypted fields
 */
export function encryptBeforeWrite<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  data: T
): T {
  const encryptor = fieldEncryptor;
  const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];

  if (!fieldsToEncrypt || fieldsToEncrypt.length === 0) {
    return data;
  }

  return encryptor.encryptRecord(data, fieldsToEncrypt as (keyof T)[]);
}

/**
 * Decrypt data after select
 *
 * @param tableName - Name of the table
 * @param data - Data to decrypt
 * @returns Data with decrypted fields
 */
export function decryptAfterRead<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  data: T
): T {
  const encryptor = fieldEncryptor;
  const fieldsToDecrypt = ENCRYPTED_FIELDS[tableName];

  if (!fieldsToDecrypt || fieldsToDecrypt.length === 0) {
    return data;
  }

  return encryptor.decryptRecord(data, fieldsToDecrypt as (keyof T)[]);
}

/**
 * Encrypt an array of records
 *
 * @param tableName - Name of the table
 * @param records - Array of records to encrypt
 * @returns Array of records with encrypted fields
 */
export function encryptRecords<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  records: T[]
): T[] {
  return records.map((record) => encryptBeforeWrite(tableName, record));
}

/**
 * Decrypt an array of records
 *
 * @param tableName - Name of the table
 * @param records - Array of records to decrypt
 * @returns Array of records with decrypted fields
 */
export function decryptRecords<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  records: T[]
): T[] {
  return records.map((record) => decryptAfterRead(tableName, record));
}

/**
 * Middleware for automatically encrypting fields in API routes
 *
 * @example
 * ```typescript
 * // In API route
 * const contactData = await req.json();
 * const encrypted = await encryptionMiddleware('contacts', contactData);
 * await supabase.from('contacts').insert(encrypted);
 * ```
 */
export async function encryptionMiddleware<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  data: T
): Promise<T> {
  return encryptBeforeWrite(tableName, data);
}

/**
 * Middleware for automatically decrypting fields in API routes
 *
 * @example
 * ```typescript
 * // In API route
 * const { data } = await supabase.from('contacts').select('*');
 * const decrypted = await decryptionMiddleware('contacts', data);
 * return Response.json(decrypted);
 * ```
 */
export async function decryptionMiddleware<T extends Record<string, unknown>>(
  tableName: keyof typeof ENCRYPTED_FIELDS,
  data: T | T[]
): Promise<T | T[]> {
  if (Array.isArray(data)) {
    return decryptRecords(tableName, data);
  }
  return decryptAfterRead(tableName, data);
}

/**
 * Create encryption hooks for Supabase queries
 *
 * @param client - Supabase client
 * @returns Object with encryption-aware query methods
 */
export function createEncryptionHooks(client: SupabaseClient<Database>) {
  return {
    /**
     * Insert with automatic encryption
     */
    async insertWithEncryption<
      TableName extends keyof typeof ENCRYPTED_FIELDS & keyof Database['public']['Tables']
    >(
      tableName: TableName,
      data: Database['public']['Tables'][TableName]['Insert']
    ) {
      const encrypted = encryptBeforeWrite(tableName, data);
      const result = await client.from(tableName).insert(encrypted).select();

      if (result.data) {
        return {
          ...result,
          data: decryptRecords(
            tableName,
            result.data as Record<string, unknown>[]
          ) as typeof result.data,
        };
      }

      return result;
    },

    /**
     * Update with automatic encryption
     */
    async updateWithEncryption<
      TableName extends keyof typeof ENCRYPTED_FIELDS & keyof Database['public']['Tables']
    >(
      tableName: TableName,
      id: string,
      updates: Database['public']['Tables'][TableName]['Update']
    ) {
      const encrypted = encryptBeforeWrite(tableName, updates);
      const result = await client
        .from(tableName)
        .update(encrypted)
        .eq('id', id)
        .select();

      if (result.data) {
        return {
          ...result,
          data: decryptRecords(
            tableName,
            result.data as Record<string, unknown>[]
          ) as typeof result.data,
        };
      }

      return result;
    },

    /**
     * Select with automatic decryption
     */
    async selectWithDecryption<
      TableName extends keyof typeof ENCRYPTED_FIELDS & keyof Database['public']['Tables']
    >(tableName: TableName, query?: string) {
      const result = await client.from(tableName).select(query || '*');

      if (result.data) {
        return {
          ...result,
          data: decryptRecords(
            tableName,
            result.data as Record<string, unknown>[]
          ) as typeof result.data,
        };
      }

      return result;
    },
  };
}

/**
 * Verify that encryption is properly configured for database operations
 *
 * @returns Verification result
 */
export function verifyDatabaseEncryption(): {
  configured: boolean;
  tablesConfigured: string[];
  fieldsConfigured: Record<string, string[]>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const tablesConfigured = Object.keys(ENCRYPTED_FIELDS);
  const fieldsConfigured: Record<string, string[]> = {};

  // Check each table configuration
  for (const [table, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    fieldsConfigured[table] = fields;

    if (fields.length === 0) {
      warnings.push(`Table '${table}' has no encrypted fields configured`);
    }
  }

  // Check if encryption key is available
  try {
    const { healthy } = FieldEncryptor.verifyEncryption();
    if (!healthy) {
      warnings.push('Encryption system is not healthy');
    }
  } catch (error) {
    warnings.push(
      `Encryption verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    configured: warnings.length === 0,
    tablesConfigured,
    fieldsConfigured,
    warnings,
  };
}
