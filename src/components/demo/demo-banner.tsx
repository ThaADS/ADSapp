"use client";

import React from 'react';
import { useDemo, useDemoActions, DEMO_SCENARIOS } from '@/contexts/demo-context';

export function DemoBanner() {
  const { state } = useDemo();
  const { endDemo, resetDemo } = useDemoActions();

  if (!state.isActive) return null;

  const scenarioInfo = DEMO_SCENARIOS[state.scenario];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Left side - Demo info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">{scenarioInfo.icon}</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm">DEMO MODE</span>
                  <span className="text-white/70">|</span>
                  <span className="text-sm">{scenarioInfo.name}</span>
                </div>
                <div className="text-xs text-white/80">
                  Step {state.currentStep + 1} of {state.steps.length}: {state.steps[state.currentStep]?.title}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-xs text-white/80">Progress:</span>
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 transition-all duration-300 ease-out"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <span className="text-xs text-white/80">{Math.round(state.progress)}%</span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Quick stats */}
            <div className="hidden lg:flex items-center space-x-4 text-xs text-white/80">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{Math.floor((Date.now() - (state.analytics.startTime?.getTime() || Date.now())) / 60000)}m</span>
              </div>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{state.analytics.interactionCount}</span>
              </div>
            </div>

            {/* Action buttons */}
            <button
              onClick={resetDemo}
              className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              title="Restart Demo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={endDemo}
              className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-md transition-colors"
              title="Exit Demo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-white/80 mb-1">
          <span>Progress</span>
          <span>{Math.round(state.progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 transition-all duration-300 ease-out"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Pulsing indicator for active demo */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactDemoBanner() {
  const { state } = useDemo();
  const { endDemo } = useDemoActions();

  if (!state.isActive) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-xs">{DEMO_SCENARIOS[state.scenario].icon}</span>
        </div>
        <span className="font-medium">DEMO</span>
        <span className="text-white/70">•</span>
        <span className="text-white/90">{Math.round(state.progress)}% Complete</span>
      </div>
      <button
        onClick={endDemo}
        className="text-white/80 hover:text-white transition-colors"
        title="Exit Demo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Banner with call-to-action
export function DemoCTABanner() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const isNearCompletion = state.progress > 80;

  return (
    <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {isNearCompletion ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-lg">{DEMO_SCENARIOS[state.scenario].icon}</span>
              )}
            </div>
            <div>
              <div className="font-semibold">
                {isNearCompletion ? 'Great job! You\'re almost done!' : 'Exploring ADSapp Demo'}
              </div>
              <div className="text-sm text-white/80">
                {isNearCompletion
                  ? 'Ready to get started with your own account?'
                  : `Learning ${DEMO_SCENARIOS[state.scenario].name} workflow`
                }
              </div>
            </div>
          </div>

          {isNearCompletion && (
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Start Free Trial
              </button>
              <button className="px-4 py-2 border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors">
                Contact Sales
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}