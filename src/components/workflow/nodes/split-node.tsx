'use client';

/**
 * Split Node Component
 *
 * A/B testing split that randomly distributes contacts across different paths.
 * Supports percentage-based and field-based splitting.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Settings2, Percent, Database } from 'lucide-react';
import type { CustomNodeProps, SplitNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// SPLIT NODE COMPONENT
// ============================================================================

export const SplitNode = memo(({ id, data, selected }: CustomNodeProps<SplitNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get split type display name
   */
  const getSplitTypeName = () => {
    switch (data.splitConfig.splitType) {
      case 'random':
        return 'Random Split';
      case 'field_based':
        return 'Field-Based Split';
      case 'percentage':
        return 'Percentage Split';
      default:
        return 'Split';
    }
  };

  /**
   * Get split icon
   */
  const getSplitIcon = () => {
    switch (data.splitConfig.splitType) {
      case 'field_based':
        return <Database className="w-4 h-4 text-white" />;
      default:
        return <Percent className="w-4 h-4 text-white" />;
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
          ? 'border-indigo-500 dark:border-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-indigo-200 dark:border-indigo-800'
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
        className="w-3 h-3 !bg-indigo-500 dark:!bg-indigo-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-indigo-100 uppercase tracking-wide">
              A/B Split
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
        {/* Split type badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-full">
          {getSplitIcon()}
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {getSplitTypeName()}
          </span>
        </div>

        {/* Split configuration */}
        {data.splitConfig.splitType !== 'field_based' && data.splitConfig.branches && (
          <div className="mt-3 space-y-2">
            {data.splitConfig.branches.map((branch) => (
              <div
                key={branch.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {branch.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 w-24">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all"
                        style={{ width: `${branch.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 min-w-[2.5rem] text-right">
                      {branch.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Field-based split */}
        {data.splitConfig.splitType === 'field_based' && (
          <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {data.splitConfig.fieldName && (
                <div>Field: {data.splitConfig.fieldName}</div>
              )}
              {data.splitConfig.fieldValues && Object.keys(data.splitConfig.fieldValues).length > 0 && (
                <div>Mapping: {Object.keys(data.splitConfig.fieldValues).length} values</div>
              )}
            </div>
          </div>
        )}

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
          <span>
            {data.splitConfig.branches?.length || 0} branches
          </span>
          {isValid && !hasErrors && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              ✓ Configured
            </span>
          )}
        </div>
      </div>

      {/* Output handles (multiple for branches) */}
      {data.splitConfig.branches && data.splitConfig.branches.map((branch, index) => (
        <Handle
          key={branch.id}
          type="source"
          position={Position.Bottom}
          id={branch.id}
          style={{
            left: `${((index + 1) * 100) / (data.splitConfig.branches!.length + 1)}%`,
          }}
          className="w-3 h-3 !bg-indigo-500 dark:!bg-indigo-400 border-2 border-white dark:border-slate-900"
        />
      ))}

      {/* Default output handle if no branches */}
      {(!data.splitConfig.branches || data.splitConfig.branches.length === 0) && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="output"
          className="w-3 h-3 !bg-indigo-500 dark:!bg-indigo-400 border-2 border-white dark:border-slate-900"
        />
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

SplitNode.displayName = 'SplitNode';
