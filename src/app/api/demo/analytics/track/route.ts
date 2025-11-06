// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DemoSessionManager, DemoUtils } from '@/lib/demo'
import { TrackAnalyticsRequest, TrackAnalyticsResponse, DemoEventType } from '@/types/demo'

/**
 * Track analytics events for demo sessions
 * POST /api/demo/analytics/track
 */
export async function POST(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header',
        } as TrackAnalyticsResponse,
        { status: 401 }
      )
    }

    // Parse request body
    const body: TrackAnalyticsRequest = await request.json()

    // Validate required fields
    if (!body.event_type || !body.action || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: 'event_type, action, and category are required',
        } as TrackAnalyticsResponse,
        { status: 400 }
      )
    }

    // Validate event type
    const validEventTypes: DemoEventType[] = [
      'page_view',
      'click',
      'form_submission',
      'api_call',
      'feature_interaction',
      'error',
      'conversion',
    ]

    if (!validEventTypes.includes(body.event_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`,
        } as TrackAnalyticsResponse,
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error',
        } as TrackAnalyticsResponse,
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
        } as TrackAnalyticsResponse,
        { status: 401 }
      )
    }

    // Enrich analytics data with session context
    const enrichedMetadata = {
      ...body.metadata,
      session_id: sessionResult.session.id,
      organization_id: sessionResult.session.organization_id,
      business_scenario: sessionResult.session.business_scenario,
      session_age_minutes: Math.floor(
        (new Date().getTime() - new Date(sessionResult.session.created_at).getTime()) / (1000 * 60)
      ),
      user_agent: sessionResult.session.user_agent,
      ip_address: sessionResult.session.ip_address,
    }

    // Add page information if it's a page view
    if (body.event_type === 'page_view' && body.page) {
      enrichedMetadata.page_title = getPageTitle(body.page)
      enrichedMetadata.page_category = getPageCategory(body.page)
    }

    // Track the event
    const eventId = await sessionManager.trackEvent(sessionResult.session.id, {
      event_type: body.event_type,
      action: body.action,
      category: body.category,
      label: body.label,
      value: body.value,
      metadata: enrichedMetadata,
      page: body.page,
    })

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to track event',
        } as TrackAnalyticsResponse,
        { status: 500 }
      )
    }

    // Update session progress based on event
    await updateSessionProgressFromEvent(sessionManager, sessionToken, body)

    // Check for conversion events
    await checkAndTrackConversions(sessionManager, sessionResult.session.id, body)

    const response: TrackAnalyticsResponse = {
      success: true,
      data: {
        event_id: eventId,
        tracked_at: new Date().toISOString(),
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error tracking analytics event:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track analytics event. Please try again.',
      } as TrackAnalyticsResponse,
      { status: 500 }
    )
  }
}

/**
 * Get analytics summary for a demo session
 * GET /api/demo/analytics/track
 */
export async function GET(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header',
        },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    // Generate analytics summary
    const analyticsSummary = DemoUtils.generateAnalyticsSummary(sessionResult.session.analytics)

    // Calculate additional metrics
    const sessionDuration = DemoUtils.formatSessionDuration(sessionResult.session.created_at)
    const completionRate = DemoUtils.calculateProgress(
      sessionResult.session.progress.steps_completed,
      10 // Total steps - this could be scenario-specific
    )

    // Get page view statistics
    const pageViewStats = generatePageViewStats(sessionResult.session.analytics.page_views)

    // Get feature usage statistics
    const featureUsageStats = generateFeatureUsageStats(
      sessionResult.session.analytics.feature_usage
    )

    // Get conversion funnel statistics
    const conversionStats = generateConversionStats(
      sessionResult.session.analytics.conversion_funnel
    )

    return NextResponse.json({
      success: true,
      data: {
        session_info: {
          id: sessionResult.session.id,
          scenario: sessionResult.session.business_scenario,
          status: sessionResult.session.status,
          created_at: sessionResult.session.created_at,
          duration: sessionDuration,
          completion_rate: completionRate,
        },
        analytics_summary: analyticsSummary,
        detailed_metrics: {
          page_views: pageViewStats,
          feature_usage: featureUsageStats,
          conversion_funnel: conversionStats,
          performance: sessionResult.session.analytics.performance_metrics,
        },
        progress: sessionResult.session.progress,
        recommendations: generatePersonalizedRecommendations(sessionResult.session),
      },
    })
  } catch (error) {
    console.error('Error getting analytics summary:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get analytics summary',
      },
      { status: 500 }
    )
  }
}

/**
 * Bulk track multiple analytics events
 * PUT /api/demo/analytics/track
 */
export async function PUT(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header',
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { events } = body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'events array is required and must not be empty',
        },
        { status: 400 }
      )
    }

    if (events.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 50 events allowed per batch',
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    const results = []
    const errors = []

    // Process events
    for (let i = 0; i < events.length; i++) {
      const eventData = events[i]

      try {
        // Validate event data
        if (!eventData.event_type || !eventData.action || !eventData.category) {
          errors.push({
            index: i,
            error: 'Missing required fields: event_type, action, category',
          })
          continue
        }

        // Track event
        const eventId = await sessionManager.trackEvent(sessionResult.session.id, {
          event_type: eventData.event_type,
          action: eventData.action,
          category: eventData.category,
          label: eventData.label,
          value: eventData.value,
          metadata: {
            ...eventData.metadata,
            batch_index: i,
            batch_id: `batch_${Date.now()}`,
          },
          page: eventData.page,
        })

        if (eventId) {
          results.push({
            index: i,
            event_id: eventId,
            tracked_at: new Date().toISOString(),
          })
        } else {
          errors.push({
            index: i,
            error: 'Failed to track event',
          })
        }
      } catch (error) {
        console.error(`Error processing event ${i}:`, error)
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Track batch processing event
    await sessionManager.trackEvent(sessionResult.session.id, {
      event_type: 'api_call',
      action: 'batch_analytics_tracked',
      category: 'demo',
      label: 'bulk_tracking',
      value: results.length,
      metadata: {
        total_events: events.length,
        successful: results.length,
        failed: errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        processed_at: new Date().toISOString(),
        total_events: events.length,
        successful: results.length,
        failed: errors.length,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Error in bulk analytics tracking:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk analytics events',
      },
      { status: 500 }
    )
  }
}

// Helper functions

async function updateSessionProgressFromEvent(
  sessionManager: DemoSessionManager,
  sessionToken: string,
  eventData: TrackAnalyticsRequest
) {
  const progressSteps = {
    page_view: 'navigation',
    feature_interaction: 'feature_usage',
    form_submission: 'form_completion',
    api_call: 'api_interaction',
    conversion: 'goal_completion',
  }

  const step = progressSteps[eventData.event_type] || 'general_activity'
  const feature = eventData.action

  await sessionManager.updateProgress(sessionToken, step, feature, {
    event_category: eventData.category,
    event_label: eventData.label,
  })
}

async function checkAndTrackConversions(
  sessionManager: DemoSessionManager,
  sessionId: string,
  eventData: TrackAnalyticsRequest
) {
  // Define conversion events
  const conversionActions = [
    'signup_attempt',
    'contact_form_submit',
    'demo_complete',
    'feature_explored',
    'trial_requested',
    'pricing_viewed',
  ]

  if (conversionActions.includes(eventData.action)) {
    await sessionManager.trackEvent(sessionId, {
      event_type: 'conversion',
      action: 'conversion_milestone',
      category: 'demo',
      label: eventData.action,
      value: 1,
      metadata: {
        original_event: eventData,
        conversion_type: eventData.action,
      },
    })
  }
}

function getPageTitle(page: string): string {
  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    inbox: 'WhatsApp Inbox',
    contacts: 'Contact Management',
    conversations: 'Conversations',
    analytics: 'Analytics & Reports',
    settings: 'Settings',
    billing: 'Billing & Subscriptions',
    team: 'Team Management',
    automations: 'Automation Rules',
    templates: 'Message Templates',
  }

  return pageTitles[page] || 'Unknown Page'
}

function getPageCategory(page: string): string {
  const pageCategories: Record<string, string> = {
    dashboard: 'overview',
    inbox: 'communication',
    contacts: 'management',
    conversations: 'communication',
    analytics: 'insights',
    settings: 'configuration',
    billing: 'monetization',
    team: 'management',
    automations: 'automation',
    templates: 'communication',
  }

  return pageCategories[page] || 'general'
}

function generatePageViewStats(pageViews: any[]) {
  const stats = {
    total_views: pageViews.length,
    unique_pages: new Set(pageViews.map(pv => pv.page)).size,
    average_duration: 0,
    most_viewed_page: '',
    page_breakdown: {} as Record<string, number>,
  }

  if (pageViews.length > 0) {
    // Calculate average duration
    const totalDuration = pageViews.reduce((sum, pv) => sum + (pv.duration_seconds || 0), 0)
    stats.average_duration = totalDuration / pageViews.length

    // Count page views
    const pageCounts: Record<string, number> = {}
    pageViews.forEach(pv => {
      pageCounts[pv.page] = (pageCounts[pv.page] || 0) + 1
    })

    stats.page_breakdown = pageCounts
    stats.most_viewed_page = Object.keys(pageCounts).reduce((a, b) =>
      pageCounts[a] > pageCounts[b] ? a : b
    )
  }

  return stats
}

function generateFeatureUsageStats(featureUsage: any[]) {
  return {
    total_features_used: featureUsage.length,
    most_used_feature:
      featureUsage.length > 0
        ? featureUsage.reduce((a, b) => (a.usage_count > b.usage_count ? a : b)).feature
        : null,
    feature_breakdown: featureUsage.reduce(
      (acc, feature) => {
        acc[feature.feature] = {
          usage_count: feature.usage_count,
          time_spent: feature.time_spent_seconds,
          first_used: feature.first_used_at,
          last_used: feature.last_used_at,
        }
        return acc
      },
      {} as Record<string, any>
    ),
  }
}

function generateConversionStats(conversionFunnel: any[]) {
  const totalSteps = conversionFunnel.length
  const completedSteps = conversionFunnel.filter(step => step.completed).length

  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    completion_rate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    current_step: conversionFunnel.find(step => !step.completed)?.step || 'completed',
    step_breakdown: conversionFunnel.reduce(
      (acc, step) => {
        acc[step.step] = {
          completed: step.completed,
          completed_at: step.completed_at,
          time_to_complete: step.time_to_complete_seconds,
        }
        return acc
      },
      {} as Record<string, any>
    ),
  }
}

function generatePersonalizedRecommendations(session: any) {
  const recommendations = []
  const progress = session.progress
  const scenario = session.business_scenario

  // Based on completion percentage
  if (progress.completion_percentage < 30) {
    recommendations.push({
      type: 'onboarding',
      title: 'Continue exploring the basics',
      description: 'Try viewing the inbox and sending a test message',
      action: 'explore_inbox',
    })
  } else if (progress.completion_percentage < 70) {
    recommendations.push({
      type: 'feature_discovery',
      title: 'Discover advanced features',
      description: 'Check out automation rules and analytics',
      action: 'explore_automation',
    })
  }

  // Based on features explored
  if (!progress.features_explored.includes('analytics')) {
    recommendations.push({
      type: 'analytics',
      title: 'View your analytics',
      description: 'See how analytics can help your business',
      action: 'view_analytics',
    })
  }

  // Scenario-specific recommendations
  if (scenario === 'retail' && !progress.features_explored.includes('templates')) {
    recommendations.push({
      type: 'templates',
      title: 'Try message templates',
      description: 'Speed up customer service with pre-made templates',
      action: 'create_template',
    })
  }

  return recommendations
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
