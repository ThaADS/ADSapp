# ADSapp Demo Accounts

This document contains login credentials for all demo accounts in the ADSapp application. These accounts are set up with a complete demo organization and various user roles for testing purposes.

## Demo Organization

**Company Name:** Demo Company
**Subdomain:** demo-company
**Organization ID:** `d6c6e3de-cab8-42d0-b478-69818f9773e9`
**Subscription Status:** Active
**Subscription Tier:** Professional

**WhatsApp Configuration:**

- Business Account ID: `123456789012345`
- Phone Number ID: `123456789012345`

---

## User Accounts

### 1. Owner Account

**Email:** `owner@demo-company.com`
**Password:** `Demo2024!Owner`
**Role:** Owner
**Full Name:** Demo Owner
**User ID:** `57820ee9-4f7e-4408-82d6-37e4df8ba6e7`

**Permissions:**

- Full access to all organization settings
- Manage users and assign roles
- Access billing and subscription settings
- View and modify all conversations
- Create and manage automation rules
- Access advanced analytics and reports
- Configure WhatsApp Business integration
- Export data and generate reports

**Testing Use Cases:**

- Organization-wide settings configuration
- User management and role assignment
- Billing and subscription management
- Complete administrative control

---

### 2. Admin Account

**Email:** `admin@demo-company.com`
**Password:** `Demo2024!Admin`
**Role:** Admin
**Full Name:** Demo Admin
**User ID:** `36314967-c013-4211-b90e-1cdb8d103519`

**Permissions:**

- Manage team members (agents)
- View and modify all conversations
- Create and manage automation rules
- Create and edit message templates
- Access analytics and reports
- Manage contacts and tags
- Assign conversations to agents
- Configure automation workflows

**Testing Use Cases:**

- Team management (add/remove agents)
- Conversation assignment and routing
- Template and automation configuration
- Analytics and reporting access

---

### 3. Agent Account

**Email:** `agent@demo-company.com`
**Password:** `Demo2024!Agent`
**Role:** Agent
**Full Name:** Demo Agent
**User ID:** `73cc5e53-28a6-4878-8713-c81f311d0409`

**Permissions:**

- View assigned conversations
- Send and receive WhatsApp messages
- Access contact information
- Use message templates
- Update conversation status
- Add notes to contacts
- Basic analytics (personal metrics only)

**Testing Use Cases:**

- Message handling and responses
- Template usage
- Conversation status updates
- Personal performance tracking

---

## Super Admin Account

For super admin access (managing all organizations):

**Email:** `superadmin@adsapp.com`
**Password:** [Use existing super admin password]
**Role:** Super Admin

**Permissions:**

- Access to admin dashboard (`/admin`)
- Manage all organizations
- View system-wide statistics
- Suspend/activate organizations
- Access audit logs
- System configuration

---

## Role Comparison Matrix

| Feature                | Owner  | Admin         | Agent            |
| ---------------------- | ------ | ------------- | ---------------- |
| Manage conversations   | ✅ All | ✅ All        | ✅ Assigned only |
| Send messages          | ✅     | ✅            | ✅               |
| Manage users           | ✅     | ✅ Add agents | ❌               |
| Organization settings  | ✅     | ❌            | ❌               |
| Billing & subscription | ✅     | ❌            | ❌               |
| Create templates       | ✅     | ✅            | ❌               |
| Automation rules       | ✅     | ✅            | ❌               |
| Analytics (all)        | ✅     | ✅            | ❌               |
| Analytics (personal)   | ✅     | ✅            | ✅               |
| Contact management     | ✅     | ✅            | ✅ View only     |
| WhatsApp config        | ✅     | ❌            | ❌               |

---

## Testing Scenarios

### Scenario 1: Organization Setup (Owner)

1. Log in as owner@demo-company.com
2. Navigate to Settings → Organization
3. Configure WhatsApp Business API credentials
4. Set up business hours and auto-responses
5. Configure branding and customization

### Scenario 2: Team Management (Admin)

1. Log in as admin@demo-company.com
2. Navigate to Settings → Team
3. View existing team members (owner, admin, agent)
4. Test assigning conversations to the agent
5. Create automation rules for conversation routing

### Scenario 3: Message Handling (Agent)

1. Log in as agent@demo-company.com
2. View assigned conversations in inbox
3. Test sending messages using templates
4. Update conversation status (pending → resolved)
5. Add notes to contacts

### Scenario 4: Role Permissions Testing

1. Test each role's access to different sections
2. Verify permission restrictions:
   - Agent cannot access Settings → Organization
   - Admin cannot access Billing settings
   - Only Owner can modify subscription

### Scenario 5: Multi-User Collaboration

1. Log in with multiple accounts simultaneously (different browsers)
2. Assign a conversation from admin to agent
3. Agent handles the conversation
4. Admin monitors progress in real-time
5. Owner reviews analytics

---

## Database Information

All accounts are linked to the same organization for multi-tenant testing:

**Table:** `organizations`

- ID: `d6c6e3de-cab8-42d0-b478-69818f9773e9`
- All users share the same `organization_id` in their profiles

**Row Level Security (RLS):**

- Each user can only access data from their own organization
- Permissions are enforced at the database level
- All queries automatically filter by `organization_id`

---

## API Testing

You can use these accounts to test API endpoints:

### Authentication

```bash
POST /api/auth/signin
{
  "email": "owner@demo-company.com",
  "password": "Demo2024!Owner"
}
```

### Get Conversations (authenticated)

```bash
GET /api/conversations
Authorization: Bearer <token>
```

### Send Message

```bash
POST /api/conversations/{id}/messages
Authorization: Bearer <token>
{
  "content": "Test message",
  "message_type": "text"
}
```

---

## Security Notes

⚠️ **Important Security Information:**

1. **Demo Data Only:** These accounts contain dummy data for testing purposes only
2. **Non-Production:** Do not use these credentials in production environments
3. **WhatsApp API:** The WhatsApp credentials are placeholders and need to be configured with real API keys for actual messaging
4. **Password Policy:** Passwords follow the format `Demo2024!{Role}` for easy testing
5. **Email Confirmed:** All accounts have `email_confirm` set to `true` to bypass verification

---

## Troubleshooting

### Cannot Log In

- Verify the email and password are correct (case-sensitive)
- Check that the account is active in the database
- Clear browser cache and cookies
- Try a different browser or incognito mode

### Missing Organization Data

- Verify `organization_id` is set in the user's profile
- Check that the organization exists in the database
- Review RLS policies in Supabase

### Permission Errors

- Confirm the user's role matches expected permissions
- Check RLS policies in the Supabase dashboard
- Verify the user is accessing routes appropriate for their role

---

## Recreating Demo Accounts

To recreate these accounts from scratch:

```bash
# 1. Clean up existing demo accounts
node cleanup-demo-accounts.js

# 2. Create fresh demo accounts
node create-demo-accounts.js
```

Both scripts are located in the root directory of the project and use the Supabase service role key from `.env.local`.

---

## Support

For issues or questions about demo accounts:

1. Check the console logs in the browser developer tools
2. Review Supabase logs in the dashboard
3. Verify environment variables in `.env.local`
4. Consult the main `CLAUDE.md` documentation

---

**Last Updated:** 2025-09-30
**Script Version:** 1.0
**Organization ID:** d6c6e3de-cab8-42d0-b478-69818f9773e9
