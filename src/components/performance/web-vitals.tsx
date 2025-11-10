'use client'

/**
 * Web Vitals Tracking Component
 *
 * Automatically tracks Core Web Vitals and sends them to the analytics endpoint
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - FID (First Input Delay): Measures interactivity
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FCP (First Contentful Paint): Measures time to first paint
 * - TTFB (Time to First Byte): Measures server response time
 */

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send metric to analytics endpoint
    const body = JSON.stringify({
      type: 'web-vital',
      name: metric.name,
      value: metric.value,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    })

    // Use sendBeacon for reliability (works even when page is unloading)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/performance', body)
    } else {
      // Fallback to fetch with keepalive
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't break the app for analytics
      })
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value)
    }
  })

  // Track custom performance marks
  useEffect(() => {
    // Track when component mounts (client-side hydration complete)
    const hydrationTime = performance.now()

    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'custom-timing',
        name: 'hydration-time',
        value: hydrationTime,
        timestamp: Date.now(),
        url: window.location.href,
      }),
    }).catch(() => {
      // Silently fail
    })
  }, [])

  return null // This component doesn't render anything
}
