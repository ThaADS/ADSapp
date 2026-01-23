'use client'

/**
 * Workflow Canvas Component (Automation)
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 *
 * This is a simplified workflow canvas for the automation module.
 * For the full workflow builder, see @/components/workflow/workflow-canvas.tsx
 */

import { useState, useCallback } from 'react'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'delay'
  label: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
}

interface WorkflowCanvasProps {
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  onNodesChange?: (nodes: WorkflowNode[]) => void
  onEdgesChange?: (edges: WorkflowEdge[]) => void
  readOnly?: boolean
  className?: string
}

export function WorkflowCanvas({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  readOnly = false,
  className = '',
}: WorkflowCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const getNodeStyle = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'trigger':
        return 'bg-green-100 border-green-500 text-green-800'
      case 'action':
        return 'bg-blue-100 border-blue-500 text-blue-800'
      case 'condition':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      case 'delay':
        return 'bg-purple-100 border-purple-500 text-purple-800'
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'trigger':
        return '⚡'
      case 'action':
        return '▶️'
      case 'condition':
        return '❓'
      case 'delay':
        return '⏰'
      default:
        return '📦'
    }
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!readOnly) {
      setSelectedNode(nodeId === selectedNode ? null : nodeId)
    }
  }, [readOnly, selectedNode])

  if (nodes.length === 0) {
    return (
      <div className={`rounded-lg border bg-gray-50 p-8 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900">Geen workflow nodes</h3>
          <p className="text-gray-500 mt-2">
            {readOnly
              ? 'Deze workflow heeft geen nodes.'
              : 'Sleep nodes hierheen om je workflow te bouwen.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg border bg-gray-50 overflow-hidden ${className}`}>
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #9ca3af 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Canvas Area */}
      <div className="relative min-h-[400px] p-4">
        {/* Render Edges (simplified lines) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            const targetNode = nodes.find((n) => n.id === edge.target)
            if (!sourceNode || !targetNode) return null

            return (
              <line
                key={edge.id}
                x1={sourceNode.position.x + 75}
                y1={sourceNode.position.y + 40}
                x2={targetNode.position.x + 75}
                y2={targetNode.position.y}
                stroke="#9ca3af"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            )
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
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
            </marker>
          </defs>
        </svg>

        {/* Render Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute w-[150px] p-3 rounded-lg border-2 cursor-pointer transition-all
              ${getNodeStyle(node.type)}
              ${selectedNode === node.id ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'shadow'}
              ${readOnly ? 'cursor-default' : 'hover:shadow-md'}
            `}
            style={{
              left: node.position.x,
              top: node.position.y,
            }}
            onClick={() => handleNodeClick(node.id)}
          >
            <div className="flex items-center gap-2">
              <span>{getNodeIcon(node.type)}</span>
              <span className="text-sm font-medium truncate">{node.label}</span>
            </div>
            <div className="text-xs mt-1 opacity-70 capitalize">{node.type}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm p-2 text-xs flex gap-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" /> Trigger
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500" /> Actie
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500" /> Conditie
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500" /> Vertraging
        </span>
      </div>
    </div>
  )
}

export default WorkflowCanvas
