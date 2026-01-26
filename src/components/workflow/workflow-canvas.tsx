'use client';

/**
 * Workflow Canvas - Main React Flow Canvas Component
 *
 * Drag-and-drop visual workflow builder using React Flow.
 * Handles node interactions, connections, and canvas controls.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { useTranslations } from '@/components/providers/translation-provider';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from '@/stores/workflow-store';
import type { WorkflowNode, WorkflowNodeType } from '@/types/workflow';

// Import custom node components
import { TriggerNode } from './nodes/trigger-node';
import { MessageNode } from './nodes/message-node';
import { DelayNode } from './nodes/delay-node';
import { ConditionNode } from './nodes/condition-node';
import { ActionNode } from './nodes/action-node';
import { WaitUntilNode } from './nodes/wait-until-node';
import { SplitNode } from './nodes/split-node';
import { WebhookNode } from './nodes/webhook-node';
import { AINode } from './nodes/ai-node';
import { GoalNode } from './nodes/goal-node';

// ============================================================================
// NODE TYPE MAPPING
// ============================================================================

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
  wait_until: WaitUntilNode,
  split: SplitNode,
  webhook: WebhookNode,
  ai: AINode,
  goal: GoalNode,
};

// ============================================================================
// CANVAS COMPONENT
// ============================================================================

function WorkflowCanvasInner() {
  const t = useTranslations('workflow')
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Zustand store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    clearSelection,
    validateWorkflow,
  } = useWorkflowStore();

  /**
   * Handle drag over event (for drag-and-drop from sidebar)
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop event (add new node from sidebar)
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  /**
   * Handle node click
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  /**
   * Handle pane click (clear selection)
   */
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Handle delete key press
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected node/edge on Delete or Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNode = useWorkflowStore.getState().selectedNodeId;
        if (selectedNode) {
          event.preventDefault();
          useWorkflowStore.getState().deleteNode(selectedNode);
        }
      }

      // Undo on Ctrl+Z
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        useWorkflowStore.getState().undo();
      }

      // Redo on Ctrl+Y or Ctrl+Shift+Z
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        useWorkflowStore.getState().redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Auto-validate on changes
   */
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        validateWorkflow();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, validateWorkflow]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50 dark:bg-slate-900"
        minZoom={0.2}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        {/* Grid background */}
        <Background
          gap={16}
          size={1}
          color="#cbd5e1"
          className="dark:opacity-20"
        />

        {/* Canvas controls (zoom, fit view, etc.) */}
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
        />

        {/* Mini map */}
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#10b981'; // green
              case 'message':
                return '#3b82f6'; // blue
              case 'delay':
                return '#f59e0b'; // amber
              case 'condition':
                return '#8b5cf6'; // violet
              case 'action':
                return '#ec4899'; // pink
              case 'wait_until':
                return '#06b6d4'; // cyan
              case 'split':
                return '#6366f1'; // indigo
              case 'webhook':
                return '#14b8a6'; // teal
              case 'ai':
                return '#a855f7'; // purple
              case 'goal':
                return '#10b981'; // emerald
              default:
                return '#64748b'; // slate
            }
          }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
          maskColor="rgb(240, 240, 240, 0.6)"
        />

        {/* Top panel for info/stats */}
        <Panel position="top-left" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-4 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                {nodes.length} nodes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                {edges.length} connections
              </span>
            </div>
          </div>
        </Panel>

        {/* Keyboard shortcuts hint */}
        <Panel position="bottom-right" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div><kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Delete</kbd> {t('canvas.delete')/* Remove selected */}</div>
            <div><kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Ctrl+Z</kbd> {t('canvas.undo')/* Undo */}</div>
            <div><kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Ctrl+Y</kbd> {t('canvas.redo')/* Redo */}</div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT WITH PROVIDER
// ============================================================================

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
