/**
 * TypeScript types for AI features
 * OpenRouter integration with ADSapp
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  model: string
  tokensUsed: number
  costUsd: number
  latencyMs: number
}

export interface ConversationContext {
  conversationId: string
  organizationId: string
  messages: Array<{
    sender: 'customer' | 'agent'
    content: string
    timestamp: string
  }>
  customerName?: string
  customerPhone: string
  metadata?: Record<string, any>
}

export interface AutoResponseConfig {
  enabled: boolean
  conditions: {
    outsideBusinessHours?: boolean
    noAgentAvailable?: boolean
    keywords?: string[]
    maxQueueTime?: number // minutes
  }
  tone: 'professional' | 'friendly' | 'casual'
  language: string
}

export interface DraftSuggestion {
  content: string
  confidence: number
  reasoning: string
  tone?: string
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number // -1.0 to 1.0
  confidence: number // 0.0 to 1.0
  topics: string[]
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reasoning?: string
}

export interface ConversationSummary {
  summary: string
  keyPoints: string[]
  nextSteps: string[]
  resolvedIssues: string[]
  openQuestions: string[]
  duration?: string
  messageCount?: number
}

export interface TemplateGenerationRequest {
  purpose: string
  tone?: 'professional' | 'friendly' | 'casual'
  language?: string
  maxLength?: number
}

export interface GeneratedTemplate {
  id?: string // Optional: set after saving to database
  name: string
  content: string
  variables: string[]
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  estimatedPerformance?: number
}

// OpenRouter API Types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
    index: number
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  created: number
}

export interface AIFeatureUsage {
  feature: 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template'
  organizationId: string
  conversationId?: string
  messageId?: string
  model: string
  prompt: string
  response: string
  tokensUsed: number
  costUsd: number
  latencyMs: number
  feedback?: 'accepted' | 'rejected' | 'edited' | 'ignored'
  editedResponse?: string
  metadata?: Record<string, any>
}

// Database types for AI tables
export interface AISettings {
  id: string
  organization_id: string
  enabled: boolean
  auto_response_enabled: boolean
  draft_suggestions_enabled: boolean
  sentiment_analysis_enabled: boolean
  translation_enabled: boolean
  summarization_enabled: boolean
  preferred_model: string
  fallback_model: string
  max_tokens: number
  temperature: number
  auto_response_conditions: AutoResponseConfig['conditions']
  auto_response_tone: AutoResponseConfig['tone']
  auto_response_language: string
  monthly_budget_usd?: number
  current_month_spend_usd: number
  budget_alert_threshold: number
  created_at: string
  updated_at: string
}

export interface ConversationAIMetadata {
  id: string
  conversation_id: string
  summary?: string
  key_points?: string[]
  next_steps?: string[]
  resolved_issues?: string[]
  open_questions?: string[]
  sentiment?: SentimentAnalysis['sentiment']
  sentiment_score?: number
  sentiment_confidence?: number
  detected_language?: string
  primary_intent?: string
  topics?: string[]
  urgency: SentimentAnalysis['urgency']
  priority_score: number
  last_analyzed_at?: string
  analysis_version: string
  created_at: string
  updated_at: string
}

// API Response types
export interface DraftSuggestionsResponse {
  suggestions: DraftSuggestion[]
  conversationId: string
  generatedAt: string
}

export interface SentimentAnalysisResponse {
  analysis: SentimentAnalysis
  conversationId: string
  analyzedAt: string
}

export interface ConversationSummaryResponse {
  summary: ConversationSummary
  conversationId: string
  summarizedAt: string
}

export interface AIUsageSummary {
  totalRequests: number
  totalTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  acceptanceRate: number
  byFeature: Record<
    string,
    {
      count: number
      cost: number
    }
  >
}
