'use client';

/**
 * ReactFlow Canvas - Enhanced Visual Workflow Builder
 * Drag-and-drop workflow designer with auto-layout and validation
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

// Custom node components
import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import DelayNode from './nodes/DelayNode';
import WebhookNode from './nodes/WebhookNode';
import AIResponseNode from './nodes/AIResponseNode';

// Types
export interface WorkflowNode extends Node {
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook' | 'ai_response';
  data: {
    label: string;
    config?: Record<string, unknown>;
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
  };
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  startNodeId: string;
  variables?: Record<string, unknown>;
}

interface ReactFlowCanvasProps {
  initialWorkflow?: WorkflowDefinition;
  onSave?: (workflow: WorkflowDefinition) => Promise<void>;
  onTest?: (workflow: WorkflowDefinition) => Promise<void>;
  readOnly?: boolean;
}

// Custom node types registry
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  webhook: WebhookNode,
  ai_response: AIResponseNode,
};

// Node palette - draggable node templates
const NODE_TEMPLATES = [
  { type: 'trigger', label: '🎯 Trigger', description: 'Start workflow' },
  { type: 'condition', label: '🔀 Condition', description: 'If/else logic' },
  { type: 'action', label: '⚡ Action', description: 'Perform action' },
  { type: 'delay', label: '⏱️ Delay', description: 'Wait period' },
  { type: 'webhook', label: '🔗 Webhook', description: 'HTTP request' },
  { type: 'ai_response', label: '🤖 AI Response', description: 'Smart reply' },
];

// Dagre layout configuration
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 80;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function WorkflowCanvas({ initialWorkflow, onSave, onTest, readOnly = false }: ReactFlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load initial workflow
  useEffect(() => {
    if (initialWorkflow) {
      setNodes(initialWorkflow.nodes);
      setEdges(initialWorkflow.edges);
    } else {
      // Create default trigger node
      const defaultNode: WorkflowNode = {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'New Message Received',
          config: { trigger_type: 'message_received' }
        },
      };
      setNodes([defaultNode]);
    }
  }, [initialWorkflow, setNodes, setEdges]);

  // Node editing
  const handleEditNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node as WorkflowNode);
    }
  }, [nodes]);

  // Node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    // Prevent self-connections
    if (connection.source === connection.target) {
      return false;
    }

    // Condition nodes must have exactly 2 outputs (true/false)
    if (sourceNode?.type === 'condition') {
      const existingConnections = edges.filter((e) => e.source === connection.source);
      if (existingConnections.length >= 2) {
        return false; // Condition already has 2 outputs
      }
    }

    // Trigger nodes can only be source, never target
    if (targetNode?.type === 'trigger') {
      return false;
    }

    return true;
  }, [nodes, edges]);

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) return;

      const edge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        label: params.sourceHandle?.includes('false') ? 'False' : params.sourceHandle?.includes('true') ? 'True' : undefined,
      };

      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, isValidConnection]
  );

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: `${type}-${Date.now()}`,
        type: type as WorkflowNode['type'],
        position,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          config: {},
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, handleEditNode, handleDeleteNode]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as WorkflowNode);
  }, []);

  // Auto-layout
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Validation
  const validateWorkflow = useCallback((): string[] => {
    const errors: string[] = [];

    // Must have at least one trigger node
    const triggerNodes = nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for orphaned nodes (no incoming edges except trigger)
    nodes.forEach((node) => {
      if (node.type !== 'trigger') {
        const hasIncoming = edges.some((e) => e.target === node.id);
        if (!hasIncoming) {
          errors.push(`Node "${node.data.label}" is not connected`);
        }
      }
    });

    // Check condition nodes have both outputs
    nodes.forEach((node) => {
      if (node.type === 'condition') {
        const outputs = edges.filter((e) => e.source === node.id);
        if (outputs.length < 2) {
          errors.push(`Condition node "${node.data.label}" must have both true and false branches`);
        }
      }
    });

    return errors;
  }, [nodes, edges]);

  // Save workflow
  const handleSave = useCallback(async () => {
    const errors = validateWorkflow();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const workflow: WorkflowDefinition = {
        id: initialWorkflow?.id,
        name: initialWorkflow?.name || 'Untitled Workflow',
        nodes: nodes as WorkflowNode[],
        edges,
        startNodeId: nodes.find((n) => n.type === 'trigger')?.id || '',
      };

      await onSave?.(workflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, validateWorkflow, onSave, initialWorkflow]);

  // Test workflow
  const handleTest = useCallback(async () => {
    const errors = validateWorkflow();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsTesting(true);
    try {
      const workflow: WorkflowDefinition = {
        id: initialWorkflow?.id,
        name: initialWorkflow?.name || 'Test Workflow',
        nodes: nodes as WorkflowNode[],
        edges,
        startNodeId: nodes.find((n) => n.type === 'trigger')?.id || '',
      };

      await onTest?.(workflow);
    } catch (error) {
      console.error('Failed to test workflow:', error);
    } finally {
      setIsTesting(false);
    }
  }, [nodes, edges, validateWorkflow, onTest, initialWorkflow]);

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Workflow Nodes</h3>
        <div className="space-y-2">
          {NODE_TEMPLATES.map((template) => (
            <div
              key={template.type}
              className="p-3 border-2 border-gray-200 rounded-lg cursor-move hover:border-blue-400 hover:bg-blue-50 transition-colors"
              draggable
              onDragStart={(e) => onDragStart(e, template.type)}
            >
              <div className="font-medium">{template.label}</div>
              <div className="text-xs text-gray-500 mt-1">{template.description}</div>
            </div>
          ))}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Validation Errors:</h4>
            <ul className="text-sm text-red-600 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* ReactFlow Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          {/* Toolbar */}
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={onLayout}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={readOnly}
            >
              Auto Layout
            </button>
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={readOnly || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Workflow'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={readOnly || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Node Configuration Panel */}
      {selectedNode && !readOnly && (
        <aside className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Node Configuration</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Node Type
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded text-sm">
                {selectedNode.type}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, label: e.target.value } }
                        : n
                    )
                  );
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Node-specific configuration fields will be added here */}
            <div className="text-sm text-gray-500">
              Node-specific configuration panel will be implemented based on node type
            </div>

            <button
              onClick={() => handleDeleteNode(selectedNode.id)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Node
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

// Main component with ReactFlowProvider wrapper
export default function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
}
