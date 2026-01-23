// Real-time updates and performance optimization utilities

import { useEffect, useRef, useCallback, useState } from 'react'

// WebSocket connection manager
export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Set<Function>> = new Map()
  private isConnecting = false

  constructor(
    private url: string,
    private protocols?: string[]
  ) {}

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve()
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, this.protocols)

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data)
            this.emit('message', data)
            this.emit(data.type, data.payload)
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error)
          }
        }

        this.ws.onclose = event => {
          console.log('[WebSocket] Disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          this.emit('disconnected', { code: event.code, reason: event.reason })

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = error => {
          console.error('[WebSocket] Error:', error)
          this.isConnecting = false
          this.emit('error', error)
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  send(type: string, payload: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message: connection not open')
      return false
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }))
      return true
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error)
      return false
    }
  }

  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)

    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('[WebSocket] Event callback error:', error)
        }
      })
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error)
      })
    }, delay)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

// React hook for WebSocket
export function useWebSocket(url: string, protocols?: string[]) {
  const wsRef = useRef<WebSocketManager | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected')

  useEffect(() => {
    wsRef.current = new WebSocketManager(url, protocols)

    const unsubscribeConnected = wsRef.current.on('connected', () => {
      setIsConnected(true)
      setConnectionState('connected')
    })

    const unsubscribeDisconnected = wsRef.current.on('disconnected', () => {
      setIsConnected(false)
      setConnectionState('disconnected')
    })

    const unsubscribeError = wsRef.current.on('error', () => {
      setConnectionState('error')
    })

    wsRef.current.connect().catch(error => {
      console.error('Failed to connect WebSocket:', error)
      setConnectionState('error')
    })

    return () => {
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeError()
      wsRef.current?.disconnect()
    }
  }, [url, protocols])

  const send = useCallback((type: string, payload: any) => {
    return wsRef.current?.send(type, payload) ?? false
  }, [])

  const subscribe = useCallback((event: string, callback: Function) => {
    return wsRef.current?.on(event, callback) ?? (() => {})
  }, [])

  return {
    send,
    subscribe,
    isConnected,
    connectionState,
    disconnect: () => wsRef.current?.disconnect(),
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initObservers()
  }

  private initObservers(): void {
    // Measure navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.navigationStart)
              this.recordMetric(
                'dom-content-loaded',
                navEntry.domContentLoadedEventEnd - navEntry.navigationStart
              )
              this.recordMetric('first-byte', navEntry.responseStart - navEntry.navigationStart)
            }
          })
        })

        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navigationObserver)
      } catch (error) {
        console.warn('Navigation timing observer not supported')
      }

      // Measure resource timing
      try {
        const resourceObserver = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming
              this.recordMetric(
                'resource-load',
                resourceEntry.responseEnd - resourceEntry.startTime
              )
            }
          })
        })

        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (error) {
        console.warn('Resource timing observer not supported')
      }

      // Measure paint timing
      try {
        const paintObserver = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'paint') {
              this.recordMetric(entry.name, entry.startTime)
            }
          })
        })

        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)
      } catch (error) {
        console.warn('Paint timing observer not supported')
      }

      // Measure largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            this.recordMetric('largest-contentful-paint', entry.startTime)
          })
        })

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (error) {
        console.warn('LCP observer not supported')
      }

      // Measure layout shifts
      try {
        const clsObserver = new PerformanceObserver(list => {
          let clsValue = 0
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += (entry as any).value
            }
          })
          this.recordMetric('cumulative-layout-shift', clsValue)
        })

        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (error) {
        console.warn('CLS observer not supported')
      }
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const values = this.metrics.get(name)!
    values.push(value)

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetric(name: string): { avg: number; min: number; max: number; latest: number } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    }
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; latest: number }> {
    const result: Record<string, any> = {}
    this.metrics.forEach((values, name) => {
      result[name] = this.getMetric(name)
    })
    return result
  }

  measureFunction<T extends any[], R>(name: string, fn: (...args: T) => R): (...args: T) => R {
    return (...args: T): R => {
      const start = performance.now()
      const result = fn(...args)
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    }
  }

  measureAsyncFunction<T extends any[], R>(
    name: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const start = performance.now()
      const result = await fn(...args)
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    }
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = useRef<PerformanceMonitor | null>(null)

  useEffect(() => {
    monitor.current = new PerformanceMonitor()
    return () => monitor.current?.destroy()
  }, [])

  const recordMetric = useCallback((name: string, value: number) => {
    monitor.current?.recordMetric(name, value)
  }, [])

  const getMetric = useCallback((name: string) => {
    return monitor.current?.getMetric(name) ?? null
  }, [])

  const getAllMetrics = useCallback(() => {
    return monitor.current?.getAllMetrics() ?? {}
  }, [])

  const measureFunction = useCallback(<T extends any[], R>(name: string, fn: (...args: T) => R) => {
    return monitor.current?.measureFunction(name, fn) ?? fn
  }, [])

  const measureAsyncFunction = useCallback(
    <T extends any[], R>(name: string, fn: (...args: T) => Promise<R>) => {
      return monitor.current?.measureAsyncFunction(name, fn) ?? fn
    },
    []
  )

  return {
    recordMetric,
    getMetric,
    getAllMetrics,
    measureFunction,
    measureAsyncFunction,
  }
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  )

  const paddingTop = Math.max(0, (visibleStart - overscan) * itemHeight)
  const paddingBottom = Math.max(0, (items.length - visibleEnd - 1 - overscan) * itemHeight)

  const visibleItems = items.slice(
    Math.max(0, visibleStart - overscan),
    Math.min(items.length, visibleEnd + 1 + overscan)
  )

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    paddingTop,
    paddingBottom,
    handleScroll,
    totalHeight: items.length * itemHeight,
  }
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value)
          lastRan.current = Date.now()
        }
      },
      limit - (Date.now() - lastRan.current)
    )

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

// Intersection Observer hook
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [element, setElement] = useState<Element | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  const setRef = useCallback((el: Element | null) => {
    setElement(el)
  }, [])

  useEffect(() => {
    if (!element) return

    observer.current = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.current.observe(element)

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [element, options])

  return [setRef, isIntersecting]
}

// Memory usage monitor
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000)

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  })

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image()
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
      }
      img.onerror = () => {
        setIsError(true)
      }
      img.src = src
    }
  }, [isIntersecting, src])

  return {
    ref,
    imageSrc,
    isLoaded,
    isError,
  }
}
