'use client';

/**
 * Trigger Node Component
 *
 * Represents the starting point of a workflow.
 * Triggers can be events like contact added, tag applied, webhook, etc.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Settings2 } from 'lucide-react';
import type { CustomNodeProps, TriggerNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// TRIGGER NODE COMPONENT
// ============================================================================

export const TriggerNode = memo(({ id, data, selected }: CustomNodeProps<TriggerNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get trigger type display name
   */
  const getTriggerTypeName = () => {
    switch (data.triggerType) {
      case 'contact_added':
        return 'Contact Added';
      case 'tag_applied':
        return 'Tag Applied';
      case 'webhook_received':
        return 'Webhook Received';
      case 'date_time':
        return 'Scheduled';
      case 'contact_replied':
        return 'Contact Replied';
      case 'custom_field_changed':
        return 'Field Changed';
      default:
        return 'Unknown Trigger';
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
          ? 'border-emerald-500 dark:border-emerald-400 ring-4 ring-emerald-100 dark:ring-emerald-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-emerald-200 dark:border-emerald-800'
        }
        bg-white dark:bg-slate-900
        hover:shadow-xl
      `}
      onClick={() => setSelectedNode(id)}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
              Workflow Trigger
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
        {/* Trigger type badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {getTriggerTypeName()}
          </span>
        </div>

        {/* Trigger configuration summary */}
        {data.triggerConfig && (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            {data.triggerType === 'tag_applied' && data.triggerConfig.tagIds && (
              <div>Tags: {data.triggerConfig.tagIds.length} selected</div>
            )}
            {data.triggerType === 'date_time' && data.triggerConfig.scheduledDate && (
              <div>
                {data.triggerConfig.scheduledDate} at {data.triggerConfig.scheduledTime || '00:00'}
              </div>
            )}
            {data.triggerType === 'webhook_received' && (
              <div className="truncate">Webhook configured</div>
            )}
            {data.triggerType === 'custom_field_changed' && data.triggerConfig.fieldName && (
              <div>Field: {data.triggerConfig.fieldName}</div>
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
          <span>Workflow starts here</span>
          {isValid && !hasErrors && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
        className="w-3 h-3 !bg-emerald-500 dark:!bg-emerald-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-emerald-500 dark:border-emerald-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
