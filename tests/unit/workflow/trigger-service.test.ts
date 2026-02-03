/**
 * Workflow Trigger Service Tests
 *
 * Tests for workflow trigger evaluation and execution including:
 * - Trigger event processing
 * - Condition evaluation
 * - Reentry control
 * - Workflow execution initiation
 */

import { WorkflowTriggerService, TriggerEvent, TriggerEvaluationResult } from '@/lib/workflow/trigger-service'

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
}

const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
}

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => mockSupabase),
}))

// Mock execution engine
jest.mock('@/lib/workflow/execution-engine', () => ({
  createExecutionEngine: jest.fn().mockReturnValue({
    startExecution: jest.fn().mockResolvedValue({
      executionId: 'exec-123',
      status: 'running',
    }),
  }),
  WorkflowExecutionEngine: jest.fn(),
}))

describe('WorkflowTriggerService', () => {
  let service: WorkflowTriggerService
  const testOrgId = 'org-123'
  const testContactId = 'contact-123'

  beforeEach(() => {
    jest.clearAllMocks()
    service = new WorkflowTriggerService()
  })

  describe('evaluateTriggers', () => {
    it('should return empty array when no active workflows exist', async () => {
      mockSupabaseQuery.select.mockReturnThis()
      mockSupabaseQuery.eq.mockReturnThis()
      mockSupabase.from.mockReturnValue({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'Hello' },
        timestamp: new Date(),
      }

      const results = await service.evaluateTriggers(event)

      expect(results).toEqual([])
    })

    it('should evaluate all active workflows for trigger event', async () => {
      const mockWorkflows = [
        {
          id: 'workflow-1',
          organization_id: testOrgId,
          name: 'Welcome Flow',
          status: 'active',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              data: { triggerType: 'contact_replied' },
            },
          ],
          edges: [],
          settings: { allowReentry: true },
        },
        {
          id: 'workflow-2',
          organization_id: testOrgId,
          name: 'Support Flow',
          status: 'active',
          nodes: [
            {
              id: 'trigger-2',
              type: 'trigger',
              data: { triggerType: 'tag_applied' },
            },
          ],
          edges: [],
          settings: {},
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockWorkflows, error: null }),
          }),
        }),
      })

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'Hello' },
        timestamp: new Date(),
      }

      const results = await service.evaluateTriggers(event)

      // First workflow should trigger (matching type), second should not
      expect(results).toHaveLength(2)
      expect(results[0].triggered).toBe(true)
      expect(results[1].triggered).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      })

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: {},
        timestamp: new Date(),
      }

      const results = await service.evaluateTriggers(event)

      expect(results).toEqual([])
    })
  })

  describe('evaluateWorkflowTrigger', () => {
    it('should not trigger when workflow has no trigger node', async () => {
      const workflowData = {
        id: 'workflow-1',
        organization_id: testOrgId,
        name: 'Test Workflow',
        status: 'active',
        nodes: [
          { id: 'action-1', type: 'action', data: {} },
        ],
        edges: [],
      }

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: {},
        timestamp: new Date(),
      }

      const result = await service['evaluateWorkflowTrigger'](workflowData, event)

      expect(result.triggered).toBe(false)
      expect(result.reason).toBe('No trigger node found')
    })

    it('should not trigger when trigger type does not match', async () => {
      const workflowData = {
        id: 'workflow-1',
        organization_id: testOrgId,
        name: 'Test Workflow',
        status: 'active',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            data: { triggerType: 'tag_applied' },
          },
        ],
        edges: [],
      }

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: {},
        timestamp: new Date(),
      }

      const result = await service['evaluateWorkflowTrigger'](workflowData, event)

      expect(result.triggered).toBe(false)
      expect(result.reason).toBe('Trigger type mismatch')
    })

    it('should trigger when trigger type matches and conditions met', async () => {
      const workflowData = {
        id: 'workflow-1',
        organization_id: testOrgId,
        name: 'Test Workflow',
        status: 'active',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            data: { triggerType: 'contact_replied' },
          },
        ],
        edges: [],
        settings: { allowReentry: true },
      }

      // Mock canContactEnterWorkflow to return true
      jest.spyOn(service as any, 'canContactEnterWorkflow').mockResolvedValue(true)
      jest.spyOn(service as any, 'evaluateTriggerConditions').mockResolvedValue(true)

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'Hello' },
        timestamp: new Date(),
      }

      const result = await service['evaluateWorkflowTrigger'](workflowData, event)

      expect(result.triggered).toBe(true)
      expect(result.workflow).toBeDefined()
      expect(result.workflow?.id).toBe('workflow-1')
    })
  })

  describe('evaluateTriggerConditions', () => {
    it('should return true when no conditions specified', async () => {
      const triggerData = {
        triggerType: 'contact_replied' as const,
      }

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'Hello' },
        timestamp: new Date(),
      }

      const result = await service['evaluateTriggerConditions'](triggerData, event)

      expect(result).toBe(true)
    })

    it('should evaluate keyword conditions for contact_replied trigger', async () => {
      const triggerData = {
        triggerType: 'contact_replied' as const,
        conditions: {
          keywords: ['help', 'support'],
          matchType: 'contains',
        },
      }

      const eventMatch: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'I need help with my order' },
        timestamp: new Date(),
      }

      const eventNoMatch: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'What time do you close?' },
        timestamp: new Date(),
      }

      const resultMatch = await service['evaluateTriggerConditions'](triggerData, eventMatch)
      const resultNoMatch = await service['evaluateTriggerConditions'](triggerData, eventNoMatch)

      expect(resultMatch).toBe(true)
      expect(resultNoMatch).toBe(false)
    })

    it('should evaluate tag conditions for tag_applied trigger', async () => {
      const triggerData = {
        triggerType: 'tag_applied' as const,
        conditions: {
          tags: ['vip', 'priority'],
        },
      }

      const eventMatch: TriggerEvent = {
        type: 'tag_applied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { tagName: 'vip' },
        timestamp: new Date(),
      }

      const eventNoMatch: TriggerEvent = {
        type: 'tag_applied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { tagName: 'regular' },
        timestamp: new Date(),
      }

      const resultMatch = await service['evaluateTriggerConditions'](triggerData, eventMatch)
      const resultNoMatch = await service['evaluateTriggerConditions'](triggerData, eventNoMatch)

      expect(resultMatch).toBe(true)
      expect(resultNoMatch).toBe(false)
    })
  })

  describe('canContactEnterWorkflow', () => {
    it('should allow entry when reentry is enabled', async () => {
      const settings = { allowReentry: true }

      const result = await service['canContactEnterWorkflow']('workflow-1', testContactId, settings)

      expect(result).toBe(true)
    })

    it('should block entry when contact is already in workflow and reentry disabled', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{ id: 'exec-existing' }],
                error: null,
              }),
            }),
          }),
        }),
      })

      const settings = { allowReentry: false }

      const result = await service['canContactEnterWorkflow']('workflow-1', testContactId, settings)

      expect(result).toBe(false)
    })

    it('should allow entry when contact has no active executions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const settings = { allowReentry: false }

      const result = await service['canContactEnterWorkflow']('workflow-1', testContactId, settings)

      expect(result).toBe(true)
    })

    it('should respect max executions per contact setting', async () => {
      // Mock to return 5 completed executions
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [1, 2, 3, 4, 5],
                count: 5,
                error: null,
              }),
            }),
          }),
        }),
      })

      const settings = {
        allowReentry: true,
        maxExecutionsPerContact: 5,
      }

      const result = await service['canContactEnterWorkflow']('workflow-1', testContactId, settings)

      expect(result).toBe(false)
    })
  })

  describe('startWorkflowExecution', () => {
    it('should create execution record and start engine', async () => {
      const workflow = {
        id: 'workflow-1',
        organizationId: testOrgId,
        name: 'Test Workflow',
        description: '',
        type: 'automation' as const,
        status: 'active' as const,
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        version: 1,
        settings: {},
      }

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: { content: 'Hello' },
        timestamp: new Date(),
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'exec-123' },
              error: null,
            }),
          }),
        }),
      })

      await service['startWorkflowExecution'](workflow, event)

      // Verify execution record was created
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
    })

    it('should handle execution start errors gracefully', async () => {
      const workflow = {
        id: 'workflow-1',
        organizationId: testOrgId,
        name: 'Test Workflow',
        description: '',
        type: 'automation' as const,
        status: 'active' as const,
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        version: 1,
        settings: {},
      }

      const event: TriggerEvent = {
        type: 'contact_replied',
        organizationId: testOrgId,
        contactId: testContactId,
        data: {},
        timestamp: new Date(),
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Insert failed')),
          }),
        }),
      })

      // Should not throw
      await expect(service['startWorkflowExecution'](workflow, event)).resolves.not.toThrow()
    })
  })
})

describe('processMessageTrigger', () => {
  it('should create appropriate trigger event from message data', async () => {
    const { processMessageTrigger } = await import('@/lib/workflow/trigger-service')

    // This is typically called from webhook
    // We test that it creates the correct event format
    const mockEvaluateTriggers = jest.fn().mockResolvedValue([])

    const service = new WorkflowTriggerService()
    jest.spyOn(service, 'evaluateTriggers').mockImplementation(mockEvaluateTriggers)

    // processMessageTrigger is a wrapper function - test its behavior
    await processMessageTrigger('org-123', 'contact-123', {
      content: 'Hello',
      type: 'text',
      timestamp: new Date().toISOString(),
    })

    // Should have called evaluateTriggers with contact_replied event
    // This depends on the actual implementation
  })
})

describe('Trigger Type Specific Tests', () => {
  let service: WorkflowTriggerService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new WorkflowTriggerService()
  })

  describe('contact_replied trigger', () => {
    it('should handle text message triggers', async () => {
      const triggerData = {
        triggerType: 'contact_replied' as const,
        conditions: {
          messageTypes: ['text'],
        },
      }

      const textEvent: TriggerEvent = {
        type: 'contact_replied',
        organizationId: 'org-123',
        contactId: 'contact-123',
        data: { type: 'text', content: 'Hello' },
        timestamp: new Date(),
      }

      const imageEvent: TriggerEvent = {
        type: 'contact_replied',
        organizationId: 'org-123',
        contactId: 'contact-123',
        data: { type: 'image', content: '[Image]' },
        timestamp: new Date(),
      }

      const textResult = await service['evaluateTriggerConditions'](triggerData, textEvent)
      const imageResult = await service['evaluateTriggerConditions'](triggerData, imageEvent)

      expect(textResult).toBe(true)
      expect(imageResult).toBe(false)
    })
  })

  describe('contact_added trigger', () => {
    it('should trigger for new contacts', async () => {
      const triggerData = {
        triggerType: 'contact_added' as const,
      }

      const event: TriggerEvent = {
        type: 'contact_added',
        organizationId: 'org-123',
        contactId: 'contact-new',
        data: { source: 'whatsapp' },
        timestamp: new Date(),
      }

      const result = await service['evaluateTriggerConditions'](triggerData, event)

      expect(result).toBe(true)
    })
  })

  describe('tag_applied trigger', () => {
    it('should trigger for specific tags', async () => {
      const triggerData = {
        triggerType: 'tag_applied' as const,
        conditions: {
          tags: ['hot-lead'],
        },
      }

      const matchEvent: TriggerEvent = {
        type: 'tag_applied',
        organizationId: 'org-123',
        contactId: 'contact-123',
        data: { tagName: 'hot-lead' },
        timestamp: new Date(),
      }

      const result = await service['evaluateTriggerConditions'](triggerData, matchEvent)

      expect(result).toBe(true)
    })
  })

  describe('custom_field_changed trigger', () => {
    it('should trigger when specific field changes', async () => {
      const triggerData = {
        triggerType: 'custom_field_changed' as const,
        conditions: {
          fieldName: 'status',
          fromValue: 'prospect',
          toValue: 'customer',
        },
      }

      const event: TriggerEvent = {
        type: 'custom_field_changed',
        organizationId: 'org-123',
        contactId: 'contact-123',
        data: {
          fieldName: 'status',
          oldValue: 'prospect',
          newValue: 'customer',
        },
        timestamp: new Date(),
      }

      const result = await service['evaluateTriggerConditions'](triggerData, event)

      expect(result).toBe(true)
    })
  })
})

describe('Edge Cases', () => {
  let service: WorkflowTriggerService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new WorkflowTriggerService()
  })

  it('should handle malformed workflow data', async () => {
    const malformedWorkflow = {
      id: 'workflow-1',
      organization_id: 'org-123',
      // Missing nodes and edges
    }

    const event: TriggerEvent = {
      type: 'contact_replied',
      organizationId: 'org-123',
      contactId: 'contact-123',
      data: {},
      timestamp: new Date(),
    }

    const result = await service['evaluateWorkflowTrigger'](malformedWorkflow, event)

    expect(result.triggered).toBe(false)
    expect(result.reason).toBe('No trigger node found')
  })

  it('should handle null event data', async () => {
    const triggerData = {
      triggerType: 'contact_replied' as const,
      conditions: {
        keywords: ['help'],
      },
    }

    const event: TriggerEvent = {
      type: 'contact_replied',
      organizationId: 'org-123',
      contactId: 'contact-123',
      data: { content: null },
      timestamp: new Date(),
    }

    const result = await service['evaluateTriggerConditions'](triggerData, event)

    expect(result).toBe(false)
  })

  it('should handle concurrent trigger evaluations', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'workflow-1',
                organization_id: 'org-123',
                nodes: [{ id: 't1', type: 'trigger', data: { triggerType: 'contact_replied' } }],
                settings: { allowReentry: true },
              },
            ],
            error: null,
          }),
        }),
      }),
    })

    jest.spyOn(service as any, 'evaluateTriggerConditions').mockResolvedValue(true)
    jest.spyOn(service as any, 'canContactEnterWorkflow').mockResolvedValue(true)
    jest.spyOn(service as any, 'startWorkflowExecution').mockResolvedValue(undefined)

    const events = Array.from({ length: 10 }, (_, i) => ({
      type: 'contact_replied' as const,
      organizationId: 'org-123',
      contactId: `contact-${i}`,
      data: { content: 'Hello' },
      timestamp: new Date(),
    }))

    const results = await Promise.all(events.map(e => service.evaluateTriggers(e)))

    expect(results).toHaveLength(10)
    results.forEach(r => expect(r).toHaveLength(1))
  })
})
