/**
 * Zod Schema Library for API Validation
 * Phase 30: Input Validation & Security
 *
 * Centralized schema definitions for all API endpoints
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID v4 schema with validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Email schema
 */
export const emailSchema = z.string().email('Invalid email format').max(254)

/**
 * Phone number schema (E.164 format)
 */
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164)')

/**
 * URL schema
 */
export const urlSchema = z.string().url('Invalid URL format')

/**
 * Date string schema (ISO 8601)
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Invalid date format (use ISO 8601)')

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
})

/**
 * Sort order schema
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const contactChannelSchema = z.enum(['whatsapp', 'sms', 'instagram', 'facebook'])

export const createContactSchema = z.object({
  phone_number: phoneSchema,
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateContactSchema = z.object({
  phone_number: phoneSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  is_blocked: z.boolean().optional(),
})

export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(10000),
  skip_duplicates: z.boolean().default(true),
  update_existing: z.boolean().default(false),
})

export const contactSearchSchema = z.object({
  query: z.string().max(255).optional(),
  tags: z.array(z.string().uuid()).optional(),
  is_blocked: z.boolean().optional(),
  has_conversation: z.boolean().optional(),
  created_after: dateSchema.optional(),
  created_before: dateSchema.optional(),
}).merge(paginationSchema)

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const conversationStatusSchema = z.enum([
  'open',
  'pending',
  'resolved',
  'closed',
])

export const createConversationSchema = z.object({
  contact_id: uuidSchema,
  channel: contactChannelSchema.default('whatsapp'),
  initial_message: z.string().max(4096).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  assigned_to: uuidSchema.nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(uuidSchema).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const messageTypeSchema = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'template',
  'interactive',
  'location',
  'contacts',
  'sticker',
])

export const sendMessageSchema = z.object({
  content: z.string().max(4096),
  type: messageTypeSchema.default('text'),
  template_id: uuidSchema.optional(),
  media_url: urlSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

// ============================================================================
// TEMPLATE SCHEMAS
// ============================================================================

export const templateCategorySchema = z.enum([
  'marketing',
  'utility',
  'authentication',
  'transactional',
])

export const templateStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'rejected',
])

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(4096),
  category: templateCategorySchema,
  language: z.string().min(2).max(5).default('en'),
  variables: z.array(z.string()).optional(),
  header: z.object({
    type: z.enum(['text', 'image', 'video', 'document']),
    content: z.string().max(1024).optional(),
    media_url: urlSchema.optional(),
  }).optional(),
  footer: z.string().max(60).optional(),
  buttons: z.array(z.object({
    type: z.enum(['quick_reply', 'url', 'phone', 'copy_code']),
    text: z.string().max(25),
    url: urlSchema.optional(),
    phone_number: phoneSchema.optional(),
    example: z.string().optional(),
  })).max(3).optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#3B82F6'),
  description: z.string().max(255).optional(),
})

export const updateTagSchema = createTagSchema.partial()

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

export const workflowTriggerTypeSchema = z.enum([
  'manual',
  'message_received',
  'contact_created',
  'contact_updated',
  'tag_added',
  'tag_removed',
  'conversation_opened',
  'conversation_closed',
  'webhook',
  'schedule',
])

export const workflowNodeTypeSchema = z.enum([
  'trigger',
  'message',
  'delay',
  'condition',
  'action',
  'split',
  'goal',
  'webhook',
  'ai',
])

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: workflowNodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.string(), z.any()),
})

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
})

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  trigger_type: workflowTriggerTypeSchema,
  trigger_config: z.record(z.string(), z.any()).optional(),
  nodes: z.array(workflowNodeSchema).min(1),
  edges: z.array(workflowEdgeSchema),
  is_active: z.boolean().default(false),
})

export const updateWorkflowSchema = createWorkflowSchema.partial()

// ============================================================================
// DRIP CAMPAIGN SCHEMAS
// ============================================================================

export const dripCampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
])

export const dripStepTypeSchema = z.enum([
  'message',
  'delay',
  'condition',
  'action',
])

export const dripStepSchema = z.object({
  step_number: z.number().int().min(1),
  type: dripStepTypeSchema,
  message_content: z.string().max(4096).optional(),
  template_id: uuidSchema.optional(),
  delay_hours: z.number().int().min(0).max(8760).optional(), // Max 1 year
  delay_minutes: z.number().int().min(0).max(59).optional(),
  condition: z.record(z.string(), z.any()).optional(),
  action: z.record(z.string(), z.any()).optional(),
})

export const createDripCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  trigger: z.object({
    type: z.enum(['manual', 'tag_added', 'contact_created', 'segment_match']),
    config: z.record(z.string(), z.any()).optional(),
  }),
  steps: z.array(dripStepSchema).min(1).max(100),
  settings: z.object({
    respect_business_hours: z.boolean().default(true),
    stop_on_reply: z.boolean().default(false),
    max_messages_per_day: z.number().int().min(1).max(100).default(10),
  }).optional(),
})

export const updateDripCampaignSchema = createDripCampaignSchema.partial()

export const enrollContactsSchema = z.object({
  contact_ids: z.array(uuidSchema).min(1).max(10000),
  start_immediately: z.boolean().default(true),
})

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const bulkOperationTypeSchema = z.enum([
  'send_message',
  'send_template',
  'add_tag',
  'remove_tag',
  'update_field',
  'delete',
  'export',
  'assign',
])

export const createBulkOperationSchema = z.object({
  type: bulkOperationTypeSchema,
  contact_ids: z.array(uuidSchema).min(1).max(100000).optional(),
  segment_id: uuidSchema.optional(),
  filter: z.object({
    tags: z.array(uuidSchema).optional(),
    created_after: dateSchema.optional(),
    created_before: dateSchema.optional(),
    has_conversation: z.boolean().optional(),
    is_blocked: z.boolean().optional(),
  }).optional(),
  config: z.record(z.string(), z.any()),
  schedule_at: dateSchema.optional(),
}).refine(
  data => data.contact_ids || data.segment_id || data.filter,
  { message: 'Must provide contact_ids, segment_id, or filter' }
)

// ============================================================================
// A/B TESTING SCHEMAS
// ============================================================================

export const abTestMetricSchema = z.enum([
  'delivery_rate',
  'read_rate',
  'reply_rate',
  'click_rate',
  'conversion_rate',
])

export const createABTestSchema = z.object({
  name: z.string().min(1).max(100),
  step_id: uuidSchema,
  winning_metric: abTestMetricSchema,
  confidence_threshold: z.number().min(0.8).max(0.99).default(0.95),
  min_sample_size: z.number().int().min(10).max(100000).default(100),
  variants: z.array(z.object({
    name: z.string().min(1).max(50),
    message_content: z.string().max(4096),
    traffic_allocation: z.number().min(1).max(99),
  })).min(2).max(5),
}).refine(
  data => {
    const totalAllocation = data.variants.reduce((sum, v) => sum + v.traffic_allocation, 0)
    return totalAllocation === 100
  },
  { message: 'Variant traffic allocations must sum to 100%' }
)

// ============================================================================
// AI SETTINGS SCHEMAS
// ============================================================================

export const aiProviderSchema = z.enum([
  'openai',
  'anthropic',
  'openrouter',
])

export const updateAISettingsSchema = z.object({
  provider: aiProviderSchema.optional(),
  model: z.string().max(100).optional(),
  auto_response_enabled: z.boolean().optional(),
  auto_response_delay_seconds: z.number().int().min(0).max(300).optional(),
  auto_response_templates: z.array(z.string()).max(10).optional(),
  sentiment_analysis_enabled: z.boolean().optional(),
  suggested_replies_enabled: z.boolean().optional(),
  max_tokens: z.number().int().min(100).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  system_prompt: z.string().max(4096).optional(),
})

// ============================================================================
// BILLING SCHEMAS
// ============================================================================

export const billingPlanSchema = z.enum([
  'free',
  'starter',
  'professional',
  'enterprise',
])

export const upgradeSubscriptionSchema = z.object({
  plan_id: z.string().min(1),
  payment_method_id: z.string().optional(),
  promo_code: z.string().max(50).optional(),
})

export const createPaymentMethodSchema = z.object({
  type: z.enum(['card', 'sepa_debit', 'ideal']),
  billing_details: z.object({
    name: z.string().min(1).max(255),
    email: emailSchema.optional(),
    address: z.object({
      line1: z.string().max(255).optional(),
      line2: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      postal_code: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    }).optional(),
  }),
})

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().max(255).optional(),
  logo_url: urlSchema.optional(),
  settings: z.object({
    default_language: z.string().min(2).max(5).optional(),
    timezone: z.string().max(50).optional(),
    business_hours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      days: z.array(z.number().int().min(0).max(6)),
    }).optional(),
    notification_preferences: z.record(z.string(), z.boolean()).optional(),
  }).optional(),
  branding: z.object({
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    font_family: z.string().max(100).optional(),
  }).optional(),
})

// ============================================================================
// USER/PROFILE SCHEMAS
// ============================================================================

export const userRoleSchema = z.enum(['owner', 'admin', 'agent', 'viewer'])

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: urlSchema.optional(),
  phone_number: phoneSchema.optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }).optional(),
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().max(50).optional(),
})

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  name: z.string().min(1).max(100).optional(),
})

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
})

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(1).max(100),
  organization_name: z.string().min(1).max(100).optional(),
})

export const mfaVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const createWebhookSchema = z.object({
  url: urlSchema,
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).max(128).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  is_active: z.boolean().default(true),
})

export const updateWebhookSchema = createWebhookSchema.partial()

// ============================================================================
// MEDIA UPLOAD SCHEMAS
// ============================================================================

export const mediaTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export const uploadMediaSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: mediaTypeSchema,
  size: z.number().int().min(1).max(100 * 1024 * 1024), // Max 100MB
})

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(255),
  type: z.enum(['contacts', 'conversations', 'messages', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const analyticsDateRangeSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
})

export const trackEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  properties: z.record(z.string(), z.any()).optional(),
  timestamp: dateSchema.optional(),
})

// ============================================================================
// EXPORT TYPE DEFINITIONS
// ============================================================================

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>
export type CreateDripCampaignInput = z.infer<typeof createDripCampaignSchema>
export type UpdateDripCampaignInput = z.infer<typeof updateDripCampaignSchema>
export type CreateBulkOperationInput = z.infer<typeof createBulkOperationSchema>
export type CreateABTestInput = z.infer<typeof createABTestSchema>
export type UpdateAISettingsInput = z.infer<typeof updateAISettingsSchema>
export type UpgradeSubscriptionInput = z.infer<typeof upgradeSubscriptionSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
