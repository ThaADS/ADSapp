/**
 * KMS Health Check API Endpoint
 *
 * Provides health status for the encryption key management system.
 * Monitors key expiration, rotation schedule, and system performance.
 *
 * @route GET /api/kms/health
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKeyManager } from '@/lib/security/key-manager'
import { getKeyRotationService } from '@/lib/security/key-rotation'
import { getKMSClient } from '@/lib/security/kms-client'

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    kms: {
      status: 'ok' | 'error'
      provider: 'aws-kms' | 'azure-keyvault' | 'unknown'
      connectivity: boolean
      latency?: number
      error?: string
    }
    keys: {
      status: 'ok' | 'warning' | 'error'
      totalKeys: number
      activeKeys: number
      expiredKeys: number
      keysNearExpiration: number
      issues: string[]
    }
    rotation: {
      status: 'ok' | 'warning' | 'error'
      healthy: boolean
      tenantsNeedingRotation: number
      lastRotationCheck: string | null
      issues: string[]
    }
    database: {
      status: 'ok' | 'error'
      connectivity: boolean
      error?: string
    }
  }
  recommendations: string[]
}

/**
 * GET /api/kms/health
 *
 * Returns comprehensive health status of KMS system
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Verify authorization (only super admin or service role)
    const authHeader = request.headers.get('authorization')
    const healthCheckSecret = process.env.HEALTH_CHECK_SECRET

    if (healthCheckSecret && authHeader !== `Bearer ${healthCheckSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        kms: {
          status: 'ok',
          provider: 'unknown',
          connectivity: false,
        },
        keys: {
          status: 'ok',
          totalKeys: 0,
          activeKeys: 0,
          expiredKeys: 0,
          keysNearExpiration: 0,
          issues: [],
        },
        rotation: {
          status: 'ok',
          healthy: true,
          tenantsNeedingRotation: 0,
          lastRotationCheck: null,
          issues: [],
        },
        database: {
          status: 'ok',
          connectivity: false,
        },
      },
      recommendations: [],
    }

    // Check 1: KMS connectivity
    try {
      const kmsClient = getKMSClient()
      const kmsStartTime = Date.now()
      const kmsConnected = await kmsClient.testConnection()

      response.checks.kms.connectivity = kmsConnected
      response.checks.kms.latency = Date.now() - kmsStartTime
      response.checks.kms.provider = process.env.AWS_KMS_KEY_ID
        ? 'aws-kms'
        : process.env.AZURE_KEY_VAULT_URL
          ? 'azure-keyvault'
          : 'unknown'

      if (!kmsConnected) {
        response.checks.kms.status = 'error'
        response.checks.kms.error = 'Unable to connect to KMS'
        response.status = 'unhealthy'
        response.recommendations.push('Check KMS credentials and network connectivity')
      }

      // Check latency
      if (response.checks.kms.latency && response.checks.kms.latency > 1000) {
        response.checks.kms.status = 'error'
        response.recommendations.push(
          `High KMS latency detected: ${response.checks.kms.latency}ms. Consider checking network or using key caching.`
        )
      }
    } catch (error) {
      response.checks.kms.status = 'error'
      response.checks.kms.error = error instanceof Error ? error.message : String(error)
      response.status = 'unhealthy'
      response.recommendations.push('Investigate KMS configuration and credentials')
    }

    // Check 2: Database connectivity
    try {
      const supabase = await createClient()
      const { error } = await supabase.from('encryption_keys').select('id').limit(1)

      response.checks.database.connectivity = !error

      if (error) {
        response.checks.database.status = 'error'
        response.checks.database.error = error.message
        response.status = 'unhealthy'
        response.recommendations.push('Check database connectivity and permissions')
      }
    } catch (error) {
      response.checks.database.status = 'error'
      response.checks.database.error = error instanceof Error ? error.message : String(error)
      response.status = 'unhealthy'
    }

    // Check 3: Key statistics
    try {
      const keyManager = getKeyManager()
      const stats = await keyManager.getKeyStats()

      response.checks.keys.totalKeys = stats.totalKeys
      response.checks.keys.activeKeys = stats.activeKeys
      response.checks.keys.expiredKeys = stats.expiredKeys
      response.checks.keys.keysNearExpiration = stats.pendingRotation

      // Evaluate key health
      if (stats.expiredKeys > 0) {
        response.checks.keys.status = 'error'
        response.checks.keys.issues.push(
          `${stats.expiredKeys} expired keys need immediate rotation`
        )
        response.status = 'degraded'
        response.recommendations.push('Trigger immediate key rotation for expired keys')
      }

      if (stats.pendingRotation > 5) {
        response.checks.keys.status = response.checks.keys.status === 'error' ? 'error' : 'warning'
        response.checks.keys.issues.push(`${stats.pendingRotation} keys approaching expiration`)
        if (response.status === 'healthy') {
          response.status = 'degraded'
        }
        response.recommendations.push('Schedule key rotation for keys approaching expiration')
      }

      if (stats.totalKeys === 0) {
        response.checks.keys.issues.push('No encryption keys found in system')
        response.recommendations.push('Ensure tenants have encryption keys generated on first use')
      }
    } catch (error) {
      response.checks.keys.status = 'error'
      response.checks.keys.issues.push(
        `Failed to fetch key statistics: ${error instanceof Error ? error.message : String(error)}`
      )
      response.status = 'degraded'
    }

    // Check 4: Rotation health
    try {
      const rotationService = getKeyRotationService()
      const rotationHealth = await rotationService.getRotationHealth()

      response.checks.rotation.healthy = rotationHealth.healthy
      response.checks.rotation.tenantsNeedingRotation = rotationHealth.stats.keysNearExpiration
      response.checks.rotation.issues = rotationHealth.issues

      if (!rotationHealth.healthy) {
        response.checks.rotation.status = 'error'
        if (response.status === 'healthy') {
          response.status = 'degraded'
        }

        rotationHealth.issues.forEach(issue => {
          response.recommendations.push(`Rotation issue: ${issue}`)
        })
      }

      if (rotationHealth.stats.keysNearExpiration > 10) {
        response.checks.rotation.status = 'warning'
        response.recommendations.push(
          `${rotationHealth.stats.keysNearExpiration} tenants need key rotation soon`
        )
      }
    } catch (error) {
      response.checks.rotation.status = 'error'
      response.checks.rotation.issues.push(
        `Failed to check rotation health: ${error instanceof Error ? error.message : String(error)}`
      )
      response.status = 'degraded'
    }

    // Add general recommendations
    if (response.status === 'healthy' && response.recommendations.length === 0) {
      response.recommendations.push('All systems operational')
    }

    // Add response time to metadata
    const responseTime = Date.now() - startTime
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Response-Time': `${responseTime}ms`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    })

    return NextResponse.json(response, {
      status: response.status === 'healthy' ? 200 : response.status === 'degraded' ? 503 : 500,
      headers,
    })
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        recommendations: ['Investigate system errors immediately'],
      },
      { status: 500 }
    )
  }
}
