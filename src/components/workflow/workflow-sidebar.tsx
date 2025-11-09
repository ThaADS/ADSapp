'use client';

/**
 * Workflow Sidebar - Node Palette
 *
 * Draggable node palette for adding new nodes to the workflow canvas.
 * Organized by category with descriptions.
 */

import React from 'react';
import {
  Zap,
  MessageSquare,
  Clock,
  GitBranch,
  Tag,
  Settings,
} from 'lucide-react';
import type { NodePaletteItem, WorkflowNodeType } from '@/types/workflow';

// ============================================================================
// NODE PALETTE ITEMS
// ============================================================================

const nodePaletteItems: NodePaletteItem[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start your workflow when an event occurs',
    icon: 'Zap',
    category: 'trigger',
    maxInstances: 1, // Only one trigger per workflow
  },
  {
    type: 'message',
    label: 'Send Message',
    description: 'Send a WhatsApp message to the contact',
    icon: 'MessageSquare',
    category: 'action',
  },
  {
    type: 'delay',
    label: 'Wait',
    description: 'Wait for a specified time before continuing',
    icon: 'Clock',
    category: 'logic',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch workflow based on conditions',
    icon: 'GitBranch',
    category: 'logic',
  },
  {
    type: 'action',
    label: 'Action',
    description: 'Perform an action (add tag, update field, etc.)',
    icon: 'Tag',
    category: 'action',
  },
];

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap: Record<string, any> = {
  Zap,
  MessageSquare,
  Clock,
  GitBranch,
  Tag,
  Settings,
};

// ============================================================================
// DRAGGABLE NODE COMPONENT
// ============================================================================

interface DraggableNodeProps {
  item: NodePaletteItem;
}

function DraggableNode({ item }: DraggableNodeProps) {
  const Icon = iconMap[item.icon] || Settings;

  /**
   * Handle drag start - set node type in dataTransfer
   */
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Get category color
  const getCategoryColor = () => {
    switch (item.category) {
      case 'trigger':
        return 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900';
      case 'action':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900';
      case 'logic':
        return 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900';
      default:
        return 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900';
    }
  };

  const getIconColor = () => {
    switch (item.category) {
      case 'trigger':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'action':
        return 'text-blue-600 dark:text-blue-400';
      case 'logic':
        return 'text-violet-600 dark:text-violet-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.type)}
      className={`
        cursor-grab active:cursor-grabbing
        border rounded-lg p-3
        transition-all duration-200
        ${getCategoryColor()}
        ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 ${getIconColor()}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {item.label}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>

      {item.maxInstances && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Max: {item.maxInstances}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

export function WorkflowSidebar() {
  // Group nodes by category
  const groupedNodes = nodePaletteItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NodePaletteItem[]>);

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Workflow Nodes
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Drag and drop nodes onto the canvas
        </p>
      </div>

      {/* Node palette */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Triggers */}
        {groupedNodes.trigger && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Triggers
            </h3>
            <div className="space-y-2">
              {groupedNodes.trigger.map((item) => (
                <DraggableNode key={item.type} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {groupedNodes.action && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {groupedNodes.action.map((item) => (
                <DraggableNode key={item.type} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Logic */}
        {groupedNodes.logic && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Logic & Flow
            </h3>
            <div className="space-y-2">
              {groupedNodes.logic.map((item) => (
                <DraggableNode key={item.type} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with tips */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p className="font-medium">Quick Tips:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Every workflow needs a trigger</li>
            <li>Connect nodes to create flow</li>
            <li>Use conditions for branching</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
