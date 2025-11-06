// Demo Account Types and Interfaces

export interface DemoSession {
  id: string
  token: string
  organization_id: string
  business_scenario: BusinessScenario
  status: DemoStatus
  expires_at: string
  created_at: string
  updated_at: string
  ip_address: string
  user_agent: string
  progress: DemoProgress
  analytics: DemoAnalytics
}

export interface DemoProgress {
  steps_completed: string[]
  current_step: string
  completion_percentage: number
  interactions_count: number
  features_explored: string[]
  time_spent_minutes: number
  last_activity_at: string
}

export interface DemoAnalytics {
  session_id: string
  events: DemoEvent[]
  page_views: DemoPageView[]
  feature_usage: DemoFeatureUsage[]
  conversion_funnel: DemoFunnelStep[]
  performance_metrics: DemoPerformanceMetrics
}

export interface DemoEvent {
  id: string
  type: DemoEventType
  action: string
  category: string
  label?: string
  value?: number
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface DemoPageView {
  id: string
  page: string
  title: string
  duration_seconds: number
  timestamp: string
}

export interface DemoFeatureUsage {
  feature: string
  usage_count: number
  first_used_at: string
  last_used_at: string
  time_spent_seconds: number
}

export interface DemoFunnelStep {
  step: string
  completed: boolean
  completed_at?: string
  time_to_complete_seconds?: number
}

export interface DemoPerformanceMetrics {
  page_load_times: Record<string, number>
  api_response_times: Record<string, number>
  error_count: number
  bounce_rate: number
}

export type DemoStatus =
  | 'active'
  | 'expired'
  | 'completed'
  | 'abandoned'
  | 'rate_limited'
  | 'blocked'

export type DemoEventType =
  | 'page_view'
  | 'click'
  | 'form_submission'
  | 'api_call'
  | 'feature_interaction'
  | 'error'
  | 'conversion'

export type BusinessScenario =
  | 'retail'
  | 'restaurant'
  | 'real_estate'
  | 'healthcare'
  | 'education'
  | 'ecommerce'
  | 'automotive'
  | 'travel'
  | 'fitness'
  | 'generic'

// Business Scenario Configurations
export interface BusinessScenarioConfig {
  scenario: BusinessScenario
  name: string
  description: string
  industry: string
  sample_data: DemoSampleData
  guided_tour: DemoTourStep[]
  key_features: string[]
  use_cases: string[]
}

export interface DemoSampleData {
  contacts: DemoContact[]
  conversations: DemoConversation[]
  messages: DemoMessage[]
  templates: DemoTemplate[]
  automation_rules: DemoAutomationRule[]
}

export interface DemoContact {
  name: string
  phone_number: string
  whatsapp_id: string
  tags: string[]
  notes?: string
  profile_picture_url?: string
  last_interaction: string
}

export interface DemoConversation {
  contact_phone: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject?: string
  assigned_agent?: string
  created_at: string
  last_message_at: string
}

export interface DemoMessage {
  conversation_contact_phone: string
  sender_type: 'contact' | 'agent' | 'system'
  content: string
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location'
  media_url?: string
  created_at: string
  is_read: boolean
}

export interface DemoTemplate {
  name: string
  content: string
  category: string
  language: string
  variables: string[]
}

export interface DemoAutomationRule {
  name: string
  trigger: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  is_active: boolean
}

export interface DemoTourStep {
  id: string
  title: string
  description: string
  target_element?: string
  page: string
  action?: string
  order: number
  is_optional: boolean
}

// Security and Rate Limiting
export interface DemoSecurityPolicy {
  max_sessions_per_ip: number
  max_sessions_per_hour: number
  session_duration_minutes: number
  cleanup_interval_minutes: number
  blocked_ips: string[]
  allowed_countries?: string[]
  rate_limit_window_minutes: number
}

export interface DemoRateLimitStatus {
  ip_address: string
  current_sessions: number
  sessions_in_window: number
  is_blocked: boolean
  reset_time: string
}

// API Request/Response Types
export interface CreateDemoSessionRequest {
  business_scenario: BusinessScenario
  ip_address?: string
  user_agent?: string
  referrer?: string
  utm_params?: Record<string, string>
}

export interface CreateDemoSessionResponse {
  success: boolean
  data?: {
    session: DemoSession
    organization: {
      id: string
      name: string
      slug: string
    }
    access_token: string
    dashboard_url: string
  }
  error?: string
  rate_limit?: DemoRateLimitStatus
}

export interface DemoStatusResponse {
  success: boolean
  data?: {
    session: DemoSession
    is_valid: boolean
    time_remaining_minutes: number
  }
  error?: string
}

export interface ResetDemoDataRequest {
  confirm: boolean
}

export interface ResetDemoDataResponse {
  success: boolean
  data?: {
    reset_at: string
    items_reset: {
      contacts: number
      conversations: number
      messages: number
    }
  }
  error?: string
}

export interface SimulateMessageRequest {
  contact_phone: string
  message_type: 'text' | 'image' | 'document'
  content: string
  sender_type: 'contact' | 'agent'
  delay_seconds?: number
  trigger_automation?: boolean
}

export interface SimulateMessageResponse {
  success: boolean
  data?: {
    message_id: string
    conversation_id: string
    processed_at: string
  }
  error?: string
}

export interface TrackAnalyticsRequest {
  event_type: DemoEventType
  action: string
  category: string
  label?: string
  value?: number
  metadata?: Record<string, unknown>
  page?: string
}

export interface TrackAnalyticsResponse {
  success: boolean
  data?: {
    event_id: string
    tracked_at: string
  }
  error?: string
}

// Demo Configuration Constants
export const DEMO_SCENARIOS: Record<BusinessScenario, BusinessScenarioConfig> = {
  retail: {
    scenario: 'retail',
    name: 'Fashion Retail Store',
    description:
      'Manage customer inquiries, order status, and support for a fashion retail business',
    industry: 'Retail & Fashion',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: [
      'Order Management',
      'Customer Support',
      'Product Recommendations',
      'Inventory Updates',
    ],
    use_cases: [
      'Order Status Inquiries',
      'Size & Fit Questions',
      'Return Requests',
      'New Arrivals Notifications',
    ],
  },
  restaurant: {
    scenario: 'restaurant',
    name: 'Italian Restaurant',
    description: 'Handle reservations, takeout orders, and customer service for a restaurant',
    industry: 'Food & Beverage',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: [
      'Reservation Management',
      'Menu Sharing',
      'Order Taking',
      'Delivery Coordination',
    ],
    use_cases: ['Table Reservations', 'Takeout Orders', 'Menu Inquiries', 'Special Events'],
  },
  real_estate: {
    scenario: 'real_estate',
    name: 'Premium Real Estate Agency',
    description: 'Connect with property buyers and sellers, schedule viewings, and manage leads',
    industry: 'Real Estate',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: [
      'Lead Management',
      'Property Showcasing',
      'Viewing Scheduling',
      'Market Updates',
    ],
    use_cases: [
      'Property Inquiries',
      'Viewing Requests',
      'Market Analysis',
      'Investment Opportunities',
    ],
  },
  healthcare: {
    scenario: 'healthcare',
    name: 'Medical Practice',
    description: 'Manage patient appointments, health consultations, and medical inquiries',
    industry: 'Healthcare',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: [
      'Appointment Scheduling',
      'Health Consultations',
      'Prescription Management',
      'Health Reminders',
    ],
    use_cases: ['Appointment Booking', 'Health Questions', 'Prescription Refills', 'Test Results'],
  },
  education: {
    scenario: 'education',
    name: 'Online Learning Platform',
    description: 'Support students with course inquiries, assignments, and academic guidance',
    industry: 'Education',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: ['Student Support', 'Course Management', 'Assignment Help', 'Progress Tracking'],
    use_cases: [
      'Course Enrollment',
      'Assignment Submission',
      'Academic Support',
      'Progress Updates',
    ],
  },
  ecommerce: {
    scenario: 'ecommerce',
    name: 'Electronics E-commerce',
    description:
      'Handle online orders, product support, and customer service for an electronics store',
    industry: 'E-commerce',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: ['Order Processing', 'Product Support', 'Warranty Management', 'Tech Support'],
    use_cases: ['Product Inquiries', 'Order Tracking', 'Technical Support', 'Warranty Claims'],
  },
  automotive: {
    scenario: 'automotive',
    name: 'Car Dealership',
    description: 'Assist customers with vehicle inquiries, test drives, and service appointments',
    industry: 'Automotive',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: [
      'Vehicle Showcase',
      'Test Drive Booking',
      'Service Scheduling',
      'Finance Options',
    ],
    use_cases: [
      'Vehicle Inquiries',
      'Test Drive Requests',
      'Service Appointments',
      'Finance Applications',
    ],
  },
  travel: {
    scenario: 'travel',
    name: 'Travel Agency',
    description: 'Help customers plan trips, book accommodations, and provide travel support',
    industry: 'Travel & Tourism',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: ['Trip Planning', 'Booking Management', 'Travel Support', 'Destination Info'],
    use_cases: ['Trip Inquiries', 'Booking Assistance', 'Travel Updates', 'Emergency Support'],
  },
  fitness: {
    scenario: 'fitness',
    name: 'Fitness Studio',
    description: 'Manage class bookings, fitness consultations, and member support',
    industry: 'Health & Fitness',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: ['Class Booking', 'Fitness Tracking', 'Nutrition Advice', 'Personal Training'],
    use_cases: [
      'Class Reservations',
      'Fitness Consultations',
      'Membership Inquiries',
      'Progress Tracking',
    ],
  },
  generic: {
    scenario: 'generic',
    name: 'Business Communication',
    description: 'General business communication and customer service example',
    industry: 'General Business',
    sample_data: {
      contacts: [],
      conversations: [],
      messages: [],
      templates: [],
      automation_rules: [],
    },
    guided_tour: [],
    key_features: ['Customer Support', 'Team Collaboration', 'Message Management', 'Analytics'],
    use_cases: ['Customer Inquiries', 'Support Tickets', 'Team Communication', 'Business Updates'],
  },
}

export const DEFAULT_DEMO_SECURITY_POLICY: DemoSecurityPolicy = {
  max_sessions_per_ip: 3,
  max_sessions_per_hour: 10,
  session_duration_minutes: 30,
  cleanup_interval_minutes: 60,
  blocked_ips: [],
  rate_limit_window_minutes: 60,
}

export const DEMO_TOUR_PAGES = [
  'dashboard',
  'inbox',
  'contacts',
  'analytics',
  'settings',
  'billing',
] as const

export type DemoTourPage = (typeof DEMO_TOUR_PAGES)[number]
