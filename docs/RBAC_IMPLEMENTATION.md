# RBAC Implementation Guide

## Overview

ADSapp implements a comprehensive Role-Based Access Control (RBAC) system with:
- **Hierarchical roles** with priority-based resolution
- **Granular permissions** for 50+ resource/action combinations
- **Conditional access** based on ownership, team, organization
- **Permission overrides** for exceptional cases
- **Complete audit trail** of all permission changes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RBAC System                             │
├─────────────────────────────────────────────────────────────┤
│  Roles (Priority-based)                                     │
│  ├─ Super Admin (1000)                                      │
│  ├─ Organization Owner (900)                                │
│  ├─ Organization Admin (800)                                │
│  ├─ Team Lead (700)                                         │
│  ├─ Supervisor (650)                                        │
│  ├─ Agent (600)                                             │
│  └─ Billing Manager (500)                                   │
├─────────────────────────────────────────────────────────────┤
│  Permissions (Resource + Action + Conditions)               │
│  ├─ conversations:read:organization                         │
│  ├─ contacts:update:own                                     │
│  └─ templates:use:organization                              │
├─────────────────────────────────────────────────────────────┤
│  Permission Overrides (User-specific exceptions)            │
│  └─ user_123:contacts:delete → DENIED                       │
├─────────────────────────────────────────────────────────────┤
│  Audit Log (Complete history)                               │
│  └─ All role assignments, changes, denials                  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

**roles**
- Defines roles with permissions and priority
- System roles cannot be modified/deleted
- Organization-specific custom roles supported

**user_roles**
- Many-to-many relationship between users and roles
- Support for role expiration
- Tracks who granted the role

**permission_overrides**
- User-specific permission exceptions
- Can allow or deny specific actions
- Optional resource-level granularity

**rbac_audit_log**
- Complete audit trail
- Records all permission changes
- Includes actor, target, and metadata

## Role Hierarchy

### System Roles

**Super Admin (Priority: 1000)**
- Platform-wide access
- All resources, all actions
- Cannot be deleted or modified

**Organization Owner (Priority: 900)**
- Full organizational control
- Manage all resources within organization
- Assign roles, manage billing

**Organization Admin (Priority: 800)**
- Management access
- Cannot manage ownership or billing
- Full conversation and contact management

**Team Lead (Priority: 700)**
- Team-level management
- Access to team resources only
- Limited administrative capabilities

**Supervisor (Priority: 650)**
- Monitoring and reporting
- Read-only access to conversations
- Full report generation

**Agent (Priority: 600)**
- Conversation handling
- Own conversations and contacts
- Template usage

**Billing Manager (Priority: 500)**
- Financial management
- Billing and subscription access
- Analytics and reports

## Permission System

### Permission Structure

```typescript
{
  resource: 'conversations',
  action: 'update',
  conditions: {
    own: true,              // Only own resources
    team: true,             // Team resources
    organization: true,     // All org resources
    tags: ['urgent'],       // Specific tags
    status: ['open']        // Specific statuses
  }
}
```

### Resources

- **organizations** - Organization management
- **users** - User management
- **roles** - Role management
- **conversations** - Conversation management
- **contacts** - Contact management
- **messages** - Message handling
- **templates** - Template management
- **automation** - Automation rules
- **analytics** - Analytics access
- **reports** - Report generation
- **billing** - Billing management
- **settings** - Settings configuration
- **webhooks** - Webhook management
- **integrations** - Integration management
- **api_keys** - API key management
- **audit_logs** - Audit log access

### Actions

- **create** - Create new resources
- **read** - View resources
- **update** - Modify resources
- **delete** - Remove resources
- **list** - List resources
- **export** - Export data
- **import** - Import data
- **use** - Use resource (e.g., templates)
- **assign** - Assign resources
- **close** - Close resources (e.g., conversations)
- **archive** - Archive resources
- **restore** - Restore archived resources
- **\*** - All actions

### Conditions

**own**
- User owns the resource
- Checks: `created_by`, `assigned_to`, `user_id`

**team**
- Resource belongs to user's team
- Checks: `team_id` matching

**organization**
- Resource belongs to user's organization
- Checks: `organization_id` matching

**tags**
- Resource has specific tags
- Array-based matching

**status**
- Resource has specific status
- Status value matching

## Usage

### Check Permission

```typescript
import { hasPermission } from '@/lib/rbac'

const allowed = await hasPermission({
  userId: user.id,
  organizationId: profile.organization_id,
  resource: 'conversations',
  action: 'update',
  resourceId: conversationId,
  resourceData: conversation,
})

if (!allowed) {
  return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
}
```

### Middleware Protection

```typescript
import { withRbac } from '@/lib/rbac'

async function handler(request: NextRequest, context: any) {
  // Handler logic - permission already checked
  return NextResponse.json({ success: true })
}

export const PUT = withRbac(handler, {
  resource: 'conversations',
  action: 'update',
  getResourceId: async (request) => {
    const url = new URL(request.url)
    return url.pathname.split('/').pop()
  },
  getResourceData: async (request, context, resourceId) => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', resourceId)
      .single()
    return data
  },
})
```

### Pre-configured Middleware

```typescript
import {
  withConversationWrite,
  withContactRead,
  withTemplateWrite,
  withAnalyticsRead,
  withAdminAccess,
  withBillingAccess,
} from '@/lib/rbac'

// Automatically checks appropriate permissions
export const GET = withConversationWrite(handler)
```

### Inside Handlers

```typescript
import { requirePermission } from '@/lib/rbac'

async function handler(request: NextRequest, context: any) {
  const { user, profile } = context

  // Require permission (throws if denied)
  await requirePermission(
    user.id,
    profile.organization_id,
    'contacts',
    'export'
  )

  // Permission granted, proceed
  const contacts = await exportContacts()
  return NextResponse.json(contacts)
}
```

## Role Management

### Create Role

```typescript
import { createRole } from '@/lib/rbac'

const role = await createRole(
  organizationId,
  'customer_support',
  'Customer support specialist',
  [
    { resource: 'conversations', action: 'read', conditions: { organization: true } },
    { resource: 'conversations', action: 'update', conditions: { own: true } },
    { resource: 'contacts', action: 'read', conditions: { organization: true } },
    { resource: 'templates', action: 'use', conditions: { organization: true } },
  ],
  650, // Priority
  currentUserId
)
```

### Assign Role

```typescript
import { assignRole } from '@/lib/rbac'

await assignRole(
  userId,
  roleId,
  grantedByUserId,
  new Date('2026-01-01') // Optional expiration
)
```

### Revoke Role

```typescript
import { revokeRole } from '@/lib/rbac'

await revokeRole(userId, roleId)
```

### Check User Role

```typescript
import { hasRole, isSuperAdmin, isOrganizationOwner } from '@/lib/rbac'

if (await isSuperAdmin(userId)) {
  // Super admin access
}

if (await hasRole(userId, 'team_lead')) {
  // Team lead access
}
```

## Permission Overrides

### Grant Override

```sql
INSERT INTO permission_overrides (
  user_id,
  resource,
  action,
  allowed,
  reason,
  created_by
) VALUES (
  'user-id',
  'contacts',
  'delete',
  false, -- Deny deletion
  'User accidentally deleted important contacts',
  'admin-id'
);
```

### Check Override

```typescript
// Overrides are automatically checked in hasPermission()
// They take precedence over role permissions
```

## Audit Trail

### View Audit Logs

```sql
SELECT
  event_type,
  actor_id,
  target_user_id,
  role_id,
  permission_data,
  created_at
FROM rbac_audit_log
WHERE organization_id = 'org-id'
ORDER BY created_at DESC
LIMIT 100;
```

### Audit Events

- `user_roles_created` - Role assigned
- `user_roles_updated` - Role modified
- `user_roles_deleted` - Role revoked
- `permission_overrides_created` - Override added
- `permission_overrides_updated` - Override modified
- `permission_overrides_deleted` - Override removed

## Permission Matrix

### Organization Owner

| Resource | Create | Read | Update | Delete | Special |
|----------|--------|------|--------|--------|---------|
| Organizations | ✅ | ✅ | ✅ | ✅ | - |
| Users | ✅ | ✅ | ✅ | ✅ | - |
| Roles | ✅ | ✅ | ✅ | ✅ | - |
| Conversations | ✅ | ✅ | ✅ | ✅ | Assign, Close |
| Contacts | ✅ | ✅ | ✅ | ✅ | Export, Import |
| Templates | ✅ | ✅ | ✅ | ✅ | Use |
| Automation | ✅ | ✅ | ✅ | ✅ | - |
| Analytics | - | ✅ | - | - | Export |
| Billing | ✅ | ✅ | ✅ | - | - |
| Settings | ✅ | ✅ | ✅ | - | - |

### Agent

| Resource | Create | Read | Update | Delete | Special |
|----------|--------|------|--------|--------|---------|
| Conversations | ✅ | ✅ | ✅ (own) | ❌ | Close (own) |
| Contacts | ✅ | ✅ | ✅ (own) | ❌ | - |
| Messages | ✅ (own) | ✅ | ❌ | ❌ | - |
| Templates | ❌ | ✅ | ❌ | ❌ | Use |

**(own)** = Only resources owned by the user

## Best Practices

1. **Principle of Least Privilege**
   - Grant minimum permissions needed
   - Use specific conditions
   - Review permissions regularly

2. **Role Hierarchy**
   - Use priority to control precedence
   - Higher priority = more powerful
   - Don't create conflicting roles

3. **Permission Overrides**
   - Use sparingly for exceptions
   - Always document reason
   - Set expiration when temporary

4. **Audit Trail**
   - Review logs regularly
   - Investigate permission denials
   - Track role changes

5. **Custom Roles**
   - Create for specific needs
   - Don't duplicate system roles
   - Use clear, descriptive names

## Performance Optimization

### Caching

```typescript
// Cache user permissions
const permissions = await getUserPermissions(userId)
// Store in Redis with 5-minute TTL
await redis.set(`permissions:${userId}`, JSON.stringify(permissions), 'EX', 300)
```

### Database Indexes

All critical queries are indexed:
- `user_roles(user_id, is_active)`
- `roles(organization_id, priority)`
- `permission_overrides(user_id, resource, action)`

### Permission Check Metrics

```typescript
import { recordRbacEvent } from '@/lib/telemetry'

// Automatic metrics recording
- rbac.permission.checks (total checks)
- rbac.permission.denied (denials)
- rbac.role.changes (role modifications)
```

## Troubleshooting

### Permission Denied

1. Check user's roles: `SELECT * FROM user_roles WHERE user_id = 'user-id'`
2. Check role permissions: `SELECT permissions FROM roles WHERE id = 'role-id'`
3. Check for overrides: `SELECT * FROM permission_overrides WHERE user_id = 'user-id'`
4. Review audit log: `SELECT * FROM rbac_audit_log WHERE target_user_id = 'user-id'`

### Role Not Working

1. Verify role is active: `is_active = true`
2. Check expiration: `expires_at IS NULL OR expires_at > NOW()`
3. Verify organization match
4. Check role priority

### Override Not Working

1. Check expiration: `expires_at IS NULL OR expires_at > NOW()`
2. Verify resource and action match exactly
3. Check resource_id specificity

## Migration from Old System

```typescript
// Map old roles to new RBAC system
const roleMapping = {
  'admin': 'organization_admin',
  'manager': 'team_lead',
  'support': 'agent',
}

// Migrate users
for (const user of users) {
  const newRole = roleMapping[user.old_role]
  await assignRole(user.id, getRoleId(newRole), 'system')
}
```

## API Endpoints

- `GET /api/rbac/roles` - List roles
- `POST /api/rbac/roles` - Create role
- `PUT /api/rbac/roles/:id` - Update role
- `DELETE /api/rbac/roles/:id` - Delete role
- `POST /api/rbac/users/:id/roles` - Assign role
- `DELETE /api/rbac/users/:id/roles/:roleId` - Revoke role
- `GET /api/rbac/audit-logs` - View audit logs
- `POST /api/rbac/overrides` - Create override

## Support

For issues or questions:
- Check audit logs for permission denials
- Review role permissions in database
- Contact security team for override requests
- See TypeScript types in `/src/lib/rbac/permissions.ts`
