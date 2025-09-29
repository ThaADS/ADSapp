export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Common API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// Database table row types (extracted for easier use)
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type DemoSession = Database['public']['Tables']['demo_sessions']['Row'];
export type DemoSessionActivity = Database['public']['Tables']['demo_session_activities']['Row'];
export type DemoLeadScore = Database['public']['Tables']['demo_lead_scores']['Row'];
export type ConversionFunnel = Database['public']['Tables']['conversion_funnels']['Row'];

// Insert types
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Update types
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type ContactUpdate = Database['public']['Tables']['contacts']['Update'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type Database = {
  public: {
    Tables: {
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
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier: 'starter' | 'professional' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
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
          role: 'owner' | 'admin' | 'agent'
          is_active: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'agent'
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'agent'
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
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
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
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
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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