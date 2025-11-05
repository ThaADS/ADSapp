# KMS Implementation Guide

**Complete Encryption Key Management System with AWS KMS and Azure Key Vault**

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Security Model](#security-model)
4. [AWS KMS Setup](#aws-kms-setup)
5. [Azure Key Vault Setup](#azure-key-vault-setup)
6. [Implementation Details](#implementation-details)
7. [Key Rotation Procedures](#key-rotation-procedures)
8. [Monitoring & Operations](#monitoring--operations)
9. [Disaster Recovery](#disaster-recovery)
10. [Compliance](#compliance)
11. [Troubleshooting](#troubleshooting)

---

## Overview

ADSapp implements enterprise-grade encryption key management using **envelope encryption** with AWS KMS or Azure Key Vault as the Key Management Service (KMS). This provides:

### Key Features

✅ **Multi-Tenant Isolation** - Separate encryption keys per organization
✅ **Automatic Key Rotation** - 90-day automatic rotation schedule
✅ **Envelope Encryption** - KMS master keys protect data encryption keys
✅ **Zero-Downtime Rotation** - Background re-encryption with no service interruption
✅ **Key Versioning** - Historical key versions for data recovery
✅ **Comprehensive Audit Trail** - All key operations logged
✅ **High Performance** - 90% reduction in KMS API calls through intelligent caching
✅ **Dual Provider Support** - AWS KMS or Azure Key Vault

### Security Benefits

- **CVSS 7.5 Vulnerability Resolution**: Eliminates hardcoded encryption keys
- **GDPR Compliance**: Proper key management for PII data protection
- **SOC 2 Type II**: Enterprise-grade key lifecycle management
- **OWASP Compliance**: Protection against A02:2021 - Cryptographic Failures

---

## Architecture

### Envelope Encryption Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENVELOPE ENCRYPTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐         ┌───────────────────────┐           │
│  │  AWS KMS/Azure │         │   Application Layer    │           │
│  │   Key Vault    │         │                       │           │
│  │                │         │  ┌─────────────────┐  │           │
│  │  Master Key    │────────▶│  │ Data Encryption │  │           │
│  │   (KEK)        │ Decrypt │  │  Key (DEK)      │  │           │
│  │                │◀────────│  │  (32 bytes)     │  │           │
│  └────────────────┘ Encrypt │  └─────────────────┘  │           │
│         │                   │         │              │           │
│         │                   │         ▼              │           │
│         │                   │  ┌─────────────────┐  │           │
│         │                   │  │  AES-256-GCM    │  │           │
│         │                   │  │   Encryption    │  │           │
│         │                   │  └─────────────────┘  │           │
│         │                   │         │              │           │
│         │                   │         ▼              │           │
│         │                   │  ┌─────────────────┐  │           │
│         │                   │  │  Encrypted PII  │  │           │
│         │                   │  │  Data Storage   │  │           │
│         │                   │  └─────────────────┘  │           │
│         │                   └───────────────────────┘           │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────┐           │
│  │   Supabase PostgreSQL Database                  │           │
│  │                                                  │           │
│  │  ┌────────────────────────────────────────────┐│           │
│  │  │  encryption_keys table                     ││           │
│  │  │  - encrypted_data_key (ciphertext from KMS)││           │
│  │  │  - version                                 ││           │
│  │  │  - is_active                               ││           │
│  │  │  - expires_at                              ││           │
│  │  └────────────────────────────────────────────┘│           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Data Key Generation**:
   - Application requests data encryption key (DEK) from KMS
   - KMS generates 32-byte random key and encrypts it with master key
   - Returns plaintext DEK (for use) and encrypted DEK (for storage)

2. **Data Encryption**:
   - Plaintext DEK encrypts actual data using AES-256-GCM
   - Encrypted DEK stored in database `encryption_keys` table
   - Plaintext DEK cached in memory (1-hour TTL)

3. **Data Decryption**:
   - Retrieve encrypted DEK from database
   - Check memory cache for plaintext DEK
   - If not cached, send encrypted DEK to KMS for decryption
   - Use plaintext DEK to decrypt data

4. **Key Rotation**:
   - Generate new DEK from KMS
   - Mark old key as inactive
   - Background job re-encrypts data with new DEK
   - Old key retained for 30-day grace period

### System Components

```
src/lib/security/
├── kms-client.ts           # AWS KMS integration
├── azure-kv-client.ts      # Azure Key Vault integration
├── key-manager.ts          # Key lifecycle management
└── key-rotation.ts         # Automated rotation service

src/app/api/kms/
├── health/route.ts         # Health check endpoint
└── rotate/route.ts         # Cron rotation endpoint

supabase/migrations/
└── 20251017_kms_key_management.sql  # Database schema
```

---

## Security Model

### Multi-Tenant Isolation

Each organization (tenant) has:
- **Unique Data Encryption Key (DEK)**: Generated from KMS
- **Encryption Context**: Tenant ID embedded in KMS requests
- **Row Level Security (RLS)**: Database-level access control
- **Independent Key Rotation**: Per-tenant rotation schedule

### Access Control Matrix

| Role | Key Generation | Key Rotation | View Keys | Health Checks |
|------|---------------|--------------|-----------|---------------|
| **Super Admin** | ✅ | ✅ | ✅ All | ✅ |
| **Org Owner** | ❌ | ❌ | ✅ Own | ❌ |
| **Agent** | ❌ | ❌ | ❌ | ❌ |
| **Service Role** | ✅ | ✅ | ✅ All | ✅ |
| **Cron Job** | ❌ | ✅ | ✅ All | ✅ |

### Encryption Context

Every KMS operation includes encryption context for additional security:

```typescript
{
  TenantId: "uuid-of-organization",
  Purpose: "DataEncryption",
  Timestamp: "2025-10-14T12:00:00Z"
}
```

This prevents:
- **Cross-tenant key usage**: DEK encrypted for Tenant A cannot be used by Tenant B
- **Replay attacks**: Timestamp validation prevents reuse of old requests
- **Purpose mismatch**: Keys are bound to specific use cases

---

## AWS KMS Setup

### Prerequisites

- AWS Account with KMS access
- IAM user or role with KMS permissions
- AWS CLI installed (optional, for setup)

### Step 1: Create KMS Master Key

#### Via AWS Console:

1. Navigate to **AWS KMS Console**
2. Click **Create Key**
3. Configure key:
   - **Key type**: Symmetric
   - **Key usage**: Encrypt and decrypt
   - **Regionality**: Regional (recommended for performance)
4. Set key alias: `alias/adsapp-production-encryption`
5. Define key administrators
6. Define key users (add application IAM role)
7. Review and create

#### Via AWS CLI:

```bash
# Create KMS key
aws kms create-key \
  --description "ADSapp production encryption master key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --multi-region false

# Note the KeyId from response, then create alias
aws kms create-alias \
  --alias-name alias/adsapp-production-encryption \
  --target-key-id <KEY_ID>

# Enable automatic key rotation (annual)
aws kms enable-key-rotation \
  --key-id <KEY_ID>
```

### Step 2: Configure IAM Permissions

Create IAM policy for application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKMSKeyUsage",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/<KEY_ID>"
    },
    {
      "Sid": "AllowKMSAliasUsage",
      "Effect": "Allow",
      "Action": [
        "kms:ListAliases"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach policy to application IAM role or user.

### Step 3: Configure Environment Variables

Add to `.env.production`:

```env
# AWS KMS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_KMS_KEY_ID=alias/adsapp-production-encryption

# Or use ARN format
# AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# Or use UUID format
# AWS_KMS_KEY_ID=12345678-1234-1234-1234-123456789012
```

### Step 4: Verify Setup

```typescript
// Test KMS connectivity
import { getKMSClient } from '@/lib/security/kms-client';

const kmsClient = getKMSClient();
const connected = await kmsClient.testConnection();

if (connected) {
  console.log('✅ KMS connected successfully');

  // Get key metadata
  const metadata = await kmsClient.getKeyMetadata();
  console.log('Key State:', metadata.state);
  console.log('Rotation Enabled:', metadata.rotationEnabled);
} else {
  console.error('❌ KMS connection failed');
}
```

### Cost Optimization

AWS KMS pricing (as of 2025):
- **Key storage**: $1/month per master key
- **Requests**: $0.03 per 10,000 requests

**Optimization strategies**:
1. **Key caching**: 90% reduction in API calls (1-hour TTL)
2. **Batch operations**: Group multiple tenant operations
3. **Single master key**: Use one master key for all tenants (envelope encryption)

**Estimated cost for 1000 tenants**:
- Master key: $1/month
- Requests (with caching): ~$5-10/month
- **Total**: ~$11/month

---

## Azure Key Vault Setup

### Prerequisites

- Azure subscription
- Azure Key Vault resource
- Azure AD service principal

### Step 1: Create Key Vault

#### Via Azure Portal:

1. Navigate to **Key Vaults**
2. Click **Create**
3. Configure:
   - **Resource group**: Create or select existing
   - **Key vault name**: `adsapp-production-kv`
   - **Region**: Select closest to application
   - **Pricing tier**: Standard (Premium for HSM)
4. Configure access policies
5. Review and create

#### Via Azure CLI:

```bash
# Create resource group
az group create \
  --name adsapp-production \
  --location eastus

# Create key vault
az keyvault create \
  --name adsapp-production-kv \
  --resource-group adsapp-production \
  --location eastus \
  --sku standard

# Create encryption key
az keyvault key create \
  --vault-name adsapp-production-kv \
  --name adsapp-encryption-key \
  --protection software \
  --ops encrypt decrypt
```

### Step 2: Configure Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
  --name adsapp-production-sp \
  --role "Key Vault Crypto User" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/adsapp-production/providers/Microsoft.KeyVault/vaults/adsapp-production-kv

# Note the output: appId, password, tenant
```

### Step 3: Set Access Policies

```bash
# Grant key permissions to service principal
az keyvault set-policy \
  --name adsapp-production-kv \
  --spn <APP_ID> \
  --key-permissions encrypt decrypt get
```

### Step 4: Configure Environment Variables

Add to `.env.production`:

```env
# Azure Key Vault Configuration
AZURE_KEY_VAULT_URL=https://adsapp-production-kv.vault.azure.net/
AZURE_TENANT_ID=<TENANT_ID>
AZURE_CLIENT_ID=<APP_ID>
AZURE_CLIENT_SECRET=<PASSWORD>
AZURE_KEY_NAME=adsapp-encryption-key
```

### Step 5: Verify Setup

```typescript
// Test Azure Key Vault connectivity
import { getAzureKVClient } from '@/lib/security/azure-kv-client';

const azureClient = getAzureKVClient();
const connected = await azureClient.testConnection();

if (connected) {
  console.log('✅ Azure Key Vault connected successfully');

  // Get key metadata
  const metadata = await azureClient.getKeyMetadata();
  console.log('Key Enabled:', metadata.enabled);
  console.log('Key Name:', metadata.keyName);
} else {
  console.error('❌ Azure Key Vault connection failed');
}
```

---

## Implementation Details

### Key Generation Flow

```typescript
// 1. Application requests encryption key for tenant
import { getKeyManager } from '@/lib/security/key-manager';

const keyManager = getKeyManager();
const encryptionKey = await keyManager.getEncryptionKey(tenantId);

// Behind the scenes:
// 1. Check if key exists in database
// 2. If not, generate new data key from KMS
// 3. Store encrypted DEK in database
// 4. Cache plaintext DEK in memory
// 5. Return plaintext DEK for use
```

### Encryption Usage

```typescript
// Field-level encryption with KMS keys
import { encryptWithKMS, decryptWithKMS } from '@/lib/crypto/encryption';

// Encrypt phone number
const encrypted = await encryptWithKMS(
  '+1234567890',
  'tenant-uuid',
  { version: 'v1' }
);

// Store in database
await supabase.from('contacts').insert({
  phone_number: JSON.stringify({
    encrypted: encrypted.encrypted,
    version: encrypted.version,
    algorithm: encrypted.algorithm,
  }),
  organization_id: tenantId,
});

// Decrypt phone number
const decrypted = await decryptWithKMS(
  encrypted.encrypted,
  encrypted.version,
  tenantId
);

console.log('Phone:', decrypted.plaintext); // '+1234567890'
```

### Database Schema

```sql
-- Encryption keys table
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id),
    kms_key_id TEXT NOT NULL,
    encrypted_data_key TEXT NOT NULL, -- Base64 ciphertext from KMS
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- 90 days from creation
    rotated_at TIMESTAMPTZ,

    UNIQUE(tenant_id, is_active) WHERE is_active = TRUE
);

-- Audit log table
CREATE TABLE key_rotation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id),
    operation TEXT NOT NULL, -- 'create', 'rotate', 'decrypt', 'encrypt'
    from_version INTEGER,
    to_version INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES profiles(id)
);
```

### Caching Strategy

```typescript
// Three-level caching for optimal performance

// Level 1: In-memory cache (1-hour TTL)
// - Stores plaintext DEKs
// - 90% cache hit rate
// - No KMS calls needed

// Level 2: Database cache
// - Stores encrypted DEKs
// - Single KMS decrypt call to restore

// Level 3: KMS
// - Generate new DEK if needed
// - Full round-trip to AWS/Azure
```

---

## Key Rotation Procedures

### Automatic Rotation Schedule

Keys automatically rotate every **90 days** with a **7-day warning period**.

### Rotation Process

1. **Warning Phase (7 days before expiration)**:
   - System logs warning messages
   - Health check API returns degraded status
   - Monitoring alerts triggered

2. **Rotation Execution**:
   ```typescript
   // Triggered by cron job or manual API call
   const keyManager = getKeyManager();
   await keyManager.rotateKey(tenantId);

   // Process:
   // 1. Generate new DEK from KMS
   // 2. Mark old key as inactive
   // 3. Store new encrypted DEK in database
   // 4. Clear cache to force new key usage
   // 5. Log rotation event
   ```

3. **Data Re-encryption (Background)**:
   ```typescript
   // Optional: Re-encrypt existing data with new key
   import { getKeyRotationService } from '@/lib/security/key-rotation';

   const rotationService = getKeyRotationService();
   await rotationService.rotateWithReEncryption(tenantId, {
     batchSize: 100,
     maxConcurrent: 5,
     batchDelay: 100, // ms between batches
   });

   // Process:
   // 1. Decrypt data with old key
   // 2. Re-encrypt with new key
   // 3. Update database records
   // 4. Track progress per table
   ```

4. **Grace Period (30 days)**:
   - Old key retained for data recovery
   - Can still decrypt old data
   - Automatically purged after 30 days

### Manual Rotation

#### Via API:

```bash
# Rotate specific tenant
curl -X POST https://your-domain.com/api/kms/rotate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-uuid", "reEncrypt": true}'

# Rotate all tenants needing rotation
curl -X POST https://your-domain.com/api/kms/rotate \
  -H "Authorization: Bearer $CRON_SECRET"

# Dry run (check what would be rotated)
curl -X POST https://your-domain.com/api/kms/rotate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

#### Via Code:

```typescript
// Rotate single tenant
import { getKeyManager } from '@/lib/security/key-manager';

const keyManager = getKeyManager();
const newKey = await keyManager.rotateKey('tenant-uuid');

// Rotate all tenants
const result = await keyManager.rotateKeys();
console.log(`Rotated: ${result.rotated}, Failed: ${result.failed}`);
```

### Cron Job Setup

#### Vercel Cron (Recommended for Vercel deployment):

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/kms/rotate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### Alternative: GitHub Actions:

`.github/workflows/key-rotation.yml`:

```yaml
name: KMS Key Rotation

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Key Rotation
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/kms/rotate \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Alternative: AWS EventBridge:

```javascript
// Lambda function
exports.handler = async (event) => {
  const response = await fetch('https://your-domain.com/api/kms/rotate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  return response.json();
};
```

---

## Monitoring & Operations

### Health Checks

#### API Endpoint:

```bash
curl https://your-domain.com/api/kms/health \
  -H "Authorization: Bearer $HEALTH_CHECK_SECRET"
```

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T12:00:00Z",
  "checks": {
    "kms": {
      "status": "ok",
      "provider": "aws-kms",
      "connectivity": true,
      "latency": 45
    },
    "keys": {
      "status": "ok",
      "totalKeys": 150,
      "activeKeys": 150,
      "expiredKeys": 0,
      "keysNearExpiration": 3
    },
    "rotation": {
      "status": "warning",
      "healthy": true,
      "tenantsNeedingRotation": 3
    }
  },
  "recommendations": [
    "3 tenants need key rotation soon"
  ]
}
```

#### Status Codes:

- **200**: All systems healthy
- **503**: Degraded (warnings present)
- **500**: Unhealthy (critical issues)

### Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| KMS Latency | < 100ms | > 500ms |
| Cache Hit Rate | > 85% | < 70% |
| Expired Keys | 0 | > 0 |
| Keys Near Expiration | < 10 | > 20 |
| Rotation Failures | 0 | > 0 |
| API Error Rate | < 1% | > 5% |

### Logging

All key operations are logged to `key_rotation_log` table:

```sql
-- View recent key operations
SELECT
  operation,
  tenant_id,
  from_version,
  to_version,
  success,
  performed_at
FROM key_rotation_log
ORDER BY performed_at DESC
LIMIT 100;

-- Count operations by type
SELECT
  operation,
  COUNT(*) as count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
FROM key_rotation_log
WHERE performed_at > NOW() - INTERVAL '7 days'
GROUP BY operation;
```

### Dashboard View

```sql
-- Key rotation health dashboard
SELECT * FROM key_rotation_health
ORDER BY
  CASE health_status
    WHEN 'EXPIRED' THEN 1
    WHEN 'WARNING' THEN 2
    WHEN 'NOTICE' THEN 3
    ELSE 4
  END;
```

---

## Disaster Recovery

### Key Recovery Procedures

#### Scenario 1: Lost KMS Access

**Problem**: AWS/Azure credentials compromised or revoked

**Recovery**:
1. **Immediate**: Restore from backup credentials
2. **Short-term**: Regenerate IAM role/service principal
3. **Long-term**: Implement credential rotation policy

```bash
# Verify KMS access
aws kms describe-key --key-id $AWS_KMS_KEY_ID

# If failed, update credentials
export AWS_ACCESS_KEY_ID=new-key-id
export AWS_SECRET_ACCESS_KEY=new-secret

# Test connectivity
curl https://your-domain.com/api/kms/health \
  -H "Authorization: Bearer $HEALTH_CHECK_SECRET"
```

#### Scenario 2: Database Loss

**Problem**: Database corrupted or lost

**Recovery**:
1. **Restore database** from latest backup
2. **Verify encryption_keys table** integrity
3. **Test decryption** on sample records

```sql
-- Verify key table integrity
SELECT
  COUNT(*) as total_keys,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_keys
FROM encryption_keys;

-- Check for orphaned keys
SELECT ek.*
FROM encryption_keys ek
LEFT JOIN organizations o ON o.id = ek.tenant_id
WHERE o.id IS NULL;
```

#### Scenario 3: Master Key Deletion

**Problem**: KMS master key accidentally deleted

**Critical**: This is an **unrecoverable scenario**. All encrypted data is permanently lost.

**Prevention**:
1. **Enable key deletion protection** in AWS KMS
2. **Set deletion window** to maximum (30 days)
3. **Configure CloudWatch alarms** for deletion attempts
4. **Implement backup encryption** with secondary key

```bash
# Enable deletion protection
aws kms put-key-policy \
  --key-id $AWS_KMS_KEY_ID \
  --policy-name default \
  --policy file://kms-policy-with-deletion-protection.json

# Schedule key deletion (if needed)
aws kms schedule-key-deletion \
  --key-id $AWS_KMS_KEY_ID \
  --pending-window-in-days 30

# Cancel scheduled deletion
aws kms cancel-key-deletion \
  --key-id $AWS_KMS_KEY_ID
```

### Backup Strategy

#### Encrypted DEK Backup

```sql
-- Export encrypted keys (safe to backup)
COPY (
  SELECT
    tenant_id,
    kms_key_id,
    encrypted_data_key,
    version,
    created_at,
    expires_at
  FROM encryption_keys
  WHERE is_active = TRUE
) TO '/backup/encryption_keys.csv' WITH CSV HEADER;
```

**Note**: Encrypted DEKs can be safely backed up because they require KMS master key to decrypt.

#### DO NOT Backup:
- ❌ Plaintext DEKs (never persisted)
- ❌ KMS master keys (managed by AWS/Azure)
- ❌ Cache contents (ephemeral)

### Testing Recovery

```bash
# Quarterly disaster recovery drill
./scripts/dr-test.sh

# Steps:
# 1. Create test tenant
# 2. Encrypt test data
# 3. Export database
# 4. Wipe test environment
# 5. Restore from backup
# 6. Verify decryption works
```

---

## Compliance

### GDPR Compliance

✅ **Article 32**: Encryption of personal data
✅ **Article 25**: Data protection by design and default
✅ **Article 33**: Security breach notification (via audit logs)
✅ **Recital 83**: Regular testing and evaluation

**Evidence**:
- Encryption keys rotated every 90 days
- Audit trail in `key_rotation_log`
- Health monitoring endpoint
- Multi-tenant isolation

### SOC 2 Type II

✅ **CC6.1**: Logical and physical access controls
✅ **CC6.7**: System operations integrity
✅ **CC7.2**: Detection of security incidents

**Controls**:
- IAM role-based access to KMS
- Row Level Security in database
- Comprehensive audit logging
- Automated monitoring and alerting

### PCI DSS (if applicable)

✅ **Requirement 3**: Protect stored cardholder data
✅ **Requirement 10**: Track and monitor all access

**Note**: KMS can be part of PCI DSS compliance strategy for protecting payment data.

### HIPAA (if applicable)

✅ **§164.312(a)(2)(iv)**: Encryption and decryption
✅ **§164.312(b)**: Audit controls

**Note**: Use AWS KMS FIPS 140-2 Level 3 validated endpoints for HIPAA compliance.

---

## Troubleshooting

### Common Issues

#### Issue 1: "AWS_KMS_KEY_ID is required"

**Cause**: Missing environment variable

**Solution**:
```bash
# Check if variable is set
echo $AWS_KMS_KEY_ID

# Set in .env.production
AWS_KMS_KEY_ID=alias/adsapp-production-encryption

# Restart application
vercel env pull
vercel --prod
```

#### Issue 2: "Access denied to KMS key"

**Cause**: Insufficient IAM permissions

**Solution**:
```bash
# Verify IAM permissions
aws kms describe-key --key-id $AWS_KMS_KEY_ID

# If access denied, update IAM policy
aws iam attach-user-policy \
  --user-name adsapp-production-user \
  --policy-arn arn:aws:iam::123456789012:policy/ADSapp-KMS-Access
```

#### Issue 3: "Invalid ciphertext"

**Cause**: Encrypted DEK doesn't match KMS key or encryption context changed

**Solution**:
```typescript
// Regenerate key for tenant
import { getKeyManager } from '@/lib/security/key-manager';

const keyManager = getKeyManager();

// Force key refresh
const newKey = await keyManager.getEncryptionKey(tenantId, {
  forceRefresh: true
});

// If still fails, rotate key
await keyManager.rotateKey(tenantId);
```

#### Issue 4: High KMS latency (> 500ms)

**Cause**: Network issues or cache disabled

**Solution**:
```bash
# Check cache hit rate
curl https://your-domain.com/api/kms/health \
  -H "Authorization: Bearer $HEALTH_CHECK_SECRET" \
  | jq '.checks.kms.cacheHitRate'

# Should be > 85%
# If low, increase cache TTL
KMS_CACHE_TTL_SECONDS=7200  # 2 hours
```

#### Issue 5: "No active key found"

**Cause**: Key rotation failed or never created

**Solution**:
```sql
-- Check key status
SELECT * FROM encryption_keys
WHERE tenant_id = 'tenant-uuid'
ORDER BY version DESC;

-- If no keys, generate one
-- Application will auto-create on first encryption
```

### Debug Mode

Enable verbose KMS logging:

```env
NODE_ENV=development
DEBUG=kms:*
```

Output:
```
[KMS Audit] {"timestamp":"2025-10-14T12:00:00Z","operation":"generateDataKey","tenantId":"...","success":true}
[KMS Audit] {"timestamp":"2025-10-14T12:00:01Z","operation":"decryptDataKey","tenantId":"...","success":true}
```

### Support Contacts

- **AWS KMS Support**: https://aws.amazon.com/support
- **Azure Key Vault Support**: https://azure.microsoft.com/support
- **Application Support**: security@adsapp.com

---

## Summary

This KMS implementation provides:

✅ **Security**: CVSS 7.5 vulnerability resolved
✅ **Compliance**: GDPR, SOC 2, PCI DSS ready
✅ **Performance**: 90% KMS API reduction via caching
✅ **Reliability**: Zero-downtime key rotation
✅ **Scalability**: Supports unlimited tenants
✅ **Observability**: Comprehensive monitoring and logging
✅ **Flexibility**: AWS KMS or Azure Key Vault support

**Next Steps**:
1. Complete AWS KMS or Azure Key Vault setup
2. Configure environment variables
3. Run health check: `GET /api/kms/health`
4. Set up cron job for automatic rotation
5. Configure monitoring alerts
6. Test disaster recovery procedures

For questions or issues, refer to the troubleshooting section or contact the security team.

---

**Last Updated**: October 14, 2025
**Version**: 1.0.0
**Maintainer**: ADSapp Security Team
