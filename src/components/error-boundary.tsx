'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className='flex min-h-[400px] items-center justify-center p-6'>
          <div className='w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm'>
            <div className='mb-6 flex items-center justify-center'>
              <div className='rounded-full bg-red-100 p-3'>
                <AlertTriangle className='h-8 w-8 text-red-600' />
              </div>
            </div>

            <h2 className='mb-2 text-center text-xl font-semibold text-gray-900'>
              Something went wrong
            </h2>

            <p className='mb-6 text-center text-sm text-gray-600'>
              We encountered an error while loading this section. This has been logged and our team
              will investigate.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='mb-6'>
                <summary className='mb-2 cursor-pointer text-xs text-gray-500 hover:text-gray-700'>
                  Error Details (Development Only)
                </summary>
                <div className='max-h-40 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs text-red-600'>
                  <div className='mb-1 font-semibold'>{this.state.error.toString()}</div>
                  {this.state.errorInfo && (
                    <pre className='whitespace-pre-wrap text-gray-600'>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className='flex flex-col gap-3 sm:flex-row'>
              <button
                onClick={this.handleReset}
                className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
              >
                <RefreshCw className='h-4 w-4' />
                Try Again
              </button>

              <button
                onClick={() => (window.location.href = '/dashboard')}
                className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none'
              >
                <Home className='h-4 w-4' />
                Go to Dashboard
              </button>
            </div>

            <p className='mt-6 text-center text-xs text-gray-500'>
              If this problem persists, please{' '}
              <a
                href='mailto:support@adsapp.com'
                className='text-emerald-600 underline hover:text-emerald-700'
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundary for settings pages
export function SettingsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className='flex min-h-[400px] items-center justify-center p-6'>
          <div className='w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-sm'>
            <div className='mb-6 flex items-center justify-center'>
              <div className='rounded-full bg-red-100 p-3'>
                <AlertTriangle className='h-8 w-8 text-red-600' />
              </div>
            </div>

            <h2 className='mb-2 text-center text-xl font-semibold text-gray-900'>
              Unable to load settings
            </h2>

            <p className='mb-6 text-center text-sm text-gray-600'>
              We encountered an error while loading your settings. This could be due to a temporary
              issue or missing data.
            </p>

            <div className='flex flex-col gap-3'>
              <button
                onClick={() => window.location.reload()}
                className='flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
              >
                <RefreshCw className='h-4 w-4' />
                Reload Page
              </button>

              <button
                onClick={() => (window.location.href = '/dashboard/settings')}
                className='flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none'
              >
                <Home className='h-4 w-4' />
                Back to Settings
              </button>
            </div>
          </div>
        </div>
      }
      onReset={() => {
        // You could add analytics tracking here
        console.log('Settings error boundary reset')
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
