"use client";

import React from 'react';
import { useDemo, DEMO_SCENARIOS } from '@/contexts/demo-context';

interface DemoWatermarkProps {
  variant?: 'corner' | 'banner' | 'floating' | 'overlay';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  showScenario?: boolean;
  animated?: boolean;
  className?: string;
}

export function DemoWatermark({
  variant = 'corner',
  position = 'bottom-right',
  opacity = 0.8,
  showScenario = true,
  animated = true,
  className = ''
}: DemoWatermarkProps) {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const scenarioInfo = DEMO_SCENARIOS[state.scenario];

  // Corner watermark (default)
  if (variant === 'corner') {
    const positionClasses = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };

    return (
      <div
        className={`fixed ${positionClasses[position]} z-40 pointer-events-none ${className}`}
        style={{ opacity }}
      >
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg ${
          animated ? 'animate-pulse' : ''
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">D</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">DEMO MODE</div>
              {showScenario && (
                <div className="text-xs text-gray-600">{scenarioInfo.name}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner watermark
  if (variant === 'banner') {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 ${className}`}
        style={{ opacity }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg">{scenarioInfo.icon}</span>
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">
                🎭 DEMO MODE - {showScenario ? scenarioInfo.name : 'Interactive Preview'}
              </div>
              <div className="text-xs opacity-80">
                This is a demonstration. Real data is not affected.
              </div>
            </div>
          </div>
        </div>

        {/* Animated border */}
        {animated && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/50 to-white/0">
            <div className="h-full bg-white/30 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Floating watermark
  if (variant === 'floating') {
    return (
      <div
        className={`fixed bottom-6 left-6 z-30 ${className}`}
        style={{ opacity }}
      >
        <div className={`bg-black/80 text-white rounded-full px-4 py-2 shadow-xl ${
          animated ? 'animate-bounce' : ''
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium">DEMO</span>
            {showScenario && (
              <>
                <span className="text-white/60">•</span>
                <span className="text-white/80">{scenarioInfo.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Overlay watermark
  if (variant === 'overlay') {
    return (
      <div
        className={`fixed inset-0 pointer-events-none z-10 ${className}`}
        style={{ opacity: opacity * 0.1 }} // Much more transparent for overlay
      >
        {/* Diagonal watermark pattern */}
        <div className="absolute inset-0 flex items-center justify-center transform rotate-45">
          <div className="text-6xl font-bold text-gray-400 select-none">
            DEMO MODE
          </div>
        </div>

        {/* Corner badges */}
        <div className="absolute top-0 left-0 right-0 flex justify-between p-4">
          <div className="bg-blue-600/20 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
            🎭 Demo
          </div>
          <div className="bg-green-600/20 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
            {scenarioInfo.icon} {showScenario ? scenarioInfo.name : 'Preview'}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Compact inline watermark for content areas
export function InlineWatermark({
  showIcon = true,
  className = ''
}: {
  showIcon?: boolean;
  className?: string;
}) {
  const { state } = useDemo();

  if (!state.isActive) return null;

  return (
    <div className={`inline-flex items-center space-x-2 text-xs text-gray-600 ${className}`}>
      {showIcon && (
        <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">D</span>
        </div>
      )}
      <span className="font-medium">Demo Mode</span>
    </div>
  );
}

// Progress-aware watermark
export function ProgressWatermark() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">D</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Demo Mode</span>
        </div>
        <span className="text-xs font-bold text-green-600">{Math.round(state.progress)}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      <div className="text-xs text-gray-600">
        Step {state.currentStep + 1} of {state.steps.length}: {state.steps[state.currentStep]?.title}
      </div>
    </div>
  );
}

// Notification-style watermark
export function NotificationWatermark({
  autoHide = false,
  duration = 5000
}: {
  autoHide?: boolean;
  duration?: number;
}) {
  const { state } = useDemo();
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHide && state.isActive) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, state.isActive]);

  if (!state.isActive || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-xl p-4 transform transition-all duration-300 hover:scale-105">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{DEMO_SCENARIOS[state.scenario].icon}</span>
            </div>
            <div>
              <div className="font-semibold">Demo Mode Active</div>
              <div className="text-blue-100 text-sm mt-1">
                You're exploring {DEMO_SCENARIOS[state.scenario].name} scenario
              </div>
              <div className="text-xs text-blue-200 mt-2">
                Step {state.currentStep + 1} of {state.steps.length} • {Math.round(state.progress)}% complete
              </div>
            </div>
          </div>

          {autoHide && (
            <button
              onClick={() => setIsVisible(false)}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Contextual watermark that adapts to content
export function ContextualWatermark({
  context = 'general'
}: {
  context?: 'inbox' | 'analytics' | 'automation' | 'general';
}) {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const contextMessages = {
    inbox: 'Demo conversations with sample customers',
    analytics: 'Sample analytics data for demonstration',
    automation: 'Simulated automation workflows',
    general: 'Interactive demo environment'
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Demo Mode:</span> {contextMessages[context]}
          </p>
        </div>
      </div>
    </div>
  );
}