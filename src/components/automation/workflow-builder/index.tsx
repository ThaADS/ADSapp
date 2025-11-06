'use client'

/**
 * Workflow Builder - Main Component
 * Integrates ReactFlow Canvas with workflow management and templates
 */

import React, { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  PlusIcon,
  Square3Stack3DIcon,
  PlayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import type { WorkflowDefinition } from './ReactFlowCanvas'

// Dynamic import to avoid SSR issues with ReactFlow
const ReactFlowCanvas = dynamic(() => import('./ReactFlowCanvas'), { ssr: false })

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  workflow: WorkflowDefinition
}

// Predefined workflow templates
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome-sequence',
    name: 'Welcome Message Sequence',
    description: 'Send a series of welcome messages to new contacts',
    category: 'onboarding',
    workflow: {
      name: 'Welcome Sequence',
      description: 'Automated welcome message flow',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: 'New Contact Added',
            config: { trigger_type: 'contact_created' },
          },
        },
        {
          id: 'delay-1',
          type: 'delay',
          position: { x: 250, y: 180 },
          data: {
            label: 'Wait 5 minutes',
            config: { delay_type: 'fixed', delay_minutes: 5 },
          },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 250, y: 310 },
          data: {
            label: 'Send Welcome Message',
            config: { action_type: 'send_message', message_template: 'Welcome to our service!' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1', type: 'smoothstep', animated: true },
        { id: 'e2', source: 'delay-1', target: 'action-1', type: 'smoothstep', animated: true },
      ],
      startNodeId: 'trigger-1',
    },
  },
  {
    id: 'auto-response',
    name: 'Auto Response System',
    description: 'Automatically respond to common questions',
    category: 'support',
    workflow: {
      name: 'Auto Response',
      description: 'Keyword-based automatic responses',
      nodes: [
        {
          id: 'trigger-2',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: 'Message Received',
            config: { trigger_type: 'message_received' },
          },
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 250, y: 180 },
          data: {
            label: 'Contains Keywords',
            config: { condition_type: 'keyword_match', keywords: ['price', 'cost', 'fee'] },
          },
        },
        {
          id: 'action-yes',
          type: 'action',
          position: { x: 100, y: 310 },
          data: {
            label: 'Send Pricing Info',
            config: {
              action_type: 'send_message',
              message_template: 'Our pricing starts at €99/month',
            },
          },
        },
        {
          id: 'action-no',
          type: 'action',
          position: { x: 400, y: 310 },
          data: {
            label: 'Forward to Agent',
            config: { action_type: 'assign_agent' },
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger-2',
          target: 'condition-1',
          type: 'smoothstep',
          animated: true,
        },
        {
          id: 'e2',
          source: 'condition-1',
          sourceHandle: 'true',
          target: 'action-yes',
          type: 'smoothstep',
          animated: true,
          label: 'True',
        },
        {
          id: 'e3',
          source: 'condition-1',
          sourceHandle: 'false',
          target: 'action-no',
          type: 'smoothstep',
          animated: true,
          label: 'False',
        },
      ],
      startNodeId: 'trigger-2',
    },
  },
  {
    id: 'escalation-flow',
    name: 'Escalation Flow',
    description: 'Escalate conversations based on priority and wait time',
    category: 'management',
    workflow: {
      name: 'Escalation Flow',
      description: 'Automatic escalation based on SLA',
      nodes: [
        {
          id: 'trigger-3',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: 'No Response in 30 min',
            config: { trigger_type: 'schedule' },
          },
        },
        {
          id: 'condition-2',
          type: 'condition',
          position: { x: 250, y: 180 },
          data: {
            label: 'Check Priority',
            config: { condition_type: 'field_comparison', field: 'priority' },
          },
        },
        {
          id: 'action-urgent',
          type: 'action',
          position: { x: 100, y: 310 },
          data: {
            label: 'Escalate to Manager',
            config: { action_type: 'assign_agent', agent_id: 'manager' },
          },
        },
        {
          id: 'action-normal',
          type: 'action',
          position: { x: 400, y: 310 },
          data: {
            label: 'Add to Queue',
            config: { action_type: 'set_priority', priority: 'high' },
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger-3',
          target: 'condition-2',
          type: 'smoothstep',
          animated: true,
        },
        {
          id: 'e2',
          source: 'condition-2',
          sourceHandle: 'true',
          target: 'action-urgent',
          type: 'smoothstep',
          animated: true,
        },
        {
          id: 'e3',
          source: 'condition-2',
          sourceHandle: 'false',
          target: 'action-normal',
          type: 'smoothstep',
          animated: true,
        },
      ],
      startNodeId: 'trigger-3',
    },
  },
]

interface WorkflowBuilderProps {
  organizationId: string
}

export default function WorkflowBuilder({ organizationId }: WorkflowBuilderProps) {
  const [view, setView] = useState<'list' | 'canvas'>('list')
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null)
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load workflows from API
  useEffect(() => {
    const loadWorkflows = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/automation/workflows?organization_id=${organizationId}`)
        if (response.ok) {
          const data = await response.json()
          setWorkflows(data.workflows || [])
        }
      } catch (error) {
        console.error('Failed to load workflows:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkflows()
  }, [organizationId])

  // Create new workflow
  const handleCreateNew = useCallback(() => {
    setSelectedWorkflow({
      name: 'New Workflow',
      description: '',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: 'New Message Received',
            config: { trigger_type: 'message_received' },
          },
        },
      ],
      edges: [],
      startNodeId: 'trigger-1',
    })
    setView('canvas')
  }, [])

  // Load template
  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    setSelectedWorkflow(template.workflow)
    setView('canvas')
  }, [])

  // Save workflow
  const handleSave = useCallback(
    async (workflow: WorkflowDefinition) => {
      try {
        const method = workflow.id ? 'PUT' : 'POST'
        const endpoint = workflow.id
          ? `/api/automation/workflows/${workflow.id}`
          : '/api/automation/workflows'

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...workflow,
            organization_id: organizationId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save workflow')
        }

        const data = await response.json()

        // Update local state
        setWorkflows(prev => {
          if (workflow.id) {
            return prev.map(w => (w.id === workflow.id ? data.workflow : w))
          } else {
            return [...prev, data.workflow]
          }
        })

        // Show success message
        alert('Workflow saved successfully!')
        setView('list')
      } catch (error) {
        console.error('Save error:', error)
        alert('Failed to save workflow. Please try again.')
      }
    },
    [organizationId]
  )

  // Test workflow
  const handleTest = useCallback(
    async (workflow: WorkflowDefinition) => {
      try {
        const response = await fetch(`/api/automation/workflows/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow,
            organization_id: organizationId,
          }),
        })

        if (!response.ok) {
          throw new Error('Workflow test failed')
        }

        const data = await response.json()
        alert(
          `Test completed!\n\nStatus: ${data.status}\nNodes executed: ${data.nodes_executed}\nExecution time: ${data.execution_time}ms`
        )
      } catch (error) {
        console.error('Test error:', error)
        alert('Failed to test workflow. Please check your configuration.')
      }
    },
    [organizationId]
  )

  // Canvas view
  if (view === 'canvas' && selectedWorkflow) {
    return (
      <div className='h-[calc(100vh-12rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='flex items-center justify-between border-b border-gray-200 p-4'>
          <button
            onClick={() => setView('list')}
            className='px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900'
          >
            ← Back to Workflows
          </button>
          <h2 className='text-lg font-semibold'>{selectedWorkflow.name}</h2>
          <div className='w-32' /> {/* Spacer for alignment */}
        </div>

        <ReactFlowCanvas
          initialWorkflow={selectedWorkflow}
          onSave={handleSave}
          onTest={handleTest}
        />
      </div>
    )
  }

  // List view
  return (
    <div className='space-y-6'>
      {/* Actions Bar */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <button
            onClick={handleCreateNew}
            className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
          >
            <PlusIcon className='h-5 w-5' />
            Create New Workflow
          </button>
        </div>
      </div>

      {/* Workflow Templates */}
      <div>
        <div className='mb-4 flex items-center gap-2'>
          <Square3Stack3DIcon className='h-5 w-5 text-gray-500' />
          <h3 className='text-lg font-semibold text-gray-900'>Templates</h3>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {WORKFLOW_TEMPLATES.map(template => (
            <div
              key={template.id}
              className='cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md'
              onClick={() => handleLoadTemplate(template)}
            >
              <div className='mb-2 flex items-start justify-between'>
                <h4 className='font-medium text-gray-900'>{template.name}</h4>
                <span className='rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
                  {template.category}
                </span>
              </div>
              <p className='mb-3 text-sm text-gray-600'>{template.description}</p>
              <div className='flex items-center gap-2 text-xs text-gray-500'>
                <DocumentDuplicateIcon className='h-4 w-4' />
                {template.workflow.nodes.length} nodes
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Workflows */}
      <div>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Your Workflows</h3>

        {isLoading ? (
          <div className='py-12 text-center text-gray-500'>Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center'>
            <p className='mb-4 text-gray-500'>No workflows yet</p>
            <button
              onClick={handleCreateNew}
              className='font-medium text-blue-600 hover:text-blue-700'
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {workflows.map(workflow => (
              <div
                key={workflow.id}
                className='rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md'
              >
                <div className='mb-2 flex items-start justify-between'>
                  <h4 className='font-medium text-gray-900'>{workflow.name}</h4>
                  <button
                    onClick={() => {
                      setSelectedWorkflow(workflow)
                      setView('canvas')
                    }}
                    className='p-1 text-gray-400 transition-colors hover:text-blue-600'
                  >
                    <PlayIcon className='h-5 w-5' />
                  </button>
                </div>
                {workflow.description && (
                  <p className='mb-3 text-sm text-gray-600'>{workflow.description}</p>
                )}
                <div className='flex items-center gap-2 text-xs text-gray-500'>
                  <DocumentDuplicateIcon className='h-4 w-4' />
                  {workflow.nodes?.length || 0} nodes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
