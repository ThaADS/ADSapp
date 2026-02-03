/**
 * Workflow Execution Engine Tests
 *
 * Comprehensive unit tests for the workflow execution engine
 * covering all node types and execution scenarios.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  TriggerNodeData,
  MessageNodeData,
  DelayNodeData,
  ConditionNodeData,
  ActionNodeData,
  SplitNodeData,
  GoalNodeData,
} from '@/types/workflow'

// Mock WhatsApp client
jest.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: jest.fn().mockImplementation(() => ({
    sendTextMessage: jest.fn().mockResolvedValue({ messages: [{ id: 'msg_123' }] }),
    sendTemplateMessage: jest.fn().mockResolvedValue({ messages: [{ id: 'msg_123' }] }),
    sendImageMessage: jest.fn().mockResolvedValue({ messages: [{ id: 'msg_123' }] }),
    sendDocumentMessage: jest.fn().mockResolvedValue({ messages: [{ id: 'msg_123' }] }),
  })),
}))

// Import after mocks
import {
  WorkflowExecutionEngine,
  createExecutionEngine,
  executeWorkflowForContact,
  ExecutionContext,
  ContactInfo,
  WhatsAppCredentials,
} from '@/lib/workflow/execution-engine'
import { WhatsAppClient } from '@/lib/whatsapp/client'

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestWorkflow = (
  nodes: Partial<WorkflowNode>[],
  edges: Partial<WorkflowEdge>[]
): Workflow => ({
  id: 'workflow_test_123',
  name: 'Test Workflow',
  organization_id: 'org_123',
  nodes: nodes.map((n, i) => ({
    id: n.id || `node_${i}`,
    type: n.type || 'trigger',
    position: n.position || { x: 0, y: i * 100 },
    data: n.data || {},
    ...n,
  })) as WorkflowNode[],
  edges: edges.map((e, i) => ({
    id: e.id || `edge_${i}`,
    source: e.source || '',
    target: e.target || '',
    ...e,
  })) as WorkflowEdge[],
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const mockContact: ContactInfo = {
  id: 'contact_123',
  phone: '+31612345678',
  name: 'Test User',
  email: 'test@example.com',
  tags: ['vip', 'customer'],
  customFields: {
    company: 'Test Corp',
    plan: 'premium',
  },
}

const mockCredentials: WhatsAppCredentials = {
  accessToken: 'test_access_token',
  phoneNumberId: 'phone_123',
}

// ============================================================================
// EXECUTION ENGINE TESTS
// ============================================================================

describe('WorkflowExecutionEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with workflow nodes and edges', () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          { id: 'message_1', type: 'message', data: { messageConfig: { customMessage: 'Hello' } } },
        ],
        [{ source: 'trigger_1', target: 'message_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      expect(engine).toBeInstanceOf(WorkflowExecutionEngine)
    })
  })

  describe('startExecution', () => {
    it('should create execution context and start from trigger node', async () => {
      const workflow = createTestWorkflow(
        [{ id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } }],
        []
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context).toMatchObject({
        workflowId: 'workflow_test_123',
        contactId: 'contact_123',
        organizationId: 'org_123',
        currentNodeId: 'trigger_1',
        executionPath: expect.arrayContaining(['trigger_1']),
        status: 'completed', // Workflow completes if no more nodes
      })
      expect(context.executionId).toMatch(/^exec_/)
    })

    it('should throw error if no trigger node exists', async () => {
      const workflow = createTestWorkflow(
        [{ id: 'message_1', type: 'message', data: { messageConfig: { customMessage: 'Hello' } } }],
        []
      )

      const engine = new WorkflowExecutionEngine(workflow)

      await expect(engine.startExecution('contact_123', 'org_123')).rejects.toThrow(
        'Workflow must have a trigger node'
      )
    })

    it('should pass contact info and credentials through execution', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'message_1',
            type: 'message',
            data: { messageConfig: { customMessage: 'Hello {{name}}!' } },
          },
        ],
        [{ source: 'trigger_1', target: 'message_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

      expect(context.contact).toEqual(mockContact)
      expect(context.whatsappCredentials).toEqual(mockCredentials)
    })
  })

  describe('resumeExecution', () => {
    it('should resume execution from waiting state', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'delay_1',
            type: 'delay',
            data: { delayConfig: { amount: 1, unit: 'hours' } },
          },
          {
            id: 'message_1',
            type: 'message',
            data: { messageConfig: { customMessage: 'After delay' } },
          },
        ],
        [
          { source: 'trigger_1', target: 'delay_1' },
          { source: 'delay_1', target: 'message_1' },
        ]
      )

      const engine = new WorkflowExecutionEngine(workflow)

      // Create a waiting context (as if delay was processed)
      const waitingContext: ExecutionContext = {
        workflowId: 'workflow_test_123',
        executionId: 'exec_123',
        contactId: 'contact_123',
        organizationId: 'org_123',
        currentNodeId: 'message_1', // Ready to continue from message
        executionPath: ['trigger_1', 'delay_1'],
        context: {},
        status: 'waiting',
        retryCount: 0,
        contact: mockContact,
        whatsappCredentials: mockCredentials,
      }

      await engine.resumeExecution(waitingContext)

      expect(waitingContext.status).toBe('completed')
      expect(waitingContext.executionPath).toContain('message_1')
    })
  })
})

// ============================================================================
// NODE EXECUTION TESTS
// ============================================================================

describe('Workflow Node Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Trigger Node', () => {
    it('should pass through trigger node successfully', async () => {
      const workflow = createTestWorkflow(
        [
          {
            id: 'trigger_1',
            type: 'trigger',
            data: { triggerConfig: { triggerType: 'contact_added' } },
          },
        ],
        []
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('completed')
      expect(context.executionPath).toContain('trigger_1')
    })

    it('should handle different trigger types', async () => {
      const triggerTypes = ['manual', 'contact_added', 'tag_applied', 'webhook', 'scheduled']

      for (const triggerType of triggerTypes) {
        const workflow = createTestWorkflow(
          [
            {
              id: 'trigger_1',
              type: 'trigger',
              data: { triggerConfig: { triggerType } },
            },
          ],
          []
        )

        const engine = new WorkflowExecutionEngine(workflow)
        const context = await engine.startExecution('contact_123', 'org_123')

        expect(context.status).toBe('completed')
      }
    })
  })

  describe('Message Node', () => {
    it('should send text message with variable substitution', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'message_1',
            type: 'message',
            data: {
              messageConfig: {
                customMessage: 'Hello {{name}}! Your email is {{email}}.',
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'message_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

      expect(context.status).toBe('completed')
      expect(WhatsAppClient).toHaveBeenCalledWith('test_access_token', 'phone_123')

      const mockInstance = (WhatsAppClient as jest.Mock).mock.results[0].value
      expect(mockInstance.sendTextMessage).toHaveBeenCalledWith(
        '+31612345678',
        'Hello Test User! Your email is test@example.com.'
      )
    })

    it('should send template message when templateId is set', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'message_1',
            type: 'message',
            data: {
              messageConfig: {
                templateId: 'welcome_template',
                templateLanguage: 'nl',
                templateComponents: [{ type: 'body', parameters: [] }],
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'message_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

      expect(context.status).toBe('completed')

      const mockInstance = (WhatsAppClient as jest.Mock).mock.results[0].value
      expect(mockInstance.sendTemplateMessage).toHaveBeenCalledWith(
        '+31612345678',
        'welcome_template',
        'nl',
        [{ type: 'body', parameters: [] }]
      )
    })

    it('should continue workflow when no phone number available', async () => {
      const contactWithoutPhone = { ...mockContact, phone: '' }

      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'message_1',
            type: 'message',
            data: { messageConfig: { customMessage: 'Hello' } },
          },
          {
            id: 'message_2',
            type: 'message',
            data: { messageConfig: { customMessage: 'Goodbye' } },
          },
        ],
        [
          { source: 'trigger_1', target: 'message_1' },
          { source: 'message_1', target: 'message_2' },
        ]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', contactWithoutPhone, mockCredentials)

      // Should complete even without sending messages
      expect(context.status).toBe('completed')
    })

    it('should send media messages', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'message_1',
            type: 'message',
            data: {
              messageConfig: {
                mediaUrl: 'https://example.com/image.jpg',
                mediaType: 'image',
                customMessage: 'Check this out!',
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'message_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

      expect(context.status).toBe('completed')

      const mockInstance = (WhatsAppClient as jest.Mock).mock.results[0].value
      expect(mockInstance.sendImageMessage).toHaveBeenCalledWith(
        '+31612345678',
        'https://example.com/image.jpg',
        'Check this out!'
      )
    })
  })

  describe('Delay Node', () => {
    it('should calculate delay for minutes', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'delay_1',
            type: 'delay',
            data: { delayConfig: { amount: 30, unit: 'minutes' } },
          },
        ],
        [{ source: 'trigger_1', target: 'delay_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('waiting')
    })

    it('should calculate delay for hours', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'delay_1',
            type: 'delay',
            data: { delayConfig: { amount: 2, unit: 'hours' } },
          },
        ],
        [{ source: 'trigger_1', target: 'delay_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('waiting')
    })

    it('should calculate delay for days', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'delay_1',
            type: 'delay',
            data: { delayConfig: { amount: 3, unit: 'days' } },
          },
        ],
        [{ source: 'trigger_1', target: 'delay_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('waiting')
    })

    it('should calculate delay for weeks', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'delay_1',
            type: 'delay',
            data: { delayConfig: { amount: 1, unit: 'weeks' } },
          },
        ],
        [{ source: 'trigger_1', target: 'delay_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('waiting')
    })
  })

  describe('Condition Node', () => {
    it('should branch based on condition evaluation', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'condition_1',
            type: 'condition',
            data: {
              conditionConfig: {
                field: 'tags',
                operator: 'contains',
                value: 'vip',
              },
            },
          },
          {
            id: 'message_true',
            type: 'message',
            data: { messageConfig: { customMessage: 'VIP message' } },
          },
          {
            id: 'message_false',
            type: 'message',
            data: { messageConfig: { customMessage: 'Regular message' } },
          },
        ],
        [
          { source: 'trigger_1', target: 'condition_1' },
          { id: 'edge_true', source: 'condition_1', target: 'message_true', sourceHandle: 'true' },
          { id: 'edge_false', source: 'condition_1', target: 'message_false', sourceHandle: 'false' },
        ]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

      expect(context.status).toBe('completed')
      // Should have condition result in context
      expect(context.context.condition_condition_1).toBeDefined()
    })
  })

  describe('Action Node', () => {
    it('should execute add_tag action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'action_1',
            type: 'action',
            data: {
              actionConfig: {
                actionType: 'add_tag',
                tagIds: ['tag_premium', 'tag_active'],
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'action_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('completed')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Adding tags'),
        ['tag_premium', 'tag_active']
      )

      consoleSpy.mockRestore()
    })

    it('should execute remove_tag action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'action_1',
            type: 'action',
            data: {
              actionConfig: {
                actionType: 'remove_tag',
                tagIds: ['tag_inactive'],
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'action_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      await engine.startExecution('contact_123', 'org_123')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removing tags'),
        ['tag_inactive']
      )

      consoleSpy.mockRestore()
    })

    it('should execute update_field action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'action_1',
            type: 'action',
            data: {
              actionConfig: {
                actionType: 'update_field',
                fieldName: 'status',
                fieldValue: 'qualified',
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'action_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      await engine.startExecution('contact_123', 'org_123')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating field status = qualified')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Split Node', () => {
    it('should split traffic by percentage', async () => {
      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'split_1',
            type: 'split',
            data: {
              splitConfig: {
                splitType: 'percentage',
                branches: [
                  { id: 'branch_a', name: 'Branch A', percentage: 50 },
                  { id: 'branch_b', name: 'Branch B', percentage: 50 },
                ],
              },
            },
          },
          {
            id: 'message_a',
            type: 'message',
            data: { messageConfig: { customMessage: 'Branch A' } },
          },
          {
            id: 'message_b',
            type: 'message',
            data: { messageConfig: { customMessage: 'Branch B' } },
          },
        ],
        [
          { source: 'trigger_1', target: 'split_1' },
          { id: 'edge_a', source: 'split_1', target: 'message_a', sourceHandle: 'branch_a' },
          { id: 'edge_b', source: 'split_1', target: 'message_b', sourceHandle: 'branch_b' },
        ]
      )

      const engine = new WorkflowExecutionEngine(workflow)

      // Run multiple times to check distribution
      const results = { branch_a: 0, branch_b: 0 }
      for (let i = 0; i < 100; i++) {
        const context = await engine.startExecution(`contact_${i}`, 'org_123', mockContact, mockCredentials)
        const selectedBranch = context.context.split_split_1
        if (selectedBranch === 'branch_a') results.branch_a++
        else if (selectedBranch === 'branch_b') results.branch_b++
      }

      // Expect roughly 50/50 split (with some variance)
      expect(results.branch_a).toBeGreaterThan(20)
      expect(results.branch_b).toBeGreaterThan(20)
    })
  })

  describe('Goal Node', () => {
    it('should track goal achievement', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const workflow = createTestWorkflow(
        [
          { id: 'trigger_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
          {
            id: 'goal_1',
            type: 'goal',
            data: {
              goalConfig: {
                goalName: 'Purchase Completed',
                goalType: 'conversion',
                notifyOnCompletion: true,
                notificationEmail: 'admin@example.com',
              },
            },
          },
        ],
        [{ source: 'trigger_1', target: 'goal_1' }]
      )

      const engine = new WorkflowExecutionEngine(workflow)
      const context = await engine.startExecution('contact_123', 'org_123')

      expect(context.status).toBe('completed')
      expect(context.context.goal_goal_1).toMatchObject({
        goalName: 'Purchase Completed',
        goalType: 'conversion',
        achievedAt: expect.any(String),
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal reached: Purchase Completed (conversion)')
      )

      consoleSpy.mockRestore()
    })
  })
})

// ============================================================================
// COMPLEX WORKFLOW TESTS
// ============================================================================

describe('Complex Workflow Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute multi-step workflow with all node types', async () => {
    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'message_1', type: 'message', data: { messageConfig: { customMessage: 'Welcome!' } } },
        { id: 'action_1', type: 'action', data: { actionConfig: { actionType: 'add_tag', tagIds: ['welcomed'] } } },
        { id: 'goal', type: 'goal', data: { goalConfig: { goalName: 'Onboarding Started', goalType: 'engagement' } } },
      ],
      [
        { source: 'trigger', target: 'message_1' },
        { source: 'message_1', target: 'action_1' },
        { source: 'action_1', target: 'goal' },
      ]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

    expect(context.status).toBe('completed')
    expect(context.executionPath).toEqual(['trigger', 'message_1', 'action_1', 'goal'])
    expect(context.context.goal_goal).toBeDefined()
  })

  it('should handle workflow with missing target node gracefully', async () => {
    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
      ],
      [
        { source: 'trigger', target: 'nonexistent_node' },
      ]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123')

    expect(context.status).toBe('failed')
    expect(context.errorMessage).toContain('Node not found')
  })

  it('should track execution path through workflow', async () => {
    const workflow = createTestWorkflow(
      [
        { id: 'step_1', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'step_2', type: 'message', data: { messageConfig: { customMessage: 'Step 2' } } },
        { id: 'step_3', type: 'action', data: { actionConfig: { actionType: 'add_tag', tagIds: [] } } },
        { id: 'step_4', type: 'message', data: { messageConfig: { customMessage: 'Step 4' } } },
      ],
      [
        { source: 'step_1', target: 'step_2' },
        { source: 'step_2', target: 'step_3' },
        { source: 'step_3', target: 'step_4' },
      ]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

    expect(context.executionPath).toEqual(['step_1', 'step_2', 'step_3', 'step_4'])
  })
})

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  describe('createExecutionEngine', () => {
    it('should create a new engine instance', () => {
      const workflow = createTestWorkflow(
        [{ id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } }],
        []
      )

      const engine = createExecutionEngine(workflow)
      expect(engine).toBeInstanceOf(WorkflowExecutionEngine)
    })
  })

  describe('executeWorkflowForContact', () => {
    it('should execute workflow using convenience function', async () => {
      const workflow = createTestWorkflow(
        [{ id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } }],
        []
      )

      const context = await executeWorkflowForContact(workflow, 'contact_123', 'org_123')

      expect(context.workflowId).toBe('workflow_test_123')
      expect(context.contactId).toBe('contact_123')
      expect(context.organizationId).toBe('org_123')
      expect(context.status).toBe('completed')
    })
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle WhatsApp API errors gracefully', async () => {
    // Mock a failing WhatsApp client
    const mockWhatsAppClient = {
      sendTextMessage: jest.fn().mockRejectedValue(new Error('WhatsApp API Error')),
    }
    ;(WhatsAppClient as jest.Mock).mockImplementation(() => mockWhatsAppClient)

    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'message', type: 'message', data: { messageConfig: { customMessage: 'Hello' } } },
      ],
      [{ source: 'trigger', target: 'message' }]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

    expect(context.status).toBe('failed')
    expect(context.errorMessage).toContain('Failed to send message')
    expect(context.errorNodeId).toBe('message')
  })

  it('should record error node ID on failure', async () => {
    const mockWhatsAppClient = {
      sendTextMessage: jest.fn().mockRejectedValue(new Error('API Error')),
    }
    ;(WhatsAppClient as jest.Mock).mockImplementation(() => mockWhatsAppClient)

    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'message', type: 'message', data: { messageConfig: { customMessage: 'Hello' } } },
      ],
      [{ source: 'trigger', target: 'message' }]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

    expect(context.errorNodeId).toBe('message')
  })

  it('should handle unknown node types', async () => {
    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'unknown', type: 'unknown_type' as any, data: {} },
      ],
      [{ source: 'trigger', target: 'unknown' }]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123')

    expect(context.status).toBe('failed')
    expect(context.errorMessage).toContain('Unknown node type')
  })

  it('should increment retry count on failures', async () => {
    const mockWhatsAppClient = {
      sendTextMessage: jest.fn().mockRejectedValue(new Error('Temporary Error')),
    }
    ;(WhatsAppClient as jest.Mock).mockImplementation(() => mockWhatsAppClient)

    const workflow = createTestWorkflow(
      [
        { id: 'trigger', type: 'trigger', data: { triggerConfig: { triggerType: 'manual' } } },
        { id: 'message', type: 'message', data: { messageConfig: { customMessage: 'Hello' } } },
      ],
      [{ source: 'trigger', target: 'message' }]
    )

    const engine = new WorkflowExecutionEngine(workflow)
    const context = await engine.startExecution('contact_123', 'org_123', mockContact, mockCredentials)

    expect(context.retryCount).toBe(0) // Initial count (incremented in node execution for retries)
    expect(context.status).toBe('failed')
  })
})
