# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ADSapp** is a Multi-Tenant WhatsApp Business Inbox SaaS platform that enables businesses to manage WhatsApp communication professionally. The platform provides inbox management, team collaboration, automation, analytics, and subscription billing.

**Tech Stack:** Next.js, TypeScript, Supabase, Tailwind CSS, Stripe
**Deployment:** Vercel + Supabase
**Current Status:** Active development with Next.js implementation, Supabase integration, and basic UI components

## Project Architecture

The project implements a multi-tenant SaaS architecture with:

- **Frontend:** Next.js application with TypeScript and Tailwind CSS for the multi-tenant inbox interface
- **Backend:** Supabase for database, authentication, and real-time features
- **Integrations:** WhatsApp Business Cloud API for message handling
- **Payments:** Stripe for subscription management
- **Deployment:** Vercel for hosting with edge functions for API routes

Key architectural decisions documented in `prd.md`:
- Multi-tenant SaaS architecture with tenant isolation
- Real-time message synchronization via WhatsApp Business API
- Subscription-based billing model
- Scalable infrastructure on Vercel + Supabase

## Development Environment

Key development commands:

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest test suite
npm run test:watch   # Run Jest in watch mode
npm run test:coverage # Run tests with coverage report
```

### Database Commands

```bash
# Apply Supabase migrations
npx supabase db reset

# Manual schema application
psql -h your-supabase-host -d postgres -f supabase/migrations/001_initial_schema.sql

# Alternative database setup scripts
node setup-database.js      # Main database setup
node setup-db-simple.js     # Simplified setup
node apply-schema-direct.js # Direct schema application
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page with features showcase
│   ├── admin-setup/       # Admin account creation for testing
│   └── auth/              # Authentication pages (planned)
├── components/            # Reusable UI components (planned)
├── lib/                   # Utility libraries (planned)
└── types/                 # TypeScript definitions (planned)

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Database schema

prisma/
└── schema.prisma          # Prisma schema (alternative to Supabase)
```

### Testing Configuration

- **Framework:** Jest with Next.js integration
- **Environment:** jsdom for React component testing
- **Setup:** `jest.setup.js` for test configuration
- **Path Mapping:** `@/*` maps to `src/*`
- **Coverage:** Configured for `src/**/*.{ts,tsx}` files

## Windsurf AI Agents

This project has 9 specialized AI agents installed in `.windsurf/agents/` for different development aspects:

1. **Lead Developer** - Architecture decisions and project planning
2. **Backend API Developer** - API development and database integration
3. **Frontend Developer** - React/UI development with Next.js
4. **Database Architect** - Supabase schema design and optimization
5. **Testing & QA** - Test automation and quality assurance
6. **DevOps & Infrastructure** - Deployment and cloud infrastructure
7. **Code Review** - Code quality and best practices
8. **Documentation** - Technical documentation
9. **Security** - Security auditing and OWASP compliance

Use `/agent` in Windsurf IDE to access these specialized agents. Agent combinations are defined in `.windsurf/agents/agents.json` for complex features.

## Project Documents

- `prd.md` - Complete Product Requirements Document with features, architecture, and business requirements
- `website-prd.md` - Marketing website requirements and specifications
- `.windsurf/agents/README.md` - Guide for using the installed AI agents

## Current Development Phase

The project has a working Next.js foundation with:

### ✅ Completed
- Next.js project setup with TypeScript and Tailwind CSS
- Landing page with feature showcase (`src/app/page.tsx`)
- Admin setup page for testing (`src/app/admin-setup/`)
- Database schema design (`supabase/migrations/001_initial_schema.sql`)
- Prisma schema as alternative ORM option
- Jest testing configuration
- ESLint and TypeScript configuration

### 🚧 In Progress
- Multi-tenant authentication system
- WhatsApp Business API integration
- Core inbox UI components
- Subscription billing with Stripe

### 📋 Next Steps
1. Complete authentication pages (`/auth/signin`, `/auth/signup`)
2. Dashboard implementation (`/dashboard`, `/dashboard/inbox`)
3. WhatsApp Business API webhook handling
4. Real-time message synchronization
5. Team collaboration features

When implementing features, consult the PRD for detailed requirements and use the appropriate AI agents for specialized guidance.