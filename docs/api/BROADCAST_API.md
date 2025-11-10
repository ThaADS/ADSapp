# Broadcast Campaigns API Documentatie

Complete API referentie voor het beheren van broadcast (bulk messaging) campagnes in Adsapp.

## Inhoudsopgave

- [Overzicht](#overzicht)
- [Authenticatie](#authenticatie)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overzicht

De Broadcast API stelt je in staat om bulk WhatsApp berichten te versturen naar geselecteerde doelgroepen. Perfect voor nieuwsbrieven, aankondigingen, en marketing campagnes.

**Base URL**: `/api/bulk`

**Features**:
- ✅ Bulk messaging naar duizenden contacten
- ✅ Template support voor WhatsApp compliance
- ✅ Scheduling (immediate, scheduled, recurring)
- ✅ Segmentation (tags, filters, CSV)
- ✅ Real-time progress tracking
- ✅ Retry logic voor mislukte berichten
- ✅ Rate limiting compliance

---

## Authenticatie

Alle endpoints vereisen authenticatie via Supabase session cookies.

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

## Rate Limiting

**WhatsApp Business API Limits**:
- Tier 1: 1,000 berichten/24 uur
- Tier 2: 10,000 berichten/24 uur
- Tier 3: 100,000 berichten/24 uur
- Max 80-200 berichten/seconde (standaard)

**API Limits**:
- Campaign creation: 20 campagnes/uur
- Message sending: 100 berichten/seconde

---

## Endpoints

### List Campaigns

Haal alle broadcast campagnes op.

**Endpoint**: `GET /api/bulk/campaigns`

**Query Parameters**:
```typescript
interface QueryParams {
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  limit?: number  // Default: 50, Max: 100
  offset?: number // Default: 0
  sort?: 'created_at' | 'scheduled_at' | 'name'
  order?: 'asc' | 'desc'
}
```

**Response (200)**:
```json
{
  "campaigns": [
    {
      "id": "broadcast-uuid",
      "organization_id": "org-uuid",
      "name": "Zomer Actie 2024",
      "type": "one_time",
      "status": "completed",
      "message_type": "template",
      "template_id": "summer_promo",
      "scheduled_at": "2025-11-01T09:00:00Z",
      "completed_at": "2025-11-01T12:30:00Z",
      "statistics": {
        "total_targets": 10000,
        "messages_sent": 9950,
        "messages_delivered": 9823,
        "messages_read": 7234,
        "messages_failed": 50,
        "delivery_rate": 98.7,
        "open_rate": 73.6,
        "click_rate": 12.4
      },
      "created_at": "2025-10-28T14:00:00Z",
      "created_by": "user-uuid"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

---

### Get Campaign Details

Haal details op van een specifieke campagne.

**Endpoint**: `GET /api/bulk/campaigns/:id`

**Response (200)**:
```json
{
  "campaign": {
    "id": "broadcast-uuid",
    "name": "Product Launch",
    "description": "Nieuwe product aankondiging",
    "type": "one_time",
    "status": "running",
    "targeting": {
      "type": "tags",
      "tags": ["active_customer", "premium"],
      "estimated_reach": 5420
    },
    "message": {
      "type": "template",
      "template_id": "product_launch",
      "variables": {
        "product_name": "Adsapp Pro",
        "discount": "20%"
      }
    },
    "schedule": {
      "type": "scheduled",
      "scheduled_at": "2025-11-10T10:00:00Z"
    },
    "settings": {
      "send_rate_limit": 100,
      "respect_opt_outs": true,
      "track_clicks": true,
      "track_opens": true
    },
    "statistics": {
      "total_targets": 5420,
      "messages_sent": 2134,
      "messages_delivered": 2098,
      "messages_read": 843,
      "messages_failed": 12,
      "progress_percentage": 39.4
    }
  }
}
```

---

### Create Campaign

Maak een nieuwe broadcast campagne.

**Endpoint**: `POST /api/bulk/campaigns`

**Permissions**: `admin` of `owner` rol vereist

**Request Body**:
```json
{
  "name": "Black Friday Aanbieding",
  "description": "Speciale kortingen voor Black Friday",
  "type": "one_time",

  "targeting": {
    "type": "tags",
    "tags": ["newsletter_subscriber", "active"]
  },

  "message": {
    "type": "template",
    "template_id": "black_friday_2024",
    "variables": {
      "discount_code": "BF2024",
      "discount_percentage": "30%",
      "valid_until": "27 november"
    }
  },

  "schedule": {
    "type": "scheduled",
    "scheduled_at": "2025-11-29T06:00:00Z"
  },

  "settings": {
    "send_rate_limit": 100,
    "respect_opt_outs": true,
    "track_clicks": true,
    "track_opens": true
  }
}
```

**Targeting Options**:

1. **All Contacts**:
```json
{
  "targeting": {
    "type": "all"
  }
}
```

2. **By Tags**:
```json
{
  "targeting": {
    "type": "tags",
    "tags": ["premium", "active"],
    "match": "any"  // or "all"
  }
}
```

3. **Custom Filters**:
```json
{
  "targeting": {
    "type": "custom",
    "filters": [
      {
        "field": "created_at",
        "operator": "after",
        "value": "2025-01-01"
      },
      {
        "field": "tags",
        "operator": "contains",
        "value": "premium"
      }
    ]
  }
}
```

4. **CSV Upload**:
```json
{
  "targeting": {
    "type": "csv",
    "contacts": [
      {
        "phone_number": "+31612345678",
        "name": "Jan Jansen",
        "variables": {
          "order_id": "12345"
        }
      }
    ]
  }
}
```

**Message Types**:

1. **Text Message**:
```json
{
  "message": {
    "type": "text",
    "content": "Hoi {naam}, check onze nieuwe aanbieding!"
  }
}
```

2. **Template Message** (recommended for bulk):
```json
{
  "message": {
    "type": "template",
    "template_id": "approved_template_name",
    "variables": {
      "1": "Jan",
      "2": "30%"
    }
  }
}
```

3. **Media Message**:
```json
{
  "message": {
    "type": "media",
    "media_url": "https://cdn.adsapp.nl/images/promo.jpg",
    "media_type": "image",
    "caption": "Check onze nieuwe collectie!"
  }
}
```

**Schedule Types**:

1. **Immediate**:
```json
{
  "schedule": {
    "type": "immediate"
  }
}
```

2. **Scheduled**:
```json
{
  "schedule": {
    "type": "scheduled",
    "scheduled_at": "2025-12-01T10:00:00Z"
  }
}
```

3. **Recurring**:
```json
{
  "schedule": {
    "type": "recurring",
    "frequency": "weekly",
    "interval": 1,
    "day_of_week": 1,  // Monday
    "time": "09:00"
  }
}
```

**Response (201)**:
```json
{
  "id": "broadcast-uuid",
  "name": "Black Friday Aanbieding",
  "status": "scheduled",
  "scheduled_at": "2025-11-29T06:00:00Z",
  "estimated_reach": 8432,
  "created_at": "2025-11-09T18:00:00Z"
}
```

---

### Update Campaign

Update een campagne (alleen draft of scheduled status).

**Endpoint**: `PUT /api/bulk/campaigns/:id`

**Request Body** (alle velden optioneel):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "scheduled_at": "2025-12-01T12:00:00Z"
}
```

**Important**: Je kunt geen running of completed campagnes updaten.

---

### Delete Campaign

Verwijder een campagne (alleen draft status).

**Endpoint**: `DELETE /api/bulk/campaigns/:id`

**Response (200)**:
```json
{
  "success": true,
  "message": "Campaign deleted"
}
```

---

### Send Campaign

Start het versturen van een campagne.

**Endpoint**: `POST /api/bulk/campaigns/:id/send`

**Permissions**: `admin` of `owner` rol vereist

**Prerequisites**:
- Campaign moet `draft` of `scheduled` status hebben
- Message content moet compleet zijn
- Targeting moet minimaal 1 contact opleveren

**Response (200)**:
```json
{
  "success": true,
  "campaign_id": "broadcast-uuid",
  "status": "running",
  "estimated_duration": "45 minutes",
  "total_targets": 5420,
  "started_at": "2025-11-09T18:30:00Z"
}
```

**Real-time Progress**:
```typescript
// Poll voor progress updates
const checkProgress = async (campaignId: string) => {
  const response = await fetch(`/api/bulk/campaigns/${campaignId}`)
  const { campaign } = await response.json()

  console.log(`Progress: ${campaign.statistics.progress_percentage}%`)
  console.log(`Sent: ${campaign.statistics.messages_sent}/${campaign.statistics.total_targets}`)

  if (campaign.status === 'completed') {
    console.log('Campaign finished!')
  }
}

// Check elke 10 seconden
const interval = setInterval(() => checkProgress(campaignId), 10000)
```

---

### Pause Campaign

Pauzeer een running campagne.

**Endpoint**: `POST /api/bulk/campaigns/:id/pause`

**Effect**:
- Stopt het versturen van nieuwe berichten
- Al verstuurde berichten blijven actief
- Kan later hervat worden met `/resume`

**Response (200)**:
```json
{
  "success": true,
  "campaign_id": "broadcast-uuid",
  "status": "paused",
  "messages_sent": 2134,
  "messages_remaining": 3286,
  "paused_at": "2025-11-09T18:45:00Z"
}
```

---

### Resume Campaign

Hervat een gepauzeerde campagne.

**Endpoint**: `POST /api/bulk/campaigns/:id/resume`

**Response (200)**:
```json
{
  "success": true,
  "campaign_id": "broadcast-uuid",
  "status": "running",
  "resumed_at": "2025-11-09T19:00:00Z"
}
```

---

### Cancel Campaign

Annuleer een scheduled of paused campagne permanent.

**Endpoint**: `POST /api/bulk/campaigns/:id/cancel`

**Warning**: ⚠️ Dit kan niet worden teruggedraaid.

**Response (200)**:
```json
{
  "success": true,
  "campaign_id": "broadcast-uuid",
  "status": "cancelled",
  "cancelled_at": "2025-11-09T19:05:00Z"
}
```

---

### Get Campaign Statistics

Haal gedetailleerde statistieken op.

**Endpoint**: `GET /api/bulk/campaigns/:id/statistics`

**Response (200)**:
```json
{
  "campaign_id": "broadcast-uuid",
  "statistics": {
    "total_targets": 10000,
    "messages_sent": 9950,
    "messages_delivered": 9823,
    "messages_read": 7234,
    "messages_clicked": 1456,
    "messages_replied": 234,
    "messages_failed": 50,
    "delivery_rate": 98.7,
    "open_rate": 73.6,
    "click_rate": 20.1,
    "reply_rate": 3.2,
    "failure_rate": 0.5
  },
  "timeline": [
    {
      "hour": "2025-11-09T09:00:00Z",
      "sent": 850,
      "delivered": 842,
      "failed": 8
    },
    {
      "hour": "2025-11-09T10:00:00Z",
      "sent": 920,
      "delivered": 915,
      "failed": 5
    }
  ],
  "failure_reasons": [
    {
      "reason": "invalid_phone_number",
      "count": 23
    },
    {
      "reason": "opted_out",
      "count": 17
    },
    {
      "reason": "rate_limit",
      "count": 10
    }
  ]
}
```

---

## Best Practices

### 1. Template Usage

Voor broadcast campagnes moet je **altijd** goedgekeurde WhatsApp templates gebruiken:

```typescript
// ❌ FOUT - Text berichten worden vaak geblokkeerd
{
  "message": {
    "type": "text",
    "content": "Koop nu met 50% korting!"
  }
}

// ✅ CORRECT - Gebruik goedgekeurd template
{
  "message": {
    "type": "template",
    "template_id": "promotional_offer",
    "variables": {
      "1": "50%",
      "2": "30 november"
    }
  }
}
```

### 2. Targeting Best Practices

**Segmenteer je doelgroep**:
```typescript
// Stuur verschillende berichten naar verschillende segmenten
const segments = [
  {
    name: 'Premium Klanten',
    tags: ['premium', 'active'],
    template: 'vip_offer',
    discount: '40%'
  },
  {
    name: 'Reguliere Klanten',
    tags: ['active'],
    template: 'regular_offer',
    discount: '20%'
  }
]

for (const segment of segments) {
  await createCampaign({
    name: `Black Friday - ${segment.name}`,
    targeting: { type: 'tags', tags: segment.tags },
    message: {
      type: 'template',
      template_id: segment.template,
      variables: { discount: segment.discount }
    }
  })
}
```

### 3. Timing Optimization

**Beste verzendtijden**:
- **Weekdagen**: 9:00 - 11:00 en 14:00 - 17:00
- **Weekend**: 10:00 - 14:00
- **Vermijd**: vroege ochtend (voor 8:00), late avond (na 21:00)

```typescript
const getOptimalSendTime = () => {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  // Weekend
  if (day === 0 || day === 6) {
    if (hour < 10) {
      now.setHours(10, 0, 0, 0)
    } else if (hour >= 14) {
      // Volgende dag
      now.setDate(now.getDate() + 1)
      now.setHours(10, 0, 0, 0)
    }
  }
  // Weekdag
  else {
    if (hour < 9) {
      now.setHours(9, 0, 0, 0)
    } else if (hour >= 17) {
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
    }
  }

  return now
}

const campaign = await createCampaign({
  name: 'Optimized Campaign',
  schedule: {
    type: 'scheduled',
    scheduled_at: getOptimalSendTime().toISOString()
  }
})
```

### 4. A/B Testing

Test verschillende berichten voor optimale resultaten:

```typescript
async function abTestCampaign() {
  // Selecteer 20% van je doelgroep voor test
  const testSize = Math.floor(totalContacts * 0.2)

  // Variant A
  const campaignA = await createCampaign({
    name: 'A/B Test - Variant A',
    targeting: { type: 'csv', contacts: testContactsA },
    message: {
      type: 'template',
      template_id: 'variant_a',
      variables: { cta: 'Koop Nu!' }
    }
  })

  // Variant B
  const campaignB = await createCampaign({
    name: 'A/B Test - Variant B',
    targeting: { type: 'csv', contacts: testContactsB },
    message: {
      type: 'template',
      template_id: 'variant_b',
      variables: { cta: 'Profiteer Nu!' }
    }
  })

  // Verstuur beide
  await Promise.all([
    sendCampaign(campaignA.id),
    sendCampaign(campaignB.id)
  ])

  // Wacht 24 uur en analyseer resultaten
  setTimeout(async () => {
    const statsA = await getCampaignStatistics(campaignA.id)
    const statsB = await getCampaignStatistics(campaignB.id)

    const winner = statsA.click_rate > statsB.click_rate ? 'A' : 'B'
    console.log(`Winner: Variant ${winner}`)

    // Verstuur winnaar naar rest van doelgroep
    const winnerTemplate = winner === 'A' ? 'variant_a' : 'variant_b'
    await createCampaign({
      name: 'Full Rollout',
      targeting: { type: 'tags', tags: ['all'] },
      message: { type: 'template', template_id: winnerTemplate }
    })
  }, 24 * 60 * 60 * 1000)
}
```

### 5. Error Handling & Retries

Implementeer retry logic voor mislukte berichten:

```typescript
const sendWithRetry = async (campaignId: string) => {
  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`/api/bulk/campaigns/${campaignId}/send`, {
        method: 'POST'
      })

      if (response.ok) {
        return await response.json()
      }

      // Rate limit error - wacht langer
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        await new Promise(resolve =>
          setTimeout(resolve, (retryAfter || 60) * 1000)
        )
      } else {
        throw new Error(`HTTP ${response.status}`)
      }

    } catch (error) {
      attempt++
      console.error(`Send attempt ${attempt} failed:`, error)

      if (attempt === maxRetries) {
        throw new Error('Max retries exceeded')
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      )
    }
  }
}
```

### 6. Monitoring & Alerts

Monitor campagne prestaties in real-time:

```typescript
class CampaignMonitor {
  private campaignId: string
  private alertThresholds = {
    failureRate: 5,      // Alert als > 5% mislukt
    deliveryRate: 90,    // Alert als < 90% afgeleverd
    pauseOnFailure: 10   // Pauzeer als > 10% mislukt
  }

  async monitor() {
    const stats = await getCampaignStatistics(this.campaignId)

    // Check failure rate
    if (stats.failure_rate > this.alertThresholds.failureRate) {
      await this.sendAlert(`High failure rate: ${stats.failure_rate}%`)

      if (stats.failure_rate > this.alertThresholds.pauseOnFailure) {
        await pauseCampaign(this.campaignId)
        await this.sendAlert('Campaign paused due to high failure rate')
      }
    }

    // Check delivery rate
    if (stats.delivery_rate < this.alertThresholds.deliveryRate) {
      await this.sendAlert(`Low delivery rate: ${stats.delivery_rate}%`)
    }

    // Log progress
    console.log(`Progress: ${stats.messages_sent}/${stats.total_targets}`)
  }

  private async sendAlert(message: string) {
    // Stuur email/Slack notificatie
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'campaign_alert',
        campaign_id: this.campaignId,
        message
      })
    })
  }
}

// Gebruik
const monitor = new CampaignMonitor(campaignId)
const interval = setInterval(() => monitor.monitor(), 30000) // Check elke 30 sec
```

---

## Examples

### Complete Campaign Flow

```typescript
// 1. Maak campagne
const campaign = await fetch('/api/bulk/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Product Launch Campaign',
    type: 'one_time',
    targeting: {
      type: 'tags',
      tags: ['active_customer']
    },
    message: {
      type: 'template',
      template_id: 'product_launch',
      variables: {
        product_name: 'Adsapp Pro',
        launch_date: '15 december'
      }
    },
    schedule: {
      type: 'scheduled',
      scheduled_at: '2025-12-15T09:00:00Z'
    },
    settings: {
      send_rate_limit: 100,
      respect_opt_outs: true,
      track_clicks: true
    }
  })
}).then(r => r.json())

console.log('Campaign created:', campaign.id)

// 2. Monitor tot scheduled time
// (campagne start automatisch op scheduled_at)

// 3. Monitor progress
const monitorProgress = setInterval(async () => {
  const response = await fetch(`/api/bulk/campaigns/${campaign.id}`)
  const { campaign: current } = await response.json()

  console.log(`Status: ${current.status}`)
  console.log(`Progress: ${current.statistics.progress_percentage}%`)

  if (current.status === 'completed') {
    clearInterval(monitorProgress)
    console.log('Campaign completed!')
    console.log('Statistics:', current.statistics)
  }
}, 10000)
```

---

## Rate Limits & Compliance

### WhatsApp Business API Tiers

**Tier 1** (Nieuwe accounts):
- 1,000 berichten per 24 uur
- Automatisch upgrade naar Tier 2 na goede performance

**Tier 2**:
- 10,000 berichten per 24 uur
- Automatisch upgrade naar Tier 3

**Tier 3**:
- 100,000 berichten per 24 uur
- Kan verder verhoogd worden op aanvraag

**Check je huidige tier**:
```bash
GET /api/whatsapp/limits
```

### Compliance Checklist

✅ **Altijd vereist**:
- Gebruik goedgekeurde templates voor marketing
- Respecteer opt-outs
- Volg WhatsApp Commerce Policy
- Verstuur geen spam
- Maximaal 1 marketing bericht per dag per contact

✅ **Best Practices**:
- Test campagnes met kleine groepen eerst
- Monitor delivery rates (> 90%)
- Reageer snel op opt-out requests
- Houd contactenlijst up-to-date
- Segmenteer je doelgroep

---

## Support

- **API Status**: https://status.adsapp.nl
- **WhatsApp Templates**: https://business.facebook.com/wa/manage/message-templates/
- **Support**: support@adsapp.nl
