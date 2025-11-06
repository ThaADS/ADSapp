'use client'

/**
 * Escalation Rules Manager - SLA Monitoring & Escalation Policies
 * Allows configuration of automated escalation rules based on response time, priority, and agent availability
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface EscalationRule {
  id: string
  rule_name: string
  is_active: boolean
  priority: number
  sla_threshold_minutes: number
  escalation_target: 'manager' | 'team_lead' | 'senior_agent' | 'custom'
  notification_channels: ('email' | 'sms' | 'in_app' | 'webhook')[]
  conditions: {
    min_priority?: number
    required_tags?: string[]
    business_hours_only?: boolean
  }
  created_at: string
}

interface EscalationRulesProps {
  organizationId: string
}

export default function EscalationRules({ organizationId }: EscalationRulesProps) {
  const [rules, setRules] = useState<EscalationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRule, setNewRule] = useState<Partial<EscalationRule>>({
    rule_name: '',
    is_active: true,
    priority: 1,
    sla_threshold_minutes: 30,
    escalation_target: 'manager',
    notification_channels: ['email'],
    conditions: {},
  })

  useEffect(() => {
    loadRules()

    // Real-time subscription to escalation_rules table
    const supabase = createClient()
    const channel = supabase
      .channel('escalation_rules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escalation_rules',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          loadRules()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [organizationId])

  async function loadRules() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error loading escalation rules:', error)
      return
    }

    setRules(data || [])
    setLoading(false)
  }

  async function createRule() {
    if (!newRule.rule_name) {
      alert('Please enter a rule name')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('escalation_rules').insert({
      organization_id: organizationId,
      rule_name: newRule.rule_name,
      is_active: newRule.is_active,
      priority: newRule.priority,
      sla_threshold_minutes: newRule.sla_threshold_minutes,
      escalation_target: newRule.escalation_target,
      notification_channels: newRule.notification_channels,
      conditions: newRule.conditions,
    })

    if (error) {
      console.error('Error creating escalation rule:', error)
      alert('Failed to create escalation rule')
      return
    }

    setShowCreateForm(false)
    setNewRule({
      rule_name: '',
      is_active: true,
      priority: 1,
      sla_threshold_minutes: 30,
      escalation_target: 'manager',
      notification_channels: ['email'],
      conditions: {},
    })
  }

  async function toggleRuleStatus(ruleId: string, currentStatus: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('escalation_rules')
      .update({ is_active: !currentStatus })
      .eq('id', ruleId)

    if (error) {
      console.error('Error toggling rule status:', error)
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this escalation rule?')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('escalation_rules').delete().eq('id', ruleId)

    if (error) {
      console.error('Error deleting escalation rule:', error)
      alert('Failed to delete escalation rule')
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-12'>
        <div className='text-gray-500'>Loading escalation rules...</div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-medium text-gray-900'>Escalation Rules</h3>
          <p className='mt-1 text-sm text-gray-600'>
            Configure automatic escalation based on SLA thresholds and conversation priority
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className='inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
        >
          <PlusIcon className='mr-2 h-5 w-5' />
          New Rule
        </button>
      </div>

      {/* Create Rule Form */}
      {showCreateForm && (
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <h4 className='mb-4 text-base font-medium text-gray-900'>Create Escalation Rule</h4>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {/* Rule Name */}
            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-gray-700'>Rule Name</label>
              <input
                type='text'
                value={newRule.rule_name}
                onChange={e => setNewRule({ ...newRule, rule_name: e.target.value })}
                placeholder='e.g., VIP Customer 15-min SLA'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
            </div>

            {/* SLA Threshold */}
            <div>
              <label className='block text-sm font-medium text-gray-700'>
                <ClockIcon className='mr-1 inline h-4 w-4' />
                SLA Threshold (minutes)
              </label>
              <input
                type='number'
                value={newRule.sla_threshold_minutes}
                onChange={e =>
                  setNewRule({ ...newRule, sla_threshold_minutes: parseInt(e.target.value) || 30 })
                }
                min='1'
                max='1440'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
              <p className='mt-1 text-xs text-gray-500'>Escalate if no response within this time</p>
            </div>

            {/* Priority */}
            <div>
              <label className='block text-sm font-medium text-gray-700'>Rule Priority</label>
              <input
                type='number'
                value={newRule.priority}
                onChange={e => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 1 })}
                min='1'
                max='10'
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
              <p className='mt-1 text-xs text-gray-500'>Lower number = higher priority</p>
            </div>

            {/* Escalation Target */}
            <div>
              <label className='block text-sm font-medium text-gray-700'>Escalate To</label>
              <select
                value={newRule.escalation_target}
                onChange={e =>
                  setNewRule({
                    ...newRule,
                    escalation_target: e.target.value as EscalationRule['escalation_target'],
                  })
                }
                className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              >
                <option value='manager'>Manager</option>
                <option value='team_lead'>Team Lead</option>
                <option value='senior_agent'>Senior Agent</option>
                <option value='custom'>Custom Recipient</option>
              </select>
            </div>

            {/* Notification Channels */}
            <div>
              <label className='block text-sm font-medium text-gray-700'>
                <BellAlertIcon className='mr-1 inline h-4 w-4' />
                Notification Channels
              </label>
              <div className='mt-2 space-y-2'>
                {(['email', 'sms', 'in_app', 'webhook'] as const).map(channel => (
                  <label key={channel} className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={newRule.notification_channels?.includes(channel)}
                      onChange={e => {
                        const channels = newRule.notification_channels || []
                        if (e.target.checked) {
                          setNewRule({
                            ...newRule,
                            notification_channels: [...channels, channel],
                          })
                        } else {
                          setNewRule({
                            ...newRule,
                            notification_channels: channels.filter(c => c !== channel),
                          })
                        }
                      }}
                      className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm capitalize text-gray-700'>
                      {channel.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Active Toggle */}
            <div className='md:col-span-2'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={newRule.is_active}
                  onChange={e => setNewRule({ ...newRule, is_active: e.target.checked })}
                  className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='ml-2 text-sm text-gray-700'>Activate rule immediately</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className='mt-6 flex justify-end gap-3'>
            <button
              onClick={() => setShowCreateForm(false)}
              className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={createRule}
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
            >
              Create Rule
            </button>
          </div>
        </div>
      )}

      {/* Existing Rules List */}
      <div className='space-y-3'>
        {rules.length === 0 ? (
          <div className='rounded-lg border border-gray-200 bg-white p-12 text-center'>
            <ExclamationTriangleIcon className='mx-auto mb-4 h-16 w-16 text-gray-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>No Escalation Rules</h3>
            <p className='mb-4 text-sm text-gray-600'>
              Create your first escalation rule to automate SLA monitoring
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className='inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
            >
              <PlusIcon className='mr-2 h-5 w-5' />
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3'>
                    <h4 className='text-base font-medium text-gray-900'>{rule.rule_name}</h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.is_active ? (
                        <>
                          <CheckCircleIcon className='mr-1 h-3 w-3' />
                          Active
                        </>
                      ) : (
                        'Inactive'
                      )}
                    </span>
                    <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800'>
                      Priority {rule.priority}
                    </span>
                  </div>

                  <div className='mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3'>
                    <div className='flex items-center'>
                      <ClockIcon className='mr-2 h-4 w-4 text-gray-400' />
                      <span>SLA: {rule.sla_threshold_minutes} minutes</span>
                    </div>
                    <div className='flex items-center'>
                      <ExclamationTriangleIcon className='mr-2 h-4 w-4 text-gray-400' />
                      <span className='capitalize'>
                        Escalate to: {rule.escalation_target.replace('_', ' ')}
                      </span>
                    </div>
                    <div className='flex items-center'>
                      <BellAlertIcon className='mr-2 h-4 w-4 text-gray-400' />
                      <span>{rule.notification_channels.length} notification channels</span>
                    </div>
                  </div>

                  {rule.notification_channels.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {rule.notification_channels.map(channel => (
                        <span
                          key={channel}
                          className='inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700'
                        >
                          {channel.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className='ml-4 flex gap-2'>
                  <button
                    onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50'
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className='rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50'
                  >
                    <TrashIcon className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
        <h4 className='mb-2 flex items-center text-sm font-medium text-blue-900'>
          <ExclamationTriangleIcon className='mr-2 h-5 w-5' />
          How Escalation Rules Work
        </h4>
        <ul className='space-y-1 text-sm text-blue-800'>
          <li>• Rules are evaluated in priority order (lower number = higher priority)</li>
          <li>
            • When a conversation exceeds the SLA threshold, it&apos;s automatically escalated
          </li>
          <li>• Notifications are sent via all configured channels</li>
          <li>• Inactive rules are not evaluated</li>
          <li>• Real-time monitoring checks SLA every 60 seconds</li>
        </ul>
      </div>
    </div>
  )
}
