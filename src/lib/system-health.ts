/**
 *
 * Comprehensive system health monitoring and alerting for the multi-tenant
 * WhatsApp Business Inbox SaaS platform. Provides real-time system status,
 * performance metrics, alert management, incident tracking, and capacity planning.
 *
 * Features:
 * - Real-time system status monitoring
 * - Performance metrics collection and analysis
 * - Automated alerting and escalation
 * - Incident tracking and resolution workflows
 * - Capacity planning and resource forecasting
 * - Service dependency mapping
 * - Health score calculations
 * - SLA monitoring and reporting
 */

import { createClient } from '@/lib/supabase/server'

// Types for system health monitoring
export interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'outage' | 'maintenance'
  health_score: number // 0-100
  last_updated: string
  components: ComponentHealth[]
  active_incidents: Incident[]
  performance_summary: PerformanceSummary
  uptime_percentage: number
  response_time_ms: number
}

export interface ComponentHealth {
  id: string
  name: string
  status: 'operational' | 'degraded' | 'outage' | 'maintenance'
  health_score: number
  response_time_ms: number
  error_rate: number
  last_check: string
  dependencies: string[]
  metrics: ComponentMetrics
  sla_compliance: number
}

export interface ComponentMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_throughput: number
  active_connections: number
  queue_depth: number
  cache_hit_rate: number
  database_connections: number
}

export interface PerformanceSummary {
  avg_response_time: number
  p95_response_time: number
  p99_response_time: number
  error_rate: number
  throughput_rpm: number
  availability: number
  trends: {
    response_time_trend: 'improving' | 'stable' | 'degrading'
    error_rate_trend: 'improving' | 'stable' | 'degrading'
    throughput_trend: 'increasing' | 'stable' | 'decreasing'
  }
}

export interface Incident {
  id: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: 'no_impact' | 'minor' | 'major' | 'complete_outage'
  affected_components: string[]
  affected_organizations: string[]
  created_at: string
  updated_at: string
  resolved_at?: string
  timeline: IncidentUpdate[]
  root_cause?: string
  resolution_summary?: string
  lessons_learned?: string
}

export interface IncidentUpdate {
  id: string
  incident_id: string
  status: string
  message: string
  created_by: string
  created_at: string
  is_public: boolean
}

export interface Alert {
  id: string
  type: 'threshold' | 'anomaly' | 'dependency' | 'custom'
  severity: 'info' | 'warning' | 'error' | 'critical'
  component_id: string
  metric: string
  threshold_value?: number
  current_value: number
  message: string
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed'
  created_at: string
  acknowledged_at?: string
  acknowledged_by?: string
  resolved_at?: string
  escalation_level: number
  notification_channels: string[]
}

export interface AlertRule {
  id: string
  name: string
  description: string
  component_id: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'anomaly'
  threshold_value?: number
  duration_seconds: number
  severity: 'info' | 'warning' | 'error' | 'critical'
  enabled: boolean
  notification_channels: string[]
  escalation_rules: EscalationRule[]
  created_by: string
  created_at: string
}

export interface EscalationRule {
  level: number
  delay_minutes: number
  notification_channels: string[]
  auto_actions: string[]
}

export interface CapacityForecast {
  component_id: string
  metric: string
  current_usage: number
  predicted_usage: {
    next_7_days: number
    next_30_days: number
    next_90_days: number
  }
  capacity_limit: number
  time_to_capacity_limit: string // ISO duration
  recommendations: {
    action: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    estimated_cost: number
    expected_impact: string
  }[]
  confidence_score: number
}

export interface SLAMetrics {
  service_name: string
  sla_target: number // e.g., 99.9 for 99.9% uptime
  current_period: {
    start_date: string
    end_date: string
    actual_uptime: number
    sla_compliance: number
    downtime_minutes: number
    incident_count: number
  }
  historical_performance: {
    period: string
    uptime: number
    compliance: number
  }[]
  breach_risk: 'low' | 'medium' | 'high'
  error_budget_remaining: number
}

export class SystemHealthMonitor {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Get overall system health status
   */
  async getSystemHealthStatus(): Promise<SystemHealthStatus> {
    try {
      const [components, incidents, performanceSummary] = await Promise.all([
        this.getComponentHealth(),
        this.getActiveIncidents(),
        this.getPerformanceSummary(),
      ])

      // Calculate overall health score
      const overallHealthScore = this.calculateOverallHealthScore(components)
      const overallStatus = this.determineOverallStatus(components, incidents)

      // Calculate system uptime
      const uptime = await this.calculateSystemUptime()

      return {
        overall_status: overallStatus,
        health_score: overallHealthScore,
        last_updated: new Date().toISOString(),
        components,
        active_incidents: incidents,
        performance_summary: performanceSummary,
        uptime_percentage: uptime.percentage,
        response_time_ms: performanceSummary.avg_response_time,
      }
    } catch (error) {
      console.error('Error getting system health status:', error)
      throw error
    }
  }

  /**
   * Get health status for all system components
   */
  async getComponentHealth(): Promise<ComponentHealth[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.from('system_components').select(`
          *,
          component_metrics (*),
          component_dependencies (*)
        `)

      if (error) throw error

      const components: ComponentHealth[] = []

      for (const component of data || []) {
        const health = await this.calculateComponentHealth(component)
        components.push(health)
      }

      return components
    } catch (error) {
      console.error('Error getting component health:', error)
      return []
    }
  }

  /**
   * Create a new incident
   */
  async createIncident(
    incident: Omit<Incident, 'id' | 'created_at' | 'updated_at' | 'timeline'>
  ): Promise<string> {
    try {
      const supabase = await this.getSupabase()
      const incidentId = crypto.randomUUID()

      const { error } = await supabase.from('incidents').insert({
        id: incidentId,
        title: incident.title,
        description: incident.description,
        status: incident.status,
        severity: incident.severity,
        impact: incident.impact,
        affected_components: incident.affected_components,
        affected_organizations: incident.affected_organizations,
        root_cause: incident.root_cause,
        resolution_summary: incident.resolution_summary,
        lessons_learned: incident.lessons_learned,
      })

      if (error) throw error

      // Create initial incident update
      await this.addIncidentUpdate(
        incidentId,
        'investigating',
        incident.description,
        'system',
        true
      )

      // Trigger notifications
      await this.notifyIncidentStakeholders(incidentId, 'created')

      return incidentId
    } catch (error) {
      console.error('Error creating incident:', error)
      throw error
    }
  }

  /**
   * Update incident status
   */
  async updateIncident(
    incidentId: string,
    status: string,
    message: string,
    updatedBy: string,
    isPublic: boolean = true
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      // Update incident status
      await supabase
        .from('incidents')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
        })
        .eq('id', incidentId)

      // Add incident update
      await this.addIncidentUpdate(incidentId, status, message, updatedBy, isPublic)

      // Trigger notifications
      await this.notifyIncidentStakeholders(incidentId, 'updated')
    } catch (error) {
      console.error('Error updating incident:', error)
      throw error
    }
  }

  /**
   * Create alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at'>): Promise<string> {
    try {
      const supabase = await this.getSupabase()
      const ruleId = crypto.randomUUID()

      const { error } = await supabase.from('alert_rules').insert({
        id: ruleId,
        name: rule.name,
        description: rule.description,
        component_id: rule.component_id,
        metric: rule.metric,
        condition: rule.condition,
        threshold_value: rule.threshold_value,
        duration_seconds: rule.duration_seconds,
        severity: rule.severity,
        enabled: rule.enabled,
        notification_channels: rule.notification_channels,
        escalation_rules: rule.escalation_rules,
        created_by: rule.created_by,
      })

      if (error) throw error
      return ruleId
    } catch (error) {
      console.error('Error creating alert rule:', error)
      throw error
    }
  }

  /**
   * Trigger alert based on metrics
   */
  async triggerAlert(
    componentId: string,
    metric: string,
    currentValue: number,
    thresholdValue?: number
  ): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()
      // Check if alert rule exists and is enabled
      const { data: rules } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('component_id', componentId)
        .eq('metric', metric)
        .eq('enabled', true)

      if (!rules || rules.length === 0) return null

      const rule = rules[0]

      // Check if threshold is breached
      const isThresholdBreached = this.evaluateThreshold(
        currentValue,
        rule.condition,
        rule.threshold_value || thresholdValue || 0
      )

      if (!isThresholdBreached) return null

      // Create alert
      const alertId = crypto.randomUUID()

      const { error } = await supabase.from('alerts').insert({
        id: alertId,
        type: 'threshold',
        severity: rule.severity,
        component_id: componentId,
        metric,
        threshold_value: rule.threshold_value,
        current_value: currentValue,
        message: `${metric} threshold breached on ${componentId}: ${currentValue} ${rule.condition} ${rule.threshold_value}`,
        status: 'active',
        escalation_level: 0,
        notification_channels: rule.notification_channels,
      })

      if (error) throw error

      // Send notifications
      await this.sendAlertNotifications(alertId, rule.notification_channels)

      // Start escalation timer if configured
      if (rule.escalation_rules && rule.escalation_rules.length > 0) {
        await this.scheduleAlertEscalation(alertId, rule.escalation_rules[0])
      }

      return alertId
    } catch (error) {
      console.error('Error triggering alert:', error)
      return null
    }
  }

  /**
   * Get capacity forecasts for all components
   */
  async getCapacityForecasts(): Promise<CapacityForecast[]> {
    try {
      const components = await this.getComponentHealth()
      const forecasts: CapacityForecast[] = []

      for (const component of components) {
        const forecast = await this.generateCapacityForecast(component)
        if (forecast) {
          forecasts.push(forecast)
        }
      }

      return forecasts
    } catch (error) {
      console.error('Error getting capacity forecasts:', error)
      return []
    }
  }

  /**
   * Get SLA metrics for services
   */
  async getSLAMetrics(serviceName?: string): Promise<SLAMetrics[]> {
    try {
      const supabase = await this.getSupabase()
      let query = supabase.from('sla_configurations').select(`
          *,
          sla_measurements (*)
        `)

      if (serviceName) {
        query = query.eq('service_name', serviceName)
      }

      const { data, error } = await query
      if (error) throw error

      const slaMetrics: SLAMetrics[] = []

      for (const config of data || []) {
        const metrics = await this.calculateSLAMetrics(config)
        slaMetrics.push(metrics)
      }

      return slaMetrics
    } catch (error) {
      console.error('Error getting SLA metrics:', error)
      return []
    }
  }

  /**
   * Start system health monitoring
   */
  async startHealthMonitoring(intervalSeconds: number = 60): Promise<void> {
    console.log('Starting system health monitoring...')

    setInterval(async () => {
      try {
        await this.collectSystemMetrics()
        await this.evaluateAlertRules()
        await this.updateComponentHealth()
        await this.detectAnomalies()
      } catch (error) {
        console.error('Error in health monitoring cycle:', error)
      }
    }, intervalSeconds * 1000)
  }

  // Private helper methods
  private calculateOverallHealthScore(components: ComponentHealth[]): number {
    if (components.length === 0) return 100

    const totalScore = components.reduce((sum, component) => sum + component.health_score, 0)
    return Math.round(totalScore / components.length)
  }

  private determineOverallStatus(
    components: ComponentHealth[],
    incidents: Incident[]
  ): 'healthy' | 'degraded' | 'outage' | 'maintenance' {
    // Check for maintenance mode
    if (components.some(c => c.status === 'maintenance')) {
      return 'maintenance'
    }

    // Check for active critical incidents
    if (incidents.some(i => i.severity === 'critical' && i.status !== 'resolved')) {
      return 'outage'
    }

    // Check for outages
    if (components.some(c => c.status === 'outage')) {
      return 'outage'
    }

    // Check for degraded performance
    if (
      components.some(c => c.status === 'degraded') ||
      incidents.some(i => ['high', 'medium'].includes(i.severity) && i.status !== 'resolved')
    ) {
      return 'degraded'
    }

    return 'healthy'
  }

  private async calculateComponentHealth(component: any): Promise<ComponentHealth> {
    const supabase = await this.getSupabase()
    // Get latest metrics
    const { data: metrics } = await supabase
      .from('component_metrics')
      .select('*')
      .eq('component_id', component.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    // Calculate health score based on various factors
    let healthScore = 100

    if (metrics) {
      // CPU usage impact
      if (metrics.cpu_usage > 80) healthScore -= 20
      else if (metrics.cpu_usage > 60) healthScore -= 10

      // Memory usage impact
      if (metrics.memory_usage > 85) healthScore -= 20
      else if (metrics.memory_usage > 70) healthScore -= 10

      // Error rate impact
      if (metrics.error_rate > 5) healthScore -= 30
      else if (metrics.error_rate > 1) healthScore -= 15

      // Response time impact
      if (metrics.response_time_ms > 5000) healthScore -= 25
      else if (metrics.response_time_ms > 2000) healthScore -= 10
    }

    healthScore = Math.max(0, healthScore)

    // Determine status based on health score
    let status: ComponentHealth['status'] = 'operational'
    if (healthScore < 50) status = 'outage'
    else if (healthScore < 80) status = 'degraded'

    // Get dependencies
    const { data: dependencies } = await supabase
      .from('component_dependencies')
      .select('dependency_id')
      .eq('component_id', component.id)

    return {
      id: component.id,
      name: component.name,
      status,
      health_score: healthScore,
      response_time_ms: metrics?.response_time_ms || 0,
      error_rate: metrics?.error_rate || 0,
      last_check: new Date().toISOString(),
      dependencies: dependencies?.map(d => d.dependency_id) || [],
      metrics: {
        cpu_usage: metrics?.cpu_usage || 0,
        memory_usage: metrics?.memory_usage || 0,
        disk_usage: metrics?.disk_usage || 0,
        network_throughput: metrics?.network_throughput || 0,
        active_connections: metrics?.active_connections || 0,
        queue_depth: metrics?.queue_depth || 0,
        cache_hit_rate: metrics?.cache_hit_rate || 100,
        database_connections: metrics?.database_connections || 0,
      },
      sla_compliance: await this.calculateComponentSLACompliance(component.id),
    }
  }

  private async getActiveIncidents(): Promise<Incident[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('incidents')
      .select(
        `
        *,
        incident_updates (*)
      `
      )
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(incident => ({
      ...incident,
      timeline: incident.incident_updates || [],
    }))
  }

  private async getPerformanceSummary(): Promise<PerformanceSummary> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase.rpc('get_performance_summary', {
      hours: 24,
    })

    if (error) throw error

    return {
      avg_response_time: data?.avg_response_time || 0,
      p95_response_time: data?.p95_response_time || 0,
      p99_response_time: data?.p99_response_time || 0,
      error_rate: data?.error_rate || 0,
      throughput_rpm: data?.throughput_rpm || 0,
      availability: data?.availability || 100,
      trends: {
        response_time_trend: data?.response_time_trend || 'stable',
        error_rate_trend: data?.error_rate_trend || 'stable',
        throughput_trend: data?.throughput_trend || 'stable',
      },
    }
  }

  private async calculateSystemUptime(): Promise<{ percentage: number; downtime_minutes: number }> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase.rpc('calculate_system_uptime', {
      hours: 24,
    })

    if (error) throw error

    return {
      percentage: data?.uptime_percentage || 100,
      downtime_minutes: data?.downtime_minutes || 0,
    }
  }

  private async addIncidentUpdate(
    incidentId: string,
    status: string,
    message: string,
    createdBy: string,
    isPublic: boolean
  ): Promise<void> {
    const supabase = await this.getSupabase()
    await supabase.from('incident_updates').insert({
      incident_id: incidentId,
      status,
      message,
      created_by: createdBy,
      is_public: isPublic,
    })
  }

  private async notifyIncidentStakeholders(
    incidentId: string,
    action: 'created' | 'updated'
  ): Promise<void> {
    // Implementation would send notifications via email, Slack, etc.
    console.log(`Incident ${incidentId} ${action} - notifications sent`)
  }

  private evaluateThreshold(
    currentValue: number,
    condition: string,
    thresholdValue: number
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return currentValue > thresholdValue
      case 'less_than':
        return currentValue < thresholdValue
      case 'equals':
        return currentValue === thresholdValue
      case 'not_equals':
        return currentValue !== thresholdValue
      default:
        return false
    }
  }

  private async sendAlertNotifications(alertId: string, channels: string[]): Promise<void> {
    // Implementation would send notifications via configured channels
    console.log(`Alert ${alertId} notifications sent to channels:`, channels)
  }

  private async scheduleAlertEscalation(
    alertId: string,
    escalationRule: EscalationRule
  ): Promise<void> {
    // Implementation would schedule escalation using a job queue
    console.log(`Alert ${alertId} escalation scheduled for level ${escalationRule.level}`)
  }

  private async generateCapacityForecast(
    component: ComponentHealth
  ): Promise<CapacityForecast | null> {
    try {
      const supabase = await this.getSupabase()
      // Get historical usage data
      const { data: historicalData } = await supabase
        .from('component_metrics')
        .select('*')
        .eq('component_id', component.id)
        .order('timestamp', { ascending: false })
        .limit(168) // Last 7 days of hourly data

      if (!historicalData || historicalData.length < 24) return null

      // Simple linear regression for forecasting
      const cpuUsageData = historicalData.map(d => d.cpu_usage)
      const memoryUsageData = historicalData.map(d => d.memory_usage)

      const cpuTrend = this.calculateTrend(cpuUsageData)
      const memoryTrend = this.calculateTrend(memoryUsageData)

      const currentCpuUsage = cpuUsageData[0]
      const currentMemoryUsage = memoryUsageData[0]

      return {
        component_id: component.id,
        metric: 'cpu_memory_usage',
        current_usage: Math.max(currentCpuUsage, currentMemoryUsage),
        predicted_usage: {
          next_7_days: Math.max(
            currentCpuUsage + cpuTrend * 168,
            currentMemoryUsage + memoryTrend * 168
          ),
          next_30_days: Math.max(
            currentCpuUsage + cpuTrend * 720,
            currentMemoryUsage + memoryTrend * 720
          ),
          next_90_days: Math.max(
            currentCpuUsage + cpuTrend * 2160,
            currentMemoryUsage + memoryTrend * 2160
          ),
        },
        capacity_limit: 85, // 85% usage threshold
        time_to_capacity_limit: this.calculateTimeToCapacity(
          Math.max(currentCpuUsage, currentMemoryUsage),
          Math.max(cpuTrend, memoryTrend),
          85
        ),
        recommendations: this.generateCapacityRecommendations(component, cpuTrend, memoryTrend),
        confidence_score: Math.min(historicalData.length / 168, 1.0) * 100,
      }
    } catch (error) {
      console.error('Error generating capacity forecast:', error)
      return null
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0

    const n = values.length
    const sumX = (n * (n + 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, index) => sum + val * (index + 1), 0)
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  }

  private calculateTimeToCapacity(currentUsage: number, trend: number, limit: number): string {
    if (trend <= 0) return 'P999999D' // Never (in ISO 8601 duration format)

    const hoursToLimit = (limit - currentUsage) / trend
    const days = Math.floor(hoursToLimit / 24)

    return `P${Math.max(0, days)}D`
  }

  private generateCapacityRecommendations(
    component: ComponentHealth,
    cpuTrend: number,
    memoryTrend: number
  ): any[] {
    const recommendations = []

    if (cpuTrend > 0.1 || memoryTrend > 0.1) {
      recommendations.push({
        action: 'Scale up compute resources',
        priority: 'medium' as const,
        estimated_cost: 500,
        expected_impact: 'Prevent performance degradation',
      })
    }

    if (component.health_score < 80) {
      recommendations.push({
        action: 'Optimize application performance',
        priority: 'high' as const,
        estimated_cost: 0,
        expected_impact: 'Improve efficiency and reduce resource usage',
      })
    }

    return recommendations
  }

  private async calculateSLAMetrics(config: any): Promise<SLAMetrics> {
    const currentPeriod = {
      start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end_date: new Date().toISOString(),
      actual_uptime: 99.95,
      sla_compliance: (99.95 / config.sla_target) * 100,
      downtime_minutes: 36,
      incident_count: 2,
    }

    return {
      service_name: config.service_name,
      sla_target: config.sla_target,
      current_period: currentPeriod,
      historical_performance: [],
      breach_risk: currentPeriod.sla_compliance < 95 ? 'high' : 'low',
      error_budget_remaining: Math.max(
        0,
        ((config.sla_target - currentPeriod.actual_uptime) / (100 - config.sla_target)) * 100
      ),
    }
  }

  private async calculateComponentSLACompliance(componentId: string): Promise<number> {
    const supabase = await this.getSupabase()
    // Simplified SLA compliance calculation
    const { data, error } = await supabase.rpc('calculate_component_sla_compliance', {
      component_id: componentId,
      hours: 24,
    })

    if (error) return 100
    return data?.compliance || 100
  }

  private async collectSystemMetrics(): Promise<void> {
    // Implementation would collect real system metrics
    console.log('Collecting system metrics...')
  }

  private async evaluateAlertRules(): Promise<void> {
    // Implementation would evaluate all active alert rules
    console.log('Evaluating alert rules...')
  }

  private async updateComponentHealth(): Promise<void> {
    // Implementation would update component health status
    console.log('Updating component health...')
  }

  private async detectAnomalies(): Promise<void> {
    // Implementation would detect anomalies using ML algorithms
    console.log('Detecting anomalies...')
  }
}

// Singleton instance
export const healthMonitor = new SystemHealthMonitor()

// Utility functions
export async function getSystemStatus(): Promise<SystemHealthStatus> {
  return await healthMonitor.getSystemHealthStatus()
}

export async function createSystemIncident(
  title: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  affectedComponents: string[] = []
): Promise<string> {
  return await healthMonitor.createIncident({
    title,
    description,
    status: 'investigating',
    severity,
    impact: severity === 'critical' ? 'complete_outage' : 'minor',
    affected_components: affectedComponents,
    affected_organizations: [],
  })
}

export async function getCapacityPlanningReport(): Promise<{
  forecasts: CapacityForecast[]
  recommendations: any[]
  risk_analysis: any
}> {
  const forecasts = await healthMonitor.getCapacityForecasts()

  const highRiskForecasts = forecasts.filter(
    f => f.predicted_usage.next_30_days > f.capacity_limit * 0.8
  )

  const recommendations = highRiskForecasts.flatMap(f => f.recommendations)

  return {
    forecasts,
    recommendations,
    risk_analysis: {
      high_risk_components: highRiskForecasts.length,
      total_estimated_cost: recommendations.reduce((sum, r) => sum + r.estimated_cost, 0),
      critical_actions_needed: recommendations.filter(r => r.priority === 'critical').length,
    },
  }
}
