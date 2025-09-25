# ADSapp - WhatsApp Business Inbox SaaS

> **Multi-Tenant WhatsApp Business Inbox SaaS Platform**
>
> Een complete SaaS-oplossing voor bedrijven om hun WhatsApp Business communicatie professioneel te beheren met multi-tenant architectuur, real-time messaging, automatisering en subscription billing.

## 🎯 Project Overview

ADSapp is een moderne, schaalbare WhatsApp Business Inbox SaaS-applicatie gebouwd met Next.js, TypeScript, Supabase en Stripe. Het platform biedt bedrijven een professionele interface voor het beheren van WhatsApp-communicatie met features zoals team samenwerking, automatisering, analytics en subscription management.

### ✨ Core Features

- **🔐 Multi-tenant Architecture** - Secure tenant isolation met Row Level Security
- **💬 WhatsApp Business Integration** - Complete integratie met WhatsApp Business Cloud API
- **📥 Real-time Inbox** - Live message synchronisatie en team collaboration
- **🤖 Smart Automation** - Regel-gebaseerde automatisering en quick replies
- **📊 Analytics & Reporting** - Uitgebreide metrics en performance tracking
- **💳 Subscription Billing** - Stripe-powered subscription management
- **👥 Team Management** - Multi-level user roles en permissions
- **📱 Responsive Design** - Optimized voor desktop en mobile

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework met App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - Modern state management

### Backend
- **Next.js API Routes** - Serverless backend functions
- **Supabase** - PostgreSQL database met real-time features
- **Row Level Security** - Database-level multi-tenancy

### Integrations
- **WhatsApp Business Cloud API** - Message sending en receiving
- **Stripe** - Subscription management en payments
- **Webhook handling** - Real-time data synchronization

### Infrastructure
- **Vercel** - Hosting en deployment platform
- **Supabase** - Database, auth, en real-time infrastructure
- **Edge Functions** - Global performance optimization

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm of yarn
- Supabase account
- WhatsApp Business account met Cloud API access
- Stripe account

### 1. Project Setup

```bash
# Clone repository
git clone <repository-url>
cd adsapp

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
```

### 2. Environment Configuration

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Stripe
STRIPE_PUBLIC_KEY=pk_test_your-public-key
STRIPE_SECRET_KEY=sk_test_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 3. Database Setup

```bash
# Run Supabase migration
npx supabase db reset

# Or manually apply the schema
psql -h your-supabase-host -d postgres -f supabase/migrations/001_initial_schema.sql
```

### 4. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API endpoints
│   │   ├── billing/        # Stripe billing APIs
│   │   ├── conversations/  # Chat management APIs
│   │   └── webhooks/       # Webhook handlers
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application UI
│   └── onboarding/        # Setup flow
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── billing/          # Subscription management UI
│   ├── dashboard/        # Dashboard components
│   └── inbox/            # Chat interface
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication helpers
│   ├── stripe/          # Stripe integration
│   ├── supabase/        # Database client
│   └── whatsapp/        # WhatsApp API client
├── types/               # TypeScript type definitions
└── hooks/              # Custom React hooks

supabase/
├── config.toml         # Supabase configuration
└── migrations/         # Database migrations

.windsurf/agents/       # AI Development agents
├── lead-developer.md   # Architecture & planning
├── backend-api-developer.md
├── frontend-developer.md
└── [8 more specialized agents]
```

## 🗄️ Database Schema

### Core Tables

- **organizations** - Multi-tenant organization data
- **profiles** - User profiles linked to auth.users
- **contacts** - WhatsApp contact management
- **conversations** - Chat thread management
- **messages** - Individual message storage
- **automation_rules** - Business logic rules
- **message_templates** - Quick reply templates

### Key Features

- **Row Level Security (RLS)** - Automatic tenant isolation
- **Real-time subscriptions** - Live UI updates
- **Automated timestamps** - Created/updated tracking
- **Soft deletes** - Data preservation
- **Indexes** - Optimized query performance

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/[id]/messages` - Get messages
- `POST /api/conversations/[id]/messages` - Send message

### Billing
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Access customer portal
- `GET /api/billing/usage` - Usage metrics

### Webhooks
- `POST /api/webhooks/whatsapp` - WhatsApp message webhooks
- `POST /api/webhooks/stripe` - Stripe payment webhooks

## 🤝 Development Workflow

### Windsurf AI Agents

Het project bevat 9 gespecialiseerde AI agents in `.windsurf/agents/`:

1. **Lead Developer** - Architectuur en planning
2. **Backend API Developer** - Server-side development
3. **Frontend Developer** - UI/UX implementation
4. **Database Architect** - Data modeling
5. **Testing & QA** - Quality assurance
6. **DevOps & Infrastructure** - Deployment
7. **Code Review** - Code quality
8. **Documentation** - Technical writing
9. **Security** - Security auditing

### Code Standards

- **TypeScript** voor type safety
- **ESLint + Prettier** voor code formatting
- **Conventional Commits** voor git history
- **Component-driven development**

## 🚀 Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

```bash
# Manual deployment
npm run build
npx vercel --prod
```

### Webhook Setup

#### WhatsApp Webhooks
```
Webhook URL: https://yourdomain.com/api/webhooks/whatsapp
Verify Token: your-verify-token
```

#### Stripe Webhooks
```
Webhook URL: https://yourdomain.com/api/webhooks/stripe
Events: customer.subscription.*, invoice.payment_failed
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update documentation
6. Submit pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and Stripe**
