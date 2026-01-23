/**
 * Zod Validation Schemas for API Routes
 * Phase 1.3: Centralized input validation schemas
 *
 * These schemas provide type-safe validation for all API request bodies.
 * Use with the validateRequest middleware for automatic validation.
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID validation - strict format checking
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .refine(
    (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
    'Invalid UUID format'
  )

/**
 * Email validation with additional security checks
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform((val) => val.toLowerCase().trim())

/**
 * Phone number validation (E.164 format)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .transform((val) => val.replace(/\s/g, ''))

/**
 * Safe text input - no SQL injection patterns
 */
export const safeTextSchema = (maxLength: number = 255) =>
  z
    .string()
    .max(maxLength, `Text must be at most ${maxLength} characters`)
    .refine(
      (val) => !/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i.test(val),
      'Invalid characters detected'
    )
    .refine(
      (val) => !/(--|\/\*|\*\/|;)/.test(val),
      'Invalid characters detected'
    )

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
})

/**
 * Date range for filtering
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  { message: 'Start date must be before end date' }
)

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const createContactSchema = z.object({
  name: safeTextSchema(255).optional(),
  phone_number: phoneSchema,
  email: emailSchema.optional(),
  tags: z.array(safeTextSchema(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
  notes: safeTextSchema(5000).optional(),
})

export const updateContactSchema = createContactSchema.partial()

export const contactQuerySchema = paginationSchema.extend({
  search: safeTextSchema(100).optional(),
  tags: z.string().optional(), // Comma-separated tags
  status: z.enum(['active', 'archived', 'blocked']).optional(),
})

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const updateConversationSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_agent_id: uuidSchema.nullable().optional(),
  tags: z.array(safeTextSchema(50)).max(20).optional(),
})

export const conversationQuerySchema = paginationSchema.extend({
  status: z.enum(['open', 'pending', 'resolved', 'closed', 'all']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: uuidSchema.optional(),
  unassigned: z.coerce.boolean().optional(),
  search: safeTextSchema(100).optional(),
})

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4096),
  type: z.enum(['text', 'image', 'document', 'audio', 'video', 'template']).default('text'),
  media_url: z.string().url().optional(),
  template_name: safeTextSchema(100).optional(),
  template_params: z.record(z.string()).optional(),
})

// ============================================================================
// BULK CAMPAIGN SCHEMAS
// ============================================================================

export const createBulkCampaignSchema = z.object({
  name: safeTextSchema(255),
  description: safeTextSchema(1000).optional(),
  template_id: uuidSchema.optional(),
  message_content: z.string().min(1).max(4096).optional(),
  contact_ids: z.array(uuidSchema).min(1).max(10000),
  scheduled_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.template_id || data.message_content,
  { message: 'Either template_id or message_content is required' }
)

export const updateBulkCampaignSchema = z.object({
  name: safeTextSchema(255).optional(),
  description: safeTextSchema(1000).optional(),
  status: z.enum(['draft', 'scheduled', 'paused', 'cancelled']).optional(),
  scheduled_at: z.string().datetime().optional(),
})

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'trigger',
    'condition',
    'action',
    'delay',
    'ai_response',
    'split',
    'end',
  ]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()),
})

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
})

export const createWorkflowSchema = z.object({
  name: safeTextSchema(255),
  description: safeTextSchema(1000).optional(),
  trigger_type: z.enum([
    'message_received',
    'keyword_match',
    'contact_created',
    'contact_tagged',
    'schedule',
    'manual',
    'webhook',
  ]),
  trigger_config: z.record(z.unknown()).optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
  is_active: z.boolean().default(false),
})

export const updateWorkflowSchema = createWorkflowSchema.partial()

export const executeWorkflowSchema = z.object({
  workflow_id: uuidSchema,
  trigger_data: z.record(z.unknown()).optional(),
  contact_id: uuidSchema.optional(),
  conversation_id: uuidSchema.optional(),
  dry_run: z.boolean().default(false),
})

// ============================================================================
// DRIP CAMPAIGN SCHEMAS
// ============================================================================

export const dripStepSchema = z.object({
  order: z.number().int().min(0),
  delay_minutes: z.number().int().min(0).max(525600), // Max 1 year
  message_content: z.string().min(1).max(4096).optional(),
  template_id: uuidSchema.optional(),
  condition: z.record(z.unknown()).optional(),
})

export const createDripCampaignSchema = z.object({
  name: safeTextSchema(255),
  description: safeTextSchema(1000).optional(),
  trigger_type: z.enum(['manual', 'tag_added', 'contact_created', 'form_submitted']),
  trigger_config: z.record(z.unknown()).optional(),
  steps: z.array(dripStepSchema).min(1).max(50),
  is_active: z.boolean().default(false),
})

export const updateDripCampaignSchema = createDripCampaignSchema.partial()

// ============================================================================
// TEMPLATE SCHEMAS
// ============================================================================

export const createTemplateSchema = z.object({
  name: safeTextSchema(100),
  category: z.enum(['marketing', 'utility', 'authentication']),
  language: z.string().length(2).default('en'),
  content: z.string().min(1).max(4096),
  header: z.object({
    type: z.enum(['text', 'image', 'document', 'video']).optional(),
    content: z.string().optional(),
  }).optional(),
  footer: safeTextSchema(60).optional(),
  buttons: z.array(z.object({
    type: z.enum(['quick_reply', 'url', 'phone']),
    text: safeTextSchema(25),
    url: z.string().url().optional(),
    phone: phoneSchema.optional(),
  })).max(3).optional(),
  variables: z.array(safeTextSchema(50)).optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

// ============================================================================
// USER & TEAM SCHEMAS
// ============================================================================

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'agent', 'viewer']),
  name: safeTextSchema(255).optional(),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'agent', 'viewer']),
})

export const updateProfileSchema = z.object({
  full_name: safeTextSchema(255).optional(),
  avatar_url: z.string().url().optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sound: z.boolean().optional(),
  }).optional(),
})

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const updateOrganizationSchema = z.object({
  name: safeTextSchema(255).optional(),
  slug: safeTextSchema(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  settings: z.record(z.unknown()).optional(),
  branding: z.object({
    logo_url: z.string().url().optional(),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).optional(),
  business_hours: z.object({
    timezone: z.string().optional(),
    schedule: z.record(z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      closed: z.boolean().optional(),
    })).optional(),
  }).optional(),
})

// ============================================================================
// AUTOMATION RULES SCHEMAS
// ============================================================================

export const automationRuleSchema = z.object({
  name: safeTextSchema(255),
  description: safeTextSchema(1000).optional(),
  trigger: z.object({
    type: z.enum([
      'message_received',
      'keyword_match',
      'contact_tagged',
      'conversation_created',
      'conversation_status_changed',
      'schedule',
    ]),
    config: z.record(z.unknown()),
  }),
  conditions: z.array(z.object({
    field: safeTextSchema(100),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than']),
    value: z.unknown(),
  })).optional(),
  actions: z.array(z.object({
    type: z.enum([
      'send_message',
      'send_template',
      'assign_agent',
      'add_tag',
      'remove_tag',
      'update_status',
      'trigger_webhook',
      'ai_response',
    ]),
    config: z.record(z.unknown()),
  })).min(1),
  is_active: z.boolean().default(false),
  priority: z.number().int().min(0).max(100).default(50),
})

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'message.received',
    'message.sent',
    'message.delivered',
    'message.read',
    'conversation.created',
    'conversation.updated',
    'contact.created',
    'contact.updated',
  ])).min(1),
  secret: safeTextSchema(255).optional(),
  is_active: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
})

// ============================================================================
// AI SETTINGS SCHEMAS
// ============================================================================

export const aiSettingsSchema = z.object({
  auto_response_enabled: z.boolean().optional(),
  draft_suggestions_enabled: z.boolean().optional(),
  sentiment_analysis_enabled: z.boolean().optional(),
  categorization_enabled: z.boolean().optional(),
  model: z.enum(['claude-3.5-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-3.5-turbo']).optional(),
  tone: z.enum(['professional', 'friendly', 'formal', 'casual']).optional(),
  language: z.string().length(2).optional(),
  custom_instructions: safeTextSchema(2000).optional(),
  response_templates: z.array(z.object({
    name: safeTextSchema(100),
    template: safeTextSchema(2000),
    tags: z.array(safeTextSchema(50)).optional(),
  })).max(50).optional(),
})

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  // Common
  uuid: uuidSchema,
  email: emailSchema,
  phone: phoneSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,

  // Contacts
  createContact: createContactSchema,
  updateContact: updateContactSchema,
  contactQuery: contactQuerySchema,

  // Conversations
  updateConversation: updateConversationSchema,
  conversationQuery: conversationQuerySchema,

  // Messages
  sendMessage: sendMessageSchema,

  // Bulk Campaigns
  createBulkCampaign: createBulkCampaignSchema,
  updateBulkCampaign: updateBulkCampaignSchema,

  // Workflows
  createWorkflow: createWorkflowSchema,
  updateWorkflow: updateWorkflowSchema,
  executeWorkflow: executeWorkflowSchema,

  // Drip Campaigns
  createDripCampaign: createDripCampaignSchema,
  updateDripCampaign: updateDripCampaignSchema,

  // Templates
  createTemplate: createTemplateSchema,
  updateTemplate: updateTemplateSchema,

  // Users & Teams
  inviteUser: inviteUserSchema,
  updateUserRole: updateUserRoleSchema,
  updateProfile: updateProfileSchema,

  // Organization
  updateOrganization: updateOrganizationSchema,

  // Automation
  automationRule: automationRuleSchema,

  // Webhooks
  webhookConfig: webhookConfigSchema,

  // AI Settings
  aiSettings: aiSettingsSchema,
}

export default schemas
