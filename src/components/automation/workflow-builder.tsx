'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  BeakerIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Types for workflow components
interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
    isConfigured: boolean;
  };
  inputs?: string[];
  outputs?: string[];
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  isPrebuilt: boolean;
}

// Predefined workflow templates
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome-sequence',
    name: 'Welcome Message Sequence',
    description: 'Send a series of welcome messages to new contacts',
    category: 'onboarding',
    isPrebuilt: true,
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'New Contact Added', config: { event: 'contact_created' }, isConfigured: true }
      },
      {
        id: 'delay-1',
        type: 'delay',
        position: { x: 300, y: 100 },
        data: { label: 'Wait 5 minutes', config: { duration: 300 }, isConfigured: true }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 500, y: 100 },
        data: { label: 'Send Welcome Message', config: { template: 'welcome' }, isConfigured: true }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'delay-1' },
      { id: 'conn-2', source: 'delay-1', target: 'action-1' }
    ]
  },
  {
    id: 'auto-response',
    name: 'Auto Response System',
    description: 'Automatically respond to common questions',
    category: 'support',
    isPrebuilt: true,
    nodes: [
      {
        id: 'trigger-2',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'Message Received', config: { event: 'message_received' }, isConfigured: true }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: { label: 'Contains Keywords', config: { keywords: ['price', 'cost', 'fee'] }, isConfigured: true }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 500, y: 50 },
        data: { label: 'Send Pricing Info', config: { template: 'pricing' }, isConfigured: true }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 500, y: 150 },
        data: { label: 'Tag as Support', config: { tag: 'support' }, isConfigured: true }
      }
    ],
    connections: [
      { id: 'conn-3', source: 'trigger-2', target: 'condition-1' },
      { id: 'conn-4', source: 'condition-1', target: 'action-2' },
      { id: 'conn-5', source: 'condition-1', target: 'action-3' }
    ]
  }
];

// Node type configurations
const NODE_TYPES = {
  trigger: {
    icon: BoltIcon,
    color: 'bg-green-100 border-green-300 text-green-800',
    options: [
      { id: 'message_received', label: 'Message Received', description: 'When a new message is received' },
      { id: 'contact_created', label: 'Contact Added', description: 'When a new contact is created' },
      { id: 'tag_added', label: 'Tag Added', description: 'When a tag is applied to a contact' },
      { id: 'time_based', label: 'Time Based', description: 'At specific times or intervals' }
    ]
  },
  condition: {
    icon: ArrowRightIcon,
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    options: [
      { id: 'keyword_match', label: 'Keyword Match', description: 'Check if message contains keywords' },
      { id: 'tag_check', label: 'Has Tag', description: 'Check if contact has specific tag' },
      { id: 'time_check', label: 'Time Condition', description: 'Check current time/date' },
      { id: 'custom_field', label: 'Custom Field', description: 'Check custom field value' }
    ]
  },
  action: {
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-purple-100 border-purple-300 text-purple-800',
    options: [
      { id: 'send_message', label: 'Send Message', description: 'Send a message using template' },
      { id: 'add_tag', label: 'Add Tag', description: 'Add tag to contact' },
      { id: 'assign_user', label: 'Assign to User', description: 'Assign conversation to team member' },
      { id: 'webhook', label: 'Webhook', description: 'Send data to external URL' }
    ]
  },
  delay: {
    icon: ClockIcon,
    color: 'bg-orange-100 border-orange-300 text-orange-800',
    options: [
      { id: 'fixed_delay', label: 'Fixed Delay', description: 'Wait for specific duration' },
      { id: 'business_hours', label: 'Until Business Hours', description: 'Wait until business hours' },
      { id: 'specific_time', label: 'Until Specific Time', description: 'Wait until specific time' }
    ]
  }
};

interface WorkflowBuilderProps {
  organizationId: string;
}

export default function WorkflowBuilder({ organizationId }: WorkflowBuilderProps) {
  // Use organizationId for future API calls
  
  
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowTemplate | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize with templates
  useEffect(() => {
    setWorkflows(WORKFLOW_TEMPLATES);
  }, []);

  // Create new workflow
  const createNewWorkflow = useCallback(() => {
    const newWorkflow: WorkflowTemplate = {
      id: `workflow-${Date.now()}`,
      name: 'New Workflow',
      description: 'Custom workflow',
      category: 'custom',
      isPrebuilt: false,
      nodes: [],
      connections: []
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setCurrentWorkflow(newWorkflow);
    setShowTemplates(false);
  }, []);

  // Load workflow template
  const loadTemplate = useCallback((template: WorkflowTemplate) => {
    setCurrentWorkflow({ ...template, id: `workflow-${Date.now()}` });
    setShowTemplates(false);
  }, []);

  // Handle node drag start
  const handleNodeDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    setDraggedNodeType(nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle canvas drop
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType || !currentWorkflow || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: draggedNodeType as any,
      position: { x, y },
      data: {
        label: `New ${draggedNodeType}`,
        config: {},
        isConfigured: false
      }
    };

    setCurrentWorkflow(prev => prev ? {
      ...prev,
      nodes: [...prev.nodes, newNode]
    } : null);
    setDraggedNodeType(null);
  }, [draggedNodeType, currentWorkflow]);

  // Handle node selection
  const handleNodeClick = useCallback((node: WorkflowNode) => {
    setSelectedNode(node);
  }, []);

  // Update node configuration
  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    if (!currentWorkflow) return;

    setCurrentWorkflow(prev => prev ? {
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config, isConfigured: true } }
          : node
      )
    } : null);
  }, [currentWorkflow]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    if (!currentWorkflow) return;

    setCurrentWorkflow(prev => prev ? {
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(conn =>
        conn.source !== nodeId && conn.target !== nodeId
      )
    } : null);
    setSelectedNode(null);
  }, [currentWorkflow]);

  // Test workflow
  const testWorkflow = useCallback(async () => {
    if (!currentWorkflow) return;

    setIsRunning(true);
    // Simulate workflow execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRunning(false);

    // Show success message
    alert('Workflow test completed successfully!');
  }, [currentWorkflow]);

  // Save workflow
  const saveWorkflow = useCallback(() => {
    if (!currentWorkflow) return;

    setWorkflows(prev => prev.map(w =>
      w.id === currentWorkflow.id ? currentWorkflow : w
    ));

    alert('Workflow saved successfully!');
  }, [currentWorkflow]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
            {currentWorkflow && (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentWorkflow.name}
                  onChange={(e) => setCurrentWorkflow(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Workflow name"
                />
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Browse templates"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-2 inline" />
              Templates
            </button>
            <button
              type="button"
              onClick={createNewWorkflow}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Create new workflow"
            >
              <PlusIcon className="w-4 h-4 mr-2 inline" />
              New Workflow
            </button>
            {currentWorkflow && (
              <>
                <button
                  type="button"
                  onClick={testWorkflow}
                  disabled={isRunning}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    isRunning
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                  aria-label="Test workflow"
                >
                  <BeakerIcon className="w-4 h-4 mr-2 inline" />
                  Test
                </button>
                <button
                  type="button"
                  onClick={saveWorkflow}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Save workflow"
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
          <div className="space-y-2">
            {Object.entries(NODE_TYPES).map(([type, config]) => {
              const IconComponent = config.icon;
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleNodeDragStart(e, type)}
                  className={`p-3 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing ${config.color} hover:opacity-80 transition-opacity`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag to add ${type} component`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      // Handle keyboard interaction for accessibility
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <IconComponent className="w-5 h-5" />
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Legend</h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Triggers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>Conditions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-200 rounded"></div>
                <span>Actions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-200 rounded"></div>
                <span>Delays</span>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {currentWorkflow ? (
            <div
              ref={canvasRef}
              onDrop={handleCanvasDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full h-full bg-gray-50 relative bg-[radial-gradient(circle,#e5e7eb_1px,transparent_1px)] bg-[length:20px_20px]"
            >
              {/* Render connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
                {currentWorkflow.connections.map((connection) => {
                  const sourceNode = currentWorkflow.nodes.find(n => n.id === connection.source);
                  const targetNode = currentWorkflow.nodes.find(n => n.id === connection.target);

                  if (!sourceNode || !targetNode) return null;

                  const x1 = sourceNode.position.x + 75;
                  const y1 = sourceNode.position.y + 40;
                  const x2 = targetNode.position.x + 75;
                  const y2 = targetNode.position.y + 40;

                  return (
                    <g key={connection.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#6b7280"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}

                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#6b7280"
                    />
                  </marker>
                </defs>
              </svg>

              {/* Render nodes */}
              {currentWorkflow.nodes.map((node) => {
                const nodeConfig = NODE_TYPES[node.type];
                const IconComponent = nodeConfig.icon;

                return (
                  <div
                    key={node.id}
                    className={`absolute p-4 rounded-lg border-2 cursor-pointer transition-all z-[2] ${
                      selectedNode?.id === node.id
                        ? `${nodeConfig.color} ring-2 ring-blue-500`
                        : `${nodeConfig.color} hover:shadow-lg`
                    } ${node.data.isConfigured ? 'border-solid' : 'border-dashed opacity-75'}`}
                    style={{ left: node.position.x, top: node.position.y, minWidth: '150px' }}
                    onClick={() => handleNodeClick(node)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.type} node: ${node.data.label}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNodeClick(node);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium">{node.data.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {node.data.isConfigured ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                          aria-label="Delete node"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 capitalize">{node.type}</div>

                    {/* Connection points */}
                    <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full cursor-crosshair"></div>
                    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                  </div>
                );
              })}

              {/* Empty state */}
              {currentWorkflow.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <BoltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start Building Your Workflow</h3>
                    <p className="text-gray-500 mb-4">Drag components from the sidebar to create your automation workflow</p>
                    <button
                      type="button"
                      onClick={() => setShowTemplates(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Or choose from templates →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <CodeBracketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-900 mb-2">No Workflow Selected</h2>
                <p className="text-gray-500 mb-6">Create a new workflow or load an existing template to get started</p>
                <div className="space-x-4">
                  <button
                    type="button"
                    onClick={createNewWorkflow}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create New Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Browse Templates
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure Node</h3>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close configuration panel"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    const updatedNode = {
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value }
                    };
                    setSelectedNode(updatedNode);
                    if (currentWorkflow) {
                      setCurrentWorkflow(prev => prev ? {
                        ...prev,
                        nodes: prev.nodes.map(n => n.id === selectedNode.id ? updatedNode : n)
                      } : null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-describedby="node-label-description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => {
                    const updatedNode = {
                      ...selectedNode,
                      type: e.target.value as any,
                      data: { ...selectedNode.data, config: {} }
                    };
                    setSelectedNode(updatedNode);
                    if (currentWorkflow) {
                      setCurrentWorkflow(prev => prev ? {
                        ...prev,
                        nodes: prev.nodes.map(n => n.id === selectedNode.id ? updatedNode : n)
                      } : null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select node type"
                >
                  {Object.entries(NODE_TYPES).map(([type, config]) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type-specific configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration
                </label>
                <div className="space-y-3">
                  {NODE_TYPES[selectedNode.type].options.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedNode.data.config.type === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateNodeConfig(selectedNode.id, { type: option.id })}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${option.label}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          updateNodeConfig(selectedNode.id, { type: option.id });
                        }
                      }}
                    >
                      <div className="font-medium text-sm text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Workflow Templates</h2>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close templates modal"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {WORKFLOW_TEMPLATES.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {template.nodes.length} components
                      </span>
                      <button
                        type="button"
                        onClick={() => loadTemplate(template)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}