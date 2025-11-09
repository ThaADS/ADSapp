'use client';

/**
 * Condition Node Component
 *
 * Represents conditional branching in the workflow.
 * Evaluates conditions and routes to different paths (true/false).
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Settings2, Check, X } from 'lucide-react';
import type { CustomNodeProps, ConditionNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// CONDITION NODE COMPONENT
// ============================================================================

export const ConditionNode = memo(({ id, data, selected }: CustomNodeProps<ConditionNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get field name display
   */
  const getFieldDisplay = () => {
    switch (data.conditionConfig.field) {
      case 'tag':
        return 'Contact Tag';
      case 'custom_field':
        return 'Custom Field';
      case 'last_message_date':
        return 'Last Message Date';
      case 'contact_status':
        return 'Contact Status';
      case 'contact_source':
        return 'Contact Source';
      default:
        return 'Unknown Field';
    }
  };

  /**
   * Get operator display
   */
  const getOperatorDisplay = () => {
    switch (data.conditionConfig.operator) {
      case 'equals':
        return 'equals';
      case 'not_equals':
        return 'does not equal';
      case 'contains':
        return 'contains';
      case 'not_contains':
        return 'does not contain';
      case 'greater_than':
        return 'is greater than';
      case 'less_than':
        return 'is less than';
      case 'is_empty':
        return 'is empty';
      case 'is_not_empty':
        return 'is not empty';
      default:
        return 'unknown';
    }
  };

  /**
   * Get validation status
   */
  const isValid = data.isValid ?? false;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  /**
   * Check if has multiple conditions
   */
  const hasMultipleConditions = data.conditionConfig.conditions && data.conditionConfig.conditions.length > 0;

  return (
    <div
      className={`
        relative min-w-[300px] rounded-xl border-2 shadow-lg
        transition-all duration-200
        ${selected
          ? 'border-violet-500 dark:border-violet-400 ring-4 ring-violet-100 dark:ring-violet-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-violet-200 dark:border-violet-800'
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
        className="w-3 h-3 !bg-violet-500 dark:!bg-violet-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-violet-100 uppercase tracking-wide">
              Conditional Branch
            </div>
            <div className="text-sm font-semibold text-white">
              {data.label}
            </div>
          </div>
          <button
            className="p-1 hover:bg-white/20 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open settings modal
            }}
          >
            <Settings2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Condition display */}
        <div className="bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
          <div className="text-xs space-y-1">
            <div className="font-medium text-violet-900 dark:text-violet-100">
              IF
            </div>
            <div className="text-violet-700 dark:text-violet-300 pl-4">
              <span className="font-medium">{getFieldDisplay()}</span>
              <span className="mx-1 text-violet-500 dark:text-violet-400">{getOperatorDisplay()}</span>
              {!['is_empty', 'is_not_empty'].includes(data.conditionConfig.operator) && (
                <span className="font-semibold">"{String(data.conditionConfig.value)}"</span>
              )}
            </div>
          </div>

          {/* Multiple conditions */}
          {hasMultipleConditions && (
            <div className="mt-2 pt-2 border-t border-violet-200 dark:border-violet-800">
              <div className="text-xs text-violet-600 dark:text-violet-400">
                + {data.conditionConfig.conditions!.length} more condition(s)
              </div>
            </div>
          )}
        </div>

        {/* Branch paths preview */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              True path
            </span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg">
            <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
              False path
            </span>
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
          <span>Split workflow</span>
          {isValid && !hasErrors && (
            <span className="text-violet-600 dark:text-violet-400 font-medium">
              ✓ Configured
            </span>
          )}
        </div>
      </div>

      {/* Output handles (bottom left for TRUE, bottom right for FALSE) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '33%' }}
        className="w-3 h-3 !bg-emerald-500 dark:!bg-emerald-400 border-2 border-white dark:border-slate-900"
      >
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            True
          </span>
        </div>
      </Handle>

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '67%' }}
        className="w-3 h-3 !bg-rose-500 dark:!bg-rose-400 border-2 border-white dark:border-slate-900"
      >
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
            False
          </span>
        </div>
      </Handle>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-violet-500 dark:border-violet-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
