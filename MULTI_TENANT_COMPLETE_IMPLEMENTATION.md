# Multi-Tenant Architecture - Complete Implementation

This document outlines the complete 100% multi-tenant architecture implementation for ADSapp, including white-label customization, domain routing, and usage tracking.

## 🎯 Overview

The implementation includes three critical components that bring the multi-tenant architecture to 100% completion:

1. **White-label Customization Options**
2. **Tenant-specific Domain Routing**
3. **Resource Usage Tracking per Tenant**

## 🗄️ Database Schema

### New Tables Added

The migration `005_tenant_customization.sql` adds the following tables:

#### `tenant_branding`
- Complete branding configuration including colors, logos, typography
- Company information and contact details
- Custom CSS/JS injection capabilities
- White-label settings to hide platform branding

#### `tenant_domains`
- Custom domain and subdomain management
- SSL certificate tracking and verification
- DNS configuration and verification status
- Primary domain designation

#### `tenant_email_templates`
- Customizable email templates per tenant
- Variable replacement system
- Branding integration for emails

#### `tenant_usage_metrics`
- Daily aggregated usage metrics
- API calls, messages, storage, bandwidth tracking
- Performance metrics (response times, uptime)

#### `tenant_usage_events`
- Real-time usage event tracking
- Detailed metadata for each usage event
- Cost tracking and billing integration

#### `tenant_usage_limits`
- Configurable soft and hard limits
- Alert thresholds and notifications
- Period-based limits (daily, weekly, monthly)

#### `tenant_features`
- Feature flag system per tenant
- Subscription tier-based feature access
- Configuration storage for features

#### `tenant_configuration`
- Business hours configuration
- Notification preferences
- Security settings
- Integration configurations

## 🏗️ Architecture Components

### 1. Tenant Branding Management (`src/lib/tenant-branding.ts`)

**Key Features:**
- Complete color palette management
- Logo and favicon upload/management
- Typography and layout customization
- Email template branding
- CSS variable generation
- White-label configuration

**Usage:**
```typescript
import TenantBrandingManager from '@/lib/tenant-branding';

const brandingManager = new TenantBrandingManager(supabaseUrl, supabaseKey);

// Get branding configuration
const branding = await brandingManager.getBrandingConfig(organizationId);

// Update branding
await brandingManager.updateBranding(organizationId, {
  primary_color: '#3B82F6',
  company_name: 'Your Company'
});

// Upload brand assets
const logoUrl = await brandingManager.uploadBrandAsset(
  organizationId,
  logoFile,
  'logo'
);
```

### 2. Domain Routing System (`src/middleware/tenant-routing.ts`)

**Key Features:**
- Subdomain routing (tenant.adsapp.com)
- Custom domain support with verification
- SSL certificate management
- DNS configuration assistance
- Tenant context injection

**Usage:**
```typescript
import { TenantRouter, DomainManager } from '@/middleware/tenant-routing';

const router = new TenantRouter(supabaseUrl, supabaseKey);
const domainManager = new DomainManager(supabaseUrl, supabaseKey);

// Add custom domain
const domain = await domainManager.addCustomDomain(
  organizationId,
  'inbox.company.com',
  true // isPrimary
);

// Verify domain
const isVerified = await domainManager.verifyDomain(domain.id);
```

### 3. Usage Tracking System (`src/lib/usage-tracking.ts`)

**Key Features:**
- Real-time usage event tracking
- Configurable usage limits
- Alert system with notifications
- Usage reporting and analytics
- Cost calculation and billing integration

**Usage:**
```typescript
import UsageTracker from '@/lib/usage-tracking';

const tracker = new UsageTracker(supabaseUrl, supabaseKey, organizationId);

// Track usage event
await tracker.trackEvent('api_call', {
  resourceAmount: 1,
  endpoint: '/api/messages',
  userId: user.id
});

// Set usage limits
await tracker.setUsageLimit(
  'api_calls',
  'monthly',
  10000,  // soft limit
  12000,  // hard limit
  80      // alert threshold
);

// Generate usage report
const report = await tracker.generateUsageReport(startDate, endDate);
```

## 🌐 API Routes

### Branding Management
- `GET /api/tenant/branding` - Get tenant branding
- `PUT /api/tenant/branding` - Update tenant branding
- `POST /api/tenant/branding` - Upload brand assets

### Domain Management
- `GET /api/tenant/domains` - List domains
- `POST /api/tenant/domains` - Add new domain
- `PUT /api/tenant/domains/[id]` - Update domain
- `DELETE /api/tenant/domains/[id]` - Remove domain
- `POST /api/tenant/domains/[id]/verify` - Verify domain

### Usage Tracking
- `GET /api/tenant/usage` - Get usage metrics
- `POST /api/tenant/usage` - Track usage event
- `GET /api/tenant/usage/limits` - Get usage limits
- `POST /api/tenant/usage/limits` - Create usage limit

### Settings Management
- `GET /api/tenant/settings` - Get tenant settings
- `PUT /api/tenant/settings` - Update tenant settings

## 🎨 Frontend Components

### 1. BrandingCustomizer Component

**Features:**
- Color palette editor with live preview
- Logo upload and management
- Typography settings
- Custom CSS editor
- White-label configuration
- Real-time preview panel

**Usage:**
```tsx
import { BrandingCustomizer } from '@/components/tenant';

<BrandingCustomizer
  organizationId={organizationId}
  initialBranding={branding}
  onBrandingChange={handleBrandingChange}
  onSave={handleSave}
/>
```

### 2. DomainManager Component

**Features:**
- Domain listing with status indicators
- Custom domain addition with DNS instructions
- Domain verification workflow
- SSL certificate status tracking
- Primary domain designation

**Usage:**
```tsx
import { DomainManager } from '@/components/tenant';

<DomainManager
  organizationId={organizationId}
/>
```

### 3. UsageDashboard Component

**Features:**
- Real-time usage monitoring
- Usage history visualization
- Limit configuration and management
- Alert system interface
- Usage data export functionality

**Usage:**
```tsx
import { UsageDashboard } from '@/components/tenant';

<UsageDashboard
  organizationId={organizationId}
/>
```

## 🔧 Configuration

### Environment Variables

Add the following to your `.env.local`:

```env
# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=adsapp.com
APP_IP=your_server_ip

# Storage Configuration
NEXT_PUBLIC_SUPABASE_STORAGE_URL=your_storage_url
```

### Middleware Setup

The middleware is already configured in `middleware.ts` to handle:
- Tenant domain resolution
- Request routing based on domains
- Tenant context injection
- Fallback handling

### Database Setup

1. Apply the migration:
```bash
npx supabase db reset
# or manually apply:
psql -h your-host -d postgres -f supabase/migrations/005_tenant_customization.sql
```

2. Create storage bucket for brand assets:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);
```

## 🚀 Usage Examples

### Setting Up a New Tenant

```typescript
// 1. Create organization (existing flow)
const org = await createOrganization(data);

// 2. Set up branding
const brandingManager = new TenantBrandingManager(supabaseUrl, supabaseKey);
await brandingManager.updateBranding(org.id, {
  company_name: 'Acme Corp',
  primary_color: '#FF6B35',
  secondary_color: '#004E89'
});

// 3. Add subdomain
const domainManager = new DomainManager(supabaseUrl, supabaseKey);
await domainManager.addSubdomain(org.id, 'acme');

// 4. Set usage limits
const tracker = new UsageTracker(supabaseUrl, supabaseKey, org.id);
await tracker.setUsageLimit('api_calls', 'monthly', 10000, 12000);
```

### Implementing Custom Domain

```typescript
// 1. Add custom domain
const domain = await domainManager.addCustomDomain(
  organizationId,
  'support.acme.com',
  true
);

// 2. Display DNS records to user
const dnsRecords = domainManager.getDNSRecords(
  'support.acme.com',
  domain.verification_token
);

// 3. User configures DNS, then verify
const isVerified = await domainManager.verifyDomain(domain.id);
```

### Tracking Usage Events

```typescript
// API route example
export async function POST(request: NextRequest) {
  const tenantContext = tenantUtils.getTenantContext(request.headers);

  // Track API call
  const tracker = new UsageTracker(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    tenantContext.organizationId
  );

  await tracker.trackEvent('api_call', {
    endpoint: request.nextUrl.pathname,
    userId: user.id
  });

  // Your API logic here...
}
```

## 🔒 Security Considerations

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only access data for their organization
- Admins/owners have additional permissions for management
- Usage data is properly isolated per tenant

### Domain Verification

- DNS-based verification for custom domains
- Verification tokens with expiration
- SSL certificate validation
- Subdomain validation against reserved names

### Usage Tracking Security

- Server-side tracking to prevent manipulation
- Rate limiting on usage tracking endpoints
- Audit trails for all usage events
- Secure aggregation of sensitive metrics

## 📊 Monitoring and Analytics

### Usage Metrics Collected

- **API Usage**: Calls per endpoint, response times, error rates
- **Messaging**: Messages sent/received, delivery rates
- **Storage**: File uploads, total storage used, media types
- **Bandwidth**: Ingress/egress traffic, peak usage times
- **Performance**: Response times, uptime, error rates

### Alerting System

- Configurable thresholds per metric type
- Multiple alert channels (email, webhook, dashboard)
- Escalation policies for critical alerts
- Usage trend analysis and predictions

## 🚀 Deployment Checklist

### Database
- [ ] Apply migration `005_tenant_customization.sql`
- [ ] Create storage bucket for brand assets
- [ ] Configure RLS policies
- [ ] Set up default limits for existing organizations

### Application
- [ ] Deploy updated middleware configuration
- [ ] Configure environment variables
- [ ] Test domain routing functionality
- [ ] Verify usage tracking is working

### DNS Configuration
- [ ] Set up wildcard DNS for subdomains (*.adsapp.com)
- [ ] Configure SSL certificates for main domain
- [ ] Test custom domain verification flow

### Monitoring
- [ ] Set up monitoring for usage tracking
- [ ] Configure alerts for system limits
- [ ] Test backup and recovery procedures

## 🎉 Conclusion

This implementation provides a complete, enterprise-grade multi-tenant architecture with:

✅ **100% Multi-tenant Isolation** - Complete data and resource isolation
✅ **White-label Customization** - Full branding control per tenant
✅ **Domain Routing** - Custom domains and subdomain support
✅ **Usage Tracking** - Comprehensive resource monitoring
✅ **Scalable Architecture** - Built for enterprise growth
✅ **Security First** - Row-level security and proper isolation
✅ **Developer Friendly** - Well-documented APIs and components

The ADSapp platform now supports enterprise customers with complete white-label capabilities, custom domains, and detailed usage analytics - reaching 100% multi-tenant architecture completion.