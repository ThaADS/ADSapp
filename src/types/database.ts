export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Common API types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

// Database table row types (extracted for easier use)
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type DemoSession = Database['public']['Tables']['demo_sessions']['Row']
export type DemoSessionActivity = Database['public']['Tables']['demo_session_activities']['Row']
export type DemoLeadScore = Database['public']['Tables']['demo_lead_scores']['Row']
export type ConversionFunnel = Database['public']['Tables']['conversion_funnels']['Row']
export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
export type Refund = Database['public']['Tables']['refunds']['Row']
export type PaymentIntent = Database['public']['Tables']['payment_intents']['Row']
export type BillingEvent = Database['public']['Tables']['billing_events']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type AgentCapacity = Database['public']['Tables']['agent_capacity']['Row']
export type ConversationQueue = Database['public']['Tables']['conversation_queue']['Row']
export type RoutingHistory = Database['public']['Tables']['routing_history']['Row']
export type RoutingRule = Database['public']['Tables']['routing_rules']['Row']
export type EscalationRule = Database['public']['Tables']['escalation_rules']['Row']

// Insert types
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type WebhookEventInsert = Database['public']['Tables']['webhook_events']['Insert']
export type RefundInsert = Database['public']['Tables']['refunds']['Insert']
export type PaymentIntentInsert = Database['public']['Tables']['payment_intents']['Insert']
export type BillingEventInsert = Database['public']['Tables']['billing_events']['Insert']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type AgentCapacityInsert = Database['public']['Tables']['agent_capacity']['Insert']
export type ConversationQueueInsert = Database['public']['Tables']['conversation_queue']['Insert']
export type RoutingHistoryInsert = Database['public']['Tables']['routing_history']['Insert']
export type RoutingRuleInsert = Database['public']['Tables']['routing_rules']['Insert']
export type EscalationRuleInsert = Database['public']['Tables']['escalation_rules']['Insert']

// Update types
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']
export type WebhookEventUpdate = Database['public']['Tables']['webhook_events']['Update']
export type RefundUpdate = Database['public']['Tables']['refunds']['Update']
export type PaymentIntentUpdate = Database['public']['Tables']['payment_intents']['Update']
export type BillingEventUpdate = Database['public']['Tables']['billing_events']['Update']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
export type AgentCapacityUpdate = Database['public']['Tables']['agent_capacity']['Update']
export type ConversationQueueUpdate = Database['public']['Tables']['conversation_queue']['Update']
export type RoutingHistoryUpdate = Database['public']['Tables']['routing_history']['Update']
export type RoutingRuleUpdate = Database['public']['Tables']['routing_rules']['Update']
export type EscalationRuleUpdate = Database['public']['Tables']['escalation_rules']['Update']

export type Database = {
  public: {
    Tables: {
      agent_capacity: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          max_concurrent_conversations: number
          auto_assign_enabled: boolean
          status: 'available' | 'busy' | 'away' | 'offline'
          skills: string[]
          languages: string[]
          current_active_conversations: number
          avg_response_time_seconds: number
          customer_satisfaction_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id: string
          max_concurrent_conversations?: number
          auto_assign_enabled?: boolean
          status?: 'available' | 'busy' | 'away' | 'offline'
          skills?: string[]
          languages?: string[]
          current_active_conversations?: number
          avg_response_time_seconds?: number
          customer_satisfaction_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          agent_id?: string
          max_concurrent_conversations?: number
          auto_assign_enabled?: boolean
          status?: 'available' | 'busy' | 'away' | 'offline'
          skills?: string[]
          languages?: string[]
          current_active_conversations?: number
          avg_response_time_seconds?: number
          customer_satisfaction_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_capacity_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_capacity_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ai_settings: {
        Row: {
          id: string
          organization_id: string
          enabled: boolean
          features_enabled: Json
          default_model: string
          fallback_model: string
          max_tokens: number
          temperature: number
          monthly_budget_usd: number
          alert_threshold: number
          auto_response_conditions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          enabled?: boolean
          features_enabled?: Json
          default_model?: string
          fallback_model?: string
          max_tokens?: number
          temperature?: number
          monthly_budget_usd?: number
          alert_threshold?: number
          auto_response_conditions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          enabled?: boolean
          features_enabled?: Json
          default_model?: string
          fallback_model?: string
          max_tokens?: number
          temperature?: number
          monthly_budget_usd?: number
          alert_threshold?: number
          auto_response_conditions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_settings_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      ai_responses: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string | null
          feature: 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template' | 'translation'
          model_used: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          response_data: Json
          latency_ms: number
          cost_usd: number
          confidence_score: number | null
          user_feedback: 'accepted' | 'rejected' | 'modified' | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id?: string | null
          feature: 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template' | 'translation'
          model_used: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          response_data: Json
          latency_ms: number
          cost_usd: number
          confidence_score?: number | null
          user_feedback?: 'accepted' | 'rejected' | 'modified' | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string | null
          feature?: 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template' | 'translation'
          model_used?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          response_data?: Json
          latency_ms?: number
          cost_usd?: number
          confidence_score?: number | null
          user_feedback?: 'accepted' | 'rejected' | 'modified' | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_responses_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_responses_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_ai_metadata: {
        Row: {
          conversation_id: string
          organization_id: string
          sentiment: 'positive' | 'neutral' | 'negative' | null
          sentiment_score: number | null
          sentiment_confidence: number | null
          urgency_level: 'low' | 'medium' | 'high' | 'critical' | null
          summary: string | null
          key_points: string[] | null
          next_steps: string[] | null
          topics: string[] | null
          auto_response_count: number
          last_auto_response_at: string | null
          last_analyzed_at: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          organization_id: string
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          sentiment_score?: number | null
          sentiment_confidence?: number | null
          urgency_level?: 'low' | 'medium' | 'high' | 'critical' | null
          summary?: string | null
          key_points?: string[] | null
          next_steps?: string[] | null
          topics?: string[] | null
          auto_response_count?: number
          last_auto_response_at?: string | null
          last_analyzed_at?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          organization_id?: string
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          sentiment_score?: number | null
          sentiment_confidence?: number | null
          urgency_level?: 'low' | 'medium' | 'high' | 'critical' | null
          summary?: string | null
          key_points?: string[] | null
          next_steps?: string[] | null
          topics?: string[] | null
          auto_response_count?: number
          last_auto_response_at?: string | null
          last_analyzed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_ai_metadata_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: true
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_ai_metadata_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      team_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'admin' | 'member'
          invited_by: string
          status: 'pending' | 'accepted' | 'expired' | 'revoked'
          token: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: 'admin' | 'member'
          invited_by: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          token: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'admin' | 'member'
          invited_by?: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          token?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      message_templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          content: string
          variables: string[] | null
          category:
            | 'quick_reply'
            | 'greeting'
            | 'away_message'
            | 'appointment'
            | 'follow_up'
            | 'custom'
          language: string
          ai_generated: boolean
          ai_prompt: string | null
          ai_model: string | null
          effectiveness_score: number | null
          usage_count: number
          last_used_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          content: string
          variables?: string[] | null
          category?:
            | 'quick_reply'
            | 'greeting'
            | 'away_message'
            | 'appointment'
            | 'follow_up'
            | 'custom'
          language?: string
          ai_generated?: boolean
          ai_prompt?: string | null
          ai_model?: string | null
          effectiveness_score?: number | null
          usage_count?: number
          last_used_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          content?: string
          variables?: string[] | null
          category?:
            | 'quick_reply'
            | 'greeting'
            | 'away_message'
            | 'appointment'
            | 'follow_up'
            | 'custom'
          language?: string
          ai_generated?: boolean
          ai_prompt?: string | null
          ai_model?: string | null
          effectiveness_score?: number | null
          usage_count?: number
          last_used_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_templates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          status: 'processing' | 'completed' | 'failed'
          payload: Json
          error_message: string | null
          retry_count: number
          next_retry_at: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          status?: 'processing' | 'completed' | 'failed'
          payload: Json
          error_message?: string | null
          retry_count?: number
          next_retry_at?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          status?: 'processing' | 'completed' | 'failed'
          payload?: Json
          error_message?: string | null
          retry_count?: number
          next_retry_at?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          organization_id: string
          subscription_id: string
          stripe_refund_id: string | null
          amount: number
          currency: string
          refund_type: 'full' | 'partial' | 'prorated'
          reason: string
          description: string | null
          status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
          cancel_subscription: boolean
          requested_by: string
          approved_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          subscription_id: string
          stripe_refund_id?: string | null
          amount: number
          currency?: string
          refund_type: 'full' | 'partial' | 'prorated'
          reason: string
          description?: string | null
          status?: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
          cancel_subscription?: boolean
          requested_by: string
          approved_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          subscription_id?: string
          stripe_refund_id?: string | null
          amount?: number
          currency?: string
          refund_type?: 'full' | 'partial' | 'prorated'
          reason?: string
          description?: string | null
          status?: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
          cancel_subscription?: boolean
          requested_by?: string
          approved_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'refunds_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      payment_intents: {
        Row: {
          id: string
          organization_id: string
          stripe_payment_intent_id: string
          amount: number
          currency: string
          status: string
          client_secret: string
          requires_3ds: boolean
          authentication_status: string | null
          authenticated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_payment_intent_id: string
          amount: number
          currency?: string
          status: string
          client_secret: string
          requires_3ds?: boolean
          authentication_status?: string | null
          authenticated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_payment_intent_id?: string
          amount?: number
          currency?: string
          status?: string
          client_secret?: string
          requires_3ds?: boolean
          authentication_status?: string | null
          authenticated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_intents_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      billing_events: {
        Row: {
          id: string
          organization_id: string
          event_type: string
          amount: number | null
          currency: string | null
          subscription_id: string | null
          invoice_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_type: string
          amount?: number | null
          currency?: string | null
          subscription_id?: string | null
          invoice_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_type?: string
          amount?: number | null
          currency?: string | null
          subscription_id?: string | null
          invoice_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_events_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      routing_history: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string
          assigned_to: string
          routing_strategy: string
          available_agents: string[]
          workload_scores: Json
          selection_reason: string | null
          accepted: boolean
          rejected_at: string | null
          rejection_reason: string | null
          routed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id: string
          assigned_to: string
          routing_strategy: string
          available_agents: string[]
          workload_scores?: Json
          selection_reason?: string | null
          accepted?: boolean
          rejected_at?: string | null
          rejection_reason?: string | null
          routed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string
          assigned_to?: string
          routing_strategy?: string
          available_agents?: string[]
          workload_scores?: Json
          selection_reason?: string | null
          accepted?: boolean
          rejected_at?: string | null
          rejection_reason?: string | null
          routed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'routing_history_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routing_history_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routing_history_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      routing_rules: {
        Row: {
          id: string
          organization_id: string
          rule_name: string
          is_active: boolean
          priority: number
          strategy: 'round_robin' | 'least_loaded' | 'skill_based' | 'priority_based' | 'custom'
          strategy_config: Json
          conditions: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          rule_name: string
          is_active?: boolean
          priority?: number
          strategy: 'round_robin' | 'least_loaded' | 'skill_based' | 'priority_based' | 'custom'
          strategy_config?: Json
          conditions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          rule_name?: string
          is_active?: boolean
          priority?: number
          strategy?: 'round_robin' | 'least_loaded' | 'skill_based' | 'priority_based' | 'custom'
          strategy_config?: Json
          conditions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'routing_rules_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routing_rules_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      escalation_rules: {
        Row: {
          id: string
          organization_id: string
          rule_name: string
          is_active: boolean
          priority: number
          sla_threshold_minutes: number
          escalation_target: 'manager' | 'team_lead' | 'senior_agent' | 'custom'
          notification_channels: string[]
          conditions: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          rule_name: string
          is_active?: boolean
          priority?: number
          sla_threshold_minutes?: number
          escalation_target?: 'manager' | 'team_lead' | 'senior_agent' | 'custom'
          notification_channels?: string[]
          conditions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          rule_name?: string
          is_active?: boolean
          priority?: number
          sla_threshold_minutes?: number
          escalation_target?: 'manager' | 'team_lead' | 'senior_agent' | 'custom'
          notification_channels?: string[]
          conditions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'escalation_rules_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'escalation_rules_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: string
          plan_id: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: string
          plan_id: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_subscription_id?: string
          stripe_customer_id?: string
          status?: string
          plan_id?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      demo_sessions: {
        Row: {
          id: string
          session_id: string
          business_scenario: string
          user_agent: string | null
          ip_address: string | null
          started_at: string
          ended_at: string | null
          total_duration: string | null
          completed_steps: number
          conversion_achieved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          business_scenario: string
          user_agent?: string | null
          ip_address?: string | null
          started_at?: string
          ended_at?: string | null
          total_duration?: string | null
          completed_steps?: number
          conversion_achieved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          business_scenario?: string
          user_agent?: string | null
          ip_address?: string | null
          started_at?: string
          ended_at?: string | null
          total_duration?: string | null
          completed_steps?: number
          conversion_achieved?: boolean
          created_at?: string
        }
        Relationships: []
      }
      demo_session_activities: {
        Row: {
          id: string
          session_id: string
          activity_type: string
          activity_data: Json
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          activity_type: string
          activity_data: Json
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          activity_type?: string
          activity_data?: Json
          timestamp?: string
          created_at?: string
        }
        Relationships: []
      }
      demo_lead_scores: {
        Row: {
          id: string
          session_id: string
          score: number
          factors: Json
          calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          score: number
          factors: Json
          calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          score?: number
          factors?: Json
          calculated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      conversion_funnels: {
        Row: {
          id: string
          name: string
          business_scenario: string
          steps: Json
          overall_conversion_rate: number
          total_sessions: number
          bottlenecks: Json
          optimization_opportunities: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          business_scenario: string
          steps: Json
          overall_conversion_rate?: number
          total_sessions?: number
          bottlenecks?: Json
          optimization_opportunities?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          business_scenario?: string
          steps?: Json
          overall_conversion_rate?: number
          total_sessions?: number
          bottlenecks?: Json
          optimization_opportunities?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          whatsapp_business_account_id: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_access_token: string | null
          whatsapp_webhook_verify_token: string | null
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier: 'starter' | 'professional' | 'enterprise'
          status: 'active' | 'suspended' | 'cancelled'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          billing_email: string | null
          timezone: string | null
          locale: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_access_token?: string | null
          whatsapp_webhook_verify_token?: string | null
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'cancelled'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          billing_email?: string | null
          timezone?: string | null
          locale?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_access_token?: string | null
          whatsapp_webhook_verify_token?: string | null
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'cancelled'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          billing_email?: string | null
          timezone?: string | null
          locale?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'agent' | 'super_admin'
          is_active: boolean
          is_super_admin: boolean
          last_seen_at: string | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          mfa_backup_codes: string[] | null
          mfa_enrolled_at: string | null
          created_at: string
          updated_at: string
          organization: Organization | null
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'agent' | 'super_admin'
          is_active?: boolean
          is_super_admin?: boolean
          last_seen_at?: string | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          mfa_backup_codes?: string[] | null
          mfa_enrolled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'agent' | 'super_admin'
          is_active?: boolean
          is_super_admin?: boolean
          last_seen_at?: string | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          mfa_backup_codes?: string[] | null
          mfa_enrolled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          organization_id: string
          whatsapp_id: string
          phone_number: string
          name: string | null
          profile_picture_url: string | null
          tags: string[] | null
          notes: string | null
          is_blocked: boolean
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          whatsapp_id: string
          phone_number: string
          name?: string | null
          profile_picture_url?: string | null
          tags?: string[] | null
          notes?: string | null
          is_blocked?: boolean
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          whatsapp_id?: string
          phone_number?: string
          name?: string | null
          profile_picture_url?: string | null
          tags?: string[] | null
          notes?: string | null
          is_blocked?: boolean
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contacts_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          contact_id: string
          assigned_to: string | null
          status: 'open' | 'pending' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          subject: string | null
          last_message_at: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          contact_id: string
          assigned_to?: string | null
          status?: 'open' | 'pending' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          subject?: string | null
          last_message_at?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          contact_id?: string
          assigned_to?: string | null
          status?: 'open' | 'pending' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          subject?: string | null
          last_message_at?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_queue: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string
          priority: number
          queued_at: string
          assigned_at: string | null
          assigned_to: string | null
          assignment_method: string | null
          required_skills: string[]
          required_language: string | null
          preferred_agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id: string
          priority?: number
          queued_at?: string
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?: string | null
          required_skills?: string[]
          required_language?: string | null
          preferred_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string
          priority?: number
          queued_at?: string
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?: string | null
          required_skills?: string[]
          required_language?: string | null
          preferred_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_queue_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_queue_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: true
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_queue_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_queue_preferred_agent_id_fkey'
            columns: ['preferred_agent_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          whatsapp_message_id: string | null
          sender_type: 'contact' | 'agent' | 'system'
          sender_id: string | null
          content: string
          message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
          media_url: string | null
          media_mime_type: string | null
          is_read: boolean
          delivered_at: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          whatsapp_message_id?: string | null
          sender_type: 'contact' | 'agent' | 'system'
          sender_id?: string | null
          content: string
          message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
          media_url?: string | null
          media_mime_type?: string | null
          is_read?: boolean
          delivered_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          whatsapp_message_id?: string | null
          sender_type?: 'contact' | 'agent' | 'system'
          sender_id?: string | null
          content?: string
          message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
          media_url?: string | null
          media_mime_type?: string | null
          is_read?: boolean
          delivered_at?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
