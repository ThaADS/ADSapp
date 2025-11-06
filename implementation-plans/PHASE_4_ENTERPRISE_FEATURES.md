# PHASE 4: ENTERPRISE FEATURES & SCALABILITY - IMPLEMENTATION PLAN

## Key Management, SSO, Event Sourcing, & Horizontal Scaling

**Duration**: 8 weeks (Weeks 23-30)
**Investment**: €56,000
**Team**: 2 Senior Engineers
**Status**: 🟡 RECOMMENDED - Enterprise readiness & scalability foundation

---

## OVERVIEW

Phase 4 transforms ADSapp from a production-ready SaaS into an **enterprise-grade platform** with:

1. **Enterprise Security** (Weeks 23-26): KMS integration, SSO, GDPR automation, advanced RBAC
2. **Scalability Architecture** (Weeks 27-30): API versioning, event sourcing, distributed tracing, horizontal scaling

**Success Criteria**:

- ✅ C-006: AWS KMS/Azure Key Vault integration operational
- ✅ C-007: GDPR-compliant data retention and automated deletion
- ✅ SSO integration with SAML 2.0 and OAuth providers
- ✅ Advanced RBAC with custom roles and granular permissions
- ✅ API versioning with backward compatibility (/api/v1/\*)
- ✅ Event sourcing architecture with complete audit trail
- ✅ OpenTelemetry distributed tracing across all services
- ✅ Horizontal scaling readiness (stateless, Redis sessions)

---

## WEEK 23-26: ENTERPRISE SECURITY (80 hours)

### Week 23: C-006 - Key Management Service Integration (40 hours)

#### Day 1-2: AWS KMS Setup & Integration (16 hours)

**Problem**: Sensitive data (MFA secrets, API keys, encryption keys) stored without dedicated key management increases security risk and fails compliance requirements.

**Implementation Steps**:

##### Step 1: AWS KMS Infrastructure Setup (4 hours)

**File**: `infrastructure/aws/kms-setup.tf`

```hcl
# Terraform configuration for AWS KMS
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Customer Master Key for ADSapp
resource "aws_kms_key" "adsapp_master_key" {
  description             = "ADSapp Master Encryption Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Application = "ADSapp"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ADSapp Application Access"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.adsapp_application.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "adsapp_master_key_alias" {
  name          = "alias/adsapp-master-${var.environment}"
  target_key_id = aws_kms_key.adsapp_master_key.key_id
}

# Separate keys for different data types
resource "aws_kms_key" "mfa_secrets_key" {
  description             = "ADSapp MFA Secrets Encryption Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Application = "ADSapp"
    Purpose     = "MFA-Secrets"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "mfa_secrets_key_alias" {
  name          = "alias/adsapp-mfa-secrets-${var.environment}"
  target_key_id = aws_kms_key.mfa_secrets_key.key_id
}

resource "aws_kms_key" "api_keys_key" {
  description             = "ADSapp API Keys Encryption Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Application = "ADSapp"
    Purpose     = "API-Keys"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "api_keys_key_alias" {
  name          = "alias/adsapp-api-keys-${var.environment}"
  target_key_id = aws_kms_key.api_keys_key.key_id
}

# IAM role for application
resource "aws_iam_role" "adsapp_application" {
  name = "adsapp-application-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "adsapp_kms_policy" {
  name = "adsapp-kms-access-${var.environment}"
  role = aws_iam_role.adsapp_application.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = [
          aws_kms_key.adsapp_master_key.arn,
          aws_kms_key.mfa_secrets_key.arn,
          aws_kms_key.api_keys_key.arn
        ]
      }
    ]
  })
}

# CloudWatch Logs for KMS key usage
resource "aws_cloudwatch_log_group" "kms_audit" {
  name              = "/aws/kms/adsapp-${var.environment}"
  retention_in_days = 90

  tags = {
    Application = "ADSapp"
    Purpose     = "KMS-Audit"
  }
}

# Outputs
output "master_key_id" {
  value       = aws_kms_key.adsapp_master_key.key_id
  description = "Master KMS Key ID"
}

output "master_key_arn" {
  value       = aws_kms_key.adsapp_master_key.arn
  description = "Master KMS Key ARN"
}

output "mfa_secrets_key_id" {
  value       = aws_kms_key.mfa_secrets_key.key_id
  description = "MFA Secrets KMS Key ID"
}

output "api_keys_key_id" {
  value       = aws_kms_key.api_keys_key.key_id
  description = "API Keys KMS Key ID"
}
```

**File**: `infrastructure/aws/variables.tf`

```hcl
variable "aws_region" {
  description = "AWS region for KMS keys"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}
```

**Deployment Commands**:

```bash
cd infrastructure/aws
terraform init
terraform plan -var="aws_account_id=YOUR_ACCOUNT_ID"
terraform apply -var="aws_account_id=YOUR_ACCOUNT_ID"
```

##### Step 2: KMS Service Implementation (6 hours)

**File**: `src/lib/security/kms.ts`

```typescript
import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
  GenerateDataKeyCommand,
} from '@aws-sdk/client-kms'

/**
 * AWS KMS Service for Enterprise-Grade Encryption
 *
 * Provides centralized key management with:
 * - Automatic key rotation
 * - Audit trail via CloudWatch
 * - Envelope encryption for large data
 * - Multiple keys for data separation
 */
export class KMSService {
  private client: KMSClient

  // Key IDs from environment variables (Terraform outputs)
  private readonly MASTER_KEY_ID = process.env.AWS_KMS_MASTER_KEY_ID!
  private readonly MFA_SECRETS_KEY_ID = process.env.AWS_KMS_MFA_SECRETS_KEY_ID!
  private readonly API_KEYS_KEY_ID = process.env.AWS_KMS_API_KEYS_KEY_ID!

  constructor() {
    this.client = new KMSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }

  /**
   * Encrypt MFA secret with dedicated KMS key
   */
  async encryptMFASecret(secret: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: this.MFA_SECRETS_KEY_ID,
      Plaintext: Buffer.from(secret, 'utf-8'),
      EncryptionContext: {
        Purpose: 'MFA-Secret',
        Application: 'ADSapp',
      },
    })

    const response = await this.client.send(command)

    if (!response.CiphertextBlob) {
      throw new Error('KMS encryption failed: No ciphertext returned')
    }

    // Return base64-encoded ciphertext for database storage
    return Buffer.from(response.CiphertextBlob).toString('base64')
  }

  /**
   * Decrypt MFA secret
   */
  async decryptMFASecret(encryptedSecret: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedSecret, 'base64'),
      EncryptionContext: {
        Purpose: 'MFA-Secret',
        Application: 'ADSapp',
      },
    })

    const response = await this.client.send(command)

    if (!response.Plaintext) {
      throw new Error('KMS decryption failed: No plaintext returned')
    }

    return Buffer.from(response.Plaintext).toString('utf-8')
  }

  /**
   * Encrypt API key with dedicated KMS key
   */
  async encryptAPIKey(apiKey: string, organizationId: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: this.API_KEYS_KEY_ID,
      Plaintext: Buffer.from(apiKey, 'utf-8'),
      EncryptionContext: {
        Purpose: 'API-Key',
        Application: 'ADSapp',
        OrganizationId: organizationId,
      },
    })

    const response = await this.client.send(command)

    if (!response.CiphertextBlob) {
      throw new Error('KMS encryption failed: No ciphertext returned')
    }

    return Buffer.from(response.CiphertextBlob).toString('base64')
  }

  /**
   * Decrypt API key
   */
  async decryptAPIKey(encryptedKey: string, organizationId: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedKey, 'base64'),
      EncryptionContext: {
        Purpose: 'API-Key',
        Application: 'ADSapp',
        OrganizationId: organizationId,
      },
    })

    const response = await this.client.send(command)

    if (!response.Plaintext) {
      throw new Error('KMS decryption failed: No plaintext returned')
    }

    return Buffer.from(response.Plaintext).toString('utf-8')
  }

  /**
   * Envelope encryption for large data (>4KB)
   *
   * Process:
   * 1. Generate data encryption key (DEK) from KMS
   * 2. Encrypt data with DEK (symmetric encryption)
   * 3. Store encrypted DEK with encrypted data
   */
  async encryptLargeData(
    data: string,
    context: Record<string, string>
  ): Promise<{
    encryptedData: string
    encryptedDataKey: string
  }> {
    // 1. Generate data encryption key
    const dataKeyCommand = new GenerateDataKeyCommand({
      KeyId: this.MASTER_KEY_ID,
      KeySpec: 'AES_256',
      EncryptionContext: context,
    })

    const dataKeyResponse = await this.client.send(dataKeyCommand)

    if (!dataKeyResponse.Plaintext || !dataKeyResponse.CiphertextBlob) {
      throw new Error('KMS data key generation failed')
    }

    // 2. Encrypt data with DEK using Web Crypto API
    const dataKey = dataKeyResponse.Plaintext
    const encryptedData = await this.encryptWithAES256(data, dataKey)

    // 3. Return encrypted data and encrypted DEK
    return {
      encryptedData,
      encryptedDataKey: Buffer.from(dataKeyResponse.CiphertextBlob).toString('base64'),
    }
  }

  /**
   * Decrypt envelope-encrypted data
   */
  async decryptLargeData(
    encryptedData: string,
    encryptedDataKey: string,
    context: Record<string, string>
  ): Promise<string> {
    // 1. Decrypt the data encryption key
    const dekCommand = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedDataKey, 'base64'),
      EncryptionContext: context,
    })

    const dekResponse = await this.client.send(dekCommand)

    if (!dekResponse.Plaintext) {
      throw new Error('KMS DEK decryption failed')
    }

    // 2. Decrypt data with DEK
    return this.decryptWithAES256(encryptedData, dekResponse.Plaintext)
  }

  /**
   * AES-256-GCM encryption using Web Crypto API
   */
  private async encryptWithAES256(data: string, key: Uint8Array): Promise<string> {
    // Import key
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
      'encrypt',
    ])

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      new TextEncoder().encode(data)
    )

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    return Buffer.from(combined).toString('base64')
  }

  /**
   * AES-256-GCM decryption using Web Crypto API
   */
  private async decryptWithAES256(encryptedData: string, key: Uint8Array): Promise<string> {
    // Import key
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, [
      'decrypt',
    ])

    // Split IV and encrypted data
    const combined = Buffer.from(encryptedData, 'base64')
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      data
    )

    return new TextDecoder().decode(decryptedBuffer)
  }

  /**
   * Rotate encryption for existing data
   * Used when keys are rotated or upgraded
   */
  async reEncryptData(oldEncryptedData: string, keyType: 'mfa' | 'api'): Promise<string> {
    // 1. Decrypt with old key (KMS handles key rotation automatically)
    let decrypted: string

    if (keyType === 'mfa') {
      decrypted = await this.decryptMFASecret(oldEncryptedData)
    } else {
      throw new Error('API key re-encryption requires organizationId')
    }

    // 2. Re-encrypt with current key version
    if (keyType === 'mfa') {
      return this.encryptMFASecret(decrypted)
    }

    throw new Error('Invalid key type')
  }

  /**
   * Health check for KMS connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now()

    try {
      // Try to encrypt a test string
      const testData = 'health-check'
      const encrypted = await this.encryptMFASecret(testData)
      const decrypted = await this.decryptMFASecret(encrypted)

      if (decrypted !== testData) {
        throw new Error('Encryption round-trip failed')
      }

      return {
        status: 'healthy',
        latency: Date.now() - start,
      }
    } catch (error) {
      console.error('[KMS] Health check failed:', error)
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      }
    }
  }
}

// Singleton instance
let kmsInstance: KMSService | null = null

export function getKMSService(): KMSService {
  if (!kmsInstance) {
    kmsInstance = new KMSService()
  }
  return kmsInstance
}
```

##### Step 3: Migrate Existing Encrypted Data to KMS (6 hours)

**File**: `src/lib/security/kms-migration.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { getKMSService } from './kms'

/**
 * Migration Service to Move Existing Encrypted Data to KMS
 *
 * Migrates:
 * - MFA secrets from local encryption to KMS
 * - API keys from environment variables to KMS
 * - Webhook secrets to KMS
 */
export class KMSMigrationService {
  private kms = getKMSService()

  /**
   * Migrate all MFA secrets to KMS encryption
   */
  async migrateMFASecrets(): Promise<{
    total: number
    migrated: number
    failed: number
    errors: string[]
  }> {
    const supabase = await createClient()

    // Get all profiles with MFA enabled
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, mfa_secret, mfa_enabled')
      .eq('mfa_enabled', true)
      .not('mfa_secret', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`)
    }

    const results = {
      total: profiles?.length || 0,
      migrated: 0,
      failed: 0,
      errors: [] as string[],
    }

    if (!profiles) {
      return results
    }

    console.log(`[KMS Migration] Starting MFA secrets migration for ${profiles.length} profiles`)

    for (const profile of profiles) {
      try {
        // Encrypt with KMS
        const encryptedSecret = await this.kms.encryptMFASecret(profile.mfa_secret)

        // Update database with KMS-encrypted secret
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            mfa_secret: encryptedSecret,
            mfa_encryption_version: 'kms-v1',
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (updateError) {
          throw updateError
        }

        results.migrated++
        console.log(`[KMS Migration] Migrated MFA secret for profile ${profile.id}`)
      } catch (error: any) {
        results.failed++
        results.errors.push(`Profile ${profile.id}: ${error.message}`)
        console.error(`[KMS Migration] Failed to migrate profile ${profile.id}:`, error)
      }
    }

    console.log(`[KMS Migration] Completed: ${results.migrated} migrated, ${results.failed} failed`)
    return results
  }

  /**
   * Migrate organization API keys to KMS
   */
  async migrateAPIKeys(): Promise<{
    total: number
    migrated: number
    failed: number
    errors: string[]
  }> {
    const supabase = await createClient()

    // Get all organizations with WhatsApp credentials
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, whatsapp_access_token, settings')
      .not('whatsapp_access_token', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`)
    }

    const results = {
      total: organizations?.length || 0,
      migrated: 0,
      failed: 0,
      errors: [] as string[],
    }

    if (!organizations) {
      return results
    }

    console.log(
      `[KMS Migration] Starting API keys migration for ${organizations.length} organizations`
    )

    for (const org of organizations) {
      try {
        // Encrypt WhatsApp access token with KMS
        const encryptedToken = await this.kms.encryptAPIKey(org.whatsapp_access_token, org.id)

        // Encrypt webhook secret if present
        const webhookSecret = org.settings?.whatsapp?.webhook_secret
        let encryptedWebhookSecret: string | null = null

        if (webhookSecret) {
          encryptedWebhookSecret = await this.kms.encryptAPIKey(webhookSecret, org.id)
        }

        // Update database
        const updatedSettings = {
          ...org.settings,
          whatsapp: {
            ...org.settings?.whatsapp,
            webhook_secret: encryptedWebhookSecret || org.settings?.whatsapp?.webhook_secret,
          },
          encryption: {
            version: 'kms-v1',
            key_id: process.env.AWS_KMS_API_KEYS_KEY_ID,
            migrated_at: new Date().toISOString(),
          },
        }

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            whatsapp_access_token: encryptedToken,
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', org.id)

        if (updateError) {
          throw updateError
        }

        results.migrated++
        console.log(`[KMS Migration] Migrated API keys for organization ${org.id}`)
      } catch (error: any) {
        results.failed++
        results.errors.push(`Organization ${org.id}: ${error.message}`)
        console.error(`[KMS Migration] Failed to migrate organization ${org.id}:`, error)
      }
    }

    console.log(`[KMS Migration] Completed: ${results.migrated} migrated, ${results.failed} failed`)
    return results
  }

  /**
   * Verify migration integrity
   * Ensures all encrypted data can be decrypted
   */
  async verifyMigration(): Promise<{
    mfa_secrets_valid: number
    mfa_secrets_invalid: number
    api_keys_valid: number
    api_keys_invalid: number
  }> {
    const supabase = await createClient()

    const results = {
      mfa_secrets_valid: 0,
      mfa_secrets_invalid: 0,
      api_keys_valid: 0,
      api_keys_invalid: 0,
    }

    // Verify MFA secrets
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, mfa_secret, mfa_encryption_version')
      .eq('mfa_enabled', true)
      .eq('mfa_encryption_version', 'kms-v1')

    if (profiles) {
      for (const profile of profiles) {
        try {
          await this.kms.decryptMFASecret(profile.mfa_secret)
          results.mfa_secrets_valid++
        } catch (error) {
          results.mfa_secrets_invalid++
          console.error(`[KMS Verify] Invalid MFA secret for profile ${profile.id}`)
        }
      }
    }

    // Verify API keys
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, whatsapp_access_token, settings')
      .not('whatsapp_access_token', 'is', null)

    if (organizations) {
      for (const org of organizations) {
        if (org.settings?.encryption?.version === 'kms-v1') {
          try {
            await this.kms.decryptAPIKey(org.whatsapp_access_token, org.id)
            results.api_keys_valid++
          } catch (error) {
            results.api_keys_invalid++
            console.error(`[KMS Verify] Invalid API key for organization ${org.id}`)
          }
        }
      }
    }

    return results
  }
}
```

**File**: `src/app/api/admin/kms/migrate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { KMSMigrationService } from '@/lib/security/kms-migration'
import { validateSuperAdminAccess } from '@/lib/middleware/super-admin'

/**
 * Super Admin Endpoint: Migrate Existing Data to KMS
 *
 * POST /api/admin/kms/migrate
 */
export async function POST(request: NextRequest) {
  // Only super admins can trigger migration
  const authCheck = await validateSuperAdminAccess(request)
  if (authCheck.status !== 200) {
    return authCheck
  }

  try {
    const migrationService = new KMSMigrationService()

    // Migrate MFA secrets
    const mfaResults = await migrationService.migrateMFASecrets()

    // Migrate API keys
    const apiKeyResults = await migrationService.migrateAPIKeys()

    // Verify migration
    const verification = await migrationService.verifyMigration()

    return NextResponse.json({
      success: true,
      results: {
        mfa_secrets: mfaResults,
        api_keys: apiKeyResults,
        verification,
      },
    })
  } catch (error: any) {
    console.error('[KMS Migration] Error:', error)
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
```

#### Day 3-4: Azure Key Vault Integration (Alternative to AWS KMS) (16 hours)

**For organizations using Azure instead of AWS**

##### Step 1: Azure Key Vault Setup (4 hours)

**File**: `infrastructure/azure/keyvault-setup.bicep`

```bicep
// Azure Bicep template for Key Vault

@description('The Azure region for resources')
param location string = resourceGroup().location

@description('Environment name')
param environment string = 'production'

@description('Key Vault name')
param keyVaultName string = 'adsapp-kv-${environment}'

// Key Vault resource
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // Premium for HSM-backed keys
    }
    tenantId: subscription().tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enableRbacAuthorization: true // Use Azure RBAC instead of access policies
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny' // Deny by default, explicit allow
      ipRules: [
        // Add your Vercel outbound IPs here
      ]
      virtualNetworkRules: []
    }
  }

  tags: {
    Application: 'ADSapp'
    Environment: environment
    ManagedBy: 'Bicep'
  }
}

// Master encryption key
resource masterKey 'Microsoft.KeyVault/vaults/keys@2023-02-01' = {
  parent: keyVault
  name: 'adsapp-master-key'
  properties: {
    kty: 'RSA-HSM' // HSM-backed key
    keySize: 4096
    keyOps: [
      'encrypt'
      'decrypt'
      'wrapKey'
      'unwrapKey'
    ]
    attributes: {
      enabled: true
      exportable: false
    }
    rotationPolicy: {
      attributes: {
        expiryTime: 'P90D' // Rotate every 90 days
      }
      lifetimeActions: [
        {
          trigger: {
            timeBeforeExpiry: 'P30D' // Notify 30 days before expiry
          }
          action: {
            type: 'Notify'
          }
        }
        {
          trigger: {
            timeBeforeExpiry: 'P7D' // Auto-rotate 7 days before expiry
          }
          action: {
            type: 'Rotate'
          }
        }
      ]
    }
  }
}

// MFA secrets key
resource mfaSecretsKey 'Microsoft.KeyVault/vaults/keys@2023-02-01' = {
  parent: keyVault
  name: 'adsapp-mfa-secrets-key'
  properties: {
    kty: 'RSA-HSM'
    keySize: 4096
    keyOps: [
      'encrypt'
      'decrypt'
    ]
    attributes: {
      enabled: true
      exportable: false
    }
  }
}

// API keys encryption key
resource apiKeysKey 'Microsoft.KeyVault/vaults/keys@2023-02-01' = {
  parent: keyVault
  name: 'adsapp-api-keys-key'
  properties: {
    kty: 'RSA-HSM'
    keySize: 4096
    keyOps: [
      'encrypt'
      'decrypt'
    ]
    attributes: {
      enabled: true
      exportable: false
    }
  }
}

// Managed Identity for application
resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'adsapp-identity-${environment}'
  location: location
}

// Role assignment: Crypto User on Key Vault
resource cryptoUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, appIdentity.id, 'Crypto User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '12338af0-0e69-4776-bea7-57ae8d297424') // Key Vault Crypto User
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Diagnostic settings for audit logging
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'adsapp-kv-diagnostics'
  scope: keyVault
  properties: {
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 90
        }
      }
    ]
    workspaceId: logAnalytics.id
  }
}

// Log Analytics workspace for monitoring
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'adsapp-logs-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
}

// Outputs
output keyVaultId string = keyVault.id
output keyVaultUri string = keyVault.properties.vaultUri
output masterKeyName string = masterKey.name
output mfaSecretsKeyName string = mfaSecretsKey.name
output apiKeysKeyName string = apiKeysKey.name
output appIdentityClientId string = appIdentity.properties.clientId
output appIdentityPrincipalId string = appIdentity.properties.principalId
```

**Deployment Commands**:

```bash
cd infrastructure/azure

# Create resource group
az group create --name adsapp-rg-production --location eastus

# Deploy Key Vault
az deployment group create \
  --resource-group adsapp-rg-production \
  --template-file keyvault-setup.bicep \
  --parameters environment=production
```

##### Step 2: Azure Key Vault Service Implementation (6 hours)

**File**: `src/lib/security/azure-keyvault.ts`

```typescript
import { DefaultAzureCredential } from '@azure/identity'
import { CryptographyClient, KeyClient } from '@azure/keyvault-keys'

/**
 * Azure Key Vault Service for Enterprise-Grade Encryption
 *
 * Alternative to AWS KMS for Azure-based deployments
 */
export class AzureKeyVaultService {
  private keyClient: KeyClient
  private credential: DefaultAzureCredential

  private readonly KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL!
  private readonly MASTER_KEY_NAME = 'adsapp-master-key'
  private readonly MFA_SECRETS_KEY_NAME = 'adsapp-mfa-secrets-key'
  private readonly API_KEYS_KEY_NAME = 'adsapp-api-keys-key'

  constructor() {
    this.credential = new DefaultAzureCredential()
    this.keyClient = new KeyClient(this.KEY_VAULT_URL, this.credential)
  }

  /**
   * Encrypt MFA secret with Azure Key Vault
   */
  async encryptMFASecret(secret: string): Promise<string> {
    const key = await this.keyClient.getKey(this.MFA_SECRETS_KEY_NAME)
    const cryptoClient = new CryptographyClient(key, this.credential)

    const encryptResult = await cryptoClient.encrypt({
      algorithm: 'RSA-OAEP-256',
      plaintext: Buffer.from(secret, 'utf-8'),
    })

    return Buffer.from(encryptResult.result).toString('base64')
  }

  /**
   * Decrypt MFA secret
   */
  async decryptMFASecret(encryptedSecret: string): Promise<string> {
    const key = await this.keyClient.getKey(this.MFA_SECRETS_KEY_NAME)
    const cryptoClient = new CryptographyClient(key, this.credential)

    const decryptResult = await cryptoClient.decrypt({
      algorithm: 'RSA-OAEP-256',
      ciphertext: Buffer.from(encryptedSecret, 'base64'),
    })

    return Buffer.from(decryptResult.result).toString('utf-8')
  }

  /**
   * Encrypt API key
   */
  async encryptAPIKey(apiKey: string, organizationId: string): Promise<string> {
    const key = await this.keyClient.getKey(this.API_KEYS_KEY_NAME)
    const cryptoClient = new CryptographyClient(key, this.credential)

    const encryptResult = await cryptoClient.encrypt({
      algorithm: 'RSA-OAEP-256',
      plaintext: Buffer.from(apiKey, 'utf-8'),
      // Additional authenticated data for context
      additionalAuthenticatedData: Buffer.from(organizationId, 'utf-8'),
    })

    return Buffer.from(encryptResult.result).toString('base64')
  }

  /**
   * Decrypt API key
   */
  async decryptAPIKey(encryptedKey: string, organizationId: string): Promise<string> {
    const key = await this.keyClient.getKey(this.API_KEYS_KEY_NAME)
    const cryptoClient = new CryptographyClient(key, this.credential)

    const decryptResult = await cryptoClient.decrypt({
      algorithm: 'RSA-OAEP-256',
      ciphertext: Buffer.from(encryptedKey, 'base64'),
      additionalAuthenticatedData: Buffer.from(organizationId, 'utf-8'),
    })

    return Buffer.from(decryptResult.result).toString('utf-8')
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now()

    try {
      // Verify we can access the Key Vault
      await this.keyClient.getKey(this.MASTER_KEY_NAME)

      return {
        status: 'healthy',
        latency: Date.now() - start,
      }
    } catch (error) {
      console.error('[Azure Key Vault] Health check failed:', error)
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      }
    }
  }
}
```

#### Day 5: Database Schema Updates for KMS (8 hours)

**File**: `supabase/migrations/20251013_kms_integration.sql`

```sql
-- ============================================
-- KMS INTEGRATION DATABASE MIGRATION
-- Add columns for KMS-encrypted data tracking
-- ============================================

-- 1. Update profiles table for KMS-encrypted MFA secrets
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mfa_encryption_version TEXT DEFAULT 'local-v1',
ADD COLUMN IF NOT EXISTS mfa_key_id TEXT,
ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mfa_backup_codes_remaining INTEGER DEFAULT 10;

COMMENT ON COLUMN profiles.mfa_encryption_version IS 'Encryption version: local-v1, kms-v1, azure-kv-v1';
COMMENT ON COLUMN profiles.mfa_key_id IS 'KMS/KeyVault key ID used for encryption';
COMMENT ON COLUMN profiles.mfa_enrolled_at IS 'Timestamp when MFA was first enabled';
COMMENT ON COLUMN profiles.mfa_backup_codes_remaining IS 'Number of unused backup codes';

-- 2. Update organizations table for KMS-encrypted API keys
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS api_key_encryption_version TEXT DEFAULT 'env-v1',
ADD COLUMN IF NOT EXISTS api_key_key_id TEXT,
ADD COLUMN IF NOT EXISTS encryption_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.api_key_encryption_version IS 'API key encryption version: env-v1, kms-v1, azure-kv-v1';
COMMENT ON COLUMN organizations.api_key_key_id IS 'KMS/KeyVault key ID for API keys';
COMMENT ON COLUMN organizations.encryption_metadata IS 'Additional encryption context and metadata';

-- 3. Create encryption audit log table
CREATE TABLE IF NOT EXISTS encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'profile', 'organization', 'api_key'
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'encrypt', 'decrypt', 're-encrypt', 'rotate'
  key_service TEXT NOT NULL, -- 'aws-kms', 'azure-keyvault'
  key_id TEXT NOT NULL,
  encryption_version TEXT NOT NULL,
  initiated_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_encryption_audit_entity ON encryption_audit_log(entity_type, entity_id);
CREATE INDEX idx_encryption_audit_created_at ON encryption_audit_log(created_at DESC);
CREATE INDEX idx_encryption_audit_operation ON encryption_audit_log(operation);

COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption operations';

-- 4. Create function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_operation TEXT,
  p_key_service TEXT,
  p_key_id TEXT,
  p_encryption_version TEXT,
  p_initiated_by UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO encryption_audit_log (
    entity_type,
    entity_id,
    operation,
    key_service,
    key_id,
    encryption_version,
    initiated_by,
    status,
    error_message,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_operation,
    p_key_service,
    p_key_id,
    p_encryption_version,
    p_initiated_by,
    p_status,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create view for encryption status dashboard
CREATE OR REPLACE VIEW encryption_status_summary AS
SELECT
  'MFA Secrets' AS data_type,
  COUNT(*) AS total_records,
  SUM(CASE WHEN mfa_encryption_version = 'kms-v1' THEN 1 ELSE 0 END) AS kms_encrypted,
  SUM(CASE WHEN mfa_encryption_version = 'azure-kv-v1' THEN 1 ELSE 0 END) AS azure_encrypted,
  SUM(CASE WHEN mfa_encryption_version = 'local-v1' THEN 1 ELSE 0 END) AS local_encrypted
FROM profiles
WHERE mfa_enabled = true

UNION ALL

SELECT
  'API Keys' AS data_type,
  COUNT(*) AS total_records,
  SUM(CASE WHEN api_key_encryption_version = 'kms-v1' THEN 1 ELSE 0 END) AS kms_encrypted,
  SUM(CASE WHEN api_key_encryption_version = 'azure-kv-v1' THEN 1 ELSE 0 END) AS azure_encrypted,
  SUM(CASE WHEN api_key_encryption_version = 'env-v1' THEN 1 ELSE 0 END) AS local_encrypted
FROM organizations
WHERE whatsapp_access_token IS NOT NULL;

-- 6. Grant permissions
GRANT SELECT ON encryption_status_summary TO authenticated;
GRANT INSERT ON encryption_audit_log TO service_role;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_mfa_encryption_version ON profiles(mfa_encryption_version);
CREATE INDEX IF NOT EXISTS idx_organizations_api_key_encryption_version ON organizations(api_key_encryption_version);
```

**Deliverables - Week 23**:

- ✅ AWS KMS infrastructure deployed with Terraform
- ✅ Azure Key Vault alternative configuration
- ✅ KMS service implementation with envelope encryption
- ✅ Migration service for existing encrypted data
- ✅ Database schema updates with audit logging
- ✅ Encryption status dashboard
- ✅ Health check endpoints for KMS/Key Vault
- ✅ Complete documentation for both AWS and Azure paths

---

### Week 24: C-007 - GDPR Data Retention & Automated Deletion (40 hours)

#### Day 1-2: GDPR Data Classification & Retention Policies (16 hours)

**Problem**: No systematic data retention policy or automated deletion capability violates GDPR Article 5(1)(e) and Article 17 (Right to Erasure).

##### Step 1: Data Classification Framework (4 hours)

**File**: `src/lib/gdpr/data-classification.ts`

```typescript
/**
 * GDPR Data Classification System
 *
 * Implements data categories and retention policies per GDPR requirements:
 * - Article 5(1)(e): Storage limitation
 * - Article 6: Lawful basis for processing
 * - Article 17: Right to erasure
 */

export enum DataCategory {
  // Personal Identifiable Information (PII)
  PERSONAL_IDENTITY = 'personal_identity', // Name, email, phone
  COMMUNICATION_CONTENT = 'communication_content', // Messages, conversations
  USAGE_DATA = 'usage_data', // Analytics, login history
  FINANCIAL_DATA = 'financial_data', // Billing, subscription
  AUTHENTICATION = 'authentication', // MFA secrets, passwords
  ORGANIZATIONAL = 'organizational', // Organization settings
  AUDIT_LOGS = 'audit_logs', // Security and compliance logs
}

export enum LawfulBasis {
  CONSENT = 'consent', // User gave explicit consent
  CONTRACT = 'contract', // Necessary for contract performance
  LEGAL_OBLIGATION = 'legal_obligation', // Required by law
  LEGITIMATE_INTEREST = 'legitimate_interest', // Legitimate business interest
}

export enum RetentionPeriod {
  THIRTY_DAYS = 30,
  NINETY_DAYS = 90,
  ONE_YEAR = 365,
  THREE_YEARS = 1095,
  SEVEN_YEARS = 2555, // Common legal requirement
  INDEFINITE = -1, // Until explicit deletion request
}

/**
 * Data Retention Policy Matrix
 * Defines retention period for each data category and lawful basis
 */
export const DATA_RETENTION_POLICIES: Record<
  DataCategory,
  {
    lawfulBasis: LawfulBasis
    retentionPeriod: RetentionPeriod
    automaticDeletion: boolean
    description: string
  }
> = {
  [DataCategory.PERSONAL_IDENTITY]: {
    lawfulBasis: LawfulBasis.CONTRACT,
    retentionPeriod: RetentionPeriod.INDEFINITE,
    automaticDeletion: false, // Delete on account closure
    description: 'Name, email, phone - required for service delivery',
  },
  [DataCategory.COMMUNICATION_CONTENT]: {
    lawfulBasis: LawfulBasis.CONSENT,
    retentionPeriod: RetentionPeriod.ONE_YEAR,
    automaticDeletion: true,
    description: 'WhatsApp messages and conversation content',
  },
  [DataCategory.USAGE_DATA]: {
    lawfulBasis: LawfulBasis.LEGITIMATE_INTEREST,
    retentionPeriod: RetentionPeriod.NINETY_DAYS,
    automaticDeletion: true,
    description: 'Analytics, session data, feature usage',
  },
  [DataCategory.FINANCIAL_DATA]: {
    lawfulBasis: LawfulBasis.LEGAL_OBLIGATION,
    retentionPeriod: RetentionPeriod.SEVEN_YEARS,
    automaticDeletion: true,
    description: 'Billing records, invoices - tax compliance',
  },
  [DataCategory.AUTHENTICATION]: {
    lawfulBasis: LawfulBasis.CONTRACT,
    retentionPeriod: RetentionPeriod.INDEFINITE,
    automaticDeletion: false, // Delete on account closure
    description: 'MFA secrets, password hashes - security',
  },
  [DataCategory.ORGANIZATIONAL]: {
    lawfulBasis: LawfulBasis.CONTRACT,
    retentionPeriod: RetentionPeriod.INDEFINITE,
    automaticDeletion: false,
    description: 'Organization settings and configuration',
  },
  [DataCategory.AUDIT_LOGS]: {
    lawfulBasis: LawfulBasis.LEGAL_OBLIGATION,
    retentionPeriod: RetentionPeriod.THREE_YEARS,
    automaticDeletion: true,
    description: 'Security logs, access logs - compliance',
  },
}

/**
 * Calculate deletion date based on retention policy
 */
export function calculateDeletionDate(category: DataCategory, createdAt: Date): Date | null {
  const policy = DATA_RETENTION_POLICIES[category]

  if (policy.retentionPeriod === RetentionPeriod.INDEFINITE) {
    return null // No automatic deletion
  }

  const deletionDate = new Date(createdAt)
  deletionDate.setDate(deletionDate.getDate() + policy.retentionPeriod)

  return deletionDate
}

/**
 * Check if data should be deleted
 */
export function shouldDelete(
  category: DataCategory,
  createdAt: Date,
  now: Date = new Date()
): boolean {
  const deletionDate = calculateDeletionDate(category, createdAt)

  if (!deletionDate) {
    return false // Indefinite retention
  }

  return now >= deletionDate
}
```

##### Step 2: Database Schema for Data Retention (6 hours)

**File**: `supabase/migrations/20251013_gdpr_data_retention.sql`

```sql
-- ============================================
-- GDPR DATA RETENTION & DELETION SCHEMA
-- Implements data classification and automated deletion
-- ============================================

-- 1. Create data retention tracking table
CREATE TABLE IF NOT EXISTS data_retention_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  data_category TEXT NOT NULL, -- Maps to DataCategory enum
  lawful_basis TEXT NOT NULL, -- Maps to LawfulBasis enum
  retention_period_days INTEGER NOT NULL, -- -1 for indefinite
  created_at TIMESTAMPTZ NOT NULL,
  deletion_scheduled_at TIMESTAMPTZ, -- NULL if indefinite retention
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT, -- 'automatic', 'user_request', 'account_closure'
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Composite index for efficient queries
  UNIQUE(table_name, record_id)
);

CREATE INDEX idx_retention_deletion_scheduled ON data_retention_metadata(deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_retention_table_category ON data_retention_metadata(table_name, data_category);

COMMENT ON TABLE data_retention_metadata IS 'Tracks data retention policies and scheduled deletions per GDPR';

-- 2. Create deletion queue table
CREATE TABLE IF NOT EXISTS deletion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  data_category TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority INTEGER NOT NULL DEFAULT 5, -- 1 (high) to 10 (low)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deletion_queue_status ON deletion_queue(status, scheduled_for);
CREATE INDEX idx_deletion_queue_table_record ON deletion_queue(table_name, record_id);

COMMENT ON TABLE deletion_queue IS 'Queue for automated data deletion jobs';

-- 3. Create DSAR (Data Subject Access Request) table
CREATE TABLE IF NOT EXISTS data_subject_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL if requesting for deleted account
  email TEXT NOT NULL,
  request_type TEXT NOT NULL, -- 'access', 'rectification', 'erasure', 'portability', 'restriction'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'urgent', 'normal', 'low'
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  identity_verification_method TEXT,
  identity_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  request_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_data JSONB,
  response_sent_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ NOT NULL, -- 30 days from request per GDPR Article 12(3)
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsar_organization ON data_subject_access_requests(organization_id);
CREATE INDEX idx_dsar_user ON data_subject_access_requests(user_id);
CREATE INDEX idx_dsar_status ON data_subject_access_requests(status);
CREATE INDEX idx_dsar_deadline ON data_subject_access_requests(deadline_at) WHERE status != 'completed';

COMMENT ON TABLE data_subject_access_requests IS 'GDPR Data Subject Access Requests (DSAR) per Article 15-22';

-- 4. Add retention columns to existing tables
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'communication_content',
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'communication_content',
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'personal_identity',
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'audit_logs',
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

ALTER TABLE billing_events
ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'financial_data',
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- 5. Create function to schedule data retention
CREATE OR REPLACE FUNCTION schedule_data_retention()
RETURNS TRIGGER AS $$
DECLARE
  v_retention_days INTEGER;
  v_deletion_date TIMESTAMPTZ;
BEGIN
  -- Determine retention period based on category
  v_retention_days := CASE NEW.retention_category
    WHEN 'communication_content' THEN 365    -- 1 year
    WHEN 'usage_data' THEN 90                -- 90 days
    WHEN 'financial_data' THEN 2555          -- 7 years
    WHEN 'audit_logs' THEN 1095              -- 3 years
    WHEN 'personal_identity' THEN -1         -- Indefinite
    WHEN 'authentication' THEN -1            -- Indefinite
    WHEN 'organizational' THEN -1            -- Indefinite
    ELSE 365                                 -- Default 1 year
  END;

  -- Calculate deletion date (NULL for indefinite)
  IF v_retention_days = -1 THEN
    NEW.scheduled_deletion_at := NULL;
  ELSE
    v_deletion_date := NOW() + (v_retention_days || ' days')::INTERVAL;
    NEW.scheduled_deletion_at := v_deletion_date;

    -- Add to deletion queue if deletion is scheduled
    INSERT INTO deletion_queue (
      table_name,
      record_id,
      data_category,
      scheduled_for
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      NEW.retention_category,
      v_deletion_date
    );
  END IF;

  -- Track in retention metadata
  INSERT INTO data_retention_metadata (
    table_name,
    record_id,
    data_category,
    lawful_basis,
    retention_period_days,
    created_at,
    deletion_scheduled_at
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    NEW.retention_category,
    CASE NEW.retention_category
      WHEN 'communication_content' THEN 'consent'
      WHEN 'usage_data' THEN 'legitimate_interest'
      WHEN 'financial_data' THEN 'legal_obligation'
      WHEN 'audit_logs' THEN 'legal_obligation'
      ELSE 'contract'
    END,
    v_retention_days,
    NOW(),
    v_deletion_date
  )
  ON CONFLICT (table_name, record_id) DO UPDATE
  SET deletion_scheduled_at = EXCLUDED.deletion_scheduled_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Apply retention triggers to all relevant tables
CREATE TRIGGER trg_messages_retention
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION schedule_data_retention();

CREATE TRIGGER trg_conversations_retention
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION schedule_data_retention();

CREATE TRIGGER trg_audit_logs_retention
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION schedule_data_retention();

CREATE TRIGGER trg_billing_events_retention
  BEFORE INSERT ON billing_events
  FOR EACH ROW
  EXECUTE FUNCTION schedule_data_retention();

-- 7. Create function to process deletion queue
CREATE OR REPLACE FUNCTION process_deletion_queue(p_batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
  deleted_count INTEGER,
  failed_count INTEGER,
  errors JSONB
) AS $$
DECLARE
  v_record RECORD;
  v_deleted INTEGER := 0;
  v_failed INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_error_msg TEXT;
BEGIN
  -- Get pending deletions that are due
  FOR v_record IN
    SELECT id, table_name, record_id, data_category
    FROM deletion_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND attempts < max_attempts
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Update status to in_progress
      UPDATE deletion_queue
      SET status = 'in_progress',
          attempts = attempts + 1,
          last_attempt_at = NOW()
      WHERE id = v_record.id;

      -- Perform deletion based on table
      EXECUTE format('DELETE FROM %I WHERE id = $1', v_record.table_name)
      USING v_record.record_id;

      -- Mark as completed
      UPDATE deletion_queue
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = v_record.id;

      -- Update retention metadata
      UPDATE data_retention_metadata
      SET deleted_at = NOW(),
          deletion_reason = 'automatic'
      WHERE table_name = v_record.table_name
        AND record_id = v_record.record_id;

      v_deleted := v_deleted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_error_msg := SQLERRM;

      -- Mark as failed if max attempts reached
      IF v_record.attempts + 1 >= 3 THEN
        UPDATE deletion_queue
        SET status = 'failed',
            error_message = v_error_msg
        WHERE id = v_record.id;
      ELSE
        -- Reset to pending for retry
        UPDATE deletion_queue
        SET status = 'pending',
            error_message = v_error_msg
        WHERE id = v_record.id;
      END IF;

      -- Add to errors array
      v_errors := v_errors || jsonb_build_object(
        'record_id', v_record.record_id,
        'table', v_record.table_name,
        'error', v_error_msg
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_deleted, v_failed, v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create DSAR processing function
CREATE OR REPLACE FUNCTION generate_dsar_export(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_export JSONB;
BEGIN
  -- Compile all personal data for user
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE id = p_user_id),
    'organization', (SELECT row_to_json(o.*) FROM organizations o
                     JOIN profiles p ON p.organization_id = o.id
                     WHERE p.id = p_user_id),
    'conversations', (SELECT jsonb_agg(row_to_json(c.*)) FROM conversations c
                      WHERE c.assigned_agent_id = p_user_id),
    'messages', (SELECT jsonb_agg(row_to_json(m.*)) FROM messages m
                 WHERE m.sender_id = p_user_id),
    'contacts', (SELECT jsonb_agg(row_to_json(c.*)) FROM contacts c
                 JOIN profiles p ON c.organization_id = p.organization_id
                 WHERE p.id = p_user_id),
    'templates', (SELECT jsonb_agg(row_to_json(t.*)) FROM message_templates t
                  WHERE t.created_by = p_user_id),
    'audit_logs', (SELECT jsonb_agg(row_to_json(a.*)) FROM audit_logs a
                   WHERE a.user_id = p_user_id),
    'generated_at', NOW()
  ) INTO v_export;

  RETURN v_export;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON data_retention_metadata TO service_role;
GRANT SELECT, INSERT, UPDATE ON deletion_queue TO service_role;
GRANT SELECT, INSERT, UPDATE ON data_subject_access_requests TO authenticated;

-- RLS policies for DSAR requests
ALTER TABLE data_subject_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own DSAR requests"
  ON data_subject_access_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create DSAR requests"
  ON data_subject_access_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
```

**Continue to Part 2 with Days 3-5 for Week 24, SSO Implementation, RBAC, and Weeks 25-30...**

Would you like me to continue with the complete implementation? I'll provide all remaining days with the same level of detail, including:

- Week 24 Days 3-5: Automated deletion service implementation
- Week 25-26: SSO Integration (SAML 2.0, OAuth) and Advanced RBAC
- Week 27-30: API Versioning, Event Sourcing, Distributed Tracing, Horizontal Scaling

This will result in a complete 140+ page implementation plan matching the detail level of Phase 1.
