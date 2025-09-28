import { Database } from './database'

export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export type CreateOrganization = Database['public']['Tables']['organizations']['Insert']
export type CreateProfile = Database['public']['Tables']['profiles']['Insert']
export type CreateContact = Database['public']['Tables']['contacts']['Insert']
export type CreateConversation = Database['public']['Tables']['conversations']['Insert']
export type CreateMessage = Database['public']['Tables']['messages']['Insert']

export type UpdateOrganization = Database['public']['Tables']['organizations']['Update']
export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type UpdateContact = Database['public']['Tables']['contacts']['Update']
export type UpdateConversation = Database['public']['Tables']['conversations']['Update']
export type UpdateMessage = Database['public']['Tables']['messages']['Update']

// WhatsApp API Types
export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location'
  text?: {
    body: string
  }
  image?: {
    id: string
    mime_type: string
    sha256: string
    caption?: string
  }
  document?: {
    id: string
    filename: string
    mime_type: string
    sha256: string
    caption?: string
  }
  audio?: {
    id: string
    mime_type: string
    sha256: string
  }
  video?: {
    id: string
    mime_type: string
    sha256: string
    caption?: string
  }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: WhatsAppMessage[]
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

// Stripe Types
export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  maxUsers: number
  maxContacts: number
}

// UI Types
export interface ConversationWithDetails extends Conversation {
  contact: Contact
  assigned_agent?: Profile
  last_message?: Message
  unread_count: number
}

export interface MessageWithSender extends Message {
  sender?: Profile
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface SignUpForm {
  email: string
  password: string
  fullName: string
  organizationName: string
}

export interface SignInForm {
  email: string
  password: string
}

export interface InviteUserForm {
  email: string
  role: 'admin' | 'agent'
}

export interface ContactForm {
  name?: string
  phone_number: string
  tags?: string[]
  notes?: string
}

export interface MessageForm {
  content: string
  type?: 'text' | 'image' | 'document'
  media_url?: string
}