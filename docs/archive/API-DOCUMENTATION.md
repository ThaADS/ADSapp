# 📚 ADSapp API Documentation

**Complete API reference for the enterprise-grade Multi-Tenant WhatsApp Business Inbox SaaS platform**

---

## 🎯 Overview

ADSapp provides a comprehensive RESTful API for managing WhatsApp Business communications, organizations, users, billing, and system administration. The API is built with Next.js API routes and features enterprise-level security, multi-tenancy, and real-time capabilities.

**Base URL**: `https://your-domain.com/api`
**API Version**: v1
**Authentication**: JWT Bearer tokens via Supabase Auth

---

## 🔐 Authentication

### Authentication Methods

All API endpoints require authentication via JWT tokens issued by Supabase Auth.

#### Login

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1234567890
  }
}
```

#### Using API Tokens

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Levels

| Role                   | Description            | API Access                      |
| ---------------------- | ---------------------- | ------------------------------- |
| **Super Admin**        | Platform administrator | All endpoints                   |
| **Organization Admin** | Tenant administrator   | Organization-specific endpoints |
| **Manager**            | Team manager           | Team and inbox management       |
| **Agent**              | Support agent          | Message handling and contacts   |
| **Viewer**             | Read-only access       | Analytics and reporting         |

---

## 🏢 Organization Management API

### List Organizations

```http
GET /api/admin/organizations
Authorization: Bearer <super_admin_token>
```

**Response**:

```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "Company ABC",
      "domain": "company-abc",
      "status": "active",
      "subscription_plan": "pro",
      "created_at": "2024-01-01T00:00:00Z",
      "user_count": 15,
      "message_count": 1250
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### Create Organization

```http
POST /api/admin/organizations
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "New Company",
  "domain": "new-company",
  "owner_email": "owner@newcompany.com",
  "subscription_plan": "pro",
  "limits": {
    "users": 50,
    "messages_per_month": 10000
  }
}
```

### Update Organization

```http
PUT /api/admin/organizations/{organization_id}
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "status": "active",
  "subscription_plan": "enterprise"
}
```

### Delete Organization

```http
DELETE /api/admin/organizations/{organization_id}
Authorization: Bearer <super_admin_token>
```

---

## 👥 User Management API

### List Users

```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**Query Parameters**:

- `organization_id` (optional): Filter by organization
- `role` (optional): Filter by user role
- `status` (optional): Filter by status (active, suspended, pending)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "agent",
      "status": "active",
      "organization_id": "org_uuid",
      "last_login": "2024-01-01T12:00:00Z",
      "created_at": "2023-12-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Create User

```http
POST /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "agent",
  "organization_id": "org_uuid",
  "send_invitation": true
}
```

### Update User

```http
PUT /api/admin/users/{user_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "manager",
  "status": "active"
}
```

### Reset Password

```http
POST /api/admin/users/{user_id}/reset-password
Authorization: Bearer <admin_token>
```

---

## 💬 WhatsApp Messages API

### Send Message

```http
POST /api/whatsapp/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "type": "text",
  "text": {
    "body": "Hello! How can I help you today?"
  },
  "context": {
    "message_id": "previous_message_id"
  }
}
```

### Send Media Message

```http
POST /api/whatsapp/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "type": "image",
  "image": {
    "id": "media_id",
    "caption": "Here's the information you requested"
  }
}
```

### Get Messages

```http
GET /api/whatsapp/messages
Authorization: Bearer <token>
```

**Query Parameters**:

- `contact` (optional): Filter by contact phone number
- `from_date` (optional): Start date (ISO 8601)
- `to_date` (optional): End date (ISO 8601)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:

```json
{
  "messages": [
    {
      "id": "msg_uuid",
      "whatsapp_message_id": "wamid.xxx",
      "contact_id": "contact_uuid",
      "contact_phone": "+1234567890",
      "type": "text",
      "content": {
        "text": "Hello, I need help with my order"
      },
      "direction": "inbound",
      "status": "delivered",
      "timestamp": "2024-01-01T12:00:00Z",
      "agent_id": "agent_uuid"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

### Mark as Read

```http
POST /api/whatsapp/messages/{message_id}/read
Authorization: Bearer <token>
```

---

## 📞 Contacts API

### List Contacts

```http
GET /api/contacts
Authorization: Bearer <token>
```

**Query Parameters**:

- `search` (optional): Search by name or phone
- `tag` (optional): Filter by tag
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:

```json
{
  "contacts": [
    {
      "id": "uuid",
      "phone": "+1234567890",
      "name": "John Customer",
      "email": "john@example.com",
      "tags": ["vip", "support"],
      "status": "active",
      "last_message_at": "2024-01-01T12:00:00Z",
      "message_count": 45,
      "created_at": "2023-11-01T00:00:00Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 20
}
```

### Create Contact

```http
POST /api/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+1234567890",
  "name": "New Customer",
  "email": "customer@example.com",
  "tags": ["prospect"]
}
```

### Update Contact

```http
PUT /api/contacts/{contact_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "tags": ["customer", "vip"]
}
```

---

## 🤖 Automation API

### List Workflows

```http
GET /api/automation/workflows
Authorization: Bearer <token>
```

**Response**:

```json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Welcome Message",
      "status": "active",
      "trigger": {
        "type": "new_contact",
        "conditions": {
          "tags": ["new"]
        }
      },
      "actions": [
        {
          "type": "send_message",
          "template": "welcome_template",
          "delay": 0
        }
      ],
      "statistics": {
        "triggered": 150,
        "completed": 145,
        "success_rate": 96.7
      }
    }
  ]
}
```

### Create Workflow

```http
POST /api/automation/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Auto-Reply for Business Hours",
  "status": "active",
  "trigger": {
    "type": "message_received",
    "conditions": {
      "business_hours": false
    }
  },
  "actions": [
    {
      "type": "send_message",
      "message": {
        "type": "text",
        "text": {
          "body": "Thanks for your message! We'll get back to you during business hours (9 AM - 6 PM)."
        }
      }
    }
  ]
}
```

### Execute Workflow

```http
POST /api/automation/workflows/{workflow_id}/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": "contact_uuid",
  "trigger_data": {
    "source": "manual",
    "agent_id": "agent_uuid"
  }
}
```

---

## 📊 Analytics API

### Dashboard Overview

```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

**Query Parameters**:

- `period` (optional): Time period (24h, 7d, 30d, 90d)
- `timezone` (optional): Timezone for date calculations

**Response**:

```json
{
  "overview": {
    "total_messages": 15420,
    "total_contacts": 3250,
    "active_conversations": 45,
    "average_response_time": 120,
    "satisfaction_rating": 4.2
  },
  "trends": {
    "messages": [
      {
        "date": "2024-01-01",
        "inbound": 120,
        "outbound": 95
      }
    ],
    "contacts": [
      {
        "date": "2024-01-01",
        "new": 15,
        "total": 3250
      }
    ]
  },
  "top_agents": [
    {
      "agent_id": "uuid",
      "name": "Jane Agent",
      "messages_handled": 245,
      "average_response_time": 95,
      "satisfaction_rating": 4.5
    }
  ]
}
```

### Conversation Analytics

```http
GET /api/analytics/conversations
Authorization: Bearer <token>
```

**Response**:

```json
{
  "metrics": {
    "total_conversations": 1250,
    "active_conversations": 45,
    "resolved_conversations": 1180,
    "average_duration": 1800,
    "resolution_rate": 94.4
  },
  "response_times": {
    "first_response": {
      "average": 120,
      "median": 95,
      "percentile_90": 180
    },
    "resolution": {
      "average": 1800,
      "median": 1200,
      "percentile_90": 3600
    }
  }
}
```

### Agent Performance

```http
GET /api/analytics/agents
Authorization: Bearer <token>
```

**Response**:

```json
{
  "agents": [
    {
      "agent_id": "uuid",
      "name": "John Agent",
      "email": "john@company.com",
      "metrics": {
        "conversations_handled": 85,
        "messages_sent": 420,
        "average_response_time": 105,
        "satisfaction_rating": 4.3,
        "resolution_rate": 92.9
      },
      "activity": {
        "total_hours": 160,
        "active_hours": 145,
        "availability_rate": 90.6
      }
    }
  ]
}
```

---

## 💳 Billing API

### Get Subscription

```http
GET /api/billing/subscription
Authorization: Bearer <token>
```

**Response**:

```json
{
  "subscription": {
    "id": "sub_uuid",
    "plan": "pro",
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z",
    "cancel_at_period_end": false
  },
  "usage": {
    "messages_sent": 2450,
    "messages_limit": 10000,
    "users": 15,
    "users_limit": 50
  },
  "billing": {
    "amount": 99.0,
    "currency": "usd",
    "next_payment": "2024-02-01T00:00:00Z"
  }
}
```

### Update Subscription

```http
PUT /api/billing/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "enterprise",
  "proration_behavior": "create_prorations"
}
```

### Get Invoices

```http
GET /api/billing/invoices
Authorization: Bearer <token>
```

**Response**:

```json
{
  "invoices": [
    {
      "id": "inv_uuid",
      "number": "INV-2024-001",
      "status": "paid",
      "amount": 99.0,
      "currency": "usd",
      "created": "2024-01-01T00:00:00Z",
      "due_date": "2024-01-15T00:00:00Z",
      "paid_at": "2024-01-14T10:30:00Z",
      "invoice_pdf": "https://invoice-url.pdf"
    }
  ]
}
```

---

## 🛠️ System Administration API

### System Health

```http
GET /api/admin/system/health
Authorization: Bearer <super_admin_token>
```

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 15,
      "connections": 25
    },
    "whatsapp_api": {
      "status": "healthy",
      "response_time": 120,
      "rate_limit_remaining": 950
    },
    "stripe": {
      "status": "healthy",
      "response_time": 85
    }
  },
  "metrics": {
    "active_organizations": 45,
    "total_users": 1250,
    "messages_today": 5420,
    "error_rate": 0.02
  }
}
```

### Audit Logs

```http
GET /api/admin/audit-logs
Authorization: Bearer <super_admin_token>
```

**Query Parameters**:

- `admin_id` (optional): Filter by admin user
- `action` (optional): Filter by action type
- `target_type` (optional): Filter by target type
- `from_date` (optional): Start date
- `to_date` (optional): End date

**Response**:

```json
{
  "logs": [
    {
      "id": "uuid",
      "admin_id": "admin_uuid",
      "admin_name": "Super Admin",
      "action": "CREATE_ORGANIZATION",
      "target_type": "organization",
      "target_id": "org_uuid",
      "details": {
        "organization_name": "New Company",
        "plan": "pro"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

### Platform Settings

```http
GET /api/admin/system/settings
Authorization: Bearer <super_admin_token>
```

**Response**:

```json
{
  "settings": {
    "maintenance_mode": false,
    "registration_enabled": true,
    "default_plan": "starter",
    "max_organizations": 1000,
    "rate_limits": {
      "messages_per_minute": 100,
      "api_requests_per_hour": 5000
    },
    "features": {
      "automation_enabled": true,
      "analytics_enabled": true,
      "whatsapp_integration": true
    }
  }
}
```

---

## 🚨 Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    },
    "request_id": "req_uuid",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### HTTP Status Codes

| Code  | Description           | Usage                             |
| ----- | --------------------- | --------------------------------- |
| `200` | Success               | Successful GET, PUT requests      |
| `201` | Created               | Successful POST requests          |
| `204` | No Content            | Successful DELETE requests        |
| `400` | Bad Request           | Invalid request data              |
| `401` | Unauthorized          | Missing or invalid authentication |
| `403` | Forbidden             | Insufficient permissions          |
| `404` | Not Found             | Resource not found                |
| `409` | Conflict              | Resource already exists           |
| `422` | Unprocessable Entity  | Validation errors                 |
| `429` | Too Many Requests     | Rate limit exceeded               |
| `500` | Internal Server Error | Server error                      |

### Common Error Codes

| Code                       | Description                             |
| -------------------------- | --------------------------------------- |
| `AUTHENTICATION_REQUIRED`  | Valid authentication token required     |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions         |
| `VALIDATION_ERROR`         | Request data validation failed          |
| `RESOURCE_NOT_FOUND`       | Requested resource does not exist       |
| `ORGANIZATION_NOT_FOUND`   | Organization not found or access denied |
| `RATE_LIMIT_EXCEEDED`      | API rate limit exceeded                 |
| `SUBSCRIPTION_REQUIRED`    | Feature requires active subscription    |
| `WHATSAPP_API_ERROR`       | WhatsApp API integration error          |

---

## 🔄 Rate Limiting

### Rate Limits

| Endpoint       | Limit        | Window   |
| -------------- | ------------ | -------- |
| Authentication | 10 requests  | 1 minute |
| Messages       | 100 requests | 1 minute |
| Contacts       | 300 requests | 1 minute |
| Analytics      | 60 requests  | 1 minute |
| Admin APIs     | 100 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 📡 Webhooks

### WhatsApp Webhooks

Configure webhook URL: `https://your-domain.com/api/webhooks/whatsapp`

**Message Received**:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "CUSTOMER_PHONE_NUMBER",
                "id": "MESSAGE_ID",
                "timestamp": "TIMESTAMP",
                "text": {
                  "body": "MESSAGE_CONTENT"
                },
                "type": "text"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Stripe Webhooks

Configure webhook URL: `https://your-domain.com/api/webhooks/stripe`

**Subscription Updated**:

```json
{
  "id": "evt_uuid",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1640995200,
  "data": {
    "object": {
      "id": "sub_uuid",
      "object": "subscription",
      "status": "active"
    }
  },
  "type": "customer.subscription.updated"
}
```

---

## 🔧 SDK & Libraries

### JavaScript/TypeScript SDK

```bash
npm install @adsapp/sdk
```

**Usage**:

```typescript
import { ADSApp } from '@adsapp/sdk'

const client = new ADSApp({
  apiKey: 'your-api-key',
  baseURL: 'https://your-domain.com/api',
})

// Send a message
const message = await client.messages.send({
  to: '+1234567890',
  type: 'text',
  text: { body: 'Hello from SDK!' },
})

// Get contacts
const contacts = await client.contacts.list({
  page: 1,
  limit: 20,
})
```

### cURL Examples

**Authentication**:

```bash
curl -X POST "https://your-domain.com/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Send Message**:

```bash
curl -X POST "https://your-domain.com/api/whatsapp/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "type": "text",
    "text": {"body": "Hello from API!"}
  }'
```

---

## 📋 Changelog

### Version 1.0.0 (Current)

- Complete WhatsApp Business API integration
- Multi-tenant organization management
- User management and authentication
- Real-time messaging and inbox
- Automation workflows
- Analytics and reporting
- Billing and subscription management
- Super admin system
- Comprehensive audit logging

### Upcoming Features

- Advanced AI-powered automation
- Multi-language support
- Advanced analytics and reporting
- Mobile SDK for iOS and Android
- Voice and video message support
- Integration marketplace

---

**📚 Need Help?**

- **Documentation**: Complete guides in `/docs` directory
- **Support**: Contact support through admin dashboard
- **Community**: Join our developer community
- **Status Page**: Monitor API status and uptime

---

_Last updated: Production Release_
_API Version: 1.0_
_Platform: ADSapp Enterprise_
