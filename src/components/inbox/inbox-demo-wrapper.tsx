'use client'

import { useDemo } from '@/contexts/demo-context'
import { InboxLayout } from './inbox-layout'
import type { Profile } from '@/types/database'

interface InboxDemoWrapperProps {
  serverConversations: any[]
  profile: Profile
}

export function InboxDemoWrapper({ serverConversations, profile }: InboxDemoWrapperProps) {
  const { state } = useDemo()

  // Transform demo conversations to match the expected format
  const demoConversations = state.conversations.map(conv => ({
    id: conv.id,
    organization_id: profile.organization_id,
    status: conv.status,
    assigned_agent_id: conv.assignedTo === 'You' ? profile.id : null,
    last_message_at: conv.lastMessageTime.toISOString(),
    created_at: conv.lastMessageTime.toISOString(),
    updated_at: conv.lastMessageTime.toISOString(),
    contact: {
      id: `contact-${conv.id}`,
      organization_id: profile.organization_id,
      whatsapp_id: conv.customerPhone,
      phone_number: conv.customerPhone,
      name: conv.customerName,
      profile_data: {
        avatar: conv.avatar,
      },
      tags: conv.tags,
      created_at: conv.lastMessageTime.toISOString(),
      updated_at: conv.lastMessageTime.toISOString(),
    },
    assigned_agent:
      conv.assignedTo === 'You'
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
    messages: conv.messages.map(msg => ({
      id: msg.id,
      conversation_id: conv.id,
      sender_type: msg.type === 'incoming' ? 'contact' : 'agent',
      content: msg.content,
      is_read: msg.status === 'read',
      created_at: msg.timestamp.toISOString(),
    })),
    unread_count: conv.unreadCount,
    last_message: {
      id: conv.messages[conv.messages.length - 1]?.id || '',
      content: conv.lastMessage,
      sender_type:
        conv.messages[conv.messages.length - 1]?.type === 'incoming' ? 'contact' : 'agent',
      created_at: conv.lastMessageTime.toISOString(),
    },
  }))

  // Use demo conversations if demo is active, otherwise use server conversations
  const conversations = state.isActive ? demoConversations : serverConversations

  return <InboxLayout conversations={conversations} profile={profile} />
}
