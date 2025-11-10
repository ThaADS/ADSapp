# Drip Campaigns API Documentatie

Complete API referentie voor het beheren van drip campagnes in Adsapp.

## Inhoudsopgave

- [Overzicht](#overzicht)
- [Authenticatie](#authenticatie)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Campaign Management](#campaign-management)
  - [Campaign Steps](#campaign-steps)
  - [Enrollments](#enrollments)
  - [Campaign Control](#campaign-control)

---

## Overzicht

De Drip Campaigns API stelt je in staat om geautomatiseerde berichtreeksen te maken, beheren en monitoren. Drip campagnes sturen berichten in een vooraf gedefinieerde volgorde met tijdsvertragingen tussen berichten.

**Base URL**: `/api/drip-campaigns`

**Versie**: 1.0

**Last Updated**: November 2025

---

## Authenticatie

Alle API endpoints vereisen authenticatie via Supabase session cookies.

```typescript
// Authenticatie gebeurt automatisch via Supabase client
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**Unauthorized Response (401)**:
```json
{
  "error": "Unauthorized"
}
```

---

## Rate Limiting

- **Global**: 1000 requests per minuut per organisatie
- **Campaign Creation**: 10 campagnes per uur
- **Enrollment**: 100 enrollments per minuut

Bij overschrijding krijg je een `429 Too Many Requests` response.

---

## Error Handling

Alle errors volgen een consistent formaat:

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": {} // Only in development mode
}
```

**Common Error Codes**:
- `UNAUTHORIZED` (401) - Geen geldige authenticatie
- `FORBIDDEN` (403) - Onvoldoende rechten
- `NOT_FOUND` (404) - Resource niet gevonden
- `VALIDATION_ERROR` (400) - Ongeldige input data
- `CONFLICT` (409) - Resource conflict (bijv. duplicate enrollment)
- `INTERNAL_ERROR` (500) - Server fout

---

## Endpoints

### Campaign Management

#### List All Campaigns

Haal alle drip campagnes op voor de huidige organisatie.

**Endpoint**: `GET /api/drip-campaigns`

**Query Parameters**:
| Parameter | Type | Required | Default | Beschrijving |
|-----------|------|----------|---------|--------------|
| `status` | string | No | all | Filter op status: `active`, `paused`, `draft`, `completed` |
| `is_active` | boolean | No | - | Filter op actieve campagnes |
| `limit` | number | No | 50 | Max aantal resultaten (1-100) |
| `offset` | number | No | 0 | Aantal te skippen resultaten |

**Request Example**:
```bash
curl -X GET 'https://adsapp.nl/api/drip-campaigns?status=active&limit=10' \
  -H 'Cookie: sb-access-token=...'
```

**Response (200)**:
```json
{
  "campaigns": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "organization_id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Welkom Reeks",
      "description": "Onboarding berichten voor nieuwe klanten",
      "trigger_type": "contact_created",
      "trigger_config": {},
      "status": "active",
      "is_active": true,
      "settings": {
        "timezone": "Europe/Amsterdam",
        "respectQuietHours": true,
        "quietHoursStart": "22:00",
        "quietHoursEnd": "08:00"
      },
      "statistics": {
        "total_enrollments": 543,
        "active_enrollments": 123,
        "completed_enrollments": 402,
        "messages_sent": 1543,
        "messages_delivered": 1489,
        "messages_read": 1234,
        "messages_clicked": 234
      },
      "created_at": "2025-10-15T10:30:00Z",
      "updated_at": "2025-11-09T14:22:00Z",
      "created_by": "user-123"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

#### Get Campaign Details

Haal details op van een specifieke campagne inclusief alle steps.

**Endpoint**: `GET /api/drip-campaigns/:id`

**Path Parameters**:
| Parameter | Type | Required | Beschrijving |
|-----------|------|----------|--------------|
| `id` | UUID | Yes | Campaign ID |

**Request Example**:
```bash
curl -X GET 'https://adsapp.nl/api/drip-campaigns/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Cookie: sb-access-token=...'
```

**Response (200)**:
```json
{
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Welkom Reeks",
    "description": "Onboarding berichten voor nieuwe klanten",
    "trigger_type": "contact_created",
    "status": "active",
    "is_active": true,
    "steps": [
      {
        "id": "step-1",
        "step_order": 1,
        "name": "Welkomstbericht",
        "message_type": "text",
        "message_content": "Welkom bij Adsapp! 👋",
        "delay_type": "immediate",
        "delay_value": 0,
        "created_at": "2025-10-15T10:30:00Z"
      },
      {
        "id": "step-2",
        "step_order": 2,
        "name": "Product Info",
        "message_type": "template",
        "template_id": "product_intro",
        "delay_type": "hours",
        "delay_value": 24,
        "created_at": "2025-10-15T10:31:00Z"
      }
    ],
    "statistics": {
      "total_enrollments": 543,
      "active_enrollments": 123,
      "completed_enrollments": 402
    }
  }
}
```

**Error Responses**:
- `404`: Campaign not found
- `403`: No access to this campaign

---

#### Create Campaign

Maak een nieuwe drip campagne aan.

**Endpoint**: `POST /api/drip-campaigns`

**Permissions**: `admin` of `owner` rol vereist

**Request Body**:
```json
{
  "name": "Nieuwe Campagne",
  "description": "Beschrijving van de campagne",
  "trigger_type": "tag_added",
  "trigger_config": {
    "tags": ["new_customer", "premium"]
  },
  "settings": {
    "timezone": "Europe/Amsterdam",
    "respectQuietHours": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "maxDailyMessages": 3
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Beschrijving |
|-------|------|----------|--------------|
| `name` | string | Yes | Campagne naam (max 255 chars) |
| `description` | string | No | Beschrijving (max 1000 chars) |
| `trigger_type` | enum | Yes | `manual`, `contact_created`, `tag_added`, `custom_event`, `api` |
| `trigger_config` | object | No | Trigger-specifieke configuratie |
| `settings` | object | No | Campagne instellingen |

**Response (201)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Nieuwe Campagne",
  "status": "draft",
  "is_active": false,
  "created_at": "2025-11-09T15:30:00Z"
}
```

**Error Responses**:
- `400`: Invalid input data
- `403`: Insufficient permissions (agent role cannot create campaigns)

**Example with TypeScript**:
```typescript
const response = await fetch('/api/drip-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Product Upsell Reeks',
    description: 'Upsell bestaande klanten naar premium',
    trigger_type: 'tag_added',
    trigger_config: {
      tags: ['purchased_basic']
    },
    settings: {
      timezone: 'Europe/Amsterdam',
      respectQuietHours: true
    }
  })
})

const data = await response.json()
console.log('Campaign created:', data.id)
```

---

#### Update Campaign

Update een bestaande campagne.

**Endpoint**: `PUT /api/drip-campaigns/:id`

**Permissions**: `admin` of `owner` rol vereist

**Request Body** (alle velden zijn optioneel):
```json
{
  "name": "Updated Campaign Name",
  "description": "New description",
  "trigger_config": {
    "tags": ["updated_tag"]
  },
  "settings": {
    "maxDailyMessages": 5
  }
}
```

**Response (200)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Campaign Name",
  "updated_at": "2025-11-09T15:45:00Z"
}
```

**Important Notes**:
- Je kunt geen `trigger_type` aanpassen van een actieve campagne
- Als de campagne actieve enrollments heeft, worden sommige wijzigingen pas effectief na herstart

---

#### Delete Campaign

Verwijder een campagne permanent.

**Endpoint**: `DELETE /api/drip-campaigns/:id`

**Permissions**: `admin` of `owner` rol vereist

**Warning**: ⚠️ Dit verwijdert de campagne en **alle gerelateerde data** (steps, enrollments, logs). Deze actie kan niet worden teruggedraaid.

**Response (200)**:
```json
{
  "success": true,
  "message": "Campaign and all related data deleted"
}
```

**Error Responses**:
- `403`: Cannot delete active campaign with enrollments
- `404`: Campaign not found

---

### Campaign Steps

#### Add Steps to Campaign

Voeg één of meerdere steps toe aan een campagne.

**Endpoint**: `POST /api/drip-campaigns/:id/steps`

**Request Body**:
```json
{
  "steps": [
    {
      "step_order": 1,
      "name": "Eerste Bericht",
      "message_type": "text",
      "message_content": "Hallo {naam}! Welkom bij Adsapp.",
      "delay_type": "immediate",
      "delay_value": 0
    },
    {
      "step_order": 2,
      "name": "Follow-up",
      "message_type": "template",
      "template_id": "follow_up_template",
      "delay_type": "days",
      "delay_value": 2
    }
  ]
}
```

**Step Field Descriptions**:
| Field | Type | Required | Beschrijving |
|-------|------|----------|--------------|
| `step_order` | number | Yes | Volgorde (1, 2, 3, ...) |
| `name` | string | Yes | Step naam |
| `message_type` | enum | Yes | `text`, `template`, `media` |
| `message_content` | string | Conditional | Bericht tekst (required voor `text` en `media`) |
| `template_id` | UUID | Conditional | Template ID (required voor `template`) |
| `template_variables` | object | No | Template variabelen |
| `media_url` | string | Conditional | Media URL (required voor `media`) |
| `delay_type` | enum | Yes | `immediate`, `minutes`, `hours`, `days` |
| `delay_value` | number | Yes | Aantal delay units |

**Response (201)**:
```json
{
  "steps": [
    {
      "id": "step-1-uuid",
      "step_order": 1,
      "name": "Eerste Bericht",
      "created_at": "2025-11-09T16:00:00Z"
    },
    {
      "id": "step-2-uuid",
      "step_order": 2,
      "name": "Follow-up",
      "created_at": "2025-11-09T16:00:00Z"
    }
  ]
}
```

**Personalization Variables**:
Je kunt deze variabelen gebruiken in `message_content`:
- `{naam}` - Contact naam
- `{voornaam}` - Voornaam
- `{email}` - Email adres
- `{telefoonnummer}` - Telefoonnummer
- `{bedrijf}` - Bedrijfsnaam
- Custom velden: `{custom.veld_naam}`

---

### Enrollments

#### Enroll Contacts

Schrijf contacten in voor een campagne.

**Endpoint**: `POST /api/drip-campaigns/:id/enrollments`

**Request Body**:
```json
{
  "contact_ids": [
    "contact-uuid-1",
    "contact-uuid-2",
    "contact-uuid-3"
  ]
}
```

**Response (201)**:
```json
{
  "enrollments": [
    {
      "id": "enrollment-uuid-1",
      "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
      "contact_id": "contact-uuid-1",
      "status": "active",
      "enrolled_at": "2025-11-09T16:15:00Z",
      "next_message_at": "2025-11-09T16:15:00Z"
    }
  ],
  "skipped": [],
  "total_enrolled": 3
}
```

**Enrollment Status Types**:
- `active` - Actief in de campagne
- `paused` - Tijdelijk gepauzeerd
- `completed` - Alle steps voltooid
- `dropped` - Voortijdig gestopt (error of handmatig)
- `opted_out` - Contact heeft zich uitgeschreven

**Duplicate Handling**:
Als een contact al ingeschreven is, wordt deze geskipt:
```json
{
  "enrollments": [...],
  "skipped": [
    {
      "contact_id": "contact-uuid-2",
      "reason": "Already enrolled"
    }
  ]
}
```

---

#### List Enrollments

Haal alle enrollments op voor een campagne.

**Endpoint**: `GET /api/drip-campaigns/:id/enrollments`

**Query Parameters**:
| Parameter | Type | Required | Default | Beschrijving |
|-----------|------|----------|---------|--------------|
| `status` | string | No | all | Filter op status |
| `limit` | number | No | 50 | Max resultaten |
| `offset` | number | No | 0 | Skip resultaten |

**Response (200)**:
```json
{
  "enrollments": [
    {
      "id": "enrollment-uuid",
      "contact": {
        "id": "contact-uuid",
        "name": "Jan Jansen",
        "phone_number": "+31612345678"
      },
      "status": "active",
      "current_step_order": 2,
      "enrolled_at": "2025-11-08T10:00:00Z",
      "next_message_at": "2025-11-10T10:00:00Z",
      "messages_sent": 2,
      "messages_delivered": 2,
      "messages_read": 1,
      "replied": true
    }
  ],
  "total": 543,
  "limit": 50,
  "offset": 0
}
```

---

### Campaign Control

#### Activate Campaign

Activeer een draft campagne.

**Endpoint**: `POST /api/drip-campaigns/:id/activate`

**Permissions**: `admin` of `owner` rol vereist

**Prerequisites**:
- Campaign moet `draft` status hebben
- Minimaal 1 step moet aanwezig zijn
- Alle steps moeten valide content hebben

**Response (200)**:
```json
{
  "success": true,
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "is_active": true,
    "activated_at": "2025-11-09T16:30:00Z"
  }
}
```

**Error Responses**:
- `400`: Campaign cannot be activated (missing steps or invalid configuration)
- `409`: Campaign is already active

---

#### Pause Campaign

Pauzeer een actieve campagne.

**Endpoint**: `POST /api/drip-campaigns/:id/pause`

**Permissions**: `admin` of `owner` rol vereist

**Effect**:
- Stopt het versturen van nieuwe berichten
- Bestaande enrollments worden gepauzeerd
- Scheduled berichten worden niet verstuurd

**Response (200)**:
```json
{
  "success": true,
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paused",
    "is_active": false,
    "paused_at": "2025-11-09T16:35:00Z"
  }
}
```

---

## Best Practices

### 1. Testing Campagnes

Test altijd met een kleine testgroep voordat je een campagne volledig activeert:

```typescript
// Stap 1: Maak campagne in draft mode
const campaign = await createCampaign({ name: 'Test Campaign', ... })

// Stap 2: Voeg steps toe
await addSteps(campaign.id, [...steps])

// Stap 3: Enroll testcontacten
await enrollContacts(campaign.id, ['test-contact-1', 'test-contact-2'])

// Stap 4: Activeer campagne
await activateCampaign(campaign.id)

// Stap 5: Monitor gedurende 24-48 uur
// Stap 6: Enroll volledige doelgroep
```

### 2. Error Handling

Implementeer altijd proper error handling:

```typescript
try {
  const response = await fetch('/api/drip-campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignData)
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Campaign creation failed:', error)

    // Handle specifieke errors
    if (response.status === 403) {
      alert('Je hebt geen rechten om campagnes te maken')
    } else if (response.status === 400) {
      alert(`Validatie fout: ${error.error}`)
    }

    return
  }

  const data = await response.json()
  console.log('Success:', data)
} catch (error) {
  console.error('Network error:', error)
  alert('Er ging iets mis. Probeer het opnieuw.')
}
```

### 3. Rate Limiting

Implementeer exponential backoff voor bulk operations:

```typescript
async function enrollContactsBatch(
  campaignId: string,
  contactIds: string[],
  batchSize = 50
) {
  const batches = []
  for (let i = 0; i < contactIds.length; i += batchSize) {
    batches.push(contactIds.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        await fetch(`/api/drip-campaigns/${campaignId}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_ids: batch })
        })
        break
      } catch (error) {
        retries++
        if (retries === maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)))
      }
    }

    // Wacht tussen batches
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
```

### 4. Monitoring

Monitor campagne prestaties regelmatig:

```typescript
// Haal statistieken op
const { data: campaign } = await fetch(`/api/drip-campaigns/${id}`)

const metrics = {
  deliveryRate: (campaign.statistics.messages_delivered / campaign.statistics.messages_sent) * 100,
  openRate: (campaign.statistics.messages_read / campaign.statistics.messages_delivered) * 100,
  clickRate: (campaign.statistics.messages_clicked / campaign.statistics.messages_read) * 100,
  completionRate: (campaign.statistics.completed_enrollments / campaign.statistics.total_enrollments) * 100
}

console.log('Campaign Performance:', metrics)

// Alert bij lage performance
if (metrics.deliveryRate < 90) {
  console.warn('Low delivery rate detected:', metrics.deliveryRate)
}
```

---

## Webhooks

Je kunt webhooks configureren voor de volgende events:

- `campaign.activated` - Campagne geactiveerd
- `campaign.paused` - Campagne gepauzeerd
- `enrollment.created` - Nieuw enrollment
- `enrollment.completed` - Enrollment voltooid
- `message.sent` - Bericht verstuurd
- `message.delivered` - Bericht afgeleverd
- `message.read` - Bericht gelezen
- `message.failed` - Bericht mislukt

**Webhook Payload Example**:
```json
{
  "event": "enrollment.completed",
  "timestamp": "2025-11-09T17:00:00Z",
  "data": {
    "enrollment_id": "enrollment-uuid",
    "campaign_id": "campaign-uuid",
    "contact_id": "contact-uuid",
    "completed_at": "2025-11-09T17:00:00Z",
    "messages_sent": 5,
    "messages_read": 4
  }
}
```

---

## Support

Voor vragen of problemen:
- **Documentatie**: https://docs.adsapp.nl
- **Support Email**: support@adsapp.nl
- **GitHub Issues**: https://github.com/ThaADS/ADSapp/issues
