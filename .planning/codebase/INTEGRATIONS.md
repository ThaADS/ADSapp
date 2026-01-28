# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Messaging & Communication:**
- **WhatsApp Business Cloud API**
  - SDK/Client: Custom `WhatsAppClient` in `src/lib/whatsapp/client.ts`
  - Auth: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
  - Webhook: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for webhook verification
  - API Version: `WHATSAPP_API_VERSION` (default: v18.0)
  - Base URL: `https://graph.facebook.com/v18.0`
  - Features: Message sending (text, templates, media, documents), webhook handling
  - Implementation: `src/lib/whatsapp/business-api.ts`, `src/lib/whatsapp/service.ts`
  - Advanced: Bulk messaging, drip campaigns, template management in `src/lib/whatsapp/`

**Payment Processing:**
- **Stripe**
  - SDK: `stripe` 18.5.0 (backend), `@stripe/stripe-js` 7.9.0 (frontend)
  - Auth: `STRIPE_SECRET_KEY` (server), `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (client)
  - Webhook: `STRIPE_WEBHOOK_SECRET` for signature validation
  - Client: `src/lib/stripe/client.ts` loads frontend SDK
  - API Endpoint: Stripe hosted checkout and payment intents
  - Price IDs: `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`
  - Features: Subscriptions, recurring billing, payment methods, webhooks in `src/app/api/webhooks/stripe`

**Email Delivery:**
- **Resend**
  - SDK: `resend` 6.1.0
  - Auth: `RESEND_API_KEY`
  - Sender: `RESEND_FROM_EMAIL` (e.g., noreply@adsapp.nl)
  - Implementation: `src/lib/email/team-invitations.ts` for HTML templates
  - Features: Team invitations, billing notifications, transactional emails
  - Fallback: `nodemailer` 7.0.13 for alternative email sending

**AI & Language Models:**
- **OpenRouter**
  - Client: Custom HTTP client in `src/lib/ai/openrouter.ts`
  - Auth: `OPENROUTER_API_KEY`
  - Default Model: `OPENROUTER_DEFAULT_MODEL` (anthropic/claude-3.5-sonnet)
  - Fallback Model: `OPENROUTER_FALLBACK_MODEL` (anthropic/claude-3-haiku)
  - Base URL: `https://openrouter.ai/api/v1`
  - Configuration: `OPENROUTER_MAX_TOKENS`, `OPENROUTER_TEMPERATURE`
  - Features: Message drafts, sentiment analysis, auto-response generation, translation, categorization, summarization
  - Implementation: `src/lib/ai/drafts.ts`, `src/lib/ai/sentiment.ts`, `src/lib/ai/auto-response.ts`, etc.

**Enterprise Authentication:**
- **BoxyHQ SAML Jackson** (@boxyhq/saml-jackson 1.52.2)
  - Purpose: Multi-tenant SAML/SSO integration
  - Supported Providers: Okta, Azure AD, OneLogin, generic SAML 2.0
  - Implementation: `src/lib/auth/` directory
  - Features: SAML assertion validation, metadata generation, SCIM provisioning
  - XML Security: `xml-crypto` 6.1.2 for signature verification, `xml2js` 0.6.2 for parsing

- **OpenID Connect** (openid-client 6.8.1)
  - Purpose: OAuth 2.0 and OpenID Connect flows
  - Implementation: `src/lib/auth/sso/oauth.ts`
  - Providers: Google, GitHub, and custom OIDC providers

**CRM Integrations:**
- **Base CRM Client Architecture** in `src/lib/crm/base-client.ts`
  - Supported: Salesforce, HubSpot, Pipedrive
  - Features: Contact sync, deal tracking, custom fields synchronization
  - Implementation: Interfaces for credentials, contacts, deals, activities

**Cloud Key Management:**
- **AWS KMS** (@aws-sdk/client-kms 3.908.0)
  - Purpose: Encryption key management for sensitive credentials
  - Implementation: `src/lib/security/kms-client.ts`
  - Use Case: Encrypt/decrypt WhatsApp tokens and credentials at rest
  - Credentials: `@aws-sdk/credential-providers` 3.908.0

- **Azure Key Vault** (alternative)
  - Implementation: `src/lib/security/azure-kv-client.ts`

**Observability & Error Tracking:**
- **Sentry** (@sentry/nextjs 8.40.0)
  - Purpose: Error tracking and performance monitoring
  - Configuration: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - Sampling: 100% in development, 10% in production
  - Features: Exception capture, session replay, distributed tracing context
  - Dynamically imported in API routes for load optimization

## Data Storage

**Databases:**
- **Supabase PostgreSQL** (managed cloud database)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public), `SUPABASE_SERVICE_ROLE_KEY` (admin)
  - Client: `@supabase/supabase-js` 2.58.0 + `@supabase/ssr` 0.7.0
  - Server Client: `src/lib/supabase/server.ts` (MUST be awaited, RLS-enabled)
  - Browser Client: `src/lib/supabase/client.ts`
  - Service Role: `createServiceRoleClient()` for admin operations only
  - Features: Multi-tenant RLS policies, real-time subscriptions via `postgres_changes`
  - Tables: organizations, profiles, contacts, conversations, messages, message_templates, automation_rules, ai_settings, subscriptions, workflows
  - Migrations: `supabase/migrations/` managed via Supabase CLI

**File Storage:**
- **Supabase Storage** (integrated with PostgreSQL)
  - Purpose: Store media files, documents, user uploads
  - Access: Via Supabase JS SDK bucket operations
  - Implementation: `src/lib/media/` for media handling

**Caching:**
- **Upstash Redis** (serverless REST API)
  - Client: `@upstash/redis` 1.35.5
  - Implementation: `src/lib/cache/redis-client.ts`
  - Use Cases: Rate limiting, session caching, query result caching
  - Configuration: URL and token via environment

- **Redis via IORedis** (for BullMQ)
  - Client: `ioredis` 5.8.1
  - Implementation: `src/lib/queue/bull-config.ts`
  - Use Case: Job queue backend for BullMQ
  - Connection: Configurable retry and pool strategies

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** (built-in with PostgreSQL)
  - Implementation: `src/lib/auth.ts`, `src/lib/auth-optimized.ts`
  - Methods: Email/password, OAuth, SAML, OpenID Connect
  - Token Validation: JWT via `jose` 6.1.0
  - MFA: OTP-based via `otplib` 12.0.1 in `src/lib/auth/mfa.ts`
  - Session Management: Cookie-based via @supabase/ssr

**Authorization:**
- **CASL** (@casl/ability 6.7.3)
  - Implementation: `src/lib/rbac/` directory
  - Roles: Owner, Admin, Agent, Viewer
  - Permissions: `src/lib/rbac/permissions.ts`, `src/lib/rbac/roles.ts`
  - Middleware: `src/lib/rbac/middleware.ts`

**Password Security:**
- **bcryptjs** 3.0.2 - Password hashing and validation
- **otplib** 12.0.1 - 2FA/OTP token generation and verification

## Monitoring & Observability

**Error Tracking:**
- **Sentry** (@sentry/nextjs 8.40.0)
  - DSN: `NEXT_PUBLIC_SENTRY_DSN`
  - Sampling: 100% dev, 10% production, 100% on error
  - Features: Exception capture, session replay, performance monitoring

**Distributed Tracing:**
- **OpenTelemetry** (8 packages)
  - SDK: `@opentelemetry/sdk-node` 0.45.1
  - Auto-Instrumentation: `@opentelemetry/auto-instrumentations-node` 0.40.3
  - Exporters:
    - Jaeger: `@opentelemetry/exporter-jaeger` 1.30.1
    - OTLP HTTP: `@opentelemetry/exporter-trace-otlp-http` 0.45.1
  - Instrumentation:
    - HTTP: `@opentelemetry/instrumentation-http` 0.45.1
    - Express: `@opentelemetry/instrumentation-express` 0.34.1
  - Implementation: `src/lib/telemetry/tracer.ts`, `src/lib/telemetry/metrics.ts`
  - Metrics: `@opentelemetry/sdk-metrics` 1.30.1, `@opentelemetry/resources` 1.30.1

**Logging:**
- Custom Logger: `src/lib/security/logger.ts`
- Audit Logging: `src/lib/security/audit-service.ts`
- Approach: Structured logging with OpenTelemetry integration

**Performance Monitoring:**
- **Lighthouse CI** (@lhci/cli 0.13.0)
  - Command: `npm run test:performance`
  - Metrics: Web Vitals, Performance, Accessibility, Best Practices, SEO

## CI/CD & Deployment

**Hosting:**
- **Vercel** (primary)
  - Configuration: Automatic detection from `next.config.ts`
  - Features: Serverless functions, edge caching, preview deployments
  - Environment: `VERCEL=1` flag detected in build config
  - Output: `output: 'standalone'` for optimal deployment

**Alternative Hosting:**
- Docker-based deployment (Dockerfile + docker-compose)
- Any Node.js 18+ runtime (Render, Railway, DigitalOcean, AWS, Heroku)

**CI Pipeline:**
- **GitHub Actions** (implied)
- Test Commands:
  - `npm run test:ci` - Jest unit tests with coverage
  - `npm run test:e2e` - Playwright E2E tests
  - `npm run type-check` - TypeScript type checking
  - `npm run lint` - ESLint code quality
  - `npm run test:security` - npm audit vulnerabilities
  - `npm run test:performance` - Lighthouse CI

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client auth key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations key
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp API token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone ID
- `STRIPE_SECRET_KEY` - Stripe server API key
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` - Stripe client key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID` - Product IDs
- `RESEND_API_KEY` - Email service key
- `RESEND_FROM_EMAIL` - From email address
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `CRON_SECRET` - Cron job authorization token

**Optional env vars:**
- `OPENROUTER_API_KEY` - AI features (required for drafts, sentiment, etc.)
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- `WHATSAPP_API_VERSION` - WhatsApp API version (default: v18.0)
- Feature flags: `NEXT_PUBLIC_ENABLE_DRIP_CAMPAIGNS`, `NEXT_PUBLIC_ENABLE_BROADCAST_CAMPAIGNS`, `NEXT_PUBLIC_ENABLE_ANALYTICS`

**Secrets Location:**
- Development: `.env`, `.env.local` (git-ignored)
- Production: Vercel Environment Variables, CI/CD secrets manager
- Cloud KMS: AWS KMS for encryption key management
- Azure: Azure Key Vault for alternative deployments

## Webhooks & Callbacks

**Incoming:**
- **WhatsApp Webhook**: `src/app/api/webhooks/whatsapp`
  - Verification: Token-based challenge-response
  - Validator: `src/lib/middleware/whatsapp-webhook-validator.ts`
  - Events: Inbound messages, delivery status, read receipts
  - Processing: Via BullMQ job queue for async handling

- **Stripe Webhook**: `src/app/api/webhooks/stripe`
  - Verification: HMAC signature with `STRIPE_WEBHOOK_SECRET`
  - Events: Subscription created, payment succeeded, invoice paid, customer updated
  - Processing: Via `src/lib/billing/webhook-processor.ts`

**Outgoing:**
- WhatsApp message sending via Business Cloud API
- Email delivery via Resend or Nodemailer
- CRM sync webhooks (Salesforce, HubSpot, Pipedrive) in `src/lib/crm/`
- OpenRouter API calls for AI features
- OpenTelemetry traces to Jaeger or OTLP endpoint
- Sentry events for error tracking

## Queue & Async Processing

**Job Queue System:**
- **BullMQ** (Redis-backed)
  - Configuration: `src/lib/queue/bull-config.ts`
  - Connection: `ioredis` 5.8.1 to Redis
  - Queues:
    - `bulk-messages` - Bulk WhatsApp message sending
    - `contact-import` - CSV/contact file imports
    - `template-processing` - Template validation
    - `email-notification` - Email delivery
  - Job Priorities: CRITICAL, HIGH, NORMAL, LOW
  - Features: Auto-retry, exponential backoff, progress tracking, dead letter queue
  - Processors: `src/lib/queue/processors/`

**Rate Limiting:**
- **Upstash Redis**: Rate limit tracking via `src/lib/middleware/rate-limiter-redis.ts`
- **Custom Middleware**: `src/lib/security/rate-limit.ts`
- Per-endpoint and per-user limits

## Data Integration & Export

**Bulk Operations:**
- Contact imports: `src/lib/bulk-operations/` (CSV parsing, validation)
- Bulk messaging: `src/lib/whatsapp/bulk-messaging.ts` (via BullMQ)
- Analytics export: `src/lib/export/analytics-export.ts`

**GDPR & Data Compliance:**
- Data export: `src/lib/gdpr/data-export.ts`
- Compliance scoring: `src/lib/gdpr/compliance-score.ts`
- Field-level encryption: `src/lib/crypto/encryption.ts`

**Internationalization:**
- **next-intl** 4.3.9
  - Supported locales: Dutch (nl), English (en)
  - Configuration: `i18n.config.ts`
  - Message files: `src/locales/{locale}/` (JSON)
  - Detection: Browser Accept-Language header

---

*Integration audit: 2026-01-28*
