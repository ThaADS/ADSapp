# Technology Stack

**Generated:** 2026-01-21

## Runtime & Language

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 20.x | LTS version |
| TypeScript | ^5.x | `strict: false`, `noImplicitAny: false` |
| React | 19.1.0 | Latest React with RSC |
| Next.js | ^16.0.7 | App Router, Turbopack support |

## Framework Configuration

### Next.js (`next.config.ts`)
- **App Router** enabled (not Pages Router)
- **Turbopack** support via `npm run dev:turbo`
- TypeScript/ESLint errors ignored during build
- Path alias: `@/*` → `./src/*`

### TypeScript (`tsconfig.json`)
```json
{
  "strict": false,
  "noImplicitAny": false,
  "moduleResolution": "bundler",
  "jsx": "react-jsx"
}
```
**Note:** Strict mode disabled - technical debt item.

## Core Dependencies

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.1.0 | UI framework |
| `tailwindcss` | ^4 | CSS framework |
| `@headlessui/react` | ^2.2.9 | Accessible UI components |
| `@heroicons/react` | ^2.2.0 | Icon library |
| `lucide-react` | ^0.544.0 | Additional icons |
| `framer-motion` | ^12.23.25 | Animations |
| `recharts` | ^3.3.0 | Charts/analytics |
| `@xyflow/react` | ^12.9.2 | Workflow canvas |
| `reactflow` | ^11.11.4 | Flow diagrams |

### Backend/Database
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.58.0 | Database client |
| `@supabase/ssr` | ^0.7.0 | Server-side rendering support |
| `ioredis` | ^5.8.1 | Redis client |
| `@upstash/redis` | ^1.35.5 | Serverless Redis |
| `bullmq` | ^5.61.0 | Job queue |

### State Management
| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | ^5.0.8 | Client state management |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `@boxyhq/saml-jackson` | ^1.52.2 | SAML 2.0 SSO |
| `openid-client` | ^6.8.1 | OAuth 2.0/OIDC |
| `jose` | ^6.1.0 | JWT handling |
| `bcryptjs` | ^3.0.2 | Password hashing |
| `otplib` | ^12.0.1 | 2FA/OTP |
| `@aws-sdk/client-kms` | ^3.908.0 | Key management |
| `zod` | ^3.22.4 | Schema validation |
| `dompurify` | ^3.3.0 | XSS sanitization |

### External Services
| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | ^18.5.0 | Payment processing |
| `@stripe/stripe-js` | ^7.9.0 | Client-side Stripe |
| `resend` | ^6.1.0 | Email service |
| `qrcode` | ^1.5.4 | QR generation |
| `libphonenumber-js` | ^1.12.26 | Phone validation |

### Observability
| Package | Version | Purpose |
|---------|---------|---------|
| `@opentelemetry/api` | ^1.9.0 | Tracing API |
| `@opentelemetry/sdk-node` | ^0.45.1 | Node.js SDK |
| `@opentelemetry/exporter-jaeger` | ^1.30.1 | Jaeger export |
| `@sentry/nextjs` | ^8.40.0 | Error tracking |

### Internationalization
| Package | Version | Purpose |
|---------|---------|---------|
| `next-intl` | ^4.3.9 | i18n support |

## Development Dependencies

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Unit testing |
| `@playwright/test` | ^1.47.0 | E2E testing |
| `@testing-library/react` | ^14.3.1 | Component testing |
| `@testing-library/jest-dom` | ^6.4.2 | DOM matchers |
| `nock` | ^13.5.5 | HTTP mocking |
| `supertest` | ^7.0.0 | API testing |

### Quality
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9 | Linting |
| `prettier` | ^3.1.1 | Formatting |
| `husky` | ^8.0.3 | Git hooks |
| `lint-staged` | ^15.2.0 | Staged file linting |
| `@lhci/cli` | ^0.13.0 | Lighthouse CI |

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| `@swc/core` | ^1.13.5 | Fast compilation |
| `@swc/jest` | ^0.2.39 | Jest transformer |
| `@next/bundle-analyzer` | ^15.5.4 | Bundle analysis |
| `critters` | ^0.0.23 | Critical CSS |

## Infrastructure

### Database
- **Supabase PostgreSQL** with Row Level Security (RLS)
- **Redis** via Upstash (serverless) or ioredis

### Deployment
- **Docker** support with `Dockerfile` and `docker-compose.yml`
- Next.js standalone output

### CI/CD
- Husky pre-commit hooks
- Jest CI mode (`npm run test:ci`)
- Lighthouse performance testing

## Key Scripts

```bash
# Development
npm run dev              # Standard dev server
npm run dev:turbo        # Turbopack (faster)

# Build
npm run build            # Production build
npm run analyze          # Bundle analyzer

# Testing
npm run test             # Jest unit tests
npm run test:e2e         # Playwright E2E
npm run test:coverage    # Coverage report

# Quality
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run format           # Prettier

# Database
npm run migration:generate
npm run migration:apply
```

---
*Stack mapped: 2026-01-21*
