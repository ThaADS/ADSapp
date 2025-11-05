# 🚀 ADSapp Production Deployment Guide

**Complete deployment documentation for the enterprise-grade Multi-Tenant WhatsApp Business Inbox SaaS platform**

---

## 🎯 Overview

This comprehensive guide covers the complete deployment process for ADSapp, from development to production. The platform is designed for enterprise deployment with high availability, security, and scalability requirements.

**Production Architecture**: Next.js 15 + Vercel + Supabase + Stripe + WhatsApp Business Cloud API

---

## 📋 Prerequisites & Requirements

### System Requirements

- **Node.js**: 18.17.0 or higher (LTS recommended)
- **npm**: 9.0.0 or higher
- **Git**: Latest version for version control
- **Docker**: 20.10+ (for containerized deployment)
- **SSL Certificate**: Required for production domains

### Service Accounts Required

1. **Vercel Account** - Primary hosting platform
2. **Supabase Account** - Database and authentication
3. **Stripe Account** - Payment processing (live mode)
4. **Meta Developer Account** - WhatsApp Business API
5. **Resend Account** - Email delivery service
6. **Domain Provider** - Custom domain management

### Security Prerequisites

- SSL/TLS certificate for custom domain
- Environment-specific API keys (development, staging, production)
- Secure secret management system
- Firewall and network security configuration
- Compliance with GDPR, SOC 2, and industry standards

---

## 🔧 Environment Configuration

### Development Environment

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
---

## 🔐 Super Admin Setup (CRITICAL FIRST STEP)

**⚠️ MUST BE COMPLETED BEFORE PRODUCTION USE**

### Quick Super Admin Creation

```bash
# 1. Ensure production environment is configured
cp .env.example .env.production

# 2. Set required environment variables
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# 3. Create super admin account
node create-super-admin.js

# 4. Verify creation
# Login at: https://your-domain.com/auth/signin
# Email: superadmin@adsapp.com
# Password: ADSapp2024!SuperSecure#Admin
```

### Manual Super Admin Setup (Alternative)

If the automated script fails, use direct SQL:

```sql
-- Run in Supabase SQL Editor
DO $$
DECLARE
    user_id UUID := gen_random_uuid();
BEGIN
    -- Create auth user
    INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data
    ) VALUES (
        user_id,
        'superadmin@adsapp.com',
        crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"name": "ADSapp Super Administrator", "role": "super_admin"}'::jsonb
    );

    -- Create super admin profile
    INSERT INTO profiles (
        id, email, name, is_super_admin, super_admin_permissions, created_at
    ) VALUES (
        user_id,
        'superadmin@adsapp.com',
        'ADSapp Super Administrator',
        true,
        ARRAY['manage_organizations', 'manage_users', 'manage_billing', 'manage_system_settings', 'view_analytics', 'manage_support', 'audit_access'],
        NOW()
    );

    RAISE NOTICE 'Super Admin Created - ID: %', user_id;
END $$;
```

### Super Admin Verification

```bash
# Test super admin login
curl -X POST "https://your-domain.com/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@adsapp.com",
    "password": "ADSapp2024!SuperSecure#Admin"
  }'

# Access admin dashboard
# URL: https://your-domain.com/admin
```

**🔒 Security Requirements:**
- Change password immediately after first login
- Enable 2FA when available
- Document credentials in secure password manager
- Follow security best practices in `SUPER-ADMIN-PRODUCTION-GUIDE.md`

### Production Admin Features

Once super admin is created, you have access to:

- **🏢 Organization Management** - Create and manage tenant organizations
- **👥 User Administration** - Cross-tenant user management and support
- **💳 Billing Oversight** - Subscription management and payment processing
- **📊 Platform Analytics** - System-wide metrics and performance monitoring
- **🔧 System Configuration** - Platform settings and feature management
- **🔒 Security & Audit** - Complete audit trails and compliance tools

**📚 Complete Guide**: See `SUPER-ADMIN-PRODUCTION-GUIDE.md` for detailed instructions

---
NODE_ENV=development

# Authentication & Security
NEXTAUTH_SECRET=dev-secret-key-32-characters-min
NEXTAUTH_URL=http://localhost:3000

# Supabase Database (Development)
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-dev-service-role-key

# WhatsApp Business API (Test)
WHATSAPP_ACCESS_TOKEN=EAAb...your-test-access-token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-dev-verify-token

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your-test-public-key
STRIPE_SECRET_KEY=sk_test_...your-test-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-test-webhook-secret

# Email Service (Development)
RESEND_API_KEY=re_...your-dev-resend-api-key

# Monitoring & Analytics
SENTRY_DSN=https://your-dev-sentry-dsn
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-dev-analytics-id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_DEBUG_MODE=true
```

### Staging Environment

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
NEXT_PUBLIC_APP_NAME="ADSapp Staging"
NODE_ENV=production

# Authentication & Security
NEXTAUTH_SECRET=staging-secure-secret-key-256-bit-minimum
NEXTAUTH_URL=https://staging.your-domain.com

# Supabase Database (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-staging-service-role-key

# WhatsApp Business API (Test)
WHATSAPP_ACCESS_TOKEN=EAAb...your-test-access-token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-staging-verify-token

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your-test-public-key
STRIPE_SECRET_KEY=sk_test_...your-test-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-staging-webhook-secret

# Email Service (Staging)
RESEND_API_KEY=re_...your-staging-resend-api-key

# Monitoring & Analytics
SENTRY_DSN=https://your-staging-sentry-dsn
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-staging-analytics-id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_DEBUG_MODE=false
```

### Production Environment

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME="ADSapp"
NODE_ENV=production

# Authentication & Security
NEXTAUTH_SECRET=production-ultra-secure-secret-key-256-bit-minimum
NEXTAUTH_URL=https://your-domain.com

# Supabase Database (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-production-service-role-key

# WhatsApp Business API (Production)
WHATSAPP_ACCESS_TOKEN=EAAb...your-production-access-token
WHATSAPP_PHONE_NUMBER_ID=production-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=production-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-production-verify-token

# Stripe (Live Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...your-live-public-key
STRIPE_SECRET_KEY=sk_live_...your-live-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-production-webhook-secret

# Email Service (Production)
RESEND_API_KEY=re_...your-production-resend-api-key

# Monitoring & Analytics
SENTRY_DSN=https://your-production-sentry-dsn
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-production-analytics-id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_DEBUG_MODE=false

# Production Security
NEXT_PUBLIC_SECURITY_HEADERS=true
NEXT_PUBLIC_RATE_LIMITING=true
NEXT_PUBLIC_AUDIT_LOGGING=true
```

---

## 🌐 Vercel Deployment (Recommended)

Vercel provides optimal deployment for Next.js applications with global CDN, edge functions, and automatic SSL.

### 1. Initial Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### 2. Environment Variables Configuration

```bash
# Add development environment variables
vercel env add NEXTAUTH_SECRET development
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add SUPABASE_SERVICE_ROLE_KEY development

# Add staging environment variables
vercel env add NEXTAUTH_SECRET preview
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview

# Add production environment variables
vercel env add NEXTAUTH_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### 3. Domain Configuration

```bash
# Add custom domain
vercel domains add your-domain.com

# Configure DNS
# Add CNAME record: www.your-domain.com -> cname.vercel-dns.com
# Add A record: your-domain.com -> 76.76.19.61

# Verify domain
vercel domains verify your-domain.com
```

### 4. Build Configuration

Create or update `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/docs",
      "destination": "/documentation",
      "permanent": true
    }
  ]
}
```

### 5. Deployment Commands

```bash
# Deploy to development
vercel --env development

# Deploy to staging
vercel --env preview

# Deploy to production
vercel --prod

# Deploy with specific environment file
vercel --env production --yes
```

### 6. Monitoring Deployment

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs your-deployment-url

# Monitor performance
vercel analytics
```

---

## 🐳 Docker Deployment

For self-hosted or cloud provider deployments using containers.

### 1. Dockerfile

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Docker Compose

#### Development (`docker-compose.dev.yml`)

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: base
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: adsapp_dev
      POSTGRES_USER: adsapp
      POSTGRES_PASSWORD: development_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### Production (`docker-compose.prod.yml`)

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - nginx

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped
    depends_on:
      - app
```

### 3. Build and Deploy

```bash
# Build production image
docker build -t adsapp:latest .

# Run production container
docker run -d \
  --name adsapp-prod \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  adsapp:latest

# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps app
```

---

## ☁️ Cloud Provider Deployments

### AWS ECS Deployment

#### 1. Task Definition

```json
{
  "family": "adsapp-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "adsapp",
      "image": "your-account.dkr.ecr.region.amazonaws.com/adsapp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:adsapp/nextauth-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/adsapp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### 2. Service Configuration

```bash
# Create ECS service
aws ecs create-service \
  --cluster adsapp-cluster \
  --service-name adsapp-service \
  --task-definition adsapp-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/adsapp/1234567890123456,containerName=adsapp,containerPort=3000
```

### Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/your-project/adsapp

# Deploy to Cloud Run
gcloud run deploy adsapp \
  --image gcr.io/your-project/adsapp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 100 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production \
  --set-secrets /secrets/nextauth=nextauth-secret:latest
```

### Microsoft Azure Container Instances

```bash
# Create resource group
az group create --name adsapp-rg --location eastus

# Deploy container
az container create \
  --resource-group adsapp-rg \
  --name adsapp \
  --image your-registry.azurecr.io/adsapp:latest \
  --dns-name-label adsapp \
  --ports 3000 \
  --cpu 1 \
  --memory 2 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables \
    NEXTAUTH_SECRET=your-secret \
    SUPABASE_SERVICE_ROLE_KEY=your-key
```

---

## 🗄️ Database Setup & Migration

### Supabase Production Setup

#### 1. Create Production Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to production project
supabase link --project-ref your-production-project-ref
```

#### 2. Database Migration

```bash
# Generate migration from local changes
supabase db diff --file new_migration_name

# Apply migrations to production
supabase db push

# Reset database (CAUTION: This will delete all data)
supabase db reset --linked

# Create database backup
supabase db dump --data-only > backup.sql
```

#### 3. Row Level Security Setup

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for multi-tenant isolation
CREATE POLICY "Organizations: Users can view own organization" ON organizations
FOR SELECT USING (id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Profiles: Users can view profiles in own organization" ON profiles
FOR SELECT USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- Apply similar policies to all tables...
```

#### 4. Performance Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);

-- Enable connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

---

## 🔗 Webhook Configuration

### WhatsApp Business API Webhooks

#### 1. Configure Webhook URL

```bash
# Set webhook URL via Meta Business API
curl -X POST "https://graph.facebook.com/v18.0/your-phone-number-id/webhooks" \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-domain.com/api/webhooks/whatsapp",
    "verify_token": "your-verify-token"
  }'
```

#### 2. Webhook Verification

The webhook endpoint at `/api/webhooks/whatsapp` handles:

```typescript
// Webhook verification (GET request)
if (method === 'GET') {
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}
```

#### 3. Message Processing

```typescript
// Message processing (POST request)
if (method === 'POST') {
  const body = await request.json();

  // Verify webhook signature
  const signature = request.headers.get('x-hub-signature-256');
  const isValid = verifyWhatsAppSignature(body, signature);

  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process messages
  await processWhatsAppWebhook(body);
  return new Response('OK', { status: 200 });
}
```

### Stripe Webhooks

#### 1. Configure Stripe Webhook

```bash
# Create webhook endpoint in Stripe dashboard
# URL: https://your-domain.com/api/webhooks/stripe
# Events: customer.subscription.created, customer.subscription.updated, invoice.payment_succeeded, invoice.payment_failed
```

#### 2. Webhook Processing

```typescript
// Stripe webhook handling
const signature = request.headers.get('stripe-signature');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

try {
  const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  return new Response('OK', { status: 200 });
} catch (error) {
  return new Response('Webhook Error', { status: 400 });
}
```

---

## 🔒 Security Configuration

### SSL/TLS Setup

#### Vercel (Automatic)
- SSL certificates are automatically provisioned and renewed
- HTTPS is enforced by default
- Custom domains get automatic SSL

#### Manual SSL Configuration

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

Update `next.config.ts`:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};
```

### Environment Security

```bash
# Use encrypted environment variables
vercel env add NEXTAUTH_SECRET production --sensitive

# Rotate secrets regularly
# Update all API keys and tokens quarterly

# Implement secret scanning
git secrets --install
git secrets --register-aws
```

---

## 📊 Monitoring & Analytics

### Application Monitoring

#### Vercel Analytics

```tsx
// Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Sentry Error Tracking

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure Sentry
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import { init } from '@sentry/nextjs';

init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    checks: {
      database: await checkDatabase(),
      stripe: await checkStripe(),
      whatsapp: await checkWhatsApp(),
    },
  };

  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');

  return Response.json(health, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}
```

### Custom Metrics

```typescript
// lib/monitoring.ts
export class Metrics {
  static async recordApiCall(endpoint: string, duration: number, status: number) {
    // Send to your monitoring service
    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        type: 'api_call',
        endpoint,
        duration,
        status,
        timestamp: Date.now(),
      }),
    });
  }

  static async recordBusinessMetric(metric: string, value: number) {
    // Record business KPIs
    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        type: 'business_metric',
        metric,
        value,
        timestamp: Date.now(),
      }),
    });
  }
}
```

---

## 🚀 Performance Optimization

### Next.js Configuration

```typescript
// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    appDir: true,
    turbopack: true,
    serverComponentsExternalPackages: ['@prisma/client'],
  },

  // Optimize images
  images: {
    domains: ['your-domain.com', 'supabase.co'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Compress responses
  compress: true,

  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    bundle: {
      analyzer: {
        enabled: true,
      },
    },
  }),

  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  },
};
```

### Database Optimization

```sql
-- Connection pooling settings
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Query optimization
ANALYZE;
VACUUM ANALYZE;

-- Monitor slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'all';
```

### CDN Configuration

```bash
# Configure Vercel Edge Network
# Automatic global CDN distribution
# Edge caching for static assets
# Dynamic content at the edge

# Custom cache headers
const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'CDN-Cache-Control': 'public, s-maxage=3600',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
};
```

---

## 🔄 Backup & Disaster Recovery

### Database Backup

```bash
# Automated Supabase backups
# Point-in-time recovery available
# Daily automated backups

# Manual backup
supabase db dump --data-only > "backup-$(date +%Y%m%d).sql"

# Restore from backup
psql -h your-db-host -d postgres -f backup-20231201.sql
```

### Application Backup

```bash
# Git-based version control
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Docker image backup
docker save adsapp:latest | gzip > adsapp-backup.tar.gz

# Environment configuration backup
gpg --encrypt --recipient admin@company.com .env.production
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Strategy**:
   - Database: Continuous with point-in-time recovery
   - Application: Git tags + Docker images
   - Configuration: Encrypted backups

#### Recovery Procedures

```bash
# 1. Assess the situation
curl -f https://your-domain.com/api/health

# 2. Deploy from backup
vercel deploy --prod

# 3. Restore database if needed
supabase db reset --linked
psql -h db-host -d postgres -f latest-backup.sql

# 4. Verify services
curl -f https://your-domain.com/api/health/db
curl -f https://your-domain.com/api/health/stripe

# 5. Monitor for 24 hours
watch -n 60 'curl -s https://your-domain.com/api/health | jq .status'
```

---

## 📋 Production Deployment Checklist

### Pre-Deployment

- [ ] **Code Quality**
  - [ ] All tests passing (`npm run test:ci`)
  - [ ] Code coverage >80%
  - [ ] TypeScript compilation successful
  - [ ] ESLint checks passed
  - [ ] Security audit passed (`npm audit`)

- [ ] **Environment Setup**
  - [ ] Production environment variables configured
  - [ ] Database migrations applied
  - [ ] SSL certificates valid
  - [ ] Domain DNS configured correctly

- [ ] **Service Configuration**
  - [ ] Supabase production project ready
  - [ ] Stripe live mode configured
  - [ ] WhatsApp Business API approved
  - [ ] Email service configured

### Deployment

- [ ] **Application Deployment**
  - [ ] Build successful
  - [ ] Health checks passing
  - [ ] Performance metrics within targets
  - [ ] Error rates <1%

- [ ] **Webhook Configuration**
  - [ ] WhatsApp webhooks verified
  - [ ] Stripe webhooks tested
  - [ ] Webhook signatures validated

- [ ] **Monitoring Setup**
  - [ ] Sentry error tracking active
  - [ ] Vercel analytics enabled
  - [ ] Custom metrics recording
  - [ ] Alert thresholds configured

### Post-Deployment

- [ ] **Verification**
  - [ ] User registration flow tested
  - [ ] WhatsApp message sending/receiving
  - [ ] Stripe payment processing
  - [ ] Admin functions operational

- [ ] **Performance**
  - [ ] Page load times <2 seconds
  - [ ] API response times <500ms
  - [ ] Database query performance optimized
  - [ ] CDN caching effective

- [ ] **Security**
  - [ ] Security headers active
  - [ ] Rate limiting functional
  - [ ] HTTPS redirect working
  - [ ] Audit logs recording

---

## 🆘 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### Environment Variable Issues

```bash
# Verify environment variables
vercel env ls

# Test environment variable access
node -e "console.log(process.env.NEXTAUTH_SECRET)"

# Re-deploy with environment variables
vercel --prod --yes
```

#### Database Connection Issues

```bash
# Test database connection
psql -h your-supabase-host -d postgres -c "SELECT NOW();"

# Check RLS policies
psql -h your-supabase-host -d postgres -c "SELECT * FROM pg_policies;"

# Verify Supabase status
curl -f https://your-project.supabase.co/rest/v1/
```

#### Webhook Issues

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify webhook signatures
# Check Meta Developer Console logs
# Review Stripe webhook logs
```

### Performance Issues

```bash
# Analyze bundle size
npm run analyze

# Monitor database performance
# Check Supabase dashboard metrics
# Review slow query logs

# Profile application
npm run dev
# Open Chrome DevTools > Performance tab
```

### Monitoring Commands

```bash
# Check application health
curl -f https://your-domain.com/api/health

# Monitor deployment
vercel logs your-deployment-url --follow

# Database monitoring
# Access Supabase dashboard
# Review performance insights

# Error tracking
# Check Sentry dashboard
# Review error trends and patterns
```

---

## 📞 Support & Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Stripe Documentation](https://stripe.com/docs)

### Community Support
- [GitHub Issues](https://github.com/your-org/adsapp/issues)
- [Discord Community](https://discord.gg/adsapp)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/adsapp)

### Enterprise Support
- **Email**: enterprise@adsapp.com
- **Phone**: +1-800-ADSAPP-1
- **SLA**: 4-hour response time
- **Availability**: 24/7 for critical issues

---

**Built with ❤️ for enterprise deployment**

*This guide ensures reliable, secure, and scalable deployment of your ADSapp WhatsApp Business Inbox SaaS platform.*