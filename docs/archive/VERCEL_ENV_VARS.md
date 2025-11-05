# Complete Vercel Environment Variables Setup

## Required Environment Variables for Production Deployment

### Application Configuration
```bash
# Core Application Settings
NEXT_PUBLIC_APP_NAME=ADSapp
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_APP_DOMAIN=your-production-domain.com
NODE_ENV=production
```

### Supabase Database Configuration
```bash
# Supabase - Get from https://app.supabase.com/project/your-project/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

### Stripe Payment Configuration
```bash
# Stripe - Get from https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Stripe Price IDs - Create these in Stripe Dashboard
STRIPE_STARTER_PRICE_ID=price_starter_monthly_29
STRIPE_PROFESSIONAL_PRICE_ID=price_professional_monthly_79
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly_199
```

### WhatsApp Business API Configuration
```bash
# WhatsApp Business - Get from Meta Developer Console
WHATSAPP_ACCESS_TOKEN=your_whatsapp_business_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
```

### Email Service Configuration
```bash
# Resend Email Service - Get from https://resend.com/api-keys
RESEND_API_KEY=re_your_resend_api_key
NEXT_PUBLIC_EMAIL_FROM=noreply@your-domain.com
```

### Security & Authentication
```bash
# JWT and Encryption Keys - Generate secure random keys
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### Monitoring & Error Tracking (Optional but Recommended)
```bash
# Sentry for Error Tracking - Get from https://sentry.io
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your_sentry_organization
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### Admin Configuration
```bash
# Super Admin Access
SUPER_ADMIN_EMAIL=admin@your-domain.com
ADMIN_SECRET_KEY=your_admin_secret_key_for_admin_operations
```

### Feature Flags (Optional)
```bash
# Feature toggles
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AI_ASSISTANCE_ENABLED=false
FEATURE_ADVANCED_AUTOMATION=true
GDPR_ENABLED=true
CCPA_ENABLED=true
DATA_RETENTION_DAYS=365
```

### Performance & File Upload
```bash
# File upload limits
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
UPLOAD_BUCKET=your_aws_s3_bucket_name
UPLOAD_REGION=us-east-1
```

### Build-Time Safety
```bash
# Helps with Vercel build process
NEXT_BUILD_TIME=false
```

## How to Set Environment Variables in Vercel

### Method 1: Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Set the environment to "Production", "Preview", or "Development" as needed

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_APP_NAME production
vercel env add STRIPE_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all required variables
```

### Method 3: Bulk Import via .env file
```bash
# Create a production.env file with all variables
# Then use Vercel CLI to import
vercel env pull .env.production
```

## Critical Environment Variables for Build Success

These variables are **absolutely required** for the build to succeed:

1. **STRIPE_SECRET_KEY** - Required for Stripe service initialization
2. **STRIPE_STARTER_PRICE_ID** - Required for subscription plans
3. **STRIPE_PROFESSIONAL_PRICE_ID** - Required for subscription plans
4. **STRIPE_ENTERPRISE_PRICE_ID** - Required for subscription plans
5. **NEXT_PUBLIC_SUPABASE_URL** - Required for Supabase client
6. **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Required for Supabase client
7. **SUPABASE_SERVICE_ROLE_KEY** - Required for server-side Supabase operations

## Environment Variable Priorities

### High Priority (Build will fail without these)
- All Stripe configuration
- All Supabase configuration
- NEXT_PUBLIC_APP_URL

### Medium Priority (Features won't work without these)
- WhatsApp Business API configuration
- Resend email configuration
- JWT secrets

### Low Priority (Optional features)
- Sentry monitoring
- Analytics
- Feature flags

## Security Notes

1. **Never commit real environment variables to git**
2. **Use different values for development/staging/production**
3. **Rotate secrets regularly**
4. **Use strong, unique passwords and keys**
5. **Limit API key permissions to minimum required scope**

## Testing Your Configuration

After setting up environment variables, test your deployment:

```bash
# Test build locally
npm run build

# Test deployment
vercel --prod

# Check health endpoint
curl https://your-domain.com/api/health
```

## Common Issues and Solutions

### Build Fails with "Neither apiKey nor config.authenticator provided"
- Ensure all Stripe environment variables are set
- Check that STRIPE_SECRET_KEY is properly configured
- Verify STRIPE_*_PRICE_ID variables are all set

### Supabase Connection Issues
- Verify NEXT_PUBLIC_SUPABASE_URL format
- Check SUPABASE_SERVICE_ROLE_KEY has correct permissions
- Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is valid

### WhatsApp Integration Not Working
- Verify WHATSAPP_ACCESS_TOKEN is valid and not expired
- Check WHATSAPP_PHONE_NUMBER_ID matches your Business Account
- Ensure WHATSAPP_WEBHOOK_VERIFY_TOKEN matches Meta configuration