'use client';

/**
 * Workflow Validation Panel
 *
 * Real-time validation feedback with visual indicators and error reporting.
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// VALIDATION PANEL COMPONENT
// ============================================================================

export function WorkflowValidationPanel() {
  const { validationResult, nodes, edges } = useWorkflowStore();

  if (!validationResult) {
    return null;
  }

  const errors = validationResult.errors.filter((e) => e.severity === 'error');
  const warnings = validationResult.errors.filter((e) => e.severity === 'warning');

  return (
    <div className="absolute top-4 right-4 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {validationResult.isValid ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Workflow Valid
              </h3>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Validation Issues
              </h3>
            </>
          )}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          {nodes.length} nodes, {edges.length} connections
        </p>
      </div>

      {/* Validation Results */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-100">
              <AlertCircle className="w-4 h-4" />
              <span>Errors ({errors.length})</span>
            </div>
            {errors.map((error, index) => (
              <div
                key={index}
                className="ml-6 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-sm text-red-900 dark:text-red-100">
                  {error.message}
                </p>
                {error.nodeId && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Node: {error.nodeId}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-4 h-4" />
              <span>Warnings ({warnings.length})</span>
            </div>
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="ml-6 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {warning.message}
                </p>
                {warning.nodeId && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Node: {warning.nodeId}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Success State */}
        {validationResult.isValid && errors.length === 0 && warnings.length === 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="text-sm text-green-900 dark:text-green-100">
                <p className="font-medium">Workflow is ready!</p>
                <p className="text-green-700 dark:text-green-300 mt-1">
                  All nodes are properly configured and connected. You can activate this workflow.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!validationResult.isValid && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={() => {
              // Auto-fix suggestions would go here
              console.log('Auto-fix validation issues');
            }}
            className="w-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            Show Suggested Fixes
          </button>
        </div>
      )}
    </div>
  );
}
