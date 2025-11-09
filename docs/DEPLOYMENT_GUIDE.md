# ADSapp Deployment Guide

Complete gids voor het deployen van ADSapp naar productie inclusief alle Phase 1 features.

## Inhoudsopgave

- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Vercel Deployment](#vercel-deployment)
- [WhatsApp Business Setup](#whatsapp-business-setup)
- [Cron Jobs Configuration](#cron-jobs-configuration)
- [Post-deployment Verification](#post-deployment-verification)

---

## Pre-deployment Checklist

✅ **Code Quality**:
- Tests: `npm run test:ci`
- Build: `npm run build`
- Type check: `npm run type-check`
- Lint: `npm run lint`

✅ **Database**:
- Migrations applied
- RLS policies tested
- Backup configured

✅ **External Services**:
- WhatsApp Business API configured
- Stripe webhook verified
- Email service tested

---

## Environment Variables

See `.env.example` for complete list.

Required variables:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- WHATSAPP_ACCESS_TOKEN
- STRIPE_SECRET_KEY
- CRON_SECRET

---

## Deploy

```bash
# Deploy to Vercel
vercel --prod

# Apply migrations
npx supabase db push
```

See full guide in docs/DEPLOYMENT_GUIDE.md
