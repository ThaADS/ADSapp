'use client';

/**
 * Wait Until Node Component
 *
 * Pauses workflow until a specific event or condition is met.
 * Can wait for tags, field changes, messages, dates, or webhooks.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Pause, Settings2, Tag, Edit, MessageCircle, Calendar, Webhook, Clock } from 'lucide-react';
import type { CustomNodeProps, WaitUntilNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// WAIT UNTIL NODE COMPONENT
// ============================================================================

export const WaitUntilNode = memo(({ id, data, selected }: CustomNodeProps<WaitUntilNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get event type display name
   */
  const getEventTypeName = () => {
    switch (data.waitUntilConfig.eventType) {
      case 'tag_applied':
        return 'Tag Applied';
      case 'field_changed':
        return 'Field Changed';
      case 'message_received':
        return 'Message Received';
      case 'specific_date':
        return 'Specific Date';
      case 'webhook_received':
        return 'Webhook Received';
      default:
        return 'Event';
    }
  };

  /**
   * Get event icon
   */
  const getEventIcon = () => {
    switch (data.waitUntilConfig.eventType) {
      case 'tag_applied':
        return <Tag className="w-4 h-4 text-white" />;
      case 'field_changed':
        return <Edit className="w-4 h-4 text-white" />;
      case 'message_received':
        return <MessageCircle className="w-4 h-4 text-white" />;
      case 'specific_date':
        return <Calendar className="w-4 h-4 text-white" />;
      case 'webhook_received':
        return <Webhook className="w-4 h-4 text-white" />;
      default:
        return <Pause className="w-4 h-4 text-white" />;
    }
  };

  /**
   * Get validation status
   */
  const isValid = data.isValid ?? false;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  /**
   * Check if has timeout
   */
  const hasTimeout = data.waitUntilConfig.timeoutEnabled;

  return (
    <div
      className={`
        relative min-w-[280px] rounded-xl border-2 shadow-lg
        transition-all duration-200
        ${selected
          ? 'border-cyan-500 dark:border-cyan-400 ring-4 ring-cyan-100 dark:ring-cyan-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-cyan-200 dark:border-cyan-800'
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
        className="w-3 h-3 !bg-cyan-500 dark:!bg-cyan-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Pause className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-cyan-100 uppercase tracking-wide">
              Wait Until
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
        {/* Event type badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded-full">
          {getEventIcon()}
          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
            {getEventTypeName()}
          </span>
        </div>

        {/* Event configuration summary */}
        <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {data.waitUntilConfig.eventType === 'tag_applied' && data.waitUntilConfig.tagId && (
              <div>Tag ID: {data.waitUntilConfig.tagId}</div>
            )}

            {data.waitUntilConfig.eventType === 'field_changed' && (
              <>
                {data.waitUntilConfig.fieldName && <div>Field: {data.waitUntilConfig.fieldName}</div>}
                {data.waitUntilConfig.expectedValue && <div>Expected: {data.waitUntilConfig.expectedValue}</div>}
              </>
            )}

            {data.waitUntilConfig.eventType === 'specific_date' && (
              <>
                {data.waitUntilConfig.date && <div>Date: {data.waitUntilConfig.date}</div>}
                {data.waitUntilConfig.time && <div>Time: {data.waitUntilConfig.time}</div>}
              </>
            )}

            {data.waitUntilConfig.eventType === 'webhook_received' && data.waitUntilConfig.webhookUrl && (
              <div className="truncate">Webhook: {data.waitUntilConfig.webhookUrl}</div>
            )}

            {data.waitUntilConfig.eventType === 'message_received' && (
              <div>Waiting for contact reply</div>
            )}
          </div>
        </div>

        {/* Timeout indicator */}
        {hasTimeout && (
          <div className="mt-3 flex items-center gap-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              Timeout: {data.waitUntilConfig.timeoutAmount} {data.waitUntilConfig.timeoutUnit}
            </span>
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
          <span>Until {getEventTypeName()}</span>
          {isValid && !hasErrors && (
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">
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
        className="w-3 h-3 !bg-cyan-500 dark:!bg-cyan-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-cyan-500 dark:border-cyan-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

WaitUntilNode.displayName = 'WaitUntilNode';
