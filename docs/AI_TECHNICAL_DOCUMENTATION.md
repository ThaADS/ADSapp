# AI Features - Technical Documentation

**For Developers: Architecture, Implementation & Integration Guide**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Reference](#api-reference)
4. [OpenRouter Integration](#openrouter-integration)
5. [Implementation Examples](#implementation-examples)
6. [Security & RLS](#security--rls)
7. [Testing](#testing)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ AI Settings  │  │ Inbox +      │  │  AI Analytics   │   │
│  │ Panel        │  │ Drafts UI    │  │  Dashboard      │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Next.js 15)                     │
│  /api/ai/drafts   /api/ai/sentiment   /api/ai/templates     │
│  /api/ai/settings /api/ai/usage       /api/ai/summarize     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ OpenRouter   │  │  Drafts      │  │ Sentiment       │   │
│  │ Client       │  │  Service     │  │ Analysis        │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Templates    │  │ Summarization│                         │
│  │ Generator    │  │ Service      │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌───────────────┐  ┌──────────────────┐  ┌────────────────┐
│  OpenRouter   │  │  Supabase        │  │  Redis Cache   │
│  API          │  │  PostgreSQL      │  │  (optional)    │
│  (AI Models)  │  │  + RLS           │  │                │
└───────────────┘  └──────────────────┘  └────────────────┘
```

### Component Responsibilities

**Frontend Components**:
- `AISettingsPanel`: Configure AI features per organization
- `DraftSuggestions`: Display and interact with draft suggestions
- `SentimentIndicator`: Visualize conversation sentiment
- `AIAnalytics`: Usage statistics and cost tracking dashboard

**API Routes** (`/api/ai/*`):
- Authentication and authorization
- Request validation
- Business logic delegation
- Response formatting
- Error handling

**Business Logic** (`/lib/ai/*`):
- `openrouter.ts`: Core AI client with fallback support
- `drafts.ts`: Draft suggestion generation and improvement
- `auto-response.ts`: Automated response generation
- `sentiment.ts`: Emotion and urgency detection
- `summarization.ts`: Conversation summary generation
- `templates.ts`: WhatsApp-compliant template generation

**Data Layer**:
- Supabase PostgreSQL with Row Level Security
- AI responses, settings, and metadata storage
- Real-time subscriptions for live updates

---

## Database Schema

### Core Tables

#### `ai_responses`

Tracks all AI-generated responses for analytics and cost tracking.

```sql
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- AI Model Information
  model VARCHAR(100) NOT NULL,  -- 'anthropic/claude-3.5-sonnet'
  feature VARCHAR(50) NOT NULL,  -- 'draft', 'auto_response', 'sentiment', etc.

  -- Request/Response Data
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,

  -- Performance Metrics
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,

  -- User Feedback
  feedback VARCHAR(20),  -- 'accepted', 'rejected', 'edited', 'ignored'
  edited_response TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::JSONB
);
```

#### `ai_settings`

Per-organization AI configuration.

```sql
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),

  -- Feature Toggles
  enabled BOOLEAN DEFAULT true,
  auto_response_enabled BOOLEAN DEFAULT false,
  draft_suggestions_enabled BOOLEAN DEFAULT true,
  sentiment_analysis_enabled BOOLEAN DEFAULT true,
  translation_enabled BOOLEAN DEFAULT false,
  summarization_enabled BOOLEAN DEFAULT true,

  -- Model Configuration
  preferred_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
  fallback_model VARCHAR(100) DEFAULT 'anthropic/claude-3-haiku',
  max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
  temperature DECIMAL(3, 2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),

  -- Auto-Response Config
  auto_response_conditions JSONB DEFAULT '{"outsideBusinessHours": true}'::JSONB,
  auto_response_tone VARCHAR(20) DEFAULT 'professional',
  auto_response_language VARCHAR(10) DEFAULT 'nl',

  -- Cost Management
  monthly_budget_usd DECIMAL(10, 2),
  current_month_spend_usd DECIMAL(10, 6) DEFAULT 0,
  budget_alert_threshold DECIMAL(3, 2) DEFAULT 0.8,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `conversation_ai_metadata`

AI-analyzed metadata per conversation.

```sql
CREATE TABLE conversation_ai_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id),

  -- Conversation Analysis
  summary TEXT,
  key_points TEXT[],
  next_steps TEXT[],
  resolved_issues TEXT[],
  open_questions TEXT[],

  -- Sentiment Analysis
  sentiment VARCHAR(20),  -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score DECIMAL(3, 2),  -- -1.0 to 1.0
  sentiment_confidence DECIMAL(3, 2),  -- 0.0 to 1.0

  -- Language & Intent
  detected_language VARCHAR(10),
  primary_intent VARCHAR(50),
  topics TEXT[],

  -- Urgency & Priority
  urgency VARCHAR(20) DEFAULT 'low',  -- 'low', 'medium', 'high', 'critical'
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),

  last_analyzed_at TIMESTAMPTZ,
  analysis_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Helper Functions

#### `check_ai_budget_limit`

Validates if organization can afford AI operation.

```sql
CREATE OR REPLACE FUNCTION check_ai_budget_limit(
  p_organization_id UUID,
  p_estimated_cost DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_new_spend DECIMAL;
BEGIN
  SELECT * INTO v_settings
  FROM ai_settings
  WHERE organization_id = p_organization_id;

  -- No budget set = unlimited
  IF v_settings.monthly_budget_usd IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if within budget
  v_new_spend := v_settings.current_month_spend_usd + p_estimated_cost;
  RETURN v_new_spend <= v_settings.monthly_budget_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_ai_usage_summary`

Retrieve usage statistics for period.

```sql
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL,
  avg_latency_ms DECIMAL,
  acceptance_rate DECIMAL,
  by_feature JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    SUM(tokens_used)::BIGINT,
    SUM(cost_usd),
    AVG(latency_ms),
    (COUNT(CASE WHEN feedback = 'accepted' THEN 1 END)::FLOAT /
     NULLIF(COUNT(CASE WHEN feedback IS NOT NULL THEN 1 END), 0) * 100),
    jsonb_object_agg(feature, jsonb_build_object('count', COUNT(*), 'cost', SUM(cost_usd)))
  FROM ai_responses
  WHERE organization_id = p_organization_id
  AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API Reference

### Authentication

All AI endpoints require authentication via Supabase session:

```typescript
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Endpoints

#### POST `/api/ai/drafts`

Generate draft response suggestions.

**Request Body**:
```json
{
  "conversationId": "uuid",
  "count": 3,
  "action": "generate" | "improve",
  "existingDraft": "string",  // for improvement
  "feedback": "string"  // for improvement
}
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "content": "Generated response text",
      "confidence": 0.92,
      "reasoning": "Why this suggestion...",
      "tone": "professional"
    }
  ],
  "conversationId": "uuid",
  "generatedAt": "2025-11-05T12:00:00Z"
}
```

**Error Codes**:
- `400`: Invalid conversationId or missing required fields
- `401`: Unauthorized
- `403`: Access denied to conversation
- `404`: Conversation not found
- `500`: AI generation failed

#### POST `/api/ai/sentiment`

Analyze conversation sentiment.

**Request Body**:
```json
{
  "conversationId": "uuid",
  "action": "analyze" | "trend",
  "days": 7  // for trend analysis
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "sentiment": "positive",
    "score": 0.75,
    "confidence": 0.92,
    "topics": ["delivery", "satisfaction"],
    "urgency": "low",
    "reasoning": "Customer expresses satisfaction..."
  },
  "conversationId": "uuid",
  "analyzedAt": "2025-11-05T12:00:00Z"
}
```

#### POST `/api/ai/summarize`

Generate conversation summary.

**Request Body**:
```json
{
  "conversationId": "uuid",
  "type": "single" | "executive",
  "conversationIds": ["uuid1", "uuid2"]  // for executive summary
}
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "summary": "Customer inquired about order...",
    "keyPoints": ["Order status", "Delivery date"],
    "nextSteps": ["Send tracking code", "Follow up tomorrow"],
    "resolvedIssues": ["Provided order info"],
    "openQuestions": [],
    "duration": "15 minutes",
    "messageCount": 12
  },
  "conversationId": "uuid",
  "summarizedAt": "2025-11-05T12:00:00Z"
}
```

#### POST `/api/ai/templates/generate`

Generate WhatsApp Business template.

**Request Body**:
```json
{
  "purpose": "Order confirmation message",
  "tone": "professional" | "friendly" | "casual",
  "language": "nl",
  "maxLength": 160,
  "action": "generate" | "improve" | "variations" | "analyze",
  "saveToDatabase": true
}
```

**Response**:
```json
{
  "success": true,
  "template": {
    "name": "order_confirmation_friendly",
    "content": "Hi {{1}}! Your order #{{2}} is confirmed...",
    "variables": ["customer_name", "order_number"],
    "category": "UTILITY",
    "estimatedPerformance": 85,
    "id": "uuid"
  },
  "saved": true
}
```

#### GET `/api/ai/settings`

Get AI configuration for organization.

**Response**:
```json
{
  "success": true,
  "settings": {
    "enabled": true,
    "draft_suggestions_enabled": true,
    "auto_response_enabled": false,
    "sentiment_analysis_enabled": true,
    "summarization_enabled": true,
    "preferred_model": "anthropic/claude-3.5-sonnet",
    "fallback_model": "anthropic/claude-3-haiku",
    "max_tokens": 1000,
    "temperature": 0.7,
    "monthly_budget_usd": 50.00,
    "current_month_spend_usd": 12.34,
    "budget_alert_threshold": 0.8
  },
  "isDefault": false
}
```

#### PUT `/api/ai/settings`

Update AI configuration (admin only).

**Request Body**:
```json
{
  "enabled": true,
  "draft_suggestions_enabled": true,
  "max_tokens": 1500,
  "temperature": 0.8,
  "monthly_budget_usd": 100.00
}
```

**Response**:
```json
{
  "success": true,
  "settings": { /* updated settings */ },
  "message": "AI settings updated successfully"
}
```

#### GET `/api/ai/usage`

Get usage analytics.

**Query Parameters**:
- `period`: Number of days (default: 30)
- `feature`: Filter by feature (optional)

**Response**:
```json
{
  "success": true,
  "period": {
    "days": 30,
    "startDate": "2025-10-05T00:00:00Z",
    "endDate": "2025-11-05T23:59:59Z"
  },
  "summary": {
    "totalRequests": 156,
    "totalTokens": 45230,
    "totalCostUsd": 12.34,
    "avgLatencyMs": 2500,
    "acceptanceRate": 87.5
  },
  "byFeature": {
    "draft": { "count": 100, "cost": 8.50, "tokens": 30000 },
    "sentiment": { "count": 50, "cost": 2.84, "tokens": 12000 }
  },
  "byDate": {
    "2025-11-05": { "count": 12, "cost": 1.45 },
    "2025-11-04": { "count": 8, "cost": 0.95 }
  },
  "modelUsage": {
    "anthropic/claude-3.5-sonnet": 120,
    "anthropic/claude-3-haiku": 36
  },
  "budgetStatus": {
    "budget": 50.00,
    "currentSpend": 12.34,
    "percentUsed": 24.68,
    "remaining": 37.66,
    "isOverBudget": false,
    "isNearLimit": false,
    "alertThreshold": 80
  }
}
```

---

## OpenRouter Integration

### Client Implementation

**File**: `src/lib/ai/openrouter.ts`

```typescript
export class OpenRouterClient {
  private apiKey: string;
  private defaultModel: string;
  private fallbackModel: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY!;
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL!;
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL!;
  }

  async chat(
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest> = {}
  ): Promise<OpenRouterResponse> {
    const model = options.model || this.defaultModel;

    try {
      return await this.makeRequest(model, messages, options);
    } catch (error) {
      console.warn(`Primary model failed, falling back to ${this.fallbackModel}`);
      return await this.makeRequest(this.fallbackModel, messages, options);
    }
  }

  private async makeRequest(
    model: string,
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest>
  ): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://adsapp.nl',
        'X-Title': 'ADSapp WhatsApp AI',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Cost calculation per model
  private calculateCost(model: string, totalTokens: number): number {
    const costs: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 3.00,  // $3 per million tokens
      'anthropic/claude-3-haiku': 0.25,     // $0.25 per million tokens
      'anthropic/claude-3-opus': 15.00,     // $15 per million tokens
      'openai/gpt-4-turbo': 10.00,
      'openai/gpt-3.5-turbo': 0.50,
    };

    const costPerMillion = costs[model] || 1.00;
    return (totalTokens / 1_000_000) * costPerMillion;
  }

  async logUsage(params: AIFeatureUsage): Promise<void> {
    const supabase = createServiceRoleClient();

    await supabase.from('ai_responses').insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      message_id: params.messageId,
      model: params.model,
      feature: params.feature,
      prompt: params.prompt,
      response: params.response,
      tokens_used: params.tokensUsed,
      cost_usd: this.calculateCost(params.model, params.tokensUsed),
      latency_ms: params.latencyMs,
      metadata: params.metadata,
    });
  }
}

export const openRouter = new OpenRouterClient();
```

### Model Selection Strategy

**Use Cases by Model**:

| Model | Use For | Cost | Speed |
|-------|---------|------|-------|
| **Claude 3.5 Sonnet** | Draft suggestions, complex templates | $3/M | Medium |
| **Claude 3 Haiku** | Sentiment analysis, auto-responses | $0.25/M | Fast |
| **Claude 3 Opus** | Executive summaries, critical analysis | $15/M | Slow |
| **GPT-4 Turbo** | Alternative for Sonnet | $10/M | Medium |
| **GPT-3.5 Turbo** | Simple classification tasks | $0.50/M | Fast |

**Fallback Logic**:
1. Try primary model (e.g., Claude 3.5 Sonnet)
2. On failure → Automatic fallback to Haiku
3. If both fail → Return error to user

---

## Implementation Examples

### Example 1: Draft Suggestions Component

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function DraftSuggestionsButton({ conversationId }: { conversationId: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);

  const generateSuggestions = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, count: 3 }),
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={generateSuggestions} disabled={loading}>
      {loading ? 'Generating...' : 'AI Suggestions'}
    </button>
  );
}
```

### Example 2: Real-time Sentiment Monitoring

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSentimentMonitoring(conversationId: string) {
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);

  useEffect(() => {
    const analyzeSentiment = async () => {
      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      const data = await response.json();
      if (data.success) {
        setSentiment(data.analysis);
      }
    };

    analyzeSentiment();

    // Re-analyze every 5 messages
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        // Re-analyze after new message
        analyzeSentiment();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [conversationId]);

  return sentiment;
}
```

### Example 3: Server-Side Template Generation

```typescript
// app/api/templates/ai-generate/route.ts
import { NextRequest } from 'next/server';
import { generateTemplate } from '@/lib/ai/templates';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  // Generate template
  const { purpose, tone, language } = await request.json();

  const template = await generateTemplate(
    { purpose, tone, language },
    profile.organization_id
  );

  // Save to database
  await supabase.from('message_templates').insert({
    organization_id: profile.organization_id,
    name: template.name,
    content: template.content,
    variables: template.variables,
    ai_generated: true,
    ai_prompt: purpose,
    created_by: user.id,
  });

  return Response.json({ success: true, template });
}
```

---

## Security & RLS

### Row Level Security Policies

All AI tables enforce tenant isolation:

```sql
-- ai_responses
CREATE POLICY tenant_isolation_ai_responses ON ai_responses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ai_settings
CREATE POLICY tenant_isolation_ai_settings ON ai_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- conversation_ai_metadata
CREATE POLICY tenant_isolation_conversation_ai_metadata ON conversation_ai_metadata
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

### Input Validation

Always validate user inputs:

```typescript
import { QueryValidators } from '@/lib/supabase/server';

// Validate UUID
const validation = QueryValidators.uuid(conversationId);
if (!validation.isValid) {
  return Response.json({ error: 'Invalid conversation ID' }, { status: 400 });
}

// Validate enum
const toneValidation = QueryValidators.enum(tone, ['professional', 'friendly', 'casual']);
if (!toneValidation.isValid) {
  return Response.json({ error: 'Invalid tone value' }, { status: 400 });
}

// Validate number range
if (maxTokens < 100 || maxTokens > 4000) {
  return Response.json({ error: 'max_tokens must be between 100 and 4000' }, { status: 400 });
}
```

### API Key Security

OpenRouter API key is stored securely:

```env
# .env.local (NEVER commit to git)
OPENROUTER_API_KEY=sk-or-v1-...your-key
```

**Best Practices**:
- ✅ Use environment variables
- ✅ Rotate keys every 90 days
- ✅ Monitor usage for anomalies
- ✅ Set spending limits in OpenRouter dashboard
- ❌ Never expose API key to frontend
- ❌ Never log API key in console/logs

---

## Testing

### Unit Tests

**Test File**: `tests/unit/ai/openrouter.test.ts`

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { OpenRouterClient } from '@/lib/ai/openrouter';

describe('OpenRouterClient', () => {
  it('should generate chat completion', async () => {
    const client = new OpenRouterClient();

    const response = await client.chat([
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Say hello' }
    ]);

    expect(response.choices).toBeDefined();
    expect(response.choices[0].message.content).toBeTruthy();
  });

  it('should fallback to secondary model on failure', async () => {
    const client = new OpenRouterClient();

    // Mock primary model failure
    jest.spyOn(client as any, 'makeRequest')
      .mockRejectedValueOnce(new Error('Primary failed'))
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Fallback response' } }] });

    const response = await client.chat([
      { role: 'user', content: 'Test' }
    ]);

    expect(response.choices[0].message.content).toBe('Fallback response');
  });

  it('should calculate costs correctly', async () => {
    const client = new OpenRouterClient();

    const cost = (client as any).calculateCost('anthropic/claude-3.5-sonnet', 1000);
    expect(cost).toBe(0.003); // $3 per million = $0.003 per thousand
  });
});
```

### Integration Tests

**Test File**: `tests/integration/ai/drafts.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { generateDraftSuggestions } from '@/lib/ai/drafts';

describe('Draft Suggestions Integration', () => {
  it('should generate 3 suggestions for conversation', async () => {
    const context = {
      conversationId: 'test-uuid',
      organizationId: 'org-uuid',
      messages: [
        { sender: 'customer', content: 'I need help with my order', timestamp: '2025-11-05T10:00:00Z' },
        { sender: 'agent', content: 'Sure, what is your order number?', timestamp: '2025-11-05T10:01:00Z' },
        { sender: 'customer', content: 'Order #12345', timestamp: '2025-11-05T10:02:00Z' }
      ],
      customerName: 'John Doe',
      customerPhone: '+31612345678',
    };

    const suggestions = await generateDraftSuggestions(context, 3);

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toHaveProperty('content');
    expect(suggestions[0]).toHaveProperty('confidence');
    expect(suggestions[0].confidence).toBeGreaterThan(0.5);
  });
});
```

### E2E Tests

**Test File**: `tests/e2e/ai-features.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Features E2E', () => {
  test('should generate draft suggestions in inbox', async ({ page }) => {
    // Login
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to inbox
    await page.goto('/dashboard/inbox');
    await page.waitForSelector('.conversation-list');

    // Select conversation
    await page.click('.conversation-item:first-child');

    // Click AI suggestions button
    await page.click('button:has-text("AI Suggesties")');

    // Wait for suggestions to load
    await page.waitForSelector('.draft-suggestion', { timeout: 10000 });

    // Verify 3 suggestions are displayed
    const suggestions = await page.locator('.draft-suggestion').count();
    expect(suggestions).toBe(3);

    // Click "Use" button on first suggestion
    await page.click('.draft-suggestion:first-child button:has-text("Gebruiken")');

    // Verify text is placed in message input
    const messageInput = await page.locator('textarea[name="message"]').inputValue();
    expect(messageInput).toBeTruthy();
  });
});
```

---

## Performance Optimization

### Caching Strategy

Implement Redis caching for repeated operations:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache AI settings per organization
export async function getAISettings(organizationId: string) {
  const cacheKey = `ai:settings:${organizationId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const settings = await fetchSettingsFromDB(organizationId);

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(settings));

  return settings;
}

// Invalidate cache on settings update
export async function updateAISettings(organizationId: string, updates: Partial<AISettings>) {
  await updateSettingsInDB(organizationId, updates);

  // Invalidate cache
  await redis.del(`ai:settings:${organizationId}`);
}
```

### Batch Processing

Process multiple operations in parallel:

```typescript
// Generate drafts for multiple conversations
export async function batchGenerateDrafts(conversationIds: string[]) {
  const promises = conversationIds.map(id =>
    generateDraftSuggestions({ conversationId: id, /* ... */ })
  );

  return await Promise.allSettled(promises);
}

// Analyze sentiment for all open conversations
export async function batchAnalyzeSentiment(organizationId: string) {
  const conversations = await getOpenConversations(organizationId);

  const analyses = await Promise.all(
    conversations.map(conv => analyzeSentiment({ conversationId: conv.id, /* ... */ }))
  );

  return analyses;
}
```

### Token Optimization

Reduce costs by optimizing prompts:

```typescript
// Before: Verbose prompt (500 tokens)
const verbosePrompt = `You are a professional customer service assistant.
Please analyze the following conversation and provide 3 different response
suggestions. Each suggestion should be professional, friendly, and helpful...`;

// After: Concise prompt (150 tokens)
const optimizedPrompt = `Generate 3 WhatsApp response suggestions
(professional, friendly, empathetic) for:`;

// Savings: 70% fewer tokens = 70% cost reduction
```

### Lazy Loading

Only analyze when needed:

```typescript
// Don't auto-analyze every message
export function MessageRow({ message }: { message: Message }) {
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const analyzeSentiment = async () => {
    const result = await fetch('/api/ai/sentiment', {
      method: 'POST',
      body: JSON.stringify({ conversationId: message.conversation_id }),
    });
    setSentiment(await result.json());
  };

  return (
    <div>
      {message.content}
      <button onClick={() => {
        setShowAnalysis(true);
        analyzeSentiment();
      }}>
        Analyze Sentiment
      </button>
      {showAnalysis && sentiment && <SentimentBadge {...sentiment} />}
    </div>
  );
}
```

---

## Troubleshooting

### Common Issues

#### 1. OpenRouter API 429 (Rate Limit)

**Symptom**: `OpenRouter API error: Too Many Requests`

**Solutions**:
```typescript
// Implement exponential backoff
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Use in OpenRouter client
const response = await retryWithBackoff(() =>
  this.makeRequest(model, messages, options)
);
```

#### 2. Budget Exceeded

**Symptom**: AI features stop working mid-month

**Solutions**:
```typescript
// Pre-check budget before expensive operations
export async function generateDraftSuggestions(context: ConversationContext) {
  const estimatedCost = 0.01; // Estimate based on operation

  const canAfford = await checkAIBudgetLimit(
    context.organizationId,
    estimatedCost
  );

  if (!canAfford) {
    throw new Error('Monthly AI budget exceeded. AI features paused until next month.');
  }

  // Proceed with generation...
}
```

#### 3. Slow Response Times

**Symptom**: AI operations take >10 seconds

**Solutions**:
```typescript
// 1. Switch to faster model
const settings = await getAISettings(organizationId);
const fastModel = 'anthropic/claude-3-haiku'; // 3x faster than Sonnet

// 2. Reduce max_tokens
const response = await openRouter.chat(messages, {
  max_tokens: 500, // Instead of 1000
});

// 3. Use streaming for long responses
const stream = await openRouter.chatStream(messages);
for await (const chunk of stream) {
  // Process chunks as they arrive
}
```

#### 4. Invalid JSON from AI

**Symptom**: `Failed to parse template JSON`

**Solutions**:
```typescript
// Robust JSON parsing with fallbacks
function parseAIResponse(content: string): any {
  // Try direct parse
  try {
    return JSON.parse(content);
  } catch {}

  // Try extracting from markdown code block
  const codeBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }

  // Try finding JSON object
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  throw new Error('Could not parse AI response as JSON');
}
```

---

## Deployment Checklist

### Pre-Production

- [ ] Environment variables configured in Vercel
- [ ] Database migration 040 applied (`npx supabase db push`)
- [ ] TypeScript errors resolved (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] All tests passing (`npm run test:ci`)
- [ ] OpenRouter API key valid and funded
- [ ] Budget alerts configured
- [ ] RLS policies tested

### Production Monitoring

- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Configure Datadog/New Relic for performance
- [ ] Enable Supabase database logs
- [ ] Create OpenRouter usage dashboard
- [ ] Set up cost alerts at 50%, 80%, 100%
- [ ] Monitor API latency (target: <5s)
- [ ] Track acceptance rates (target: >80%)

---

## Further Resources

**OpenRouter Documentation**: https://openrouter.ai/docs
**Anthropic Claude API**: https://docs.anthropic.com
**Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
**Next.js 15 API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
**Maintainer**: ADSapp Engineering Team
