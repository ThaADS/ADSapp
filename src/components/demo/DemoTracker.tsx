// @ts-nocheck - Type definitions need review
'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AdvancedDemoAnalytics, HeatMapData } from '@/lib/demo-analytics-advanced'
import { ABTestingFramework, TestConfiguration } from '@/lib/ab-testing'
import { ConversionOptimizationEngine } from '@/lib/conversion-optimization'
import { createClient } from '@supabase/supabase-js'

interface DemoTrackerProps {
  sessionId: string
  businessScenario: string
  children: React.ReactNode
  enableHeatMapping?: boolean
  enableScrollTracking?: boolean
  enableFormTracking?: boolean
  enableClickTracking?: boolean
  enableTimeTracking?: boolean
  onConversion?: (conversionData: any) => void
  onEngagementMilestone?: (milestone: string, data: any) => void
}

interface TrackingEvent {
  type: 'click' | 'scroll' | 'hover' | 'form_interaction' | 'page_view' | 'conversion'
  element?: HTMLElement
  position?: { x: number; y: number }
  data?: any
  timestamp: number
}

interface EngagementMilestone {
  name: string
  threshold: number
  type: 'time' | 'clicks' | 'scrolls' | 'features'
  achieved: boolean
  timestamp?: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const DemoTracker: React.FC<DemoTrackerProps> = ({
  sessionId,
  businessScenario,
  children,
  enableHeatMapping = true,
  enableScrollTracking = true,
  enableFormTracking = true,
  enableClickTracking = true,
  enableTimeTracking = true,
  onConversion,
  onEngagementMilestone,
}) => {
  const [analytics] = useState(() => new AdvancedDemoAnalytics(supabase))
  const [abTesting] = useState(() => new ABTestingFramework(supabase))
  const [conversionEngine] = useState(() => new ConversionOptimizationEngine(supabase))
  const [testConfiguration, setTestConfiguration] = useState<TestConfiguration | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [engagementScore, setEngagementScore] = useState(0)
  const [heatMapData, setHeatMapData] = useState<HeatMapData[]>([])

  // Tracking state
  const trackingData = useRef({
    startTime: Date.now(),
    totalClicks: 0,
    totalScrolls: 0,
    featuresUsed: new Set<string>(),
    currentPage: window.location.pathname,
    sessionEvents: [] as TrackingEvent[],
    lastActivity: Date.now(),
    engagementMilestones: [
      { name: 'first_minute', threshold: 60000, type: 'time', achieved: false },
      { name: 'active_engagement', threshold: 5, type: 'clicks', achieved: false },
      { name: 'deep_exploration', threshold: 3, type: 'features', achieved: false },
      { name: 'scroll_engagement', threshold: 10, type: 'scrolls', achieved: false },
    ] as EngagementMilestone[],
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Initialize tracking
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        // Get A/B test configuration
        const config = await abTesting.getTestConfiguration(sessionId)
        setTestConfiguration(config)

        // Start tracking
        setIsTracking(true)

        // Track initial page view
        await trackPageView()

        // Calculate initial lead score
        await updateLeadScore()
      } catch (error) {
        console.error('Error initializing demo tracking:', error)
      }
    }

    initializeTracking()
  }, [sessionId])

  // Track page view
  const trackPageView = useCallback(async () => {
    const currentPath = window.location.pathname
    trackingData.current.currentPage = currentPath

    try {
      await analytics.trackEvent(sessionId, {
        event_type: 'page_view',
        action: 'page_visited',
        category: 'navigation',
        label: currentPath,
        metadata: {
          page_title: document.title,
          referrer: document.referrer,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        },
      })

      // Update engagement score
      updateEngagementScore()
    } catch (error) {
      console.error('Error tracking page view:', error)
    }
  }, [sessionId, analytics])

  // Track click events
  const trackClick = useCallback(
    async (event: MouseEvent) => {
      if (!enableClickTracking || !isTracking) return

      const target = event.target as HTMLElement
      const elementId = target.id || target.className || target.tagName
      const position = { x: event.clientX, y: event.clientY }

      trackingData.current.totalClicks++
      trackingData.current.lastActivity = Date.now()

      try {
        // Track heat map data
        if (enableHeatMapping) {
          await analytics.trackHeatMapInteraction(
            sessionId,
            elementId,
            trackingData.current.currentPage,
            position,
            'click',
            0,
            {
              type: target.tagName.toLowerCase(),
              text: target.textContent?.substring(0, 100),
              tagName: target.tagName,
              className: target.className,
            },
            { width: window.innerWidth, height: window.innerHeight }
          )
        }

        // Track feature interaction
        const featureName = getFeatureName(target)
        if (featureName) {
          trackingData.current.featuresUsed.add(featureName)

          await analytics.trackEvent(sessionId, {
            event_type: 'feature_interaction',
            action: 'feature_clicked',
            category: 'demo',
            label: featureName,
            metadata: {
              element_id: elementId,
              element_text: target.textContent?.substring(0, 100),
              position,
            },
          })
        }

        // Check for conversion events
        if (isConversionElement(target)) {
          await trackConversion(target)
        }

        // Update engagement score
        updateEngagementScore()
        checkEngagementMilestones()
      } catch (error) {
        console.error('Error tracking click:', error)
      }
    },
    [enableClickTracking, enableHeatMapping, isTracking, sessionId, analytics]
  )

  // Track hover events
  const trackHover = useCallback(
    async (event: MouseEvent) => {
      if (!enableHeatMapping || !isTracking) return

      const target = event.target as HTMLElement
      const elementId = target.id || target.className || target.tagName
      const position = { x: event.clientX, y: event.clientY }

      // Clear existing timeout for this element
      const existingTimeout = hoverTimeouts.current.get(elementId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set new timeout to track hover duration
      const timeout = setTimeout(async () => {
        try {
          await analytics.trackHeatMapInteraction(
            sessionId,
            elementId,
            trackingData.current.currentPage,
            position,
            'hover',
            1000, // 1 second hover
            {
              type: target.tagName.toLowerCase(),
              text: target.textContent?.substring(0, 100),
            }
          )
        } catch (error) {
          console.error('Error tracking hover:', error)
        }
      }, 1000)

      hoverTimeouts.current.set(elementId, timeout)
    },
    [enableHeatMapping, isTracking, sessionId, analytics]
  )

  // Track scroll events
  const trackScroll = useCallback(async () => {
    if (!enableScrollTracking || !isTracking) return

    trackingData.current.totalScrolls++
    trackingData.current.lastActivity = Date.now()

    try {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )

      await analytics.trackEvent(sessionId, {
        event_type: 'scroll',
        action: 'page_scroll',
        category: 'engagement',
        value: scrollPercentage,
        metadata: {
          scroll_y: window.scrollY,
          page_height: document.documentElement.scrollHeight,
          viewport_height: window.innerHeight,
        },
      })

      updateEngagementScore()
      checkEngagementMilestones()
    } catch (error) {
      console.error('Error tracking scroll:', error)
    }
  }, [enableScrollTracking, isTracking, sessionId, analytics])

  // Track form interactions
  const trackFormInteraction = useCallback(
    async (event: Event) => {
      if (!enableFormTracking || !isTracking) return

      const target = event.target as HTMLInputElement
      const formElement = target.closest('form')
      const fieldName = target.name || target.id || 'unknown_field'

      try {
        await analytics.trackEvent(sessionId, {
          event_type: 'form_interaction',
          action: event.type,
          category: 'form',
          label: fieldName,
          metadata: {
            form_id: formElement?.id,
            field_type: target.type,
            field_name: fieldName,
            has_value: !!target.value,
          },
        })

        if (event.type === 'submit') {
          await trackConversion(target)
        }
      } catch (error) {
        console.error('Error tracking form interaction:', error)
      }
    },
    [enableFormTracking, isTracking, sessionId, analytics]
  )

  // Track conversion
  const trackConversion = useCallback(
    async (element: HTMLElement) => {
      try {
        const conversionData = {
          element_type: element.tagName.toLowerCase(),
          element_id: element.id,
          element_text: element.textContent?.substring(0, 100),
          page_path: trackingData.current.currentPage,
          session_duration: Date.now() - trackingData.current.startTime,
          total_clicks: trackingData.current.totalClicks,
          features_used: Array.from(trackingData.current.featuresUsed),
        }

        await analytics.trackEvent(sessionId, {
          event_type: 'conversion',
          action: 'conversion_completed',
          category: 'demo',
          label: 'signup_clicked',
          metadata: conversionData,
        })

        // Track conversion in A/B testing framework
        await abTesting.trackConversion(sessionId, undefined, {
          engagement_score: engagementScore,
          time_spent: Date.now() - trackingData.current.startTime,
          features_explored: trackingData.current.featuresUsed.size,
        })

        // Track conversion in optimization engine
        await conversionEngine.trackConversion(sessionId, undefined, {
          engagement_score: engagementScore,
          page_views: trackingData.current.sessionEvents.filter(e => e.type === 'page_view').length,
          total_interactions: trackingData.current.totalClicks,
        })

        onConversion?.(conversionData)
      } catch (error) {
        console.error('Error tracking conversion:', error)
      }
    },
    [sessionId, analytics, abTesting, conversionEngine, engagementScore, onConversion]
  )

  // Update engagement score
  const updateEngagementScore = useCallback(() => {
    const timeSpent = (Date.now() - trackingData.current.startTime) / 1000
    const timeScore = Math.min(timeSpent / 300, 1) * 30 // 5 minutes = 30 points
    const clickScore = Math.min(trackingData.current.totalClicks / 20, 1) * 40 // 20 clicks = 40 points
    const featureScore = Math.min(trackingData.current.featuresUsed.size / 5, 1) * 30 // 5 features = 30 points

    const newScore = Math.round(timeScore + clickScore + featureScore)
    setEngagementScore(newScore)
  }, [])

  // Check engagement milestones
  const checkEngagementMilestones = useCallback(() => {
    const currentTime = Date.now()
    const timeSpent = currentTime - trackingData.current.startTime

    trackingData.current.engagementMilestones.forEach(milestone => {
      if (milestone.achieved) return

      let shouldTrigger = false

      switch (milestone.type) {
        case 'time':
          shouldTrigger = timeSpent >= milestone.threshold
          break
        case 'clicks':
          shouldTrigger = trackingData.current.totalClicks >= milestone.threshold
          break
        case 'scrolls':
          shouldTrigger = trackingData.current.totalScrolls >= milestone.threshold
          break
        case 'features':
          shouldTrigger = trackingData.current.featuresUsed.size >= milestone.threshold
          break
      }

      if (shouldTrigger) {
        milestone.achieved = true
        milestone.timestamp = currentTime

        onEngagementMilestone?.(milestone.name, {
          threshold: milestone.threshold,
          type: milestone.type,
          engagement_score: engagementScore,
          time_spent: timeSpent,
        })

        // Track milestone achievement
        analytics.trackEvent(sessionId, {
          event_type: 'engagement',
          action: 'milestone_achieved',
          category: 'demo',
          label: milestone.name,
          metadata: {
            milestone_type: milestone.type,
            threshold: milestone.threshold,
            time_to_achieve: timeSpent,
          },
        })
      }
    })
  }, [sessionId, analytics, engagementScore, onEngagementMilestone])

  // Update lead score periodically
  const updateLeadScore = useCallback(async () => {
    try {
      const leadScore = await conversionEngine.calculateLeadScore(sessionId)

      // Store lead score for real-time updates
      await analytics.trackEvent(sessionId, {
        event_type: 'analytics',
        action: 'lead_score_updated',
        category: 'scoring',
        value: leadScore.total_score,
        metadata: {
          sales_readiness: leadScore.sales_readiness,
          conversion_probability: leadScore.conversion_probability,
          category_scores: leadScore.category_scores,
        },
      })
    } catch (error) {
      console.error('Error updating lead score:', error)
    }
  }, [sessionId, conversionEngine, analytics])

  // Setup event listeners
  useEffect(() => {
    if (!isTracking) return

    const handleClick = (e: MouseEvent) => trackClick(e)
    const handleMouseOver = (e: MouseEvent) => trackHover(e)
    const handleScroll = () => trackScroll()
    const handleFormFocus = (e: Event) => trackFormInteraction(e)
    const handleFormChange = (e: Event) => trackFormInteraction(e)
    const handleFormSubmit = (e: Event) => trackFormInteraction(e)

    // Add event listeners
    document.addEventListener('click', handleClick)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('focus', handleFormFocus, true)
    document.addEventListener('change', handleFormChange)
    document.addEventListener('submit', handleFormSubmit)

    // Track periodic updates
    const leadScoreInterval = setInterval(updateLeadScore, 30000) // Every 30 seconds
    const engagementInterval = setInterval(checkEngagementMilestones, 5000) // Every 5 seconds

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('scroll', handleScroll)
      document.removeEventListener('focus', handleFormFocus, true)
      document.removeEventListener('change', handleFormChange)
      document.removeEventListener('submit', handleFormSubmit)
      clearInterval(leadScoreInterval)
      clearInterval(engagementInterval)

      // Clear all hover timeouts
      hoverTimeouts.current.forEach(timeout => clearTimeout(timeout))
      hoverTimeouts.current.clear()
    }
  }, [
    isTracking,
    trackClick,
    trackHover,
    trackScroll,
    trackFormInteraction,
    updateLeadScore,
    checkEngagementMilestones,
  ])

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page hidden - track session pause
        await analytics.trackEvent(sessionId, {
          event_type: 'session',
          action: 'session_paused',
          category: 'demo',
          metadata: {
            time_spent: Date.now() - trackingData.current.startTime,
            engagement_score: engagementScore,
          },
        })
      } else {
        // Page visible - track session resume
        trackingData.current.lastActivity = Date.now()
        await analytics.trackEvent(sessionId, {
          event_type: 'session',
          action: 'session_resumed',
          category: 'demo',
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [sessionId, analytics, engagementScore])

  // Apply A/B test configuration
  useEffect(() => {
    if (testConfiguration) {
      // Apply configuration changes based on A/B test variant
      applyTestConfiguration(testConfiguration)
    }
  }, [testConfiguration])

  // Helper functions
  const getFeatureName = (element: HTMLElement): string | null => {
    // Extract feature name from element attributes or classes
    const dataFeature = element.getAttribute('data-feature')
    if (dataFeature) return dataFeature

    const classes = element.className
    if (classes.includes('inbox')) return 'inbox'
    if (classes.includes('contacts')) return 'contacts'
    if (classes.includes('analytics')) return 'analytics'
    if (classes.includes('templates')) return 'templates'
    if (classes.includes('automation')) return 'automation'
    if (classes.includes('settings')) return 'settings'

    return null
  }

  const isConversionElement = (element: HTMLElement): boolean => {
    const conversionSelectors = [
      'button[data-conversion]',
      '.signup-button',
      '.cta-button',
      'input[type="submit"]',
      '.demo-to-trial',
      '.get-started',
    ]

    return conversionSelectors.some(
      selector => element.matches(selector) || element.closest(selector)
    )
  }

  const applyTestConfiguration = (config: TestConfiguration) => {
    // Apply A/B test configuration changes to the UI
    if (config.cta_button_color) {
      const ctaButtons = document.querySelectorAll('.cta-button, .signup-button')
      ctaButtons.forEach(button => {
        ;(button as HTMLElement).style.backgroundColor = config.cta_button_color!
      })
    }

    if (config.cta_button_text) {
      const ctaButtons = document.querySelectorAll('.cta-button, .signup-button')
      ctaButtons.forEach(button => {
        if (button.textContent && !button.querySelector('*')) {
          button.textContent = config.cta_button_text!
        }
      })
    }

    // Additional configuration applications...
  }

  return (
    <div ref={containerRef} className='demo-tracker-container'>
      {children}

      {/* Optional: Show tracking indicators for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className='bg-opacity-75 fixed right-4 bottom-4 rounded bg-black p-2 text-xs text-white'>
          <div>Tracking: {isTracking ? 'ON' : 'OFF'}</div>
          <div>Engagement: {engagementScore}/100</div>
          <div>Clicks: {trackingData.current.totalClicks}</div>
          <div>Features: {trackingData.current.featuresUsed.size}</div>
        </div>
      )}
    </div>
  )
}

// Heat Map Overlay Component
interface HeatMapOverlayProps {
  heatMapData: HeatMapData[]
  isVisible: boolean
  onToggle: () => void
}

export const HeatMapOverlay: React.FC<HeatMapOverlayProps> = ({
  heatMapData,
  isVisible,
  onToggle,
}) => {
  if (!isVisible) return null

  return (
    <div className='pointer-events-none fixed inset-0 z-50'>
      {heatMapData.map((data, index) => (
        <div
          key={index}
          className='pointer-events-none absolute'
          style={{
            left: data.x_position,
            top: data.y_position,
            width: '10px',
            height: '10px',
            backgroundColor: `rgba(255, 0, 0, ${Math.min(data.click_count / 10, 0.8)})`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          title={`${data.click_count} clicks`}
        />
      ))}

      <button
        onClick={onToggle}
        className='pointer-events-auto fixed top-4 right-4 rounded bg-red-500 px-3 py-1 text-white'
      >
        Hide Heat Map
      </button>
    </div>
  )
}

// Real-time Engagement Widget
interface EngagementWidgetProps {
  sessionId: string
  engagementScore: number
  milestones: string[]
  onMilestoneClick?: (milestone: string) => void
}

export const EngagementWidget: React.FC<EngagementWidgetProps> = ({
  sessionId,
  engagementScore,
  milestones,
  onMilestoneClick,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Engagement'
    if (score >= 60) return 'Good Engagement'
    if (score >= 40) return 'Fair Engagement'
    return 'Low Engagement'
  }

  return (
    <div className='fixed bottom-4 left-4 max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
      <div className='mb-2 text-sm font-medium text-gray-700'>Engagement Score</div>

      <div className={`text-2xl font-bold ${getScoreColor(engagementScore)} mb-1`}>
        {engagementScore}/100
      </div>

      <div className='mb-3 text-xs text-gray-500'>{getScoreLabel(engagementScore)}</div>

      {milestones.length > 0 && (
        <div>
          <div className='mb-2 text-xs font-medium text-gray-600'>Milestones Achieved</div>
          <div className='space-y-1'>
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className='cursor-pointer text-xs text-green-600 hover:text-green-700'
                onClick={() => onMilestoneClick?.(milestone)}
              >
                ✓ {milestone.replace('_', ' ').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DemoTracker
