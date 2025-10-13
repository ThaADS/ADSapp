# Field-Level Encryption Deployment Checklist

**Project**: ADSapp - Field-Level Encryption (C-005)
**Date**: October 13, 2025
**Status**: Ready for Deployment

---

## Pre-Deployment Verification

### ✅ Code Implementation

- [x] Core encryption library created (`src/lib/crypto/`)
  - [x] `types.ts` - Type definitions and constants
  - [x] `encryption.ts` - AES-256-GCM core functions
  - [x] `field-encryptor.ts` - High-level API
  - [x] `db-helpers.ts` - Database integration

- [x] Migration scripts created (`scripts/`)
  - [x] `generate-encryption-key.ts` - Key generation utility
  - [x] `migrate-encryption.ts` - Data migration script

- [x] Test suites created (`tests/`)
  - [x] `tests/unit/encryption.test.ts` - 32 unit tests
  - [x] `tests/integration/encryption-flow.test.ts` - 33 integration tests

- [x] Configuration updated
  - [x] `.env.example` - Encryption key configuration
  - [x] `package.json` - Migration scripts added

- [x] Documentation created
  - [x] `ENCRYPTION_GUIDE.md` - Complete implementation guide
  - [x] `C005_IMPLEMENTATION_SUMMARY.md` - Implementation summary

### ✅ Testing Verification

Run these commands to verify everything works:

```bash
# 1. Type checking (encryption files only)
npx tsc --noEmit src/lib/crypto/*.ts

# 2. Generate test encryption key
npm run generate-encryption-key

# 3. Add key to .env.local
# ENCRYPTION_KEY=<generated-key>

# 4. Run unit tests
npm test tests/unit/encryption.test.ts

# 5. Run integration tests
npm test tests/integration/encryption-flow.test.ts

# 6. Run all encryption tests
npm run test:encryption
```

---

## Development Environment Setup

### Step 1: Generate Development Key

```bash
npm run generate-encryption-key
```

**Output:**
```
ENCRYPTION_KEY=base64EncodedKeyHere...
```

### Step 2: Add to .env.local

Create or update `.env.local`:

```env
# Field-Level Encryption
ENCRYPTION_KEY=your_development_key_here
```

### Step 3: Test Encryption System

```bash
# Verify encryption works
npm run generate-encryption-key -- --verify

# Run test suite
npm run test:encryption
```

**Expected Results:**
- ✅ All tests pass (65 tests)
- ✅ No TypeScript errors
- ✅ Encryption verification passes

---

## Staging Environment Deployment

### Step 1: Generate Staging Key

```bash
npm run generate-encryption-key
```

⚠️ **IMPORTANT**: Use a different key than development!

### Step 2: Add to Vercel Staging

```bash
# Add to Vercel staging environment
vercel env add ENCRYPTION_KEY preview

# Paste your staging encryption key when prompted
```

### Step 3: Deploy to Staging

```bash
vercel --env=preview
```

### Step 4: Verify Staging Deployment

```bash
# Check encryption status
curl https://your-staging-app.vercel.app/api/health

# Test API with encrypted data
curl -X POST https://your-staging-app.vercel.app/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "name": "Test"}'
```

### Step 5: Migrate Staging Data

```bash
# Dry-run first
npm run migrate-encryption -- --table=all --dry-run --verbose

# If successful, run actual migration
npm run migrate-encryption -- --table=all --verbose
```

### Step 6: Verify Migration

- [ ] Check database records are encrypted
- [ ] Test API endpoints return decrypted data
- [ ] Verify no errors in logs
- [ ] Test contact creation/update/read
- [ ] Test profile creation/update/read

---

## Production Environment Deployment

⚠️ **CRITICAL**: Follow these steps carefully. Production data will be modified!

### Pre-Production Checklist

- [ ] **Backup database**: Create full database backup
- [ ] **Test on staging**: All tests pass on staging
- [ ] **Migration tested**: Dry-run successful on staging
- [ ] **Rollback plan**: Document rollback procedure
- [ ] **Team notified**: Inform team about deployment
- [ ] **Monitoring ready**: Set up alerts for errors
- [ ] **Off-hours deployment**: Schedule during low traffic

### Step 1: Generate Production Key

```bash
npm run generate-encryption-key

# Store this key SECURELY
# - Password manager
- Encrypted backup
# - Key management service (AWS KMS, HashiCorp Vault, etc.)
```

⚠️ **CRITICAL**:
- Use a completely different key than dev/staging
- Back up this key in multiple secure locations
- Never commit this key to version control
- Document where the key backup is stored

### Step 2: Add to Production Environment

**Vercel:**
```bash
vercel env add ENCRYPTION_KEY production

# Paste your production encryption key when prompted
```

**Alternative (Environment Variable Management):**
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Vercel dashboard manual entry

### Step 3: Deploy Code to Production

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration
git push origin main
```

### Step 4: Verify Deployment

```bash
# Check application is running
curl https://your-production-app.com/api/health

# Verify encryption key is loaded (without exposing key)
# Should return: { "encryption": "active" }
```

### Step 5: Create Database Backup

⚠️ **MANDATORY**: Create backup before migration!

**Supabase:**
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Click "Create Backup"
4. Wait for backup to complete
5. Verify backup exists

**Alternative:**
```bash
# PostgreSQL dump
pg_dump -h your-supabase-host \
  -U your-user \
  -d your-database \
  > backup_before_encryption_$(date +%Y%m%d_%H%M%S).sql
```

### Step 6: Test Migration (Dry-Run)

```bash
# IMPORTANT: Run dry-run first!
npm run migrate-encryption -- \
  --table=all \
  --dry-run \
  --verbose

# Review output carefully
# - Check for any errors
# - Verify record counts
# - Ensure no warnings
```

**Expected Output:**
```
========== Migration Summary ==========

contacts:
  Status: completed
  Total: 1234
  Processed: 1234
  Successful: 1234
  Failed: 0
  Duration: 12.34s

profiles:
  Status: completed
  Total: 567
  Processed: 567
  Successful: 567
  Failed: 0
  Duration: 5.67s

======================================
```

### Step 7: Run Production Migration

⚠️ **WARNING**: This will modify production data!

```bash
# Option 1: Migrate all tables
npm run migrate-encryption -- \
  --table=all \
  --verbose

# Option 2: Migrate one table at a time (recommended)
npm run migrate-encryption -- \
  --table=contacts \
  --verbose

npm run migrate-encryption -- \
  --table=profiles \
  --verbose

# Option 3: Migrate by organization (for large databases)
npm run migrate-encryption -- \
  --table=contacts \
  --organization=org-id-1 \
  --verbose
```

### Step 8: Verify Migration Success

#### Database Verification

1. **Check Encrypted Data:**
   ```sql
   -- In Supabase SQL Editor
   SELECT phone_number, whatsapp_id
   FROM contacts
   LIMIT 5;

   -- Should show encrypted base64 strings, not plaintext
   ```

2. **Count Records:**
   ```sql
   SELECT COUNT(*) FROM contacts;
   SELECT COUNT(*) FROM profiles;

   -- Verify counts match pre-migration
   ```

#### API Verification

```bash
# Test contact API
curl https://your-production-app.com/api/contacts?organization_id=org-123

# Should return decrypted data in response
```

#### Application Testing

- [ ] Log in to application
- [ ] View contacts list
- [ ] Create new contact
- [ ] Update existing contact
- [ ] View contact details
- [ ] Verify phone numbers display correctly
- [ ] Test WhatsApp integration
- [ ] Check profile email display

### Step 9: Monitor for Issues

**Monitor for 24-48 hours:**

- [ ] Check error logs (Sentry/Vercel)
- [ ] Monitor API response times
- [ ] Watch for encryption errors
- [ ] Check user reports/support tickets
- [ ] Verify database query performance

**Metrics to Monitor:**
- API response time (should be < 200ms increase)
- Error rate (should be < 0.1%)
- Database CPU usage
- Memory usage

### Step 10: Post-Migration Cleanup

After 7 days of successful operation:

- [ ] Confirm all encryption working correctly
- [ ] Verify no issues reported
- [ ] Delete dry-run test data (if any)
- [ ] Update documentation
- [ ] Mark C-005 as complete
- [ ] Schedule key rotation (90 days)

---

## Rollback Procedure

If issues occur, follow these steps:

### Step 1: Stop Incoming Traffic (if critical)

```bash
# Vercel: Set maintenance mode
vercel env add MAINTENANCE_MODE production
# Value: "true"

# Redeploy
vercel --prod
```

### Step 2: Rollback Encryption

```bash
# Decrypt all data
npm run migrate-encryption -- \
  --table=all \
  --rollback \
  --verbose
```

### Step 3: Restore from Backup (if needed)

```sql
-- Restore from backup
psql -h your-supabase-host \
  -U your-user \
  -d your-database \
  < backup_before_encryption_YYYYMMDD_HHMMSS.sql
```

### Step 4: Remove Encryption Key

```bash
# Remove from production environment
vercel env rm ENCRYPTION_KEY production
```

### Step 5: Deploy Previous Version

```bash
# Revert to previous deployment
vercel rollback
```

### Step 6: Verify Rollback

- [ ] Check application is working
- [ ] Verify data is accessible
- [ ] Test API endpoints
- [ ] Confirm user access restored

---

## Security Checklist

### Key Management

- [ ] Different keys for dev/staging/production
- [ ] Production key backed up securely (minimum 2 locations)
- [ ] Key backup locations documented
- [ ] Key rotation schedule created (90-180 days)
- [ ] Key access audit log enabled
- [ ] Team trained on key handling procedures

### Access Control

- [ ] Only authorized personnel have access to production key
- [ ] Key stored in secure secret management system
- [ ] No keys in version control
- [ ] No keys in logs or error messages
- [ ] No keys exposed in client-side code

### Monitoring

- [ ] Encryption error alerts configured
- [ ] Performance monitoring enabled
- [ ] Security audit logging enabled
- [ ] Unauthorized access alerts set up

---

## Compliance Verification

### GDPR Compliance

- [ ] Encryption satisfies Article 32 requirements
- [ ] Data protection impact assessment updated
- [ ] Privacy policy updated (if needed)
- [ ] Data processing documentation updated

### CCPA Compliance

- [ ] Reasonable security measures implemented
- [ ] Security practices documented
- [ ] Consumer rights procedures updated

### SOC 2 Compliance

- [ ] CC6.1 encryption control implemented
- [ ] CC6.6 logical access control maintained
- [ ] CC7.2 system monitoring configured
- [ ] Compliance documentation updated

---

## Team Communication

### Announcement Template

```
Subject: Production Deployment - Field-Level Encryption

Team,

We will be deploying field-level encryption for PII data on [DATE] at [TIME].

What's changing:
- Phone numbers, WhatsApp IDs, and email addresses will be encrypted
- No visible changes to the application UI
- API contracts remain the same
- Expected downtime: None (zero-downtime migration)

Timeline:
- [TIME]: Deployment begins
- [TIME]: Migration starts
- [TIME]: Migration completes (estimated)
- [TIME]: Monitoring period begins

What to watch for:
- Slower API responses (temporary during migration)
- Encryption errors in logs
- User reports of data display issues

Rollback plan:
- Documented in ENCRYPTION_DEPLOYMENT_CHECKLIST.md
- Can be executed if critical issues occur

Contact: [YOUR NAME] for questions or issues

Thanks,
[YOUR NAME]
```

---

## Success Criteria

### Technical Success

- [ ] All tests pass (65/65 tests)
- [ ] Zero TypeScript errors in encryption code
- [ ] Migration completes with 0% failure rate
- [ ] API response time increase < 10%
- [ ] Zero encryption-related errors in 24 hours

### Security Success

- [ ] All PII data encrypted in database
- [ ] Encryption key secured properly
- [ ] Compliance requirements met
- [ ] Security audit passed
- [ ] No data breaches or exposure

### Business Success

- [ ] Zero user-facing issues
- [ ] No support tickets related to encryption
- [ ] Application performance maintained
- [ ] Team confidence in security measures
- [ ] Compliance requirements satisfied

---

## Post-Deployment Tasks

### Week 1

- [ ] Daily monitoring of error logs
- [ ] Daily check of API performance
- [ ] Review user feedback
- [ ] Address any issues immediately

### Week 2-4

- [ ] Weekly monitoring review
- [ ] Performance analysis
- [ ] User satisfaction check
- [ ] Document lessons learned

### Month 3

- [ ] Schedule first key rotation
- [ ] Review encryption performance
- [ ] Security audit
- [ ] Compliance review

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Lead Developer | [NAME] | [EMAIL] |
| DevOps Engineer | [NAME] | [EMAIL] |
| Security Officer | [NAME] | [EMAIL] |
| Database Admin | [NAME] | [EMAIL] |

---

## Additional Resources

- **Implementation Guide**: `ENCRYPTION_GUIDE.md`
- **Summary**: `C005_IMPLEMENTATION_SUMMARY.md`
- **Code**: `src/lib/crypto/`
- **Tests**: `tests/unit/encryption.test.ts`, `tests/integration/encryption-flow.test.ts`
- **Migration Scripts**: `scripts/migrate-encryption.ts`, `scripts/generate-encryption-key.ts`

---

**Checklist Version**: 1.0.0
**Last Updated**: October 13, 2025
**Status**: Ready for Production Deployment
