# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- **TypeScript** 5.x - All frontend and backend code in `src/`
- **JavaScript** - Configuration files, test utilities, build scripts

**Supporting:**
- **SQL** - PostgreSQL via Supabase, migrations in `supabase/migrations/`
- **HTML/CSS** - Rendered via React 19, styled with Tailwind CSS 4

## Runtime

**Environment:**
- **Node.js** >=18.17.0 (requirement in `package.json`)
- **npm** 9+ (implied from package-lock.json)

**Package Manager:**
- **npm** - Dependency management via `package.json` and `package-lock.json`
- **Lockfile**: `package-lock.json` present and committed

## Frameworks

**Core:**
- **Next.js** 16.0.7 - Full-stack React framework with App Router (server/client components)
- **React** 19.1.0 - UI component library and JSX rendering
- **React DOM** 19.1.0 - DOM binding for React

**UI & Styling:**
- **Tailwind CSS** 4 - Utility-first CSS framework with PostCSS integration
- **Tailwind Merge** 3.4.0 - De-duplication utility for Tailwind class names
- **Headless UI** 2.2.9 - Unstyled, accessible component library
- **Heroicons** 2.2.0 - SVG icon library (outline and solid variants)
- **Lucide React** 0.544.0 - Modern icon library

**State Management:**
- **Zustand** 5.0.8 - Lightweight client-side state management (`src/stores/`)

**Visualization & Animation:**
- **Recharts** 3.3.0 - Data visualization and charting library
- **Framer Motion** 12.23.25 - Animation library for React
- **XYFlow React** 12.9.2 - Workflow diagram rendering (React Flow alternative)
- **Dagre** 0.8.5 - Graph layout engine for workflow visualization

**Testing:**
- **Jest** 29.7.0 - Unit and integration testing framework with SWC transpiler
- **Playwright** 1.47.0 - E2E browser testing (`@playwright/test` 1.47.0)
- **Testing Library** 14.3.1+ - React component testing utilities
  - `@testing-library/react` 14.3.1
  - `@testing-library/jest-dom` 6.4.2
  - `@testing-library/user-event` 14.5.2
- **nock** 13.5.5 - HTTP request mocking for tests
- **jest-junit** 16.0.0 - JUnit XML reporter for CI
- **supertest** 7.0.0 - HTTP assertion library

**Build/Dev Tools:**
- **SWC** (@swc/core 1.13.5, @swc/jest 0.2.39) - Rust-based JavaScript transpiler (faster than Babel)
- **Turbopack** (experimental, enabled with `npm run dev:turbo`) - Next.js bundler
- **ESLint** 9 - Code linting with TypeScript support
  - `@typescript-eslint/eslint-plugin` 8.15.0
  - `@typescript-eslint/parser` 8.15.0
  - `eslint-plugin-jsx-a11y` 6.8.0 - Accessibility rules
  - `eslint-plugin-security` 3.0.1 - Security rules
- **Prettier** 3.1.1 - Code formatter with Tailwind plugin
- **Husky** 8.0.3 - Git hooks for pre-commit linting
- **Lint-staged** 15.2.0 - Run linters on staged files
- **Lighthouse** 12.2.1 - Performance auditing
- **@lhci/cli** 0.13.0 - Lighthouse CI integration
- **@next/bundle-analyzer** 15.5.4 - Bundle size analysis (ANALYZE=true)
- **Critters** 0.0.23 - Critical CSS extraction

## Key Dependencies

**Database & ORM:**
- **@supabase/supabase-js** 2.58.0 - PostgreSQL client with real-time subscriptions
- **@supabase/ssr** 0.7.0 - Server-side rendering support for Supabase auth

**Payment Processing:**
- **stripe** 18.5.0 - Stripe backend SDK for billing
- **@stripe/stripe-js** 7.9.0 - Stripe frontend SDK for checkout

**Queue & Caching:**
- **bullmq** 5.61.0 - Redis-based job queue (bulk messaging, imports, notifications)
- **ioredis** 5.8.1 - Redis client for BullMQ connections
- **@upstash/redis** 1.35.5 - Upstash serverless Redis client

**Email & Communication:**
- **resend** 6.1.0 - Email delivery service
- **nodemailer** 7.0.13 - Email sending (backup)
- **@react-email/render** 1.3.1 - React email template rendering
- **libphonenumber-js** 1.12.26 - Phone number validation (WhatsApp)

**Security & Authentication:**
- **bcryptjs** 3.0.2 - Password hashing and validation
- **jose** 6.1.0 - JSON Web Token creation and verification
- **@boxyhq/saml-jackson** 1.52.2 - Enterprise SAML/SSO integration
- **openid-client** 6.8.1 - OAuth 2.0/OpenID Connect client
- **@casl/ability** 6.7.3 - Role-based access control (RBAC)
- **xml-crypto** 6.1.2 - XML digital signature verification (SAML)
- **xml2js** 0.6.2 - XML parsing for SAML responses
- **dompurify** 3.3.0 - HTML sanitization against XSS
- **otplib** 12.0.1 - One-time password generation for MFA
- **@aws-sdk/client-kms** 3.908.0 - AWS Key Management Service
- **@aws-sdk/credential-providers** 3.908.0 - AWS credential handling

**AI & LLM:**
- **Custom OpenRouter integration** in `src/lib/ai/openrouter.ts`
  - Default model: `anthropic/claude-3.5-sonnet`
  - Fallback model: `anthropic/claude-3-haiku`

**Validation & Data:**
- **zod** 3.22.4 - TypeScript-first schema validation
- **uuid** 9.0.1 - UUID generation
- **qrcode** 1.5.4 - QR code generation
- **jsdom** 27.0.1 - DOM implementation for testing

**Observability & Monitoring:**
- **@sentry/nextjs** 8.40.0 - Error tracking and performance monitoring (dynamically imported)
- **@opentelemetry/sdk-node** 0.45.1 - Node.js SDK for distributed tracing
- **@opentelemetry/auto-instrumentations-node** 0.40.3 - Auto-instrumentation
- **@opentelemetry/exporter-jaeger** 1.30.1 - Jaeger trace exporter
- **@opentelemetry/exporter-trace-otlp-http** 0.45.1 - OTLP HTTP exporter
- **@opentelemetry/instrumentation-http** 0.45.1 - HTTP instrumentation
- **@opentelemetry/instrumentation-express** 0.34.1 - Express middleware instrumentation
- **@opentelemetry/sdk-metrics** 1.30.1 - Metrics collection
- **@opentelemetry/resources** 1.30.1 - Resource definitions
- **@opentelemetry/semantic-conventions** 1.37.0 - Semantic conventions
- **@opentelemetry/api** 1.9.0 - OpenTelemetry API

**Internationalization:**
- **next-intl** 4.3.9 - i18n support (Dutch/English)

**Utilities:**
- **clsx** 2.1.1 - Conditional CSS class management
- **cross-env** 7.0.3 - Cross-platform environment variables
- **framer-motion** 12.23.25 - Animation library (also listed above)
- **web-vitals** 4.2.4 - Core Web Vitals measurement

## Configuration

**Environment Variables:**
Required in `.env` or deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase PostgreSQL endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public client key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-only)
- `WHATSAPP_ACCESS_TOKEN` - Meta Business API token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business phone ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Webhook verification token
- `STRIPE_SECRET_KEY` - Stripe API secret key (server-only)
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID` - Product price IDs
- `RESEND_API_KEY` - Email delivery API key
- `RESEND_FROM_EMAIL` - From email address (e.g., noreply@adsapp.nl)
- `NEXT_PUBLIC_APP_URL` - Application URL for OAuth redirects
- `NEXTAUTH_SECRET` - 256-bit session encryption key
- `CRON_SECRET` - Cron job authorization token

Optional:
- `OPENROUTER_API_KEY` - OpenRouter AI API key (required for AI features)
- `OPENROUTER_DEFAULT_MODEL` - Default AI model
- `OPENROUTER_FALLBACK_MODEL` - Fallback AI model
- `OPENROUTER_MAX_TOKENS` - Max tokens per request
- `OPENROUTER_TEMPERATURE` - Model temperature/creativity
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `NODE_ENV` - development | production
- `WHATSAPP_API_VERSION` - WhatsApp API version (default: v18.0)
- Feature flags: `NEXT_PUBLIC_ENABLE_DRIP_CAMPAIGNS`, `NEXT_PUBLIC_ENABLE_BROADCAST_CAMPAIGNS`, `NEXT_PUBLIC_ENABLE_ANALYTICS`

**Build Configuration:**
- `tsconfig.json` - TypeScript compiler (strict: true, path aliases `@/*`)
- `next.config.ts` - Next.js configuration (security headers HSTS/CSP, image optimization, Turbopack support)
- `jest.config.js` - Jest testing configuration (jsdom environment, SWC transpiler)
- `playwright.config.ts` - Playwright E2E configuration (chromium/firefox/webkit, 90s timeout)
- `postcss.config.mjs` - PostCSS with Tailwind CSS 4
- `eslint.config.mjs` - ESLint with TypeScript and security rules
- `i18n.config.ts` - i18n configuration (Dutch/English)

## Platform Requirements

**Development:**
- Node.js >=18.17.0
- npm 9+
- Supabase CLI (for database migrations)
- Docker (optional)

**Production:**
- **Primary:** Vercel (configured in next.config.ts with `process.env.VERCEL=1`)
- **Alternatives:** Any Node.js 18+ runtime (Render, Railway, DigitalOcean, AWS EC2)
- **Database:** Supabase PostgreSQL (managed)
- **Cache/Queue:** Redis (ioredis for BullMQ, @upstash/redis for serverless)
- **Email:** Resend SMTP
- **Payment:** Stripe
- **Monitoring:** Sentry + OpenTelemetry (Jaeger/OTLP)

**Scalability:**
- Multi-tenant RLS via Supabase Row Level Security
- Async processing via BullMQ job queue
- Redis caching for sessions and rate limiting
- Distributed tracing via OpenTelemetry
- Performance optimization with Turbopack

---

*Stack analysis: 2026-01-28*
