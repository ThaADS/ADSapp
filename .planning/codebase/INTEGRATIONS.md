# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**Payment Processing:**
- Stripe - Payment processing and subscription billing
  - SDK/Client: `stripe` (backend), `@stripe/stripe-js` (frontend)
  - Auth: `STRIPE_SECRET_KEY` (backend), `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (frontend)
  - Webhook: `STRIPE_WEBHOOK_SECRET` for validating webhook signatures
  - Implementation: `src/lib/stripe/server.ts`, `src/lib/billing/`
  - Features: Subscriptions (Starter, Professional, Enterprise), payment intents, refunds, webhooks in `src/app/api/webhooks/stripe`

**Communication & Messaging:**
- WhatsApp Business Cloud API - Messaging platform integration
  - SDK/Client: Custom HTTP client in `src/lib/whatsapp/`
  - Auth: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - Version: `WHATSAPP_API_VERSION` (default: v18.0)
  - Implementation: `src/lib/whatsapp/enhanced-client.ts`, `src/lib/whatsapp/bulk-messaging.ts`, `src/lib/whatsapp/drip-campaigns.ts`
  - Webhook: `src/app/api/webhooks/whatsapp` for inbound messages
  - Features: Sending messages, media uploads, template management, webhook validation, bulk campaigns, drip sequences

**Email Delivery:**
- Resend - Transactional email service
  - SDK/Client: `resend` package
  - Auth: `RESEND_API_KEY`
  - Configuration: `RESEND_FROM_EMAIL` for sender address
  - Implementation: `src/lib/billing/notification-service.ts`, `src/lib/email/team-invitations.ts`, `src/lib/queue/processors/email-notification-processor.ts`
  - Features: Team invitations, billing notifications, MFA setup emails

**Artificial Intelligence:**
- OpenRouter - Unified AI API for multiple LLM providers
  - SDK/Client: Direct HTTP client in `src/lib/ai/openrouter.ts`
  - Auth: `OPENROUTER_API_KEY`
  - Config: `OPENROUTER_DEFAULT_MODEL`, `OPENROUTER_FALLBACK_MODEL`, `OPENROUTER_MAX_TOKENS`, `OPENROUTER_TEMPERATURE`
  - Default Model: `anthropic/claude-3.5-sonnet`
  - Fallback Model: `anthropic/claude-3-haiku`
  - Implementation: `src/lib/ai/` (drafts, auto-response, sentiment, categorization, summarization, translation)
  - Features: Message drafting, sentiment analysis, auto-responses, message categorization, content summarization

**Cloud Key Management:**
- AWS KMS (Key Management Service) - Encryption key management
  - SDK: `@aws-sdk/client-kms`, `@aws-sdk/credential-providers`
  - Implementation: `src/lib/security/credential-manager.ts` for credential encryption
  - Use case: Encrypting WhatsApp tokens and sensitive credentials at rest

**Error Tracking & Monitoring:**
- Sentry (via @sentry/nextjs) - Error tracking and performance monitoring
  - SDK: `@sentry/nextjs` (dynamically imported in API routes)
  - Implementation: `src/app/api/auth/session/` routes, error handlers
  - Features: Exception capture, distributed tracing context

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public), server operations use `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `@supabase/supabase-js` for querying, `@supabase/ssr` for server-side rendering
  - Schema: `supabase/migrations/` contains schema definitions
  - Implementation: `src/lib/supabase/server.ts` (server client), `src/lib/supabase/client.ts` (browser client)
  - Features: Multi-tenant data isolation via Row-Level Security (RLS) policies, real-time subscriptions via `postgres_changes`
  - Tables: organizations, profiles, contacts, conversations, messages, message_templates, automation_rules, ai_settings, ai_responses, subscriptions, workflows

**Caching:**
- Redis (via IORedis and Upstash)
  - Redis Connection: IORedis client `ioredis` configured in `src/lib/queue/bull-config.ts`
  - Serverless Redis: `@upstash/redis` for Vercel deployments
  - Use cases: BullMQ job queue storage, session caching, rate limiting in `src/lib/middleware/rate-limit.ts`
  - Implementation: `src/lib/queue/` for job queue, `src/lib/cache/` for caching utilities
  - Connection Options: Configurable retry strategies and pool management

**File Storage:**
- Supabase Storage - Cloud file storage
  - Integration: Via Supabase client `@supabase/supabase-js`
  - Use cases: Media uploads for WhatsApp messages (images, documents, audio, video)
  - Implementation: `src/lib/media/` for media handling

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built on GoTrue) - Custom implementation
  - Implementation: `src/lib/auth.ts`, `src/lib/auth-optimized.ts`
  - Session Management: `src/lib/session-management.ts` with JWT tokens via `jose`
  - MFA: One-time passwords via `otplib` in `src/lib/mfa-setup.ts`
  - Providers: Email/password, OAuth, SAML via `@boxyhq/saml-jackson`, OpenID Connect via `openid-client`

**Authorization:**
- CASL (@casl/ability) - Role-based access control (RBAC)
  - Implementation: `src/lib/rbac/` for permission policies
  - Roles: Owner, Admin, Agent, Viewer (defined in database profiles table)

**Single Sign-On:**
- SAML 2.0 - Enterprise SAML support
  - SDK: `@boxyhq/saml-jackson`, `xml-crypto`, `xml2js`
  - Implementation: `src/lib/auth/sso/saml.ts`
  - Features: SAML response validation, assertion processing, metadata generation
- OAuth 2.0 - Third-party OAuth integration
  - SDK: `openid-client`
  - Implementation: `src/lib/auth/sso/oauth.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Error and performance tracking
  - SDK: `@sentry/nextjs` (dynamically imported where needed)
  - Configuration: Environment-specific (development vs production)

**Logs:**
- Console logging (development) - Standard Node.js console methods
- OpenTelemetry - Structured logging and distributed tracing
  - SDK: `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
  - Exporters: Jaeger (`@opentelemetry/exporter-jaeger`), OTLP HTTP (`@opentelemetry/exporter-trace-otlp-http`)
  - Instrumentation: HTTP, Express middleware, database queries
  - Implementation: `src/lib/telemetry/tracer.ts`, `src/lib/telemetry/metrics.ts`, `src/lib/telemetry/spans.ts`
  - Configuration: Environment variables `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`

**Metrics & Traces:**
- OpenTelemetry Metrics - Performance and health metrics
  - Resource attributes: Service name, version, environment, deployment
  - Custom spans and metrics for API routes, external service calls, database queries
  - Trace context: Automatic context propagation for distributed tracing

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary deployment platform (detected via `process.env.VERCEL`)
  - Output: `output: 'standalone'` configured in next.config.ts
  - Compression: Enabled for production
  - Environment: Loads secrets from Vercel deployment settings
  - Features: Automatic deployments on git push, preview deployments

**Alternative Hosting:**
- Docker - Container support with Dockerfile and docker-compose
  - Files: `Dockerfile`, `docker-compose.dev.yml`, `docker-compose.yml`
  - Docker-based local development and production deployment

**CI Pipeline:**
- Lighthouse CI - Performance testing
  - CLI: `@lhci/cli` 0.13.0
  - Run command: `npm run test:performance`

**Build Tools:**
- Turbopack (experimental) - Next.js v16 bundler for faster builds
- Webpack (fallback) - Standard build system with bundle analysis support

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-side only)
- `WHATSAPP_ACCESS_TOKEN` - Meta Business API token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Webhook token
- `STRIPE_SECRET_KEY` - Stripe API key (server-side only)
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` - Stripe public key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `RESEND_API_KEY` - Email API key
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXTAUTH_SECRET` - Session encryption key (256-bit)
- `CRON_SECRET` - Cron job authorization

**Optional env vars:**
- `OPENROUTER_API_KEY` - AI API key (if using AI features)
- `OTEL_SERVICE_NAME` - OpenTelemetry service name
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Traces export endpoint

**Secrets location:**
- Local development: `.env.local` (not committed)
- Production: Vercel Secrets or deployment platform environment variables
- Docker: Passed via environment variables or `.env` file

## Webhooks & Callbacks

**Incoming:**
- WhatsApp Webhooks - Message delivery and status updates
  - Endpoint: `src/app/api/webhooks/whatsapp` (POST)
  - Verification: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for GET challenge validation
  - Middleware: `src/lib/middleware/whatsapp-webhook-validator.ts`
  - Events: Inbound messages, delivery status (sent, delivered, read), read receipts, message status callbacks
  - Processing: Via BullMQ job queue for async handling in `src/lib/queue/processors/`

- Stripe Webhooks - Payment events
  - Endpoint: `src/app/api/webhooks/stripe` (POST)
  - Signature validation: Using `STRIPE_WEBHOOK_SECRET` with `stripe.webhooks.constructEvent()`
  - Events: Subscription created, payment succeeded, invoice paid, customer updated, subscription deleted
  - Processing: Via `src/lib/billing/webhook-processor.ts`

**Outgoing:**
- Webhook integrations - Configurable webhooks for custom events
  - CRM Sync webhooks - Salesforce, HubSpot, Pipedrive sync endpoints in `src/lib/crm/`
  - Implementation: `src/app/api/crm/webhooks/` (POST)
  - Features: Contact sync, lead assignment, deal updates

## Rate Limiting & Performance

**Rate Limiting:**
- Middleware-based rate limiting in `src/lib/middleware/rate-limit.ts`
- Redis-backed rate limiting for API endpoints
- Configuration: Limits per endpoint and user

**Caching Strategy:**
- Client-side: Zustand for state management, browser cache for assets
- Server-side: Redis for session cache and queue storage
- Browser cache: Image optimization with Cache-Control headers

## Security & Compliance

**Input Validation:**
- Zod schema validation throughout API routes
- `src/lib/security/input-validation.ts` with custom validators for UUID, email, enum, date, etc.
- SQL injection detection: `detectSQLInjection()` function

**Encryption:**
- At-rest: AWS KMS for sensitive credentials
- In-transit: HTTPS enforced via HSTS header (max-age=63072000)
- Password: bcryptjs hashing with salt rounds

**Content Security Policy (CSP):**
- Comprehensive CSP header in next.config.ts
- Allowed sources: Self, Stripe, Vercel Live, Supabase, Pusher
- Script and style security: Minimal unsafe-inline usage for production

---

*Integration audit: 2026-01-23*
