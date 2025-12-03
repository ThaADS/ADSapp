'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TypingState {
  agent_id: string
  agent_name: string
  conversation_id: string
  started_at: string
}

interface TypingIndicatorProps {
  typingAgents: TypingState[]
  className?: string
}

/**
 * Animated typing indicator showing who is currently typing
 *
 * @example
 * ```tsx
 * <TypingIndicator typingAgents={getTypingInConversation(conversationId)} />
 * ```
 */
export default function TypingIndicator({ typingAgents, className = '' }: TypingIndicatorProps) {
  if (typingAgents.length === 0) return null

  const getTypingText = () => {
    if (typingAgents.length === 1) {
      return `${typingAgents[0].agent_name} is typing`
    } else if (typingAgents.length === 2) {
      return `${typingAgents[0].agent_name} and ${typingAgents[1].agent_name} are typing`
    } else {
      return `${typingAgents.length} people are typing`
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-500 ${className}`}
      >
        {/* Animated dots */}
        <div className="flex items-center gap-1">
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>

        {/* Typing text */}
        <span className="italic">{getTypingText()}...</span>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Simple typing indicator without framer-motion dependency
 */
export function TypingIndicatorSimple({ typingAgents, className = '' }: TypingIndicatorProps) {
  if (typingAgents.length === 0) return null

  const getTypingText = () => {
    if (typingAgents.length === 1) {
      return `${typingAgents[0].agent_name} is typing`
    } else if (typingAgents.length === 2) {
      return `${typingAgents[0].agent_name} and ${typingAgents[1].agent_name} are typing`
    } else {
      return `${typingAgents.length} people are typing`
    }
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-500 animate-pulse ${className}`}>
      {/* Simple animated dots using CSS */}
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Typing text */}
      <span className="italic">{getTypingText()}...</span>
    </div>
  )
}
