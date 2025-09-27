"use client";

import React from 'react';
import { useDemo } from '@/contexts/demo-context';
import { DemoBanner } from './demo-banner';
import { DemoTour, TourTrigger } from './demo-tour';
import { FloatingSimulator } from './demo-simulator';
import { DemoWatermark, NotificationWatermark } from './demo-watermark';

/**
 * Global demo system wrapper that provides consistent demo experience
 * across all pages when demo mode is active
 */
export function DemoSystem({ children }: { children: React.ReactNode }) {
  const { state } = useDemo();

  return (
    <>
      {children}

      {/* Demo-specific UI overlays */}
      {state.isActive && (
        <>
          {/* Demo banner - appears on all demo pages */}
          <DemoBanner />

          {/* Demo tour system */}
          <DemoTour />
          <TourTrigger />

          {/* Floating message simulator */}
          <FloatingSimulator />

          {/* Demo watermarks */}
          <DemoWatermark variant="corner" position="bottom-right" />

          {/* Welcome notification for new demo sessions */}
          {state.currentStep === 0 && (
            <NotificationWatermark autoHide={true} duration={10000} />
          )}
        </>
      )}
    </>
  );
}

/**
 * Demo mode detector hook for conditional rendering
 */
export function useDemoMode() {
  const { state } = useDemo();

  return {
    isActive: state.isActive,
    scenario: state.scenario,
    progress: state.progress,
    currentStep: state.currentStep,
    isCompleted: state.progress >= 100,
  };
}

/**
 * Higher-order component for pages that should be demo-aware
 */
export function withDemoSystem<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function DemoAwarePage(props: P) {
    return (
      <DemoSystem>
        <WrappedComponent {...props} />
      </DemoSystem>
    );
  };
}

/**
 * Component for conditionally rendering content based on demo state
 */
export function DemoConditional({
  showInDemo = true,
  showOutsideDemo = true,
  demoContent,
  normalContent,
  children
}: {
  showInDemo?: boolean;
  showOutsideDemo?: boolean;
  demoContent?: React.ReactNode;
  normalContent?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { isActive } = useDemoMode();

  if (isActive) {
    if (!showInDemo) return null;
    return <>{demoContent || children}</>;
  } else {
    if (!showOutsideDemo) return null;
    return <>{normalContent || children}</>;
  }
}

/**
 * Demo-specific button component with consistent styling
 */
export function DemoButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white focus:ring-green-500'
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Demo metrics display component
 */
export function DemoMetrics() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const completedSteps = state.steps.filter(step => step.completed).length;
  const timeSpent = state.analytics.startTime
    ? Math.floor((Date.now() - state.analytics.startTime.getTime()) / 1000)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Demo Progress</h3>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">{Math.round(state.progress)}%</div>
          <div className="text-xs text-gray-600">Complete</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{completedSteps}</div>
          <div className="text-xs text-gray-600">Steps Done</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{Math.floor(timeSpent / 60)}m</div>
          <div className="text-xs text-gray-600">Time Spent</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{state.analytics.interactionCount}</div>
          <div className="text-xs text-gray-600">Interactions</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo breadcrumb navigation
 */
export function DemoBreadcrumb() {
  const { state } = useDemo();

  if (!state.isActive) return null;

  const currentStep = state.steps[state.currentStep];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2" aria-label="Demo progress">
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-500">Demo</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500">{state.scenario}</span>
        {currentStep && (
          <>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900">{currentStep.title}</span>
          </>
        )}
      </div>
    </nav>
  );
}

/**
 * Accessibility announcer for demo state changes
 */
export function DemoAnnouncer() {
  const { state } = useDemo();
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    if (state.isActive) {
      const currentStep = state.steps[state.currentStep];
      if (currentStep) {
        setAnnouncement(`Demo step ${state.currentStep + 1} of ${state.steps.length}: ${currentStep.title}`);
      }
    }
  }, [state.currentStep, state.steps, state.isActive]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  );
}

/**
 * Demo error boundary component
 */
export class DemoErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Demo system error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Demo System Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  Something went wrong with the demo. Please refresh the page to try again.
                </p>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}