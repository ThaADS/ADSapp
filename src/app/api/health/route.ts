import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  environment: string
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded'
      responseTime?: number
      error?: string
      lastCheck: string
    }
  }
  system: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    nodeVersion: string
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {},
      system: {
        memory: getMemoryUsage(),
        nodeVersion: process.version,
      }
    }

    // Check Supabase connection
    const supabaseCheck = await checkSupabase()
    healthStatus.services.supabase = supabaseCheck

    // Check Redis connection (if configured)
    if (process.env.REDIS_URL) {
      const redisCheck = await checkRedis()
      healthStatus.services.redis = redisCheck
    }

    // Check external services
    const stripeCheck = await checkStripe()
    healthStatus.services.stripe = stripeCheck

    // Check WhatsApp API
    if (process.env.WHATSAPP_ACCESS_TOKEN) {
      const whatsappCheck = await checkWhatsApp()
      healthStatus.services.whatsapp = whatsappCheck
    }

    // Determine overall status
    const serviceStatuses = Object.values(healthStatus.services).map(s => s.status)
    const hasDown = serviceStatuses.includes('down')
    const hasDegraded = serviceStatuses.includes('degraded')

    if (hasDown) {
      healthStatus.status = 'unhealthy'
    } else if (hasDegraded) {
      healthStatus.status = 'degraded'
    }

    const responseTime = Date.now() - startTime
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503

    return NextResponse.json(
      {
        ...healthStatus,
        responseTime: `${responseTime}ms`
      },
      {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

async function checkSupabase() {
  const checkStart = Date.now()

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single()

    const responseTime = Date.now() - checkStart

    if (error && !error.message.includes('PGRST116')) {
      // PGRST116 is "not found" which is OK for health check
      return {
        status: 'down' as const,
        responseTime,
        error: error.message,
        lastCheck: new Date().toISOString()
      }
    }

    return {
      status: responseTime < 1000 ? 'up' as const : 'degraded' as const,
      responseTime,
      lastCheck: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'down' as const,
      responseTime: Date.now() - checkStart,
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString()
    }
  }
}

async function checkRedis() {
  const checkStart = Date.now()

  try {
    // Simple Redis ping check
    const response = await fetch('http://redis:6379', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - checkStart

    return {
      status: response.ok ? 'up' as const : 'down' as const,
      responseTime,
      lastCheck: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'down' as const,
      responseTime: Date.now() - checkStart,
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString()
    }
  }
}

async function checkStripe() {
  const checkStart = Date.now()

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'degraded' as const,
        responseTime: 0,
        error: 'Stripe not configured',
        lastCheck: new Date().toISOString()
      }
    }

    // Simple Stripe API call to verify connection
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - checkStart

    return {
      status: response.ok ? 'up' as const : 'down' as const,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
      lastCheck: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'down' as const,
      responseTime: Date.now() - checkStart,
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString()
    }
  }
}

async function checkWhatsApp() {
  const checkStart = Date.now()

  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return {
        status: 'degraded' as const,
        responseTime: 0,
        error: 'WhatsApp not configured',
        lastCheck: new Date().toISOString()
      }
    }

    // Check WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        signal: AbortSignal.timeout(5000)
      }
    )

    const responseTime = Date.now() - checkStart

    return {
      status: response.ok ? 'up' as const : 'down' as const,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
      lastCheck: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'down' as const,
      responseTime: Date.now() - checkStart,
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString()
    }
  }
}

function getMemoryUsage() {
  const memUsage = process.memoryUsage()
  const totalMemory = memUsage.heapTotal + memUsage.external
  const usedMemory = memUsage.heapUsed

  return {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round((usedMemory / totalMemory) * 100)
  }
}

// Liveness probe endpoint (simpler check)
export async function HEAD(request: NextRequest) {
  try {
    // Basic liveness check
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}