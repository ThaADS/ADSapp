'use client'

/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly fallback UI
 */

import { Component, ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Settings-specific error boundary with contextual error messages
 */
export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings Error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="max-w-md bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Instellingen konden niet worden geladen
            </h3>
            <p className="text-sm text-amber-700 mb-4">
              {this.state.error?.message || 'Er is een fout opgetreden bij het laden van de instellingen.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => this.setState({ hasError: false })}>
                Opnieuw proberen
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Pagina vernieuwen
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Er ging iets mis
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {this.state.error?.message || 'Onbekende fout'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => this.setState({ hasError: false })}>
                Probeer Opnieuw
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
              >
                Terug naar Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
