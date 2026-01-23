import { createClient } from '@/lib/supabase/server'

export interface ErrorEvent {
  type: 'api_error' | 'webhook_error' | 'bulk_operation_error' | 'system_error'
  message: string
  stack?: string
  code?: string
  userId?: string
  organizationId?: string
  endpoint?: string
  metadata?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
}

export interface PerformanceMetric {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  userId?: string
  organizationId?: string
  timestamp: string
}

export interface SystemAlert {
  type:
    | 'rate_limit_exceeded'
    | 'high_error_rate'
    | 'slow_response'
    | 'quota_exceeded'
    | 'service_degradation'
  severity: 'warning' | 'error' | 'critical'
  message: string
  organizationId?: string
  metadata?: Record<string, any>
  threshold?: number
  currentValue?: number
  timestamp: string
}

class MonitoringService {
  private async getSupabase() {
    return await createClient()
  }

  async logError(error: ErrorEvent): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase.from('error_logs').insert({
        type: error.type,
        message: error.message,
        stack: error.stack,
        code: error.code,
        user_id: error.userId,
        organization_id: error.organizationId,
        endpoint: error.endpoint,
        metadata: error.metadata,
        severity: error.severity,
        timestamp: error.timestamp,
      })

      // Create alert for high severity errors
      if (error.severity === 'high' || error.severity === 'critical') {
        await this.createAlert({
          type: 'high_error_rate',
          severity: error.severity === 'critical' ? 'critical' : 'error',
          message: `${error.severity.toUpperCase()} error: ${error.message}`,
          organizationId: error.organizationId,
          metadata: {
            errorCode: error.code,
            endpoint: error.endpoint,
            originalError: error.message,
          },
          timestamp: new Date().toISOString(),
        })
      }
    } catch (logError) {
      console.error('Failed to log error to monitoring service:', logError)
    }
  }

  async logPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase.from('performance_metrics').insert({
        endpoint: metric.endpoint,
        method: metric.method,
        duration_ms: metric.duration,
        status_code: metric.statusCode,
        user_id: metric.userId,
        organization_id: metric.organizationId,
        timestamp: metric.timestamp,
      })

      // Alert on slow responses
      if (metric.duration > 5000) {
        // 5 seconds
        await this.createAlert({
          type: 'slow_response',
          severity: metric.duration > 10000 ? 'error' : 'warning',
          message: `Slow API response detected: ${metric.endpoint} took ${metric.duration}ms`,
          organizationId: metric.organizationId,
          metadata: {
            endpoint: metric.endpoint,
            method: metric.method,
            duration: metric.duration,
            statusCode: metric.statusCode,
          },
          threshold: 5000,
          currentValue: metric.duration,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (logError) {
      console.error('Failed to log performance metric:', logError)
    }
  }

  async createAlert(alert: SystemAlert): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Check if similar alert was created recently (avoid spam)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recentAlert } = await supabase
        .from('system_alerts')
        .select('id')
        .eq('type', alert.type)
        .eq('organization_id', alert.organizationId || null)
        .gte('created_at', oneHourAgo)
        .limit(1)
        .single()

      if (recentAlert) {
        // Update existing alert instead of creating new one
        await supabase
          .from('system_alerts')
          .update({
            current_value: alert.currentValue,
            updated_at: new Date().toISOString(),
            occurrence_count: supabase.sql`occurrence_count + 1`,
          })
          .eq('id', recentAlert.id)

        return
      }

      // Create new alert
      await supabase.from('system_alerts').insert({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        organization_id: alert.organizationId,
        metadata: alert.metadata,
        threshold: alert.threshold,
        current_value: alert.currentValue,
        occurrence_count: 1,
        is_resolved: false,
        created_at: alert.timestamp,
      })

      // For critical alerts, also log to external monitoring if configured
      if (alert.severity === 'critical') {
        await this.notifyExternalMonitoring(alert)
      }
    } catch (logError) {
      console.error('Failed to create system alert:', logError)
    }
  }

  async getHealthMetrics(organizationId?: string): Promise<{
    errorRate: number
    averageResponseTime: number
    activeAlerts: number
    uptime: number
  }> {
    try {
      const supabase = await this.getSupabase()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      // Get error rate (last hour)
      let errorQuery = supabase
        .from('error_logs')
        .select('id', { count: 'exact' })
        .gte('timestamp', oneHourAgo)

      let performanceQuery = supabase
        .from('performance_metrics')
        .select('duration_ms')
        .gte('timestamp', oneHourAgo)

      let alertQuery = supabase
        .from('system_alerts')
        .select('id', { count: 'exact' })
        .eq('is_resolved', false)

      if (organizationId) {
        errorQuery = errorQuery.eq('organization_id', organizationId)
        performanceQuery = performanceQuery.eq('organization_id', organizationId)
        alertQuery = alertQuery.eq('organization_id', organizationId)
      }

      const [errorResult, performanceResult, alertResult] = await Promise.all([
        errorQuery,
        performanceQuery,
        alertQuery,
      ])

      const errorCount = errorResult.count || 0
      const performanceData = performanceResult.data || []
      const alertCount = alertResult.count || 0

      const averageResponseTime =
        performanceData.length > 0
          ? performanceData.reduce((sum, metric) => sum + metric.duration_ms, 0) /
            performanceData.length
          : 0

      // Calculate error rate as percentage
      const totalRequests = performanceData.length
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

      // Simple uptime calculation (percentage of successful requests)
      const uptime = totalRequests > 0 ? Math.max(0, 100 - errorRate) : 100

      return {
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        activeAlerts: alertCount,
        uptime: Math.round(uptime * 100) / 100,
      }
    } catch (error) {
      console.error('Failed to get health metrics:', error)
      return {
        errorRate: 0,
        averageResponseTime: 0,
        activeAlerts: 0,
        uptime: 100,
      }
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      await supabase
        .from('system_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  async getErrorTrends(
    organizationId?: string,
    days: number = 7
  ): Promise<
    Array<{
      date: string
      errorCount: number
      avgResponseTime: number
      totalRequests: number
    }>
  > {
    try {
      const supabase = await this.getSupabase()
      const trends = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const startOfDay = `${dateStr}T00:00:00.000Z`
        const endOfDay = `${dateStr}T23:59:59.999Z`

        let errorQuery = supabase
          .from('error_logs')
          .select('id', { count: 'exact' })
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)

        let performanceQuery = supabase
          .from('performance_metrics')
          .select('duration_ms')
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)

        if (organizationId) {
          errorQuery = errorQuery.eq('organization_id', organizationId)
          performanceQuery = performanceQuery.eq('organization_id', organizationId)
        }

        const [errorResult, performanceResult] = await Promise.all([errorQuery, performanceQuery])

        const errorCount = errorResult.count || 0
        const performanceData = performanceResult.data || []
        const avgResponseTime =
          performanceData.length > 0
            ? performanceData.reduce((sum, metric) => sum + metric.duration_ms, 0) /
              performanceData.length
            : 0

        trends.push({
          date: dateStr,
          errorCount,
          avgResponseTime: Math.round(avgResponseTime),
          totalRequests: performanceData.length,
        })
      }

      return trends
    } catch (error) {
      console.error('Failed to get error trends:', error)
      return []
    }
  }

  private async notifyExternalMonitoring(alert: SystemAlert): Promise<void> {
    try {
      // Integration with external monitoring services
      // This could be Sentry, DataDog, New Relic, etc.

      if (process.env.SENTRY_DSN) {
        // Send to Sentry
        console.error('CRITICAL ALERT:', alert)
      }

      if (process.env.SLACK_WEBHOOK_URL) {
        // Send to Slack
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 CRITICAL ALERT: ${alert.message}`,
            attachments: [
              {
                color: 'danger',
                fields: [
                  { title: 'Type', value: alert.type, short: true },
                  { title: 'Severity', value: alert.severity, short: true },
                  { title: 'Organization', value: alert.organizationId || 'System', short: true },
                  { title: 'Timestamp', value: alert.timestamp, short: true },
                ],
              },
            ],
          }),
        })
      }
    } catch (error) {
      console.error('Failed to notify external monitoring:', error)
    }
  }
}

// Export singleton instance
export const monitoring = new MonitoringService()

// Convenience functions
export async function logError(error: Partial<ErrorEvent>): Promise<void> {
  await monitoring.logError({
    type: 'system_error',
    severity: 'medium',
    timestamp: new Date().toISOString(),
    ...error,
  } as ErrorEvent)
}

export async function logApiError(
  message: string,
  endpoint: string,
  userId?: string,
  organizationId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await monitoring.logError({
    type: 'api_error',
    message,
    endpoint,
    userId,
    organizationId,
    metadata,
    severity: 'medium',
    timestamp: new Date().toISOString(),
  })
}

export async function logPerformance(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  userId?: string,
  organizationId?: string
): Promise<void> {
  await monitoring.logPerformance({
    endpoint,
    method,
    duration,
    statusCode,
    userId,
    organizationId,
    timestamp: new Date().toISOString(),
  })
}

export async function createAlert(alert: Partial<SystemAlert>): Promise<void> {
  await monitoring.createAlert({
    severity: 'warning',
    timestamp: new Date().toISOString(),
    ...alert,
  } as SystemAlert)
}
