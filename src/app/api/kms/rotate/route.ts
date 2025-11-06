/**
 * KMS Key Rotation API Endpoint
 *
 * Handles scheduled automatic key rotation for encryption keys.
 * Designed to be called by cron jobs or scheduled functions.
 *
 * @route POST /api/kms/rotate
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKeyManager } from '@/lib/security/key-manager'
import { getKeyRotationService } from '@/lib/security/key-rotation'

/**
 * Rotation request body
 */
interface RotationRequest {
  /** Specific tenant ID to rotate (optional) */
  tenantId?: string
  /** Force rotation even if not due */
  force?: boolean
  /** Enable dry run mode (no actual rotation) */
  dryRun?: boolean
  /** Re-encrypt data after rotation */
  reEncrypt?: boolean
}

/**
 * Rotation response structure
 */
interface RotationResponse {
  success: boolean
  timestamp: string
  rotationResult: {
    rotated: number
    failed: number
    tenantIds: string[]
    errors: Array<{ tenantId: string; error: string }>
    duration: number
  }
  reEncryptionResult?: Record<
    string,
    {
      table: string
      total: number
      processed: number
      successful: number
      failed: number
      status: string
    }
  >
  message: string
}

/**
 * Verify cron authorization
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.HEALTH_CHECK_SECRET

  if (!cronSecret) {
    console.warn('No CRON_SECRET configured - accepting all rotation requests')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

/**
 * POST /api/kms/rotate
 *
 * Triggers key rotation for tenants with keys approaching expiration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Verify authorization
    if (!verifyAuthorization(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing authorization token',
        },
        { status: 401 }
      )
    }

    // Parse request body
    let body: RotationRequest = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      // Body is optional, continue with defaults
    }

    const { tenantId, force = false, dryRun = false, reEncrypt = false } = body

    // Log rotation attempt
    console.info('[KMS Rotation] Starting key rotation', {
      tenantId: tenantId || 'all',
      force,
      dryRun,
      reEncrypt,
      timestamp: new Date().toISOString(),
    })

    if (dryRun) {
      console.info('[KMS Rotation] DRY RUN MODE - No actual changes will be made')
    }

    // Get services
    const keyManager = getKeyManager()
    const rotationService = getKeyRotationService()

    // Check if specific tenant or all tenants
    if (tenantId) {
      // Rotate specific tenant
      console.info(`[KMS Rotation] Rotating keys for tenant: ${tenantId}`)

      if (reEncrypt) {
        // Rotate with re-encryption
        const result = await rotationService.rotateWithReEncryption(tenantId, {
          dryRun,
        })

        const response: RotationResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          rotationResult: {
            rotated: result.keyRotation.rotated,
            failed: result.keyRotation.failed,
            tenantIds: result.keyRotation.tenantIds,
            errors: result.keyRotation.errors,
            duration: result.keyRotation.duration,
          },
          reEncryptionResult: result.reEncryption as any,
          message: dryRun
            ? `Dry run completed for tenant ${tenantId}`
            : `Successfully rotated key and re-encrypted data for tenant ${tenantId}`,
        }

        console.info('[KMS Rotation] Rotation with re-encryption completed', {
          tenantId,
          rotated: result.keyRotation.rotated,
          failed: result.keyRotation.failed,
          duration: result.keyRotation.duration,
        })

        return NextResponse.json(response, { status: 200 })
      } else {
        // Rotate without re-encryption (key only)
        if (!dryRun) {
          await keyManager.rotateKey(tenantId)
        }

        const response: RotationResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          rotationResult: {
            rotated: dryRun ? 0 : 1,
            failed: 0,
            tenantIds: dryRun ? [] : [tenantId],
            errors: [],
            duration: Date.now() - startTime,
          },
          message: dryRun
            ? `Dry run completed for tenant ${tenantId}`
            : `Successfully rotated key for tenant ${tenantId}`,
        }

        console.info('[KMS Rotation] Single tenant rotation completed', {
          tenantId,
          dryRun,
          duration: response.rotationResult.duration,
        })

        return NextResponse.json(response, { status: 200 })
      }
    } else {
      // Rotate all tenants that need rotation
      console.info('[KMS Rotation] Checking all tenants for rotation needs')

      if (dryRun) {
        // Dry run - just check which tenants need rotation
        const supabase = await createClient()
        const warningDate = new Date()
        warningDate.setDate(
          warningDate.getDate() + parseInt(process.env.KEY_ROTATION_WARNING_DAYS || '7')
        )

        const { data: keysNeedingRotation } = await supabase
          .from('encryption_keys')
          .select('tenant_id')
          .eq('is_active', true)
          .lte('expires_at', warningDate.toISOString())

        const tenantIds = [...new Set(keysNeedingRotation?.map(k => k.tenant_id) || [])]

        const response: RotationResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          rotationResult: {
            rotated: 0,
            failed: 0,
            tenantIds,
            errors: [],
            duration: Date.now() - startTime,
          },
          message: `Dry run: ${tenantIds.length} tenants need rotation`,
        }

        console.info('[KMS Rotation] Dry run check completed', {
          tenantsNeedingRotation: tenantIds.length,
          tenantIds,
        })

        return NextResponse.json(response, { status: 200 })
      }

      // Actual rotation
      const result = await keyManager.rotateKeys()

      const response: RotationResponse = {
        success: result.failed === 0,
        timestamp: new Date().toISOString(),
        rotationResult: result,
        message:
          result.failed === 0
            ? `Successfully rotated ${result.rotated} keys`
            : `Rotated ${result.rotated} keys with ${result.failed} failures`,
      }

      console.info('[KMS Rotation] Batch rotation completed', {
        rotated: result.rotated,
        failed: result.failed,
        duration: result.duration,
        errors: result.errors.length,
      })

      // Log failures
      if (result.errors.length > 0) {
        console.error('[KMS Rotation] Rotation failures:', result.errors)
      }

      return NextResponse.json(response, {
        status: result.failed === 0 ? 200 : 207, // 207 Multi-Status for partial success
      })
    }
  } catch (error) {
    console.error('[KMS Rotation] Rotation failed:', error)

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        message: 'Key rotation failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/kms/rotate
 *
 * Returns information about rotation schedule and status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authorization
    if (!verifyAuthorization(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rotationService = getKeyRotationService()
    const health = await rotationService.getRotationHealth()

    return NextResponse.json(
      {
        schedule: {
          intervalDays: parseInt(process.env.KEY_ROTATION_SCHEDULE || '90'),
          warningDays: parseInt(process.env.KEY_ROTATION_WARNING_DAYS || '7'),
          autoEnabled: process.env.KEY_ROTATION_AUTO_ENABLED === 'true',
          cronSchedule: process.env.KEY_ROTATION_CRON_SCHEDULE || '0 2 * * *',
        },
        health: {
          healthy: health.healthy,
          issues: health.issues,
          stats: health.stats,
        },
        nextActions:
          health.stats.keysNearExpiration > 0
            ? `${health.stats.keysNearExpiration} tenants need rotation`
            : 'No immediate actions required',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[KMS Rotation] Status check failed:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
