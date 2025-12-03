/**
 * Demo Mock Data for Advanced Analytics
 * Comprehensive metrics and chart data for demonstration
 */

export const DEMO_ANALYTICS_DATA = {
  // Overview Metrics
  overview: {
    total_conversations: 8947,
    total_messages: 67823,
    active_contacts: 12456,
    response_rate: 94.3,
    avg_response_time: 142, // seconds
    satisfaction_score: 4.7,
    conversion_rate: 31.8,
    revenue_this_month: 178945.60,
  },

  // Message Volume Over Time (last 30 days)
  message_volume: [
    { date: '2025-02-19', incoming: 1834, outgoing: 2456, total: 4290 },
    { date: '2025-02-20', incoming: 1923, outgoing: 2634, total: 4557 },
    { date: '2025-02-21', incoming: 2012, outgoing: 2789, total: 4801 },
    { date: '2025-02-22', incoming: 1756, outgoing: 2345, total: 4101 },
    { date: '2025-02-23', incoming: 1645, outgoing: 2234, total: 3879 },
    { date: '2025-02-24', incoming: 1234, outgoing: 1876, total: 3110 }, // weekend
    { date: '2025-02-25', incoming: 1123, outgoing: 1723, total: 2846 }, // weekend
    { date: '2025-02-26', incoming: 2134, outgoing: 2945, total: 5079 },
    { date: '2025-02-27', incoming: 2234, outgoing: 3056, total: 5290 },
    { date: '2025-02-28', incoming: 2345, outgoing: 3167, total: 5512 },
    { date: '2025-03-01', incoming: 2156, outgoing: 2934, total: 5090 },
    { date: '2025-03-02', incoming: 2089, outgoing: 2845, total: 4934 },
    { date: '2025-03-03', incoming: 1876, outgoing: 2567, total: 4443 }, // weekend
    { date: '2025-03-04', incoming: 1789, outgoing: 2456, total: 4245 }, // weekend
    { date: '2025-03-05', incoming: 2267, outgoing: 3123, total: 5390 },
    { date: '2025-03-06', incoming: 2378, outgoing: 3234, total: 5612 },
    { date: '2025-03-07', incoming: 2456, outgoing: 3345, total: 5801 },
    { date: '2025-03-08', incoming: 2234, outgoing: 3089, total: 5323 },
    { date: '2025-03-09', incoming: 2123, outgoing: 2956, total: 5079 },
    { date: '2025-03-10', incoming: 1967, outgoing: 2734, total: 4701 }, // weekend
    { date: '2025-03-11', incoming: 1845, outgoing: 2623, total: 4468 }, // weekend
    { date: '2025-03-12', incoming: 2345, outgoing: 3234, total: 5579 },
    { date: '2025-03-13', incoming: 2456, outgoing: 3345, total: 5801 },
    { date: '2025-03-14', incoming: 2567, outgoing: 3456, total: 6023 },
    { date: '2025-03-15', incoming: 2423, outgoing: 3312, total: 5735 },
    { date: '2025-03-16', incoming: 2312, outgoing: 3189, total: 5501 },
    { date: '2025-03-17', incoming: 2089, outgoing: 2934, total: 5023 }, // weekend
    { date: '2025-03-18', incoming: 1978, outgoing: 2812, total: 4790 }, // weekend
    { date: '2025-03-19', incoming: 2456, outgoing: 3389, total: 5845 },
    { date: '2025-03-20', incoming: 2523, outgoing: 3467, total: 5990 }, // today
  ],

  // Response Time Distribution
  response_time_distribution: [
    { range: '0-30s', count: 3421, percentage: 38.2 },
    { range: '30s-1m', count: 2567, percentage: 28.7 },
    { range: '1-2m', count: 1456, percentage: 16.3 },
    { range: '2-5m', count: 892, percentage: 10.0 },
    { range: '5-10m', count: 423, percentage: 4.7 },
    { range: '10m+', count: 188, percentage: 2.1 },
  ],

  // Conversation Status Breakdown
  conversation_status: [
    { status: 'open', count: 2456, percentage: 27.5 },
    { status: 'assigned', count: 3421, percentage: 38.2 },
    { status: 'resolved', count: 2678, percentage: 29.9 },
    { status: 'archived', count: 392, percentage: 4.4 },
  ],

  // Contact Growth Trends (last 12 months)
  contact_growth: [
    { month: '2024-04', new_contacts: 423, total_contacts: 8934, churn: 23 },
    { month: '2024-05', new_contacts: 534, total_contacts: 9445, churn: 31 },
    { month: '2024-06', new_contacts: 623, total_contacts: 10037, churn: 28 },
    { month: '2024-07', new_contacts: 567, total_contacts: 10576, churn: 19 },
    { month: '2024-08', new_contacts: 489, total_contacts: 11046, churn: 34 },
    { month: '2024-09', new_contacts: 712, total_contacts: 11724, churn: 27 },
    { month: '2024-10', new_contacts: 845, total_contacts: 12542, churn: 22 },
    { month: '2024-11', new_contacts: 923, total_contacts: 13443, churn: 25 },
    { month: '2024-12', new_contacts: 1034, total_contacts: 14452, churn: 18 },
    { month: '2025-01', new_contacts: 891, total_contacts: 15325, churn: 29 },
    { month: '2025-02', new_contacts: 967, total_contacts: 16263, churn: 31 },
    { month: '2025-03', new_contacts: 734, total_contacts: 16966, churn: 24 }, // partial month
  ],

  // Tag Usage Statistics
  tag_usage: [
    { tag: 'customer', count: 4567, conversations: 8234, revenue: 234567.80 },
    { tag: 'hot-lead', count: 1234, conversations: 2345, revenue: 89456.90 },
    { tag: 'support', count: 2345, conversations: 4567, revenue: 0 },
    { tag: 'vip', count: 567, conversations: 1234, revenue: 156789.40 },
    { tag: 'inactive', count: 892, conversations: 892, revenue: 0 },
    { tag: 'trial', count: 1456, conversations: 2789, revenue: 45678.30 },
    { tag: 'warm-lead', count: 1876, conversations: 3421, revenue: 67890.50 },
    { tag: 'cart-abandoned', count: 734, conversations: 1456, revenue: 23456.70 },
    { tag: 'high-value', count: 423, conversations: 934, revenue: 178945.60 },
    { tag: 'churn-risk', count: 312, conversations: 623, revenue: 12345.80 },
  ],

  // Agent Performance Metrics
  agent_performance: [
    {
      agent_id: 'agent-001',
      name: 'Sarah van der Berg',
      conversations_handled: 2456,
      avg_response_time: 98, // seconds
      resolution_rate: 94.7,
      satisfaction_score: 4.8,
      messages_sent: 18923,
      revenue_generated: 67890.40,
    },
    {
      agent_id: 'agent-002',
      name: 'Mike de Vries',
      conversations_handled: 2134,
      avg_response_time: 112,
      resolution_rate: 91.3,
      satisfaction_score: 4.6,
      messages_sent: 16745,
      revenue_generated: 54321.70,
    },
    {
      agent_id: 'agent-003',
      name: 'Emma Jansen',
      conversations_handled: 1876,
      avg_response_time: 127,
      resolution_rate: 88.9,
      satisfaction_score: 4.5,
      messages_sent: 14562,
      revenue_generated: 48765.90,
    },
    {
      agent_id: 'agent-004',
      name: 'Tom Bakker',
      conversations_handled: 1567,
      avg_response_time: 145,
      resolution_rate: 86.2,
      satisfaction_score: 4.4,
      messages_sent: 12234,
      revenue_generated: 41234.60,
    },
    {
      agent_id: 'agent-005',
      name: 'Lisa Mulder',
      conversations_handled: 914,
      avg_response_time: 167,
      resolution_rate: 82.5,
      satisfaction_score: 4.3,
      messages_sent: 7123,
      revenue_generated: 28456.30,
    },
  ],

  // Workflow Execution Stats
  workflow_stats: [
    {
      workflow_id: 'workflow-001',
      name: 'Welcome Series',
      executions: 1247,
      success_count: 1175,
      failure_count: 72,
      success_rate: 94.2,
      avg_completion_time: 185,
    },
    {
      workflow_id: 'workflow-002',
      name: 'Lead Qualification',
      executions: 892,
      success_count: 798,
      failure_count: 94,
      success_rate: 89.5,
      avg_completion_time: 142,
    },
    {
      workflow_id: 'workflow-003',
      name: 'Abandoned Cart',
      executions: 567,
      success_count: 410,
      failure_count: 157,
      success_rate: 72.3,
      avg_completion_time: 3600,
    },
    {
      workflow_id: 'workflow-004',
      name: 'Support Escalation',
      executions: 423,
      success_count: 409,
      failure_count: 14,
      success_rate: 96.8,
      avg_completion_time: 95,
    },
    {
      workflow_id: 'workflow-005',
      name: 'Review Campaign',
      executions: 789,
      success_count: 540,
      failure_count: 249,
      success_rate: 68.4,
      avg_completion_time: 7200,
    },
  ],

  // Campaign Performance Comparison
  campaign_performance: [
    {
      campaign_id: 'broadcast-001',
      campaign_name: 'Voorjaars Promotie',
      type: 'broadcast',
      sent: 2847,
      delivered: 2801,
      opened: 2156,
      clicked: 847,
      converted: 234,
      revenue: 47890.50,
      roi: 458.2, // percentage
    },
    {
      campaign_id: 'drip-001',
      campaign_name: 'Onboarding Series',
      type: 'drip',
      sent: 3421,
      delivered: 3389,
      opened: 2847,
      clicked: 1876,
      converted: 1187,
      revenue: 163521.80,
      roi: 623.7,
    },
    {
      campaign_id: 'workflow-002',
      campaign_name: 'Lead Qualification',
      type: 'workflow',
      sent: 892,
      delivered: 876,
      opened: 734,
      clicked: 456,
      converted: 189,
      revenue: 79823.60,
      roi: 712.4,
    },
    {
      campaign_id: 'broadcast-008',
      campaign_name: 'Webinar Uitnodiging',
      type: 'broadcast',
      sent: 2134,
      delivered: 2098,
      opened: 1645,
      clicked: 892,
      converted: 312,
      revenue: 0,
      roi: 0,
    },
    {
      campaign_id: 'drip-005',
      campaign_name: 'Post-Purchase',
      type: 'drip',
      sent: 2134,
      delivered: 2112,
      opened: 1876,
      clicked: 1423,
      converted: 606,
      revenue: 334819.26,
      roi: 891.3,
    },
  ],

  // Customer Journey Metrics
  customer_journey: {
    stages: [
      { stage: 'Awareness', contacts: 8934, conversion_to_next: 67.3 },
      { stage: 'Interest', contacts: 6012, conversion_to_next: 52.8 },
      { stage: 'Consideration', contacts: 3174, conversion_to_next: 41.7 },
      { stage: 'Purchase', contacts: 1323, conversion_to_next: 78.4 },
      { stage: 'Loyalty', contacts: 1037, conversion_to_next: 62.1 },
      { stage: 'Advocacy', contacts: 644, conversion_to_next: 0 },
    ],
    avg_time_to_purchase: 18.7, // days
    avg_customer_lifetime_value: 1247.80,
    repeat_purchase_rate: 43.6,
  },

  // Channel Performance
  channel_performance: [
    { channel: 'WhatsApp', messages: 67823, response_rate: 94.3, satisfaction: 4.7, revenue: 178945.60 },
    { channel: 'Email', messages: 12456, response_rate: 23.4, satisfaction: 3.8, revenue: 23456.70 },
    { channel: 'SMS', messages: 3421, response_rate: 45.6, satisfaction: 4.1, revenue: 8934.50 },
    { channel: 'Web Chat', messages: 8934, response_rate: 78.9, satisfaction: 4.4, revenue: 34567.80 },
  ],

  // Peak Activity Hours
  activity_by_hour: [
    { hour: '00:00', messages: 234, conversations: 89 },
    { hour: '01:00', messages: 156, conversations: 67 },
    { hour: '02:00', messages: 123, conversations: 45 },
    { hour: '03:00', messages: 98, conversations: 34 },
    { hour: '04:00', messages: 112, conversations: 41 },
    { hour: '05:00', messages: 178, conversations: 62 },
    { hour: '06:00', messages: 456, conversations: 134 },
    { hour: '07:00', messages: 891, conversations: 267 },
    { hour: '08:00', messages: 1456, conversations: 423 },
    { hour: '09:00', messages: 2234, conversations: 634 },
    { hour: '10:00', messages: 2789, conversations: 812 },
    { hour: '11:00', messages: 3123, conversations: 923 },
    { hour: '12:00', messages: 2934, conversations: 856 },
    { hour: '13:00', messages: 2678, conversations: 789 },
    { hour: '14:00', messages: 3234, conversations: 945 },
    { hour: '15:00', messages: 3456, conversations: 1012 },
    { hour: '16:00', messages: 3189, conversations: 934 },
    { hour: '17:00', messages: 2845, conversations: 823 },
    { hour: '18:00', messages: 2456, conversations: 712 },
    { hour: '19:00', messages: 1923, conversations: 567 },
    { hour: '20:00', messages: 1567, conversations: 456 },
    { hour: '21:00', messages: 1234, conversations: 356 },
    { hour: '22:00', messages: 892, conversations: 267 },
    { hour: '23:00', messages: 567, conversations: 178 },
  ],

  // Sentiment Analysis
  sentiment_distribution: [
    { sentiment: 'positive', count: 5623, percentage: 62.9 },
    { sentiment: 'neutral', count: 2456, percentage: 27.5 },
    { sentiment: 'negative', count: 868, percentage: 9.7 },
  ],

  // Top Performing Templates
  template_performance: [
    { template_id: 'template-001', name: 'Welcome Message', usage_count: 3421, response_rate: 87.3, conversion_rate: 34.6 },
    { template_id: 'template-002', name: 'Product Inquiry', usage_count: 2789, response_rate: 76.4, conversion_rate: 28.9 },
    { template_id: 'template-003', name: 'Order Confirmation', usage_count: 2456, response_rate: 92.1, conversion_rate: 78.3 },
    { template_id: 'template-004', name: 'Support Request', usage_count: 1876, response_rate: 94.7, conversion_rate: 91.2 },
    { template_id: 'template-005', name: 'Promotional Offer', usage_count: 3234, response_rate: 68.2, conversion_rate: 23.4 },
  ],

  // Revenue Analytics
  revenue_analytics: {
    daily_revenue: [
      { date: '2025-03-01', revenue: 5234.70, orders: 42 },
      { date: '2025-03-02', revenue: 6123.40, orders: 51 },
      { date: '2025-03-03', revenue: 4567.80, orders: 38 },
      { date: '2025-03-04', revenue: 4123.90, orders: 34 },
      { date: '2025-03-05', revenue: 7234.60, orders: 59 },
      { date: '2025-03-06', revenue: 7890.30, orders: 64 },
      { date: '2025-03-07', revenue: 8456.70, orders: 68 },
      { date: '2025-03-08', revenue: 6789.40, orders: 56 },
      { date: '2025-03-09', revenue: 6234.50, orders: 51 },
      { date: '2025-03-10', revenue: 5456.80, orders: 45 },
      { date: '2025-03-11', revenue: 5123.60, orders: 42 },
      { date: '2025-03-12', revenue: 7645.90, orders: 62 },
      { date: '2025-03-13', revenue: 8234.70, orders: 67 },
      { date: '2025-03-14', revenue: 8923.50, orders: 72 },
      { date: '2025-03-15', revenue: 7456.80, orders: 61 },
      { date: '2025-03-16', revenue: 6890.30, orders: 56 },
      { date: '2025-03-17', revenue: 6123.70, orders: 50 },
      { date: '2025-03-18', revenue: 5789.40, orders: 47 },
      { date: '2025-03-19', revenue: 8567.90, orders: 69 },
      { date: '2025-03-20', revenue: 9234.60, orders: 75 },
    ],
    revenue_by_source: [
      { source: 'Direct WhatsApp', revenue: 89234.50, percentage: 49.9 },
      { source: 'Broadcast Campaigns', revenue: 47890.30, percentage: 26.8 },
      { source: 'Drip Campaigns', revenue: 28456.70, percentage: 15.9 },
      { source: 'Workflow Automation', revenue: 13364.10, percentage: 7.5 },
    ],
    top_revenue_products: [
      { product_id: 'prod-001', name: 'Premium Plan', revenue: 45678.90, units: 234 },
      { product_id: 'prod-002', name: 'Enterprise Plan', revenue: 67890.40, units: 89 },
      { product_id: 'prod-003', name: 'Starter Plan', revenue: 23456.70, units: 567 },
      { product_id: 'prod-004', name: 'Add-on Services', revenue: 18923.60, units: 312 },
      { product_id: 'prod-005', name: 'Consulting Hours', revenue: 22996.00, units: 128 },
    ],
  },
}

export const DEMO_ANALYTICS_SUMMARY = {
  total_conversations: DEMO_ANALYTICS_DATA.overview.total_conversations,
  total_messages: DEMO_ANALYTICS_DATA.overview.total_messages,
  total_contacts: DEMO_ANALYTICS_DATA.overview.active_contacts,
  total_revenue: DEMO_ANALYTICS_DATA.overview.revenue_this_month,
  avg_response_time: DEMO_ANALYTICS_DATA.overview.avg_response_time,
  satisfaction_score: DEMO_ANALYTICS_DATA.overview.satisfaction_score,
  conversion_rate: DEMO_ANALYTICS_DATA.overview.conversion_rate,
  month_over_month_growth: 23.4, // percentage
}
