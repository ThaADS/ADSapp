'use client';

/**
 * Webhook Node Component
 *
 * Calls external webhook APIs with authentication and retry support.
 */

import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Webhook, Settings2, Lock, RefreshCw } from 'lucide-react';
import type { CustomNodeProps, WebhookNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';
import { WebhookConfigModal } from '../config-modals';

// ============================================================================
// WEBHOOK NODE COMPONENT
// ============================================================================

export const WebhookNode = memo(({ id, data, selected }: CustomNodeProps<WebhookNodeData>) => {
  const { setSelectedNode, updateNode } = useWorkflowStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  /**
   * Get HTTP method badge color
   */
  const getMethodColor = () => {
    switch (data.webhookConfig.method) {
      case 'GET':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'POST':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'PUT':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'PATCH':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  /**
   * Get validation status
   */
  const isValid = data.isValid ?? false;
  const hasErrors = data.validationErrors && data.validationErrors.length > 0;

  /**
   * Check features
   */
  const hasAuth = data.webhookConfig.authType && data.webhookConfig.authType !== 'none';
  const hasRetry = data.webhookConfig.retryOnFailure;

  return (
    <div
      className={`
        relative min-w-[280px] rounded-xl border-2 shadow-lg
        transition-all duration-200
        ${selected
          ? 'border-teal-500 dark:border-teal-400 ring-4 ring-teal-100 dark:ring-teal-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-teal-200 dark:border-teal-800'
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
        className="w-3 h-3 !bg-teal-500 dark:!bg-teal-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Webhook className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-teal-100 uppercase tracking-wide">
              Webhook
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
        {/* HTTP method badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full ${getMethodColor()}`}>
          <span className="text-xs font-bold">{data.webhookConfig.method}</span>
        </div>

        {/* URL display */}
        {data.webhookConfig.url && (
          <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Endpoint</div>
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              {data.webhookConfig.url}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-3 flex flex-wrap gap-2">
          {hasAuth && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-full">
              <Lock className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                {data.webhookConfig.authType}
              </span>
            </div>
          )}

          {hasRetry && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-full">
              <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Retry: {data.webhookConfig.maxRetries || 3}x
              </span>
            </div>
          )}

          {data.webhookConfig.saveResponse && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Save Response
              </span>
            </div>
          )}
        </div>

        {/* Additional config */}
        {(data.webhookConfig.headers && Object.keys(data.webhookConfig.headers).length > 0) && (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Headers: {Object.keys(data.webhookConfig.headers).length} custom
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
          <span>API Call</span>
          {isValid && !hasErrors && (
            <span className="text-teal-600 dark:text-teal-400 font-medium">
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
        className="w-3 h-3 !bg-teal-500 dark:!bg-teal-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-teal-500 dark:border-teal-400 rounded-xl pointer-events-none" />
      )}

      {/* Configuration Modal */}
      <WebhookConfigModal
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

WebhookNode.displayName = 'WebhookNode';
