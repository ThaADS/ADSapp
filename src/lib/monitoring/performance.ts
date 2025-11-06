// import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals'

// @ts-nocheck - Type definitions need review
interface Metric {
  name: string
  value: number
  id: string
}

export interface PerformanceMetrics {
  cls: number | null
  fcp: number | null
  fid: number | null
  lcp: number | null
  ttfb: number | null
  timestamp: number
  url: string
  userAgent: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Partial<PerformanceMetrics> = {}
  private isInitialized = false

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }

    this.isInitialized = true

    // Initialize Web Vitals
    getCLS(this.handleMetric.bind(this))
    getFCP(this.handleMetric.bind(this))
    getFID(this.handleMetric.bind(this))
    getLCP(this.handleMetric.bind(this))
    getTTFB(this.handleMetric.bind(this))

    // Send metrics when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics()
    })

    // Send metrics when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics()
      }
    })

    // Monitor custom performance marks
    this.monitorCustomMarks()
  }

  private handleMetric(metric: Metric): void {
    const metricName = metric.name.toLowerCase() as keyof PerformanceMetrics

    // Update local metrics
    this.metrics[metricName] = metric.value

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${metric.name}:`, metric.value)
    }

    // Send individual metric to analytics
    this.sendMetricToAnalytics(metric)
  }

  private sendMetricToAnalytics(metric: Metric): void {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        custom_parameter_1: metric.id,
        custom_parameter_2: metric.navigationType,
      })
    }

    // Send to your analytics endpoint
    this.sendToCustomAnalytics({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
    })
  }

  private async sendToCustomAnalytics(data: any): Promise<void> {
    try {
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/performance', JSON.stringify(data))
      } else {
        // Fallback to fetch
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true,
        }).catch(() => {
          // Ignore errors in performance tracking
        })
      }
    } catch (error) {
      // Ignore errors in performance tracking
    }
  }

  private sendMetrics(): void {
    const completeMetrics: PerformanceMetrics = {
      cls: this.metrics.cls || null,
      fcp: this.metrics.fcp || null,
      fid: this.metrics.fid || null,
      lcp: this.metrics.lcp || null,
      ttfb: this.metrics.ttfb || null,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.sendToCustomAnalytics({
      type: 'page-metrics',
      metrics: completeMetrics,
    })
  }

  private monitorCustomMarks(): void {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming

      if (navigation) {
        const metrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart,
          redirectTime: navigation.redirectEnd - navigation.redirectStart,
          dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
          connectTime: navigation.connectEnd - navigation.connectStart,
          requestTime: navigation.responseEnd - navigation.requestStart,
        }

        this.sendToCustomAnalytics({
          type: 'navigation-timing',
          metrics,
          timestamp: Date.now(),
          url: window.location.href,
        })
      }
    })

    // Monitor resource timing
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming

          // Track slow resources
          if (resource.duration > 1000) {
            this.sendToCustomAnalytics({
              type: 'slow-resource',
              name: resource.name,
              duration: resource.duration,
              size: resource.transferSize,
              timestamp: Date.now(),
            })
          }
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  // Custom performance tracking methods
  startTiming(name: string): void {
    performance.mark(`${name}-start`)
  }

  endTiming(name: string): number {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    const measure = performance.getEntriesByName(name, 'measure')[0]
    const duration = measure.duration

    this.sendToCustomAnalytics({
      type: 'custom-timing',
      name,
      duration,
      timestamp: Date.now(),
      url: window.location.href,
    })

    return duration
  }

  // API response time tracking
  trackApiCall(url: string, method: string, duration: number, status: number): void {
    this.sendToCustomAnalytics({
      type: 'api-call',
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
    })
  }

  // User interaction tracking
  trackUserInteraction(action: string, element: string, duration?: number): void {
    this.sendToCustomAnalytics({
      type: 'user-interaction',
      action,
      element,
      duration,
      timestamp: Date.now(),
      url: window.location.href,
    })
  }

  // Error tracking
  trackError(error: Error, context?: any): void {
    this.sendToCustomAnalytics({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      url: window.location.href,
    })
  }
}

// Initialize performance monitoring
export const performanceMonitor = PerformanceMonitor.getInstance()

// Utility functions
export function withPerformanceTracking<T extends (...args: any[]) => any>(fn: T, name: string): T {
  return ((...args: any[]) => {
    performanceMonitor.startTiming(name)
    const result = fn(...args)

    if (result instanceof Promise) {
      return result.finally(() => {
        performanceMonitor.endTiming(name)
      })
    } else {
      performanceMonitor.endTiming(name)
      return result
    }
  }) as T
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now()

  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime
      performanceMonitor.sendToCustomAnalytics({
        type: 'component-render',
        component: componentName,
        duration: renderTime,
        timestamp: Date.now(),
        url: window.location.href,
      })
    },
  }
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    performanceMonitor.trackError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', event => {
    performanceMonitor.trackError(new Error(event.reason), {
      type: 'unhandled-promise-rejection',
    })
  })
}

declare global {
  function gtag(...args: any[]): void
}
