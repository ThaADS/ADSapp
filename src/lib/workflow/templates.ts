/**
 * Workflow Templates Library
 *
 * Pre-built workflow templates for common automation scenarios.
 * Each template is a complete workflow configuration ready to use.
 */

import type { WorkflowNode, WorkflowEdge, Workflow } from '@/types/workflow';

// ============================================================================
// TEMPLATE INTERFACE
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'nurturing' | 'support' | 'marketing' | 'engagement' | 'feedback';
  icon: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  defaultSettings: Workflow['settings'];
  previewImage?: string;
  tags: string[];
  estimatedDuration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

/**
 * 1. Customer Onboarding Flow
 * Welcome new customers with a multi-step sequence
 */
export const customerOnboardingTemplate: WorkflowTemplate = {
  id: 'customer-onboarding',
  name: 'Customer Onboarding Flow',
  description: 'Welcome new customers with a structured onboarding sequence including welcome message, product guide, and check-in.',
  category: 'onboarding',
  icon: '👋',
  tags: ['welcome', 'new customer', 'onboarding'],
  estimatedDuration: '3 days',
  difficulty: 'beginner',
  defaultSettings: {
    allowReentry: false,
    stopOnError: true,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'New Customer Added',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['new-customer'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Welcome Message',
        messageConfig: {
          customMessage: 'Welcome to our service! 👋 We\'re excited to have you on board. Let me guide you through getting started.',
          useContactName: true,
          fallbackName: 'there',
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 1 Day',
        delayConfig: {
          amount: 1,
          unit: 'days',
          businessHoursOnly: false,
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 480 },
      data: {
        label: 'Product Guide',
        messageConfig: {
          customMessage: 'Here\'s a quick guide to help you get the most out of our product:\n\n📱 Feature 1: [Description]\n🎯 Feature 2: [Description]\n✨ Feature 3: [Description]\n\nNeed help? Just reply to this message!',
          useContactName: false,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 630 },
      data: {
        label: 'Wait 2 Days',
        delayConfig: {
          amount: 2,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 780 },
      data: {
        label: 'Check-in Message',
        messageConfig: {
          customMessage: 'How are you finding everything so far? We\'d love to hear your feedback! 💭\n\nIs there anything I can help you with?',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'action_1',
      type: 'action',
      position: { x: 250, y: 930 },
      data: {
        label: 'Mark as Onboarded',
        actionConfig: {
          actionType: 'add_tag',
          tagIds: ['onboarded'],
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e4', source: 'message_2', target: 'delay_2', type: 'smoothstep' },
    { id: 'e5', source: 'delay_2', target: 'message_3', type: 'smoothstep' },
    { id: 'e6', source: 'message_3', target: 'action_1', type: 'smoothstep' },
  ],
};

/**
 * 2. Lead Nurturing Flow
 * Multi-step follow-up sequence for leads
 */
export const leadNurturingTemplate: WorkflowTemplate = {
  id: 'lead-nurturing',
  name: 'Lead Nurturing Flow',
  description: 'Systematically nurture leads with educational content and gentle follow-ups over time.',
  category: 'nurturing',
  icon: '🌱',
  tags: ['leads', 'nurturing', 'sales'],
  estimatedDuration: '2 weeks',
  difficulty: 'intermediate',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'New Lead',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['lead'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Initial Contact',
        messageConfig: {
          customMessage: 'Hi! Thanks for your interest in our product. I\'d love to help you learn more. What specific challenge are you trying to solve?',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 480 },
      data: {
        label: 'Value Proposition',
        messageConfig: {
          customMessage: 'Here are 3 ways our solution helps businesses like yours:\n\n✅ Benefit 1\n✅ Benefit 2\n✅ Benefit 3\n\nWould you like to see a quick demo?',
          useContactName: false,
        },
        isValid: true,
      },
    },
    {
      id: 'condition_1',
      type: 'condition',
      position: { x: 250, y: 630 },
      data: {
        label: 'Replied?',
        conditionConfig: {
          field: 'contact_status',
          operator: 'equals',
          value: 'replied',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 100, y: 800 },
      data: {
        label: 'Engaged Follow-up',
        messageConfig: {
          customMessage: 'Great! Let me connect you with our team to schedule a personalized demo.',
          useContactName: false,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 400, y: 800 },
      data: {
        label: 'Wait 1 Week',
        delayConfig: {
          amount: 7,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_4',
      type: 'message',
      position: { x: 400, y: 950 },
      data: {
        label: 'Soft Re-engagement',
        messageConfig: {
          customMessage: 'Just checking in! Is this still a priority for you? Happy to answer any questions.',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e4', source: 'message_2', target: 'condition_1', type: 'smoothstep' },
    { id: 'e5', source: 'condition_1', target: 'message_3', sourceHandle: 'true', label: 'Yes', type: 'smoothstep' },
    { id: 'e6', source: 'condition_1', target: 'delay_2', sourceHandle: 'false', label: 'No', type: 'smoothstep' },
    { id: 'e7', source: 'delay_2', target: 'message_4', type: 'smoothstep' },
  ],
};

/**
 * 3. Support Ticket Flow
 * Automated support routing based on issue type
 */
export const supportTicketTemplate: WorkflowTemplate = {
  id: 'support-ticket',
  name: 'Support Ticket Flow',
  description: 'Automatically route and manage support tickets with conditional logic based on issue type.',
  category: 'support',
  icon: '🎫',
  tags: ['support', 'help desk', 'customer service'],
  estimatedDuration: 'Immediate',
  difficulty: 'intermediate',
  defaultSettings: {
    allowReentry: true,
    stopOnError: false,
    trackConversions: false,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Support Request',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['support-request'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Acknowledgment',
        messageConfig: {
          customMessage: 'Thanks for reaching out! We\'ve received your support request. Our team will assist you shortly.',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'condition_1',
      type: 'condition',
      position: { x: 250, y: 330 },
      data: {
        label: 'Urgent Issue?',
        conditionConfig: {
          field: 'tag',
          operator: 'contains',
          value: 'urgent',
        },
        isValid: true,
      },
    },
    {
      id: 'action_1',
      type: 'action',
      position: { x: 100, y: 500 },
      data: {
        label: 'Notify Team Urgent',
        actionConfig: {
          actionType: 'send_notification',
          notificationEmail: 'support@company.com',
          notificationMessage: 'Urgent support ticket received',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 100, y: 650 },
      data: {
        label: 'Urgent Response',
        messageConfig: {
          customMessage: '🚨 Your issue has been escalated to our senior support team. You\'ll hear from us within 30 minutes.',
          useContactName: false,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 400, y: 500 },
      data: {
        label: 'Wait 2 Hours',
        delayConfig: {
          amount: 2,
          unit: 'hours',
          businessHoursOnly: true,
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 400, y: 650 },
      data: {
        label: 'Standard Follow-up',
        messageConfig: {
          customMessage: 'Our support team is reviewing your request. Typical response time is 2-4 hours during business hours.',
          useContactName: false,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'condition_1', type: 'smoothstep' },
    { id: 'e3', source: 'condition_1', target: 'action_1', sourceHandle: 'true', label: 'Yes', type: 'smoothstep' },
    { id: 'e4', source: 'action_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e5', source: 'condition_1', target: 'delay_1', sourceHandle: 'false', label: 'No', type: 'smoothstep' },
    { id: 'e6', source: 'delay_1', target: 'message_3', type: 'smoothstep' },
  ],
};

/**
 * 4. Product Launch Flow
 * Announce new product with multi-stage messaging
 */
export const productLaunchTemplate: WorkflowTemplate = {
  id: 'product-launch',
  name: 'Product Launch Flow',
  description: 'Build excitement for product launches with teaser, announcement, and follow-up messages.',
  category: 'marketing',
  icon: '🚀',
  tags: ['product launch', 'announcement', 'marketing'],
  estimatedDuration: '1 week',
  difficulty: 'beginner',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Launch Campaign Start',
        triggerType: 'date_time',
        triggerConfig: {
          scheduledDate: '2025-12-01',
          scheduledTime: '09:00',
          timezone: 'UTC',
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Teaser Message',
        messageConfig: {
          customMessage: '👀 Something exciting is coming your way...\n\nGet ready for a game-changing announcement in 3 days!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
          specificTime: '09:00',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 480 },
      data: {
        label: 'Launch Announcement',
        messageConfig: {
          customMessage: '🚀 BIG NEWS!\n\nWe just launched [Product Name]!\n\n✨ Key features:\n• Feature 1\n• Feature 2\n• Feature 3\n\nBe one of the first to try it! [Link]',
          useContactName: true,
          mediaUrl: '/product-image.jpg',
          mediaType: 'image',
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 630 },
      data: {
        label: 'Wait 2 Days',
        delayConfig: {
          amount: 2,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 780 },
      data: {
        label: 'Follow-up & Offer',
        messageConfig: {
          customMessage: 'Have you tried [Product Name] yet?\n\n🎁 Special launch offer: Get 20% off when you upgrade today!\n\nOffer ends in 48 hours.',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e4', source: 'message_2', target: 'delay_2', type: 'smoothstep' },
    { id: 'e5', source: 'delay_2', target: 'message_3', type: 'smoothstep' },
  ],
};

/**
 * 5. Abandoned Cart Recovery
 * Win back customers who abandoned their cart
 */
export const abandonedCartTemplate: WorkflowTemplate = {
  id: 'abandoned-cart',
  name: 'Abandoned Cart Recovery',
  description: 'Recover lost sales with timely reminders and incentives for abandoned cart customers.',
  category: 'marketing',
  icon: '🛒',
  tags: ['ecommerce', 'cart recovery', 'sales'],
  estimatedDuration: '3 days',
  difficulty: 'intermediate',
  defaultSettings: {
    allowReentry: true,
    stopOnError: false,
    trackConversions: true,
    conversionGoal: 'purchase_completed',
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Cart Abandoned',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['cart-abandoned'],
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 180 },
      data: {
        label: 'Wait 1 Hour',
        delayConfig: {
          amount: 1,
          unit: 'hours',
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 330 },
      data: {
        label: 'Gentle Reminder',
        messageConfig: {
          customMessage: 'Hey! 👋 You left some items in your cart.\n\nDon\'t miss out! Complete your order now: [Cart Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 480 },
      data: {
        label: 'Wait 1 Day',
        delayConfig: {
          amount: 1,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 630 },
      data: {
        label: 'Discount Offer',
        messageConfig: {
          customMessage: '🎁 Special offer just for you!\n\nGet 10% off your order when you complete checkout today.\n\nUse code: COMEBACK10\n\n[Cart Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_3',
      type: 'delay',
      position: { x: 250, y: 780 },
      data: {
        label: 'Wait 2 Days',
        delayConfig: {
          amount: 2,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 930 },
      data: {
        label: 'Final Reminder',
        messageConfig: {
          customMessage: '⏰ Last chance!\n\nYour cart expires in 24 hours. Don\'t lose the items you wanted!\n\n[Cart Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e2', source: 'delay_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e3', source: 'message_1', target: 'delay_2', type: 'smoothstep' },
    { id: 'e4', source: 'delay_2', target: 'message_2', type: 'smoothstep' },
    { id: 'e5', source: 'message_2', target: 'delay_3', type: 'smoothstep' },
    { id: 'e6', source: 'delay_3', target: 'message_3', type: 'smoothstep' },
  ],
};

/**
 * 6. Event Registration Flow
 * Manage event registrations with confirmation and reminders
 */
export const eventRegistrationTemplate: WorkflowTemplate = {
  id: 'event-registration',
  name: 'Event Registration Flow',
  description: 'Confirm event registrations and send timely reminders to boost attendance.',
  category: 'engagement',
  icon: '📅',
  tags: ['events', 'webinar', 'registration'],
  estimatedDuration: '1 week',
  difficulty: 'beginner',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Event Registration',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['event-registered'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Registration Confirmation',
        messageConfig: {
          customMessage: '🎉 You\'re registered!\n\nEvent: [Event Name]\nDate: [Date]\nTime: [Time]\n\nAdd to calendar: [Link]\n\nSee you there!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 480 },
      data: {
        label: '3-Day Reminder',
        messageConfig: {
          customMessage: '📅 Reminder: [Event Name] is coming up in 3 days!\n\nMake sure you\'re ready. Here\'s what to expect: [Brief overview]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 630 },
      data: {
        label: 'Wait Until 1 Day Before',
        delayConfig: {
          amount: 2,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 780 },
      data: {
        label: '1-Day Reminder',
        messageConfig: {
          customMessage: '⏰ Tomorrow\'s the day!\n\n[Event Name] starts at [Time]\n\nJoin link: [Link]\n\nWe can\'t wait to see you!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_3',
      type: 'delay',
      position: { x: 250, y: 930 },
      data: {
        label: 'Wait Until Event Time',
        delayConfig: {
          amount: 1,
          unit: 'days',
          specificTime: '09:00',
        },
        isValid: true,
      },
    },
    {
      id: 'message_4',
      type: 'message',
      position: { x: 250, y: 1080 },
      data: {
        label: 'Event Starting',
        messageConfig: {
          customMessage: '🎯 [Event Name] is starting now!\n\nJoin here: [Link]\n\nSee you inside!',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e4', source: 'message_2', target: 'delay_2', type: 'smoothstep' },
    { id: 'e5', source: 'delay_2', target: 'message_3', type: 'smoothstep' },
    { id: 'e6', source: 'message_3', target: 'delay_3', type: 'smoothstep' },
    { id: 'e7', source: 'delay_3', target: 'message_4', type: 'smoothstep' },
  ],
};

/**
 * 7. Survey Collection Flow
 * Send survey and collect responses
 */
export const surveyCollectionTemplate: WorkflowTemplate = {
  id: 'survey-collection',
  name: 'Survey Collection Flow',
  description: 'Systematically collect customer feedback through surveys with gentle reminders.',
  category: 'feedback',
  icon: '📊',
  tags: ['survey', 'feedback', 'research'],
  estimatedDuration: '1 week',
  difficulty: 'beginner',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Survey Target',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['survey-target'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'Survey Invitation',
        messageConfig: {
          customMessage: 'Hi! 👋 We value your opinion!\n\nWould you mind taking 2 minutes to complete our quick survey? Your feedback helps us improve.\n\n[Survey Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'condition_1',
      type: 'condition',
      position: { x: 250, y: 480 },
      data: {
        label: 'Survey Completed?',
        conditionConfig: {
          field: 'tag',
          operator: 'contains',
          value: 'survey-completed',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 100, y: 650 },
      data: {
        label: 'Thank You',
        messageConfig: {
          customMessage: '🙏 Thank you for completing our survey! Your feedback is incredibly valuable to us.',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 400, y: 650 },
      data: {
        label: 'Gentle Reminder',
        messageConfig: {
          customMessage: 'Quick reminder about our survey! 📝\n\nYour input would mean a lot to us. It only takes 2 minutes:\n\n[Survey Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 400, y: 800 },
      data: {
        label: 'Wait 4 Days',
        delayConfig: {
          amount: 4,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_4',
      type: 'message',
      position: { x: 400, y: 950 },
      data: {
        label: 'Final Request',
        messageConfig: {
          customMessage: 'Last chance to share your thoughts! The survey closes soon.\n\n[Survey Link]\n\nThank you! 🙏',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'condition_1', type: 'smoothstep' },
    { id: 'e4', source: 'condition_1', target: 'message_2', sourceHandle: 'true', label: 'Yes', type: 'smoothstep' },
    { id: 'e5', source: 'condition_1', target: 'message_3', sourceHandle: 'false', label: 'No', type: 'smoothstep' },
    { id: 'e6', source: 'message_3', target: 'delay_2', type: 'smoothstep' },
    { id: 'e7', source: 'delay_2', target: 'message_4', type: 'smoothstep' },
  ],
};

/**
 * 8. Re-engagement Flow
 * Win back inactive customers
 */
export const reengagementTemplate: WorkflowTemplate = {
  id: 'reengagement',
  name: 'Re-engagement Flow',
  description: 'Win back inactive customers with a thoughtful re-engagement campaign.',
  category: 'engagement',
  icon: '🔄',
  tags: ['inactive', 'win-back', 'retention'],
  estimatedDuration: '2 weeks',
  difficulty: 'intermediate',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Inactive Customer',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['inactive'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'We Miss You',
        messageConfig: {
          customMessage: 'Hi! We noticed you haven\'t been around in a while. We miss you! 😊\n\nWhat can we do to bring you back?',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 330 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 480 },
      data: {
        label: 'Value Reminder',
        messageConfig: {
          customMessage: 'Here\'s what you\'re missing:\n\n✨ New features\n🎁 Exclusive benefits\n💪 Better results\n\nCome check it out!',
          useContactName: false,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 630 },
      data: {
        label: 'Wait 1 Week',
        delayConfig: {
          amount: 7,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 780 },
      data: {
        label: 'Special Offer',
        messageConfig: {
          customMessage: '🎁 Welcome back offer!\n\nWe\'d love to see you again. Here\'s 25% off your next purchase!\n\nUse code: WELCOME25\n\nValid for 7 days only.',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_3',
      type: 'delay',
      position: { x: 250, y: 930 },
      data: {
        label: 'Wait 1 Week',
        delayConfig: {
          amount: 7,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_4',
      type: 'message',
      position: { x: 250, y: 1080 },
      data: {
        label: 'Final Goodbye',
        messageConfig: {
          customMessage: 'We understand if you need to move on. 👋\n\nIf you change your mind, we\'ll be here.\n\nWishing you the best!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'action_1',
      type: 'action',
      position: { x: 250, y: 1230 },
      data: {
        label: 'Mark as Churned',
        actionConfig: {
          actionType: 'add_tag',
          tagIds: ['churned'],
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e3', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e4', source: 'message_2', target: 'delay_2', type: 'smoothstep' },
    { id: 'e5', source: 'delay_2', target: 'message_3', type: 'smoothstep' },
    { id: 'e6', source: 'message_3', target: 'delay_3', type: 'smoothstep' },
    { id: 'e7', source: 'delay_3', target: 'message_4', type: 'smoothstep' },
    { id: 'e8', source: 'message_4', target: 'action_1', type: 'smoothstep' },
  ],
};

/**
 * 9. VIP Customer Flow
 * Special treatment for high-value customers
 */
export const vipCustomerTemplate: WorkflowTemplate = {
  id: 'vip-customer',
  name: 'VIP Customer Flow',
  description: 'Provide premium treatment and personalized attention to high-value VIP customers.',
  category: 'engagement',
  icon: '⭐',
  tags: ['vip', 'premium', 'high-value'],
  estimatedDuration: '1 month',
  difficulty: 'advanced',
  defaultSettings: {
    allowReentry: false,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'VIP Status Achieved',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['vip'],
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 180 },
      data: {
        label: 'VIP Welcome',
        messageConfig: {
          customMessage: '⭐ Congratulations!\n\nYou\'ve been upgraded to VIP status!\n\nYou now have access to:\n• Priority support\n• Exclusive perks\n• Early access to new features\n\nThank you for being such a valued customer!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'action_1',
      type: 'action',
      position: { x: 250, y: 330 },
      data: {
        label: 'Assign Account Manager',
        actionConfig: {
          actionType: 'send_notification',
          notificationEmail: 'vip-team@company.com',
          notificationMessage: 'New VIP customer - assign account manager',
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 480 },
      data: {
        label: 'Wait 1 Week',
        delayConfig: {
          amount: 7,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 250, y: 630 },
      data: {
        label: 'Personal Check-in',
        messageConfig: {
          customMessage: 'Hi! This is [Account Manager Name], your dedicated account manager.\n\nHow are you enjoying your VIP experience? Is there anything I can help you with?',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 780 },
      data: {
        label: 'Wait 2 Weeks',
        delayConfig: {
          amount: 14,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 250, y: 930 },
      data: {
        label: 'Exclusive Offer',
        messageConfig: {
          customMessage: '🎁 VIP Exclusive!\n\nAs a valued VIP member, here\'s a special offer just for you:\n\n[Exclusive Offer Details]\n\nThis is available only to our top customers.',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_3',
      type: 'delay',
      position: { x: 250, y: 1080 },
      data: {
        label: 'Wait 1 Month',
        delayConfig: {
          amount: 30,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_4',
      type: 'message',
      position: { x: 250, y: 1230 },
      data: {
        label: 'Quarterly Review',
        messageConfig: {
          customMessage: 'Time for our quarterly VIP review!\n\n📊 Let\'s discuss:\n• Your results\n• New opportunities\n• How we can help you achieve more\n\nWhen would be a good time to chat?',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e2', source: 'message_1', target: 'action_1', type: 'smoothstep' },
    { id: 'e3', source: 'action_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e4', source: 'delay_1', target: 'message_2', type: 'smoothstep' },
    { id: 'e5', source: 'message_2', target: 'delay_2', type: 'smoothstep' },
    { id: 'e6', source: 'delay_2', target: 'message_3', type: 'smoothstep' },
    { id: 'e7', source: 'message_3', target: 'delay_3', type: 'smoothstep' },
    { id: 'e8', source: 'delay_3', target: 'message_4', type: 'smoothstep' },
  ],
};

/**
 * 10. Feedback Request Flow
 * Post-purchase feedback collection
 */
export const feedbackRequestTemplate: WorkflowTemplate = {
  id: 'feedback-request',
  name: 'Feedback Request Flow',
  description: 'Systematically collect post-purchase feedback to improve products and service.',
  category: 'feedback',
  icon: '💭',
  tags: ['feedback', 'review', 'post-purchase'],
  estimatedDuration: '1 week',
  difficulty: 'beginner',
  defaultSettings: {
    allowReentry: true,
    stopOnError: false,
    trackConversions: true,
    timezone: 'UTC',
  },
  nodes: [
    {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Purchase Complete',
        triggerType: 'tag_applied',
        triggerConfig: {
          tagIds: ['purchase-complete'],
        },
        isValid: true,
      },
    },
    {
      id: 'delay_1',
      type: 'delay',
      position: { x: 250, y: 180 },
      data: {
        label: 'Wait 3 Days',
        delayConfig: {
          amount: 3,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'message_1',
      type: 'message',
      position: { x: 250, y: 330 },
      data: {
        label: 'Satisfaction Check',
        messageConfig: {
          customMessage: 'Hi! How are you enjoying your recent purchase? 😊\n\nWe\'d love to hear your thoughts!',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'delay_2',
      type: 'delay',
      position: { x: 250, y: 480 },
      data: {
        label: 'Wait 2 Days',
        delayConfig: {
          amount: 2,
          unit: 'days',
        },
        isValid: true,
      },
    },
    {
      id: 'condition_1',
      type: 'condition',
      position: { x: 250, y: 630 },
      data: {
        label: 'Responded?',
        conditionConfig: {
          field: 'contact_replied',
          operator: 'equals',
          value: true,
        },
        isValid: true,
      },
    },
    {
      id: 'message_2',
      type: 'message',
      position: { x: 100, y: 800 },
      data: {
        label: 'Thank for Feedback',
        messageConfig: {
          customMessage: '🙏 Thank you for your feedback! It helps us improve.\n\nIf you loved your purchase, would you mind leaving us a review? [Review Link]',
          useContactName: true,
        },
        isValid: true,
      },
    },
    {
      id: 'message_3',
      type: 'message',
      position: { x: 400, y: 800 },
      data: {
        label: 'Review Request',
        messageConfig: {
          customMessage: 'Would you mind leaving us a quick review? ⭐\n\nYour feedback helps other customers and means a lot to us!\n\n[Review Link]\n\nThank you!',
          useContactName: true,
        },
        isValid: true,
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger_1', target: 'delay_1', type: 'smoothstep' },
    { id: 'e2', source: 'delay_1', target: 'message_1', type: 'smoothstep' },
    { id: 'e3', source: 'message_1', target: 'delay_2', type: 'smoothstep' },
    { id: 'e4', source: 'delay_2', target: 'condition_1', type: 'smoothstep' },
    { id: 'e5', source: 'condition_1', target: 'message_2', sourceHandle: 'true', label: 'Yes', type: 'smoothstep' },
    { id: 'e6', source: 'condition_1', target: 'message_3', sourceHandle: 'false', label: 'No', type: 'smoothstep' },
  ],
};

// ============================================================================
// TEMPLATE COLLECTION
// ============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
  customerOnboardingTemplate,
  leadNurturingTemplate,
  supportTicketTemplate,
  productLaunchTemplate,
  abandonedCartTemplate,
  eventRegistrationTemplate,
  surveyCollectionTemplate,
  reengagementTemplate,
  vipCustomerTemplate,
  feedbackRequestTemplate,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((template) => template.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: WorkflowTemplate['category']
): WorkflowTemplate[] {
  return workflowTemplates.filter((template) => template.category === category);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): WorkflowTemplate[] {
  return workflowTemplates.filter((template) =>
    template.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Search templates
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template categories with counts
 */
export function getTemplateCategories(): Array<{
  category: WorkflowTemplate['category'];
  count: number;
}> {
  const categories = new Map<WorkflowTemplate['category'], number>();

  workflowTemplates.forEach((template) => {
    categories.set(template.category, (categories.get(template.category) || 0) + 1);
  });

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}
