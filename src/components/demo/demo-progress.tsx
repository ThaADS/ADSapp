"use client";

import React from 'react';
import { useDemo, useDemoAnalytics, DEMO_SCENARIOS } from '@/contexts/demo-context';

interface DemoProgressProps {
  variant?: 'default' | 'compact' | 'detailed' | 'circular';
  showStats?: boolean;
  showSteps?: boolean;
  className?: string;
}

interface ProgressStepProps {
  step: any;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick?: () => void;
}

function ProgressStep({ step, index, isActive, isCompleted, onClick }: ProgressStepProps) {
  return (
    <div
      className={`flex items-center cursor-pointer transition-all duration-200 ${
        onClick ? 'hover:bg-gray-50' : ''
      } rounded-lg p-2`}
      onClick={onClick}
    >
      {/* Step indicator */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        isCompleted
          ? 'bg-green-600 text-white'
          : isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {isCompleted ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          index + 1
        )}
      </div>

      {/* Step content */}
      <div className="ml-3 flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${
          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
        }`}>
          {step.title}
        </div>
        {step.description && (
          <div className={`text-xs truncate ${
            isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
          }`}>
            {step.description}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="ml-2">
        {step.required && !isCompleted && (
          <span className="inline-block w-2 h-2 bg-red-400 rounded-full" title="Required step" />
        )}
      </div>
    </div>
  );
}

function CircularProgress({ percentage, size = 120, strokeWidth = 8 }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-green-600 transition-all duration-500 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

export function DemoProgress({
  variant = 'default',
  showStats = true,
  showSteps = true,
  className = ''
}: DemoProgressProps) {
  const { state } = useDemo();
  const { timeSpent, completionRate, engagementScore, analytics } = useDemoAnalytics();

  if (!state.isActive) return null;

  const scenarioInfo = DEMO_SCENARIOS[state.scenario];
  const completedSteps = state.steps.filter(step => step.completed).length;

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-900">Progress</div>
          <div className="text-sm font-bold text-green-600">{Math.round(state.progress)}%</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{completedSteps}/{state.steps.length} steps</span>
          <span>{Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
        </div>
      </div>
    );
  }

  // Circular variant
  if (variant === 'circular') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <CircularProgress percentage={state.progress} />
        <div className="mt-4">
          <div className="text-lg font-semibold text-gray-900">{scenarioInfo.name}</div>
          <div className="text-sm text-gray-600">
            {completedSteps} of {state.steps.length} steps completed
          </div>
          {showStats && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">{Math.floor(timeSpent / 60)}m</div>
                <div className="text-gray-600">Time spent</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{engagementScore}/100</div>
                <div className="text-gray-600">Engagement</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Demo Progress</h3>
              <p className="text-sm text-gray-600">{scenarioInfo.name} Scenario</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{Math.round(state.progress)}%</div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          {/* Stats grid */}
          {showStats && (
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">{completedSteps}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{state.steps.length - completedSteps}</div>
                <div className="text-xs text-gray-600">Remaining</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{Math.floor(timeSpent / 60)}m</div>
                <div className="text-xs text-gray-600">Time</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{analytics.interactionCount}</div>
                <div className="text-xs text-gray-600">Actions</div>
              </div>
            </div>
          )}
        </div>

        {/* Steps list */}
        {showSteps && (
          <div className="p-4">
            <div className="space-y-1">
              {state.steps.map((step, index) => (
                <ProgressStep
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={index === state.currentStep}
                  isCompleted={step.completed}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Your Progress</h3>
          <p className="text-sm text-gray-600">{scenarioInfo.name}</p>
        </div>
        <div className="text-xl font-bold text-green-600">{Math.round(state.progress)}%</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Current step */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-900 mb-1">
          Current Step: {state.steps[state.currentStep]?.title}
        </div>
        <div className="text-xs text-gray-600">
          {state.steps[state.currentStep]?.description}
        </div>
      </div>

      {/* Quick stats */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-900">{completedSteps}/{state.steps.length}</div>
            <div className="text-gray-600">Steps</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{Math.floor(timeSpent / 60)}m</div>
            <div className="text-gray-600">Time</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{engagementScore}</div>
            <div className="text-gray-600">Score</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini progress indicator for floating UI
export function MiniProgress() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="w-16 bg-gray-200 rounded-full h-1">
        <div
          className="bg-green-600 h-1 rounded-full transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>
      <span className="text-gray-600 font-medium">{Math.round(state.progress)}%</span>
    </div>
  );
}

// Progress with milestones
export function ProgressWithMilestones() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const milestones = [25, 50, 75, 100];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Progress Milestones</h3>
      <div className="relative">
        {/* Progress line */}
        <div className="w-full bg-gray-200 rounded-full h-2 relative">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${state.progress}%` }}
          />

          {/* Milestone markers */}
          {milestones.map((milestone) => (
            <div
              key={milestone}
              className={`absolute top-0 w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-0 ${
                state.progress >= milestone ? 'bg-green-600' : 'bg-gray-300'
              }`}
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>

        {/* Milestone labels */}
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Start</span>
          <span className={state.progress >= 25 ? 'text-green-600 font-medium' : ''}>25%</span>
          <span className={state.progress >= 50 ? 'text-green-600 font-medium' : ''}>50%</span>
          <span className={state.progress >= 75 ? 'text-green-600 font-medium' : ''}>75%</span>
          <span className={state.progress >= 100 ? 'text-green-600 font-medium' : ''}>Done</span>
        </div>
      </div>
    </div>
  );
}