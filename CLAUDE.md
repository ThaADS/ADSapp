# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the ADSapp codebase - a production-ready Multi-Tenant WhatsApp Business Inbox SaaS platform.

## Project Overview

**ADSapp** is an enterprise-grade Multi-Tenant WhatsApp Business Inbox SaaS platform that enables businesses to manage WhatsApp communication professionally. The platform provides comprehensive inbox management, team collaboration, intelligent automation, advanced analytics, and subscription billing.

**Tech Stack:** Next.js 15, TypeScript 5, Supabase, Tailwind CSS 4, Stripe
**Deployment:** Vercel + Supabase
**Current Status:** Production-ready with comprehensive feature implementation and enterprise-grade architecture

## Production Implementation Status

### ✅ Fully Implemented Features

#### Core Architecture
- **Multi-tenant SaaS architecture** with Row Level Security (RLS)
- **Next.js 15 App Router** with TypeScript and Turbopack
- **Supabase integration** with real-time subscriptions
- **Stripe billing system** with webhook handling
- **WhatsApp Business API** integration with webhook processing
- **Comprehensive API routes** for all business logic
- **Enterprise security** with OWASP compliance

#### User Interface & Experience
- **Admin dashboard** (`/src/app/admin/`) - Super admin interface
- **Authentication system** (`/src/app/auth/`) - Sign in, sign up, password reset
- **Main dashboard** (`/src/app/dashboard/`) - User workspace
- **Contact management** (`/src/app/dashboard/contacts/`) - Contact organization
- **Template management** (`/src/app/dashboard/templates/`) - Message templates
- **Automation workflows** (`/src/app/dashboard/automation/`) - Business rules
- **Settings & profile** (`/src/app/dashboard/settings/`) - User preferences
- **Mobile-responsive design** with progressive enhancement

#### Backend Services
- **Authentication APIs** (`/src/app/api/auth/`) - Complete auth flow
- **Admin management** (`/src/app/api/admin/`) - Organization & user management
- **Analytics & reporting** (`/src/app/api/analytics/`) - Comprehensive metrics
- **Billing integration** (`/src/app/api/billing/`) - Stripe subscription management
- **Bulk operations** (`/src/app/api/bulk/`) - Mass data processing
- **Contact management** (`/src/app/api/contacts/`) - Contact CRUD operations
- **Health monitoring** (`/src/app/api/health/`) - System health checks
- **Media handling** (`/src/app/api/media/`) - File upload/management
- **Template management** (`/src/app/api/templates/`) - Message templates
- **Tenant configuration** (`/src/app/api/tenant/`) - Multi-tenant settings
- **Webhook processing** (`/src/app/api/webhooks/`) - WhatsApp & Stripe webhooks

#### Component Library
- **Admin components** (`/src/components/admin/`) - Administrative interfaces
- **Analytics dashboard** (`/src/components/analytics/`) - Data visualization
- **Authentication UI** (`/src/components/auth/`) - Login/signup forms
- **Automation components** (`/src/components/automation/`) - Workflow builders
- **Contact management** (`/src/components/contacts/`) - Contact interfaces
- **Dashboard components** (`/src/components/dashboard/`) - Main UI elements
- **Messaging interface** (`/src/components/messaging/`) - Chat components
- **Mobile components** (`/src/components/mobile/`) - Mobile-optimized UI
- **Search functionality** (`/src/components/search/`) - Advanced search
- **Template components** (`/src/components/templates/`) - Template management
- **Accessibility features** (`/src/components/accessibility/`) - A11y compliance

#### Business Logic Libraries
- **API middleware** (`/src/lib/api-middleware.ts`) - Request/response handling
- **API utilities** (`/src/lib/api-utils.ts`) - Common API functions
- **Billing system** (`/src/lib/billing/`) - Stripe integration
- **Bulk operations** (`/src/lib/bulk-operations/`) - Mass processing
- **Export utilities** (`/src/lib/export/`) - Data export functionality
- **Media processing** (`/src/lib/media/`) - File handling
- **Monitoring** (`/src/lib/monitoring.ts`) - Application monitoring
- **Performance optimization** (`/src/lib/performance/`) - Speed optimizations
- **Supabase client** (`/src/lib/supabase/`) - Database interactions
- **Tenant branding** (`/src/lib/tenant-branding.ts`) - Multi-tenant theming
- **WebSocket handling** (`/src/lib/websocket/`) - Real-time communication
- **WhatsApp integration** (`/src/lib/whatsapp/`) - WhatsApp API client

#### Testing & Quality Assurance
- **Jest testing suite** with comprehensive unit tests
- **Playwright E2E tests** for critical user journeys
- **TypeScript strict mode** with zero tolerance for type errors
- **ESLint & Prettier** for code quality and formatting
- **Security scanning** with automated vulnerability detection
- **Performance testing** with Lighthouse CI
- **Code coverage** reporting with >80% target

### 🎯 Production Architecture

```
ADSapp Production Architecture

Frontend (Next.js 15 + Vercel)
├── App Router with TypeScript
├── Tailwind CSS 4 styling
├── React 19 with concurrent features
├── Progressive Web App (PWA) support
└── Global CDN distribution

Backend Services
├── Next.js API Routes (Serverless)
├── Supabase PostgreSQL (Managed)
├── Row Level Security (RLS)
├── Real-time subscriptions
└── Edge functions for performance

External Integrations
├── WhatsApp Business Cloud API
├── Stripe payment processing
├── Resend email delivery
├── Webhook processing
└── Media storage & CDN

Security & Compliance
├── OWASP Top 10 compliance
├── GDPR data protection
├── SOC 2 Type II controls
├── JWT authentication
├── HTTPS everywhere
└── Audit logging
```

## Development Environment

### Production-Ready Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Production build with optimization
npm run start            # Start production server
npm run analyze          # Bundle analysis for optimization

# Code Quality
npm run lint             # ESLint code quality checks
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # TypeScript type checking
npm run format           # Prettier code formatting
npm run format:check     # Check code formatting

# Testing Suite
npm run test             # Jest unit tests
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Coverage reporting
npm run test:ci          # CI/CD testing
npm run test:e2e         # Playwright end-to-end tests
npm run test:e2e:ui      # E2E tests with UI
npm run test:security    # Security audit
npm run test:performance # Performance testing

# Database Operations
npm run migration:generate  # Generate new migration
npm run migration:apply     # Apply pending migrations

# Deployment & Infrastructure
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:dev       # Development with Docker
npm run docker:prod      # Production Docker setup
```

### Environment Configuration

#### Development Environment
```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="ADSapp"
NODE_ENV=development

# Authentication
NEXTAUTH_SECRET=your-development-secret-key

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=EAAb...your-access-token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_test_...your-public-key
STRIPE_SECRET_KEY=sk_test_...your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret

# Email Service (Resend)
RESEND_API_KEY=re_...your-resend-api-key

# Monitoring & Analytics
SENTRY_DSN=https://your-sentry-dsn
VERCEL_ANALYTICS_ID=your-analytics-id
```

#### Production Environment
```env
# Production Application Settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Enhanced Security
NEXTAUTH_SECRET=your-256-bit-production-secret-key

# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Production WhatsApp API
WHATSAPP_ACCESS_TOKEN=your-production-access-token
WHATSAPP_PHONE_NUMBER_ID=your-production-phone-id

# Production Stripe
STRIPE_PUBLIC_KEY=pk_live_...your-live-public-key
STRIPE_SECRET_KEY=sk_live_...your-live-secret-key

# Production Monitoring
SENTRY_DSN=your-production-sentry-dsn
```

### Database Schema & Operations

#### Core Database Tables
```sql
-- Multi-tenant Organizations
organizations (
  id uuid primary key,
  name text not null,
  subdomain text unique,
  settings jsonb,
  subscription_plan text,
  created_at timestamptz,
  updated_at timestamptz
);

-- User Profiles
profiles (
  id uuid primary key references auth.users,
  organization_id uuid references organizations,
  email text not null,
  full_name text,
  role text not null,
  permissions jsonb,
  last_seen timestamptz
);

-- WhatsApp Contacts
contacts (
  id uuid primary key,
  organization_id uuid references organizations,
  whatsapp_id text not null,
  phone_number text,
  name text,
  profile_data jsonb,
  created_at timestamptz
);

-- Conversation Management
conversations (
  id uuid primary key,
  organization_id uuid references organizations,
  contact_id uuid references contacts,
  status text default 'open',
  assigned_agent_id uuid references profiles,
  metadata jsonb,
  last_message_at timestamptz
);

-- Message Storage
messages (
  id uuid primary key,
  conversation_id uuid references conversations,
  sender_id uuid references profiles,
  content text,
  message_type text,
  whatsapp_message_id text,
  metadata jsonb,
  timestamp timestamptz
);

-- Business Templates
message_templates (
  id uuid primary key,
  organization_id uuid references organizations,
  name text not null,
  content text not null,
  category text,
  variables jsonb,
  created_by uuid references profiles
);

-- Automation Rules
automation_rules (
  id uuid primary key,
  organization_id uuid references organizations,
  name text not null,
  trigger_conditions jsonb,
  actions jsonb,
  is_active boolean default true,
  created_by uuid references profiles
);
```

#### Row Level Security (RLS) Policies
```sql
-- Ensure tenant isolation for all tables
CREATE POLICY tenant_isolation ON organizations
FOR ALL USING (id IN (
  SELECT organization_id FROM profiles
  WHERE id = auth.uid()
));

-- Profile access control
CREATE POLICY profile_access ON profiles
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
  )
);

-- Contact management
CREATE POLICY contact_access ON contacts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
  )
);
```

### API Endpoint Documentation

#### Authentication Endpoints
- `POST /api/auth/signin` - User authentication with email/password
- `POST /api/auth/signup` - New user registration with organization
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

#### Core Business Endpoints
- `GET /api/conversations` - List conversations with filtering
- `GET /api/conversations/[id]/messages` - Get conversation messages
- `POST /api/conversations/[id]/messages` - Send WhatsApp message
- `GET /api/contacts` - List contacts with search/filtering
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/[id]` - Update contact information
- `DELETE /api/contacts/[id]` - Delete contact (soft delete)

#### Template Management
- `GET /api/templates` - List message templates
- `POST /api/templates` - Create new template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

#### Analytics & Reporting
- `GET /api/analytics/dashboard` - Dashboard metrics and KPIs
- `GET /api/analytics/reports` - Generate custom reports
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/export` - Export data in various formats

#### Admin Management (Super Admin Only)
- `GET /api/admin/dashboard` - Admin dashboard statistics
- `GET /api/admin/organizations` - List all organizations
- `POST /api/admin/organizations` - Create new organization
- `PUT /api/admin/organizations/[id]` - Update organization
- `POST /api/admin/organizations/[id]/suspend` - Suspend organization
- `GET /api/admin/users` - List all users across organizations
- `GET /api/admin/audit-logs` - View system audit logs

#### Health & Monitoring
- `GET /api/health` - Application health status
- `GET /api/health/db` - Database connectivity check
- `GET /api/health/stripe` - Stripe service status
- `GET /api/health/whatsapp` - WhatsApp API connectivity

### Component Architecture

#### Reusable UI Components
```typescript
// Example component structure
/src/components/
├── ui/                    # Base UI components
│   ├── Button.tsx        # Reusable button component
│   ├── Input.tsx         # Form input component
│   ├── Modal.tsx         # Modal dialog component
│   └── Table.tsx         # Data table component
├── forms/                # Form components
│   ├── ContactForm.tsx   # Contact creation/editing
│   ├── TemplateForm.tsx  # Template creation/editing
│   └── SettingsForm.tsx  # Settings configuration
├── layouts/              # Layout components
│   ├── DashboardLayout.tsx
│   ├── AuthLayout.tsx
│   └── AdminLayout.tsx
└── features/             # Feature-specific components
    ├── messaging/        # Chat interface components
    ├── analytics/        # Analytics dashboard
    └── automation/       # Workflow builder
```

#### TypeScript Type Definitions
```typescript
// /src/types/database.ts
export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  settings: OrganizationSettings;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions: UserPermissions;
  last_seen: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  whatsapp_id: string;
  phone_number: string;
  name: string;
  profile_data: ContactProfile;
  created_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  status: ConversationStatus;
  assigned_agent_id?: string;
  metadata: ConversationMetadata;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  content: string;
  message_type: MessageType;
  whatsapp_message_id?: string;
  metadata: MessageMetadata;
  timestamp: string;
}
```

### Windsurf AI Agents Integration

The project includes 9 specialized AI agents in `.windsurf/agents/` for efficient development:

1. **Lead Developer** (`lead-developer.md`) - Architecture decisions and project planning
2. **Backend API Developer** (`backend-api-developer.md`) - API development and database integration
3. **Frontend Developer** (`frontend-developer.md`) - React/UI development with Next.js
4. **Database Architect** (`database-architect.md`) - Supabase schema design and optimization
5. **Testing & QA** (`testing-qa.md`) - Test automation and quality assurance
6. **DevOps & Infrastructure** (`devops-infrastructure.md`) - Deployment and cloud infrastructure
7. **Code Review** (`code-review.md`) - Code quality and best practices
8. **Documentation** (`documentation.md`) - Technical documentation
9. **Security** (`security.md`) - Security auditing and OWASP compliance

#### Using AI Agents
```bash
# Access agents in Windsurf IDE
/agent lead-developer    # For architecture decisions
/agent backend-api      # For API development
/agent frontend         # For UI/UX development
/agent database         # For schema changes
/agent testing          # For test implementation
/agent devops           # For deployment issues
/agent code-review      # For code quality
/agent documentation    # For doc updates
/agent security         # For security audits
```

### Production Deployment

#### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Configure environment variables
vercel env add PRODUCTION_VAR production
```

#### Docker Deployment
```bash
# Build production image
docker build -t adsapp:latest .

# Run with environment file
docker run -p 3000:3000 --env-file .env.production adsapp:latest

# Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Database Migration
```bash
# Apply Supabase migrations
npx supabase db reset --linked

# Manual migration application
psql -h your-supabase-host -d postgres -f supabase/migrations/001_initial_schema.sql
```

### Development Guidelines

#### Code Quality Standards
- **TypeScript Strict Mode** - Zero tolerance for type errors
- **ESLint Configuration** - Enforced code quality rules
- **Prettier Formatting** - Consistent code formatting
- **Conventional Commits** - Structured commit messages
- **Component-Driven Development** - Reusable, testable components
- **API-First Design** - Well-documented REST APIs

#### Testing Strategy
- **Unit Tests** - Jest with React Testing Library
- **Integration Tests** - API endpoint testing
- **End-to-End Tests** - Playwright for user journeys
- **Visual Regression Tests** - Component visual testing
- **Performance Tests** - Lighthouse CI for metrics
- **Security Tests** - Automated vulnerability scanning

#### Security Implementation
- **OWASP Top 10 Compliance** - Protection against common vulnerabilities
- **Row Level Security** - Database-level access control
- **JWT Authentication** - Secure session management
- **Input Validation** - Comprehensive data sanitization
- **Rate Limiting** - API abuse protection
- **Audit Logging** - Complete activity tracking

## Production Monitoring

### Health Checks
```typescript
// Health check endpoints
GET /api/health           // Overall application health
GET /api/health/db        // Database connectivity
GET /api/health/stripe    // Payment system status
GET /api/health/whatsapp  // WhatsApp API status
```

### Performance Monitoring
- **Vercel Analytics** - User behavior and performance metrics
- **Sentry Error Tracking** - Real-time error monitoring and alerting
- **Custom Metrics** - Business KPIs and technical performance indicators
- **Database Monitoring** - Query performance and connection pooling
- **API Response Times** - Endpoint performance tracking

### Business Intelligence
- **User Analytics** - Message volume, response times, engagement
- **Revenue Metrics** - Subscription growth, churn rate, MRR tracking
- **System Metrics** - Uptime, error rates, performance benchmarks
- **WhatsApp Metrics** - Delivery rates, read rates, conversion tracking

## Current Development Phase

### ✅ Production-Ready Features
- Complete multi-tenant SaaS architecture with RLS
- WhatsApp Business API integration with webhook handling
- Stripe subscription billing with webhook processing
- Comprehensive admin dashboard for super admin operations
- Real-time messaging interface with team collaboration
- Advanced analytics and reporting system
- Message template management with variables
- Automation workflow builder with rule engine
- Contact management with search and filtering
- User authentication with role-based permissions
- Mobile-responsive design with PWA support
- Enterprise security with OWASP compliance
- Comprehensive testing suite with CI/CD pipeline
- Production deployment infrastructure

### 🎯 Current Focus Areas
- **Performance Optimization** - Enhanced caching and database optimization
- **Advanced Analytics** - Machine learning insights and predictive analytics
- **Internationalization** - Multi-language support for global deployment
- **Advanced Automation** - AI-powered response suggestions and smart routing
- **Enterprise Features** - Advanced permissions, SSO integration, audit trails
- **API Documentation** - Interactive API documentation with OpenAPI/Swagger
- **Mobile App** - Native mobile applications for iOS and Android

### 📋 Maintenance & Operations
- **Regular Security Audits** - Monthly security assessments and updates
- **Performance Monitoring** - Continuous monitoring with alerting
- **Database Optimization** - Regular index optimization and query analysis
- **Dependency Updates** - Regular updates for security and performance
- **Backup & Recovery** - Automated backup testing and disaster recovery
- **Documentation Updates** - Keep all documentation current with changes

## Key Commands for Claude Code

When working on ADSapp, use these patterns:

### For Feature Development
```bash
# Start with the appropriate AI agent
/agent frontend    # For UI components
/agent backend-api # For API endpoints
/agent database    # For schema changes

# Run tests during development
npm run test:watch

# Check types and linting
npm run type-check && npm run lint
```

### For Bug Fixes
```bash
# Analyze the issue
npm run test:coverage  # Check test coverage
npm run lint          # Check for code issues

# Debug with logging
DEBUG=* npm run dev   # Verbose logging

# Test the fix
npm run test:ci       # Complete test suite
```

### For Documentation Updates
```bash
# Use documentation agent
/agent documentation

# Validate markdown
npm run format:check

# Build and test documentation
npm run build
```

## Best Practices for Claude Code

1. **Always read the existing code** before making changes to understand the current implementation
2. **Use TypeScript types** consistently and follow the existing type definitions
3. **Follow the established patterns** for API routes, components, and database operations
4. **Write tests** for new features and bug fixes
5. **Update documentation** when making significant changes
6. **Use the AI agents** for specialized guidance on different aspects of development
7. **Maintain security standards** and follow OWASP guidelines
8. **Consider multi-tenancy** in all data operations and UI components
9. **Test thoroughly** before marking tasks as complete
10. **Keep performance in mind** for all implementations

## File Structure Summary

```
/src/app/                    # Next.js 15 App Router
├── admin/                  # Super admin interface (production-ready)
├── api/                    # API routes (comprehensive implementation)
├── auth/                   # Authentication pages (complete)
├── dashboard/              # Main application UI (full implementation)
└── onboarding/            # User onboarding flow

/src/components/            # Reusable UI components (extensive library)
├── admin/                 # Admin-specific components
├── analytics/             # Analytics dashboard components
├── auth/                  # Authentication UI components
├── automation/            # Workflow automation components
├── contacts/              # Contact management components
├── dashboard/             # Main dashboard components
├── messaging/             # Chat interface components
└── templates/             # Template management components

/src/lib/                   # Utility libraries (production-ready)
├── api-middleware.ts      # Request/response handling
├── api-utils.ts          # Common API utilities
├── billing/              # Stripe integration
├── bulk-operations/      # Mass data processing
├── export/               # Data export functionality
├── media/                # File and media handling
├── monitoring.ts         # Application monitoring
├── performance/          # Performance optimization
├── supabase/             # Database client and utilities
├── tenant-branding.ts    # Multi-tenant theming
├── websocket/            # Real-time communication
└── whatsapp/             # WhatsApp API integration

/src/types/                # TypeScript definitions (comprehensive)
└── database.ts           # Database type definitions

/tests/                    # Testing suites (comprehensive)
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── e2e/                  # End-to-end tests
```

When implementing features, consult this guide for the current implementation status and use the appropriate AI agents for specialized guidance. Always maintain the high code quality standards and security practices established in the codebase.