'use client';

/**
 * Message Node Component
 *
 * Represents sending a WhatsApp message in the workflow.
 * Can use templates or custom messages with personalization.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Settings2, Image, FileText } from 'lucide-react';
import type { CustomNodeProps, MessageNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// MESSAGE NODE COMPONENT
// ============================================================================

export const MessageNode = memo(({ id, data, selected }: CustomNodeProps<MessageNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get message preview (truncated)
   */
  const getMessagePreview = () => {
    const message = data.messageConfig.customMessage || 'No message configured';
    return message.length > 80 ? `${message.substring(0, 80)}...` : message;
  };

  /**
   * Get media icon
   */
  const getMediaIcon = () => {
    switch (data.messageConfig.mediaType) {
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'document':
        return <FileText className="w-3 h-3" />;
      default:
        return null;
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
          ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-100 dark:ring-blue-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-blue-200 dark:border-blue-800'
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
        className="w-3 h-3 !bg-blue-500 dark:!bg-blue-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-blue-100 uppercase tracking-wide">
              Send Message
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
        {/* Message type badge */}
        <div className="flex items-center gap-2 mb-3">
          {data.messageConfig.templateId ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
              <FileText className="w-3 h-3" />
              Template
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
              Custom Message
            </span>
          )}

          {/* Media badge */}
          {data.messageConfig.mediaUrl && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300">
              {getMediaIcon()}
              Media
            </span>
          )}

          {/* Personalization badge */}
          {data.messageConfig.useContactName && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Personalized
            </span>
          )}
        </div>

        {/* Message preview */}
        {data.messageConfig.customMessage && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {getMessagePreview()}
            </p>
          </div>
        )}

        {/* Template info */}
        {data.messageConfig.templateId && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Template ID: {data.messageConfig.templateId}
            </p>
            {data.messageConfig.variables && Object.keys(data.messageConfig.variables).length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Variables: {Object.keys(data.messageConfig.variables).length}
              </p>
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
          <span>WhatsApp Message</span>
          {isValid && !hasErrors && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              ✓ Ready
            </span>
          )}
        </div>
      </div>

      {/* Output handle (bottom center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 !bg-blue-500 dark:!bg-blue-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-blue-500 dark:border-blue-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

MessageNode.displayName = 'MessageNode';
