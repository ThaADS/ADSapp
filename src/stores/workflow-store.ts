/**
 * Workflow Store - Zustand State Management
 *
 * Manages workflow builder state including nodes, edges, validation,
 * and persistence operations.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type {
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowNodeData,
  WorkflowValidationResult,
  NodeValidationRules,
  WorkflowViewport,
} from '@/types/workflow';

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface WorkflowState {
  // Core workflow data
  workflow: Workflow | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: WorkflowViewport;

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isValidating: boolean;
  isSaving: boolean;
  isDirty: boolean;  // Has unsaved changes

  // Validation
  validationResult: WorkflowValidationResult | null;

  // History for undo/redo
  history: Array<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }>;
  historyIndex: number;

  // Actions - Workflow
  setWorkflow: (workflow: Workflow) => void;
  createWorkflow: (name: string, type: Workflow['type']) => void;
  clearWorkflow: () => void;

  // Actions - Nodes
  onNodesChange: OnNodesChange;
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Actions - Edges
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  deleteEdge: (edgeId: string) => void;

  // Actions - Selection
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // Actions - Viewport
  setViewport: (viewport: WorkflowViewport) => void;

  // Actions - Validation
  validateWorkflow: () => WorkflowValidationResult;

  // Actions - Persistence
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  exportWorkflow: () => string;
  importWorkflow: (data: string) => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addToHistory: () => void;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const NODE_VALIDATION_RULES: Record<WorkflowNodeType, NodeValidationRules> = {
  trigger: {
    requiresIncoming: false,
    requiresOutgoing: true,
    maxIncoming: 0,
    maxOutgoing: 1,
    requiredFields: ['triggerType'],
  },
  message: {
    requiresIncoming: true,
    requiresOutgoing: false,
    maxIncoming: 10,
    maxOutgoing: 10,
    requiredFields: ['messageConfig'],
  },
  delay: {
    requiresIncoming: true,
    requiresOutgoing: true,
    maxIncoming: 10,
    maxOutgoing: 1,
    requiredFields: ['delayConfig.amount', 'delayConfig.unit'],
  },
  condition: {
    requiresIncoming: true,
    requiresOutgoing: true,
    maxIncoming: 10,
    maxOutgoing: 2,  // True and False branches
    requiredFields: ['conditionConfig'],
  },
  action: {
    requiresIncoming: true,
    requiresOutgoing: false,
    maxIncoming: 10,
    maxOutgoing: 10,
    requiredFields: ['actionConfig.actionType'],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique node ID
 */
const generateNodeId = (type: WorkflowNodeType): string => {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique edge ID
 */
const generateEdgeId = (source: string, target: string): string => {
  return `edge_${source}_${target}_${Date.now()}`;
};

/**
 * Create default node data based on type
 */
const createDefaultNodeData = (type: WorkflowNodeType): WorkflowNodeData => {
  const baseData = {
    label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: '',
    isValid: false,
  };

  switch (type) {
    case 'trigger':
      return {
        ...baseData,
        label: 'Campaign Trigger',
        triggerType: 'contact_added',
        triggerConfig: {},
      };
    case 'message':
      return {
        ...baseData,
        label: 'Send Message',
        messageConfig: {
          customMessage: '',
          useContactName: true,
        },
      };
    case 'delay':
      return {
        ...baseData,
        label: 'Wait',
        delayConfig: {
          amount: 1,
          unit: 'days',
        },
      };
    case 'condition':
      return {
        ...baseData,
        label: 'Condition',
        conditionConfig: {
          field: 'tag',
          operator: 'equals',
          value: '',
        },
      };
    case 'action':
      return {
        ...baseData,
        label: 'Action',
        actionConfig: {
          actionType: 'add_tag',
        },
      };
    case 'wait_until':
      return {
        ...baseData,
        label: 'Wait Until',
        waitUntilConfig: {
          eventType: 'tag_applied',
          timeoutEnabled: false,
        },
      };
    case 'split':
      return {
        ...baseData,
        label: 'A/B Split',
        splitConfig: {
          splitType: 'percentage',
          branches: [
            { id: 'branch_a', label: 'Branch A', percentage: 50 },
            { id: 'branch_b', label: 'Branch B', percentage: 50 },
          ],
        },
      };
    case 'webhook':
      return {
        ...baseData,
        label: 'Webhook',
        webhookConfig: {
          url: '',
          method: 'POST',
          authType: 'none',
        },
      };
    case 'ai':
      return {
        ...baseData,
        label: 'AI Action',
        aiConfig: {
          action: 'sentiment_analysis',
          model: 'gpt-3.5-turbo',
        },
      };
    case 'goal':
      return {
        ...baseData,
        label: 'Goal',
        goalConfig: {
          goalType: 'conversion',
          goalName: '',
          trackInAnalytics: true,
        },
      };
    default:
      return baseData as any;
  }
};

/**
 * Validate individual node
 */
const validateNode = (
  node: WorkflowNode,
  edges: WorkflowEdge[],
  allNodes: WorkflowNode[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const rules = NODE_VALIDATION_RULES[node.type];

  if (!rules) {
    return { isValid: true, errors: [] };
  }

  // Check incoming edges
  const incomingEdges = edges.filter((e) => e.target === node.id);
  if (rules.requiresIncoming && incomingEdges.length === 0) {
    errors.push('Node must have at least one incoming connection');
  }
  if (rules.maxIncoming && incomingEdges.length > rules.maxIncoming) {
    errors.push(`Node cannot have more than ${rules.maxIncoming} incoming connections`);
  }

  // Check outgoing edges
  const outgoingEdges = edges.filter((e) => e.source === node.id);
  if (rules.requiresOutgoing && outgoingEdges.length === 0) {
    errors.push('Node must have at least one outgoing connection');
  }
  if (rules.maxOutgoing && outgoingEdges.length > rules.maxOutgoing) {
    errors.push(`Node cannot have more than ${rules.maxOutgoing} outgoing connections`);
  }

  // Check required fields
  if (rules.requiredFields) {
    rules.requiredFields.forEach((field) => {
      const fieldPath = field.split('.');
      let value: any = node.data;

      for (const key of fieldPath) {
        value = value?.[key];
      }

      if (value === undefined || value === null || value === '') {
        errors.push(`Required field missing: ${field}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        workflow: null,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        selectedNodeId: null,
        selectedEdgeId: null,
        isValidating: false,
        isSaving: false,
        isDirty: false,
        validationResult: null,
        history: [],
        historyIndex: -1,

        // ====================================================================
        // Workflow Actions
        // ====================================================================

        setWorkflow: (workflow) => {
          set({
            workflow,
            nodes: workflow.nodes,
            edges: workflow.edges,
            isDirty: false,
            history: [{ nodes: workflow.nodes, edges: workflow.edges }],
            historyIndex: 0,
          });
        },

        createWorkflow: (name, type) => {
          const newWorkflow: Workflow = {
            id: `workflow_${Date.now()}`,
            organizationId: '', // Will be set from context
            name,
            description: '',
            type,
            status: 'draft',
            nodes: [],
            edges: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '', // Will be set from context
            version: 1,
            settings: {
              allowReentry: false,
              stopOnError: true,
              trackConversions: false,
            },
          };

          set({
            workflow: newWorkflow,
            nodes: [],
            edges: [],
            isDirty: false,
            history: [{ nodes: [], edges: [] }],
            historyIndex: 0,
          });
        },

        clearWorkflow: () => {
          set({
            workflow: null,
            nodes: [],
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
            isDirty: false,
            validationResult: null,
            history: [],
            historyIndex: -1,
          });
        },

        // ====================================================================
        // Node Actions
        // ====================================================================

        onNodesChange: (changes: NodeChange[]) => {
          set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
            isDirty: true,
          }));
        },

        addNode: (type, position) => {
          const newNode: WorkflowNode = {
            id: generateNodeId(type),
            type,
            position,
            data: createDefaultNodeData(type),
          };

          set((state) => {
            const newNodes = [...state.nodes, newNode];
            return {
              nodes: newNodes,
              isDirty: true,
              selectedNodeId: newNode.id,
            };
          });

          // Add to history after state update
          get().addToHistory();
        },

        updateNode: (nodeId, data) => {
          set((state) => ({
            nodes: state.nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node
            ),
            isDirty: true,
          }));

          get().addToHistory();
        },

        deleteNode: (nodeId) => {
          set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
              (edge) => edge.source !== nodeId && edge.target !== nodeId
            ),
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            isDirty: true,
          }));

          get().addToHistory();
        },

        duplicateNode: (nodeId) => {
          const node = get().nodes.find((n) => n.id === nodeId);
          if (!node) return;

          const newNode: WorkflowNode = {
            ...node,
            id: generateNodeId(node.type),
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
            data: {
              ...node.data,
              label: `${node.data.label} (Copy)`,
            },
          };

          set((state) => ({
            nodes: [...state.nodes, newNode],
            isDirty: true,
            selectedNodeId: newNode.id,
          }));

          get().addToHistory();
        },

        // ====================================================================
        // Edge Actions
        // ====================================================================

        onEdgesChange: (changes: EdgeChange[]) => {
          set((state) => ({
            edges: applyEdgeChanges(changes, state.edges) as WorkflowEdge[],
            isDirty: true,
          }));
        },

        onConnect: (connection: Connection) => {
          const newEdge: WorkflowEdge = {
            id: generateEdgeId(connection.source!, connection.target!),
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle || undefined,
            targetHandle: connection.targetHandle || undefined,
            type: 'smoothstep',
            animated: false,
          };

          set((state) => ({
            edges: addEdge(newEdge, state.edges) as WorkflowEdge[],
            isDirty: true,
          }));

          get().addToHistory();
        },

        deleteEdge: (edgeId) => {
          set((state) => ({
            edges: state.edges.filter((edge) => edge.id !== edgeId),
            selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
            isDirty: true,
          }));

          get().addToHistory();
        },

        // ====================================================================
        // Selection Actions
        // ====================================================================

        setSelectedNode: (nodeId) => {
          set({ selectedNodeId: nodeId, selectedEdgeId: null });
        },

        setSelectedEdge: (edgeId) => {
          set({ selectedEdgeId: edgeId, selectedNodeId: null });
        },

        clearSelection: () => {
          set({ selectedNodeId: null, selectedEdgeId: null });
        },

        // ====================================================================
        // Viewport Actions
        // ====================================================================

        setViewport: (viewport) => {
          set({ viewport });
        },

        // ====================================================================
        // Validation
        // ====================================================================

        validateWorkflow: () => {
          const { nodes, edges } = get();
          const errors: WorkflowValidationResult['errors'] = [];

          // Check for trigger node
          const triggerNodes = nodes.filter((n) => n.type === 'trigger');
          if (triggerNodes.length === 0) {
            errors.push({
              message: 'Workflow must have at least one trigger node',
              severity: 'error',
            });
          } else if (triggerNodes.length > 1) {
            errors.push({
              message: 'Workflow can only have one trigger node',
              severity: 'error',
            });
          }

          // Validate each node
          nodes.forEach((node) => {
            const validation = validateNode(node, edges, nodes);
            if (!validation.isValid) {
              validation.errors.forEach((error) => {
                errors.push({
                  nodeId: node.id,
                  message: error,
                  severity: 'error',
                });
              });
            }
          });

          // Check for orphaned nodes (nodes with no connections)
          nodes.forEach((node) => {
            if (node.type !== 'trigger') {
              const hasIncoming = edges.some((e) => e.target === node.id);
              if (!hasIncoming) {
                errors.push({
                  nodeId: node.id,
                  message: 'Node is not connected to workflow',
                  severity: 'warning',
                });
              }
            }
          });

          // Check for circular dependencies
          const visited = new Set<string>();
          const recursionStack = new Set<string>();

          const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const outgoingEdges = edges.filter((e) => e.source === nodeId);
            for (const edge of outgoingEdges) {
              if (!visited.has(edge.target)) {
                if (hasCycle(edge.target)) return true;
              } else if (recursionStack.has(edge.target)) {
                return true;
              }
            }

            recursionStack.delete(nodeId);
            return false;
          };

          if (triggerNodes.length === 1 && hasCycle(triggerNodes[0].id)) {
            errors.push({
              message: 'Workflow contains circular dependencies',
              severity: 'error',
            });
          }

          const result: WorkflowValidationResult = {
            isValid: !errors.some((e) => e.severity === 'error'),
            errors,
          };

          set({ validationResult: result });
          return result;
        },

        // ====================================================================
        // Persistence
        // ====================================================================

        saveWorkflow: async () => {
          set({ isSaving: true });

          try {
            const { workflow, nodes, edges } = get();
            if (!workflow) throw new Error('No workflow to save');

            const updatedWorkflow: Workflow = {
              ...workflow,
              nodes,
              edges,
              updatedAt: new Date().toISOString(),
            };

            // TODO: Implement API call to save workflow
            // await fetch('/api/workflows', { method: 'POST', body: JSON.stringify(updatedWorkflow) });

            set({
              workflow: updatedWorkflow,
              isDirty: false,
              isSaving: false,
            });

            console.log('Workflow saved successfully');
          } catch (error) {
            console.error('Failed to save workflow:', error);
            set({ isSaving: false });
            throw error;
          }
        },

        loadWorkflow: async (workflowId: string) => {
          try {
            // TODO: Implement API call to load workflow
            // const response = await fetch(`/api/workflows/${workflowId}`);
            // const workflow = await response.json();

            // get().setWorkflow(workflow);

            console.log('Workflow loaded:', workflowId);
          } catch (error) {
            console.error('Failed to load workflow:', error);
            throw error;
          }
        },

        exportWorkflow: () => {
          const { workflow, nodes, edges } = get();
          if (!workflow) throw new Error('No workflow to export');

          const exportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            workflow: {
              ...workflow,
              nodes,
              edges,
            },
          };

          return JSON.stringify(exportData, null, 2);
        },

        importWorkflow: (data: string) => {
          try {
            const importData = JSON.parse(data);
            get().setWorkflow(importData.workflow);
          } catch (error) {
            console.error('Failed to import workflow:', error);
            throw new Error('Invalid workflow data');
          }
        },

        // ====================================================================
        // History (Undo/Redo)
        // ====================================================================

        addToHistory: () => {
          const { nodes, edges, history, historyIndex } = get();

          // Remove any history after current index
          const newHistory = history.slice(0, historyIndex + 1);

          // Add current state
          newHistory.push({ nodes, edges });

          // Limit history to last 50 states
          const limitedHistory = newHistory.slice(-50);

          set({
            history: limitedHistory,
            historyIndex: limitedHistory.length - 1,
          });
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            set({
              nodes: previousState.nodes,
              edges: previousState.edges,
              historyIndex: historyIndex - 1,
              isDirty: true,
            });
          }
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            set({
              nodes: nextState.nodes,
              edges: nextState.edges,
              historyIndex: historyIndex + 1,
              isDirty: true,
            });
          }
        },

        canUndo: () => {
          const { historyIndex } = get();
          return historyIndex > 0;
        },

        canRedo: () => {
          const { history, historyIndex } = get();
          return historyIndex < history.length - 1;
        },
      }),
      {
        name: 'workflow-storage',
        partialize: (state) => ({
          // Only persist essential data
          workflow: state.workflow,
          viewport: state.viewport,
        }),
      }
    )
  )
);
