# ADSapp Production Deployment Guide

**Version**: 1.0.0
**Last Updated**: October 2025
**Status**: Production Ready
**Target Audience**: DevOps Engineers, Platform Engineers, System Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Pre-Deployment Preparation](#pre-deployment-preparation)
5. [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
6. [Environment Configuration](#environment-configuration)
7. [Database Deployment](#database-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Alternative Deployment: Docker](#alternative-deployment-docker)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)
12. [Appendix](#appendix)

---

## Overview

ADSapp is an enterprise-grade Multi-Tenant WhatsApp Business Inbox SaaS platform built with Next.js 15, TypeScript, Supabase, and Stripe. This guide provides comprehensive instructions for deploying ADSapp to production environments.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Vercel     │────────▶│  Supabase    │                  │
│  │  (Frontend)  │         │ (PostgreSQL) │                  │
│  │  Next.js 15  │         │    + RLS     │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         │                        │                           │
│  ┌──────▼───────┐         ┌──────▼───────┐                  │
│  │   Stripe     │         │  WhatsApp    │                  │
│  │  (Billing)   │         │ Business API │                  │
│  └──────────────┘         └──────────────┘                  │
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Resend     │         │    Sentry    │                  │
│  │   (Email)    │         │ (Monitoring) │                  │
│  └──────────────┘         └──────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Timeline

**Total Time**: 2-4 hours (initial deployment)

- **Pre-Deployment**: 30-60 minutes
- **Database Setup**: 30-45 minutes
- **Vercel Deployment**: 15-30 minutes
- **Environment Configuration**: 30-45 minutes
- **Post-Deployment Verification**: 30-60 minutes

---

## Prerequisites

### Required Accounts and Services

#### 1. Vercel Account

- **Sign up**: https://vercel.com
- **Plan**: Pro or Team (for production features)
- **Features needed**: Environment variables, preview deployments, analytics
- **Cost**: $20/month per user (Pro plan)

#### 2. Supabase Project

- **Sign up**: https://supabase.com
- **Plan**: Pro or higher (for production databases)
- **Features needed**: PostgreSQL, Row Level Security, Real-time, Storage
- **Cost**: $25/month (Pro plan)
- **Setup Time**: 10 minutes

#### 3. Stripe Account

- **Sign up**: https://stripe.com
- **Account type**: Live mode enabled
- **Features needed**: Subscriptions, webhooks, payment intents
- **Cost**: 2.9% + $0.30 per transaction
- **Setup Time**: 30-60 minutes (account verification)

#### 4. WhatsApp Business API

- **Provider**: Meta Business (https://business.facebook.com)
- **Requirements**: Business verification, phone number
- **Features needed**: WhatsApp Business Cloud API
- **Cost**: Conversation-based pricing (free tier available)
- **Setup Time**: 24-48 hours (verification)

#### 5. Resend Account

- **Sign up**: https://resend.com
- **Plan**: Free or Pro
- **Features needed**: Email sending, domain verification
- **Cost**: Free (100 emails/day) or $20/month
- **Setup Time**: 15 minutes

#### 6. Optional: Sentry Account

- **Sign up**: https://sentry.io
- **Plan**: Free or Team
- **Features needed**: Error tracking, performance monitoring
- **Cost**: Free (5K errors/month) or $26/month
- **Setup Time**: 10 minutes

### Development Environment

#### Required Software

```bash
# Node.js 20 or higher
node --version  # Should output v20.x.x or higher

# npm 10 or higher
npm --version   # Should output 10.x.x or higher

# Git
git --version   # Any modern version

# Optional: Vercel CLI
npm install -g vercel
```

#### Local Testing Requirements

```bash
# Clone the repository
git clone https://github.com/your-org/adsapp.git
cd adsapp

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env.local

# Run local development server
npm run dev
```

### Access Requirements

#### Domain Name

- **Requirement**: Custom domain for production
- **Recommended**: `app.yourdomain.com` or `yourdomain.com`
- **DNS Access**: Ability to add DNS records (CNAME, A, TXT)
- **SSL**: Automatic via Vercel (Let's Encrypt)

#### Database Access

- **Supabase Dashboard**: Full admin access
- **PostgreSQL**: Direct database access (psql or GUI client)
- **Connection String**: Service role key for migrations

#### API Credentials

- **Stripe**: Secret key, publishable key, webhook secret
- **WhatsApp**: Access token, phone number ID, webhook verify token
- **Resend**: API key, verified domain

---

## Architecture Overview

### Technology Stack

```yaml
Frontend:
  Framework: Next.js 15.5.4
  UI: React 19.1.0
  Styling: Tailwind CSS 4
  Language: TypeScript 5
  Build: Turbopack

Backend:
  Runtime: Next.js API Routes (Serverless)
  Database: Supabase PostgreSQL
  Authentication: Supabase Auth + JWT
  File Storage: Supabase Storage
  Real-time: Supabase Realtime

External Services:
  Payments: Stripe
  Messaging: WhatsApp Business Cloud API
  Email: Resend
  Monitoring: Sentry (optional)

Infrastructure:
  Hosting: Vercel Edge Network
  CDN: Vercel CDN (Global)
  Region: Auto (Edge Functions)
  Compute: Serverless Functions
```

### Security Architecture

```yaml
Authentication:
  - Supabase Auth (JWT-based)
  - Row Level Security (RLS)
  - Multi-tenant isolation
  - Session management

Data Protection:
  - HTTPS everywhere (enforced)
  - Database encryption at rest
  - Encrypted connections (TLS 1.3)
  - Environment variable encryption

Compliance:
  - OWASP Top 10 compliance: 100%
  - SOC 2 Type II controls
  - GDPR compliance
  - Security score: 99/100
```

### Scalability Considerations

```yaml
Performance:
  - Edge CDN distribution
  - Automatic image optimization
  - Code splitting and lazy loading
  - Static page generation
  - Incremental Static Regeneration

Database:
  - Connection pooling (Supabase)
  - Read replicas (Supabase Pro)
  - Automatic backups
  - Point-in-time recovery

Serverless:
  - Auto-scaling (Vercel)
  - No cold starts (Edge Functions)
  - Global distribution
  - 99.99% uptime SLA
```

---

## Pre-Deployment Preparation

### 1. Code Quality Verification

#### Run Complete Test Suite

```bash
# TypeScript type checking
npm run type-check

# Linting
npm run lint

# Unit tests
npm run test

# E2E tests (optional but recommended)
npm run test:e2e

# Security audit
npm run test:security

# Build verification
npm run build
```

**Expected Output**:

```
✓ Type checking: 0 errors
✓ Linting: 0 errors, 0 warnings
✓ Unit tests: All tests passing
✓ E2E tests: All tests passing
✓ Security audit: 0 vulnerabilities
✓ Build: Successful
```

### 2. Environment Variables Preparation

Create a comprehensive environment variable checklist:

#### Critical Variables (Required)

```bash
# Application
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_NAME=ADSapp
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-secure-token

# Email Service
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### Optional Variables (Recommended)

```bash
# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
FEATURE_ANALYTICS_ENABLED=true
FEATURE_ADVANCED_AUTOMATION=true
```

### 3. Database Backup

**CRITICAL**: Always backup your database before deployment.

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup Supabase database
# Option 1: Via Supabase Dashboard
# Dashboard → Database → Backups → Create backup

# Option 2: Via pg_dump (if you have direct access)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h db.xxxxx.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-privileges \
  > backups/$(date +%Y%m%d)/backup_${TIMESTAMP}.sql

# Verify backup
ls -lh backups/$(date +%Y%m%d)/

# Test restore (optional, on test database)
# psql -h test-db.supabase.co -U postgres -d postgres < backup.sql
```

### 4. Migration Files Verification

Verify all migration files are present and in order:

```bash
# List all migration files
ls -lh supabase/migrations/

# Expected migrations (39 files):
# 001_initial_schema.sql
# 002_super_admin_system.sql
# 003_demo_system.sql
# 004_complete_database_schema.sql
# ... (see full list in appendix)

# Count migrations
ls supabase/migrations/*.sql | wc -l
# Should output: 39
```

### 5. Security Checklist

Before deployment, verify security measures:

```bash
# Check for exposed secrets
grep -r "sk_live" .
grep -r "Bearer " .
grep -r "password" .

# Should return: No results (except in .env.example)

# Verify .gitignore includes
cat .gitignore | grep -E "\.env|node_modules|\.next"

# Check for console.log statements in production
grep -r "console\.log" src/ --exclude-dir=node_modules

# Security audit
npm audit --production
# Should return: 0 vulnerabilities
```

---

## Vercel Deployment (Recommended)

Vercel is the recommended deployment platform for ADSapp, providing optimal performance, automatic scaling, and seamless integration with Next.js.

### Step 1: Connect GitHub Repository

#### 1.1 Create Vercel Account

```bash
# Visit https://vercel.com
# Sign up with GitHub account
# Authorize Vercel to access your repositories
```

#### 1.2 Import Project

1. Navigate to Vercel Dashboard
2. Click "Add New Project"
3. Select your GitHub repository: `your-org/adsapp`
4. Click "Import"

#### 1.3 Configure Project Settings

```yaml
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm ci --legacy-peer-deps
Development Command: npm run dev
```

### Step 2: Configure Environment Variables

#### 2.1 Access Environment Variables

1. In Vercel project settings
2. Navigate to "Settings" → "Environment Variables"
3. Add all required variables

#### 2.2 Add Variables Systematically

**Application Configuration**:

```bash
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_NAME=ADSapp
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
```

**Supabase Configuration**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Stripe Configuration**:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx
```

**WhatsApp Configuration**:

```bash
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-secure-token
```

**Email Configuration**:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Optional Monitoring**:

```bash
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=adsapp
SENTRY_AUTH_TOKEN=your-auth-token
```

#### 2.3 Environment Scope

For each variable, select appropriate scope:

- **Production**: Live production environment
- **Preview**: Pull request preview deployments
- **Development**: Local development (not typically needed)

**Recommended Scope**:

- All `NEXT_PUBLIC_*` variables: Production + Preview
- Secrets (`STRIPE_SECRET_KEY`, etc.): Production only
- Test credentials: Preview + Development

### Step 3: Configure Vercel Project Settings

#### 3.1 Build & Development Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm ci --legacy-peer-deps",
  "devCommand": "npm run dev"
}
```

#### 3.2 Function Configuration

Create or verify `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm ci --legacy-peer-deps",
  "devCommand": "npm run dev",
  "functions": {
    "src/app/api/**": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

#### 3.3 Domain Configuration

1. **Add Custom Domain**:
   - Navigate to "Settings" → "Domains"
   - Add domain: `app.yourdomain.com`
   - Choose "Add" or "Buy domain"

2. **Configure DNS**:

   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Verify Domain**:
   - Wait for DNS propagation (5-60 minutes)
   - Vercel will automatically provision SSL certificate
   - Status should show: "Valid Configuration"

### Step 4: Deploy to Production

#### 4.1 Initial Deployment

**Option A: Automatic Deployment** (Recommended)

```bash
# Push to main branch
git checkout main
git add .
git commit -m "feat: Production deployment configuration"
git push origin main

# Vercel automatically deploys main branch to production
# Monitor deployment in Vercel Dashboard
```

**Option B: Manual Deployment via CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# Set up and deploy? Yes
# Which scope? Your team/account
# Link to existing project? Yes
# What's your project's name? adsapp
# In which directory is your code? ./
# Deploying to production? Yes
```

#### 4.2 Monitor Deployment

**Deployment Process**:

```
1. Building... (2-5 minutes)
   - Installing dependencies
   - Type checking
   - Building application
   - Optimizing assets

2. Deploying... (30-60 seconds)
   - Uploading build
   - Configuring edge network
   - Provisioning functions

3. Ready (< 10 seconds)
   - Assigning domain
   - Activating deployment
   - Invalidating CDN cache
```

**Check Deployment Status**:

```bash
# Via Vercel Dashboard
# https://vercel.com/your-team/adsapp/deployments

# Via CLI
vercel ls

# Expected output:
# ✓ Production: https://app.yourdomain.com (Ready)
```

### Step 5: Post-Deployment Vercel Configuration

#### 5.1 Enable Analytics

1. Navigate to project settings
2. Go to "Analytics"
3. Enable "Web Analytics"
4. Configure data retention: 90 days

#### 5.2 Configure Speed Insights

1. Go to "Speed Insights"
2. Enable performance monitoring
3. Set performance budgets:
   - First Contentful Paint (FCP): < 1.8s
   - Largest Contentful Paint (LCP): < 2.5s
   - Total Blocking Time (TBT): < 300ms
   - Cumulative Layout Shift (CLS): < 0.1

#### 5.3 Set Up Deployment Protection

1. Navigate to "Settings" → "Deployment Protection"
2. Enable "Vercel Authentication"
3. Configure allowed emails/domains
4. Add team members

#### 5.4 Configure Preview Deployments

1. Go to "Settings" → "Git"
2. Enable "Automatically create Preview Deployments"
3. Configure preview URL format: `pr-{number}.app.yourdomain.com`

---

## Environment Configuration

### Production Environment Variables Reference

#### Complete Environment Variable List

```bash
# ============================================
# Application Configuration
# ============================================
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_NAME=ADSapp
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NODE_ENV=production

# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-super-secret-jwt-secret

# ============================================
# Stripe Payment Configuration
# ============================================
# Get from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product Price IDs
# Create in: https://dashboard.stripe.com/products
STRIPE_STARTER_PRICE_ID=price_1234567890abcdef
STRIPE_PROFESSIONAL_PRICE_ID=price_abcdef1234567890
STRIPE_ENTERPRISE_PRICE_ID=price_7890abcdef123456

# ============================================
# WhatsApp Business API Configuration
# ============================================
# Get from: https://developers.facebook.com/apps
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-unique-verify-token

# ============================================
# Email Service Configuration (Resend)
# ============================================
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ============================================
# Security Configuration
# ============================================
JWT_SECRET=your-256-bit-random-secret-key

# ============================================
# Monitoring & Analytics (Optional)
# ============================================
# Sentry Error Tracking
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-organization
SENTRY_PROJECT=adsapp
SENTRY_AUTH_TOKEN=your-auth-token

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# ============================================
# Feature Flags
# ============================================
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AI_ASSISTANCE_ENABLED=false
FEATURE_ADVANCED_AUTOMATION=true

# ============================================
# Admin Configuration
# ============================================
SUPER_ADMIN_EMAIL=admin@yourdomain.com
ADMIN_SECRET_KEY=your-admin-secret-key

# ============================================
# Compliance Configuration
# ============================================
GDPR_ENABLED=true
CCPA_ENABLED=true
DATA_RETENTION_DAYS=365
```

### Environment Variable Security Best Practices

#### Secret Rotation Schedule

```yaml
Critical Secrets (Rotate Every 30 Days):
  - STRIPE_SECRET_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - JWT_SECRET
  - ADMIN_SECRET_KEY

Regular Secrets (Rotate Every 90 Days):
  - WHATSAPP_ACCESS_TOKEN
  - RESEND_API_KEY
  - SENTRY_AUTH_TOKEN

Low-Risk Secrets (Rotate Every 180 Days):
  - WHATSAPP_WEBHOOK_VERIFY_TOKEN
  - HEALTH_CHECK_SECRET
```

#### Secret Management

```bash
# Generate secure random secrets
openssl rand -base64 32

# Generate JWT secret (256-bit)
openssl rand -hex 32

# Generate webhook verify token
openssl rand -base64 48 | tr -d "=+/" | cut -c1-32
```

---

## Database Deployment

### Supabase Database Setup

#### Step 1: Create Supabase Project

1. **Navigate to Supabase Dashboard**:
   - Visit: https://app.supabase.com
   - Click "New Project"

2. **Configure Project**:

   ```yaml
   Project Name: adsapp-production
   Database Password: [Generate strong password]
   Region: [Choose closest to users]
   Pricing Plan: Pro ($25/month)
   ```

3. **Save Credentials**:
   ```bash
   # Save these immediately:
   - Database Password
   - Project URL
   - Anon Key
   - Service Role Key
   - JWT Secret
   ```

#### Step 2: Apply Database Migrations

**Method 1: Via Supabase Dashboard** (Recommended)

1. Navigate to "SQL Editor"
2. Create new query
3. Paste migration content from each file
4. Run in order (001 → 039)

**Method 2: Via Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push

# Verify migrations
supabase db remote ls
```

**Method 3: Via psql (Direct Connection)**

```bash
# Connect to Supabase database
export PGPASSWORD='your-database-password'
psql -h db.xxxxx.supabase.co -U postgres -d postgres

# Apply migrations in order
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_super_admin_system.sql
\i supabase/migrations/003_demo_system.sql
# ... continue for all 39 migrations

# Verify tables
\dt

# Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

# Exit
\q
```

#### Step 3: Verify Database Schema

After applying all migrations, verify the database structure:

```sql
-- Check all tables exist (expected: 50+ tables)
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- Critical tables verification
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'organizations',
    'contacts',
    'conversations',
    'messages',
    'message_templates',
    'automation_rules',
    'subscriptions',
    'team_members',
    'team_invitations'
  )
ORDER BY table_name;

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Should return 0 rows (all tables should have RLS enabled)

-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

#### Step 4: Configure Database Settings

**Connection Pooling**:

```sql
-- Supabase automatically configures connection pooling
-- Verify in Supabase Dashboard:
-- Settings → Database → Connection pooling

-- Default settings:
-- Pool Mode: Transaction
-- Default Pool Size: 15
-- Max Client Connections: 200
```

**Performance Optimization**:

```sql
-- Enable query logging (for monitoring)
ALTER DATABASE postgres SET log_statement = 'mod';

-- Set appropriate work_mem
ALTER DATABASE postgres SET work_mem = '16MB';

-- Configure autovacuum
ALTER DATABASE postgres SET autovacuum = on;
```

#### Step 5: Set Up Database Backups

**Automated Backups** (Supabase Pro):

```yaml
Configuration:
  - Daily backups: Enabled
  - Retention: 7 days
  - Point-in-time recovery: Enabled
  - Backup window: 2:00 AM UTC
```

**Manual Backup Script**:

```bash
#!/bin/bash
# save as: scripts/backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d)"
BACKUP_FILE="adsapp_production_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h db.xxxxx.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Verify backup
if [ -f "$BACKUP_DIR/$BACKUP_FILE.gz" ]; then
  SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)
  echo "✓ Backup created successfully: $BACKUP_FILE.gz ($SIZE)"
else
  echo "✗ Backup failed!"
  exit 1
fi

# Optional: Upload to S3 or cloud storage
# aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://your-backup-bucket/
```

#### Step 6: Database Monitoring Setup

**Enable Query Performance Insights**:

1. Supabase Dashboard → Database → Query Performance
2. Enable "pg_stat_statements"
3. Configure slow query threshold: 100ms

**Create Monitoring Queries**:

```sql
-- Save as: sql/monitoring/database-health.sql

-- Check database size
SELECT
  pg_size_pretty(pg_database_size('postgres')) as database_size;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Check connection counts
SELECT
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Check slow queries
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check replication lag (if using read replicas)
SELECT
  client_addr,
  state,
  sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;
```

---

## Post-Deployment Verification

### Comprehensive Verification Checklist

#### 1. Health Check Endpoints

**Overall Health**:

```bash
# Check overall application health
curl https://app.yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-20T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "supabase": {
      "status": "up",
      "responseTime": 45,
      "lastCheck": "2025-10-20T12:00:00.000Z"
    },
    "stripe": {
      "status": "up",
      "responseTime": 120,
      "lastCheck": "2025-10-20T12:00:00.000Z"
    },
    "whatsapp": {
      "status": "up",
      "responseTime": 200,
      "lastCheck": "2025-10-20T12:00:00.000Z"
    }
  },
  "system": {
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    },
    "nodeVersion": "v20.9.0"
  },
  "responseTime": "250ms"
}
```

**Component Health Checks**:

```bash
# Database connectivity
curl https://app.yourdomain.com/api/health
# Should show: "supabase": { "status": "up" }

# Stripe connectivity
# Verify in health response

# WhatsApp API connectivity
# Verify in health response
```

#### 2. Authentication Flow Verification

**Test Sign Up**:

```bash
# Via browser:
https://app.yourdomain.com/auth/signup

# Test flow:
1. Fill in email: test@yourdomain.com
2. Fill in password: SecurePassword123!
3. Submit form
4. Check email for verification link
5. Click verification link
6. Should redirect to dashboard
```

**Test Sign In**:

```bash
# Via browser:
https://app.yourdomain.com/auth/signin

# Test flow:
1. Enter email and password
2. Submit form
3. Should redirect to dashboard
4. Verify session cookie is set
```

#### 3. Database Connectivity

**Test RLS Policies**:

```sql
-- Connect as authenticated user
SET LOCAL jwt.claims.sub = 'user-uuid-here';

-- Try to access organization data
SELECT * FROM organizations LIMIT 1;
-- Should only return data for user's organization

-- Try to access other organization's data
SELECT * FROM organizations WHERE id = 'other-org-id';
-- Should return 0 rows (RLS blocking access)
```

**Test Multi-Tenant Isolation**:

```sql
-- Create test organizations
INSERT INTO organizations (name, subdomain)
VALUES
  ('Test Org 1', 'testorg1'),
  ('Test Org 2', 'testorg2');

-- Create test users in each organization
INSERT INTO profiles (organization_id, email, role)
VALUES
  ((SELECT id FROM organizations WHERE subdomain = 'testorg1'), 'user1@test.com', 'owner'),
  ((SELECT id FROM organizations WHERE subdomain = 'testorg2'), 'user2@test.com', 'owner');

-- Verify isolation
-- User 1 should only see Org 1 data
-- User 2 should only see Org 2 data
```

#### 4. Payment Integration Verification

**Stripe Webhook Test**:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local environment (for testing)
stripe listen --forward-to https://app.yourdomain.com/api/webhooks/stripe

# Trigger test payment
stripe trigger payment_intent.succeeded
```

**Test Subscription Flow**:

```bash
# Via browser:
https://app.yourdomain.com/dashboard/billing

# Test flow:
1. Click "Upgrade to Pro"
2. Fill in test card: 4242 4242 4242 4242
3. Expiry: 12/34, CVC: 123
4. Submit payment
5. Verify subscription created in Stripe Dashboard
6. Verify subscription saved in database
```

#### 5. WhatsApp Integration Verification

**Webhook Verification**:

```bash
# WhatsApp will verify webhook during setup
# Endpoint: https://app.yourdomain.com/api/webhooks/whatsapp

# Test webhook manually
curl -X GET "https://app.yourdomain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=your-verify-token"

# Should return: test123
```

**Test Message Sending**:

```bash
# Via browser:
https://app.yourdomain.com/dashboard/inbox

# Test flow:
1. Select a contact
2. Type a message
3. Send message
4. Verify message appears in WhatsApp
5. Verify message saved in database
```

#### 6. Email Delivery Verification

**Test Welcome Email**:

```bash
# Trigger by creating new account
# Email should be sent via Resend

# Verify in Resend Dashboard:
https://resend.com/emails

# Check:
- Email delivered successfully
- No bounce/complaint
- Delivery time < 5 seconds
```

#### 7. Performance Verification

**Core Web Vitals**:

```bash
# Use Google PageSpeed Insights
https://pagespeed.web.dev/

# Enter: https://app.yourdomain.com

# Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

# Core Web Vitals:
- FCP: < 1.8s
- LCP: < 2.5s
- TBT: < 300ms
- CLS: < 0.1
```

**API Response Times**:

```bash
# Test critical API endpoints
time curl https://app.yourdomain.com/api/health
# Should complete in < 500ms

time curl -H "Authorization: Bearer token" https://app.yourdomain.com/api/conversations
# Should complete in < 1000ms
```

#### 8. Security Verification

**SSL Certificate**:

```bash
# Check SSL certificate
curl -vI https://app.yourdomain.com 2>&1 | grep -A 5 "SSL"

# Verify:
- Certificate is valid
- Issuer: Let's Encrypt
- Expiry: > 60 days
- Protocol: TLSv1.3
```

**Security Headers**:

```bash
# Check security headers
curl -I https://app.yourdomain.com

# Should include:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

**OWASP Compliance**:

```bash
# Run security audit
npm run test:security

# Expected: 0 vulnerabilities
# Security score: 99/100
```

### Automated Verification Script

Create a post-deployment verification script:

```bash
#!/bin/bash
# save as: scripts/verify-deployment.sh

APP_URL="https://app.yourdomain.com"
FAILURES=0

echo "🔍 ADSapp Production Deployment Verification"
echo "=============================================="
echo ""

# 1. Health Check
echo "1. Health Check..."
HEALTH_STATUS=$(curl -s ${APP_URL}/api/health | jq -r '.status')
if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo "   ✓ Application is healthy"
else
  echo "   ✗ Application health check failed: $HEALTH_STATUS"
  FAILURES=$((FAILURES+1))
fi

# 2. SSL Certificate
echo "2. SSL Certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername app.yourdomain.com -connect app.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
echo "   ✓ SSL Certificate valid until: $SSL_EXPIRY"

# 3. Database Connection
echo "3. Database Connection..."
DB_STATUS=$(curl -s ${APP_URL}/api/health | jq -r '.services.supabase.status')
if [ "$DB_STATUS" = "up" ]; then
  echo "   ✓ Database connection successful"
else
  echo "   ✗ Database connection failed"
  FAILURES=$((FAILURES+1))
fi

# 4. Stripe Connection
echo "4. Stripe Connection..."
STRIPE_STATUS=$(curl -s ${APP_URL}/api/health | jq -r '.services.stripe.status')
if [ "$STRIPE_STATUS" = "up" ]; then
  echo "   ✓ Stripe connection successful"
else
  echo "   ✗ Stripe connection failed"
  FAILURES=$((FAILURES+1))
fi

# 5. WhatsApp Connection
echo "5. WhatsApp Connection..."
WA_STATUS=$(curl -s ${APP_URL}/api/health | jq -r '.services.whatsapp.status')
if [ "$WA_STATUS" = "up" ]; then
  echo "   ✓ WhatsApp connection successful"
else
  echo "   ✗ WhatsApp connection failed"
  FAILURES=$((FAILURES+1))
fi

# 6. Response Time
echo "6. Response Time..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' ${APP_URL}/api/health)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
if (( $(echo "$RESPONSE_MS < 1000" | bc -l) )); then
  echo "   ✓ Response time: ${RESPONSE_MS}ms"
else
  echo "   ⚠ Response time slow: ${RESPONSE_MS}ms"
fi

# Summary
echo ""
echo "=============================================="
if [ $FAILURES -eq 0 ]; then
  echo "✅ All verification checks passed!"
  exit 0
else
  echo "❌ $FAILURES verification check(s) failed"
  exit 1
fi
```

Run verification:

```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

---

## Alternative Deployment: Docker

For self-hosted deployments or alternative platforms, ADSapp can be deployed using Docker.

### Docker Deployment Guide

#### Prerequisites

```bash
# Docker and Docker Compose installed
docker --version  # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

#### Step 1: Build Docker Image

```bash
# Build production image
docker build -t adsapp:latest .

# Verify build
docker images | grep adsapp

# Expected output:
# adsapp  latest  abc123  2 minutes ago  450MB
```

#### Step 2: Create Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  adsapp:
    image: adsapp:latest
    container_name: adsapp-production
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN}
      - RESEND_API_KEY=${RESEND_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - adsapp-network

networks:
  adsapp-network:
    driver: bridge
```

#### Step 3: Deploy with Docker Compose

```bash
# Create .env.production file with all variables
cp .env.example .env.production
# Edit .env.production with production values

# Start application
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f adsapp

# Verify health
curl http://localhost:3000/api/health
```

#### Step 4: Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/adsapp

upstream adsapp {
  server localhost:3000;
}

server {
  listen 80;
  server_name app.yourdomain.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.yourdomain.com;

  # SSL Configuration
  ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Proxy Configuration
  location / {
    proxy_pass http://adsapp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Health check endpoint
  location /api/health {
    proxy_pass http://adsapp/api/health;
    access_log off;
  }
}
```

Enable and restart Nginx:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/adsapp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Obtain SSL certificate (if not already done)
sudo certbot --nginx -d app.yourdomain.com
```

---

## Rollback Procedures

### When to Rollback

Trigger rollback if:

- Critical functionality is broken
- Security vulnerability discovered
- Data corruption detected
- Performance degradation > 50%
- Error rate > 5%

### Vercel Rollback

#### Instant Rollback (Recommended)

```bash
# Via Vercel Dashboard
1. Navigate to project deployments
2. Find last stable deployment
3. Click "..." menu
4. Select "Promote to Production"
5. Confirm promotion

# Via Vercel CLI
vercel rollback

# Or rollback to specific deployment
vercel rollback deployment-url
```

#### Rollback Verification

```bash
# Verify deployment
curl https://app.yourdomain.com/api/health

# Check version
curl https://app.yourdomain.com/api/health | jq -r '.version'

# Monitor error rate
# Check Vercel Analytics or Sentry
```

### Database Rollback

#### Database Migration Rollback

**CAUTION**: Database rollback may cause data loss. Only perform if absolutely necessary.

**Option 1: Restore from Backup** (Safest)

```bash
# 1. Download latest backup
# Via Supabase Dashboard: Database → Backups → Download

# 2. Stop application (prevent writes)
vercel env rm NEXT_PUBLIC_APP_URL production
# This will cause health checks to fail

# 3. Restore database
export PGPASSWORD='your-database-password'
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql

# 4. Verify restore
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM profiles;"

# 5. Re-enable application
vercel env add NEXT_PUBLIC_APP_URL production
```

**Option 2: Manual Migration Reversal** (Advanced)

```sql
-- Create rollback script based on migration changes
-- Example for rolling back team_invitations table:

DROP TABLE IF EXISTS team_invitations CASCADE;
DROP FUNCTION IF EXISTS create_team_invitation CASCADE;
DROP POLICY IF EXISTS team_invitations_isolation ON team_invitations;

-- Verify rollback
SELECT table_name FROM information_schema.tables
WHERE table_name = 'team_invitations';
-- Should return 0 rows
```

### Environment Variable Rollback

```bash
# Revert to previous environment variables

# Via Vercel Dashboard
1. Settings → Environment Variables
2. Find changed variable
3. Click "Edit"
4. Restore previous value
5. Redeploy

# Via Vercel CLI
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
# Enter previous value
```

### Rollback Checklist

```bash
# Post-Rollback Verification Checklist

□ Deployment rolled back to stable version
□ Database restored from backup (if needed)
□ Environment variables verified
□ Health check passing
□ Authentication flow working
□ Payment processing functional
□ WhatsApp integration operational
□ Error rate back to normal (<1%)
□ Performance metrics acceptable
□ Team notified of rollback
□ Incident report created
□ Root cause analysis scheduled
```

---

## Troubleshooting

### Common Deployment Issues

#### Issue 1: Build Failure

**Symptoms**:

```
Error: Build failed with exit code 1
Module not found: Can't resolve '@/lib/...'
```

**Solution**:

```bash
# 1. Verify all dependencies installed
npm install --legacy-peer-deps

# 2. Clear Next.js cache
rm -rf .next

# 3. Verify TypeScript compilation
npm run type-check

# 4. Check for missing environment variables
# Ensure all NEXT_PUBLIC_ variables are set in Vercel

# 5. Rebuild locally
npm run build

# If build succeeds locally but fails on Vercel:
# Check Node.js version in Vercel settings
# Should be: 20.x
```

#### Issue 2: Database Connection Failure

**Symptoms**:

```
Error: Connection to database failed
ECONNREFUSED or timeout errors
```

**Solution**:

```bash
# 1. Verify database credentials
# Check Supabase Dashboard → Settings → Database

# 2. Test connection from Vercel
# Add temporary API route:
# /api/test-db

# 3. Check Supabase service status
# https://status.supabase.com

# 4. Verify RLS policies not blocking connection
# Temporarily disable RLS for testing:
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
# Re-enable after testing

# 5. Check connection pool limits
# Supabase Dashboard → Database → Connection pooling
```

#### Issue 3: Stripe Webhook Failures

**Symptoms**:

```
Stripe webhook endpoint returning 401 or 500
Webhooks showing failed in Stripe Dashboard
```

**Solution**:

```bash
# 1. Verify webhook secret
# Stripe Dashboard → Developers → Webhooks
# Compare with STRIPE_WEBHOOK_SECRET in Vercel

# 2. Test webhook endpoint
curl -X POST https://app.yourdomain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. Check webhook signature verification
# Add logging to webhook handler:
console.log('Webhook signature:', request.headers['stripe-signature']);

# 4. Verify endpoint URL in Stripe
# Should be: https://app.yourdomain.com/api/webhooks/stripe

# 5. Re-create webhook in Stripe Dashboard
# Delete old webhook, create new one with correct URL
```

#### Issue 4: WhatsApp Webhook Not Receiving Messages

**Symptoms**:

```
WhatsApp messages sent but not appearing in ADSapp
Webhook endpoint not being called
```

**Solution**:

```bash
# 1. Verify webhook URL configured
# Meta Business → WhatsApp → Configuration
# Should be: https://app.yourdomain.com/api/webhooks/whatsapp

# 2. Test webhook endpoint
curl -X GET "https://app.yourdomain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_TOKEN"
# Should return: test

# 3. Check webhook verify token
# Must match WHATSAPP_WEBHOOK_VERIFY_TOKEN

# 4. Verify webhook subscriptions
# Meta Business → WhatsApp → Webhook fields
# Ensure "messages" is subscribed

# 5. Check WhatsApp API credentials
# Verify WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID
```

#### Issue 5: Environment Variables Not Working

**Symptoms**:

```
Application behavior inconsistent
Features not working in production
undefined errors for environment variables
```

**Solution**:

```bash
# 1. Verify all variables set in Vercel
# Settings → Environment Variables
# Check: Production scope selected

# 2. Rebuild after adding variables
# Vercel → Deployments → Redeploy

# 3. Check variable naming
# NEXT_PUBLIC_ prefix required for client-side variables

# 4. Verify no typos
# Compare with .env.example

# 5. Check for hardcoded values
# Search codebase for direct environment access
grep -r "process.env" src/
```

### Performance Issues

#### Slow API Response Times

**Diagnosis**:

```bash
# 1. Check API response times
time curl https://app.yourdomain.com/api/health

# 2. Enable performance monitoring
# Vercel → Speed Insights

# 3. Check database query performance
# Supabase → Database → Query Performance

# 4. Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:

```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id
  ON conversations(organization_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id);

-- Optimize queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE organization_id = 'uuid-here'
ORDER BY last_message_at DESC
LIMIT 50;
```

#### High Database CPU Usage

**Diagnosis**:

```sql
-- Check active queries
SELECT
  pid,
  usename,
  application_name,
  state,
  query,
  query_start
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- Check long-running queries
SELECT
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;
```

**Solutions**:

```bash
# 1. Terminate long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = <process_id>;

# 2. Optimize queries identified above

# 3. Increase database resources
# Supabase Dashboard → Settings → Database
# Upgrade to larger instance

# 4. Implement query caching
# Add caching layer in application code
```

### Security Issues

#### SSL Certificate Problems

**Diagnosis**:

```bash
# Check certificate status
echo | openssl s_client -servername app.yourdomain.com \
  -connect app.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

**Solution**:

```bash
# Vercel automatically manages SSL certificates
# If issues occur:

# 1. Remove and re-add domain in Vercel
# Settings → Domains → Remove → Add

# 2. Wait for DNS propagation (up to 48 hours)
# Check DNS: dig app.yourdomain.com

# 3. Verify DNS records correct
# CNAME: app → cname.vercel-dns.com
```

#### Unauthorized Access Attempts

**Detection**:

```sql
-- Check for suspicious login attempts
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE event_type = 'auth_failure'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

**Response**:

```sql
-- Temporarily lock account
UPDATE profiles
SET account_locked = true,
    locked_at = NOW(),
    locked_reason = 'Multiple failed login attempts'
WHERE email = 'suspicious@email.com';

-- Notify user via email
-- Implement in application code
```

---

## Appendix

### A. Complete Migration List

All 39 database migrations in order:

```
001_initial_schema.sql
002_super_admin_system.sql
003_demo_system.sql
004_complete_database_schema.sql
005_tenant_customization.sql
006_authentication_enhancement.sql
007_fix_authentication_issues.sql
004_advanced_demo_analytics.sql
20251013_complete_rls_coverage.sql
20251013_mfa_implementation.sql
20251013_job_queue.sql
20251014_session_management.sql
20251014_missing_tables.sql
20251014_web_vitals_tracking.sql
20251014_accessibility_preferences.sql
20251014_gdpr_compliance.sql
20251014_api_versioning_event_sourcing.sql
20251014_sso_implementation.sql
20251014_advanced_rbac.sql
20251015_tags_table.sql
20251015_webhook_events.sql
20251015_refunds.sql
20251015_payment_intents.sql
20251016_cache_infrastructure.sql
20251017_kms_key_management.sql
20251018_gdpr_compliance.sql
20251019_rpc_hardening.sql
034_soc2_compliance.sql
035_tags_management_system.sql
036_team_invitations.sql
037_team_invitations.sql
037_team_invitations_FIXED.sql
038_business_hours_storage.sql
039_organization_logos_storage.sql
```

### B. Environment Variables Quick Reference

**Critical Production Variables**:

```bash
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WHATSAPP_ACCESS_TOKEN=EAAb...
RESEND_API_KEY=re_...
```

### C. Support Resources

**Documentation**:

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Vercel: https://vercel.com/docs

**Community**:

- GitHub Issues: https://github.com/your-org/adsapp/issues
- Discord: [Your Discord Server]
- Email Support: support@yourdomain.com

### D. Deployment Checklist Summary

```
□ Prerequisites verified
□ Development environment set up
□ All accounts created and verified
□ Code quality checks passing
□ Environment variables prepared
□ Database backup created
□ Migration files verified
□ Vercel project configured
□ Domain configured and verified
□ SSL certificate provisioned
□ Database migrations applied
□ Environment variables set in Vercel
□ Production deployment successful
□ Health checks passing
□ Authentication flow tested
□ Payment integration verified
□ WhatsApp integration verified
□ Email delivery tested
□ Performance metrics acceptable
□ Security verification completed
□ Monitoring configured
□ Team notified
□ Documentation updated
```

---

**Document Version**: 1.0.0
**Last Updated**: October 2025
**Next Review**: November 2025
**Owner**: DevOps Team
**Status**: Production Ready ✅
