'use client';

/**
 * Action Node Component
 *
 * Represents generic actions like adding/removing tags, updating fields, etc.
 */

import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Settings2, Tag, Edit, List, Bell } from 'lucide-react';
import type { CustomNodeProps, ActionNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';
import { ActionConfigModal } from '../config-modals';

// ============================================================================
// ACTION NODE COMPONENT
// ============================================================================

export const ActionNode = memo(({ id, data, selected }: CustomNodeProps<ActionNodeData>) => {
  const { setSelectedNode, updateNode } = useWorkflowStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  /**
   * Get action type display name
   */
  const getActionTypeName = () => {
    switch (data.actionConfig.actionType) {
      case 'add_tag':
        return 'Add Tag';
      case 'remove_tag':
        return 'Remove Tag';
      case 'update_field':
        return 'Update Field';
      case 'add_to_list':
        return 'Add to List';
      case 'remove_from_list':
        return 'Remove from List';
      case 'send_notification':
        return 'Send Notification';
      default:
        return 'Action';
    }
  };

  /**
   * Get action icon
   */
  const getActionIcon = () => {
    switch (data.actionConfig.actionType) {
      case 'add_tag':
      case 'remove_tag':
        return <Tag className="w-4 h-4 text-white" />;
      case 'update_field':
        return <Edit className="w-4 h-4 text-white" />;
      case 'add_to_list':
      case 'remove_from_list':
        return <List className="w-4 h-4 text-white" />;
      case 'send_notification':
        return <Bell className="w-4 h-4 text-white" />;
      default:
        return <Zap className="w-4 h-4 text-white" />;
    }
  };

  /**
   * Get validation status
   */
  const isValid = data.isValid ?? false;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  return (
    <div
      className={`
        relative min-w-[280px] rounded-xl border-2 shadow-lg
        transition-all duration-200
        ${selected
          ? 'border-pink-500 dark:border-pink-400 ring-4 ring-pink-100 dark:ring-pink-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-pink-200 dark:border-pink-800'
        }
        bg-white dark:bg-slate-900
        hover:shadow-xl
      `}
      onClick={() => setSelectedNode(id)}
    >
      {/* Input handle (top center) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 !bg-pink-500 dark:!bg-pink-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            {getActionIcon()}
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-pink-100 uppercase tracking-wide">
              Action
            </div>
            <div className="text-sm font-semibold text-white">
              {data.label}
            </div>
          </div>
          <button
            className="p-1 hover:bg-white/20 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsConfigOpen(true);
            }}
          >
            <Settings2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Action type badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 rounded-full">
          {getActionIcon()}
          <span className="text-xs font-medium text-pink-700 dark:text-pink-300">
            {getActionTypeName()}
          </span>
        </div>

        {/* Action configuration summary */}
        <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {/* Tag operations */}
            {(data.actionConfig.actionType === 'add_tag' || data.actionConfig.actionType === 'remove_tag') && data.actionConfig.tagIds && (
              <div>Tags: {data.actionConfig.tagIds.length} selected</div>
            )}

            {/* Field updates */}
            {data.actionConfig.actionType === 'update_field' && (
              <>
                {data.actionConfig.fieldName && <div>Field: {data.actionConfig.fieldName}</div>}
                {data.actionConfig.fieldValue && <div>Value: {data.actionConfig.fieldValue}</div>}
              </>
            )}

            {/* List operations */}
            {(data.actionConfig.actionType === 'add_to_list' || data.actionConfig.actionType === 'remove_from_list') && data.actionConfig.listId && (
              <div>List ID: {data.actionConfig.listId}</div>
            )}

            {/* Notifications */}
            {data.actionConfig.actionType === 'send_notification' && (
              <>
                {data.actionConfig.notificationEmail && <div>To: {data.actionConfig.notificationEmail}</div>}
                {data.actionConfig.notificationMessage && (
                  <div className="truncate">Message: {data.actionConfig.notificationMessage}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {data.description}
          </p>
        )}

        {/* Validation errors */}
        {hasErrors && (
          <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2">
            {data.validationErrors!.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{getActionTypeName()}</span>
          {isValid && !hasErrors && (
            <span className="text-pink-600 dark:text-pink-400 font-medium">
              ✓ Configured
            </span>
          )}
        </div>
      </div>

      {/* Output handle (bottom center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-pink-500 dark:!bg-pink-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-pink-500 dark:border-pink-400 rounded-xl pointer-events-none" />
      )}

      {/* Configuration Modal */}
      <ActionConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newData) => {
          updateNode(id, newData);
        }}
        initialData={data}
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
