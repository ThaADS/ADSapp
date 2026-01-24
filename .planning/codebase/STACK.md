# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.x - All frontend and backend code in `src/`
- JavaScript (Node.js compatible) - Configuration files and build tooling

**Secondary:**
- SQL - Database schemas and migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js 20.x (inferred from tsconfig target: ES2017, module resolution: bundler)

**Package Manager:**
- npm 10.x (implied by package-lock.json presence)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.0.7 - Full-stack framework with App Router for frontend and API routes
- React 19.1.0 - UI component library
- Tailwind CSS 4 - Utility-first CSS framework with PostCSS 4 integration

**State Management:**
- Zustand 5.0.8 - Client-side state management (located in `src/stores/`)

**UI & Visualization:**
- Recharts 3.3.0 - Data visualization and charting
- ReactFlow 11.11.4 / XYFlow 12.9.2 - Workflow diagram rendering in `src/components/automation/`
- Framer Motion 12.23.25 - Animation library
- Headless UI 2.2.9 - Unstyled accessible components
- Heroicons 2.2.0 - SVG icon library
- Lucide React 0.544.0 - Icon library

**Testing:**
- Jest 29.7.0 - Unit and integration testing
- Playwright 1.47.0 - E2E browser testing with real-world scenarios
- @testing-library/react 14.3.1 - React component testing utilities
- @testing-library/user-event 14.5.2 - User interaction simulation
- @swc/jest 0.2.39 - Fast Rust-based JavaScript transpiler for tests
- nock 13.5.5 - HTTP request mocking for testing

**Build & Development:**
- Turbopack (next dev --turbopack flag support) - Next.js's Rust-based bundler for faster dev builds
- Webpack (fallback) - Standard build tool when not using Turbopack
- @swc/core 1.13.5 - Rust-based transpiler alternative to Babel
- ESLint 9 - Code quality and standards enforcement
- Prettier 3.1.1 - Code formatter with prettier-plugin-tailwindcss
- TypeScript 5.x - Type checking and compilation
- Lighthouse 12.2.1 - Performance auditing
- @lhci/cli 0.13.0 - Lighthouse CI integration
- @next/bundle-analyzer 15.5.4 - Bundle size analysis

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.58.0 - PostgreSQL database client and real-time subscriptions
- @supabase/ssr 0.7.0 - Server-side rendering utilities for Supabase cookies
- stripe 18.5.0 - Stripe payment processing backend
- @stripe/stripe-js 7.9.0 - Stripe frontend SDK for payments

**Infrastructure & Queue:**
- bullmq 5.61.0 - Job queue system for async processing (bulk messaging, imports, notifications)
- ioredis 5.8.1 - Redis client for BullMQ queue storage and caching
- @upstash/redis 1.35.5 - Upstash Redis client for serverless environments

**Security & Authentication:**
- bcryptjs 3.0.2 - Password hashing
- jose 6.1.0 - JSON Web Tokens (JWT) for session management
- @boxyhq/saml-jackson 1.52.2 - SAML and OAuth SSO integration
- openid-client 6.8.1 - OpenID Connect client
- @casl/ability 6.7.3 - Role-based access control (RBAC) policy engine
- xml-crypto 6.1.2 - XML digital signatures for SAML
- xml2js 0.6.2 - XML parsing for SAML responses
- dompurify 3.3.0 - HTML sanitization to prevent XSS attacks

**Email & Communication:**
- resend 6.1.0 - Email delivery service for transactional emails
- @react-email/render 1.3.1 - React email template rendering

**Cloud & Encryption:**
- @aws-sdk/client-kms 3.908.0 - AWS Key Management Service for encryption
- @aws-sdk/credential-providers 3.908.0 - AWS credential handling

**Monitoring & Observability:**
- @opentelemetry/sdk-node 0.45.1 - Distributed tracing SDK
- @opentelemetry/auto-instrumentations-node 0.40.3 - Automatic instrumentation
- @opentelemetry/exporter-jaeger 1.30.1 - Jaeger exporter for traces
- @opentelemetry/exporter-trace-otlp-http 0.45.1 - OTLP HTTP exporter
- @opentelemetry/instrumentation-express 0.34.1 - Express middleware instrumentation
- @opentelemetry/instrumentation-http 0.45.1 - HTTP request/response instrumentation
- @opentelemetry/sdk-metrics 1.30.1 - Metrics collection
- @sentry/nextjs 8.40.0 - Error tracking and performance monitoring (via dynamic import)

**Utilities:**
- uuid 9.0.1 - Unique identifier generation
- zod 3.22.4 - TypeScript-first schema validation
- libphonenumber-js 1.12.26 - Phone number parsing and formatting
- qrcode 1.5.4 - QR code generation
- next-intl 4.3.9 - Internationalization (i18n) support
- otplib 12.0.1 - One-time password generation for MFA
- clsx 2.1.1 - Conditional CSS class management
- tailwind-merge 3.4.0 - Tailwind class merging for better specificity

**Development Utilities:**
- cross-env 7.0.3 - Cross-platform environment variable support
- husky 8.0.3 - Git hooks automation
- lint-staged 15.2.0 - Run linters on staged files
- critters 0.0.23 - Critical CSS extraction
- web-vitals 4.2.4 - Core Web Vitals measurement

## Configuration

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase PostgreSQL endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key for client
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server operations (bypasses RLS)
- `WHATSAPP_ACCESS_TOKEN` - Meta Business API token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business Phone ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Webhook verification token
- `WHATSAPP_API_VERSION` - Default: v18.0
- `STRIPE_SECRET_KEY` - Stripe backend API key
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` - Stripe frontend publishable key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_*_PRICE_ID` - Product price IDs (STARTER, PROFESSIONAL, ENTERPRISE)
- `RESEND_API_KEY` - Email delivery API key
- `RESEND_FROM_EMAIL` - From email address
- `NEXT_PUBLIC_APP_URL` - Application URL for OAuth redirects
- `NEXTAUTH_SECRET` - Session encryption key (256-bit)
- `NEXTAUTH_URL` - NextAuth callback URL
- `CRON_SECRET` - Cron job authorization token
- `OPENROUTER_API_KEY` - OpenRouter AI API key (optional)
- `NODE_ENV` - development | production

**Build Configuration:**
- `tsconfig.json` - TypeScript compiler options with strict: false (TODO: enable strict mode)
- `next.config.ts` - Security headers (HSTS, CSP), image optimization, experimental features
- `jest.config.js` - Jest test configuration with jsdom environment
- `.prettierrc` - Code formatter configuration
- `eslint.config.mjs` - ESLint configuration (ignores during builds in next.config.ts)

## Platform Requirements

**Development:**
- Node.js 20.x or higher
- npm 10.x or higher
- Supabase CLI for local database development
- Git for version control

**Production:**
- Deployment target: Vercel (configured in next.config.ts with `process.env.VERCEL`)
- Alternative: Any Node.js-compatible platform (Docker support in Dockerfile and docker-compose files)
- PostgreSQL database (via Supabase)
- Redis instance (BullMQ queue backend)
- Environment variables from .env.local or deployment platform secrets

**Browser Support:**
- Modern browsers with ES2017 compatibility
- Image formats: WebP, AVIF preferred; JPEG/PNG fallback

---

*Stack analysis: 2026-01-23*
