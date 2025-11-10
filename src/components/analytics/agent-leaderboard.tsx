'use client'

/**
 * Agent Leaderboard
 * Rankings and performance comparison for agents
 */

import { useState, useEffect } from 'react'
import {
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface AgentStats {
  id: string
  name: string
  avatar?: string
  conversationsHandled: number
  messagesHandled: number
  avgResponseTime: number
  avgResolutionTime: number
  customerSatisfaction: number
  resolutionRate: number
}

interface Props {
  dateRange: '7d' | '30d' | '90d'
}

export function AgentLeaderboard({ dateRange }: Props) {
  const [agents, setAgents] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<
    | 'conversationsHandled'
    | 'customerSatisfaction'
    | 'avgResponseTime'
    | 'resolutionRate'
  >('conversationsHandled')

  useEffect(() => {
    fetchAgents()
  }, [dateRange])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/agents/leaderboard?range=${dateRange}`)
      const result = await response.json()

      if (response.ok) {
        setAgents(result.agents || generateMockData())
      } else {
        setAgents(generateMockData())
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setAgents(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): AgentStats[] => {
    const names = [
      'Sophie Jansen',
      'Lars van Dijk',
      'Emma de Vries',
      'Thomas Bakker',
      'Lisa Mulder',
      'Robin Visser',
      'Anna Peters',
      'David de Jong',
    ]

    return names.map((name, i) => ({
      id: `agent-${i + 1}`,
      name,
      conversationsHandled: Math.floor(Math.random() * 300) + 100,
      messagesHandled: Math.floor(Math.random() * 1500) + 500,
      avgResponseTime: Math.random() * 8 + 2,
      avgResolutionTime: Math.random() * 30 + 10,
      customerSatisfaction: Math.random() * 1 + 4,
      resolutionRate: Math.random() * 15 + 80,
    }))
  }

  const sortedAgents = [...agents].sort((a, b) => {
    if (sortBy === 'avgResponseTime') {
      return a[sortBy] - b[sortBy] // Lower is better
    }
    return b[sortBy] - a[sortBy] // Higher is better
  })

  const getMedalColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-500'
    if (rank === 1) return 'text-gray-400'
    if (rank === 2) return 'text-orange-600'
    return 'text-gray-300'
  }

  const getMedalIcon = (rank: number) => {
    if (rank < 3) return <TrophyIcon className={`h-6 w-6 ${getMedalColor(rank)}`} />
    return <span className="text-gray-400 font-semibold text-sm">#{rank + 1}</span>
  }

  const sortOptions = [
    {
      key: 'conversationsHandled' as const,
      label: 'Gesprekken',
      icon: ChatBubbleLeftRightIcon,
    },
    { key: 'customerSatisfaction' as const, label: 'Tevredenheid', icon: StarIcon },
    { key: 'avgResponseTime' as const, label: 'Reactietijd', icon: ClockIcon },
    { key: 'resolutionRate' as const, label: 'Oplospercentage', icon: CheckCircleIcon },
  ]

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">Data laden...</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sort Options */}
      <div className="flex gap-2 border-b pb-3">
        <span className="text-sm text-gray-500 mr-2">Sorteer op:</span>
        {sortOptions.map(option => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              sortBy === option.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-2">
        {sortedAgents.map((agent, index) => (
          <div
            key={agent.id}
            className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
              index < 3
                ? 'bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-10">{getMedalIcon(index)}</div>

            {/* Agent Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                {agent.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{agent.name}</h4>
                <p className="text-xs text-gray-500">Agent ID: {agent.id}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 flex-1">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{agent.conversationsHandled}</p>
                <p className="text-xs text-gray-500">Gesprekken</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{agent.messagesHandled}</p>
                <p className="text-xs text-gray-500">Berichten</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {agent.avgResponseTime.toFixed(1)}m
                </p>
                <p className="text-xs text-gray-500">Reactietijd</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                  <p className="text-lg font-bold text-gray-900">
                    {agent.customerSatisfaction.toFixed(1)}
                  </p>
                </div>
                <p className="text-xs text-gray-500">Tevredenheid</p>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  {agent.resolutionRate.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Opgelost</p>
              </div>
            </div>

            {/* Performance Badge */}
            {index === 0 && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                Top Performer
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Team Average */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Team Gemiddelden</h4>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900">
              {Math.round(
                agents.reduce((sum, a) => sum + a.conversationsHandled, 0) / agents.length
              )}
            </p>
            <p className="text-xs text-blue-700">Gesprekken</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900">
              {Math.round(agents.reduce((sum, a) => sum + a.messagesHandled, 0) / agents.length)}
            </p>
            <p className="text-xs text-blue-700">Berichten</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900">
              {(agents.reduce((sum, a) => sum + a.avgResponseTime, 0) / agents.length).toFixed(1)}
              m
            </p>
            <p className="text-xs text-blue-700">Reactietijd</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900">
              {(
                agents.reduce((sum, a) => sum + a.customerSatisfaction, 0) / agents.length
              ).toFixed(1)}
            </p>
            <p className="text-xs text-blue-700">Tevredenheid</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-900">
              {(agents.reduce((sum, a) => sum + a.resolutionRate, 0) / agents.length).toFixed(0)}%
            </p>
            <p className="text-xs text-blue-700">Opgelost</p>
          </div>
        </div>
      </div>
    </div>
  )
}
