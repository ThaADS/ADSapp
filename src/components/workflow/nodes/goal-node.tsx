'use client';

/**
 * Goal Node Component
 *
 * Tracks conversion goals and success metrics in workflows.
 * Used to measure campaign effectiveness.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Target, Settings2, DollarSign, TrendingUp, CheckCircle, BarChart } from 'lucide-react';
import type { CustomNodeProps, GoalNodeData } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// GOAL NODE COMPONENT
// ============================================================================

export const GoalNode = memo(({ id, data, selected }: CustomNodeProps<GoalNodeData>) => {
  const { setSelectedNode } = useWorkflowStore();

  /**
   * Get goal type display name
   */
  const getGoalTypeName = () => {
    switch (data.goalConfig.goalType) {
      case 'conversion':
        return 'Conversion';
      case 'engagement':
        return 'Engagement';
      case 'revenue':
        return 'Revenue';
      case 'custom':
        return 'Custom';
      default:
        return 'Goal';
    }
  };

  /**
   * Get goal icon
   */
  const getGoalIcon = () => {
    switch (data.goalConfig.goalType) {
      case 'conversion':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'engagement':
        return <TrendingUp className="w-4 h-4 text-white" />;
      case 'revenue':
        return <DollarSign className="w-4 h-4 text-white" />;
      case 'custom':
        return <BarChart className="w-4 h-4 text-white" />;
      default:
        return <Target className="w-4 h-4 text-white" />;
    }
  };

  /**
   * Get goal type color
   */
  const getGoalColor = () => {
    switch (data.goalConfig.goalType) {
      case 'conversion':
        return {
          border: 'border-emerald-200 dark:border-emerald-800',
          selectedBorder: 'border-emerald-500 dark:border-emerald-400',
          ring: 'ring-emerald-100 dark:ring-emerald-900',
          bg: 'from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
          badge: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
          handle: '!bg-emerald-500 dark:!bg-emerald-400',
          text: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'engagement':
        return {
          border: 'border-blue-200 dark:border-blue-800',
          selectedBorder: 'border-blue-500 dark:border-blue-400',
          ring: 'ring-blue-100 dark:ring-blue-900',
          bg: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
          badge: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
          handle: '!bg-blue-500 dark:!bg-blue-400',
          text: 'text-blue-600 dark:text-blue-400',
        };
      case 'revenue':
        return {
          border: 'border-yellow-200 dark:border-yellow-800',
          selectedBorder: 'border-yellow-500 dark:border-yellow-400',
          ring: 'ring-yellow-100 dark:ring-yellow-900',
          bg: 'from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700',
          badge: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
          handle: '!bg-yellow-500 dark:!bg-yellow-400',
          text: 'text-yellow-600 dark:text-yellow-400',
        };
      default:
        return {
          border: 'border-slate-200 dark:border-slate-800',
          selectedBorder: 'border-slate-500 dark:border-slate-400',
          ring: 'ring-slate-100 dark:ring-slate-900',
          bg: 'from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700',
          badge: 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
          handle: '!bg-slate-500 dark:!bg-slate-400',
          text: 'text-slate-600 dark:text-slate-400',
        };
    }
  };

  const colors = getGoalColor();

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
          ? `${colors.selectedBorder} ring-4 ${colors.ring}`
          : hasErrors
          ? 'border-red-300 dark:border-red-700'
          : colors.border
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
        className={`w-3 h-3 ${colors.handle} border-2 border-white dark:border-slate-900`}
      />

      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.bg} px-4 py-3 rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-white/80 uppercase tracking-wide">
              Goal Tracking
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
        {/* Goal type badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full ${colors.badge}`}>
          {getGoalIcon()}
          <span className="text-xs font-medium">
            {getGoalTypeName()}
          </span>
        </div>

        {/* Goal name */}
        {data.goalConfig.goalName && (
          <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Goal Name</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.goalConfig.goalName}
            </div>
            {data.goalConfig.goalDescription && (
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {data.goalConfig.goalDescription}
              </div>
            )}
          </div>
        )}

        {/* Revenue goal */}
        {data.goalConfig.goalType === 'revenue' && data.goalConfig.revenueAmount && (
          <div className="mt-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Target Revenue</div>
                <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                  {data.goalConfig.currency || '$'}{data.goalConfig.revenueAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom metrics */}
        {data.goalConfig.goalType === 'custom' && data.goalConfig.customMetrics && Object.keys(data.goalConfig.customMetrics).length > 0 && (
          <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Custom Metrics</div>
            <div className="space-y-1">
              {Object.entries(data.goalConfig.customMetrics).slice(0, 3).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{key}:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{String(value)}</span>
                </div>
              ))}
              {Object.keys(data.goalConfig.customMetrics).length > 3 && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  +{Object.keys(data.goalConfig.customMetrics).length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tracking features */}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.goalConfig.trackInAnalytics && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full">
              <BarChart className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Analytics
              </span>
            </div>
          )}

          {data.goalConfig.notifyOnCompletion && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Notify
              </span>
            </div>
          )}
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
          <span>Conversion Tracking</span>
          {isValid && !hasErrors && (
            <span className={`font-medium ${colors.text}`}>
              ✓ Configured
            </span>
          )}
        </div>
      </div>

      {/* Output handle (bottom center) - optional for goal nodes */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className={`w-3 h-3 ${colors.handle} border-2 border-white dark:border-slate-900`}
      />

      {/* Selection indicator */}
      {selected && (
        <div className={`absolute -inset-0.5 border-2 ${colors.selectedBorder} rounded-xl pointer-events-none`} />
      )}
    </div>
  );
});

GoalNode.displayName = 'GoalNode';
