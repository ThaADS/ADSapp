import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

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

      // Don't send errors for expected business logic
      if (error instanceof Error) {
        if (error.message.includes('User not found') ||
            error.message.includes('Invalid credentials')) {
          return null
        }
      }
    }

    return event
  },

  // Add server context
  initialScope: {
    tags: {
      component: 'server',
    },
  },
})