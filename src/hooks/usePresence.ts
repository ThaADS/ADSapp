'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'

/**
 * Agent presence state for real-time collaboration
 */
export interface AgentPresence {
  id: string
  name: string
  avatar_url?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  current_conversation_id?: string
  is_typing?: boolean
  typing_in_conversation_id?: string
  last_seen: string
}

/**
 * Typing indicator state
 */
export interface TypingState {
  agent_id: string
  agent_name: string
  conversation_id: string
  started_at: string
}

interface UsePresenceOptions {
  organizationId: string
  userId: string
  userName: string
  userAvatarUrl?: string
}

interface UsePresenceReturn {
  // Online agents in the organization
  onlineAgents: AgentPresence[]
  // Agents currently typing in any conversation
  typingAgents: TypingState[]
  // Check if specific agent is online
  isAgentOnline: (agentId: string) => boolean
  // Check who is typing in a specific conversation
  getTypingInConversation: (conversationId: string) => TypingState[]
  // Broadcast that current user started typing
  startTyping: (conversationId: string) => void
  // Broadcast that current user stopped typing
  stopTyping: (conversationId: string) => void
  // Update current user's status
  updateStatus: (status: AgentPresence['status']) => void
  // Update which conversation user is viewing
  setCurrentConversation: (conversationId: string | undefined) => void
  // Connection status
  isConnected: boolean
}

/**
 * Real-time presence hook for team inbox collaboration
 *
 * Features:
 * - Agent online/offline status
 * - Typing indicators per conversation
 * - Current conversation tracking
 * - Auto-reconnection
 *
 * @example
 * ```tsx
 * const { onlineAgents, typingAgents, startTyping, stopTyping } = usePresence({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   userName: 'John Doe',
 * })
 *
 * // In message input
 * <input
 *   onFocus={() => startTyping(conversationId)}
 *   onBlur={() => stopTyping(conversationId)}
 * />
 *
 * // Show typing indicators
 * {getTypingInConversation(conversationId).map(t => (
 *   <span key={t.agent_id}>{t.agent_name} is typing...</span>
 * ))}
 * ```
 */
export function usePresence({
  organizationId,
  userId,
  userName,
  userAvatarUrl,
}: UsePresenceOptions): UsePresenceReturn {
  const [onlineAgents, setOnlineAgents] = useState<AgentPresence[]>([])
  const [typingAgents, setTypingAgents] = useState<TypingState[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const currentStatusRef = useRef<AgentPresence['status']>('online')
  const currentConversationRef = useRef<string | undefined>(undefined)

  // Initialize presence channel
  useEffect(() => {
    const supabase = createClient()
    const channelName = `presence:org:${organizationId}`

    // Create presence channel for agent status
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Handle presence sync (initial state and updates)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<AgentPresence>()
      const agents = parsePresenceState(state)
      setOnlineAgents(agents.filter(a => a.id !== userId)) // Exclude self
      setIsConnected(true)
    })

    // Handle new agent joining
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key !== userId) {
        console.log('Agent joined:', key, newPresences)
      }
    })

    // Handle agent leaving
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (key !== userId) {
        console.log('Agent left:', key, leftPresences)
        // Remove typing state for leaving agent
        setTypingAgents(prev => prev.filter(t => t.agent_id !== key))
      }
    })

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track current user's presence
        await channel.track({
          id: userId,
          name: userName,
          avatar_url: userAvatarUrl,
          status: currentStatusRef.current,
          current_conversation_id: currentConversationRef.current,
          is_typing: false,
          last_seen: new Date().toISOString(),
        })
      }
    })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setIsConnected(false)
    }
  }, [organizationId, userId, userName, userAvatarUrl])

  // Initialize typing broadcast channel
  useEffect(() => {
    const supabase = createClient()
    const typingChannelName = `typing:org:${organizationId}`

    // Create broadcast channel for typing indicators
    const typingChannel = supabase.channel(typingChannelName)

    // Handle typing started events
    typingChannel.on('broadcast', { event: 'typing_start' }, ({ payload }) => {
      if (payload.agent_id !== userId) {
        setTypingAgents(prev => {
          // Remove existing typing state for this agent in this conversation
          const filtered = prev.filter(
            t => !(t.agent_id === payload.agent_id && t.conversation_id === payload.conversation_id)
          )
          // Add new typing state
          return [...filtered, payload as TypingState]
        })
      }
    })

    // Handle typing stopped events
    typingChannel.on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
      if (payload.agent_id !== userId) {
        setTypingAgents(prev =>
          prev.filter(
            t => !(t.agent_id === payload.agent_id && t.conversation_id === payload.conversation_id)
          )
        )
      }
    })

    typingChannel.subscribe()
    typingChannelRef.current = typingChannel

    return () => {
      typingChannel.unsubscribe()
      typingChannelRef.current = null
    }
  }, [organizationId, userId])

  // Auto-remove stale typing indicators (older than 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingAgents(prev =>
        prev.filter(t => now - new Date(t.started_at).getTime() < 5000)
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Helper: Parse presence state to AgentPresence array
  const parsePresenceState = (state: RealtimePresenceState<AgentPresence>): AgentPresence[] => {
    const agents: AgentPresence[] = []
    for (const userId in state) {
      const presences = state[userId]
      if (presences && presences.length > 0) {
        // Take the most recent presence
        agents.push(presences[presences.length - 1])
      }
    }
    return agents
  }

  // Check if specific agent is online
  const isAgentOnline = useCallback((agentId: string): boolean => {
    return onlineAgents.some(a => a.id === agentId && a.status !== 'offline')
  }, [onlineAgents])

  // Get typing agents for specific conversation
  const getTypingInConversation = useCallback((conversationId: string): TypingState[] => {
    return typingAgents.filter(t => t.conversation_id === conversationId)
  }, [typingAgents])

  // Broadcast typing started
  const startTyping = useCallback((conversationId: string) => {
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          agent_id: userId,
          agent_name: userName,
          conversation_id: conversationId,
          started_at: new Date().toISOString(),
        },
      })
    }
  }, [userId, userName])

  // Broadcast typing stopped
  const stopTyping = useCallback((conversationId: string) => {
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          agent_id: userId,
          conversation_id: conversationId,
        },
      })
    }
  }, [userId])

  // Update user status
  const updateStatus = useCallback((status: AgentPresence['status']) => {
    currentStatusRef.current = status
    if (channelRef.current) {
      channelRef.current.track({
        id: userId,
        name: userName,
        avatar_url: userAvatarUrl,
        status,
        current_conversation_id: currentConversationRef.current,
        is_typing: false,
        last_seen: new Date().toISOString(),
      })
    }
  }, [userId, userName, userAvatarUrl])

  // Update current conversation
  const setCurrentConversation = useCallback((conversationId: string | undefined) => {
    currentConversationRef.current = conversationId
    if (channelRef.current) {
      channelRef.current.track({
        id: userId,
        name: userName,
        avatar_url: userAvatarUrl,
        status: currentStatusRef.current,
        current_conversation_id: conversationId,
        is_typing: false,
        last_seen: new Date().toISOString(),
      })
    }
  }, [userId, userName, userAvatarUrl])

  return {
    onlineAgents,
    typingAgents,
    isAgentOnline,
    getTypingInConversation,
    startTyping,
    stopTyping,
    updateStatus,
    setCurrentConversation,
    isConnected,
  }
}

/**
 * Simple typing indicator hook for a single conversation
 */
export function useTypingIndicator(
  conversationId: string,
  organizationId: string,
  userId: string,
  userName: string
) {
  const [othersTyping, setOthersTyping] = useState<TypingState[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channelName = `typing:conversation:${conversationId}`

    const channel = supabase.channel(channelName)

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.agent_id !== userId) {
        setOthersTyping(prev => {
          const filtered = prev.filter(t => t.agent_id !== payload.agent_id)
          if (payload.is_typing) {
            return [...filtered, {
              agent_id: payload.agent_id,
              agent_name: payload.agent_name,
              conversation_id: conversationId,
              started_at: new Date().toISOString(),
            }]
          }
          return filtered
        })
      }
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, userId, organizationId])

  // Auto-clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setOthersTyping(prev =>
        prev.filter(t => now - new Date(t.started_at).getTime() < 3000)
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const sendTyping = useCallback((isTyping: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          agent_id: userId,
          agent_name: userName,
          is_typing: isTyping,
        },
      })
    }
  }, [userId, userName])

  const onStartTyping = useCallback(() => {
    sendTyping(true)

    // Auto-stop after 3 seconds of no activity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false)
    }, 3000)
  }, [sendTyping])

  const onStopTyping = useCallback(() => {
    sendTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [sendTyping])

  return {
    othersTyping,
    onStartTyping,
    onStopTyping,
  }
}
