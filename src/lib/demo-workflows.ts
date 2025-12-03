/**
 * Demo Mock Data for Workflow Builder
 * Extensive realistic workflows for demonstration
 */

export const DEMO_WORKFLOWS = [
  {
    id: 'workflow-001',
    name: 'Welcome Series - Nieuwe Klanten',
    description: 'Automatische welkomstreeks voor nieuwe klanten met onboarding stappen',
    status: 'active',
    trigger_type: 'contact_created',
    execution_count: 1247,
    success_rate: 94.2,
    avg_completion_time: 185, // seconds
    created_at: '2025-01-15T10:00:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'contact_created', label: 'Nieuw Contact' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'delay-1',
        type: 'delay',
        data: { duration: 2, unit: 'minutes', label: 'Wacht 2 minuten' },
        position: { x: 100, y: 200 },
      },
      {
        id: 'send-1',
        type: 'send_message',
        data: {
          template: 'welcome_message',
          message: 'Hallo {{naam}}! 👋 Welkom bij ons platform. Fijn dat je er bent!',
          label: 'Welkomstbericht',
        },
        position: { x: 100, y: 300 },
      },
      {
        id: 'delay-2',
        type: 'delay',
        data: { duration: 1, unit: 'days', label: 'Wacht 1 dag' },
        position: { x: 100, y: 400 },
      },
      {
        id: 'send-2',
        type: 'send_message',
        data: {
          template: 'onboarding_step1',
          message: 'Klaar om te beginnen? 🚀 Hier zijn 3 snelle stappen om optimaal te starten...',
          label: 'Onboarding Stap 1',
        },
        position: { x: 100, y: 500 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'delay-1' },
      { id: 'e2', source: 'delay-1', target: 'send-1' },
      { id: 'e3', source: 'send-1', target: 'delay-2' },
      { id: 'e4', source: 'delay-2', target: 'send-2' },
    ],
  },
  {
    id: 'workflow-002',
    name: 'Lead Kwalificatie Flow',
    description: 'Intelligente lead kwalificatie met AI-beslissingen',
    status: 'active',
    trigger_type: 'message_received',
    execution_count: 892,
    success_rate: 89.5,
    avg_completion_time: 142,
    created_at: '2025-01-10T14:30:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'message_received', keywords: ['prijs', 'kosten', 'offerte'], label: 'Vraag over Prijzen' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'ai-1',
        type: 'ai_decision',
        data: {
          prompt: 'Bepaal of dit een serieuze lead is op basis van de vraag',
          label: 'AI Kwalificatie',
        },
        position: { x: 100, y: 200 },
      },
      {
        id: 'condition-1',
        type: 'condition',
        data: { field: 'ai_score', operator: '>=', value: 0.7, label: 'Score >= 70%?' },
        position: { x: 100, y: 300 },
      },
      {
        id: 'tag-hot',
        type: 'add_tag',
        data: { tags: ['hot-lead', 'high-priority'], label: 'Tag: Hot Lead' },
        position: { x: 250, y: 400 },
      },
      {
        id: 'assign-sales',
        type: 'assign_agent',
        data: { agent: 'sales-team', label: 'Assign: Sales' },
        position: { x: 250, y: 500 },
      },
      {
        id: 'send-info',
        type: 'send_message',
        data: {
          message: 'Bedankt voor je interesse! 💼 Een salesmedewerker neemt binnen 15 min contact op.',
          label: 'Info Bericht',
        },
        position: { x: 250, y: 600 },
      },
      {
        id: 'tag-warm',
        type: 'add_tag',
        data: { tags: ['warm-lead'], label: 'Tag: Warm Lead' },
        position: { x: -50, y: 400 },
      },
      {
        id: 'send-auto',
        type: 'send_message',
        data: {
          message: 'Bedankt! 📧 Ik stuur je onze prijslijst en productinfo per email.',
          label: 'Automated Info',
        },
        position: { x: -50, y: 500 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'ai-1' },
      { id: 'e2', source: 'ai-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'tag-hot', label: 'Ja' },
      { id: 'e4', source: 'tag-hot', target: 'assign-sales' },
      { id: 'e5', source: 'assign-sales', target: 'send-info' },
      { id: 'e6', source: 'condition-1', target: 'tag-warm', label: 'Nee' },
      { id: 'e7', source: 'tag-warm', target: 'send-auto' },
    ],
  },
  {
    id: 'workflow-003',
    name: 'Abandoned Cart Recovery',
    description: 'Herinner klanten aan items in hun winkelwagen',
    status: 'active',
    trigger_type: 'tag_added',
    execution_count: 567,
    success_rate: 72.3,
    avg_completion_time: 3600,
    created_at: '2025-01-05T09:15:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'tag_added', tag: 'cart-abandoned', label: 'Cart Abandoned' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'delay-1',
        type: 'delay',
        data: { duration: 1, unit: 'hours', label: 'Wacht 1 uur' },
        position: { x: 100, y: 200 },
      },
      {
        id: 'send-1',
        type: 'send_message',
        data: {
          message: '🛒 Je hebt items in je winkelwagen laten staan. Nog vragen? Ik help je graag!',
          label: 'Herinnering 1',
        },
        position: { x: 100, y: 300 },
      },
      {
        id: 'delay-2',
        type: 'delay',
        data: { duration: 24, unit: 'hours', label: 'Wacht 24 uur' },
        position: { x: 100, y: 400 },
      },
      {
        id: 'send-2',
        type: 'send_message',
        data: {
          message: '🎁 Speciale korting: 10% op je winkelwagen! Code: COMEBACK10',
          label: 'Korting Aanbieding',
        },
        position: { x: 100, y: 500 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'delay-1' },
      { id: 'e2', source: 'delay-1', target: 'send-1' },
      { id: 'e3', source: 'send-1', target: 'delay-2' },
      { id: 'e4', source: 'delay-2', target: 'send-2' },
    ],
  },
  {
    id: 'workflow-004',
    name: 'Customer Support Escalatie',
    description: 'Automatische escalatie van urgente support vragen',
    status: 'active',
    trigger_type: 'message_received',
    execution_count: 423,
    success_rate: 96.8,
    avg_completion_time: 95,
    created_at: '2025-01-20T16:45:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'message_received', keywords: ['urgent', 'spoed', 'probleem'], label: 'Urgente Vraag' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'tag-1',
        type: 'add_tag',
        data: { tags: ['urgent', 'support'], label: 'Tag: Urgent' },
        position: { x: 100, y: 200 },
      },
      {
        id: 'assign-1',
        type: 'assign_agent',
        data: { agent: 'support-senior', priority: 'high', label: 'Assign: Senior Support' },
        position: { x: 100, y: 300 },
      },
      {
        id: 'send-1',
        type: 'send_message',
        data: {
          message: '🚨 Ik begrijp de urgentie. Een specialist neemt direct contact op. ETA: 5 minuten.',
          label: 'Bevestiging',
        },
        position: { x: 100, y: 400 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'tag-1' },
      { id: 'e2', source: 'tag-1', target: 'assign-1' },
      { id: 'e3', source: 'assign-1', target: 'send-1' },
    ],
  },
  {
    id: 'workflow-005',
    name: 'Review Verzamel Campagne',
    description: 'Vraag tevreden klanten om een review na succesvolle order',
    status: 'active',
    trigger_type: 'tag_added',
    execution_count: 789,
    success_rate: 68.4,
    avg_completion_time: 7200,
    created_at: '2025-01-12T11:20:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'tag_added', tag: 'order-delivered', label: 'Order Geleverd' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'delay-1',
        type: 'delay',
        data: { duration: 3, unit: 'days', label: 'Wacht 3 dagen' },
        position: { x: 100, y: 200 },
      },
      {
        id: 'send-1',
        type: 'send_message',
        data: {
          message: '⭐ Hoe tevreden ben je met je order? (1-5 sterren)',
          label: 'Vraag Rating',
        },
        position: { x: 100, y: 300 },
      },
      {
        id: 'condition-1',
        type: 'condition',
        data: { field: 'rating', operator: '>=', value: 4, label: 'Rating >= 4?' },
        position: { x: 100, y: 400 },
      },
      {
        id: 'send-review',
        type: 'send_message',
        data: {
          message: '💚 Geweldig! Zou je een review willen achterlaten? [Link]',
          label: 'Review Request',
        },
        position: { x: 250, y: 500 },
      },
      {
        id: 'send-improve',
        type: 'send_message',
        data: {
          message: '😔 Jammer dit te horen. Hoe kunnen we het beter maken?',
          label: 'Feedback Request',
        },
        position: { x: -50, y: 500 },
      },
      {
        id: 'assign-support',
        type: 'assign_agent',
        data: { agent: 'customer-success', label: 'Assign: CS Team' },
        position: { x: -50, y: 600 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'delay-1' },
      { id: 'e2', source: 'delay-1', target: 'send-1' },
      { id: 'e3', source: 'send-1', target: 'condition-1' },
      { id: 'e4', source: 'condition-1', target: 'send-review', label: 'Ja' },
      { id: 'e5', source: 'condition-1', target: 'send-improve', label: 'Nee' },
      { id: 'e6', source: 'send-improve', target: 'assign-support' },
    ],
  },
  {
    id: 'workflow-006',
    name: 'Re-engagement Campaign',
    description: 'Activeer inactieve klanten met gepersonaliseerde aanbiedingen',
    status: 'active',
    trigger_type: 'time_based',
    execution_count: 334,
    success_rate: 45.2,
    avg_completion_time: 1800,
    created_at: '2025-01-08T13:00:00Z',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        data: { event: 'time_based', schedule: 'weekly', filter: 'inactive_30_days', label: '30 Dagen Inactief' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'send-1',
        type: 'send_message',
        data: {
          message: '👋 We missen je! Kom je terug? Hier is een exclusieve aanbieding voor jou...',
          label: 'Re-engagement',
        },
        position: { x: 100, y: 200 },
      },
      {
        id: 'delay-1',
        type: 'delay',
        data: { duration: 7, unit: 'days', label: 'Wacht 7 dagen' },
        position: { x: 100, y: 300 },
      },
      {
        id: 'condition-1',
        type: 'condition',
        data: { field: 'replied', operator: '==', value: false, label: 'Geen Reactie?' },
        position: { x: 100, y: 400 },
      },
      {
        id: 'send-final',
        type: 'send_message',
        data: {
          message: '🎁 Laatste kans: 25% korting met code COMEBACK25. Geldig tot einde week!',
          label: 'Final Offer',
        },
        position: { x: 100, y: 500 },
      },
      {
        id: 'remove-tag',
        type: 'remove_tag',
        data: { tags: ['inactive'], label: 'Remove: Inactive' },
        position: { x: 250, y: 500 },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'send-1' },
      { id: 'e2', source: 'send-1', target: 'delay-1' },
      { id: 'e3', source: 'delay-1', target: 'condition-1' },
      { id: 'e4', source: 'condition-1', target: 'send-final', label: 'Ja' },
      { id: 'e5', source: 'condition-1', target: 'remove-tag', label: 'Nee (Active)' },
    ],
  },
]

export const DEMO_WORKFLOW_STATS = {
  total_workflows: DEMO_WORKFLOWS.length,
  active_workflows: DEMO_WORKFLOWS.filter(w => w.status === 'active').length,
  total_executions: DEMO_WORKFLOWS.reduce((sum, w) => sum + w.execution_count, 0),
  avg_success_rate: DEMO_WORKFLOWS.reduce((sum, w) => sum + w.success_rate, 0) / DEMO_WORKFLOWS.length,
  monthly_growth: '+23%',
}
