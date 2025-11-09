'use client';

/**
 * AI Node Component
 *
 * AI-powered actions like sentiment analysis, categorization,
 * information extraction, response generation, and translation.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Brain, Settings2, Sparkles, Tag, FileText, Languages, MessageSquare } from 'lucide-react';
import type { CustomNodeProps, AINodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// AI NODE COMPONENT
// ============================================================================

export const AINode = memo(({ id, data, selected }: CustomNodeProps<AINodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get AI action display name
   */
  const getActionName = () => {
    switch (data.aiConfig.action) {
      case 'sentiment_analysis':
        return 'Sentiment Analysis';
      case 'categorize':
        return 'Categorize';
      case 'extract_info':
        return 'Extract Information';
      case 'generate_response':
        return 'Generate Response';
      case 'translate':
        return 'Translate';
      default:
        return 'AI Action';
    }
  };

  /**
   * Get AI action icon
   */
  const getActionIcon = () => {
    switch (data.aiConfig.action) {
      case 'sentiment_analysis':
        return <Sparkles className="w-4 h-4 text-white" />;
      case 'categorize':
        return <Tag className="w-4 h-4 text-white" />;
      case 'extract_info':
        return <FileText className="w-4 h-4 text-white" />;
      case 'generate_response':
        return <MessageSquare className="w-4 h-4 text-white" />;
      case 'translate':
        return <Languages className="w-4 h-4 text-white" />;
      default:
        return <Brain className="w-4 h-4 text-white" />;
    }
  };

  /**
   * Get model badge color
   */
  const getModelColor = () => {
    switch (data.aiConfig.model) {
      case 'gpt-4':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'claude-3-sonnet':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
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
          ? 'border-purple-500 dark:border-purple-400 ring-4 ring-purple-100 dark:ring-purple-900'
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-purple-200 dark:border-purple-800'
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
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 border-2 border-white dark:border-slate-900"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-purple-100 uppercase tracking-wide">
              AI Assistant
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
        {/* Action type badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-full">
          {getActionIcon()}
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
            {getActionName()}
          </span>
        </div>

        {/* Model badge */}
        {data.aiConfig.model && (
          <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 border rounded-full ${getModelColor()}`}>
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">
              {data.aiConfig.model === 'gpt-3.5-turbo' ? 'GPT-3.5' :
               data.aiConfig.model === 'gpt-4' ? 'GPT-4' :
               data.aiConfig.model === 'claude-3-sonnet' ? 'Claude 3' :
               data.aiConfig.model}
            </span>
          </div>
        )}

        {/* Action-specific configuration */}
        <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {data.aiConfig.action === 'sentiment_analysis' && data.aiConfig.sentimentField && (
              <div>Save to: {data.aiConfig.sentimentField}</div>
            )}

            {data.aiConfig.action === 'categorize' && (
              <>
                {data.aiConfig.categories && (
                  <div>Categories: {data.aiConfig.categories.length}</div>
                )}
                {data.aiConfig.categoryField && (
                  <div>Save to: {data.aiConfig.categoryField}</div>
                )}
              </>
            )}

            {data.aiConfig.action === 'extract_info' && (
              <>
                {data.aiConfig.extractionFields && (
                  <div>Extract: {data.aiConfig.extractionFields.length} fields</div>
                )}
                {data.aiConfig.extractionPrompt && (
                  <div className="truncate">Prompt: {data.aiConfig.extractionPrompt}</div>
                )}
              </>
            )}

            {data.aiConfig.action === 'generate_response' && data.aiConfig.responsePrompt && (
              <div className="truncate">Prompt: {data.aiConfig.responsePrompt}</div>
            )}

            {data.aiConfig.action === 'translate' && (
              <>
                {data.aiConfig.sourceLanguage && (
                  <div>From: {data.aiConfig.sourceLanguage}</div>
                )}
                {data.aiConfig.targetLanguage && (
                  <div>To: {data.aiConfig.targetLanguage}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Model settings */}
        {(data.aiConfig.temperature !== undefined || data.aiConfig.maxTokens !== undefined) && (
          <div className="mt-3 flex gap-2 text-xs">
            {data.aiConfig.temperature !== undefined && (
              <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                Temp: {data.aiConfig.temperature}
              </div>
            )}
            {data.aiConfig.maxTokens !== undefined && (
              <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                Max tokens: {data.aiConfig.maxTokens}
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
          <span>AI-Powered</span>
          {isValid && !hasErrors && (
            <span className="text-purple-600 dark:text-purple-400 font-medium">
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
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 border-2 border-white dark:border-slate-900"
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -inset-0.5 border-2 border-purple-500 dark:border-purple-400 rounded-xl pointer-events-none" />
      )}
    </div>
  );
});

AINode.displayName = 'AINode';
