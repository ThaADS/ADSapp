# Team Management API Documentation

Complete documentation for the ADSapp Team Management API system.

## Overview

The Team Management API provides comprehensive functionality for managing team members, invitations, roles, and permissions in a multi-tenant SaaS environment.

### Features

- **Role-Based Access Control (RBAC)** with 4-tier hierarchy
- **Email-based Invitations** with secure token validation
- **Permission Management** with granular control
- **Audit Logging** for all team operations
- **Multi-tenant Isolation** with organization-level security
- **Self-service Management** with validation rules

## Role Hierarchy

### Role Levels (Highest to Lowest)

1. **Owner** (Level 4)
   - Full system access including billing
   - Can manage all team members
   - Can assign any role
   - Cannot be removed if last owner

2. **Admin** (Level 3)
   - Full access except billing
   - Can manage team members below admin level
   - Can assign roles up to admin level
   - Cannot modify owners

3. **Agent** (Level 2)
   - Handle conversations and contacts
   - Use message templates
   - View analytics
   - Cannot manage team or settings

4. **Viewer** (Level 1)
   - Read-only access
   - View conversations, contacts, and analytics
   - Cannot modify any data

### Default Permissions by Role

#### Owner Permissions
```typescript
{
  'team.manage': true,
  'conversations.*': true,
  'contacts.*': true,
  'templates.*': true,
  'automation.*': true,
  'analytics.*': true,
  'billing.*': true,
  'settings.*': true
}
```

#### Admin Permissions
```typescript
{
  'team.manage': true,
  'conversations.*': true,
  'contacts.*': true,
  'templates.*': true,
  'automation.*': true,
  'analytics.view': true,
  'analytics.export': true,
  'settings.manage': true
}
```

#### Agent Permissions
```typescript
{
  'conversations.view': true,
  'conversations.manage': true,
  'contacts.view': true,
  'contacts.manage': true,
  'templates.view': true,
  'templates.use': true,
  'analytics.view': true,
  'settings.view': true
}
```

#### Viewer Permissions
```typescript
{
  'conversations.view': true,
  'contacts.view': true,
  'templates.view': true,
  'analytics.view': true,
  'settings.view': true
}
```

## API Endpoints

### 1. List Team Members

**Endpoint:** `GET /api/team/members`

**Description:** Retrieve list of team members for an organization.

**Authentication:** Required

**Query Parameters:**
- `organization_id` (optional, UUID): Organization ID (defaults to user's organization)
- `role` (optional, enum): Filter by role (`owner`, `admin`, `agent`, `viewer`)
- `search` (optional, string): Search by email or name
- `limit` (optional, number): Results per page (default: 50, max: 100)
- `offset` (optional, number): Pagination offset (default: 0)

**Response:**
```typescript
{
  members: TeamMember[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example:**
```bash
GET /api/team/members?role=agent&limit=20&offset=0
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Profile not found

---

### 2. Create Team Invitation

**Endpoint:** `POST /api/team/invitations`

**Description:** Invite a new team member via email.

**Authentication:** Required

**Required Permissions:** `team.manage` or role `owner`/`admin`

**Request Body:**
```typescript
{
  email: string;          // Valid email address
  role: UserRole;         // 'owner' | 'admin' | 'agent' | 'viewer'
  permissions?: object;   // Optional custom permissions
}
```

**Response:**
```typescript
{
  invitation: TeamInvitation;
  message: string;
}
```

**Example:**
```bash
POST /api/team/invitations
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "agent",
  "permissions": {
    "automation.view": true
  }
}
```

**Status Codes:**
- `201`: Invitation created
- `400`: Invalid request data
- `401`: Unauthorized
- `403`: Insufficient permissions or cannot assign role
- `409`: User already member or invitation pending

**Business Rules:**
- Cannot invite existing team members
- Cannot have multiple pending invitations for same email
- Inviter can only assign roles at their level or below
- Invitation expires in 7 days
- Email sent automatically via Resend

---

### 3. List Team Invitations

**Endpoint:** `GET /api/team/invitations`

**Description:** Retrieve list of team invitations.

**Authentication:** Required

**Required Permissions:** `team.manage` or role `owner`/`admin`

**Query Parameters:**
- `organization_id` (optional, UUID): Organization ID
- `status` (optional, enum): Filter by status (`pending`, `expired`, `accepted`, `cancelled`)
- `limit` (optional, number): Results per page (default: 50, max: 100)
- `offset` (optional, number): Pagination offset (default: 0)

**Response:**
```typescript
{
  invitations: TeamInvitation[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example:**
```bash
GET /api/team/invitations?status=pending
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Insufficient permissions

---

### 4. Cancel Team Invitation

**Endpoint:** `DELETE /api/team/invitations/[id]`

**Description:** Cancel a pending invitation.

**Authentication:** Required

**Required Permissions:** `team.manage` or be the inviter

**URL Parameters:**
- `id` (required, UUID): Invitation ID

**Response:**
```typescript
{
  message: string;
}
```

**Example:**
```bash
DELETE /api/team/invitations/550e8400-e29b-41d4-a716-446655440000
```

**Status Codes:**
- `200`: Invitation cancelled
- `400`: Invalid invitation ID format
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: Invitation not found
- `422`: Cannot cancel (already accepted/cancelled)

**Business Rules:**
- Can only cancel pending invitations
- Cannot cancel accepted invitations
- Must be in same organization
- Must have permission or be the inviter

---

### 5. Update Team Member

**Endpoint:** `PUT /api/team/members/[id]`

**Description:** Update team member role and/or permissions.

**Authentication:** Required

**Required Permissions:** `team.manage` or role `owner`/`admin`

**URL Parameters:**
- `id` (required, UUID): Member ID

**Request Body:**
```typescript
{
  role?: UserRole;           // Optional new role
  permissions?: object;      // Optional custom permissions
}
```

**Response:**
```typescript
{
  member: TeamMember;
  message: string;
}
```

**Example:**
```bash
PUT /api/team/members/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "role": "admin",
  "permissions": {
    "billing.view": true
  }
}
```

**Status Codes:**
- `200`: Member updated
- `400`: Invalid request data or permissions
- `401`: Unauthorized
- `403`: Insufficient permissions or invalid role change
- `404`: Member not found

**Business Rules:**
- Cannot modify your own role
- Can only modify members below your role level
- Can only assign roles at your level or below
- Custom permissions merged with role defaults
- Audit log created for all changes

---

### 6. Remove Team Member

**Endpoint:** `DELETE /api/team/members/[id]`

**Description:** Remove a team member from the organization.

**Authentication:** Required

**Required Permissions:** `team.manage` or role `owner`/`admin`

**URL Parameters:**
- `id` (required, UUID): Member ID

**Response:**
```typescript
{
  message: string;
}
```

**Example:**
```bash
DELETE /api/team/members/550e8400-e29b-41d4-a716-446655440000
```

**Status Codes:**
- `200`: Member removed
- `400`: Invalid member ID format
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: Member not found
- `422`: Cannot remove (self or last owner)

**Business Rules:**
- Cannot remove yourself
- Cannot remove last owner
- Can only remove members below your role level
- Must be in same organization
- Audit log created for removal

## Database Schema

### team_invitations Table

```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  permissions JSONB DEFAULT '{}',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_team_invitations_org_id` on `organization_id`
- `idx_team_invitations_token` on `token`
- `idx_team_invitations_email` on `email`
- `idx_pending_invitation` (unique) on `organization_id, email` where pending

**Row Level Security:**
- Users can only access invitations for their organization
- Insert/update/delete require `team.manage` permission or owner/admin role

## Security Considerations

### Authentication & Authorization

1. **JWT Authentication**: All endpoints require valid authentication token
2. **Role-Based Access**: Permissions checked at role and permission level
3. **Tenant Isolation**: Organization ID validated for all operations
4. **Audit Logging**: All sensitive operations logged with actor and metadata

### Token Security

1. **Random Generation**: Cryptographically secure 32-byte tokens
2. **Single Use**: Tokens marked as accepted after use
3. **Expiration**: 7-day expiration from creation
4. **Secure Storage**: Tokens stored in database with access controls

### Validation Rules

1. **Email Validation**: RFC 5322 compliant email validation
2. **UUID Validation**: All IDs validated as proper UUIDs
3. **Role Validation**: Roles validated against enum
4. **Permission Validation**: Permissions validated against allowed set

## Error Handling

### Standard Error Response

```typescript
{
  error: string;           // Human-readable error message
  details?: object;        // Optional detailed error information
}
```

### Common Error Codes

- `400`: Invalid request data or parameters
- `401`: Missing or invalid authentication
- `403`: Insufficient permissions
- `404`: Resource not found
- `409`: Conflict (duplicate, already exists)
- `422`: Unprocessable entity (business rule violation)
- `500`: Internal server error

## Usage Examples

### Invite a New Agent

```typescript
const response = await fetch('/api/team/invitations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    email: 'agent@example.com',
    role: 'agent'
  })
});

const { invitation } = await response.json();
console.log(`Invitation sent to ${invitation.email}`);
```

### List Team Members

```typescript
const response = await fetch('/api/team/members?limit=50&offset=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { members, total } = await response.json();
console.log(`Found ${total} team members`);
```

### Promote Member to Admin

```typescript
const memberId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`/api/team/members/${memberId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    role: 'admin'
  })
});

const { member } = await response.json();
console.log(`${member.email} is now an admin`);
```

### Remove Team Member

```typescript
const memberId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`/api/team/members/${memberId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.ok) {
  console.log('Member removed successfully');
}
```

## Email Templates

### Invitation Email

**Subject:** `You've been invited to join {Organization Name} on ADSapp`

**Content:**
- Personalized greeting
- Organization details
- Role assignment
- Inviter information
- Call-to-action button with secure link
- Expiration notice (7 days)
- Security notice

**Format:** HTML + Plain Text fallback

**Sent via:** Resend API

## Audit Logging

### Logged Events

| Event | Action | Metadata |
|-------|--------|----------|
| Member invited | `team.member.invited` | email, role, permissions |
| Invitation cancelled | `team.member.invitation_cancelled` | email, role |
| Role updated | `team.member.role_updated` | old_role, new_role |
| Permissions updated | `team.member.permissions_updated` | permissions_updated |
| Member removed | `team.member.removed` | email, role |

### Audit Log Schema

```typescript
{
  organization_id: string;
  user_id: string;          // Actor performing action
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: object;
  created_at: timestamp;
}
```

## Best Practices

### For Developers

1. **Always check permissions** before showing UI elements
2. **Handle role hierarchy** when displaying team management options
3. **Show appropriate error messages** based on error codes
4. **Implement optimistic UI updates** with rollback on error
5. **Cache role permissions** for better performance

### For Administrators

1. **Assign minimal required permissions** (principle of least privilege)
2. **Regularly review team members** and remove inactive users
3. **Monitor audit logs** for suspicious activity
4. **Use invitation system** rather than direct account creation
5. **Maintain at least 2 owners** for business continuity

## Testing

### Unit Tests

Test files located in `/tests/unit/team/`:
- `roles.test.ts` - Role hierarchy and permission logic
- `invitations.test.ts` - Invitation generation and validation
- `email.test.ts` - Email template generation

### Integration Tests

Test files located in `/tests/integration/team/`:
- `members.test.ts` - Member management endpoints
- `invitations.test.ts` - Invitation management endpoints
- `permissions.test.ts` - Permission validation

### E2E Tests

Test files located in `/tests/e2e/team/`:
- `team-workflow.spec.ts` - Complete team management workflows
- `invitation-flow.spec.ts` - Invitation acceptance flow

## Migration Guide

### Applying the Migration

```bash
# Apply the team_invitations migration
psql -h your-supabase-host -d postgres -f supabase/migrations/036_team_invitations.sql

# Or using Supabase CLI
supabase db push
```

### Environment Variables

Required environment variables:

```env
# Resend API for email invitations
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@adsapp.com

# Application URL for invitation links
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Troubleshooting

### Common Issues

**Issue:** Invitation email not received
- **Solution:** Check Resend API key configuration, verify email deliverability

**Issue:** Cannot remove last owner
- **Solution:** Assign owner role to another member first

**Issue:** Permission denied when inviting
- **Solution:** Verify user has `team.manage` permission or owner/admin role

**Issue:** Invitation link expired
- **Solution:** Cancel old invitation and create new one

**Issue:** Cannot assign owner role
- **Solution:** Only owners can assign owner role

## Support

For additional support or questions:
- Email: support@adsapp.com
- Documentation: https://docs.adsapp.com/team-management
- API Reference: https://api.adsapp.com/docs

## Changelog

### Version 1.0.0 (Current)
- Initial release with complete team management functionality
- Role-based access control with 4-tier hierarchy
- Email-based invitation system
- Comprehensive audit logging
- Multi-tenant security
