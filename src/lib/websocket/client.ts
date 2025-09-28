'use client'

import { createClient } from '@/lib/supabase/client'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(private organizationId: string) {}

  connect() {
    if (typeof window === 'undefined') return

    try {
      // Use Supabase Realtime for WebSocket connections
      const supabase = createClient()
      
      // Subscribe to real-time changes for messages
      const channel = supabase
        .channel(`organization:${this.organizationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `organization_id=eq.${this.organizationId}`
          },
          (payload) => {
            this.handleNewMessage(payload.new)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `organization_id=eq.${this.organizationId}`
          },
          (payload) => {
            this.handleConversationUpdate(payload.new)
          }
        )
        .subscribe()

      return channel
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.scheduleReconnect()
    }
  }

  private handleNewMessage(message: any) {
    // Dispatch custom event for new messages
    window.dispatchEvent(new CustomEvent('newMessage', {
      detail: message
    }))
  }

  private handleConversationUpdate(conversation: any) {
    // Dispatch custom event for conversation updates
    window.dispatchEvent(new CustomEvent('conversationUpdate', {
      detail: conversation
    }))
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Hook for using WebSocket in React components
export function useWebSocket(organizationId: string) {
  const client = new WebSocketClient(organizationId)
  
  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect()
  }
}
