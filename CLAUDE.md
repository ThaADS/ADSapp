# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ADSapp** is a Multi-Tenant WhatsApp Business Inbox SaaS platform that enables businesses to manage WhatsApp communication professionally. The platform provides inbox management, team collaboration, automation, analytics, and subscription billing.

**Tech Stack:** Next.js, TypeScript, Supabase, Tailwind CSS, Stripe
**Deployment:** Vercel + Supabase
**Current Status:** Early planning phase with project requirements documentation

## Project Architecture

This is currently a greenfield project in early planning stages. The core architecture will be:

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

Since this is a new project, standard Next.js commands will apply once the codebase is initialized:

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm test             # Run test suite
```

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

The project is in the initial planning and setup phase. Next steps typically involve:

1. Project initialization with Next.js and TypeScript
2. Supabase project setup and schema design
3. WhatsApp Business API integration setup
4. Authentication and multi-tenancy implementation
5. Core inbox UI development

When implementing features, consult the PRD for detailed requirements and use the appropriate AI agents for specialized guidance.