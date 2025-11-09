# Phase 1: Drip Campaigns & Enhanced Analytics

**Status:** ✅ Database Schema Completed
**Date:** 2025-11-09
**Migration:** `041_drip_campaigns_and_analytics.sql`

## 📋 Overzicht

Deze fase implementeert de kern campagne functionaliteit voor Adsapp.nl:

1. **Drip Campaigns** - Geautomatiseerde berichtenreeksen over tijd
2. **Broadcast Campaigns** - Bulk messaging naar doelgroepen (volledig)
3. **Enhanced Analytics** - Uitgebreide statistieken voor campagnes en agents

---

## 🗃️ Database Schema

### 1. Bulk Campaigns (Broadcast Berichten)

#### `bulk_campaigns` tabel
Hoofdtabel voor broadcast campagnes.

**Belangrijke velden:**
- `type`: promotional, transactional, notification, survey
- `status`: draft → scheduled → running → completed/cancelled
- `target_audience`: JSON met segmentatie criteria
- `scheduling`: Wanneer en hoe vaak te versturen
- `statistics`: Real-time campagne statistieken

**Voorbeeld target_audience:**
```json
{
  "type": "tags",
  "tags": ["leads", "interested"]
}
```

**Voorbeeld scheduling:**
```json
{
  "type": "scheduled",
  "scheduledAt": "2025-11-15T10:00:00Z",
  "timezone": "Europe/Amsterdam"
}
```

#### `bulk_message_jobs` tabel
Individuele berichten binnen een campagne. Elke rij = 1 bericht naar 1 contact.

**Status flow:**
```
pending → sent → delivered → read
         ↓
       failed (met retry logica)
```

**Retry mechanisme:**
- Max 3 pogingen per bericht
- Exponential backoff: 1 min, 2 min, 4 min

#### `contact_lists` tabel
Herbruikbare lijsten van contacten voor targeting.

---

### 2. Drip Campaigns (Geautomatiseerde Sequenties)

#### `drip_campaigns` tabel
Hoofdconfiguratie van een drip campagne.

**Trigger types:**
- `manual`: Handmatig toevoegen van contacten
- `contact_created`: Bij nieuwe contact
- `tag_added`: Wanneer specifieke tag wordt toegevoegd
- `custom_event`: Via API events
- `api`: Extern getriggerd

**Settings voorbeeld:**
```json
{
  "stopOnReply": true,
  "respectBusinessHours": false,
  "maxContactsPerDay": 1000
}
```

#### `drip_campaign_steps` tabel
Individuele stappen binnen een drip sequence.

**Stap configuratie:**
```sql
step_order: 1           -- Volgorde in sequentie
delay_type: 'days'      -- minutes, hours, days, weeks
delay_value: 2          -- 2 dagen na vorige stap
message_type: 'template'
```

**Voorbeeld 3-stapjes sequentie:**
```
Stap 1: Direct - "Welkom!"
Stap 2: Na 2 dagen - "Heeft u hulp nodig?"
Stap 3: Na 5 dagen - "Speciale aanbieding"
```

#### `drip_enrollments` tabel
Koppelt contacten aan campagnes en houdt voortgang bij.

**Status flow:**
```
active → completed (alle stappen doorlopen)
  ↓
paused/dropped/opted_out (voortijdig gestopt)
```

**Belangrijke velden:**
- `current_step_order`: Waar contact zich nu bevindt
- `next_message_at`: Wanneer volgende bericht verstuurd wordt
- `messages_sent/delivered/read`: Progressie tracking

#### `drip_message_logs` tabel
Audit trail van alle verstuurde drip berichten.

---

### 3. Enhanced Analytics

#### `campaign_analytics` tabel
Dagelijkse geaggregeerde statistieken per campagne.

**Metrics:**
```sql
messages_sent: 1000
messages_delivered: 980  → delivery_rate: 98%
messages_read: 750       → open_rate: 75%
replies_received: 120    → reply_rate: 12%
opt_outs: 5
```

#### `agent_performance_metrics` tabel
Dagelijkse performance per agent.

**Gemeten:**
- Aantal afgehandelde gesprekken
- Gemiddelde responstijd (eerste reactie + algemeen)
- Gemiddelde oplostijd
- Online tijd
- Klanttevredenheid (indien gemeten)

#### `channel_sources` tabel
Trackt waar gesprekken vandaan komen.

**Source types:**
- `direct`: Direct WhatsApp nummer
- `qr_code`: Via QR code scan
- `web_widget`: Via website widget
- `api`: Via API call
- `campaign`: Via broadcast/drip campagne

#### `template_usage_analytics` tabel
Welke templates hoe vaak worden gebruikt.

---

## 🔧 Database Functions

### `schedule_next_drip_message(enrollment_id)`
Automatische functie die de volgende stap in een drip campagne plant.

**Logica:**
1. Haal huidige enrollment op
2. Zoek volgende stap op volgorde
3. Bereken delay vanaf nu
4. Update enrollment met next_message_at
5. Maak message_log entry aan

**Voorbeeld:**
```sql
-- Contact voltooit stap 1
SELECT schedule_next_drip_message('enrollment-uuid');
-- → Plant stap 2 over 2 dagen
```

### `update_drip_campaign_statistics()`
Trigger functie die automatisch campagne stats update bij enrollment wijzigingen.

### `track_message_delivery()`
Trigger op messages tabel die automatisch analytics update bij delivery/read.

---

## 📊 Indexen voor Performance

Alle kritieke queries zijn geoptimaliseerd met indexen:

**Drip scheduling queries:**
```sql
-- Vind alle berichten die nu verstuurd moeten worden
SELECT * FROM drip_enrollments
WHERE status = 'active'
  AND next_message_at <= NOW()
ORDER BY next_message_at;
-- → Gebruikt idx_drip_enrollments_next_message
```

**Campaign analytics queries:**
```sql
-- Haal stats op voor laatste 30 dagen
SELECT * FROM campaign_analytics
WHERE organization_id = $1
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
-- → Gebruikt idx_campaign_analytics_org_date
```

---

## 🔒 Row Level Security (RLS)

Alle tabellen hebben RLS enabled met multi-tenant isolatie:

```sql
-- Voorbeeld: Gebruiker kan alleen campagnes van eigen organisatie zien
CREATE POLICY "Users can access bulk campaigns in their org"
ON bulk_campaigns
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

Dit zorgt ervoor dat:
- Bedrijf A kan nooit data van Bedrijf B zien
- Automatisch gefilterd op database niveau
- Geen extra checks nodig in applicatiecode

---

## 🚀 Gebruik Voorbeelden

### Broadcast Campagne Workflow

```typescript
// 1. Maak campagne aan
const campaign = await bulkMessagingEngine.createCampaign(orgId, {
  name: "Black Friday Sale",
  type: "promotional",
  targetAudience: {
    type: "tags",
    tags: ["customers", "vip"]
  },
  message: {
    type: "template",
    content: "Speciale korting voor u!"
  },
  scheduling: {
    type: "scheduled",
    scheduledAt: new Date("2025-11-15T10:00:00Z")
  },
  rateLimiting: {
    enabled: true,
    messagesPerHour: 500
  }
});

// 2. Start campagne (genereert jobs voor alle targets)
await bulkMessagingEngine.startCampaign(campaign.id);

// 3. Monitor progress
const stats = await bulkMessagingEngine.getCampaign(campaign.id);
console.log(stats.statistics);
// {
//   totalTargets: 1500,
//   messagesSent: 450,
//   deliveryRate: 97.5,
//   ...
// }
```

### Drip Campagne Setup

```sql
-- 1. Maak drip campagne aan
INSERT INTO drip_campaigns (organization_id, name, trigger_type, status)
VALUES ($1, 'Nieuwe Lead Opvolging', 'tag_added', 'active');

-- 2. Voeg stappen toe
INSERT INTO drip_campaign_steps (campaign_id, step_order, delay_type, delay_value, message_content)
VALUES
  ($1, 1, 'minutes', 0, 'Welkom! Fijn dat je interesse hebt.'),
  ($1, 2, 'days', 2, 'Heb je nog vragen over onze diensten?'),
  ($1, 3, 'days', 5, 'Laatste kans: 10% korting deze week!');

-- 3. Enroll contact
INSERT INTO drip_enrollments (campaign_id, contact_id, enrolled_by)
VALUES ($1, $2, $3);

-- 4. Automatisch: eerste bericht wordt direct gepland via trigger
```

### Analytics Queries

```sql
-- Top performing campaigns (laatste 30 dagen)
SELECT
  bc.name,
  ca.messages_sent,
  ca.delivery_rate,
  ca.reply_rate
FROM campaign_analytics ca
JOIN bulk_campaigns bc ON bc.id = ca.campaign_id
WHERE ca.organization_id = $1
  AND ca.date >= CURRENT_DATE - 30
  AND ca.campaign_type = 'bulk'
ORDER BY ca.reply_rate DESC
LIMIT 10;

-- Agent performance (deze week)
SELECT
  p.full_name,
  SUM(apm.conversations_handled) as total_convos,
  AVG(apm.avg_first_response_time) as avg_response,
  AVG(apm.customer_satisfaction_score) as csat
FROM agent_performance_metrics apm
JOIN profiles p ON p.id = apm.agent_id
WHERE apm.organization_id = $1
  AND apm.date >= date_trunc('week', CURRENT_DATE)
GROUP BY p.id, p.full_name
ORDER BY total_convos DESC;
```

---

## ⚙️ Configuratie & Migratie

### Migratie Toepassen

```bash
# Lokaal testen
npm run migration:generate
npm run migration:apply

# Of via Supabase CLI
npx supabase db push

# Verifieer
npx supabase db pull
```

### Rollback Strategie

Als migratie moet worden teruggedraaid:

```sql
-- Verwijder alle nieuwe tabellen in omgekeerde volgorde
DROP TABLE IF EXISTS template_usage_analytics CASCADE;
DROP TABLE IF EXISTS channel_sources CASCADE;
DROP TABLE IF EXISTS agent_performance_metrics CASCADE;
DROP TABLE IF EXISTS campaign_analytics CASCADE;
DROP TABLE IF EXISTS drip_message_logs CASCADE;
DROP TABLE IF EXISTS drip_enrollments CASCADE;
DROP TABLE IF EXISTS drip_campaign_steps CASCADE;
DROP TABLE IF EXISTS drip_campaigns CASCADE;
DROP TABLE IF EXISTS contact_lists CASCADE;
DROP TABLE IF EXISTS bulk_message_jobs CASCADE;
DROP TABLE IF EXISTS bulk_campaigns CASCADE;

-- Verwijder functies
DROP FUNCTION IF EXISTS track_message_delivery() CASCADE;
DROP FUNCTION IF EXISTS schedule_next_drip_message(UUID);
DROP FUNCTION IF EXISTS update_drip_campaign_statistics() CASCADE;
```

---

## 📈 Performance Overwegingen

### Scheduling Performance

**Drip message scheduler** moet regelmatig draaien (elke 1-5 minuten):

```typescript
// Cron job of worker proces
setInterval(async () => {
  const due = await supabase
    .from('drip_enrollments')
    .select('*, contact:contacts(*), step:drip_campaign_steps(*)')
    .eq('status', 'active')
    .lte('next_message_at', new Date().toISOString())
    .limit(100);

  for (const enrollment of due.data) {
    await sendDripMessage(enrollment);
    await schedule_next_drip_message(enrollment.id);
  }
}, 60000); // Elke minuut
```

### Bulk Job Processing

Voor grote campagnes (>10k ontvangers):
- Verwerk in batches van 100-500
- Rate limiting respecteren
- Parallelle workers voor schaalbaarheid

### Analytics Aggregatie

Campaign analytics worden real-time ge-update via triggers, maar kunnen ook:
- Dagelijks batch aggregeren voor historische data
- Caching voor dashboard queries
- Materialized views voor complexe berekeningen

---

## 🔄 Integratie met Bestaande Features

### Workflow Builder
Drip campaigns kunnen geïntegreerd worden als "Drip Campaign Action" node:

```typescript
// In workflow builder
{
  type: 'action',
  actionType: 'enroll_in_drip',
  config: {
    campaignId: 'uuid',
    skipIfAlreadyEnrolled: true
  }
}
```

### Automation Rules
Bestaande automation_rules kunnen drip enrollments triggeren:

```typescript
{
  trigger_type: 'tag_added',
  actions: [{
    type: 'enroll_drip_campaign',
    campaign_id: 'uuid'
  }]
}
```

### Message Templates
Beide systemen gebruiken dezelfde message_templates tabel voor consistentie.

---

## 🧪 Testing Checklist

- [ ] Bulk campaign creation en targeting
- [ ] Drip campaign multi-step sequencing
- [ ] Rate limiting functioneert correct
- [ ] Analytics real-time updates
- [ ] RLS policies werken (geen cross-tenant leaks)
- [ ] Retry mechanisme voor gefaalde berichten
- [ ] Stop-on-reply logica voor drip campaigns
- [ ] Opt-out handling
- [ ] Performance met 10k+ contacts
- [ ] Concurrent campaign execution

---

## 📚 Volgende Stappen

Na database schema:

1. **Backend Implementation**
   - Drip campaign engine service
   - API endpoints voor CRUD operaties
   - Scheduler/worker voor message sending

2. **Frontend Components**
   - Campaign builder UI
   - Drip sequence editor
   - Analytics dashboard updates

3. **Integration**
   - WhatsApp API message sending
   - Template selection
   - Contact segmentation

4. **Documentation**
   - API reference
   - User guides
   - Admin documentation

---

## 📞 Support & Vragen

Voor vragen over deze implementatie:
- Zie `CLAUDE.md` voor algemene architectuur
- Check `src/lib/whatsapp/bulk-messaging.ts` voor bestaande bulk logic
- Database schema: `supabase/migrations/041_*.sql`

---

**Last Updated:** 2025-11-09
**Version:** 1.0.0
**Status:** Database Schema Complete, Implementation In Progress
