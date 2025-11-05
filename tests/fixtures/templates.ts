/**
 * Message Template Test Fixtures
 *
 * Sample template data for testing template functionality.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import type { MessageTemplate } from '@/types/database'

// =============================================================================
// Marketing Templates
// =============================================================================

export const marketingTemplate: MessageTemplate = {
  id: 'template-marketing-001',
  organization_id: 'org-test-001',
  name: 'summer_sale_announcement',
  content: 'Hi {{name}}! 🌞 Our Summer Sale is now live with {{discount}}% off. Shop now: {{link}}',
  category: 'marketing',
  language: 'en',
  status: 'approved',
  variables: ['name', 'discount', 'link'],
  components: [
    {
      type: 'HEADER',
      format: 'TEXT',
      text: 'Summer Sale Alert!',
    },
    {
      type: 'BODY',
      text: 'Hi {{1}}! 🌞 Our Summer Sale is now live with {{2}}% off. Shop now: {{3}}',
    },
    {
      type: 'FOOTER',
      text: 'Reply STOP to unsubscribe',
    },
  ],
  whatsapp_template_id: 'wa_template_marketing_001',
  created_by: 'user-admin-001',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
}

// =============================================================================
// Customer Service Templates
// =============================================================================

export const welcomeTemplate: MessageTemplate = {
  id: 'template-welcome-001',
  organization_id: 'org-test-001',
  name: 'customer_welcome',
  content: 'Welcome to {{company_name}}, {{customer_name}}! We\'re excited to have you with us. How can we help you today?',
  category: 'utility',
  language: 'en',
  status: 'approved',
  variables: ['company_name', 'customer_name'],
  components: [
    {
      type: 'BODY',
      text: 'Welcome to {{1}}, {{2}}! We\'re excited to have you with us. How can we help you today?',
    },
  ],
  whatsapp_template_id: 'wa_template_welcome_001',
  created_by: 'user-admin-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const ticketCreatedTemplate: MessageTemplate = {
  id: 'template-ticket-001',
  organization_id: 'org-test-001',
  name: 'ticket_created',
  content: 'Thank you for contacting us! Your ticket #{{ticket_id}} has been created. We\'ll respond within {{response_time}} hours.',
  category: 'utility',
  language: 'en',
  status: 'approved',
  variables: ['ticket_id', 'response_time'],
  components: [
    {
      type: 'BODY',
      text: 'Thank you for contacting us! Your ticket #{{1}} has been created. We\'ll respond within {{2}} hours.',
    },
  ],
  whatsapp_template_id: 'wa_template_ticket_001',
  created_by: 'user-admin-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// =============================================================================
// Order/Transaction Templates
// =============================================================================

export const orderConfirmationTemplate: MessageTemplate = {
  id: 'template-order-001',
  organization_id: 'org-test-001',
  name: 'order_confirmation',
  content: 'Order confirmed! 🎉 Order #{{order_id}} - {{item_count}} items - Total: ${{total}}. Estimated delivery: {{delivery_date}}',
  category: 'utility',
  language: 'en',
  status: 'approved',
  variables: ['order_id', 'item_count', 'total', 'delivery_date'],
  components: [
    {
      type: 'HEADER',
      format: 'TEXT',
      text: 'Order Confirmation',
    },
    {
      type: 'BODY',
      text: 'Order confirmed! 🎉 Order #{{1}} - {{2}} items - Total: ${{3}}. Estimated delivery: {{4}}',
    },
    {
      type: 'BUTTONS',
      buttons: [
        {
          type: 'URL',
          text: 'Track Order',
          url: 'https://example.com/track/{{1}}',
        },
      ],
    },
  ],
  whatsapp_template_id: 'wa_template_order_001',
  created_by: 'user-admin-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// =============================================================================
// Authentication Templates
// =============================================================================

export const otpTemplate: MessageTemplate = {
  id: 'template-otp-001',
  organization_id: 'org-test-001',
  name: 'verification_code',
  content: 'Your verification code is: {{code}}. Valid for {{expiry}} minutes. Do not share this code.',
  category: 'authentication',
  language: 'en',
  status: 'approved',
  variables: ['code', 'expiry'],
  components: [
    {
      type: 'BODY',
      text: 'Your verification code is: {{1}}. Valid for {{2}} minutes. Do not share this code.',
    },
    {
      type: 'FOOTER',
      text: 'This is an automated message. Please do not reply.',
    },
  ],
  whatsapp_template_id: 'wa_template_otp_001',
  created_by: 'user-admin-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// =============================================================================
// Pending/Draft Templates
// =============================================================================

export const pendingTemplate: MessageTemplate = {
  id: 'template-pending-001',
  organization_id: 'org-test-001',
  name: 'new_product_launch',
  content: 'Exciting news! Check out our new {{product_name}}. Available {{launch_date}}.',
  category: 'marketing',
  language: 'en',
  status: 'pending',
  variables: ['product_name', 'launch_date'],
  components: [
    {
      type: 'BODY',
      text: 'Exciting news! Check out our new {{1}}. Available {{2}}.',
    },
  ],
  whatsapp_template_id: null,
  created_by: 'user-admin-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const draftTemplate: MessageTemplate = {
  id: 'template-draft-001',
  organization_id: 'org-test-001',
  name: 'seasonal_greeting',
  content: 'Happy {{holiday}}! From all of us at {{company_name}}.',
  category: 'marketing',
  language: 'en',
  status: 'draft',
  variables: ['holiday', 'company_name'],
  components: [],
  whatsapp_template_id: null,
  created_by: 'user-admin-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// =============================================================================
// Rejected Template
// =============================================================================

export const rejectedTemplate: MessageTemplate = {
  id: 'template-rejected-001',
  organization_id: 'org-test-001',
  name: 'promotional_discount',
  content: 'Get 90% OFF NOW! Limited time only!!!',
  category: 'marketing',
  language: 'en',
  status: 'rejected',
  variables: [],
  components: [],
  whatsapp_template_id: null,
  created_by: 'user-admin-001',
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
}

// =============================================================================
// Collections for Testing
// =============================================================================

export const allTemplates: MessageTemplate[] = [
  marketingTemplate,
  welcomeTemplate,
  ticketCreatedTemplate,
  orderConfirmationTemplate,
  otpTemplate,
  pendingTemplate,
  draftTemplate,
  rejectedTemplate,
]

export const approvedTemplates: MessageTemplate[] = [
  marketingTemplate,
  welcomeTemplate,
  ticketCreatedTemplate,
  orderConfirmationTemplate,
  otpTemplate,
]

export const marketingTemplates: MessageTemplate[] = [
  marketingTemplate,
  pendingTemplate,
  draftTemplate,
  rejectedTemplate,
]

export const utilityTemplates: MessageTemplate[] = [
  welcomeTemplate,
  ticketCreatedTemplate,
  orderConfirmationTemplate,
]

export const authenticationTemplates: MessageTemplate[] = [otpTemplate]
