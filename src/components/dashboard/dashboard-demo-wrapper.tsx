'use client'

import { useDemo } from '@/contexts/demo-context'
import { DashboardStats } from './stats'
import { RecentConversations } from './recent-conversations'
import { ActivityFeed } from './activity-feed'
import type { Profile } from '@/types/database'
import { useTranslations } from '@/components/providers/translation-provider'

interface DashboardDemoWrapperProps {
  serverStats: {
    totalConversations: number
    todayMessages: number
    totalContacts: number
    openConversations: number
  }
  serverConversations: any[]
  serverMessages: any[]
  profile: Profile
}

export function DashboardDemoWrapper({
  serverStats,
  serverConversations,
  serverMessages,
  profile,
}: DashboardDemoWrapperProps) {
  const { state } = useDemo()
  const t = useTranslations('dashboard')

  // Transform demo conversations to match the expected format
  const demoConversations = state.conversations.map(conv => {
    // Get the last message from the conversation
    const lastMsg = conv.messages[conv.messages.length - 1]

    return {
      id: conv.id,
      status: conv.status,
      subject: undefined,
      updated_at: conv.lastMessageTime.toISOString(),
      contact: {
        id: `contact-${conv.id}`,
        name: conv.customerName,
        phone_number: conv.customerPhone,
      },
      last_message: lastMsg
        ? {
          content: lastMsg.content,
          created_at: lastMsg.timestamp.toISOString(),
          sender_type: lastMsg.type === 'incoming' ? 'contact' : 'agent',
        }
        : undefined,
    }
  })

  // Transform demo messages to match the expected format
  const demoMessages = state.conversations
    .flatMap(conv =>
      conv.messages
        .filter(msg => {
          // Only include messages from the last 24 hours
          const msgTime = msg.timestamp.getTime()
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
          return msgTime >= oneDayAgo
        })
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_type: msg.type === 'incoming' ? 'contact' : 'agent',
          created_at: msg.timestamp.toISOString(),
          conversation: {
            id: conv.id,
            contact: {
              name: conv.customerName,
              phone_number: conv.customerPhone,
            },
          },
        }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10) // Limit to 10 most recent

  // Calculate demo stats
  const demoStats = {
    totalConversations: state.conversations.length,
    todayMessages: demoMessages.length,
    totalContacts: state.conversations.length, // Each conversation has one contact
    openConversations: state.conversations.filter(
      c => c.status === 'active' || c.status === 'pending'
    ).length,
  }

  // Use demo data if demo is active, otherwise use server data
  const stats = state.isActive ? demoStats : serverStats
  const conversations = state.isActive ? demoConversations : serverConversations
  const messages = state.isActive ? demoMessages : serverMessages

  return (
    <>
      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Main content grid */}
      <div className='grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2'>
        {/* Recent conversations */}
        <div className='rounded-lg bg-white shadow-sm border border-gray-200'>
          <div className='border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4'>
            <h3 className='text-base sm:text-lg leading-6 font-semibold text-gray-900'>{t('conversationList.recentConversations')}</h3>
            <p className='mt-1 text-xs sm:text-sm text-gray-600'>{t('conversationList.recentSubtitle')}</p>
          </div>
          <RecentConversations conversations={conversations || []} />
        </div>

        {/* Activity feed */}
        <div className='rounded-lg bg-white shadow-sm border border-gray-200'>
          <div className='border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4'>
            <h3 className='text-base sm:text-lg leading-6 font-semibold text-gray-900'>{t('recentActivity')}</h3>
            <p className='mt-1 text-xs sm:text-sm text-gray-600'>{t('activity.noActivityDesc')}</p>
          </div>
          <ActivityFeed messages={messages || []} />
        </div>
      </div>
    </>
  )
}
