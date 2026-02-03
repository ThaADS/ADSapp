import { create } from 'zustand'
import type { MentionNotification } from '@/types/mentions'

interface NotificationState {
  // Mention notifications
  mentions: MentionNotification[]
  unreadMentionCount: number

  // Panel state
  isPanelOpen: boolean

  // Actions
  addMention: (mention: MentionNotification) => void
  markMentionViewed: (mentionId: string) => void
  markAllMentionsViewed: () => void
  setUnreadCount: (count: number) => void
  setMentions: (mentions: MentionNotification[]) => void
  clearMentions: () => void
  togglePanel: () => void
  setPanel: (open: boolean) => void
}

const MAX_NOTIFICATIONS = 50

export const useNotificationStore = create<NotificationState>((set) => ({
  mentions: [],
  unreadMentionCount: 0,
  isPanelOpen: false,

  addMention: (mention) =>
    set((state) => ({
      mentions: [mention, ...state.mentions].slice(0, MAX_NOTIFICATIONS),
      unreadMentionCount: state.unreadMentionCount + 1,
    })),

  markMentionViewed: (mentionId) =>
    set((state) => {
      const mention = state.mentions.find((m) => m.id === mentionId)
      if (!mention || mention.viewed) {
        return state
      }
      return {
        mentions: state.mentions.map((m) =>
          m.id === mentionId ? { ...m, viewed: true } : m
        ),
        unreadMentionCount: Math.max(0, state.unreadMentionCount - 1),
      }
    }),

  markAllMentionsViewed: () =>
    set((state) => ({
      mentions: state.mentions.map((m) => ({ ...m, viewed: true })),
      unreadMentionCount: 0,
    })),

  setUnreadCount: (count) =>
    set({ unreadMentionCount: count }),

  setMentions: (mentions) =>
    set({
      mentions: mentions.slice(0, MAX_NOTIFICATIONS),
      unreadMentionCount: mentions.filter((m) => !m.viewed).length,
    }),

  clearMentions: () =>
    set({ mentions: [], unreadMentionCount: 0 }),

  togglePanel: () =>
    set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  setPanel: (open) =>
    set({ isPanelOpen: open }),
}))
