# Tag Management & Automation API Documentation

Complete API documentation for Tag Management and Automation Rules endpoints.

## Table of Contents

- [Tag Management API](#tag-management-api)
- [Automation Rules API](#automation-rules-api)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)

---

## Tag Management API

### Base URL
```
/api/tags
```

### Authentication
All endpoints require authentication via Supabase Auth session cookie.

### Data Model

```typescript
interface Tag {
  id: string
  organization_id: string
  name: string
  color: string | null  // Hex color (e.g., "#FF0000")
  created_at: string
  updated_at: string
  usage_count?: number  // Number of contacts with this tag
}
```

### Endpoints

#### 1. List All Tags

**GET** `/api/tags`

Get all tags for the authenticated user's organization with usage counts.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "name": "VIP",
        "color": "#F59E0B",
        "created_at": "2025-10-15T10:00:00Z",
        "updated_at": "2025-10-15T10:00:00Z",
        "usage_count": 5
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

#### 2. Create Tag

**POST** `/api/tags`

Create a new tag for the organization.

**Request Body:**
```json
{
  "name": "Important",
  "color": "#EF4444"  // Optional, defaults to #6B7280
}
```

**Validation:**
- `name` - Required, non-empty string
- `color` - Optional, must be valid hex color format (#RRGGBB)
- Tag names must be unique per organization

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Important",
    "color": "#EF4444",
    "created_at": "2025-10-15T10:00:00Z",
    "updated_at": "2025-10-15T10:00:00Z",
    "usage_count": 0
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error
- `409` - Tag with this name already exists
- `401` - Unauthorized
- `500` - Server error

---

#### 3. Get Tag Details

**GET** `/api/tags/:id`

Get details for a specific tag including contacts that have this tag.

**URL Parameters:**
- `id` - Tag UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "uuid",
      "organization_id": "uuid",
      "name": "VIP",
      "color": "#F59E0B",
      "created_at": "2025-10-15T10:00:00Z",
      "updated_at": "2025-10-15T10:00:00Z",
      "usage_count": 5
    },
    "contacts": [
      {
        "id": "uuid",
        "name": "John Doe",
        "phone_number": "+1234567890",
        "tags": ["VIP", "Important"]
      }
    ]
  }
}
```

**Notes:**
- Returns up to 100 contacts with this tag
- Contacts are sorted by most recent first

**Status Codes:**
- `200` - Success
- `404` - Tag not found
- `401` - Unauthorized
- `500` - Server error

---

#### 4. Update Tag

**PUT** `/api/tags/:id`

Update tag name and/or color. When renaming, all contacts with this tag are automatically updated.

**URL Parameters:**
- `id` - Tag UUID

**Request Body:**
```json
{
  "name": "Super VIP",  // Optional
  "color": "#DC2626"    // Optional
}
```

**Validation:**
- `name` - If provided, must be non-empty string and unique
- `color` - If provided, must be valid hex color format

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Super VIP",
    "color": "#DC2626",
    "created_at": "2025-10-15T10:00:00Z",
    "updated_at": "2025-10-15T10:30:00Z",
    "usage_count": 5
  }
}
```

**Important:**
- If tag name changes, all contacts with the old tag name are updated to use the new name
- This operation may take time for large numbers of contacts

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `404` - Tag not found
- `409` - Tag name conflict
- `401` - Unauthorized
- `500` - Server error

---

#### 5. Delete Tag

**DELETE** `/api/tags/:id`

Delete a tag and remove it from all contacts.

**URL Parameters:**
- `id` - Tag UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tag deleted successfully",
    "removed_from_contacts": 5
  }
}
```

**Important:**
- Tag is removed from ALL contacts before deletion
- This operation is irreversible
- May take time for large numbers of contacts

**Status Codes:**
- `200` - Deleted successfully
- `404` - Tag not found
- `401` - Unauthorized
- `500` - Server error

---

## Automation Rules API

### Base URL
```
/api/automation/rules
```

### Authentication
All endpoints require authentication via Supabase Auth session cookie.

### Data Model

```typescript
interface AutomationRule {
  id: string
  organization_id: string
  name: string
  description: string | null
  trigger_type: 'keyword' | 'business_hours' | 'unassigned' | 'first_message'
  trigger_conditions: {
    keywords?: string[]
    tags?: string[]
    schedule?: string  // Cron format
    events?: string[]
  }
  actions: Array<{
    type: 'send_message' | 'add_tag' | 'assign_agent' | 'create_ticket'
    params: Record<string, any>
  }>
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  execution_count?: number
  last_executed_at?: string | null
}
```

### Endpoints

#### 1. List Automation Rules

**GET** `/api/automation/rules`

Get all automation rules for the organization.

**Query Parameters:**
- `is_active` - Filter by active status (true/false)
- `trigger_type` - Filter by trigger type
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "name": "Auto-tag VIP keywords",
        "description": "Automatically tag contacts mentioning VIP keywords",
        "trigger_type": "keyword",
        "trigger_conditions": {
          "keywords": ["vip", "premium", "enterprise"]
        },
        "actions": [
          {
            "type": "add_tag",
            "params": {
              "tag": "VIP"
            }
          }
        ],
        "is_active": true,
        "created_by": "uuid",
        "created_at": "2025-10-15T10:00:00Z",
        "updated_at": "2025-10-15T10:00:00Z",
        "profiles": {
          "id": "uuid",
          "full_name": "Admin User",
          "email": "admin@example.com"
        },
        "execution_count": 0,
        "last_executed_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

#### 2. Create Automation Rule

**POST** `/api/automation/rules`

Create a new automation rule.

**Request Body:**
```json
{
  "name": "Auto-tag VIP keywords",
  "description": "Automatically tag contacts mentioning VIP keywords",
  "trigger_type": "keyword",
  "trigger_conditions": {
    "keywords": ["vip", "premium", "enterprise"]
  },
  "actions": [
    {
      "type": "add_tag",
      "params": {
        "tag": "VIP"
      }
    },
    {
      "type": "send_message",
      "params": {
        "message": "Thank you for your interest! A VIP representative will contact you shortly."
      }
    }
  ],
  "is_active": true
}
```

**Validation:**
- `name` - Required, non-empty string, unique per organization
- `trigger_type` - Required, one of: keyword, business_hours, unassigned, first_message
- `trigger_conditions` - Required, object with type-specific fields
- `actions` - Required, non-empty array of action objects
- Each action must have valid `type` and `params` object

**Action Types:**
- `send_message` - Send automated message
- `add_tag` - Add tag to contact
- `assign_agent` - Assign conversation to agent
- `create_ticket` - Create support ticket

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Auto-tag VIP keywords",
    "description": "Automatically tag contacts mentioning VIP keywords",
    "trigger_type": "keyword",
    "trigger_conditions": {
      "keywords": ["vip", "premium", "enterprise"]
    },
    "actions": [
      {
        "type": "add_tag",
        "params": {
          "tag": "VIP"
        }
      }
    ],
    "is_active": true,
    "created_by": "uuid",
    "created_at": "2025-10-15T10:00:00Z",
    "updated_at": "2025-10-15T10:00:00Z",
    "profiles": {
      "id": "uuid",
      "full_name": "Admin User",
      "email": "admin@example.com"
    },
    "execution_count": 0,
    "last_executed_at": null
  }
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Validation error
- `409` - Rule with this name already exists
- `401` - Unauthorized
- `500` - Server error

---

#### 3. Get Automation Rule

**GET** `/api/automation/rules/:id`

Get details for a specific automation rule.

**URL Parameters:**
- `id` - Rule UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Auto-tag VIP keywords",
    "description": "Automatically tag contacts mentioning VIP keywords",
    "trigger_type": "keyword",
    "trigger_conditions": {
      "keywords": ["vip", "premium", "enterprise"]
    },
    "actions": [
      {
        "type": "add_tag",
        "params": {
          "tag": "VIP"
        }
      }
    ],
    "is_active": true,
    "created_by": "uuid",
    "created_at": "2025-10-15T10:00:00Z",
    "updated_at": "2025-10-15T10:00:00Z",
    "profiles": {
      "id": "uuid",
      "full_name": "Admin User",
      "email": "admin@example.com"
    },
    "execution_count": 0,
    "last_executed_at": null
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Rule not found
- `401` - Unauthorized
- `500` - Server error

---

#### 4. Update Automation Rule

**PUT** `/api/automation/rules/:id`

Update an automation rule. All fields are optional.

**URL Parameters:**
- `id` - Rule UUID

**Request Body:**
```json
{
  "name": "Updated rule name",
  "description": "Updated description",
  "trigger_conditions": {
    "keywords": ["vip", "premium", "enterprise", "business"]
  },
  "actions": [
    {
      "type": "add_tag",
      "params": {
        "tag": "VIP"
      }
    }
  ],
  "is_active": false
}
```

**Validation:**
- Same validation rules as create endpoint
- Only provided fields are updated

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Updated rule name",
    "description": "Updated description",
    "trigger_type": "keyword",
    "trigger_conditions": {
      "keywords": ["vip", "premium", "enterprise", "business"]
    },
    "actions": [
      {
        "type": "add_tag",
        "params": {
          "tag": "VIP"
        }
      }
    ],
    "is_active": false,
    "created_by": "uuid",
    "created_at": "2025-10-15T10:00:00Z",
    "updated_at": "2025-10-15T10:30:00Z",
    "profiles": {
      "id": "uuid",
      "full_name": "Admin User",
      "email": "admin@example.com"
    },
    "execution_count": 0,
    "last_executed_at": null
  }
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Validation error
- `404` - Rule not found
- `409` - Rule name conflict
- `401` - Unauthorized
- `500` - Server error

---

#### 5. Toggle Automation Rule

**POST** `/api/automation/rules/:id/toggle`

Enable or disable an automation rule (toggle is_active status).

**URL Parameters:**
- `id` - Rule UUID

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Auto-tag VIP keywords",
    "is_active": false,
    "message": "Rule disabled successfully",
    ...
  }
}
```

**Status Codes:**
- `200` - Toggled successfully
- `404` - Rule not found
- `401` - Unauthorized
- `500` - Server error

---

#### 6. Delete Automation Rule

**DELETE** `/api/automation/rules/:id`

Delete an automation rule permanently.

**URL Parameters:**
- `id` - Rule UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Automation rule deleted successfully"
  }
}
```

**Important:**
- This operation is irreversible
- Rule execution history is preserved in logs (if implemented)

**Status Codes:**
- `200` - Deleted successfully
- `404` - Rule not found
- `401` - Unauthorized
- `500` - Server error

---

## Integration Examples

### React Hook for Tags Management

```typescript
import { useState, useEffect } from 'react'

interface Tag {
  id: string
  name: string
  color: string
  usage_count: number
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tags')
      const data = await response.json()
      if (data.success) {
        setTags(data.data.tags)
      } else {
        setError(data.error || 'Failed to fetch tags')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const createTag = async (name: string, color: string) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      })
      const data = await response.json()
      if (data.success) {
        setTags([...tags, data.data])
        return data.data
      } else {
        setError(data.error || 'Failed to create tag')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    }
  }

  const deleteTag = async (id: string) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setTags(tags.filter(t => t.id !== id))
        return true
      } else {
        setError(data.error || 'Failed to delete tag')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  return { tags, loading, error, createTag, deleteTag, refreshTags: fetchTags }
}
```

### Automation Rule Creation Example

```typescript
async function createVIPAutomation() {
  const rule = {
    name: "VIP Customer Auto-Response",
    description: "Automatically tag and respond to VIP keywords",
    trigger_type: "keyword",
    trigger_conditions: {
      keywords: ["vip", "premium", "enterprise"]
    },
    actions: [
      {
        type: "add_tag",
        params: { tag: "VIP" }
      },
      {
        type: "send_message",
        params: {
          message: "Thank you for your interest! A VIP representative will contact you shortly."
        }
      },
      {
        type: "assign_agent",
        params: {
          role: "vip_support"
        }
      }
    ],
    is_active: true
  }

  const response = await fetch('/api/automation/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  })

  return response.json()
}
```

---

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"  // Optional
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | SERVER_ERROR | Internal server error |

---

## Rate Limiting

All endpoints are subject to rate limiting:
- Standard endpoints: 100 requests per minute per organization
- Bulk operations: 20 requests per minute per organization

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## Database Migration

To enable tags table in your Supabase database, run the migration:

```bash
# Apply the migration
psql -h your-supabase-host -d postgres -f supabase/migrations/20251015_tags_table.sql
```

The migration creates:
- `tags` table with RLS policies
- Indexes for performance optimization
- Default tags for existing organizations
- Updated_at trigger for automatic timestamp management

---

## Testing

### Test Tag Creation
```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"name":"Test Tag","color":"#FF0000"}'
```

### Test Automation Rule Creation
```bash
curl -X POST http://localhost:3001/api/automation/rules \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name":"Test Rule",
    "trigger_type":"keyword",
    "trigger_conditions":{"keywords":["test"]},
    "actions":[{"type":"add_tag","params":{"tag":"Test"}}]
  }'
```

---

## Support

For issues or questions about the Tag Management and Automation APIs:
- Check the error response for specific details
- Review the validation requirements above
- Ensure database migrations are applied
- Verify authentication and permissions

---

**Last Updated:** October 15, 2025
**API Version:** 1.0
**Author:** ADSapp Development Team
