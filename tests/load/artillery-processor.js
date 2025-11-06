/**
 * Artillery Custom Processor
 * Handles custom metrics and request processing
 */

module.exports = {
  // Initialize custom metrics
  beforeScenario: function (context, events, done) {
    // Add custom variables
    context.vars.timestamp = Date.now()
    context.vars.requestId = generateRequestId()

    return done()
  },

  // Track custom metrics after each request
  afterResponse: function (requestParams, response, context, events, done) {
    // Track response time by endpoint
    const endpoint = extractEndpoint(requestParams.url)
    events.emit('customStat', {
      stat: `response_time_${endpoint}`,
      value: response.timings.phases.total,
    })

    // Track status codes
    events.emit('customStat', {
      stat: `status_${response.statusCode}`,
      value: 1,
    })

    // Track cache hits
    if (response.headers['x-cache-status']) {
      events.emit('customStat', {
        stat: response.headers['x-cache-status'] === 'HIT' ? 'cache_hit' : 'cache_miss',
        value: 1,
      })
    }

    // Track slow requests
    if (response.timings.phases.total > 1000) {
      events.emit('customStat', {
        stat: 'slow_requests',
        value: 1,
      })
    }

    return done()
  },

  // Log errors
  onError: function (error, context, events, done) {
    events.emit('customStat', {
      stat: 'errors',
      value: 1,
    })

    console.error('Request error:', {
      error: error.message,
      scenario: context.scenario.name,
      timestamp: new Date().toISOString(),
    })

    return done()
  },

  // Cleanup after scenario
  afterScenario: function (context, events, done) {
    // Log scenario completion
    console.log(`Scenario completed: ${context.scenario.name}`)
    return done()
  },
}

// Helper functions
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function extractEndpoint(url) {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    const segments = path.split('/').filter(Boolean)

    // Return first meaningful segment (e.g., 'conversations', 'contacts')
    return segments[1] || 'root'
  } catch {
    return 'unknown'
  }
}
