# 🔐 ADSapp Super Admin Production Guide

**Complete guide for super admin account creation, management, and production deployment**

---

## 🎯 Overview

This guide provides complete instructions for creating and managing super admin accounts in ADSapp for production deployment. Super admin accounts have full platform access and are essential for system administration, organization management, and platform maintenance.

---

## 🚀 Production Super Admin Setup

### Automated Super Admin Creation

```bash
# 1. Ensure production environment variables are set
cp .env.example .env.production
# Edit .env.production with your production Supabase credentials

# 2. Run the super admin creation script
NODE_ENV=production node create-super-admin.js

# 3. Verify account creation
```

### Production Credentials (SECURE)

**⚠️ PRODUCTION SUPER ADMIN CREDENTIALS**

```
Email:    superadmin@adsapp.com
Password: ADSapp2024!SuperSecure#Admin
Name:     ADSapp Super Administrator
```

**🔒 CRITICAL SECURITY REQUIREMENTS:**
- Change password immediately after first login
- Enable 2FA when available
- Store credentials in secure password manager
- Never share or commit these credentials
- Use different credentials for staging/production

---

## 🏗️ Database Setup Commands

### Method 1: Automated Script

```bash
# Production database setup
node create-super-admin.js
```

### Method 2: Manual SQL Commands

**Run these commands in your production Supabase SQL Editor:**

```sql
-- 1. Create super admin user in auth.users
DO $$
DECLARE
    user_id UUID := gen_random_uuid();
BEGIN
    -- Create auth user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        is_super_admin
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'superadmin@adsapp.com',
        crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"name": "ADSapp Super Administrator", "role": "super_admin"}'::jsonb,
        true
    );

    -- Create super admin profile
    INSERT INTO profiles (
        id,
        email,
        name,
        is_super_admin,
        super_admin_permissions,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'superadmin@adsapp.com',
        'ADSapp Super Administrator',
        true,
        ARRAY[
            'manage_organizations',
            'manage_users',
            'manage_billing',
            'manage_system_settings',
            'view_analytics',
            'manage_support',
            'audit_access',
            'manage_integrations',
            'system_maintenance'
        ],
        NOW(),
        NOW()
    );

    -- Create initial audit log
    INSERT INTO super_admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        created_at
    ) VALUES (
        user_id,
        'CREATE_SUPER_ADMIN',
        'system',
        user_id,
        '{"email": "superadmin@adsapp.com", "method": "manual_setup", "environment": "production"}'::jsonb,
        NULL,
        NOW()
    );

    -- Output the user ID for reference
    RAISE NOTICE 'Super Admin User ID: %', user_id;
END $$;
```

### Method 3: Direct Database Script

```bash
# Create and run SQL file
cat > setup-super-admin.sql << 'EOF'
-- Production Super Admin Setup
-- Run this in your production Supabase instance

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert super admin user
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'superadmin@adsapp.com',
    crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "ADSapp Super Administrator", "role": "super_admin"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID for profile creation
WITH admin_user AS (
    SELECT id FROM auth.users WHERE email = 'superadmin@adsapp.com'
)
INSERT INTO profiles (
    id,
    email,
    name,
    is_super_admin,
    super_admin_permissions,
    created_at
)
SELECT
    au.id,
    'superadmin@adsapp.com',
    'ADSapp Super Administrator',
    true,
    ARRAY['manage_organizations', 'manage_users', 'manage_billing', 'manage_system_settings', 'view_analytics', 'manage_support', 'audit_access'],
    NOW()
FROM admin_user au
ON CONFLICT (id) DO UPDATE SET
    is_super_admin = true,
    super_admin_permissions = ARRAY['manage_organizations', 'manage_users', 'manage_billing', 'manage_system_settings', 'view_analytics', 'manage_support', 'audit_access'];
EOF

# Apply the setup
psql "$DATABASE_URL" -f setup-super-admin.sql
```

---

## 🌐 Production Access Information

### Dashboard URLs

```bash
# Production URLs (replace with your domain)
PRODUCTION_DOMAIN="https://your-production-domain.com"

# Admin Dashboard URLs
Admin Dashboard:      ${PRODUCTION_DOMAIN}/admin
Organizations:        ${PRODUCTION_DOMAIN}/admin/organizations
User Management:      ${PRODUCTION_DOMAIN}/admin/users
System Settings:      ${PRODUCTION_DOMAIN}/admin/system
Analytics:           ${PRODUCTION_DOMAIN}/admin/analytics
Support Center:      ${PRODUCTION_DOMAIN}/admin/support
Audit Logs:         ${PRODUCTION_DOMAIN}/admin/audit
Billing Overview:    ${PRODUCTION_DOMAIN}/admin/billing
```

### Login Process

1. **Navigate to**: `https://your-domain.com/auth/signin`
2. **Enter credentials**:
   - Email: `superadmin@adsapp.com`
   - Password: `ADSapp2024!SuperSecure#Admin`
3. **First login actions**:
   - Change password immediately
   - Set up 2FA if available
   - Review and configure admin settings
   - Test all dashboard functionality

---

## 🔑 Super Admin Permissions

### Complete Permission Set

```json
{
  "super_admin_permissions": [
    "manage_organizations",     // Create, modify, delete organizations
    "manage_users",            // Full user management across all tenants
    "manage_billing",          // Subscription and payment management
    "manage_system_settings",  // Platform-wide configuration
    "view_analytics",          // Access to all platform analytics
    "manage_support",          // Support ticket management
    "audit_access",           // View and manage audit logs
    "manage_integrations",    // API keys and third-party integrations
    "system_maintenance"      // Database and system maintenance
  ]
}
```

### Capability Matrix

| Function | Description | Access Level |
|----------|-------------|--------------|
| **Organization Management** | Create, modify, suspend organizations | Full Control |
| **User Administration** | Manage users across all tenants | Full Control |
| **Billing Operations** | Subscription management, refunds | Full Control |
| **System Configuration** | Platform settings, feature flags | Full Control |
| **Analytics & Reporting** | Access to all platform metrics | Read/Export |
| **Support Management** | Handle customer support requests | Full Control |
| **Audit & Compliance** | View all system audit logs | Read Only |
| **API Management** | Manage API keys and integrations | Full Control |
| **Database Maintenance** | Direct database access for maintenance | Full Control |

---

## 🛠️ Production Validation Checklist

### Pre-Deployment Validation

```bash
# 1. Verify environment variables
echo "Checking environment variables..."
[ -n "$SUPABASE_URL" ] && echo "✅ SUPABASE_URL set" || echo "❌ SUPABASE_URL missing"
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "✅ SERVICE_ROLE_KEY set" || echo "❌ SERVICE_ROLE_KEY missing"
[ -n "$SUPABASE_ANON_KEY" ] && echo "✅ ANON_KEY set" || echo "❌ ANON_KEY missing"

# 2. Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('profiles').select('count').then(r => console.log('✅ Database connection OK')).catch(e => console.log('❌ Database connection failed'));
"

# 3. Verify schema
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'organizations', 'super_admin_audit_logs');"
```

### Post-Creation Validation

```bash
# 1. Verify super admin account exists
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('profiles').select('*').eq('email', 'superadmin@adsapp.com').then(r => {
  if(r.data && r.data.length > 0) {
    console.log('✅ Super admin profile exists');
    console.log('✅ Super admin status:', r.data[0].is_super_admin);
    console.log('✅ Permissions:', r.data[0].super_admin_permissions);
  } else {
    console.log('❌ Super admin profile not found');
  }
});
"

# 2. Test authentication
curl -X POST "https://your-domain.com/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@adsapp.com",
    "password": "ADSapp2024!SuperSecure#Admin"
  }'

# 3. Verify admin dashboard access
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-domain.com/api/admin/dashboard"
```

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Super Admin Creation Failed

**Error**: "Auth creation failed" or "Profile creation failed"

**Solutions**:
```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT version();"

# Verify table exists
psql "$DATABASE_URL" -c "\dt profiles"

# Check for existing user
psql "$DATABASE_URL" -c "SELECT email FROM auth.users WHERE email = 'superadmin@adsapp.com';"

# Manual cleanup if needed
psql "$DATABASE_URL" -c "DELETE FROM auth.users WHERE email = 'superadmin@adsapp.com';"
psql "$DATABASE_URL" -c "DELETE FROM profiles WHERE email = 'superadmin@adsapp.com';"
```

#### 2. Cannot Access Admin Dashboard

**Error**: 403 Forbidden or "Insufficient permissions"

**Solutions**:
```sql
-- Verify super admin status
SELECT
  email,
  is_super_admin,
  super_admin_permissions
FROM profiles
WHERE email = 'superadmin@adsapp.com';

-- Update permissions if needed
UPDATE profiles
SET
  is_super_admin = true,
  super_admin_permissions = ARRAY['manage_organizations', 'manage_users', 'manage_billing', 'manage_system_settings', 'view_analytics', 'manage_support', 'audit_access']
WHERE email = 'superadmin@adsapp.com';
```

#### 3. Authentication Issues

**Error**: "Invalid credentials" or "User not found"

**Solutions**:
```sql
-- Check if user exists in auth
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'superadmin@adsapp.com';

-- Reset password if needed
UPDATE auth.users
SET encrypted_password = crypt('ADSapp2024!SuperSecure#Admin', gen_salt('bf'))
WHERE email = 'superadmin@adsapp.com';

-- Confirm email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'superadmin@adsapp.com';
```

---

## 🔒 Production Security Requirements

### Immediate Security Actions

1. **Change Default Password**
   ```bash
   # After first login, immediately change password to something secure
   # Use a password manager to generate and store
   ```

2. **Enable 2FA**
   ```bash
   # Enable two-factor authentication if available
   # Use authenticator app like Google Authenticator or Authy
   ```

3. **Secure Environment Variables**
   ```bash
   # Ensure production .env is not committed to git
   echo ".env.production" >> .gitignore

   # Use Vercel environment variables for production
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add SUPABASE_ANON_KEY
   ```

4. **IP Allowlisting**
   ```bash
   # Configure Supabase to only allow connections from known IPs
   # Set up VPN for admin access if needed
   ```

### Monitoring & Alerting

```sql
-- Create security monitoring view
CREATE OR REPLACE VIEW super_admin_security_events AS
SELECT
  sal.created_at,
  sal.action,
  sal.ip_address,
  sal.user_agent,
  sal.details,
  p.email as admin_email
FROM super_admin_audit_logs sal
JOIN profiles p ON sal.admin_id = p.id
WHERE sal.created_at > NOW() - INTERVAL '30 days'
ORDER BY sal.created_at DESC;

-- Set up alerts for suspicious activity
-- (Configure with your monitoring system)
```

---

## 📊 Production Monitoring

### Health Check Endpoints

```bash
# Admin system health check
curl "https://your-domain.com/api/admin/health"

# Database connection check
curl "https://your-domain.com/api/health/database"

# Super admin functionality check
curl -H "Authorization: Bearer JWT_TOKEN" \
  "https://your-domain.com/api/admin/system/status"
```

### Key Metrics to Monitor

1. **Super Admin Activity**
   - Login attempts and failures
   - Administrative actions performed
   - Unusual access patterns

2. **System Performance**
   - Database query performance
   - API response times
   - Memory and CPU usage

3. **Security Events**
   - Failed authentication attempts
   - Privilege escalation attempts
   - Unauthorized access attempts

---

## 📋 Final Production Checklist

### Pre-Go-Live Verification

- [ ] Super admin account created successfully
- [ ] Default password changed
- [ ] 2FA enabled (if available)
- [ ] Admin dashboard accessible
- [ ] All permissions working correctly
- [ ] Audit logging functional
- [ ] Security monitoring active
- [ ] Environment variables secured
- [ ] Backup procedures tested
- [ ] Emergency access plan documented

### Post-Go-Live Actions

- [ ] First login completed successfully
- [ ] Admin functions tested in production
- [ ] Security alerts configured
- [ ] Monitoring dashboards active
- [ ] Documentation updated with production URLs
- [ ] Team trained on admin procedures
- [ ] Emergency contacts documented
- [ ] Incident response plan activated

---

## 📞 Emergency Contacts & Procedures

### Critical Issues

**Database Access Issues**:
- Contact: Supabase Support
- Emergency: Use database direct connection
- Backup: Secondary admin account

**Security Incidents**:
- Immediately change super admin password
- Review audit logs for unauthorized access
- Contact security team
- Document incident for compliance

**System Outages**:
- Check Vercel status page
- Verify Supabase availability
- Review error logs
- Contact support teams

---

**🎯 Production Ready**: This guide provides everything needed for secure super admin deployment in production. Follow all security requirements and monitoring procedures for optimal security and reliability.

---

*Last updated: Production Deployment*
*Environment: Production*
*Security Level: Enterprise*