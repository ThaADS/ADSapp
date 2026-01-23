import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userProfile = await getUserOrganization(user.id)

    // Verify super admin access
    if (!userProfile.is_super_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('range') || '24h'

    // Calculate time threshold based on range
    const now = new Date()
    const threshold = new Date()
    switch (timeRange) {
      case '24h':
        threshold.setHours(now.getHours() - 24)
        break
      case '7d':
        threshold.setDate(now.getDate() - 7)
        break
      case '30d':
        threshold.setDate(now.getDate() - 30)
        break
      default:
        threshold.setHours(now.getHours() - 24)
    }

    const supabase = await createClient()

    // Get failed login attempts from audit_logs
    const { data: failedLogins, error: failedLoginsError } = await supabase
      .from('audit_logs')
      .select('id, metadata, created_at')
      .eq('action', 'auth.login_failed')
      .gte('created_at', threshold.toISOString())
      .order('created_at', { ascending: false })

    if (failedLoginsError) throw failedLoginsError

    // Get all failed logins for total count
    const { data: allFailedLogins } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('action', 'auth.login_failed')

    // Count failed logins by IP
    const ipCounts: Record<string, number> = {}
    failedLogins?.forEach(log => {
      const ip = log.metadata?.ip || 'unknown'
      ipCounts[ip] = (ipCounts[ip] || 0) + 1
    })

    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get MFA adoption statistics
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, mfa_enabled')

    if (usersError) throw usersError

    const mfaEnabled = allUsers?.filter(u => u.mfa_enabled).length || 0
    const totalUsers = allUsers?.length || 0
    const mfaPercentage = totalUsers > 0 ? (mfaEnabled / totalUsers) * 100 : 0

    // Get suspicious activity from audit_logs
    const { data: suspiciousLogs, error: suspiciousError } = await supabase
      .from('audit_logs')
      .select('*')
      .in('action', [
        'auth.multiple_failed_attempts',
        'auth.suspicious_login',
        'security.rate_limit_exceeded',
        'security.unauthorized_access_attempt',
      ])
      .gte('created_at', threshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (suspiciousError) throw suspiciousError

    const suspiciousActivity =
      suspiciousLogs?.map(log => ({
        id: log.id,
        type: log.action,
        description: log.description || `Suspicious activity detected: ${log.action}`,
        severity: determineSeverity(log.action, log.metadata),
        timestamp: log.created_at,
        ip: log.metadata?.ip,
        user: log.user_id,
      })) || []

    // Get recent security alerts
    const { data: alertLogs, error: alertsError } = await supabase
      .from('audit_logs')
      .select('*')
      .in('action', ['security.alert', 'security.warning', 'security.info'])
      .gte('created_at', threshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (alertsError) throw alertsError

    const recentAlerts =
      alertLogs?.map(log => ({
        id: log.id,
        message: log.description || log.action,
        type: log.action.includes('alert')
          ? 'error'
          : log.action.includes('warning')
            ? 'warning'
            : 'info',
        timestamp: log.created_at,
      })) || []

    // Calculate compliance score
    const complianceScore = await calculateComplianceScore(supabase, allUsers)

    const metrics = {
      failedLogins: {
        total: allFailedLogins?.length || 0,
        last24h: failedLogins?.length || 0,
        topIPs,
      },
      mfaAdoption: {
        enabled: mfaEnabled,
        total: totalUsers,
        percentage: mfaPercentage,
      },
      suspiciousActivity,
      recentAlerts,
      complianceScore,
    }

    return createSuccessResponse({ metrics })
  } catch (error) {
    console.error('Error fetching security metrics:', error)
    return createErrorResponse(error)
  }
}

function determineSeverity(action: string, metadata: any): 'low' | 'medium' | 'high' | 'critical' {
  // Multiple failed attempts from same IP
  if (action === 'auth.multiple_failed_attempts') {
    const attempts = metadata?.attempts || 0
    if (attempts > 10) return 'critical'
    if (attempts > 5) return 'high'
    return 'medium'
  }

  // Suspicious login patterns
  if (action === 'auth.suspicious_login') {
    return 'high'
  }

  // Rate limiting exceeded
  if (action === 'security.rate_limit_exceeded') {
    return 'medium'
  }

  // Unauthorized access attempts
  if (action === 'security.unauthorized_access_attempt') {
    return 'high'
  }

  return 'low'
}

async function calculateComplianceScore(supabase: any, users: any[]) {
  // Authentication score (based on MFA adoption and password policies)
  const mfaEnabled = users?.filter(u => u.mfa_enabled).length || 0
  const totalUsers = users?.length || 1
  const authenticationScore = Math.round((mfaEnabled / totalUsers) * 100)

  // Data protection score (based on encryption and data handling)
  // For now, we'll use a static high score since encryption is implemented
  const dataProtectionScore = 95

  // Access control score (based on RBAC and permissions)
  // Check if users have appropriate roles assigned
  const usersWithRoles = users?.filter(u => u.role && u.role !== 'user').length || 0
  const accessControlScore = Math.round(70 + (usersWithRoles / totalUsers) * 30)

  // Audit logging score (based on comprehensive logging)
  // Check if audit logs are being created
  const { count: auditLogCount } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })

  const auditLoggingScore = auditLogCount > 100 ? 100 : Math.min(100, auditLogCount)

  // Calculate overall score
  const overall = Math.round(
    authenticationScore * 0.3 +
      dataProtectionScore * 0.3 +
      accessControlScore * 0.2 +
      auditLoggingScore * 0.2
  )

  return {
    overall,
    categories: {
      authentication: authenticationScore,
      dataProtection: dataProtectionScore,
      accessControl: accessControlScore,
      auditLogging: auditLoggingScore,
    },
  }
}
