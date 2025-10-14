# Super Admin System Guide

## Overview

This guide provides comprehensive instructions for implementing, managing, and operating the ADSapp Super Admin system. The super admin system provides cross-tenant administrative capabilities for platform oversight, user management, and system monitoring.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Security Model](#security-model)
3. [Installation & Setup](#installation--setup)
4. [Creating Super Admin Accounts](#creating-super-admin-accounts)
5. [Dashboard & Monitoring](#dashboard--monitoring)
6. [User Management](#user-management)
7. [Organization Management](#organization-management)
8. [API Reference](#api-reference)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)
11. [Audit & Compliance](#audit--compliance)

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Admin System                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Dashboard     │ │ User Management │ │ Org Management  │ │
│ │   - Metrics     │ │ - CRUD Ops      │ │ - Suspend/Enable│ │
│ │   - Analytics   │ │ - Role Changes  │ │ - Billing View  │ │
│ │   - Health      │ │ - Cross-tenant  │ │ - Usage Stats   │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   API Layer     │ │ Security Layer  │ │ Audit System    │ │
│ │   - REST APIs   │ │ - Auth Check    │ │ - Action Logs   │ │
│ │   - Validation  │ │ - Permissions   │ │ - Event Track   │ │
│ │   - Rate Limit  │ │ - RLS Override  │ │ - Compliance    │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Database      │ │ Authentication  │ │ Monitoring      │ │
│ │   - RLS Bypass  │ │ - Supabase Auth │ │ - Health Checks │ │
│ │   - Cross-tenant│ │ - Session Mgmt  │ │ - Alerts        │ │
│ │   - Audit Trail │ │ - 2FA Support   │ │ - Performance   │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

Key tables for super admin functionality:

- `profiles` - Extended with `is_super_admin` flag and super admin role
- `organizations` - Platform organizations with management flags
- `super_admin_audit_logs` - Comprehensive audit trail
- `admin_sessions` - Session tracking and security
- `system_alerts` - Platform-wide notifications

## Security Model

### Authentication Flow

1. **Initial Authentication**: Standard Supabase auth with email/password
2. **Super Admin Verification**: Check `is_super_admin` flag in profiles table
3. **Permission Validation**: Verify specific admin permissions
4. **Session Management**: Track admin sessions with enhanced security
5. **Action Logging**: Log all administrative actions for audit

### Permission Levels

- **Platform Admin**: Full cross-tenant access
- **Organization Admin**: Single tenant management
- **Support Admin**: Read-only cross-tenant access
- **Billing Admin**: Financial and subscription management

### Security Features

- **Row Level Security (RLS) Override**: Super admins bypass tenant isolation
- **Audit Logging**: All actions tracked with timestamps and IP addresses
- **Session Monitoring**: Active session tracking with timeout controls
- **Rate Limiting**: API rate limits with admin exemptions
- **Multi-Factor Authentication**: Optional 2FA for enhanced security

## Installation & Setup

### Prerequisites

- Node.js 18+
- Supabase project with service role key
- Environment variables configured
- Database migrations applied

### Database Setup

1. **Apply Migrations**:
   ```bash
   npx supabase db reset
   # or manually apply migrations
   ```

2. **Verify Schema**:
   ```bash
   node scripts/test-super-admin-system.js
   ```

### Environment Configuration

Create `.env.admin.local`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_FULL_NAME=Your Name
SUPER_ADMIN_ORG_NAME=Your Organization

# Security Settings
ENCRYPTION_KEY=your_32_character_key
JWT_SECRET=your_jwt_secret
SKIP_EMAIL_CONFIRMATION=true
```

## Creating Super Admin Accounts

### Method 1: Secure Script (Recommended)

```bash
# Copy environment template
cp .env.admin.example .env.admin.local

# Edit with your values
nano .env.admin.local

# Run secure creation script
node scripts/create-secure-super-admin.js
```

### Method 2: Manual Setup

1. **Create User in Supabase Dashboard**:
   - Go to Authentication > Users
   - Create user with desired email
   - Note the User ID

2. **Create Organization**:
   ```sql
   INSERT INTO organizations (name, slug, subscription_tier, is_active)
   VALUES ('System Administration', 'system-admin', 'enterprise', true);
   ```

3. **Create Profile**:
   ```sql
   INSERT INTO profiles (id, email, full_name, organization_id, role, is_super_admin)
   VALUES (
     'user-id-from-step-1',
     'admin@yourdomain.com',
     'Super Administrator',
     (SELECT id FROM organizations WHERE slug = 'system-admin'),
     'owner',
     true
   );
   ```

### Verification

Test super admin access:

```bash
# Run system tests
node scripts/test-super-admin-system.js

# Check admin dashboard
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3000/api/admin/dashboard
```

## Dashboard & Monitoring

### Accessing the Dashboard

1. **Login**: Navigate to `/auth/signin`
2. **Dashboard**: Access admin dashboard at `/admin`
3. **Verification**: System automatically verifies super admin status

### Dashboard Features

#### Platform Overview
- Total organizations and active count
- User statistics across all tenants
- Message and conversation metrics
- Revenue and subscription distribution

#### System Health
- Database connectivity status
- API response times
- Error rates and alerts
- Performance metrics

#### Recent Activity
- New organization registrations
- User activity across tenants
- System alerts and warnings
- Failed login attempts

### Real-time Monitoring

The dashboard provides real-time updates on:
- Active user sessions
- System resource usage
- Database performance
- API endpoint health

## User Management

### Listing Users

**API Endpoint**: `GET /api/admin/user-management`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `search`: Search by email or name
- `role`: Filter by role (owner, admin, agent)
- `status`: Filter by status (active, inactive)
- `organization_id`: Filter by organization

**Example**:
```bash
curl -H "Authorization: Bearer JWT" \
  "http://localhost:3000/api/admin/user-management?page=1&limit=50&role=admin"
```

### User Operations

#### Update User
```bash
curl -X POST \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_user",
    "userId": "user-id",
    "userData": {
      "full_name": "Updated Name",
      "role": "admin",
      "organization_id": "org-id"
    }
  }' \
  http://localhost:3000/api/admin/user-management
```

#### Deactivate User
```bash
curl -X POST \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deactivate_user",
    "userId": "user-id"
  }' \
  http://localhost:3000/api/admin/user-management
```

#### Change User Role
```bash
curl -X POST \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change_role",
    "userId": "user-id",
    "userData": {
      "role": "admin"
    }
  }' \
  http://localhost:3000/api/admin/user-management
```

#### Reset Password
```bash
curl -X POST \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset_password",
    "userId": "user-id"
  }' \
  http://localhost:3000/api/admin/user-management
```

## Organization Management

### Organization Operations

#### Suspend Organization
```sql
UPDATE organizations
SET is_active = false, updated_at = NOW()
WHERE id = 'org-id';
```

#### View Organization Details
```sql
SELECT
  o.*,
  COUNT(p.id) as user_count,
  COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_users
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
WHERE o.id = 'org-id'
GROUP BY o.id;
```

#### Billing Overview
```sql
SELECT
  o.name,
  o.subscription_tier,
  o.subscription_status,
  o.trial_ends_at,
  CASE
    WHEN o.subscription_tier = 'starter' THEN 29
    WHEN o.subscription_tier = 'professional' THEN 99
    WHEN o.subscription_tier = 'enterprise' THEN 299
  END as monthly_cost
FROM organizations o
WHERE o.is_active = true;
```

## API Reference

### Authentication

All admin APIs require authentication with a valid JWT token containing super admin permissions.

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Endpoints

#### Dashboard API
- **GET** `/api/admin/dashboard` - Platform metrics and overview
- **POST** `/api/admin/dashboard` - Historical metrics (with timeRange)

#### User Management API
- **GET** `/api/admin/user-management` - List users with filtering
- **POST** `/api/admin/user-management` - User operations (CRUD)

#### Organization Management API
- **GET** `/api/admin/organizations` - List organizations
- **POST** `/api/admin/organizations` - Organization operations

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Security Best Practices

### Account Security

1. **Strong Passwords**: Minimum 12 characters with complexity requirements
2. **Regular Rotation**: Change admin passwords every 90 days
3. **Multi-Factor Authentication**: Enable 2FA when available
4. **Session Management**: Regular session timeout and re-authentication

### Access Control

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Regular Access Reviews**: Quarterly review of admin access
3. **Account Monitoring**: Monitor for unusual admin activity
4. **IP Restrictions**: Limit admin access to specific IP ranges

### Data Protection

1. **Audit Logging**: All admin actions must be logged
2. **Data Export Controls**: Restrict and monitor data exports
3. **Encryption**: Ensure all sensitive data is encrypted
4. **Backup Security**: Secure admin account backup procedures

## Troubleshooting

### Common Issues

#### "Unauthorized" Error
- Verify JWT token is valid and not expired
- Check that user has `is_super_admin = true` in profiles table
- Ensure proper role assignment

#### Dashboard Not Loading
- Check database connectivity
- Verify API endpoints are running
- Review browser console for JavaScript errors

#### Cross-Tenant Access Denied
- Confirm RLS policies allow super admin override
- Check organization relationships in database
- Verify admin permissions are correctly set

#### Performance Issues
- Monitor database query performance
- Check for missing indexes on large tables
- Review API rate limiting configuration

### Diagnostic Commands

```bash
# Test database connectivity
node scripts/test-super-admin-system.js

# Check profile permissions
psql -c "SELECT id, email, role, is_super_admin FROM profiles WHERE is_super_admin = true;"

# View recent audit logs
psql -c "SELECT * FROM super_admin_audit_logs ORDER BY created_at DESC LIMIT 10;"

# Check system health
curl http://localhost:3000/api/health
```

## Audit & Compliance

### Audit Trail

All super admin actions are logged with:
- User ID and email
- Action performed
- Target resource (user, organization, etc.)
- Timestamp with timezone
- IP address and user agent
- Before/after values for updates

### Compliance Features

1. **SOC 2 Compliance**: Audit logs support SOC 2 requirements
2. **GDPR Compliance**: Data export and deletion capabilities
3. **Data Retention**: Configurable audit log retention periods
4. **Access Reports**: Regular access and usage reports

### Audit Queries

#### Recent Admin Actions
```sql
SELECT
  admin_id,
  action,
  target_type,
  target_id,
  created_at,
  ip_address
FROM super_admin_audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

#### Failed Login Attempts
```sql
SELECT
  admin_id,
  ip_address,
  user_agent,
  created_at
FROM admin_sessions
WHERE success = false
AND created_at > NOW() - INTERVAL '7 days';
```

#### Data Export Events
```sql
SELECT
  admin_id,
  details,
  created_at
FROM super_admin_audit_logs
WHERE action LIKE '%export%'
ORDER BY created_at DESC;
```

## Maintenance Procedures

### Regular Maintenance

1. **Weekly**:
   - Review audit logs for unusual activity
   - Check system health metrics
   - Verify backup procedures

2. **Monthly**:
   - Update admin passwords
   - Review user access permissions
   - Update documentation

3. **Quarterly**:
   - Security assessment
   - Access control review
   - Performance optimization

### Emergency Procedures

#### Suspected Security Breach
1. Immediately revoke all admin sessions
2. Change all admin passwords
3. Review audit logs for unauthorized actions
4. Document and report incident

#### System Outage
1. Check database connectivity
2. Verify API service status
3. Review error logs
4. Escalate to development team if needed

## Support & Contact

For technical support or security concerns:

- **Development Team**: Contact via internal ticketing system
- **Security Issues**: security@adsapp.com
- **Emergency**: Use emergency contact procedures

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Next Review**: March 2025