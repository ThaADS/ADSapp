/**
 * AI Integration Types
 * Manual type definitions for AI tables until database migration is applied
 */

export interface AISettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  features_enabled: {
    draft_suggestions?: boolean;
    auto_response?: boolean;
    sentiment_analysis?: boolean;
    summarization?: boolean;
    template_generation?: boolean;
    translation?: boolean;
  };
  default_model: string;
  fallback_model: string;
  max_tokens: number;
  temperature: number;
  monthly_budget_usd: number;
  alert_threshold: number;
  auto_response_conditions: {
    business_hours_only?: boolean;
    max_response_per_conversation?: number;
    require_high_confidence?: boolean;
    excluded_topics?: string[];
  };
  created_at: string;
  updated_at: string;
}

export type AIFeature = 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template' | 'translation';

export type UserFeedback = 'accepted' | 'rejected' | 'modified' | null;

export interface AIResponse {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  feature: AIFeature;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  response_data: Record<string, any>;
  latency_ms: number;
  cost_usd: number;
  confidence_score: number | null;
  user_feedback: UserFeedback;
  created_at: string;
}

export type SentimentType = 'positive' | 'neutral' | 'negative' | null;
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical' | null;

export interface ConversationAIMetadata {
  conversation_id: string;
  organization_id: string;
  sentiment: SentimentType;
  sentiment_score: number | null;
  sentiment_confidence: number | null;
  urgency_level: UrgencyLevel;
  summary: string | null;
  key_points: string[] | null;
  next_steps: string[] | null;
  topics: string[] | null;
  auto_response_count: number;
  last_auto_response_at: string | null;
  last_analyzed_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  within_budget: boolean;
  current_spend: number;
  monthly_budget: number;
  percent_used: number;
  alert_threshold: number;
}

// Database insert types (without generated fields)
export type AISettingsInsert = Omit<AISettings, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AIResponseInsert = Omit<AIResponse, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ConversationAIMetadataInsert = Omit<ConversationAIMetadata, 'last_analyzed_at' | 'updated_at'> & {
  last_analyzed_at?: string;
  updated_at?: string;
};
