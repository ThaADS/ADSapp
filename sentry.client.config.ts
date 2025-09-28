import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Initialize Sentry integrations
  integrations: [
    new Sentry.Replay({
      // Capture text content and user interactions
      maskAllText: false,
      blockAllMedia: false,
    }),
    new Sentry.BrowserTracing({
      // Set up automatic route change tracking in Next.js
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
  ],

  // Configure what errors to send
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev):', event)
      return null
    }

    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException

      // Don't send network errors from third-party services
      if (error instanceof Error && error.message.includes('Network Error')) {
        return null
      }

      // Don't send errors from browser extensions
      if (error instanceof Error && error.stack?.includes('extension://')) {
        return null
      }
    }

    return event
  },

  // Add user context
  initialScope: {
    tags: {
      component: 'client',
    },
  },
})