'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/stores/notifications'
import type { MentionNotification } from '@/types/mentions'

interface MentionSubscriberProps {
  userId: string
  organizationId: string
}

/**
 * Invisible component that subscribes to Supabase Realtime
 * for mention notifications targeted at the current user
 */
export function MentionSubscriber({ userId, organizationId }: MentionSubscriberProps) {
  const { addMention, setUnreadCount } = useNotificationStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('mentions')
        .select('id', { count: 'exact', head: true })
        .eq('mentioned_user_id', userId)
        .eq('organization_id', organizationId)
        .is('viewed_at', null)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    fetchUnreadCount()

    // Subscribe to new mentions for this user
    const channel = supabase
      .channel(`mentions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions',
          filter: `mentioned_user_id=eq.${userId}`,
        },
        async (payload) => {
          const mention = payload.new as {
            id: string
            note_id: string
            conversation_id: string
            mentioning_user_id: string
            created_at: string
          }

          // Fetch note and author details for the notification
          const { data: note } = await supabase
            .from('conversation_notes')
            .select(`
              id,
              content_plain,
              conversation_id,
              profiles:created_by (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', mention.note_id)
            .single()

          if (note) {
            const profiles = note.profiles as {
              id: string
              full_name: string | null
              avatar_url: string | null
            } | null

            const notification: MentionNotification = {
              id: mention.id,
              type: 'mention',
              title: `${profiles?.full_name || 'Someone'} mentioned you`,
              message: note.content_plain.slice(0, 100) + (note.content_plain.length > 100 ? '...' : ''),
              conversation_id: note.conversation_id,
              note_id: note.id,
              mentioning_user: {
                id: profiles?.id || mention.mentioning_user_id,
                full_name: profiles?.full_name || null,
                avatar_url: profiles?.avatar_url || null,
              },
              created_at: mention.created_at,
              viewed: false,
            }

            addMention(notification)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, organizationId, addMention, setUnreadCount])

  // This component doesn't render anything visible
  return null
}
