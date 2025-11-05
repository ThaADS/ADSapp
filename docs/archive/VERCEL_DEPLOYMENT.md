# Vercel Deployment Guide - ADSapp

## 🚀 Quick Deploy to Vercel

### 1. Initial Deployment

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Deploy from your project directory
cd ADSapp
vercel --prod
```

### 2. Environment Variables Setup

After deployment, you need to configure the following environment variables in your Vercel dashboard:

**Go to:** https://vercel.com/your-username/adsapp/settings/environment-variables

### Required Environment Variables

#### Core Application
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-256-bit-secret-key-here
```

#### Supabase Database
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### WhatsApp Business API
```
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
```

#### Stripe Billing
```
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

#### Optional (for enhanced features)
```
RESEND_API_KEY=re_your-resend-api-key
SENTRY_DSN=https://your-sentry-dsn
```

### 3. Environment Variable Configuration Steps

1. **Login to Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Select your ADSapp project

2. **Navigate to Settings**
   - Click on "Settings" tab
   - Click on "Environment Variables" in the sidebar

3. **Add Each Variable**
   - Click "Add New"
   - Enter the Name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the Value
   - Select Environment: `Production`, `Preview`, and `Development`
   - Click "Save"

4. **Redeploy After Adding Variables**
   ```bash
   vercel --prod
   ```

### 4. Post-Deployment Setup

#### Create Super Admin Account
```bash
# Set environment variables locally first
export NEXT_PUBLIC_SUPABASE_URL=your-production-url
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run the super admin creation script
node create-super-admin.js
```

#### Verify Deployment
- Health Check: `https://your-domain.vercel.app/api/health`
- Admin Login: `https://your-domain.vercel.app/admin`
- Main App: `https://your-domain.vercel.app`

### 5. Custom Domain Setup (Optional)

1. **Add Custom Domain in Vercel**
   - Go to Settings → Domains
   - Add your domain (e.g., `adsapp.com`)

2. **Update DNS Records**
   - Add CNAME record pointing to `cname.vercel-dns.com`

3. **Update Environment Variables**
   ```
   NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
   ```

### 6. Troubleshooting Common Issues

#### Build Failures
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Run `npm run build` locally to test

#### Database Connection Issues
- Verify Supabase URL and keys
- Check RLS policies in Supabase dashboard
- Ensure service role key has proper permissions

#### WhatsApp Integration Issues
- Verify webhook URL in Meta Developer Console: `https://your-domain/api/webhooks/whatsapp`
- Check webhook verify token matches

#### Stripe Issues
- Ensure webhook endpoint is configured: `https://your-domain/api/webhooks/stripe`
- Verify webhook secret matches

### 7. Production Checklist

- [ ] All environment variables configured
- [ ] Custom domain configured (optional)
- [ ] Super admin account created
- [ ] Supabase RLS policies verified
- [ ] WhatsApp webhook configured
- [ ] Stripe webhook configured
- [ ] SSL certificate active
- [ ] Health check endpoints working

### 8. Environment Variable Quick Copy

Use this template for quick setup:

```env
# Core Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate-a-secure-256-bit-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAAb...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
RESEND_API_KEY=re_...
SENTRY_DSN=https://...
```

## 🎉 Deployment Complete!

After following these steps, your ADSapp Multi-Tenant WhatsApp Business Inbox SaaS platform will be live and ready for customers!

**Important Security Notes:**
- Always use production API keys for live deployment
- Keep service role keys secure and never expose them client-side
- Regularly rotate access tokens and secrets
- Monitor usage and set up alerts

Happy deploying! 🚀