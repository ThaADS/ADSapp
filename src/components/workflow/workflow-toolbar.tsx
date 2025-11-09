'use client';

/**
 * Workflow Toolbar - Canvas Controls
 *
 * Top toolbar with workflow actions: save, test, validate, undo/redo, etc.
 */

import React, { useState } from 'react';
import {
  Save,
  Play,
  AlertCircle,
  CheckCircle,
  Undo2,
  Redo2,
  Download,
  Upload,
  Settings,
  Eye,
  Loader2,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

export function WorkflowToolbar() {
  const {
    workflow,
    isDirty,
    isSaving,
    validationResult,
    canUndo,
    canRedo,
    undo,
    redo,
    validateWorkflow,
    saveWorkflow,
    exportWorkflow,
  } = useWorkflowStore();

  const [isValidating, setIsValidating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  /**
   * Handle validate workflow
   */
  const handleValidate = () => {
    setIsValidating(true);
    const result = validateWorkflow();
    setShowValidation(true);
    setTimeout(() => setIsValidating(false), 300);
  };

  /**
   * Handle save workflow
   */
  const handleSave = async () => {
    try {
      await saveWorkflow();
      // TODO: Show success toast
    } catch (error) {
      console.error('Save failed:', error);
      // TODO: Show error toast
    }
  };

  /**
   * Handle export workflow
   */
  const handleExport = () => {
    try {
      const data = exportWorkflow();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-${workflow?.name || 'untitled'}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    }
  };

  /**
   * Handle test workflow
   */
  const handleTest = () => {
    // TODO: Implement test workflow functionality
    console.log('Test workflow');
  };

  const hasErrors = validationResult?.errors.some((e) => e.severity === 'error') ?? false;
  const hasWarnings = validationResult?.errors.some((e) => e.severity === 'warning') ?? false;

  return (
    <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
      {/* Left side - Workflow info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {workflow?.name || 'Untitled Workflow'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {workflow?.type ? workflow.type.replace('_', ' ').toUpperCase() : 'New Workflow'}
            {isDirty && <span className="ml-2 text-amber-600 dark:text-amber-400">(Unsaved changes)</span>}
          </p>
        </div>
      </div>

      {/* Center - Quick actions */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

        {/* Validate */}
        <button
          onClick={handleValidate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          title="Validate workflow"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
          ) : validationResult?.isValid ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : hasErrors ? (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          ) : hasWarnings ? (
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Validate
          </span>

          {/* Error/warning badge */}
          {validationResult && (validationResult.errors.length > 0) && (
            <span className={`
              absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center
              ${hasErrors
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
              }
            `}>
              {validationResult.errors.length}
            </span>
          )}
        </button>

        {/* Test */}
        <button
          onClick={handleTest}
          disabled={!validationResult?.isValid}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-100 dark:bg-violet-900 hover:bg-violet-200 dark:hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Test workflow"
        >
          <Play className="w-4 h-4 text-violet-700 dark:text-violet-300" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Test
          </span>
        </button>
      </div>

      {/* Right side - Main actions */}
      <div className="flex items-center gap-2">
        {/* Export */}
        <button
          onClick={handleExport}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Export workflow"
        >
          <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Import */}
        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Import workflow"
        >
          <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Workflow settings"
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Save className="w-4 h-4 text-white" />
          )}
          <span className="text-sm font-medium text-white">
            {isSaving ? 'Saving...' : 'Save'}
          </span>
        </button>
      </div>

      {/* Validation results panel */}
      {showValidation && validationResult && validationResult.errors.length > 0 && (
        <div className="absolute top-16 right-4 w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Validation Results
            </h3>
            <button
              onClick={() => setShowValidation(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {validationResult.errors.map((error, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${
                  error.severity === 'error'
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{error.message}</p>
                    {error.nodeId && (
                      <p className="text-xs opacity-75 mt-1">Node: {error.nodeId}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
