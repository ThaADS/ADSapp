# CRM Integration Implementation Guide

## Overview

This document provides comprehensive documentation for the CRM integrations feature in ADSapp, which enables bi-directional synchronization with Salesforce, HubSpot, and Pipedrive CRM systems.

## Table of Contents

1. [Architecture](#architecture)
2. [Supported CRMs](#supported-crms)
3. [Features](#features)
4. [Setup & Configuration](#setup--configuration)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Background Jobs](#background-jobs)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

The CRM integration system follows a modular architecture with the following components:

### Component Structure

```
src/lib/crm/
├── base-client.ts          # Base CRM client interface
├── sync-manager.ts         # Central sync orchestration
├── salesforce/             # Salesforce integration
│   ├── client.ts
│   ├── auth.ts
│   ├── sync.ts
│   └── mapping.ts
├── hubspot/                # HubSpot integration
│   ├── client.ts
│   ├── auth.ts
│   ├── sync.ts
│   └── mapping.ts
└── pipedrive/              # Pipedrive integration
    ├── client.ts
    ├── auth.ts
    ├── sync.ts
    └── mapping.ts
```

### Key Design Principles

1. **Abstraction**: Common interface (`CRMClient`) for all CRM integrations
2. **Modularity**: Each CRM has isolated auth, sync, and mapping logic
3. **Extensibility**: Easy to add new CRM integrations
4. **Security**: RLS policies enforce tenant isolation
5. **Reliability**: Retry logic, error handling, and conflict detection

---

## Supported CRMs

### 1. Salesforce

- **Authentication**: OAuth 2.0 Web Server Flow
- **API Version**: v59.0
- **Objects Supported**: Contact, Lead, Opportunity, Task, Note
- **Rate Limits**: 100 requests/second
- **Custom Fields**: Supported via custom field mappings

**Environment Variables Required:**
```env
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_ENVIRONMENT=production|sandbox
```

### 2. HubSpot

- **Authentication**: OAuth 2.0
- **API Version**: v3
- **Objects Supported**: Contact, Deal, Company, Engagement, Note
- **Rate Limits**: 100 requests/second
- **Custom Properties**: Fully supported

**Environment Variables Required:**
```env
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Pipedrive

- **Authentication**: API Token
- **API Version**: v1
- **Objects Supported**: Person, Deal, Organization, Activity, Note
- **Rate Limits**: 20 requests/second (10,000 requests/day)
- **Custom Fields**: Supported

**Environment Variables Required:**
```env
PIPEDRIVE_API_TOKEN=your_api_token
```

---

## Features

### 1. Bi-Directional Sync

- **To CRM**: Sync ADSapp contacts to CRM
- **From CRM**: Sync CRM contacts to ADSapp
- **Bidirectional**: Sync in both directions automatically

### 2. Sync Types

- **Full Sync**: Sync all contacts (on-demand or weekly)
- **Delta Sync**: Sync only changed records (every 15 minutes)
- **Real-time Sync**: Via webhooks (immediate)
- **Manual Sync**: User-triggered sync for specific contacts

### 3. Conflict Resolution

When a contact is updated in both systems between syncs:

- **ADSapp Wins**: Always use ADSapp data
- **CRM Wins**: Always use CRM data
- **Newest Wins**: Use most recently updated data (default)
- **Manual**: Flag conflict for manual resolution

### 4. Field Mapping

- **Default Mappings**: Pre-configured standard field mappings
- **Custom Mappings**: User-configurable field mappings
- **Transforms**: Custom transformation rules for data conversion
- **Direction Control**: Map fields in specific directions

### 5. Background Jobs

Automated sync jobs run on schedule:

- **Delta Sync**: Every 15 minutes
- **Health Check**: Every 5 minutes
- **Conflict Detection**: Every hour
- **Failed Sync Retry**: Every hour
- **Log Cleanup**: Daily

---

## Setup & Configuration

### Step 1: Run Database Migration

Apply the CRM integration migration:

```bash
npx supabase migration up
```

This creates the following tables:
- `crm_connections`
- `crm_sync_logs`
- `crm_field_mappings`
- `crm_sync_state`
- `crm_webhooks`

### Step 2: Configure Environment Variables

Add the required environment variables for your CRMs to `.env.local`:

```env
# Salesforce
SALESFORCE_CLIENT_ID=your_salesforce_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret

# HubSpot
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret

# Pipedrive (optional if using Pipedrive)
PIPEDRIVE_API_TOKEN=your_api_token

# Cron Secret (for securing cron endpoints)
CRON_SECRET=your_random_secret_string
```

### Step 3: Configure Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/crm-sync?job=delta-sync",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/crm-sync?job=health-check",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/crm-sync?job=detect-conflicts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/crm-sync?job=cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Step 4: Set Up OAuth Apps

#### Salesforce

1. Go to Salesforce Setup → App Manager
2. Create New Connected App
3. Enable OAuth Settings
4. Set Callback URL: `https://your-app.com/api/crm/connect/callback`
5. Select Required Scopes: `api`, `refresh_token`
6. Copy Client ID and Client Secret

#### HubSpot

1. Go to HubSpot App Settings → Integrations → Private Apps
2. Create Private App or Public App
3. Add Required Scopes: CRM objects (read/write)
4. Set Redirect URL: `https://your-app.com/api/crm/connect/callback`
5. Copy App ID and Client Secret

#### Pipedrive

1. Go to Pipedrive Settings → API
2. Generate API Token
3. Copy the token (no OAuth required)

---

## API Reference

### Connect CRM

**POST** `/api/crm/connect`

Initiate OAuth flow or connect with API token.

```json
{
  "crmType": "salesforce|hubspot|pipedrive",
  "config": {
    "clientId": "optional_override",
    "clientSecret": "optional_override",
    "apiToken": "for_pipedrive",
    "environment": "production|sandbox"
  }
}
```

**Response:**
```json
{
  "authUrl": "https://crm.com/oauth/authorize?...",
  "connectionId": "uuid"
}
```

### Trigger Sync

**POST** `/api/crm/sync`

Trigger manual sync.

```json
{
  "crmType": "salesforce|hubspot|pipedrive",
  "syncType": "full|delta",
  "contactId": "optional_single_contact_id"
}
```

**Response:**
```json
{
  "success": true,
  "recordsProcessed": 150,
  "recordsSuccess": 148,
  "recordsFailed": 2,
  "duration": 5432,
  "errors": []
}
```

### Get Sync Status

**GET** `/api/crm/sync?crm_type=salesforce`

Get connection status and sync history.

**Response:**
```json
{
  "connection": {
    "id": "uuid",
    "crmType": "salesforce",
    "status": "active",
    "lastSync": "2024-01-15T10:00:00Z"
  },
  "status": {
    "connected": true,
    "recordCount": 1234
  },
  "history": [...]
}
```

### Manage Field Mappings

**GET** `/api/crm/mapping?crm_type=salesforce`

Get field mappings.

**PUT** `/api/crm/mapping`

Update field mappings.

```json
{
  "crmType": "salesforce",
  "mappings": [
    {
      "adsappField": "firstName",
      "crmField": "FirstName",
      "direction": "bidirectional",
      "transformRule": null
    }
  ]
}
```

### Disconnect CRM

**DELETE** `/api/crm/connect?crm_type=salesforce`

Disconnect CRM integration.

---

## Database Schema

### `crm_connections`

Stores CRM connection details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Organization reference |
| crm_type | TEXT | 'salesforce', 'hubspot', or 'pipedrive' |
| status | TEXT | 'active', 'paused', 'error', 'disconnected' |
| credentials | JSONB | Encrypted OAuth tokens |
| settings | JSONB | Sync settings |
| last_sync_at | TIMESTAMPTZ | Last sync timestamp |
| last_error | TEXT | Last error message |

### `crm_sync_logs`

Tracks sync history.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| connection_id | UUID | Connection reference |
| sync_type | TEXT | 'full', 'delta', 'webhook', 'manual' |
| direction | TEXT | 'to_crm', 'from_crm', 'bidirectional' |
| status | TEXT | 'running', 'completed', 'failed' |
| records_processed | INT | Total records processed |
| records_success | INT | Successfully synced |
| records_failed | INT | Failed records |
| errors | JSONB | Error details |
| started_at | TIMESTAMPTZ | Sync start time |
| completed_at | TIMESTAMPTZ | Sync completion time |

### `crm_field_mappings`

Custom field mappings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| connection_id | UUID | Connection reference |
| adsapp_field | TEXT | ADSapp field name |
| crm_field | TEXT | CRM field name |
| direction | TEXT | Sync direction |
| transform_rule | JSONB | Transformation logic |
| is_custom | BOOLEAN | User-defined mapping |

### `crm_sync_state`

Tracks sync state per contact.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| connection_id | UUID | Connection reference |
| contact_id | UUID | ADSapp contact ID |
| crm_record_id | TEXT | CRM record ID |
| crm_record_type | TEXT | Record type in CRM |
| last_synced_at | TIMESTAMPTZ | Last sync time |
| adsapp_updated_at | TIMESTAMPTZ | Last ADSapp update |
| crm_updated_at | TIMESTAMPTZ | Last CRM update |
| conflict_detected | BOOLEAN | Conflict flag |
| conflict_details | JSONB | Conflict information |

---

## Background Jobs

Background jobs are implemented in `/src/lib/jobs/crm-sync.ts` and triggered via `/api/cron/crm-sync`.

### Job Types

1. **Delta Sync** (`?job=delta-sync`)
   - Runs every 15 minutes
   - Syncs changed records only
   - Processes all active connections

2. **Health Check** (`?job=health-check`)
   - Runs every 5 minutes
   - Validates connection status
   - Updates connection health

3. **Conflict Detection** (`?job=detect-conflicts`)
   - Runs every hour
   - Identifies sync conflicts
   - Flags records for manual review

4. **Retry Failed** (`?job=retry-failed`)
   - Runs every hour
   - Retries failed syncs
   - Max 3 retry attempts

5. **Cleanup** (`?job=cleanup`)
   - Runs daily
   - Removes old sync logs (>30 days)
   - Maintains database performance

### Manual Trigger

```bash
curl -X POST "https://your-app.com/api/cron/crm-sync?job=delta-sync" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Testing

### Run Unit Tests

```bash
# All CRM tests
npm run test -- tests/unit/crm

# Specific CRM
npm run test -- tests/unit/crm/salesforce.test.ts
npm run test -- tests/unit/crm/hubspot.test.ts
npm run test -- tests/unit/crm/sync-manager.test.ts
```

### Test Coverage

The test suite covers:

- ✅ OAuth authentication flows
- ✅ Field mapping transformations
- ✅ Sync logic and conflict resolution
- ✅ Utility functions
- ✅ Error handling

### Manual Testing

1. **Connect CRM**
   - Navigate to `/dashboard/settings/crm`
   - Click "Connect" on desired CRM
   - Complete OAuth flow
   - Verify connection status

2. **Trigger Sync**
   - Click "Sync Now" button
   - Monitor sync progress in history
   - Verify contacts synced correctly

3. **Field Mapping**
   - Click "Field Mapping" button
   - Modify field directions
   - Save and test sync

---

## Troubleshooting

### Common Issues

#### 1. OAuth Connection Fails

**Symptoms**: Redirect to error page after OAuth

**Solutions**:
- Verify callback URL matches exactly in CRM app settings
- Check client ID and secret are correct
- Ensure user has permissions in CRM
- Verify environment (production vs sandbox for Salesforce)

#### 2. Sync Fails with 401 Error

**Symptoms**: "Unauthorized" errors in sync logs

**Solutions**:
- Token may have expired - reconnect CRM
- Check token refresh logic is working
- Verify API permissions/scopes are sufficient

#### 3. Rate Limit Exceeded

**Symptoms**: 429 errors in logs

**Solutions**:
- Reduce batch size in sync settings
- Increase delay between API calls
- Contact CRM support for higher limits

#### 4. Field Mapping Errors

**Symptoms**: Sync succeeds but data incorrect

**Solutions**:
- Verify field mappings are correct
- Check field data types match
- Review transformation rules
- Test with single contact first

#### 5. Conflicts Not Resolving

**Symptoms**: Same records show conflicts repeatedly

**Solutions**:
- Check conflict resolution strategy
- Manually update conflict records
- Verify timestamps are accurate
- Review RLS policies

### Debug Mode

Enable detailed logging:

```typescript
// In crm sync files, set to true
const DEBUG = true
```

### Support

For issues not covered here:

1. Check sync logs in database: `crm_sync_logs`
2. Review Supabase logs for RLS issues
3. Check Vercel logs for cron job errors
4. Contact CRM support for API issues

---

## Best Practices

1. **Start with Small Batches**: Test sync with 10-20 contacts first
2. **Monitor Sync Logs**: Regularly review sync history for errors
3. **Use Webhooks**: Enable webhooks for real-time sync when possible
4. **Backup Data**: Export contacts before major sync operations
5. **Test Field Mappings**: Validate mappings with test accounts
6. **Handle Conflicts**: Review and resolve conflicts promptly
7. **Rate Limit Awareness**: Don't trigger multiple manual syncs simultaneously
8. **Security**: Keep credentials and tokens secure, rotate regularly

---

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for additional CRMs (Zoho, Microsoft Dynamics)
- [ ] Advanced transformation rules UI
- [ ] Conflict resolution UI
- [ ] Bulk field mapping import/export
- [ ] Sync scheduling customization
- [ ] Real-time sync status dashboard
- [ ] Integration webhooks
- [ ] Multi-object sync (deals, companies, etc.)
- [ ] Sync performance analytics
- [ ] AI-powered field mapping suggestions

---

## Conclusion

The CRM integration system provides robust, scalable, and secure bi-directional synchronization with major CRM platforms. With proper configuration and monitoring, it enables seamless data flow between ADSapp and your CRM of choice.

For questions or support, please refer to the main project documentation or contact the development team.
