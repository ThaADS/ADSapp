# 📋 ADSapp PRD Implementatieplan - Ontbrekende Features

**Document Versie:** 2.0
**Laatst Bijgewerkt:** 09-01-2025
**Huidige Status:** 97.5% Complete (Phase 1 + 2)
**Resterende Werk:** ~2.5% (Widget, Mollie Payments, Team Inbox Enhancements)

---

## 📖 Inhoudsopgave

1. [Executive Summary](#executive-summary)
2. [Huidige Status Assessment](#huidige-status-assessment)
3. [Ontbrekende Features](#ontbrekende-features)
4. [Implementatie Prioriteiten](#implementatie-prioriteiten)
5. [Gedetailleerde Specificaties](#gedetailleerde-specificaties)
6. [Database Schema Wijzigingen](#database-schema-wijzigingen)
7. [API Endpoints](#api-endpoints)
8. [UI Components](#ui-components)
9. [Implementatie Roadmap](#implementatie-roadmap)
10. [Testing Strategie](#testing-strategie)
11. [Deployment Plan](#deployment-plan)

---

## 🎯 Executive Summary

### Wat is Al Geïmplementeerd (97.5%)

Op basis van de recente git pull zijn de volgende PRD features **VOLLEDIG GEÏMPLEMENTEERD**:

| PRD Feature | Status | Files | Implementatie Details |
|-------------|--------|-------|----------------------|
| **4.1 Flow Builder** | ✅ **100%** | 30+ files | Visual workflow builder met 10 node types, templates, validation |
| **4.2 Broadcasts** | ✅ **100%** | 20+ files | Complete campaign systeem, targeting, scheduling, analytics |
| **4.3 Drip Campaigns** | ✅ **100%** | 15+ files | Sequenced campaigns, 5 trigger types, enrollment management |
| **4.4 Team Inbox (Basic)** | ✅ **85%** | 10+ files | Multi-agent support, assignments, conversation status |
| **4.5 CRM Integration** | ✅ **100%** | 25+ files | HubSpot, Pipedrive, Salesforce met bi-directional sync |
| **4.7 Advanced Analytics** | ✅ **100%** | 15+ files | Custom dashboards, agent performance, campaign analytics |
| **4.6 Widget & QR** | ⚠️ **0%** | - | **NOG TE BOUWEN** |
| **4.5 Mollie Payments** | ⚠️ **0%** | - | **NOG TE BOUWEN** (Stripe bestaat wel) |
| **4.8 Chat Payment** | ⚠️ **0%** | - | **NOG TE BOUWEN** (afhankelijk van Mollie) |
| **4.4 Team Inbox (Advanced)** | ⚠️ **15%** | - | **Real-time features ontbreken** |

### Wat Nog Ontbreekt (2.5%)

**4 Ontbrekende Features:**

1. **WhatsApp Widget & QR Generator (4.6)** - 0% complete
2. **Mollie Payment Integration (4.5B)** - 0% complete
3. **WhatsApp Chat Payment Command (4.8)** - 0% complete
4. **Team Inbox Real-time Features (4.4)** - 15% complete (agent presence, typing indicators, real-time updates)

**Geschatte Implementatietijd:** 3-4 weken (1 developer)

---

## 📊 Huidige Status Assessment

### ✅ Volledig Geïmplementeerde Features

#### **Workflow/Flow Builder (4.1) - 100%**

**Locatie:** `src/components/workflow/`, `src/lib/workflow/`, `src/stores/workflow-store.ts`

**Wat Werkt:**
- ✅ Visual drag-and-drop canvas (ReactFlow)
- ✅ 10 node types: Trigger, Message, Condition, Delay, Action, AI, Split, Wait-Until, Webhook, Goal
- ✅ Node configuration modals met validatie
- ✅ Template library (welcome, re-engagement, feedback, abandoned cart, lead qualification)
- ✅ Workflow execution engine met state management
- ✅ Analytics per workflow (executions, success rate, conversions)
- ✅ Import/export functionaliteit
- ✅ Workflow versioning en rollback

**Database:**
```sql
-- Alle workflow tables bestaan en zijn operationeel
workflows, workflow_nodes, workflow_edges, workflow_executions,
workflow_execution_logs, workflow_metrics
```

**API Endpoints:**
- `GET/POST /api/workflows` - List/create workflows
- `GET/PUT/DELETE /api/workflows/[id]` - CRUD operations
- `POST /api/workflows/[id]/execute` - Trigger workflow execution
- `GET /api/workflows/[id]/analytics` - Workflow performance

---

#### **Broadcast Campaigns (4.2) - 100%**

**Locatie:** `src/components/campaigns/broadcast-*`, `src/app/api/bulk/`

**Wat Werkt:**
- ✅ Campaign builder met 5-step wizard (info, audience, message, schedule, review)
- ✅ 4 targeting options: All contacts, Tags, Custom filters, CSV upload
- ✅ Template message integration (WhatsApp approved templates)
- ✅ Scheduling met timezone support
- ✅ Campaign analytics (sent, delivered, read, failed)
- ✅ Pause/resume functionaliteit
- ✅ Campaign export (CSV)

**Database:**
```sql
bulk_campaigns, bulk_campaign_executions, bulk_campaign_analytics
```

**API Endpoints:**
- `GET/POST /api/bulk/campaigns` - List/create campaigns
- `GET/PUT/DELETE /api/bulk/campaigns/[id]` - Campaign management
- `POST /api/bulk/campaigns/[id]/send` - Start campaign
- `POST /api/bulk/campaigns/[id]/pause` - Pause campaign
- `POST /api/bulk/campaigns/[id]/resume` - Resume campaign
- `GET /api/bulk/campaigns/[id]/export` - Export results

---

#### **Drip Campaigns (4.3) - 100%**

**Locatie:** `src/components/campaigns/drip-*`, `src/lib/whatsapp/drip-campaigns.ts`

**Wat Werkt:**
- ✅ Multi-step sequence builder
- ✅ 5 trigger types: Contact created, Tag added, Purchase, Custom event, Manual
- ✅ Delay configuration (minutes, hours, days, weeks)
- ✅ Enrollment management (active, paused, completed, stopped)
- ✅ Auto-stop on reply/conversion
- ✅ Timezone-aware scheduling
- ✅ Campaign analytics (enrollment funnel, step performance)
- ✅ Cron job scheduler (`/api/cron/process-drip-messages`)

**Database:**
```sql
drip_campaigns, drip_campaign_steps, drip_campaign_enrollments,
drip_step_executions, drip_campaign_analytics
```

**API Endpoints:**
- `GET/POST /api/drip-campaigns` - List/create campaigns
- `GET/PUT/DELETE /api/drip-campaigns/[id]` - Campaign management
- `POST /api/drip-campaigns/[id]/activate` - Start campaign
- `POST /api/drip-campaigns/[id]/pause` - Pause campaign
- `GET/POST /api/drip-campaigns/[id]/enrollments` - Enrollment management
- `POST /api/drip-campaigns/[id]/steps` - Add/update steps

---

#### **CRM Integration (4.5A) - 100%**

**Locatie:** `src/lib/crm/`, `src/components/settings/crm/`

**Wat Werkt:**
- ✅ HubSpot OAuth integration met bi-directional sync
- ✅ Pipedrive OAuth integration met bi-directional sync
- ✅ Salesforce OAuth integration met bi-directional sync
- ✅ Field mapping configurator (WhatsApp ↔ CRM fields)
- ✅ Automatic sync scheduler (cron job elke 15 minuten)
- ✅ Sync history en error logging
- ✅ Manual sync trigger
- ✅ Disconnect functionaliteit

**Database:**
```sql
crm_integrations, crm_sync_logs, crm_field_mappings
```

**API Endpoints:**
- `POST /api/crm/connect` - OAuth connection initiation
- `GET /api/crm/callback` - OAuth callback handler (3 CRMs)
- `POST /api/crm/sync` - Manual sync trigger
- `GET /api/crm/status` - Sync status
- `POST /api/crm/mapping` - Field mapping configuration
- `POST /api/crm/webhooks` - CRM webhook handler
- `GET /api/cron/crm-sync` - Scheduled sync job

---

#### **Advanced Analytics (4.7) - 100%**

**Locatie:** `src/components/analytics/`, `src/app/api/analytics/`

**Wat Werkt:**
- ✅ Advanced dashboard met custom metrics
- ✅ Agent performance leaderboard
- ✅ Campaign comparison charts
- ✅ Message engagement analytics
- ✅ Agent performance charts (response time, resolution time, CSAT)
- ✅ Custom date range selection
- ✅ Export to CSV
- ✅ Real-time metrics (materialized views)

**Database:**
```sql
-- Bestaande analytics tables + materialized views
analytics_events, daily_analytics_summary, monthly_analytics_summary,
agent_performance_metrics, campaign_performance_metrics
```

**API Endpoints:**
- `GET /api/analytics/advanced` - Advanced analytics dashboard
- `GET /api/analytics/agents` - Agent performance
- `GET /api/analytics/campaigns` - Campaign analytics
- `GET /api/analytics/export` - CSV export

---

### ⚠️ Gedeeltelijk Geïmplementeerde Features

#### **Team Inbox (4.4) - 85% Complete**

**✅ Wat Werkt:**
- Multi-user architecture met RLS
- Role-based access control (Admin, Agent, Viewer)
- Conversation assignments (manual + automatic)
- Team invitations system
- Conversation status management (open, in-progress, resolved)
- Basic conversation transfer

**❌ Wat Ontbreekt (15%):**
1. **Real-time Collaboration (WebSocket/Polling)**
   - Agent presence/status (online, offline, busy, away)
   - Typing indicators voor andere agents
   - Live conversation updates
   - Real-time assignment notifications

2. **Internal Notes Systeem**
   - Database table bestaat (`conversation_notes`) maar geen UI
   - @mentions voor collega's
   - Note types (general, escalation, followup, resolution)
   - Pinned notes

3. **Advanced Routing Rules**
   - Skill-based routing
   - Round-robin assignment
   - Least-active agent routing
   - Business hours routing
   - VIP customer routing

4. **Agent Workload Dashboard**
   - Current active conversations per agent
   - Average response time per agent
   - Workload distribution visualization
   - Agent availability calendar

**Database Tables Ontbreken:**
```sql
agent_presence, conversation_notes, agent_skills, routing_rules,
conversation_assignments (audit trail)
```

---

### ❌ Niet Geïmplementeerde Features

#### **1. WhatsApp Widget & QR Generator (4.6) - 0% Complete**

**Prioriteit:** HIGH (2 weken werk)

**Wat Moet Gebouwd Worden:**

##### A) Website Chat Widget

**Functionaliteit:**
- Embed code generator voor websites
- Configureerbare button styling (kleur, positie, tekst)
- Pre-filled message optie
- Show delay (toon widget na X seconden)
- Page targeting (toon op specifieke URLs)
- Business hours respect
- Mobile responsive
- Analytics tracking (impressions, clicks, conversions)

**UI Components Nodig:**
1. Widget Configurator (`src/components/widgets/widget-configurator.tsx`)
   - Visual WYSIWYG editor
   - Live preview panel
   - Position selector (bottom-right, bottom-left, top-right, top-left)
   - Color picker (button color, text color)
   - Text customization (button text, pre-filled message)
   - Display rules editor (pages to show/hide, delay)
   - Business hours configuration

2. Widget List (`src/components/widgets/widget-list.tsx`)
   - Table met alle widgets
   - Quick stats (total clicks, conversations started)
   - Enable/disable toggle
   - Edit/delete actions

3. Widget Analytics (`src/components/widgets/widget-analytics.tsx`)
   - Impressions chart (trend over time)
   - Click-through rate
   - Conversion rate (clicks → conversations)
   - Top performing pages

**Database Schema:**
```sql
CREATE TABLE whatsapp_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  widget_name TEXT NOT NULL,

  -- WhatsApp configuration
  whatsapp_number TEXT NOT NULL,
  pre_filled_message TEXT DEFAULT 'Hallo, ik heb een vraag!',

  -- Styling
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  button_color TEXT DEFAULT '#25D366', -- WhatsApp green
  button_text_color TEXT DEFAULT '#FFFFFF',
  button_text TEXT DEFAULT 'Chat met ons',
  button_size TEXT DEFAULT 'medium' CHECK (button_size IN ('small', 'medium', 'large')),

  -- Behavior
  show_on_mobile BOOLEAN DEFAULT true,
  show_on_desktop BOOLEAN DEFAULT true,
  show_delay_seconds INTEGER DEFAULT 0,

  -- Display rules
  pages_to_show TEXT[] DEFAULT '{}', -- ['/', '/contact', '/product/*']
  pages_to_hide TEXT[] DEFAULT '{}', -- ['/checkout', '/admin/*']

  -- Business hours
  respect_business_hours BOOLEAN DEFAULT false,
  business_hours JSONB DEFAULT '{}', -- {monday: {open: '09:00', close: '17:00'}, ...}
  offline_message TEXT DEFAULT 'We zijn momenteel offline. Laat een bericht achter!',

  -- Analytics
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversations_started INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, widget_name)
);

-- RLS Policy
ALTER TABLE whatsapp_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON whatsapp_widgets
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Widget analytics events (anonymous tracking)
CREATE TABLE widget_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  widget_id UUID NOT NULL REFERENCES whatsapp_widgets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversation_started')),

  -- Page context
  page_url TEXT,
  page_title TEXT,
  referrer TEXT,

  -- Device info
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  os TEXT,

  -- Session info
  session_id TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle analytics queries
CREATE INDEX idx_widget_events_widget_id ON widget_analytics_events(widget_id);
CREATE INDEX idx_widget_events_created_at ON widget_analytics_events(created_at);
CREATE INDEX idx_widget_events_type ON widget_analytics_events(event_type);
```

**API Endpoints:**
```typescript
// Widget CRUD
POST   /api/widgets               - Create widget
GET    /api/widgets               - List all widgets
GET    /api/widgets/[id]          - Get widget details
PUT    /api/widgets/[id]          - Update widget
DELETE /api/widgets/[id]          - Delete widget

// Widget embed code
GET    /api/widgets/[id]/embed-code - Generate JavaScript embed code

// Public tracking endpoint (no auth required)
POST   /api/public/widgets/[id]/track - Track widget event (impression/click)

// Analytics
GET    /api/widgets/[id]/analytics    - Get widget analytics
GET    /api/widgets/[id]/events       - Get event logs (paginated)
```

**Widget JavaScript Implementation:**
```javascript
// Generated embed code: /public/widget.js
(function() {
  var w = window, d = document;

  // Widget configuration
  var config = w.ADSAppWidgetConfig || {};
  var widgetId = config.widgetId;
  var apiBase = 'https://adsapp.nl';

  // Track impression
  function trackEvent(eventType) {
    fetch(apiBase + '/api/public/widgets/' + widgetId + '/track', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        event_type: eventType,
        page_url: w.location.href,
        page_title: d.title,
        referrer: d.referrer,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        session_id: getSessionId()
      })
    });
  }

  // Create widget button
  function createWidget() {
    var button = d.createElement('div');
    button.id = 'adsapp-widget';
    button.style.cssText =
      'position: fixed; ' +
      'z-index: 999999; ' +
      (config.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : '') +
      (config.position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : '') +
      'width: 60px; height: 60px; ' +
      'background-color: ' + (config.color || '#25D366') + '; ' +
      'border-radius: 50%; ' +
      'box-shadow: 0 4px 8px rgba(0,0,0,0.2); ' +
      'cursor: pointer; ' +
      'display: flex; align-items: center; justify-content: center;';

    button.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="white">...</svg>';

    button.onclick = function() {
      trackEvent('click');
      var whatsappUrl = 'https://wa.me/' + config.phone;
      if (config.message) {
        whatsappUrl += '?text=' + encodeURIComponent(config.message);
      }
      w.open(whatsappUrl, '_blank');
    };

    d.body.appendChild(button);
    trackEvent('impression');
  }

  // Initialize after delay
  setTimeout(createWidget, (config.delay || 0) * 1000);

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getSessionId() {
    var sid = sessionStorage.getItem('adsapp_sid');
    if (!sid) {
      sid = 'sid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('adsapp_sid', sid);
    }
    return sid;
  }
})();
```

**Library voor QR Generation:**
```typescript
// src/lib/widgets/qr-generator.ts
import QRCode from 'qrcode'

export async function generateWhatsAppQR(options: {
  phoneNumber: string
  message?: string
  size?: number
  color?: string
  logoUrl?: string
}): Promise<string> {
  const { phoneNumber, message, size = 512, color = '#000000' } = options

  // Construct WhatsApp link
  const whatsappLink = `https://wa.me/${phoneNumber}${
    message ? `?text=${encodeURIComponent(message)}` : ''
  }`

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(whatsappLink, {
    width: size,
    margin: 2,
    color: {
      dark: color,
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H' // High error correction for logo overlay
  })

  // Optional: Add logo overlay (requires canvas manipulation)
  if (options.logoUrl) {
    return await addLogoToQR(qrDataUrl, options.logoUrl, size)
  }

  return qrDataUrl
}

async function addLogoToQR(qrDataUrl: string, logoUrl: string, size: number): Promise<string> {
  // Canvas implementation to overlay logo on QR code
  // (Implementation details omitted for brevity)
  return qrDataUrl
}
```

##### B) QR Code Generator

**UI Component:**
```typescript
// src/components/widgets/qr-code-generator.tsx
'use client'

import { useState } from 'react'
import { generateWhatsAppQR } from '@/lib/widgets/qr-generator'

export function QRCodeGenerator() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [size, setSize] = useState(512)
  const [color, setColor] = useState('#000000')

  const handleGenerate = async () => {
    const qr = await generateWhatsAppQR({
      phoneNumber,
      message,
      size,
      color
    })
    setQrCode(qr)
  }

  const handleDownload = () => {
    if (!qrCode) return

    const link = document.createElement('a')
    link.href = qrCode
    link.download = `whatsapp-qr-${phoneNumber}.png`
    link.click()
  }

  return (
    <div className="qr-generator">
      <div className="configuration">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+31612345678"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pre-filled message (optional)"
        />
        <input
          type="range"
          min="256"
          max="1024"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button onClick={handleGenerate}>Generate QR</button>
      </div>

      {qrCode && (
        <div className="preview">
          <img src={qrCode} alt="WhatsApp QR Code" />
          <button onClick={handleDownload}>Download PNG</button>
        </div>
      )}
    </div>
  )
}
```

**Implementatie Schatting:**
- Widget configurator UI: 3 dagen
- JavaScript widget implementation: 2 dagen
- QR generator UI: 1 dag
- Analytics tracking: 2 dagen
- Testing: 2 dagen
- **Totaal: 10 dagen (2 weken)**

---

#### **2. Mollie Payment Integration (4.5B) - 0% Complete**

**Prioriteit:** MEDIUM (1 week werk)

**Waarom Mollie i.p.v. Stripe:**
- Stripe is al geïmplementeerd voor subscription billing
- Mollie is specifiek voor **iDEAL betalingen** (Nederlandse voorkeur)
- Mollie ondersteunt meer Europese betaalmethoden (Bancontact, Sofort, etc.)
- Lagere transactiekosten voor iDEAL dan Stripe

**Wat Moet Gebouwd Worden:**

##### A) Mollie SDK Integratie

**Dependencies:**
```bash
npm install @mollie/api-client
```

**Environment Variables:**
```bash
MOLLIE_API_KEY=test_xxx           # For sandbox testing
MOLLIE_LIVE_API_KEY=live_xxx      # For production
MOLLIE_WEBHOOK_SECRET=whsec_xxx   # Webhook signature verification
```

**Database Schema:**
```sql
CREATE TABLE mollie_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Mollie data
  mollie_payment_id TEXT NOT NULL UNIQUE,
  mollie_checkout_url TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  description TEXT NOT NULL,

  -- Customer info (optional)
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,

  -- Payment status
  status TEXT NOT NULL CHECK (status IN (
    'open', 'pending', 'authorized', 'paid',
    'failed', 'canceled', 'expired'
  )),
  method TEXT, -- 'ideal', 'creditcard', 'bancontact', 'paypal', etc.
  method_details JSONB, -- Bank name for iDEAL, card type for credit card, etc.

  -- Webhooks
  redirect_url TEXT,
  webhook_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  CONSTRAINT amount_positive CHECK (amount > 0)
);

-- RLS Policy
ALTER TABLE mollie_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON mollie_payments
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_mollie_payments_org ON mollie_payments(organization_id);
CREATE INDEX idx_mollie_payments_conversation ON mollie_payments(conversation_id);
CREATE INDEX idx_mollie_payments_status ON mollie_payments(status);
CREATE INDEX idx_mollie_payments_created ON mollie_payments(created_at);
```

**Mollie Client Library:**
```typescript
// src/lib/payments/mollie-client.ts
import { createMollieClient, Payment, PaymentMethod } from '@mollie/api-client'

export class MolliePaymentManager {
  private client: ReturnType<typeof createMollieClient>

  constructor() {
    const apiKey = process.env.NODE_ENV === 'production'
      ? process.env.MOLLIE_LIVE_API_KEY
      : process.env.MOLLIE_API_KEY

    if (!apiKey) {
      throw new Error('Mollie API key not configured')
    }

    this.client = createMollieClient({ apiKey })
  }

  /**
   * Create a payment link for WhatsApp
   */
  async createPaymentLink(options: {
    amount: number
    description: string
    organizationId: string
    conversationId?: string
    contactId?: string
    metadata?: Record<string, any>
  }): Promise<{
    paymentId: string
    checkoutUrl: string
    expiresAt: Date
  }> {
    const { amount, description, organizationId, conversationId, contactId, metadata } = options

    // Validate amount (Mollie minimum: €0.01)
    if (amount < 0.01) {
      throw new Error('Amount must be at least €0.01')
    }

    // Create payment with Mollie
    const payment = await this.client.payments.create({
      amount: {
        value: amount.toFixed(2),
        currency: 'EUR'
      },
      description: description.substring(0, 255), // Mollie max 255 chars
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mollie`,
      metadata: {
        organization_id: organizationId,
        conversation_id: conversationId,
        contact_id: contactId,
        ...metadata
      }
    })

    // Store payment in database
    const supabase = createServiceRoleClient()
    await supabase.from('mollie_payments').insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      contact_id: contactId,
      mollie_payment_id: payment.id,
      mollie_checkout_url: payment._links.checkout!.href,
      amount: parseFloat(payment.amount.value),
      currency: payment.amount.currency,
      description: payment.description,
      status: payment.status,
      redirect_url: payment.redirectUrl,
      webhook_url: payment.webhookUrl,
      expired_at: payment.expiresAt,
      metadata: payment.metadata
    })

    return {
      paymentId: payment.id,
      checkoutUrl: payment._links.checkout!.href,
      expiresAt: new Date(payment.expiresAt!)
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(paymentId: string): Promise<Payment> {
    return await this.client.payments.get(paymentId)
  }

  /**
   * Handle Mollie webhook
   */
  async handleWebhook(paymentId: string): Promise<void> {
    const payment = await this.client.payments.get(paymentId)

    // Update database
    const supabase = createServiceRoleClient()
    const updateData: any = {
      status: payment.status,
      method: payment.method,
      method_details: payment.details
    }

    if (payment.status === 'paid') {
      updateData.paid_at = new Date()
    } else if (payment.status === 'failed') {
      updateData.failed_at = new Date()
    } else if (payment.status === 'canceled') {
      updateData.canceled_at = new Date()
    } else if (payment.status === 'expired') {
      updateData.expired_at = new Date()
    }

    await supabase
      .from('mollie_payments')
      .update(updateData)
      .eq('mollie_payment_id', paymentId)

    // Send WhatsApp notification (see section 4.8)
    await this.sendPaymentNotification(payment)
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<void> {
    const payment = await this.client.payments.get(paymentId)

    if (payment.status !== 'paid') {
      throw new Error('Can only refund paid payments')
    }

    const refundData: any = { paymentId }
    if (amount) {
      refundData.amount = {
        value: amount.toFixed(2),
        currency: 'EUR'
      }
    }

    await this.client.refunds.create(refundData)
  }

  /**
   * Get available payment methods for organization
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const methods = await this.client.methods.list({
      locale: 'nl_NL'
    })
    return methods
  }

  private async sendPaymentNotification(payment: Payment): Promise<void> {
    // Implementation in section 4.8
  }
}
```

**API Endpoints:**
```typescript
// POST /api/payments/mollie/create
// Create payment link
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { amount, description, conversationId, contactId, metadata } = await request.json()

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const mollie = new MolliePaymentManager()
  const payment = await mollie.createPaymentLink({
    amount,
    description,
    organizationId: profile!.organization_id,
    conversationId,
    contactId,
    metadata
  })

  return Response.json(payment)
}

// POST /api/webhooks/mollie
// Mollie webhook handler (public endpoint, no auth)
export async function POST(request: Request) {
  const { id: paymentId } = await request.json()

  if (!paymentId) {
    return Response.json({ error: 'Missing payment ID' }, { status: 400 })
  }

  const mollie = new MolliePaymentManager()
  await mollie.handleWebhook(paymentId)

  return Response.json({ success: true })
}

// GET /api/payments/mollie/[id]
// Get payment status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: payment } = await supabase
    .from('mollie_payments')
    .select()
    .eq('mollie_payment_id', params.id)
    .single()

  if (!payment) {
    return Response.json({ error: 'Payment not found' }, { status: 404 })
  }

  return Response.json(payment)
}

// POST /api/payments/mollie/[id]/refund
// Refund payment
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { amount } = await request.json()

  const mollie = new MolliePaymentManager()
  await mollie.refundPayment(params.id, amount)

  return Response.json({ success: true })
}
```

**UI Components:**
```typescript
// src/components/payments/mollie-payment-button.tsx
'use client'

import { useState } from 'react'

export function MolliePaymentButton({
  amount,
  description,
  conversationId,
  contactId,
  onPaymentCreated
}: {
  amount: number
  description: string
  conversationId?: string
  contactId?: string
  onPaymentCreated?: (checkoutUrl: string) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleCreatePayment = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/payments/mollie/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          conversationId,
          contactId
        })
      })

      const { checkoutUrl } = await response.json()

      if (onPaymentCreated) {
        onPaymentCreated(checkoutUrl)
      } else {
        // Open payment page in new tab
        window.open(checkoutUrl, '_blank')
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
      alert('Er is iets misgegaan bij het aanmaken van de betaallink')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCreatePayment}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? 'Bezig...' : `Betaal €${amount.toFixed(2)}`}
    </button>
  )
}
```

**Implementatie Schatting:**
- Mollie client library: 2 dagen
- API endpoints: 1 dag
- Database integration: 1 dag
- UI components: 1 dag
- Testing: 1 dag
- **Totaal: 6 dagen (1 week)**

---

#### **3. WhatsApp Chat Payment Command (4.8) - 0% Complete**

**Prioriteit:** MEDIUM (3 dagen werk)
**Afhankelijk van:** Mollie Integration (4.5B)

**Wat Moet Gebouwd Worden:**

##### A) Chat Command Parser

**Implementatie:**
```typescript
// src/lib/whatsapp/payment-command-handler.ts
import { MolliePaymentManager } from '@/lib/payments/mollie-client'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'

interface PaymentCommand {
  amount: number
  description?: string
}

/**
 * Parse payment command from WhatsApp message
 * Formats:
 * - !betaal 25
 * - !betaal 25.50
 * - !betaal 25 Factuur januari
 * - !betaal 25.00 "Productnaam met spaties"
 */
export function parsePaymentCommand(message: string): PaymentCommand | null {
  // Match: !betaal <amount> [description]
  const commandMatch = message.match(/^!betaal\s+(\d+(?:\.\d{1,2})?)\s*(.*)$/i)

  if (!commandMatch) {
    return null
  }

  const amount = parseFloat(commandMatch[1])
  const description = commandMatch[2].trim() || 'WhatsApp betaling'

  // Validate amount
  if (isNaN(amount) || amount < 0.01) {
    return null
  }

  if (amount > 1000) {
    throw new Error('Maximum bedrag is €1.000 per transactie')
  }

  return { amount, description }
}

/**
 * Handle payment command in conversation
 */
export async function handlePaymentCommand(
  message: string,
  conversationId: string,
  contactId: string,
  organizationId: string
): Promise<void> {
  const command = parsePaymentCommand(message)

  if (!command) {
    return // Not a valid payment command
  }

  // Rate limiting: max 5 payment links per hour per contact
  const recentPayments = await checkRecentPayments(contactId)
  if (recentPayments >= 5) {
    await sendWhatsAppMessage(contactId, {
      type: 'text',
      text: {
        body: '⚠️ Je hebt het maximum aantal betaalverzoeken bereikt. Probeer het over een uur opnieuw.'
      }
    })
    return
  }

  // Create Mollie payment link
  const mollie = new MolliePaymentManager()
  const payment = await mollie.createPaymentLink({
    amount: command.amount,
    description: command.description,
    organizationId,
    conversationId,
    contactId
  })

  // Send payment link via WhatsApp
  await sendWhatsAppMessage(contactId, {
    type: 'text',
    text: {
      body: formatPaymentMessage(command.amount, command.description, payment.checkoutUrl, payment.expiresAt)
    }
  })

  // Create internal conversation note
  await createConversationNote(conversationId, {
    content: `Betaallink verzonden: €${command.amount.toFixed(2)} - ${command.description}`,
    note_type: 'payment',
    author_id: 'system'
  })
}

function formatPaymentMessage(
  amount: number,
  description: string,
  checkoutUrl: string,
  expiresAt: Date
): string {
  const expiryMinutes = Math.floor((expiresAt.getTime() - Date.now()) / 60000)

  return `💳 *Betaalverzoek*

💶 Bedrag: €${amount.toFixed(2)}
📝 Omschrijving: ${description}

👉 Klik hier om te betalen:
${checkoutUrl}

⏰ Deze link is ${expiryMinutes} minuten geldig.

_Je ontvangt een bevestiging zodra de betaling is ontvangen._`
}

async function checkRecentPayments(contactId: string): Promise<number> {
  const supabase = createServiceRoleClient()

  const { count } = await supabase
    .from('mollie_payments')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour

  return count || 0
}
```

##### B) Payment Status Notifications

**Webhook Handler Extension:**
```typescript
// Extension of MolliePaymentManager.sendPaymentNotification()
private async sendPaymentNotification(payment: Payment): Promise<void> {
  const supabase = createServiceRoleClient()

  // Get payment record with contact info
  const { data: paymentRecord } = await supabase
    .from('mollie_payments')
    .select('contact_id, amount, description')
    .eq('mollie_payment_id', payment.id)
    .single()

  if (!paymentRecord?.contact_id) {
    return // No contact to notify
  }

  let message: string

  switch (payment.status) {
    case 'paid':
      message = `✅ *Betaling ontvangen!*

💶 Bedrag: €${paymentRecord.amount.toFixed(2)}
📝 ${paymentRecord.description}
📅 Datum: ${new Date().toLocaleDateString('nl-NL')}

Bedankt voor je betaling!`
      break

    case 'failed':
      message = `❌ *Betaling mislukt*

De betaling van €${paymentRecord.amount.toFixed(2)} is niet gelukt.

Probeer het opnieuw of neem contact met ons op voor hulp.`
      break

    case 'expired':
      message = `⏰ *Betaallink verlopen*

De betaallink voor €${paymentRecord.amount.toFixed(2)} is verlopen.

Stuur '!betaal ${paymentRecord.amount}' voor een nieuwe betaallink.`
      break

    case 'canceled':
      message = `🚫 *Betaling geannuleerd*

Je hebt de betaling van €${paymentRecord.amount.toFixed(2)} geannuleerd.

Als je toch wilt betalen, vraag dan een nieuwe betaallink aan.`
      break

    default:
      return // Don't send notification for other statuses
  }

  await sendWhatsAppMessage(paymentRecord.contact_id, {
    type: 'text',
    text: { body: message }
  })
}
```

##### C) Agent Dashboard Integration

**UI Component voor Payment Status:**
```typescript
// src/components/payments/payment-status-badge.tsx
export function PaymentStatusBadge({ status }: { status: string }) {
  const config = {
    open: { label: 'Wacht op betaling', color: 'yellow', icon: '⏳' },
    pending: { label: 'Verwerken', color: 'blue', icon: '🔄' },
    paid: { label: 'Betaald', color: 'green', icon: '✅' },
    failed: { label: 'Mislukt', color: 'red', icon: '❌' },
    expired: { label: 'Verlopen', color: 'gray', icon: '⏰' },
    canceled: { label: 'Geannuleerd', color: 'gray', icon: '🚫' }
  }

  const { label, color, icon } = config[status] || config.open

  return (
    <span className={`badge badge-${color}`}>
      {icon} {label}
    </span>
  )
}
```

**Conversation Sidebar Payment Panel:**
```typescript
// src/components/inbox/conversation-payment-panel.tsx
'use client'

import { useEffect, useState } from 'react'
import { PaymentStatusBadge } from '@/components/payments/payment-status-badge'

export function ConversationPaymentPanel({ conversationId }: { conversationId: string }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [conversationId])

  const fetchPayments = async () => {
    const response = await fetch(`/api/conversations/${conversationId}/payments`)
    const data = await response.json()
    setPayments(data)
    setLoading(false)
  }

  if (loading) return <div>Loading payments...</div>
  if (payments.length === 0) return null

  return (
    <div className="payment-panel">
      <h3>Betalingen</h3>

      {payments.map(payment => (
        <div key={payment.id} className="payment-item">
          <div className="payment-info">
            <strong>€{payment.amount.toFixed(2)}</strong>
            <span>{payment.description}</span>
            <PaymentStatusBadge status={payment.status} />
          </div>

          <div className="payment-meta">
            <span>{new Date(payment.created_at).toLocaleString('nl-NL')}</span>
            {payment.method && <span>{payment.method.toUpperCase()}</span>}
          </div>

          {payment.status === 'open' && (
            <a href={payment.mollie_checkout_url} target="_blank" rel="noopener">
              Betaallink openen
            </a>
          )}

          {payment.status === 'paid' && (
            <button onClick={() => handleRefund(payment.id)}>
              Terugbetalen
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

**Integration in Message Handler:**
```typescript
// src/lib/whatsapp/message-handler.ts
import { handlePaymentCommand } from '@/lib/whatsapp/payment-command-handler'

export async function handleIncomingMessage(message: WhatsAppMessage) {
  // ... existing message handling logic

  // Check for payment command
  if (message.type === 'text' && message.text.body.startsWith('!betaal')) {
    await handlePaymentCommand(
      message.text.body,
      message.conversation_id,
      message.contact_id,
      message.organization_id
    )
    return // Don't process as regular message
  }

  // ... rest of message handling
}
```

**Implementatie Schatting:**
- Command parser: 1 dag
- Webhook notifications: 1 dag
- UI components + integration: 1 dag
- **Totaal: 3 dagen**

---

#### **4. Team Inbox Real-time Features (4.4) - 15% Missing**

**Prioriteit:** LOW (1 week werk)

**Wat Ontbreekt:**

##### A) Agent Presence System

**Database Schema:**
```sql
CREATE TABLE agent_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'busy', 'away')),
  status_message TEXT, -- Custom status like "In meeting"

  -- Capacity
  max_concurrent_conversations INTEGER DEFAULT 5,
  current_conversation_count INTEGER DEFAULT 0,

  -- Timestamps
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id)
);

-- RLS Policy
ALTER TABLE agent_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON agent_presence
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Auto-update last_active_at on any update
CREATE OR REPLACE FUNCTION update_agent_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_presence_update_timestamp
BEFORE UPDATE ON agent_presence
FOR EACH ROW
EXECUTE FUNCTION update_agent_presence_timestamp();
```

**Real-time Updates:**
```typescript
// src/lib/realtime/agent-presence.ts
import { createClient } from '@/lib/supabase/client'

export class AgentPresenceManager {
  private supabase = createClient()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private channel: any = null

  /**
   * Initialize presence tracking for current user
   */
  async initialize(agentId: string, organizationId: string) {
    // Upsert presence record
    await this.supabase.from('agent_presence').upsert({
      agent_id: agentId,
      organization_id: organizationId,
      status: 'online',
      last_active_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })

    // Start heartbeat (update every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat(agentId)
    }, 30000)

    // Subscribe to presence changes
    this.channel = this.supabase
      .channel('agent_presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_presence',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          this.handlePresenceChange(payload)
        }
      )
      .subscribe()

    // Set offline on window close
    window.addEventListener('beforeunload', () => {
      this.setOffline(agentId)
    })
  }

  private async updateHeartbeat(agentId: string) {
    await this.supabase
      .from('agent_presence')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('agent_id', agentId)
  }

  async setStatus(agentId: string, status: string, statusMessage?: string) {
    await this.supabase
      .from('agent_presence')
      .update({
        status,
        status_message: statusMessage,
        last_active_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
  }

  private async setOffline(agentId: string) {
    await this.supabase
      .from('agent_presence')
      .update({ status: 'offline' })
      .eq('agent_id', agentId)
  }

  private handlePresenceChange(payload: any) {
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('agent-presence-changed', {
      detail: payload.new
    }))
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.channel) {
      this.channel.unsubscribe()
    }
  }
}
```

##### B) Internal Notes System

**UI Component:**
```typescript
// src/components/inbox/conversation-notes-panel.tsx
'use client'

import { useState, useEffect } from 'react'

export function ConversationNotesPanel({ conversationId }: { conversationId: string }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')

  useEffect(() => {
    fetchNotes()
    subscribeToNotes()
  }, [conversationId])

  const fetchNotes = async () => {
    const response = await fetch(`/api/conversations/${conversationId}/notes`)
    const data = await response.json()
    setNotes(data)
  }

  const subscribeToNotes = () => {
    // Real-time subscription for new notes
    const supabase = createClient()
    const channel = supabase
      .channel(`notes:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_notes',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setNotes(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    await fetch(`/api/conversations/${conversationId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newNote,
        note_type: noteType
      })
    })

    setNewNote('')
  }

  return (
    <div className="notes-panel">
      <h3>Interne notities</h3>

      <div className="note-composer">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Voeg een notitie toe..."
        />
        <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
          <option value="general">Algemeen</option>
          <option value="escalation">Escalatie</option>
          <option value="followup">Opvolging</option>
          <option value="resolution">Oplossing</option>
        </select>
        <button onClick={handleAddNote}>Toevoegen</button>
      </div>

      <div className="notes-list">
        {notes.map(note => (
          <div key={note.id} className={`note note-${note.note_type}`}>
            <div className="note-header">
              <strong>{note.author?.full_name}</strong>
              <span>{new Date(note.created_at).toLocaleString('nl-NL')}</span>
            </div>
            <p>{note.content}</p>
            {note.is_pinned && <span className="pin-badge">📌 Vastgepind</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

##### C) Typing Indicators

**Real-time Typing Events:**
```typescript
// src/hooks/use-typing-indicator.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useTypingIndicator(conversationId: string) {
  const [typingAgents, setTypingAgents] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to typing events
    const channel = supabase.channel(`typing:${conversationId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const typing = Object.values(state)
          .flat()
          .filter((presence: any) => presence.typing)
          .map((presence: any) => presence.agent_id)

        setTypingAgents(typing)
      })
      .subscribe()

    return () => channel.unsubscribe()
  }, [conversationId])

  const broadcastTyping = (isTyping: boolean) => {
    const supabase = createClient()
    const channel = supabase.channel(`typing:${conversationId}`)

    channel.track({
      typing: isTyping,
      agent_id: user.id,
      timestamp: Date.now()
    })
  }

  return { typingAgents, broadcastTyping }
}
```

**Implementatie Schatting:**
- Agent presence system: 2 dagen
- Internal notes UI + API: 2 dagen
- Typing indicators: 1 dag
- Testing: 2 dagen
- **Totaal: 7 dagen (1 week)**

---

## 🗓️ Implementatie Roadmap

### **Week 1-2: WhatsApp Widget & QR Generator (Feature 4.6)**

**Dag 1-3: Widget Configurator**
- [ ] Database migrations (`whatsapp_widgets`, `widget_analytics_events`)
- [ ] Widget CRUD API endpoints
- [ ] Widget configurator UI component
- [ ] Live preview panel

**Dag 4-5: JavaScript Widget**
- [ ] Widget embed code generator
- [ ] JavaScript widget implementation (`/public/widget.js`)
- [ ] Analytics tracking (impressions, clicks)

**Dag 6: QR Generator**
- [ ] QR code generator UI
- [ ] Download functionality
- [ ] Custom styling options (size, color)

**Dag 7-8: Analytics & Testing**
- [ ] Widget analytics dashboard
- [ ] E2E tests for widget creation
- [ ] Test embed code on sample websites

**Dag 9-10: Documentation & Polish**
- [ ] User documentation (hoe widget te installeren)
- [ ] Code examples en troubleshooting
- [ ] UI polish en bug fixes

**Deliverable:** Werkende widget embed systeem + QR generator

---

### **Week 3: Mollie Payment Integration (Feature 4.5B & 4.8)**

**Dag 1-2: Mollie SDK Integratie**
- [ ] Install @mollie/api-client
- [ ] Environment variables setup
- [ ] Database migrations (`mollie_payments`)
- [ ] Mollie client library (`MolliePaymentManager`)

**Dag 3-4: API Endpoints & Webhooks**
- [ ] `/api/payments/mollie/create` endpoint
- [ ] `/api/webhooks/mollie` webhook handler
- [ ] Payment status sync
- [ ] Payment refund functionality

**Dag 5: Chat Payment Command**
- [ ] Payment command parser (`!betaal` command)
- [ ] WhatsApp message formatting
- [ ] Rate limiting (max 5 links/hour)
- [ ] Payment status notifications

**Dag 6-7: UI Components & Testing**
- [ ] Payment button component
- [ ] Payment status badges
- [ ] Conversation payment panel
- [ ] E2E payment flow tests
- [ ] Sandbox testing

**Deliverable:** Werkend iDEAL payment systeem met WhatsApp integratie

---

### **Week 4: Team Inbox Real-time Features (Feature 4.4)**

**Dag 1-2: Agent Presence**
- [ ] Database migrations (`agent_presence`)
- [ ] Presence manager library
- [ ] Heartbeat system (30s intervals)
- [ ] Status UI components (online/offline/busy/away)

**Dag 3-4: Internal Notes**
- [ ] Database migrations (`conversation_notes`)
- [ ] Notes CRUD API
- [ ] Notes panel UI component
- [ ] Real-time note updates (Supabase real-time)
- [ ] @mentions functionality

**Dag 5: Typing Indicators**
- [ ] Typing event broadcast (Supabase presence)
- [ ] Typing indicator UI component
- [ ] Debounce logic (stop after 3s inactivity)

**Dag 6-7: Integration & Testing**
- [ ] Integrate all real-time features in inbox
- [ ] Performance testing (100+ concurrent agents)
- [ ] E2E tests for collaboration scenarios
- [ ] Documentation updates

**Deliverable:** Volledige real-time team collaboration features

---

## 🧪 Testing Strategie

### Unit Tests

**Widget Tests:**
```typescript
// tests/unit/widgets/widget-configurator.test.ts
describe('Widget Configurator', () => {
  it('should generate valid embed code', () => {
    const config = {
      widgetId: 'test-123',
      position: 'bottom-right',
      color: '#25D366',
      phone: '+31612345678'
    }

    const embedCode = generateEmbedCode(config)
    expect(embedCode).toContain('ADSAppWidgetConfig')
    expect(embedCode).toContain(config.widgetId)
  })

  it('should validate phone number format', () => {
    expect(validatePhoneNumber('+31612345678')).toBe(true)
    expect(validatePhoneNumber('invalid')).toBe(false)
  })
})
```

**Payment Tests:**
```typescript
// tests/unit/payments/mollie-client.test.ts
import { MolliePaymentManager } from '@/lib/payments/mollie-client'

describe('MolliePaymentManager', () => {
  it('should create payment link', async () => {
    const mollie = new MolliePaymentManager()
    const payment = await mollie.createPaymentLink({
      amount: 25.00,
      description: 'Test payment',
      organizationId: 'org-123'
    })

    expect(payment.paymentId).toBeDefined()
    expect(payment.checkoutUrl).toMatch(/^https:\/\/www\.mollie\.com/)
  })

  it('should reject invalid amounts', async () => {
    const mollie = new MolliePaymentManager()

    await expect(
      mollie.createPaymentLink({
        amount: 0,
        description: 'Invalid',
        organizationId: 'org-123'
      })
    ).rejects.toThrow('Amount must be at least €0.01')
  })
})
```

**Payment Command Tests:**
```typescript
// tests/unit/whatsapp/payment-command.test.ts
import { parsePaymentCommand } from '@/lib/whatsapp/payment-command-handler'

describe('Payment Command Parser', () => {
  it('should parse basic command', () => {
    const result = parsePaymentCommand('!betaal 25')
    expect(result).toEqual({
      amount: 25,
      description: 'WhatsApp betaling'
    })
  })

  it('should parse command with description', () => {
    const result = parsePaymentCommand('!betaal 25.50 Factuur januari')
    expect(result).toEqual({
      amount: 25.50,
      description: 'Factuur januari'
    })
  })

  it('should return null for invalid commands', () => {
    expect(parsePaymentCommand('betaal 25')).toBeNull()
    expect(parsePaymentCommand('!betaal invalid')).toBeNull()
  })
})
```

### Integration Tests

**Widget E2E:**
```typescript
// tests/e2e/widgets/widget-creation.spec.ts
import { test, expect } from '@playwright/test'

test('create and configure widget', async ({ page }) => {
  await page.goto('/dashboard/widgets')
  await page.click('button:has-text("Nieuw Widget")')

  // Configure widget
  await page.fill('[name="widgetName"]', 'Test Widget')
  await page.fill('[name="phoneNumber"]', '+31612345678')
  await page.selectOption('[name="position"]', 'bottom-right')

  // Preview
  const preview = page.locator('.widget-preview')
  await expect(preview).toBeVisible()

  // Save
  await page.click('button:has-text("Opslaan")')
  await expect(page.locator('.success-message')).toBeVisible()

  // Verify embed code
  await page.click('button:has-text("Embed Code")')
  const embedCode = await page.locator('.embed-code').textContent()
  expect(embedCode).toContain('ADSAppWidgetConfig')
})
```

**Payment E2E:**
```typescript
// tests/e2e/payments/mollie-payment.spec.ts
import { test, expect } from '@playwright/test'

test('complete payment flow', async ({ page, context }) => {
  await page.goto('/dashboard/inbox/conversation-123')

  // Agent sends payment command
  await page.fill('[name="message"]', '!betaal 25.00 Test betaling')
  await page.click('button[type="submit"]')

  // Wait for payment link to appear in chat
  const paymentMessage = page.locator('.message:has-text("Betaalverzoek")')
  await expect(paymentMessage).toBeVisible()

  // Extract payment link
  const linkLocator = paymentMessage.locator('a')
  const paymentUrl = await linkLocator.getAttribute('href')
  expect(paymentUrl).toContain('mollie.com')

  // Open payment page in new tab
  const [paymentPage] = await Promise.all([
    context.waitForEvent('page'),
    linkLocator.click()
  ])

  // Complete payment (Mollie test mode)
  await paymentPage.waitForLoadState()
  await paymentPage.click('button:has-text("Betaal")')

  // Verify payment status in original page
  await page.reload()
  const paymentBadge = page.locator('.payment-status-badge:has-text("Betaald")')
  await expect(paymentBadge).toBeVisible()
})
```

### Performance Tests

**Widget Load Time:**
```typescript
// tests/performance/widget-load.spec.ts
test('widget loads within 500ms', async ({ page }) => {
  const start = Date.now()

  await page.goto('/dashboard/widgets')
  await page.waitForSelector('.widget-list')

  const loadTime = Date.now() - start
  expect(loadTime).toBeLessThan(500)
})
```

**Real-time Performance:**
```typescript
// tests/performance/realtime-updates.spec.ts
test('presence updates propagate within 1 second', async ({ page, context }) => {
  // Open two browser contexts (two agents)
  const agent1 = await context.newPage()
  const agent2 = await context.newPage()

  await agent1.goto('/dashboard/inbox')
  await agent2.goto('/dashboard/inbox')

  // Agent 1 changes status
  const startTime = Date.now()
  await agent1.click('[data-testid="status-dropdown"]')
  await agent1.click('button:has-text("Busy")')

  // Wait for Agent 2 to see the update
  await agent2.waitForSelector('[data-testid="agent-1-status"]:has-text("Busy")')

  const propagationTime = Date.now() - startTime
  expect(propagationTime).toBeLessThan(1000)
})
```

---

## 🚀 Deployment Plan

### Pre-Deployment Checklist

**Environment Variables:**
```bash
# Production .env
MOLLIE_LIVE_API_KEY=live_xxx
MOLLIE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_WIDGET_CDN=https://cdn.adsapp.nl
```

**Database Migrations:**
```bash
# Apply migrations to production
npx supabase db push --linked

# Verify migrations
npx supabase db diff
```

**Build & Test:**
```bash
# Run full test suite
npm run test:ci

# Build production bundle
npm run build

# Verify build size (should be <500KB gzipped)
npm run analyze
```

### Deployment Steps

**Step 1: Staging Deployment**
1. Deploy to Vercel staging environment
2. Run E2E tests against staging
3. Test widget embed on sample website
4. Complete Mollie test payment
5. Verify real-time features with 2+ concurrent users

**Step 2: Production Deployment**
1. Create production database backup
2. Apply database migrations
3. Deploy to Vercel production
4. Update Mollie webhook URL to production endpoint
5. Monitor error tracking (Sentry)

**Step 3: Post-Deployment Verification**
- [ ] Widget embed code accessible at `/public/widget.js`
- [ ] Mollie webhook responding (check Mollie dashboard logs)
- [ ] Real-time presence updates working
- [ ] Payment notifications delivering via WhatsApp
- [ ] No regression in existing features

### Rollback Plan

**If Critical Issues:**
1. Revert Vercel deployment to previous version
2. Restore database from backup (if schema changed)
3. Update Mollie webhook back to previous URL
4. Notify users of temporary downtime

**Monitoring:**
- Error rate < 1% (Sentry)
- API response time < 200ms p95 (Vercel Analytics)
- Widget load time < 500ms (Lighthouse CI)
- Payment success rate > 95% (Mollie dashboard)

---

## 📚 Documentation Updates

### User Documentation

**Nieuwe Secties:**
1. **Widget Installatie Guide** (`docs/WIDGET_INSTALLATION.md`)
   - Stap-voor-stap installatie
   - Embed code kopiëren
   - Styling aanpassen
   - Troubleshooting

2. **Mollie Payments Guide** (`docs/MOLLIE_PAYMENTS.md`)
   - iDEAL setup
   - API keys configureren
   - Webhook setup
   - Refund procedure

3. **Chat Payment Commands** (`docs/CHAT_PAYMENTS.md`)
   - `!betaal` command syntax
   - Rate limits
   - Payment notifications
   - Customer support

### Developer Documentation

**Nieuwe Secties:**
1. **Widget Development Guide** (`docs/dev/WIDGET_DEVELOPMENT.md`)
   - Widget architecture
   - Embed code generation
   - Analytics implementation
   - Testing strategy

2. **Payment Integration Guide** (`docs/dev/PAYMENT_INTEGRATION.md`)
   - Mollie SDK usage
   - Webhook handling
   - Security best practices
   - Error handling

3. **Real-time Features Guide** (`docs/dev/REALTIME_FEATURES.md`)
   - Supabase real-time usage
   - Presence system architecture
   - Typing indicators
   - Performance optimization

---

## 📊 Success Criteria

### Feature Completion Metrics

**Widget & QR Generator:**
- [ ] ≥90% of users able to install widget without support
- [ ] <500ms widget load time
- [ ] >80% click-to-conversation rate
- [ ] Zero XSS vulnerabilities

**Mollie Payments:**
- [ ] ≥95% payment success rate
- [ ] <2s webhook processing time
- [ ] Zero fraudulent transactions
- [ ] 100% PCI DSS compliance

**Team Inbox Real-time:**
- [ ] <1s presence update propagation
- [ ] >99.9% real-time uptime
- [ ] <100ms typing indicator latency
- [ ] Support 100+ concurrent agents

### Business Impact Metrics

**After 30 Days:**
- [ ] ≥50% of organizations install widget
- [ ] ≥€10,000 processed via Mollie payments
- [ ] ≥30% reduction in agent response time (with presence)
- [ ] ≥4.5/5 user satisfaction score

---

## 🎯 Conclusie

### Samenvatting Implementatieplan

**Totale Implementatietijd:** 4 weken (1 full-time developer)

**Feature Breakdown:**
1. **Widget & QR Generator** - 2 weken (Week 1-2)
2. **Mollie Payments + Chat Commands** - 1 week (Week 3)
3. **Team Inbox Real-time** - 1 week (Week 4)

**Totale Effort:**
- Backend development: 10 dagen
- Frontend development: 8 dagen
- Testing: 4 dagen
- Documentation: 2 dagen
- **Totaal: 24 werkdagen**

### Risico's & Mitigatie

**Technische Risico's:**
1. **Widget Cross-site Compatibility** - Test op meerdere websites en frameworks
2. **Mollie Webhook Failures** - Implement retry mechanism + error logging
3. **Real-time Scalability** - Load test met 100+ concurrent users

**Business Risico's:**
1. **Widget Adoption** - Maak installatie zo eenvoudig mogelijk + video tutorial
2. **Payment Fraud** - Implement rate limiting + fraud detection
3. **Real-time Performance** - Monitor latency en optimize if needed

### Next Steps

**Immediate Actions (Deze Week):**
1. ✅ Review en approve dit implementatieplan
2. ✅ Setup Mollie test account en API keys
3. ✅ Create GitHub issues voor alle features
4. ✅ Begin met Widget database migrations

**Week 1 Kickoff:**
1. Create feature branch: `feature/widget-qr-generator`
2. Setup widget configurator component skeleton
3. Implement widget database schema
4. Begin widget CRUD API endpoints

---

**Document Status:** Ready for Implementation ✅
**Last Updated:** 09-01-2025
**Author:** Claude (Sonnet 4.5)
**Approval Required:** Product Owner / Tech Lead
