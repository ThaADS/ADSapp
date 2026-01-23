/**
 * Seed Broadcast Campaigns and Drip Sequences for Demo Organization
 * Creates realistic marketing campaign data with Dutch content
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ORG_ID, DEMO_USERS, BROADCAST_CAMPAIGNS, DRIP_CAMPAIGNS } from './dutch-data'

export interface SeedBroadcast {
  id?: string
  organization_id: string
  name: string
  description: string
  content: string
  template_id: string | null
  audience_type: string
  audience_filter: Record<string, unknown>
  scheduled_at: string | null
  sent_at: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled'
  stats: {
    total_recipients: number
    sent: number
    delivered: number
    read: number
    clicked: number
    failed: number
  }
  created_by: string
  created_at: string
  updated_at: string
}

export interface SeedDripCampaign {
  id?: string
  organization_id: string
  name: string
  description: string
  trigger_type: string
  trigger_conditions: Record<string, unknown>
  status: 'draft' | 'active' | 'paused' | 'completed'
  steps: Array<{
    step_number: number
    delay_days: number
    subject: string
    content: string
    template_id: string | null
  }>
  stats: {
    enrolled: number
    active: number
    completed: number
    unsubscribed: number
    conversion_rate: number
  }
  created_by: string
  created_at: string
  updated_at: string
}

export async function seedBroadcasts(supabase: SupabaseClient): Promise<string[]> {
  console.log('Seeding broadcast campaigns...')

  // Check if broadcasts already exist
  const { data: existingBroadcasts } = await supabase
    .from('broadcasts')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingBroadcasts && existingBroadcasts.length > 0) {
    console.log('Broadcasts already exist for demo org, fetching existing...')
    const { data: allBroadcasts } = await supabase
      .from('broadcasts')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    return allBroadcasts?.map(b => b.id) || []
  }

  const broadcasts: Omit<SeedBroadcast, 'id'>[] = BROADCAST_CAMPAIGNS.map((campaign, index) => {
    const now = new Date()
    const scheduledAt = campaign.scheduled_at

    // Determine status based on scheduled date
    let status: SeedBroadcast['status'] = campaign.status as SeedBroadcast['status']
    let sentAt: string | null = null

    if (status === 'completed') {
      sentAt = new Date(scheduledAt.getTime() + 5 * 60 * 1000).toISOString() // 5 min after scheduled
    }

    return {
      organization_id: DEMO_ORG_ID,
      name: campaign.name,
      description: campaign.description,
      content: campaign.content,
      template_id: null, // Would link to actual template if exists
      audience_type: campaign.audience,
      audience_filter: {
        type: campaign.audience,
        ...(campaign.audience === 'vip_customers' && {
          tags: ['VIP'],
        }),
        ...(campaign.audience === 'recent_customers' && {
          last_order_days: 30,
        }),
        ...(campaign.audience === 'local_customers' && {
          cities: ['Amsterdam', 'Rotterdam', 'Utrecht'],
        }),
        ...(campaign.audience === 'loyal_customers' && {
          orders_count_min: 5,
        }),
        ...(campaign.audience === 'newsletter_subscribers' && {
          opted_in: true,
        }),
      },
      scheduled_at: scheduledAt.toISOString(),
      sent_at: sentAt,
      status,
      stats: {
        total_recipients: campaign.stats.sent || Math.floor(200 + Math.random() * 800),
        sent: campaign.stats.sent,
        delivered: campaign.stats.delivered,
        read: campaign.stats.read,
        clicked: campaign.stats.clicked,
        failed: Math.floor(campaign.stats.sent * 0.01), // ~1% failure rate
      },
      created_by: Object.values(DEMO_USERS)[index % 3],
      created_at: new Date(scheduledAt.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days before scheduled
      updated_at: sentAt || now.toISOString(),
    }
  })

  const { data, error } = await supabase
    .from('broadcasts')
    .insert(broadcasts)
    .select('id')

  if (error) {
    console.error('Error seeding broadcasts:', error)
    throw error
  }

  console.log(`Successfully seeded ${data.length} broadcast campaigns`)
  return data.map(b => b.id)
}

export async function seedDripCampaigns(supabase: SupabaseClient): Promise<string[]> {
  console.log('Seeding drip campaigns...')

  // Check if drip campaigns already exist
  const { data: existingDrips } = await supabase
    .from('drip_campaigns')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingDrips && existingDrips.length > 0) {
    console.log('Drip campaigns already exist for demo org, fetching existing...')
    const { data: allDrips } = await supabase
      .from('drip_campaigns')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)

    return allDrips?.map(d => d.id) || []
  }

  const dripCampaigns: Omit<SeedDripCampaign, 'id'>[] = DRIP_CAMPAIGNS.map((campaign, index) => ({
    organization_id: DEMO_ORG_ID,
    name: campaign.name,
    description: campaign.description,
    trigger_type: campaign.trigger,
    trigger_conditions: {
      event: campaign.trigger,
      ...(campaign.trigger === 'inactive_90_days' && {
        inactive_days: 90,
      }),
      ...(campaign.trigger === 'first_purchase' && {
        order_count: 1,
      }),
      ...(campaign.trigger === 'b2b_inquiry' && {
        tags: ['B2B'],
      }),
    },
    status: campaign.status as SeedDripCampaign['status'],
    steps: campaign.steps.map((step, stepIndex) => ({
      step_number: stepIndex + 1,
      delay_days: step.day,
      subject: step.subject,
      content: step.content,
      template_id: null,
    })),
    stats: {
      enrolled: campaign.stats.enrolled,
      active: campaign.stats.active,
      completed: campaign.stats.completed,
      unsubscribed: campaign.stats.unsubscribed,
      conversion_rate: Math.round((campaign.stats.completed / campaign.stats.enrolled) * 100) / 100,
    },
    created_by: Object.values(DEMO_USERS)[index % 3],
    created_at: new Date(Date.now() - (90 - index * 15) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('drip_campaigns')
    .insert(dripCampaigns)
    .select('id')

  if (error) {
    console.error('Error seeding drip campaigns:', error)
    throw error
  }

  console.log(`Successfully seeded ${data.length} drip campaigns`)
  return data.map(d => d.id)
}

// Seed campaign recipients for tracking
export async function seedCampaignRecipients(
  supabase: SupabaseClient,
  broadcastIds: string[],
  contactIds: string[]
): Promise<void> {
  console.log('Seeding campaign recipients...')

  const recipients: Array<{
    broadcast_id: string
    contact_id: string
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'clicked' | 'failed'
    sent_at: string | null
    delivered_at: string | null
    read_at: string | null
    clicked_at: string | null
  }> = []

  for (const broadcastId of broadcastIds.slice(0, 4)) { // First 4 (completed) broadcasts
    // Select random contacts
    const recipientContacts = contactIds
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(50 + Math.random() * 50))

    for (const contactId of recipientContacts) {
      const rand = Math.random()
      let status: typeof recipients[0]['status']
      let sentAt: string | null = null
      let deliveredAt: string | null = null
      let readAt: string | null = null
      let clickedAt: string | null = null

      const baseTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)

      if (rand < 0.01) {
        status = 'failed'
      } else if (rand < 0.05) {
        status = 'sent'
        sentAt = baseTime.toISOString()
      } else if (rand < 0.15) {
        status = 'delivered'
        sentAt = baseTime.toISOString()
        deliveredAt = new Date(baseTime.getTime() + 1000).toISOString()
      } else if (rand < 0.5) {
        status = 'read'
        sentAt = baseTime.toISOString()
        deliveredAt = new Date(baseTime.getTime() + 1000).toISOString()
        readAt = new Date(baseTime.getTime() + 60000 + Math.random() * 3600000).toISOString()
      } else {
        status = 'clicked'
        sentAt = baseTime.toISOString()
        deliveredAt = new Date(baseTime.getTime() + 1000).toISOString()
        readAt = new Date(baseTime.getTime() + 60000 + Math.random() * 3600000).toISOString()
        clickedAt = new Date(new Date(readAt).getTime() + Math.random() * 1800000).toISOString()
      }

      recipients.push({
        broadcast_id: broadcastId,
        contact_id: contactId,
        status,
        sent_at: sentAt,
        delivered_at: deliveredAt,
        read_at: readAt,
        clicked_at: clickedAt,
      })
    }
  }

  // Insert in batches
  const BATCH_SIZE = 100
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('broadcast_recipients')
      .insert(batch)

    if (error) {
      console.warn('Could not seed broadcast recipients (table may not exist):', error.message)
      return
    }
  }

  console.log(`Successfully seeded ${recipients.length} campaign recipients`)
}

// Seed drip campaign enrollments
export async function seedDripEnrollments(
  supabase: SupabaseClient,
  dripCampaignIds: string[],
  contactIds: string[]
): Promise<void> {
  console.log('Seeding drip campaign enrollments...')

  const enrollments: Array<{
    drip_campaign_id: string
    contact_id: string
    status: 'active' | 'completed' | 'unsubscribed' | 'paused'
    current_step: number
    enrolled_at: string
    completed_at: string | null
    unsubscribed_at: string | null
  }> = []

  for (const dripId of dripCampaignIds) {
    // Random number of enrollments per campaign
    const enrollmentCount = Math.floor(20 + Math.random() * 40)
    const enrolledContacts = contactIds
      .sort(() => 0.5 - Math.random())
      .slice(0, enrollmentCount)

    for (const contactId of enrolledContacts) {
      const rand = Math.random()
      let status: typeof enrollments[0]['status']
      let currentStep = 1
      let completedAt: string | null = null
      let unsubscribedAt: string | null = null

      const enrolledAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)

      if (rand < 0.1) {
        status = 'unsubscribed'
        currentStep = Math.floor(1 + Math.random() * 3)
        unsubscribedAt = new Date(enrolledAt.getTime() + currentStep * 3 * 24 * 60 * 60 * 1000).toISOString()
      } else if (rand < 0.4) {
        status = 'completed'
        currentStep = 5 // All steps done
        completedAt = new Date(enrolledAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      } else {
        status = 'active'
        currentStep = Math.floor(1 + Math.random() * 4)
      }

      enrollments.push({
        drip_campaign_id: dripId,
        contact_id: contactId,
        status,
        current_step: currentStep,
        enrolled_at: enrolledAt.toISOString(),
        completed_at: completedAt,
        unsubscribed_at: unsubscribedAt,
      })
    }
  }

  // Insert in batches
  const BATCH_SIZE = 100
  for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
    const batch = enrollments.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('drip_enrollments')
      .insert(batch)

    if (error) {
      console.warn('Could not seed drip enrollments (table may not exist):', error.message)
      return
    }
  }

  console.log(`Successfully seeded ${enrollments.length} drip campaign enrollments`)
}
