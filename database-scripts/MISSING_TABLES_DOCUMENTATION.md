# Missing Database Tables Documentation

**Date**: 2025-10-14
**Purpose**: Complete database schema for TypeScript type safety
**Status**: Production-ready, RLS-enabled, fully indexed

---

## Overview

This migration creates **7 missing database tables** identified during Week 3-4 TypeScript fixes. All tables follow ADSapp's established patterns with multi-tenant isolation, comprehensive indexing, and enterprise security.

---

## Table 1: `performance_analytics`

**Purpose**: Store advanced performance metrics for Web Vitals monitoring and API performance tracking

**Referenced by**: `src/app/api/analytics/performance/route.ts`

### Schema

| Column            | Type        | Description                                                                                                |
| ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `id`              | UUID        | Primary key                                                                                                |
| `organization_id` | UUID        | Multi-tenant FK to organizations                                                                           |
| `user_id`         | UUID        | FK to auth.users (nullable)                                                                                |
| `session_id`      | TEXT        | User session identifier                                                                                    |
| `type`            | TEXT        | Metric type: CLS, FCP, FID, LCP, TTFB, api-call, custom-timing, error, user-interaction, navigation-timing |
| `name`            | TEXT        | Metric name for custom types                                                                               |
| `value`           | NUMERIC     | Numeric metric value                                                                                       |
| `duration`        | NUMERIC     | Duration in milliseconds                                                                                   |
| `url`             | TEXT        | URL where metric was captured                                                                              |
| `route`           | TEXT        | Route/page identifier                                                                                      |
| `metadata`        | JSONB       | Additional context data                                                                                    |
| `ip_address`      | INET        | Client IP address                                                                                          |
| `user_agent`      | TEXT        | Browser/client user agent                                                                                  |
| `viewport_width`  | INT         | Browser viewport width                                                                                     |
| `viewport_height` | INT         | Browser viewport height                                                                                    |
| `device_type`     | TEXT        | Device category                                                                                            |
| `timestamp`       | TIMESTAMPTZ | Metric capture timestamp                                                                                   |
| `created_at`      | TIMESTAMPTZ | Record creation timestamp                                                                                  |

### Indexes

- `idx_performance_analytics_organization_id` - Multi-tenant queries
- `idx_performance_analytics_user_id` - User-specific metrics
- `idx_performance_analytics_type` - Metric type filtering
- `idx_performance_analytics_timestamp` - Time-series queries
- `idx_performance_analytics_session_id` - Session analysis
- `idx_performance_analytics_composite` - Organization + type + time queries

### RLS Policies

- **SELECT**: Users can view metrics in own organization or super admins
- **INSERT**: Users can insert metrics for own organization or authenticated users

### Use Cases

- Web Vitals dashboard (CLS, FCP, FID, LCP, TTFB)
- API performance monitoring
- Custom timing analysis
- Error tracking
- User interaction metrics
- Page navigation timing

---

## Table 2: `scheduled_reports`

**Purpose**: Manage recurring and one-time report generation schedules

**Referenced by**: `src/app/api/analytics/reports/route.ts`

### Schema

| Column            | Type        | Description                                                                                                       |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`              | UUID        | Primary key                                                                                                       |
| `organization_id` | UUID        | Multi-tenant FK to organizations                                                                                  |
| `created_by`      | UUID        | FK to profiles (report creator)                                                                                   |
| `report_type`     | TEXT        | Type: conversations, messages, agents, contacts, performance                                                      |
| `report_name`     | TEXT        | User-defined report name                                                                                          |
| `start_date`      | DATE        | Report period start                                                                                               |
| `end_date`        | DATE        | Report period end                                                                                                 |
| `filters`         | JSONB       | Custom filters for report                                                                                         |
| `format`          | TEXT        | Output format: json, csv, pdf                                                                                     |
| `scheduling`      | JSONB       | Schedule config: {"frequency": "once\|daily\|weekly\|monthly", "dayOfWeek": 1, "dayOfMonth": 15, "time": "09:00"} |
| `next_run_at`     | TIMESTAMPTZ | Next scheduled execution                                                                                          |
| `last_run_at`     | TIMESTAMPTZ | Last execution timestamp                                                                                          |
| `status`          | TEXT        | Status: pending, processing, completed, failed, cancelled                                                         |
| `error_message`   | TEXT        | Error details if failed                                                                                           |
| `output_url`      | TEXT        | Generated report URL                                                                                              |
| `delivery_emails` | TEXT[]      | Email recipients for report delivery                                                                              |
| `metadata`        | JSONB       | Additional configuration                                                                                          |
| `created_at`      | TIMESTAMPTZ | Record creation timestamp                                                                                         |
| `updated_at`      | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger)                                                                  |
| `completed_at`    | TIMESTAMPTZ | Completion timestamp                                                                                              |

### Indexes

- `idx_scheduled_reports_organization_id` - Multi-tenant queries
- `idx_scheduled_reports_created_by` - User's reports
- `idx_scheduled_reports_status` - Status filtering
- `idx_scheduled_reports_next_run_at` - Scheduling job queue
- `idx_scheduled_reports_report_type` - Type-based filtering

### RLS Policies

- **SELECT**: Users can view reports in own organization or super admins
- **INSERT**: Users can create reports for own organization (must be creator)
- **UPDATE**: Users can update reports in own organization or super admins
- **DELETE**: Users can delete own reports or organization reports

### Use Cases

- Recurring analytics reports
- Scheduled exports (CSV, PDF)
- Email delivery automation
- Custom report generation
- Performance monitoring reports

---

## Table 3: `audit_logs`

**Purpose**: Comprehensive security event logging for compliance and forensics

**Referenced by**: `src/app/api/auth/mfa/enroll/route.ts`, `src/lib/super-admin.ts`

### Schema

| Column            | Type        | Description                                         |
| ----------------- | ----------- | --------------------------------------------------- |
| `id`              | UUID        | Primary key                                         |
| `organization_id` | UUID        | Multi-tenant FK to organizations                    |
| `actor_id`        | UUID        | FK to auth.users (who performed action)             |
| `actor_email`     | TEXT        | Actor's email for audit trail                       |
| `actor_role`      | TEXT        | Actor's role at time of action                      |
| `action`          | TEXT        | Action performed (e.g., "mfa_enrollment_initiated") |
| `resource_type`   | TEXT        | Type of resource affected                           |
| `resource_id`     | UUID        | ID of affected resource                             |
| `old_values`      | JSONB       | State before change                                 |
| `new_values`      | JSONB       | State after change                                  |
| `risk_level`      | TEXT        | Risk: low, medium, high, critical                   |
| `ip_address`      | INET        | Client IP address                                   |
| `user_agent`      | TEXT        | Client user agent                                   |
| `metadata`        | JSONB       | Additional context                                  |
| `session_id`      | TEXT        | Session identifier                                  |
| `created_at`      | TIMESTAMPTZ | Event timestamp                                     |

### Indexes

- `idx_audit_logs_organization_id` - Multi-tenant queries
- `idx_audit_logs_actor_id` - User action history
- `idx_audit_logs_action` - Action filtering
- `idx_audit_logs_resource_type` - Resource type filtering
- `idx_audit_logs_resource_id` - Specific resource tracking
- `idx_audit_logs_risk_level` - Security monitoring
- `idx_audit_logs_created_at` - Time-series queries
- `idx_audit_logs_composite` - Organization + action + time queries

### RLS Policies

- **SELECT**: Users can view audit logs in own organization or super admins
- **INSERT**: System can insert from any context (for security events)

### Use Cases

- MFA enrollment tracking
- Security event logging
- Compliance audit trails
- Change tracking (before/after)
- Risk assessment and monitoring
- Forensic investigation

---

## Table 4: `invoices`

**Purpose**: Store billing invoice records for financial tracking

**Referenced by**: Stripe integration, billing events

### Schema

| Column                 | Type        | Description                                      |
| ---------------------- | ----------- | ------------------------------------------------ |
| `id`                   | UUID        | Primary key                                      |
| `organization_id`      | UUID        | Multi-tenant FK to organizations                 |
| `subscription_id`      | UUID        | FK to subscriptions                              |
| `stripe_invoice_id`    | TEXT        | Stripe invoice ID (unique)                       |
| `stripe_customer_id`   | TEXT        | Stripe customer ID                               |
| `invoice_number`       | TEXT        | Sequential invoice number (unique)               |
| `amount_due`           | INT         | Total amount due (cents)                         |
| `amount_paid`          | INT         | Amount paid (cents)                              |
| `currency`             | TEXT        | Currency code (default: usd)                     |
| `status`               | TEXT        | Status: draft, open, paid, void, uncollectible   |
| `billing_period_start` | DATE        | Billing period start date                        |
| `billing_period_end`   | DATE        | Billing period end date                          |
| `due_date`             | DATE        | Payment due date                                 |
| `paid_at`              | TIMESTAMPTZ | Payment timestamp                                |
| `line_items`           | JSONB       | Invoice line items array                         |
| `subtotal`             | INT         | Subtotal before tax/discount (cents)             |
| `tax_amount`           | INT         | Tax amount (cents)                               |
| `discount_amount`      | INT         | Discount amount (cents)                          |
| `total_amount`         | INT         | Final total amount (cents)                       |
| `payment_method`       | TEXT        | Payment method used                              |
| `payment_intent_id`    | TEXT        | Stripe payment intent ID                         |
| `invoice_pdf_url`      | TEXT        | PDF invoice URL                                  |
| `hosted_invoice_url`   | TEXT        | Stripe hosted invoice URL                        |
| `metadata`             | JSONB       | Additional invoice data                          |
| `notes`                | TEXT        | Internal notes                                   |
| `created_at`           | TIMESTAMPTZ | Record creation timestamp                        |
| `updated_at`           | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger) |

### Indexes

- `idx_invoices_organization_id` - Multi-tenant queries
- `idx_invoices_subscription_id` - Subscription invoices
- `idx_invoices_stripe_invoice_id` - Stripe lookups
- `idx_invoices_stripe_customer_id` - Customer invoices
- `idx_invoices_status` - Status filtering
- `idx_invoices_due_date` - Overdue tracking
- `idx_invoices_created_at` - Time-series queries

### RLS Policies

- **SELECT**: Users can view invoices in own organization or super admins
- **ALL**: Super admins can manage all invoices

### Use Cases

- Billing invoice storage
- Payment tracking
- Revenue recognition
- Tax reporting
- Financial compliance
- Customer billing history

---

## Table 5: `subscription_changes`

**Purpose**: Track subscription history for audit and churn analysis

**Referenced by**: Subscription management, billing analytics

### Schema

| Column                   | Type        | Description                                                                                      |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| `id`                     | UUID        | Primary key                                                                                      |
| `organization_id`        | UUID        | Multi-tenant FK to organizations                                                                 |
| `subscription_id`        | UUID        | FK to subscriptions                                                                              |
| `change_type`            | TEXT        | Type: created, upgraded, downgraded, cancelled, renewed, trial_started, trial_ended, reactivated |
| `old_plan_id`            | TEXT        | Previous plan ID                                                                                 |
| `new_plan_id`            | TEXT        | New plan ID                                                                                      |
| `old_status`             | TEXT        | Previous subscription status                                                                     |
| `new_status`             | TEXT        | New subscription status                                                                          |
| `old_amount`             | INT         | Previous amount (cents)                                                                          |
| `new_amount`             | INT         | New amount (cents)                                                                               |
| `currency`               | TEXT        | Currency code (default: usd)                                                                     |
| `prorated_amount`        | INT         | Prorated amount (cents)                                                                          |
| `effective_date`         | DATE        | Change effective date                                                                            |
| `change_reason`          | TEXT        | Reason for change                                                                                |
| `initiated_by`           | UUID        | FK to profiles (who initiated)                                                                   |
| `stripe_subscription_id` | TEXT        | Stripe subscription ID                                                                           |
| `stripe_event_id`        | TEXT        | Stripe event ID                                                                                  |
| `metadata`               | JSONB       | Additional change data                                                                           |
| `created_at`             | TIMESTAMPTZ | Record creation timestamp                                                                        |

### Indexes

- `idx_subscription_changes_organization_id` - Multi-tenant queries
- `idx_subscription_changes_subscription_id` - Subscription history
- `idx_subscription_changes_change_type` - Type filtering
- `idx_subscription_changes_effective_date` - Time-series analysis
- `idx_subscription_changes_created_at` - Event tracking

### RLS Policies

- **SELECT**: Users can view changes in own organization or super admins
- **INSERT**: System can insert from any context (webhooks)
- **ALL**: Super admins can manage all subscription changes

### Use Cases

- Subscription lifecycle tracking
- Churn analysis
- Upgrade/downgrade patterns
- Revenue forecasting
- Customer success metrics
- Audit trail for billing disputes

---

## Table 6: `usage_tracking`

**Purpose**: Monitor resource usage for billing and capacity planning

**Referenced by**: Usage-based billing, analytics

### Schema

| Column              | Type        | Description                                                                                                                            |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | UUID        | Primary key                                                                                                                            |
| `organization_id`   | UUID        | Multi-tenant FK to organizations                                                                                                       |
| `usage_date`        | DATE        | Usage date                                                                                                                             |
| `usage_hour`        | INT         | Hour of day (0-23) for granular tracking, NULL for daily                                                                               |
| `resource_type`     | TEXT        | Type: messages_sent, messages_received, storage_gb, api_calls, active_contacts, active_users, whatsapp_sessions, automation_executions |
| `quantity`          | NUMERIC     | Usage quantity                                                                                                                         |
| `unit`              | TEXT        | Unit of measurement                                                                                                                    |
| `unit_price`        | NUMERIC     | Price per unit                                                                                                                         |
| `total_cost`        | NUMERIC     | Total cost                                                                                                                             |
| `currency`          | TEXT        | Currency code (default: usd)                                                                                                           |
| `subscription_id`   | UUID        | FK to subscriptions                                                                                                                    |
| `invoice_id`        | UUID        | FK to invoices                                                                                                                         |
| `is_billable`       | BOOLEAN     | Whether usage is billable                                                                                                              |
| `included_quantity` | NUMERIC     | Included in plan quantity                                                                                                              |
| `overage_quantity`  | NUMERIC     | Quantity over plan limits                                                                                                              |
| `metadata`          | JSONB       | Additional usage data                                                                                                                  |
| `created_at`        | TIMESTAMPTZ | Record creation timestamp                                                                                                              |
| `updated_at`        | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger)                                                                                       |

**Unique Constraint**: (organization_id, usage_date, usage_hour, resource_type)

### Indexes

- `idx_usage_tracking_organization_id` - Multi-tenant queries
- `idx_usage_tracking_usage_date` - Time-series queries
- `idx_usage_tracking_resource_type` - Resource filtering
- `idx_usage_tracking_subscription_id` - Subscription usage
- `idx_usage_tracking_invoice_id` - Invoice line items
- `idx_usage_tracking_composite` - Organization + date + resource queries

### RLS Policies

- **SELECT**: Users can view usage in own organization or super admins
- **INSERT**: System can insert from any context (usage tracking)
- **ALL**: Super admins can manage all usage tracking

### Use Cases

- Usage-based billing
- Capacity planning
- Resource optimization
- Cost allocation
- Overage tracking
- Plan limit enforcement

---

## Table 7: `message_templates`

**Purpose**: Store WhatsApp message templates for quick replies and automation

**Referenced by**: WhatsApp integration, messaging system

### Schema

| Column                 | Type        | Description                                                          |
| ---------------------- | ----------- | -------------------------------------------------------------------- |
| `id`                   | UUID        | Primary key                                                          |
| `organization_id`      | UUID        | Multi-tenant FK to organizations                                     |
| `created_by`           | UUID        | FK to profiles (template creator)                                    |
| `name`                 | TEXT        | Template name                                                        |
| `category`             | TEXT        | Category: greeting, away, closing, follow_up, support, sales, custom |
| `content`              | TEXT        | Template content with variables                                      |
| `language`             | TEXT        | Language code (default: en)                                          |
| `variables`            | JSONB       | Array of variable names, e.g., ["customer_name", "order_id"]         |
| `whatsapp_template_id` | TEXT        | WhatsApp Business template ID                                        |
| `whatsapp_status`      | TEXT        | Status: draft, pending, approved, rejected                           |
| `usage_count`          | INT         | Number of times template used                                        |
| `last_used_at`         | TIMESTAMPTZ | Last usage timestamp                                                 |
| `is_active`            | BOOLEAN     | Whether template is active                                           |
| `metadata`             | JSONB       | Additional template data                                             |
| `tags`                 | TEXT[]      | Template tags for organization                                       |
| `created_at`           | TIMESTAMPTZ | Record creation timestamp                                            |
| `updated_at`           | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger)                     |

### Indexes

- `idx_message_templates_organization_id` - Multi-tenant queries
- `idx_message_templates_created_by` - User's templates
- `idx_message_templates_category` - Category filtering
- `idx_message_templates_whatsapp_template_id` - WhatsApp lookups
- `idx_message_templates_is_active` - Active templates
- `idx_message_templates_usage_count` - Popular templates

### RLS Policies

- **SELECT**: Users can view templates in own organization or super admins
- **INSERT**: Users can create templates for own organization (must be creator)
- **UPDATE**: Users can update templates in own organization or super admins
- **DELETE**: Users can delete own templates or organization templates

### Use Cases

- Quick reply templates
- Automated responses
- Welcome messages
- Away messages
- Support ticket responses
- Sales follow-ups
- WhatsApp Business template integration

---

## Database Migration Instructions

### Method 1: Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `database-scripts/APPLY_MISSING_TABLES.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Review output for "✓ MIGRATION COMPLETED"
6. Changes are auto-committed by Supabase

### Method 2: Supabase Migrations

1. Place `supabase/migrations/20251014_missing_tables.sql` in migrations folder
2. Run: `npx supabase db push`
3. Verify migration in Supabase Dashboard

### Verification Queries

```sql
-- Verify all 7 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'performance_analytics', 'scheduled_reports', 'audit_logs',
    'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
  );

-- Count indexes (should be ~43)
SELECT COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'performance_analytics', 'scheduled_reports', 'audit_logs',
    'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
  );

-- Count RLS policies (should be ~19)
SELECT COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'performance_analytics', 'scheduled_reports', 'audit_logs',
    'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
  );
```

---

## Post-Migration Tasks

### 1. Remove TODO Comments

Update the following files to remove TODO comments:

- `src/app/api/analytics/performance/route.ts` - Lines 36-45, 154-204
- `src/app/api/analytics/reports/route.ts` - Lines 95-137, 408-422
- `src/app/api/auth/mfa/enroll/route.ts` - Lines 53-59

### 2. Test Performance Analytics

```typescript
// Test performance analytics insertion
const { data, error } = await supabase.from('performance_analytics').insert({
  organization_id: orgId,
  user_id: userId,
  type: 'LCP',
  value: 2500,
  timestamp: new Date().toISOString(),
})
```

### 3. Test Scheduled Reports

```typescript
// Test scheduled report creation
const { data, error } = await supabase.from('scheduled_reports').insert({
  organization_id: orgId,
  created_by: userId,
  report_type: 'conversations',
  start_date: '2025-01-01',
  end_date: '2025-01-31',
})
```

### 4. Test Audit Logging

```typescript
// Test audit log entry
const { data, error } = await supabase.from('audit_logs').insert({
  organization_id: orgId,
  actor_id: userId,
  action: 'mfa_enrollment_initiated',
  resource_type: 'profile',
  risk_level: 'medium',
})
```

---

## Security Considerations

### Multi-Tenant Isolation

All tables enforce Row Level Security (RLS) with organization-based isolation:

- Users can only access data within their organization
- Super admins have cross-organization access for platform management
- System operations (webhooks, automation) can insert without user context

### Data Retention

Consider implementing data retention policies:

- **audit_logs**: Retain for 7 years (compliance requirement)
- **performance_analytics**: Retain for 90 days (performance monitoring)
- **invoices**: Retain indefinitely (financial records)
- **usage_tracking**: Aggregate monthly, retain raw data for 13 months

### Performance Optimization

All tables include composite indexes for common query patterns:

- Organization + date + type queries (time-series)
- Organization + status queries (dashboards)
- User + resource queries (user-specific data)

---

## TypeScript Type Integration

### Update `src/types/database.ts`

Add the following type exports:

```typescript
export type PerformanceAnalytics = Database['public']['Tables']['performance_analytics']['Row']
export type ScheduledReport = Database['public']['Tables']['scheduled_reports']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type SubscriptionChange = Database['public']['Tables']['subscription_changes']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row']

// Insert types
export type PerformanceAnalyticsInsert =
  Database['public']['Tables']['performance_analytics']['Insert']
export type ScheduledReportInsert = Database['public']['Tables']['scheduled_reports']['Insert']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type SubscriptionChangeInsert =
  Database['public']['Tables']['subscription_changes']['Insert']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']
export type MessageTemplateInsert = Database['public']['Tables']['message_templates']['Insert']

// Update types
export type PerformanceAnalyticsUpdate =
  Database['public']['Tables']['performance_analytics']['Update']
export type ScheduledReportUpdate = Database['public']['Tables']['scheduled_reports']['Update']
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type SubscriptionChangeUpdate =
  Database['public']['Tables']['subscription_changes']['Update']
export type UsageTrackingUpdate = Database['public']['Tables']['usage_tracking']['Update']
export type MessageTemplateUpdate = Database['public']['Tables']['message_templates']['Update']
```

---

## Monitoring and Maintenance

### Performance Monitoring

Monitor query performance for these tables:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN (
  'performance_analytics', 'scheduled_reports', 'audit_logs',
  'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
)
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'performance_analytics', 'scheduled_reports', 'audit_logs',
  'invoices', 'subscription_changes', 'usage_tracking', 'message_templates'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Maintenance Tasks

- **Weekly**: Analyze table statistics for query optimization
- **Monthly**: Vacuum and reindex high-churn tables (performance_analytics, audit_logs)
- **Quarterly**: Review and archive old data according to retention policies

---

## Troubleshooting

### Common Issues

**Issue**: Foreign key constraint fails
**Solution**: Ensure organizations, profiles, and subscriptions tables exist before running migration

**Issue**: RLS policy denies access
**Solution**: Verify user has proper organization_id in profiles table

**Issue**: Unique constraint violation
**Solution**: Check for duplicate entries in usage_tracking (organization_id, usage_date, usage_hour, resource_type)

### Rollback (Emergency Only)

If you need to rollback (data will be lost):

```sql
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS usage_tracking CASCADE;
DROP TABLE IF EXISTS subscription_changes CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS performance_analytics CASCADE;
```

---

## Migration Summary

**Tables Created**: 7
**Indexes Created**: ~43
**RLS Policies**: ~19
**Triggers**: 4 (updated_at auto-update)
**Migration Size**: ~850 lines SQL
**Estimated Execution Time**: < 5 seconds

**Status**: ✅ Production-ready, tested, RLS-enabled, fully documented
