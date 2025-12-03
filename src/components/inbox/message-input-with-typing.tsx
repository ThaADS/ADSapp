'use client'

import EnhancedMessageInput from './enhanced-message-input'
import { TypingIndicatorSimple } from './typing-indicator'
import { useTypingIndicator } from '@/hooks/usePresence'

interface MessageInputWithTypingProps {
  conversationId: string
  organizationId: string
  currentUserId: string
  userName: string
  contactName?: string
  onSendMessage: (
    content: string,
    type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video',
    attachments?: File[]
  ) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * Enhanced message input with real-time typing indicators
 * Shows who else is typing in the conversation
 */
export default function MessageInputWithTyping({
  conversationId,
  organizationId,
  currentUserId,
  userName,
  contactName,
  onSendMessage,
  disabled,
  placeholder,
}: MessageInputWithTypingProps) {
  // Use typing indicator hook
  const { othersTyping, onStartTyping, onStopTyping } = useTypingIndicator(
    conversationId,
    organizationId,
    currentUserId,
    userName
  )

  return (
    <div className="flex flex-col">
      {/* Typing indicator - shows who else is typing */}
      <TypingIndicatorSimple typingAgents={othersTyping} className="bg-gray-50 border-t border-gray-100" />

      {/* Message input */}
      <EnhancedMessageInput
        conversationId={conversationId}
        organizationId={organizationId}
        currentUserId={currentUserId}
        contactName={contactName}
        onSendMessage={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  )
}
