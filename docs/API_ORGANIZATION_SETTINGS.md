# Organization Settings API Documentation

**Version:** 1.0.0
**Last Updated:** 2025-10-16
**Base URL:** `/api/organizations`

## Overview

The Organization Settings API provides comprehensive endpoints for managing organization configuration, including general settings, branding, business hours, and WhatsApp integration. All endpoints enforce Row Level Security (RLS), Role-Based Access Control (RBAC), and comprehensive audit logging.

## Table of Contents

- [Authentication](#authentication)
- [Authorization](#authorization)
- [Endpoints](#endpoints)
  - [Get Organization Settings](#get-organization-settings)
  - [Update Organization Settings](#update-organization-settings)
  - [Get Organization Branding](#get-organization-branding)
  - [Update Organization Branding](#update-organization-branding)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

---

## Authentication

All endpoints require authentication via Supabase session cookie or JWT token.

**Authentication Methods:**

- Session cookie (set by Supabase Auth)
- Bearer token in Authorization header

**Example:**

```http
Authorization: Bearer <your-jwt-token>
```

---

## Authorization

Access to organization settings is controlled by user roles:

| Role      | View Settings | Update Settings | Change Subdomain | Update Branding | Manage Billing |
| --------- | ------------- | --------------- | ---------------- | --------------- | -------------- |
| **Owner** | ✅            | ✅              | ✅               | ✅              | ✅             |
| **Admin** | ✅            | ✅              | ❌               | ✅              | ❌             |
| **Agent** | ✅            | ❌              | ❌               | ❌              | ❌             |

**Multi-Tenant Isolation:** Users can only access organizations they belong to.

---

## Endpoints

### Get Organization Settings

Retrieves comprehensive organization settings including general configuration, subscription details, and metadata.

**Endpoint:** `GET /api/organizations/:id`

**Authorization:** Owner, Admin, Agent (read-only)

**Path Parameters:**

- `id` (string, required) - Organization UUID

**Response:** `200 OK`

```json
{
  "success": true,
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "timezone": "America/New_York",
    "locale": "en-US",
    "business_hours": {
      "monday": { "enabled": true, "open": "09:00", "close": "17:00" },
      "tuesday": { "enabled": true, "open": "09:00", "close": "17:00" },
      "wednesday": { "enabled": true, "open": "09:00", "close": "17:00" },
      "thursday": { "enabled": true, "open": "09:00", "close": "17:00" },
      "friday": { "enabled": true, "open": "09:00", "close": "17:00" },
      "saturday": { "enabled": false, "open": "09:00", "close": "17:00" },
      "sunday": { "enabled": false, "open": "09:00", "close": "17:00" }
    },
    "whatsapp_business_account_id": "123456789012345",
    "whatsapp_phone_number_id": "987654321098765",
    "subscription_status": "active",
    "subscription_tier": "professional",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-10-16T14:22:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid organization ID format
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions or wrong organization
- `404 Not Found` - Organization not found
- `500 Internal Server Error` - Server error

---

### Update Organization Settings

Updates organization configuration including name, subdomain, timezone, locale, business hours, and WhatsApp integration.

**Endpoint:** `PUT /api/organizations/:id`

**Authorization:** Owner (all fields), Admin (excluding subdomain)

**Path Parameters:**

- `id` (string, required) - Organization UUID

**Request Body:**

```json
{
  "name": "Updated Organization Name",
  "subdomain": "new-subdomain",
  "timezone": "America/Los_Angeles",
  "locale": "en-US",
  "business_hours": {
    "monday": { "enabled": true, "open": "08:00", "close": "18:00" },
    "tuesday": { "enabled": true, "open": "08:00", "close": "18:00" },
    "wednesday": { "enabled": true, "open": "08:00", "close": "18:00" },
    "thursday": { "enabled": true, "open": "08:00", "close": "18:00" },
    "friday": { "enabled": true, "open": "08:00", "close": "18:00" },
    "saturday": { "enabled": false, "open": "09:00", "close": "17:00" },
    "sunday": { "enabled": false, "open": "09:00", "close": "17:00" }
  },
  "whatsapp_business_account_id": "123456789012345",
  "whatsapp_phone_number_id": "987654321098765"
}
```

**Field Validation:**

| Field                          | Type   | Validation                                    | Notes                         |
| ------------------------------ | ------ | --------------------------------------------- | ----------------------------- |
| `name`                         | string | 2-100 chars, alphanumeric + special chars     | No SQL injection patterns     |
| `subdomain`                    | string | 3-63 chars, lowercase, alphanumeric + hyphens | Must be unique, not reserved  |
| `timezone`                     | string | Valid IANA timezone identifier                | E.g., "America/New_York"      |
| `locale`                       | string | ISO 639-1 format                              | E.g., "en", "en-US", "pt-BR"  |
| `business_hours`               | object | Valid time ranges (HH:MM 24-hour)             | Close time must be after open |
| `whatsapp_business_account_id` | string | 15-20 digits                                  | Nullable                      |
| `whatsapp_phone_number_id`     | string | 15-20 digits                                  | Nullable                      |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Organization updated successfully",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Organization Name",
    "slug": "new-subdomain",
    "timezone": "America/Los_Angeles",
    "locale": "en-US",
    "business_hours": {
      /* ... */
    },
    "whatsapp_business_account_id": "123456789012345",
    "whatsapp_phone_number_id": "987654321098765",
    "subscription_status": "active",
    "subscription_tier": "professional",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-10-16T14:25:00Z"
  },
  "changed_fields": ["name", "slug", "timezone"]
}
```

**Error Responses:**

- `400 Bad Request` - Validation error, invalid JSON, or invalid field values
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions or subdomain change by non-owner
- `404 Not Found` - Organization not found
- `409 Conflict` - Subdomain already taken
- `500 Internal Server Error` - Server error

**Audit Log Entry Created:**

```json
{
  "action": "organization.updated",
  "actor_id": "user-uuid",
  "actor_email": "admin@example.com",
  "resource_type": "organization",
  "resource_id": "org-uuid",
  "metadata": {
    "changed_fields": {
      "name": { "old": "Old Name", "new": "New Name" },
      "timezone": { "old": "America/New_York", "new": "America/Los_Angeles" }
    },
    "organization_name": "Updated Organization Name"
  }
}
```

---

### Get Organization Branding

Retrieves organization branding configuration including logo, color scheme, and custom CSS.

**Endpoint:** `GET /api/organizations/:id/branding`

**Authorization:** Owner, Admin, Agent (read-only)

**Path Parameters:**

- `id` (string, required) - Organization UUID

**Response:** `200 OK`

```json
{
  "success": true,
  "branding": {
    "logo_url": "https://storage.example.com/org-assets/550e8400/logo.png",
    "primary_color": "#3B82F6",
    "secondary_color": "#10B981",
    "accent_color": "#F59E0B",
    "custom_css": "/* Custom styles */"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid organization ID format
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Organization not found
- `500 Internal Server Error` - Server error

---

### Update Organization Branding

Updates organization branding including logo upload, color customization, and custom CSS.

**Endpoint:** `PUT /api/organizations/:id/branding`

**Authorization:** Owner, Admin

**Path Parameters:**

- `id` (string, required) - Organization UUID

**Content-Type:** `application/json` or `multipart/form-data`

#### JSON Request (Colors and CSS only)

**Request Body:**

```json
{
  "primary_color": "#FF5733",
  "secondary_color": "#33FF57",
  "accent_color": "#3357FF",
  "custom_css": ".custom-header { font-size: 18px; }"
}
```

#### Multipart Request (Logo upload with colors)

**Form Data:**

- `logo` (file, optional) - Logo image file (JPG, PNG, SVG, WebP, max 2MB)
- `primary_color` (string, optional) - Hex color code
- `secondary_color` (string, optional) - Hex color code
- `accent_color` (string, optional) - Hex color code
- `custom_css` (string, optional) - Custom CSS (max 50KB)

**Field Validation:**

| Field             | Type   | Validation                         | Notes                                |
| ----------------- | ------ | ---------------------------------- | ------------------------------------ |
| `logo`            | file   | JPG, PNG, SVG, WebP, max 2MB       | Uploaded to Supabase Storage         |
| `primary_color`   | string | Hex color format (#RGB or #RRGGBB) | E.g., "#FF5733"                      |
| `secondary_color` | string | Hex color format                   | E.g., "#33FF57"                      |
| `accent_color`    | string | Hex color format                   | E.g., "#3357FF"                      |
| `custom_css`      | string | Max 50KB, no malicious patterns    | No JavaScript, imports, or behaviors |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Branding updated successfully",
  "branding": {
    "logo_url": "https://storage.example.com/org-assets/550e8400/logo-1697478123.png",
    "primary_color": "#FF5733",
    "secondary_color": "#33FF57",
    "accent_color": "#3357FF",
    "custom_css": ".custom-header { font-size: 18px; }"
  },
  "updated_fields": ["logo_url", "primary_color", "secondary_color"]
}
```

**Error Responses:**

- `400 Bad Request` - Validation error, invalid file format, or file too large
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Organization not found
- `415 Unsupported Media Type` - Invalid content-type
- `500 Internal Server Error` - Server error or upload failure

**Audit Log Entry Created:**

```json
{
  "action": "organization.branding_updated",
  "actor_id": "user-uuid",
  "actor_email": "admin@example.com",
  "resource_type": "organization",
  "resource_id": "org-uuid",
  "metadata": {
    "branding_changes": {
      "primary_color": "#FF5733",
      "secondary_color": "#33FF57"
    },
    "organization_name": "Acme Corporation",
    "logo_uploaded": true
  }
}
```

---

## Data Models

### OrganizationSettings

```typescript
interface OrganizationSettings {
  id: string
  name: string
  slug: string
  timezone: string | null
  locale: string | null
  business_hours: BusinessHours | null
  whatsapp_business_account_id: string | null
  whatsapp_phone_number_id: string | null
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  created_at: string
  updated_at: string
}
```

### BusinessHours

```typescript
interface BusinessHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

interface DaySchedule {
  enabled: boolean
  open: string // HH:MM format (24-hour)
  close: string // HH:MM format (24-hour)
}
```

### OrganizationBranding

```typescript
interface OrganizationBranding {
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  custom_css: string | null
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code                      | Description                       |
| ------------------------- | --------------------------------- |
| `UNAUTHORIZED`            | Authentication required           |
| `FORBIDDEN`               | Insufficient permissions          |
| `INVALID_ORGANIZATION_ID` | Organization ID format is invalid |
| `NOT_FOUND`               | Organization not found            |
| `VALIDATION_ERROR`        | Request validation failed         |
| `SUBDOMAIN_CONFLICT`      | Subdomain already taken           |
| `INVALID_JSON`            | Request body is not valid JSON    |
| `INVALID_LOGO_FILE`       | Logo file validation failed       |
| `UPLOAD_ERROR`            | File upload failed                |
| `DATABASE_ERROR`          | Database operation failed         |
| `UPDATE_ERROR`            | Update operation failed           |

---

## Security Considerations

### Input Validation

- All user inputs are validated using Zod schemas
- XSS prevention through HTML entity encoding
- SQL injection prevention through parameterized queries
- Path traversal prevention in file uploads

### Multi-Tenant Isolation

- Enforced at database level through Row Level Security (RLS)
- Additional application-level checks in API routes
- Organization ID verification for all operations

### File Upload Security

- Allowed file types: JPG, PNG, SVG, WebP only
- Maximum file size: 2MB for logos
- Virus scanning recommended for production
- Files stored in isolated Supabase Storage buckets

### Audit Logging

- All organization changes are logged
- Includes actor information, IP address, and user agent
- Immutable audit trail for compliance

---

## Rate Limiting

Rate limits are applied per user and per endpoint:

| Endpoint      | Rate Limit          |
| ------------- | ------------------- |
| GET endpoints | 100 requests/minute |
| PUT endpoints | 30 requests/minute  |
| File uploads  | 10 requests/minute  |

Rate limit exceeded returns `429 Too Many Requests`:

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Examples

### Example 1: Update Organization Name and Timezone

```typescript
const response = await fetch(`/api/organizations/${organizationId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Updated Organization',
    timezone: 'America/Los_Angeles',
  }),
})

const data = await response.json()
console.log(data.changed_fields) // ['name', 'timezone']
```

### Example 2: Upload Logo with Color Scheme

```typescript
const formData = new FormData()
formData.append('logo', logoFile)
formData.append('primary_color', '#FF5733')
formData.append('secondary_color', '#33FF57')

const response = await fetch(`/api/organizations/${organizationId}/branding`, {
  method: 'PUT',
  body: formData,
})

const data = await response.json()
console.log(data.branding.logo_url) // New logo URL
```

### Example 3: Update Business Hours

```typescript
const response = await fetch(`/api/organizations/${organizationId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    business_hours: {
      monday: { enabled: true, open: '08:00', close: '18:00' },
      tuesday: { enabled: true, open: '08:00', close: '18:00' },
      wednesday: { enabled: true, open: '08:00', close: '18:00' },
      thursday: { enabled: true, open: '08:00', close: '18:00' },
      friday: { enabled: true, open: '08:00', close: '16:00' },
      saturday: { enabled: false, open: '09:00', close: '17:00' },
      sunday: { enabled: false, open: '09:00', close: '17:00' },
    },
  }),
})

const data = await response.json()
```

### Example 4: Error Handling

```typescript
try {
  const response = await fetch(`/api/organizations/${organizationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subdomain: 'invalid subdomain!', // Will fail validation
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  const data = await response.json()
  console.log('Update successful:', data)
} catch (error) {
  console.error('Update failed:', error.message)
}
```

---

## Support

For API support and questions:

- **Email:** api-support@adsapp.com
- **Documentation:** https://docs.adsapp.com
- **Status Page:** https://status.adsapp.com

---

## Changelog

### Version 1.0.0 (2025-10-16)

- Initial release of Organization Settings API
- GET and PUT endpoints for organization settings
- GET and PUT endpoints for organization branding
- Comprehensive validation and error handling
- RBAC enforcement and audit logging
- File upload support for logo management
