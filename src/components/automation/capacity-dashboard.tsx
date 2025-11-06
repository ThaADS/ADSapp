'use client'

/**
 * Capacity Dashboard - Real-Time Agent Monitoring
 * Shows agent availability, workload, and performance metrics in real-time
 */

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface AgentCapacityData {
  agent_id: string
  agent_name: string
  agent_email: string
  status: 'available' | 'busy' | 'away' | 'offline'
  current_load: number
  max_load: number
  load_percentage: number
  skills: string[]
  languages: string[]
  avg_response_time: number
  satisfaction_score: number
  auto_assign_enabled: boolean
}

interface CapacityDashboardProps {
  organizationId: string
}

export default function CapacityDashboard({ organizationId }: CapacityDashboardProps) {
  const [agents, setAgents] = useState<AgentCapacityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load agent capacity data
  useEffect(() => {
    const loadAgentCapacity = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('agent_capacity')
          .select(
            `
            agent_id,
            current_active_conversations,
            max_concurrent_conversations,
            status,
            skills,
            languages,
            avg_response_time_seconds,
            customer_satisfaction_score,
            auto_assign_enabled,
            profiles!inner(id, full_name, email)
          `
          )
          .eq('organization_id', organizationId)
          .order('current_active_conversations', { ascending: false })

        if (error) {
          console.error('Failed to load agent capacity:', error)
          return
        }

        const agentsData: AgentCapacityData[] = (data || []).map((ac: any) => ({
          agent_id: ac.agent_id,
          agent_name: ac.profiles?.full_name || ac.profiles?.email || 'Unknown',
          agent_email: ac.profiles?.email || '',
          status: ac.status,
          current_load: ac.current_active_conversations,
          max_load: ac.max_concurrent_conversations,
          load_percentage:
            (ac.current_active_conversations / ac.max_concurrent_conversations) * 100,
          skills: Array.isArray(ac.skills) ? ac.skills : [],
          languages: Array.isArray(ac.languages) ? ac.languages : ['nl'],
          avg_response_time: ac.avg_response_time_seconds || 60,
          satisfaction_score: parseFloat(ac.customer_satisfaction_score) || 4.5,
          auto_assign_enabled: ac.auto_assign_enabled,
        }))

        setAgents(agentsData)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Error loading capacity:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAgentCapacity()

    // Real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('agent_capacity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_capacity',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          loadAgentCapacity()
        }
      )
      .subscribe()

    // Refresh every 30 seconds as fallback
    const interval = setInterval(loadAgentCapacity, 30000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [organizationId])

  // Calculate aggregate statistics
  const stats = {
    totalAgents: agents.length,
    availableAgents: agents.filter(a => a.status === 'available').length,
    busyAgents: agents.filter(a => a.status === 'busy').length,
    offlineAgents: agents.filter(a => a.status === 'offline').length,
    totalActiveConversations: agents.reduce((sum, a) => sum + a.current_load, 0),
    totalCapacity: agents.reduce((sum, a) => sum + a.max_load, 0),
    avgLoadPercentage:
      agents.length > 0 ? agents.reduce((sum, a) => sum + a.load_percentage, 0) / agents.length : 0,
    avgResponseTime:
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.avg_response_time, 0) / agents.length
        : 0,
    avgSatisfaction:
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.satisfaction_score, 0) / agents.length
        : 0,
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'away':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get load bar color
  const getLoadColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return (
    <div className='space-y-6'>
      {/* Header with refresh */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-gray-900'>Agent Capacity Monitor</h2>
          <p className='mt-1 text-sm text-gray-600'>
            Real-time agent availability and workload tracking
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <span className='text-sm text-gray-500'>
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setLastUpdate(new Date())}
            className='p-2 text-gray-400 transition-colors hover:text-gray-600'
            title='Refresh data'
          >
            <ArrowPathIcon className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-600'>Available Agents</span>
            <CheckCircleIcon className='h-5 w-5 text-green-500' />
          </div>
          <p className='text-2xl font-bold text-gray-900'>
            {stats.availableAgents} / {stats.totalAgents}
          </p>
          <p className='mt-1 text-xs text-gray-500'>{stats.offlineAgents} offline</p>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-600'>Active Conversations</span>
            <ChartBarIcon className='h-5 w-5 text-blue-500' />
          </div>
          <p className='text-2xl font-bold text-gray-900'>
            {stats.totalActiveConversations} / {stats.totalCapacity}
          </p>
          <p className='mt-1 text-xs text-gray-500'>
            {stats.avgLoadPercentage.toFixed(1)}% avg load
          </p>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-600'>Avg Response Time</span>
            <ClockIcon className='h-5 w-5 text-purple-500' />
          </div>
          <p className='text-2xl font-bold text-gray-900'>{Math.round(stats.avgResponseTime)}s</p>
          <p className='mt-1 text-xs text-gray-500'>Across all agents</p>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-600'>Satisfaction Score</span>
            <ArrowTrendingUpIcon className='h-5 w-5 text-amber-500' />
          </div>
          <p className='text-2xl font-bold text-gray-900'>
            {stats.avgSatisfaction.toFixed(2)} / 5.0
          </p>
          <p className='mt-1 text-xs text-gray-500'>Customer feedback</p>
        </div>
      </div>

      {/* Agent List */}
      {isLoading ? (
        <div className='rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
          <p className='mt-4 text-gray-500'>Loading agent capacity data...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className='rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm'>
          <XCircleIcon className='mx-auto mb-4 h-12 w-12 text-gray-400' />
          <p className='mb-2 text-gray-500'>No agents configured</p>
          <p className='text-sm text-gray-400'>Add agents to start tracking capacity</p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Agent
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Workload
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Skills
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Performance
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                  Auto-Assign
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white'>
              {agents.map(agent => (
                <tr key={agent.agent_id} className='transition-colors hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='h-10 w-10 flex-shrink-0'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                          <UserIcon className='h-6 w-6 text-blue-600' />
                        </div>
                      </div>
                      <div className='ml-4'>
                        <div className='text-sm font-medium text-gray-900'>{agent.agent_name}</div>
                        <div className='text-sm text-gray-500'>{agent.agent_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(agent.status)}`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='mr-2 text-sm text-gray-900'>
                        {agent.current_load} / {agent.max_load}
                      </div>
                      <div className='flex-1'>
                        <div className='h-2 w-24 rounded-full bg-gray-200'>
                          <div
                            className={`h-2 rounded-full ${getLoadColor(agent.load_percentage)}`}
                            style={{ width: `${Math.min(agent.load_percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className='ml-2 text-xs text-gray-500'>
                        {Math.round(agent.load_percentage)}%
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex flex-wrap gap-1'>
                      {agent.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className='inline-flex rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800'
                        >
                          {skill}
                        </span>
                      ))}
                      {agent.skills.length > 3 && (
                        <span className='inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600'>
                          +{agent.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-500'>
                    <div>⏱️ {Math.round(agent.avg_response_time)}s</div>
                    <div>⭐ {agent.satisfaction_score.toFixed(1)}/5.0</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {agent.auto_assign_enabled ? (
                      <CheckCircleIcon className='h-5 w-5 text-green-500' />
                    ) : (
                      <XCircleIcon className='h-5 w-5 text-gray-400' />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
