# 🤖 AI Integration Master Plan - OpenRouter + ADSapp

**Date:** 2025-11-05
**Goal:** Integrate OpenRouter AI capabilities voor intelligent message handling
**Target:** 100% Production Readiness
**Strategy:** Fix blockers → Add AI features → Full testing → Launch

---

## 🎯 Executive Summary

Dit plan combineert twee kritieke doelen:
1. **Fix alle blockers** om naar 100% readiness te gaan
2. **Integreer OpenRouter AI** voor intelligente WhatsApp inbox features

**Timeline:** 2-3 dagen development + 1 week testing
**Impact:** Game-changing AI features voor WhatsApp customer service

---

## 📊 Current Status → Target Status

| Component | Current | Target | Actions |
|-----------|---------|--------|---------|
| TypeScript Compilation | ❌ 122 errors | ✅ 0 errors | Fix route handlers, regenerate types |
| Stripe Configuration | ⚠️ Placeholders | ✅ Production ready | Configure price IDs, webhooks |
| AI Integration | ❌ Not present | ✅ Full featured | OpenRouter API integration |
| Git Repository | ⚠️ 75+ uncommitted | ✅ Clean | Commit strategy, branch cleanup |
| Test Coverage | ✅ 85% | ✅ 95% | Add AI tests, integration tests |
| Production Build | ❌ Fails | ✅ Succeeds | Fix all blockers |
| **Overall Readiness** | **75%** | **100%** | Complete all phases |

---

## 🚀 Implementation Strategy (3 Phases)

### PHASE 1: Fix Critical Blockers (Priority 1)
**Duration:** 4-6 hours
**Goal:** Get application to buildable state

### PHASE 2: OpenRouter AI Integration (Priority 1)
**Duration:** 1-2 days
**Goal:** Add intelligent AI features

### PHASE 3: Testing & Launch Prep (Priority 1)
**Duration:** 1-2 days
**Goal:** Achieve 100% production readiness

---

## 📋 PHASE 1: Fix Critical Blockers

### Task 1.1: TypeScript Compilation Errors (2-3 hours)

#### A. Fix Next.js 15 Route Handler Pattern (HIGH PRIORITY)
**Problem:** Next.js 15 changed route handler params to be Promise-based

**Files to Fix (3 critical):**
```typescript
// File 1: src/app/api/admin/webhooks/[id]/retry/route.ts
// File 2: src/app/api/team/invitations/[id]/route.ts
// File 3: src/app/api/team/members/[id]/route.ts

// ❌ OLD PATTERN (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  // ... rest of code
}

// ✅ NEW PATTERN (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... rest of code
}
```

**Action Items:**
- [ ] Fix `src/app/api/admin/webhooks/[id]/retry/route.ts`
- [ ] Fix `src/app/api/team/invitations/[id]/route.ts`
- [ ] Fix `src/app/api/team/members/[id]/route.ts`
- [ ] Search for all other dynamic route handlers: `grep -r "params.*{.*id.*string" src/app/api`
- [ ] Apply pattern to ALL dynamic routes

#### B. Regenerate Database Types (30 min)
**Problem:** Schema drift between migrations and TypeScript types

**Commands:**
```bash
# Generate types from Supabase
npx supabase gen types typescript --linked > src/types/database.ts

# Verify generation
npm run type-check
```

**Missing Tables to Add:**
- `message_templates`
- `bulk_operations`
- Any other tables from migrations 034-039

#### C. Fix Supabase Client Await Issues (30 min)
**Problem:** `createClient()` returns Promise, not awaited

**Pattern to Find & Fix:**
```typescript
// ❌ WRONG
const supabase = createClient();
const { data } = await supabase.auth.getUser();

// ✅ CORRECT
const supabase = await createClient();
const { data } = await supabase.auth.getUser();
```

**Files to Check:**
- `src/app/api/billing/invoices/route.ts:9`
- Search all API routes: `grep -r "= createClient()" src/app/api`

#### D. Fix Null Handling Issues (1 hour)
**Problem:** Nullable types not handled properly

**Common Patterns:**
```typescript
// ❌ WRONG
const orgId: string = profile.organization_id;  // Can be null

// ✅ CORRECT
const orgId = profile.organization_id;
if (!orgId) {
  return Response.json({ error: 'No organization' }, { status: 400 });
}
```

**Validation:**
```bash
# After all fixes
npm run type-check  # Should show 0 errors
npm run lint        # Should pass
npm run build       # Should succeed
```

---

### Task 1.2: Stripe Configuration (1 hour)

#### Create Stripe Products & Prices

**Step 1: Stripe Dashboard Setup**
1. Login to Stripe Dashboard (test mode): https://dashboard.stripe.com/test/products
2. Create 3 products:

**Product 1: Starter**
- Name: "ADSapp Starter"
- Description: "Perfect voor kleine bedrijven"
- Pricing: €29/month (recurring)
- Features: 1,000 messages/month, 2 users, basic automation
- Copy Price ID → `price_1xxxxxxxxxxxxx`

**Product 2: Professional**
- Name: "ADSapp Professional"
- Description: "Voor groeiende teams"
- Pricing: €79/month (recurring)
- Features: 10,000 messages/month, 10 users, advanced automation, analytics
- Copy Price ID → `price_1xxxxxxxxxxxxx`

**Product 3: Enterprise**
- Name: "ADSapp Enterprise"
- Description: "Voor grote organisaties"
- Pricing: €199/month (recurring)
- Features: Unlimited messages, unlimited users, custom integrations, dedicated support
- Copy Price ID → `price_1xxxxxxxxxxxxx`

**Step 2: Update Environment Variables**
```env
# Update .env.local
STRIPE_STARTER_PRICE_ID=price_1xxxxxxxxxxxxx      # From Stripe Dashboard
STRIPE_PROFESSIONAL_PRICE_ID=price_1xxxxxxxxxxxxx  # From Stripe Dashboard
STRIPE_ENTERPRISE_PRICE_ID=price_1xxxxxxxxxxxxx    # From Stripe Dashboard
```

**Step 3: Configure Webhook Endpoint**
```bash
# For local testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# For production (after deployment)
# Add in Stripe Dashboard: https://yourdomain.com/api/webhooks/stripe
# Events to listen:
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.payment_succeeded
# - invoice.payment_failed
```

**Step 4: Update Webhook Secret**
```env
# After webhook configuration
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # From Stripe Dashboard
```

---

### Task 1.3: Git Repository Cleanup (30 min)

#### Strategy: Clean Commits per Feature Area

**Step 1: Review Unstaged Changes**
```bash
git status
git diff --stat
```

**Step 2: Create Feature Commits**
```bash
# Commit 1: Documentation cleanup
git add docs/
git commit -m "docs: Clean up temporary documentation files"

# Commit 2: TypeScript fixes
git add src/app/api/
git add src/types/
git commit -m "fix: Resolve TypeScript compilation errors for Next.js 15"

# Commit 3: Stripe configuration
git add .env.local
git add src/app/api/billing/
git commit -m "feat: Complete Stripe billing configuration"

# Commit 4: New migrations
git add supabase/migrations/
git commit -m "feat: Add SOC2 compliance and team management migrations"

# Commit 5: Configuration updates
git add next.config.ts package.json playwright.config.ts
git commit -m "chore: Update configuration for production readiness"
```

**Step 3: Remove Temporary Files**
```bash
# List of files to delete (temporary documentation)
rm ADMIN_DASHBOARD_404_ROOT_CAUSE_ANALYSIS.md
rm ADMIN_DASHBOARD_COMPLETE_FIX.md
rm BUILD_NOTES.md
rm CLICK_HERE.md
rm STATUS_*.md
rm QUICK_WIN_*.md
# ... (see full list in git status)

# Or bulk remove
git clean -fd -n  # Preview what will be deleted
git clean -fd     # Actually delete untracked files
```

---

## 🤖 PHASE 2: OpenRouter AI Integration

### Overview: AI-Powered WhatsApp Features

**OpenRouter Benefits:**
- Access to multiple AI models (GPT-4, Claude, Llama, etc.)
- Cost-effective pricing
- Unified API for all models
- Model fallback capabilities

**Target Features:**
1. **AI-Powered Auto-Responses** - Intelligent replies to common questions
2. **Smart Message Drafts** - AI-generated response suggestions
3. **Conversation Summaries** - Automatic conversation summarization
4. **Sentiment Analysis** - Detect customer sentiment (positive/negative/neutral)
5. **Message Templates** - AI-generated message templates
6. **Intent Recognition** - Understand customer intent for routing
7. **Language Translation** - Multi-language support

---

### Task 2.1: OpenRouter Setup & Architecture (2 hours)

#### A. OpenRouter Account Setup

**Step 1: Create Account**
1. Visit https://openrouter.ai/
2. Sign up with email
3. Verify account

**Step 2: Generate API Key**
1. Go to Settings → API Keys
2. Create new key: "ADSapp Production"
3. Copy key (starts with `sk-or-v1-`)
4. Add to environment variables

**Step 3: Environment Configuration**
```env
# Add to .env.local
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet  # or openai/gpt-4-turbo
OPENROUTER_FALLBACK_MODEL=anthropic/claude-3-haiku    # Cheaper fallback
OPENROUTER_MAX_TOKENS=1000
OPENROUTER_TEMPERATURE=0.7
```

#### B. Create AI Service Architecture

**File Structure:**
```
src/lib/ai/
├── openrouter.ts           # OpenRouter client wrapper
├── prompts.ts              # Prompt templates
├── types.ts                # TypeScript types
├── auto-response.ts        # Auto-response logic
├── drafts.ts               # Draft suggestions
├── summarization.ts        # Conversation summaries
├── sentiment.ts            # Sentiment analysis
├── translation.ts          # Language translation
└── templates.ts            # Template generation
```

**Database Schema Updates:**
```sql
-- Migration: 040_ai_features.sql

-- AI-generated responses tracking
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  feedback VARCHAR(20), -- 'accepted', 'rejected', 'edited'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- AI configuration per organization
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  auto_response_enabled BOOLEAN DEFAULT false,
  draft_suggestions_enabled BOOLEAN DEFAULT true,
  sentiment_analysis_enabled BOOLEAN DEFAULT true,
  translation_enabled BOOLEAN DEFAULT false,
  preferred_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
  max_tokens INTEGER DEFAULT 1000,
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  auto_response_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates with AI generation
ALTER TABLE message_templates ADD COLUMN ai_generated BOOLEAN DEFAULT false;
ALTER TABLE message_templates ADD COLUMN ai_prompt TEXT;
ALTER TABLE message_templates ADD COLUMN ai_model VARCHAR(100);

-- Conversation metadata for AI
CREATE TABLE conversation_ai_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT,
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
  detected_language VARCHAR(10),
  intent VARCHAR(50),
  topics TEXT[],
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_responses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

ALTER TABLE conversation_ai_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_ai_metadata
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Indexes for performance
CREATE INDEX idx_ai_responses_org_id ON ai_responses(organization_id);
CREATE INDEX idx_ai_responses_conversation_id ON ai_responses(conversation_id);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at DESC);
CREATE INDEX idx_conversation_ai_metadata_conversation_id ON conversation_ai_metadata(conversation_id);
```

---

### Task 2.2: OpenRouter Client Implementation (2 hours)

**File: `src/lib/ai/openrouter.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private defaultModel: string;
  private fallbackModel: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3-haiku';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
  }

  async chat(
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest> = {}
  ): Promise<OpenRouterResponse> {
    const model = options.model || this.defaultModel;

    try {
      return await this.makeRequest(model, messages, options);
    } catch (error) {
      // Fallback to cheaper model on error
      console.warn(`Primary model ${model} failed, falling back to ${this.fallbackModel}`);
      return await this.makeRequest(this.fallbackModel, messages, options);
    }
  }

  private async makeRequest(
    model: string,
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest>
  ): Promise<OpenRouterResponse> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://adsapp.nl',
        'X-Title': 'ADSapp WhatsApp Inbox'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json();
    const latency = Date.now() - startTime;

    // Log usage for cost tracking
    await this.logUsage(model, data.usage, latency);

    return data;
  }

  private async logUsage(
    model: string,
    usage: OpenRouterResponse['usage'],
    latencyMs: number
  ) {
    try {
      const supabase = await createClient();

      // Calculate approximate cost (model-specific pricing)
      const costPerMillion = this.getModelCost(model);
      const costUsd = (usage.total_tokens / 1_000_000) * costPerMillion;

      await supabase.from('ai_responses').insert({
        model,
        tokens_used: usage.total_tokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
        prompt: '', // Will be filled by calling function
        response: '' // Will be filled by calling function
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  private getModelCost(model: string): number {
    // Approximate costs per million tokens (input + output averaged)
    const costs: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 3.00,
      'anthropic/claude-3-haiku': 0.25,
      'openai/gpt-4-turbo': 10.00,
      'openai/gpt-3.5-turbo': 0.50,
      'meta-llama/llama-3-70b': 0.90,
      'google/gemini-pro': 0.125
    };
    return costs[model] || 1.00;
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available models');
    }

    const data = await response.json();
    return data.data.map((model: any) => model.id);
  }
}

export const openRouter = new OpenRouterClient();
```

**File: `src/lib/ai/types.ts`**
```typescript
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
}

export interface ConversationContext {
  conversationId: string;
  organizationId: string;
  messages: Array<{
    sender: 'customer' | 'agent';
    content: string;
    timestamp: string;
  }>;
  customerName?: string;
  customerPhone: string;
}

export interface AutoResponseConfig {
  enabled: boolean;
  conditions: {
    outsideBusinessHours?: boolean;
    noAgentAvailable?: boolean;
    keywords?: string[];
    maxQueueTime?: number;
  };
  tone: 'professional' | 'friendly' | 'casual';
  language: string;
}

export interface DraftSuggestion {
  content: string;
  confidence: number;
  reasoning: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1.0 to 1.0
  topics: string[];
  urgency: 'low' | 'medium' | 'high';
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  resolvedIssues: string[];
  openQuestions: string[];
}
```

---

### Task 2.3: AI Feature Implementation (6-8 hours)

#### Feature 1: Smart Draft Suggestions (2 hours)

**File: `src/lib/ai/drafts.ts`**
```typescript
import { openRouter } from './openrouter';
import type { ConversationContext, DraftSuggestion } from './types';

export async function generateDraftSuggestions(
  context: ConversationContext,
  count: number = 3
): Promise<DraftSuggestion[]> {
  const systemPrompt = `Je bent een professionele klantenservice assistent voor WhatsApp.
Genereer ${count} verschillende antwoord suggesties op het laatste bericht van de klant.
Houd rekening met de conversatie context en blijf consistent met de toon.
Wees behulpzaam, empathisch en professioneel.`;

  const conversationHistory = context.messages
    .slice(-5) // Last 5 messages for context
    .map(msg => `${msg.sender === 'customer' ? 'Klant' : 'Agent'}: ${msg.content}`)
    .join('\n');

  const userPrompt = `Conversatie geschiedenis:
${conversationHistory}

Genereer ${count} verschillende antwoord suggesties als JSON array:
[
  {
    "content": "Het antwoord...",
    "tone": "professional/friendly/empathetic",
    "reasoning": "Waarom dit een goed antwoord is..."
  }
]`;

  const response = await openRouter.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.8, // Higher for more creative suggestions
    max_tokens: 1500
  });

  const content = response.choices[0].message.content;
  const suggestions = JSON.parse(content);

  return suggestions.map((sug: any) => ({
    content: sug.content,
    confidence: 0.85, // Could be calculated based on model confidence
    reasoning: sug.reasoning
  }));
}
```

**API Endpoint: `src/app/api/ai/drafts/route.ts`**
```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDraftSuggestions } from '@/lib/ai/drafts';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return Response.json({ error: 'No organization' }, { status: 403 });
    }

    // Check if AI is enabled for this organization
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('enabled, draft_suggestions_enabled')
      .eq('organization_id', profile.organization_id)
      .single();

    if (!aiSettings?.enabled || !aiSettings?.draft_suggestions_enabled) {
      return Response.json({ error: 'AI features not enabled' }, { status: 403 });
    }

    // Parse request
    const body = await request.json();
    const { conversationId, count = 3 } = body;

    // Get conversation context
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        organization_id,
        contact:contacts(name, phone_number),
        messages(sender, content, created_at)
      `)
      .eq('id', conversationId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build context
    const context = {
      conversationId: conversation.id,
      organizationId: conversation.organization_id,
      messages: conversation.messages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.created_at
        })),
      customerName: conversation.contact.name,
      customerPhone: conversation.contact.phone_number
    };

    // Generate suggestions
    const suggestions = await generateDraftSuggestions(context, count);

    return Response.json({ suggestions });

  } catch (error) {
    console.error('Draft generation error:', error);
    return Response.json(
      { error: 'Failed to generate drafts' },
      { status: 500 }
    );
  }
}
```

#### Feature 2: Auto-Response System (2 hours)

**File: `src/lib/ai/auto-response.ts`**
```typescript
import { openRouter } from './openrouter';
import type { ConversationContext, AutoResponseConfig } from './types';
import { createClient } from '@/lib/supabase/server';

export async function shouldAutoRespond(
  conversationId: string,
  organizationId: string,
  config: AutoResponseConfig
): Promise<boolean> {
  if (!config.enabled) return false;

  const supabase = await createClient();

  // Check conditions
  const conditions = config.conditions;

  // Outside business hours?
  if (conditions.outsideBusinessHours) {
    const { data: orgSettings } = await supabase
      .from('organizations')
      .select('business_hours')
      .eq('id', organizationId)
      .single();

    if (orgSettings?.business_hours && !isWithinBusinessHours(orgSettings.business_hours)) {
      return true;
    }
  }

  // No agent available?
  if (conditions.noAgentAvailable) {
    const { data: activeAgents } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('role', ['agent', 'admin', 'owner']);

    if (!activeAgents || activeAgents.length === 0) {
      return true;
    }
  }

  // Queue time exceeded?
  if (conditions.maxQueueTime) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('created_at, last_message_at')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const waitTime = Date.now() - new Date(conversation.last_message_at).getTime();
      if (waitTime > conditions.maxQueueTime * 60 * 1000) {
        return true;
      }
    }
  }

  return false;
}

export async function generateAutoResponse(
  context: ConversationContext,
  config: AutoResponseConfig
): Promise<string> {
  const toneInstructions = {
    professional: 'Gebruik een professionele, formele toon',
    friendly: 'Gebruik een vriendelijke, warme toon',
    casual: 'Gebruik een casual, toegankelijke toon'
  };

  const systemPrompt = `Je bent een AI assistent voor klantenservice via WhatsApp.
${toneInstructions[config.tone]}.
Antwoord in het ${config.language}.
Wees behulpzaam maar duidelijk dat je een automatisch bericht bent.
Geef aan wanneer een menselijke agent beschikbaar is.
Houd antwoorden kort (max 2-3 zinnen).`;

  const lastMessage = context.messages[context.messages.length - 1];

  const userPrompt = `De klant ${context.customerName || context.customerPhone} heeft het volgende bericht gestuurd:
"${lastMessage.content}"

Genereer een automatisch antwoord dat:
1. Erkent hun bericht
2. Geeft aan dat dit een automatisch antwoord is
3. Vertelt wanneer een agent beschikbaar is
4. Biedt eventuele nuttige informatie als dat mogelijk is`;

  const response = await openRouter.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.5, // Lower for consistency
    max_tokens: 300
  });

  return response.choices[0].message.content;
}

function isWithinBusinessHours(businessHours: any): boolean {
  // Implementation to check current time against business hours
  const now = new Date();
  const day = now.toLocaleLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const daySchedule = businessHours[day];
  if (!daySchedule || !daySchedule.enabled) return false;

  const openTime = parseInt(daySchedule.open.replace(':', ''));
  const closeTime = parseInt(daySchedule.close.replace(':', ''));

  return currentTime >= openTime && currentTime <= closeTime;
}
```

#### Feature 3: Sentiment Analysis (1.5 hours)

**File: `src/lib/ai/sentiment.ts`**
```typescript
import { openRouter } from './openrouter';
import type { ConversationContext, SentimentAnalysis } from './types';

export async function analyzeSentiment(
  context: ConversationContext
): Promise<SentimentAnalysis> {
  const systemPrompt = `Je bent een sentiment analyse expert.
Analyseer de emotionele toon van klant berichten.
Geef een sentiment score van -1.0 (zeer negatief) tot 1.0 (zeer positief).
Identificeer belangrijke topics en urgentie niveau.`;

  const messages = context.messages
    .filter(msg => msg.sender === 'customer')
    .slice(-5)
    .map(msg => msg.content)
    .join('\n\n');

  const userPrompt = `Analyseer de sentiment van deze klant berichten:

${messages}

Geef je analyse als JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": -1.0 tot 1.0,
  "topics": ["topic1", "topic2"],
  "urgency": "low|medium|high",
  "reasoning": "Uitleg van je analyse"
}`;

  const response = await openRouter.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.3, // Low for consistent analysis
    max_tokens: 500
  });

  const analysis = JSON.parse(response.choices[0].message.content);

  return {
    sentiment: analysis.sentiment,
    score: analysis.score,
    topics: analysis.topics,
    urgency: analysis.urgency
  };
}
```

#### Feature 4: Conversation Summarization (1.5 hours)

**File: `src/lib/ai/summarization.ts`**
```typescript
import { openRouter } from './openrouter';
import type { ConversationContext, ConversationSummary } from './types';

export async function summarizeConversation(
  context: ConversationContext
): Promise<ConversationSummary> {
  const systemPrompt = `Je bent een expert in het samenvatten van klantenservice gesprekken.
Maak een duidelijke, gestructureerde samenvatting.
Focus op key points, beslissingen, en action items.`;

  const conversationText = context.messages
    .map(msg => `${msg.sender === 'customer' ? 'Klant' : 'Agent'} (${msg.timestamp}): ${msg.content}`)
    .join('\n');

  const userPrompt = `Vat dit gesprek samen:

${conversationText}

Geef een samenvatting als JSON:
{
  "summary": "Korte samenvatting (2-3 zinnen)",
  "keyPoints": ["belangrijk punt 1", "belangrijk punt 2"],
  "nextSteps": ["volgende actie 1", "volgende actie 2"],
  "resolvedIssues": ["opgelost probleem 1"],
  "openQuestions": ["open vraag 1"]
}`;

  const response = await openRouter.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.5,
    max_tokens: 800
  });

  return JSON.parse(response.choices[0].message.content);
}
```

#### Feature 5: AI Template Generation (1 hour)

**API Endpoint: `src/app/api/ai/templates/generate/route.ts`**
```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openRouter } from '@/lib/ai/openrouter';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { purpose, tone = 'professional', language = 'nl' } = body;

    // Generate template with AI
    const systemPrompt = `Je bent een expert in het schrijven van WhatsApp business templates.
Schrijf professionele, effectieve templates voor verschillende doeleinden.`;

    const userPrompt = `Genereer een WhatsApp business template voor: ${purpose}
Toon: ${tone}
Taal: ${language}

Template moet:
- Kort en to-the-point zijn (max 160 karakters)
- Variabelen gebruiken zoals {{1}}, {{2}} voor personalisatie
- Professioneel maar toegankelijk zijn
- Compliant zijn met WhatsApp Business Policy

Geef als JSON:
{
  "name": "template_naam",
  "content": "Template tekst met {{1}} variabelen",
  "variables": ["klant_naam", "product_naam"],
  "category": "MARKETING|UTILITY|AUTHENTICATION"
}`;

    const response = await openRouter.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 500
    });

    const template = JSON.parse(response.choices[0].message.content);

    // Save to database
    const { data: savedTemplate, error } = await supabase
      .from('message_templates')
      .insert({
        organization_id: profile.organization_id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        category: template.category,
        ai_generated: true,
        ai_prompt: purpose,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ template: savedTemplate });

  } catch (error) {
    console.error('Template generation error:', error);
    return Response.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
```

---

### Task 2.4: Frontend UI Components (3 hours)

#### AI Settings Panel

**File: `src/components/dashboard/ai-settings.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AISettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    autoResponseEnabled: false,
    draftSuggestionsEnabled: true,
    sentimentAnalysisEnabled: true,
    preferredModel: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7
  });

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .single();

    if (profile) {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single();

      if (data) {
        setSettings({
          enabled: data.enabled,
          autoResponseEnabled: data.auto_response_enabled,
          draftSuggestionsEnabled: data.draft_suggestions_enabled,
          sentimentAnalysisEnabled: data.sentiment_analysis_enabled,
          preferredModel: data.preferred_model,
          temperature: data.temperature
        });
      }
    }
  }

  async function saveSettings() {
    // Implementation
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI Features</h2>

      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Enabled</h3>
          <p className="text-sm text-gray-600">
            Enable AI-powered features for your inbox
          </p>
        </div>
        <button
          onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Feature toggles */}
      {settings.enabled && (
        <>
          <div className="border-t pt-4 space-y-4">
            <FeatureToggle
              title="Auto-Response"
              description="Automatically respond to messages outside business hours"
              enabled={settings.autoResponseEnabled}
              onChange={(enabled) => setSettings({ ...settings, autoResponseEnabled: enabled })}
            />

            <FeatureToggle
              title="Draft Suggestions"
              description="Get AI-powered response suggestions"
              enabled={settings.draftSuggestionsEnabled}
              onChange={(enabled) => setSettings({ ...settings, draftSuggestionsEnabled: enabled })}
            />

            <FeatureToggle
              title="Sentiment Analysis"
              description="Analyze customer sentiment in conversations"
              enabled={settings.sentimentAnalysisEnabled}
              onChange={(enabled) => setSettings({ ...settings, sentimentAnalysisEnabled: enabled })}
            />
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              AI Model
            </label>
            <select
              value={settings.preferredModel}
              onChange={(e) => setSettings({ ...settings, preferredModel: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Best)</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Fast)</option>
              <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
              <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Cheap)</option>
            </select>
          </div>

          <button
            onClick={saveSettings}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Save Settings
          </button>
        </>
      )}
    </div>
  );
}

function FeatureToggle({
  title,
  description,
  enabled,
  onChange
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
```

#### Draft Suggestions UI

**File: `src/components/inbox/draft-suggestions.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface DraftSuggestion {
  content: string;
  confidence: number;
  reasoning: string;
}

export function DraftSuggestions({
  conversationId,
  onSelect
}: {
  conversationId: string;
  onSelect: (content: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  async function generateSuggestions() {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, count: 3 })
      });

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={generateSuggestions}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <SparklesIcon className="w-4 h-4" />
        {loading ? 'Generating...' : 'Get AI Suggestions'}
      </button>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion.content)}
              className="w-full text-left p-3 border rounded hover:bg-gray-50 transition"
            >
              <p className="text-sm">{suggestion.content}</p>
              <p className="text-xs text-gray-500 mt-1">{suggestion.reasoning}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📊 PHASE 3: Testing & Launch Prep

### Task 3.1: Comprehensive Testing (4 hours)

#### Test Plan
```bash
# 1. Unit tests for AI functions
npm run test src/lib/ai/

# 2. Integration tests for AI endpoints
npm run test tests/integration/ai/

# 3. E2E tests for AI features
npm run test:e2e tests/e2e/ai/

# 4. Full test suite
npm run test:ci

# 5. Security audit
npm run test:security

# 6. Performance testing
npm run test:performance
```

#### AI-Specific Test Cases

**File: `tests/unit/ai/openrouter.test.ts`**
```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { OpenRouterClient } from '@/lib/ai/openrouter';

describe('OpenRouterClient', () => {
  it('should initialize with API key', () => {
    const client = new OpenRouterClient();
    expect(client).toBeDefined();
  });

  it('should generate chat completion', async () => {
    const client = new OpenRouterClient();
    const response = await client.chat([
      { role: 'user', content: 'Hello' }
    ]);
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
  });

  it('should fallback to secondary model on error', async () => {
    // Test implementation
  });

  it('should track usage and costs', async () => {
    // Test implementation
  });
});
```

### Task 3.2: Production Build & Deploy (2 hours)

```bash
# Final type check
npm run type-check  # MUST show 0 errors

# Final build
npm run build  # MUST succeed

# Analyze bundle size
npm run analyze

# Commit everything
git add .
git commit -m "feat: Complete AI integration with OpenRouter + Fix all blockers"

# Push to main branch
git push origin phase-5/week-35-38-soc2-type-ii

# Deploy to Vercel (auto-deploys on push)
# Or manual: npx vercel --prod
```

---

## 📈 Success Metrics & Monitoring

### Key Performance Indicators (KPIs)

**AI Feature Usage:**
- Draft suggestions acceptance rate: Target >70%
- Auto-response engagement rate: Target >50%
- Average response time improvement: Target 30% faster
- Customer satisfaction with AI responses: Target >4.0/5.0

**Technical Metrics:**
- AI API latency: Target <2 seconds
- AI API success rate: Target >99%
- Cost per conversation: Target <$0.10
- Token efficiency: Track tokens/message ratio

**Business Impact:**
- Agent productivity increase: Target 40%
- Customer wait time reduction: Target 50%
- After-hours coverage: Target 24/7
- Conversation resolution rate: Target 20% increase

### Monitoring Dashboard

**File: `src/app/dashboard/ai-analytics/page.tsx`**
```typescript
export default async function AIAnalyticsPage() {
  // Real-time AI usage statistics
  // Cost tracking per organization
  // Model performance comparison
  // User feedback analytics
  return (
    <div>
      <h1>AI Analytics Dashboard</h1>
      {/* Implementation */}
    </div>
  );
}
```

---

## 💰 Cost Management

### OpenRouter Pricing Strategy

**Model Selection by Use Case:**
- **Draft Suggestions:** Claude 3.5 Sonnet (high quality) - $3/million tokens
- **Auto-Response:** Claude 3 Haiku (fast, cheap) - $0.25/million tokens
- **Sentiment Analysis:** GPT-3.5 Turbo (efficient) - $0.50/million tokens
- **Summarization:** Claude 3.5 Sonnet (comprehensive) - $3/million tokens

**Estimated Monthly Costs (per organization):**
- Small (100 conversations/month): ~$5-10
- Medium (1,000 conversations/month): ~$30-50
- Large (10,000 conversations/month): ~$200-300

**Cost Optimization:**
- Cache common responses
- Use cheaper models for simple tasks
- Implement rate limiting
- Track usage per organization
- Alert on unusual spikes

---

## 🎯 Launch Checklist

### Phase 1 Completion (Blockers Fixed)
- [ ] All 122 TypeScript errors resolved
- [ ] Database types regenerated
- [ ] Stripe fully configured with real price IDs
- [ ] Production build succeeds: `npm run build`
- [ ] All tests passing: `npm run test:ci`
- [ ] Git repository clean and committed

### Phase 2 Completion (AI Integration)
- [ ] OpenRouter account created and API key configured
- [ ] Database migration 040 applied (AI tables)
- [ ] OpenRouter client implemented and tested
- [ ] All 5 AI features implemented:
  - [ ] Draft suggestions
  - [ ] Auto-response
  - [ ] Sentiment analysis
  - [ ] Conversation summarization
  - [ ] Template generation
- [ ] Frontend UI components built
- [ ] AI settings panel functional
- [ ] API endpoints tested

### Phase 3 Completion (Testing & Deploy)
- [ ] Unit tests for AI functions
- [ ] Integration tests for AI endpoints
- [ ] E2E tests for AI features
- [ ] Security audit passed
- [ ] Performance testing completed
- [ ] Cost tracking implemented
- [ ] Monitoring dashboard deployed
- [ ] Documentation updated

### Production Readiness (100%)
- [ ] All features working in staging
- [ ] Load testing completed
- [ ] Error monitoring configured (Sentry)
- [ ] Cost alerts configured
- [ ] User documentation written
- [ ] Admin training completed
- [ ] Rollback plan documented
- [ ] Production deployment successful

---

## 📚 Documentation Updates

### User Documentation
- **AI Features Guide:** How to use AI-powered features
- **Admin Guide:** Configuring AI settings per organization
- **Best Practices:** Getting the most out of AI features
- **Troubleshooting:** Common issues and solutions

### Technical Documentation
- **API Reference:** All AI endpoints documented
- **Architecture Diagrams:** AI system architecture
- **Cost Calculator:** Estimating AI costs
- **Model Comparison:** When to use which model

### Training Materials
- **Video Tutorials:** AI feature demonstrations
- **Quick Start Guide:** 5-minute AI setup
- **Use Cases:** Real-world examples
- **FAQ:** Common questions answered

---

## 🚀 Timeline Summary

### Week 1: Development
**Day 1-2: Fix Blockers (Phase 1)**
- TypeScript errors: 4-6 hours
- Stripe config: 1 hour
- Git cleanup: 30 min

**Day 3-5: AI Integration (Phase 2)**
- OpenRouter setup: 2 hours
- Core features: 8 hours
- Frontend UI: 3 hours

### Week 2: Testing & Launch
**Day 6-7: Testing (Phase 3)**
- Comprehensive testing: 4 hours
- Bug fixes: 2-4 hours

**Day 8-9: Staging Deploy**
- Deploy to staging
- Integration testing
- Performance optimization

**Day 10-12: Soft Launch**
- Beta users (5-10 orgs)
- Monitor closely
- Gather feedback
- Fix issues

**Day 13-14: Production Launch**
- Public announcement
- Scale monitoring
- Support readiness

---

## 🎉 Expected Outcomes

### Technical Achievements
✅ **100% Production Readiness**
- Zero TypeScript errors
- All tests passing
- Production build succeeds
- Performance optimized

✅ **Game-Changing AI Features**
- Intelligent draft suggestions
- 24/7 auto-response capability
- Real-time sentiment analysis
- Automatic conversation summaries
- AI-powered template generation

✅ **Enterprise-Grade Quality**
- Multi-tenant AI isolation
- Cost tracking per organization
- Model fallback for reliability
- Comprehensive monitoring

### Business Impact
📈 **Productivity Gains**
- 40% faster response times
- 50% reduction in repetitive tasks
- 24/7 customer coverage
- Improved agent satisfaction

💰 **Cost Efficiency**
- AI costs: $5-300/org/month
- ROI: Positive within 1 month
- Scalable pricing model
- Predictable cost structure

🚀 **Competitive Advantage**
- First-to-market AI WhatsApp inbox
- Modern AI capabilities
- Superior customer experience
- Ready for enterprise customers

---

**Report Generated:** 2025-11-05
**Next Action:** Begin Phase 1 - Fix Critical Blockers
**Status:** 🎯 READY TO EXECUTE
