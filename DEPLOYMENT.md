# 🚀 ADSapp Deployment Guide

This guide covers multiple deployment options for the ADSapp WhatsApp Business Inbox SaaS platform.

## 📋 Prerequisites

- Node.js 18+
- Supabase account and project
- WhatsApp Business account with Cloud API access
- Stripe account
- Domain name (for production)

## 🌐 Vercel Deployment (Recommended)

Vercel provides the easiest deployment experience for Next.js applications.

### 1. Prepare Your Repository

```bash
# Ensure your code is committed and pushed to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Visit [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your repository
4. Configure environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret
```

### 3. Configure Webhooks

After deployment, update your webhook URLs:

**WhatsApp Business API:**
- Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
- Verify Token: Your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

**Stripe Webhooks:**
- Webhook URL: `https://your-domain.com/api/webhooks/stripe`
- Events to send: `customer.subscription.*`, `invoice.payment_failed`

## 🐳 Docker Deployment

For self-hosted or cloud server deployments.

### 1. Build and Run with Docker

```bash
# Build the image
docker build -t adsapp .

# Run the container
docker run -p 3000:3000 \
  --env-file .env.local \
  adsapp
```

### 2. Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 3. Production Docker Setup

For production, use the `docker-compose.prod.yml`:

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ☁️ Cloud Provider Deployments

### AWS ECS

1. Create an ECS cluster
2. Build and push to ECR:

```bash
# Build and tag
docker build -t adsapp .
docker tag adsapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/adsapp:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/adsapp:latest
```

3. Create ECS service with your image
4. Configure Application Load Balancer
5. Set up environment variables in ECS task definition

### Google Cloud Run

```bash
# Build and deploy
gcloud run deploy adsapp \
  --image gcr.io/your-project/adsapp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --env-vars-file .env.yaml
```

### Azure Container Instances

```bash
# Deploy to ACI
az container create \
  --resource-group your-resource-group \
  --name adsapp \
  --image your-registry/adsapp \
  --dns-name-label adsapp \
  --ports 3000 \
  --environment-variables @.env.json
```

## 🗄️ Database Setup

### Supabase Migration

```bash
# Reset database with schema
npx supabase db reset

# Or apply migrations manually
psql -h your-db-host -d postgres -f supabase/migrations/001_initial_schema.sql
```

### Row Level Security

Ensure RLS policies are enabled in Supabase:

1. Navigate to Table Editor
2. For each table, ensure RLS is enabled
3. Verify policies are applied correctly

## 🔒 SSL/TLS Configuration

### Let's Encrypt with Nginx

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL

1. Add your domain to Cloudflare
2. Update nameservers
3. Enable "Full (strict)" SSL mode
4. Enable "Always Use HTTPS"

## 📊 Monitoring & Analytics

### Health Checks

The application exposes health check endpoints:

- `GET /api/health` - Application health
- `GET /api/health/db` - Database connectivity
- `GET /api/health/stripe` - Stripe connection

### Application Monitoring

#### Vercel Analytics

Add to your `layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### Sentry Error Tracking

```bash
npm install @sentry/nextjs
```

Add `SENTRY_DSN` to your environment variables.

## 🔧 Production Optimizations

### Next.js Configuration

Update `next.config.js` for production:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ],
}

module.exports = nextConfig
```

### Database Optimizations

1. Enable connection pooling in Supabase
2. Set up read replicas for high traffic
3. Configure database indexes for performance

## 🔍 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Environment Variable Issues:**
- Ensure all required variables are set
- Check for typos in variable names
- Verify Supabase and Stripe keys are valid

**Database Connection Issues:**
- Verify Supabase URL and keys
- Check if database is accessible
- Ensure RLS policies allow access

**Webhook Issues:**
- Verify webhook URLs are accessible
- Check webhook signatures
- Review webhook logs in provider dashboard

### Logs and Debugging

```bash
# View application logs
docker logs adsapp

# View detailed Next.js logs
DEBUG=* npm run dev

# Database logs in Supabase
# Go to Supabase Dashboard > Logs > Database
```

## 📋 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Webhook endpoints configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Health checks passing
- [ ] Error monitoring set up
- [ ] Backups configured
- [ ] Performance monitoring enabled

## 🆘 Support

For deployment issues:

1. Check the [GitHub Issues](https://github.com/your-org/adsapp/issues)
2. Review logs for specific error messages
3. Verify all prerequisites are met
4. Contact support at support@adsapp.com

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and Stripe**