'use client';

/**
 * Delay Node Component
 *
 * Represents a wait/delay in the workflow.
 * Can delay for minutes, hours, days, or weeks with advanced options.
 */

import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Settings2, Calendar, Sun } from 'lucide-react';
import type { CustomNodeProps, DelayNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';
import { DelayConfigModal } from '../config-modals';

// ============================================================================
// DELAY NODE COMPONENT
// ============================================================================

export const DelayNode = memo(({ id, data, selected }: CustomNodeProps<DelayNodeData>) => {
  const { setSelectedNode, updateNode } = useWorkflowStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  /**
   * Format delay duration
   */
  const getDelayDuration = () => {
    const { amount, unit } = data.delayConfig;
    return `${amount} ${unit}${amount !== 1 ? '' : unit.slice(0, -1)}`;
  };

  /**
   * Get delay icon based on unit
   */
  const getDelayIcon = () => {
    switch (data.delayConfig.unit) {
      case 'minutes':
      case 'hours':
        return <Clock className="w-4 h-4 text-white" />;
      case 'days':
      case 'weeks':
        return <Calendar className="w-4 h-4 text-white" />;
      default:
        return <Clock className="w-4 h-4 text-white" />;
    }
  };

  /**
   * Get validation status
   */
  const isValid = data.isValid ?? false;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  /**
   * Check if has advanced settings
   */
  const hasAdvancedSettings =
    data.delayConfig.businessHoursOnly ||
    data.delayConfig.skipWeekends ||
    data.delayConfig.specificTime;

  return (
    <div
      className={`
        relative min-w-[280px] rounded-xl border-2 shadow-lg
        transition-all duration-200
        ${selected
          ? 'border-amber-500 dark:border-amber-400 ring-4 ring-amber-100 dark:ring-amber-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-amber-200 dark:border-amber-800'
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
        className="w-3 h-3 !bg-amber-500 dark:!bg-amber-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            {getDelayIcon()}
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-amber-100 uppercase tracking-wide">
              Wait / Delay
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
        {/* Delay duration display */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {data.delayConfig.amount}
            </div>
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide mt-1">
              {data.delayConfig.unit}
            </div>
          </div>
        </div>

        {/* Advanced settings indicators */}
        {hasAdvancedSettings && (
          <div className="mt-3 space-y-2">
            {data.delayConfig.businessHoursOnly && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <Sun className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Business hours only
                </span>
              </div>
            )}

            {data.delayConfig.skipWeekends && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Skip weekends
                </span>
              </div>
            )}

            {data.delayConfig.specificTime && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Send at {data.delayConfig.specificTime}
                </span>
              </div>
            )}
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
          <span>Wait {getDelayDuration()}</span>
          {isValid && !hasErrors && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
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
        className="w-3 h-3 !bg-amber-500 dark:!bg-amber-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-amber-500 dark:border-amber-400 rounded-xl pointer-events-none" />
      )}

      {/* Configuration Modal */}
      <DelayConfigModal
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

DelayNode.displayName = 'DelayNode';
