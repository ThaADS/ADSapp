'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Circle, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import type { AgentPresence } from '@/hooks/usePresence'
import { useTranslations } from '@/components/providers/translation-provider'

interface OnlineAgentsProps {
  agents: AgentPresence[]
  currentConversationId?: string
  className?: string
}

/**
 * Displays online agents in the sidebar
 * Shows who is online and what conversation they're viewing
 */
export default function OnlineAgents({
  agents,
  currentConversationId,
  className = '',
}: OnlineAgentsProps) {
  const t = useTranslations('inbox')
  const [isExpanded, setIsExpanded] = useState(true)

  const getStatusColor = (status: AgentPresence['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'busy':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: AgentPresence['status']) => {
    switch (status) {
      case 'online':
        return t('agents.online')
      case 'away':
        return t('agents.away')
      case 'busy':
        return t('agents.busy')
      default:
        return t('agents.offline')
    }
  }

  // Filter out offline agents
  const onlineAgents = agents.filter(a => a.status !== 'offline')

  // Check who is viewing the same conversation
  const agentsInSameConversation = currentConversationId
    ? onlineAgents.filter(a => a.current_conversation_id === currentConversationId)
    : []

  return (
    <div className={`border-b border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Circle className="h-3 w-3 fill-green-500 text-green-500" />
          <span className="text-sm font-medium text-gray-700">
            {t('agents.teamOnline', { count: onlineAgents.length })}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Agent List */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto px-2 pb-3">
          {onlineAgents.length === 0 ? (
            <p className="px-2 py-2 text-center text-sm text-gray-500">
              {t('agents.noOthersOnline')}
            </p>
          ) : (
            <div className="space-y-1">
              {onlineAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {agent.avatar_url ? (
                      <Image
                        src={agent.avatar_url}
                        alt={agent.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Status indicator */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(
                        agent.status
                      )}`}
                      title={getStatusText(agent.status)}
                    />
                  </div>

                  {/* Name and status */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {agent.name}
                    </p>
                    <div className="flex items-center gap-1">
                      {agent.current_conversation_id === currentConversationId &&
                        currentConversationId && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <Eye className="h-3 w-3" />
                            {t('agents.viewingThisChat')}
                          </span>
                        )}
                      {agent.is_typing && (
                        <span className="text-xs text-gray-500 italic">{t('agents.typing')}</span>
                      )}
                      {!agent.current_conversation_id &&
                        !agent.is_typing && (
                          <span className="text-xs text-gray-400">
                            {getStatusText(agent.status)}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Viewers in current conversation */}
      {currentConversationId && agentsInSameConversation.length > 0 && !isExpanded && (
        <div className="flex items-center gap-1 px-4 pb-2">
          <Eye className="h-3 w-3 text-blue-500" />
          <span className="text-xs text-blue-600">
            {agentsInSameConversation.length === 1
              ? t('agents.isViewing', { name: agentsInSameConversation[0].name })
              : t('agents.othersViewing', { count: agentsInSameConversation.length })}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Compact badge showing number of online agents
 */
export function OnlineAgentsBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-1">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-xs font-medium text-green-700">{count} online</span>
    </div>
  )
}
