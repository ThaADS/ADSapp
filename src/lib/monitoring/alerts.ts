import { performanceMonitor } from './performance'

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'security' | 'business'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: string
  resolved: boolean
  resolvedAt?: string
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  name: string
  type: Alert['type']
  condition: (metrics: any) => boolean
  severity: Alert['severity']
  description: string
  enabled: boolean
  cooldown: number // Minutes between alerts
}

class AlertManager {
  private static instance: AlertManager
  private alerts: Alert[] = []
  private rules: AlertRule[] = []
  private lastAlert: { [ruleId: string]: number } = {}

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager()
    }
    return AlertManager.instance
  }

  constructor() {
    this.initializeDefaultRules()
    this.startMonitoring()
  }

  private initializeDefaultRules() {
    this.rules = [
      // Performance Alerts
      {
        id: 'high-response-time',
        name: 'High Response Time',
        type: 'performance',
        severity: 'medium',
        description: 'API response time is above acceptable threshold',
        enabled: true,
        cooldown: 5,
        condition: metrics => metrics.averageResponseTime > 2000,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        type: 'error',
        severity: 'high',
        description: 'Error rate is above 5%',
        enabled: true,
        cooldown: 2,
        condition: metrics => metrics.errorRate > 0.05,
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        type: 'performance',
        severity: 'medium',
        description: 'Memory usage is above 85%',
        enabled: true,
        cooldown: 10,
        condition: metrics => metrics.memoryUsage > 0.85,
      },
      {
        id: 'database-connection-failure',
        name: 'Database Connection Failure',
        type: 'error',
        severity: 'critical',
        description: 'Database connection has failed',
        enabled: true,
        cooldown: 1,
        condition: metrics => metrics.databaseStatus === 'down',
      },
      {
        id: 'failed-logins-spike',
        name: 'Failed Login Spike',
        type: 'security',
        severity: 'high',
        description: 'Unusual number of failed login attempts',
        enabled: true,
        cooldown: 5,
        condition: metrics => metrics.failedLogins > 10,
      },
      {
        id: 'subscription-failures',
        name: 'Subscription Payment Failures',
        type: 'business',
        severity: 'high',
        description: 'High number of subscription payment failures',
        enabled: true,
        cooldown: 15,
        condition: metrics => metrics.paymentFailures > 5,
      },
    ]
  }

  private startMonitoring() {
    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts()
    }, 60000)
  }

  private async checkAlerts() {
    try {
      const metrics = await this.collectMetrics()

      for (const rule of this.rules) {
        if (!rule.enabled) continue

        // Check cooldown
        const lastAlertTime = this.lastAlert[rule.id] || 0
        const cooldownExpired = Date.now() - lastAlertTime > rule.cooldown * 60 * 1000

        if (!cooldownExpired) continue

        // Check condition
        if (rule.condition(metrics)) {
          await this.triggerAlert(rule, metrics)
          this.lastAlert[rule.id] = Date.now()
        }
      }
    } catch (error) {
      console.error('Alert monitoring error:', error)
    }
  }

  private async collectMetrics() {
    // Collect various metrics from different sources
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    return {
      // Performance metrics
      averageResponseTime: await this.getAverageResponseTime(oneHourAgo, now),
      errorRate: await this.getErrorRate(oneHourAgo, now),
      memoryUsage: this.getMemoryUsage(),

      // System health
      databaseStatus: await this.getDatabaseStatus(),
      redisStatus: await this.getRedisStatus(),

      // Security metrics
      failedLogins: await this.getFailedLogins(oneHourAgo, now),
      suspiciousActivity: await this.getSuspiciousActivity(oneHourAgo, now),

      // Business metrics
      paymentFailures: await this.getPaymentFailures(oneHourAgo, now),
      activeUsers: await this.getActiveUsers(oneHourAgo, now),
      subscriptionCancellations: await this.getSubscriptionCancellations(oneHourAgo, now),
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: any) {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: {
        ruleId: rule.id,
        metrics: this.sanitizeMetrics(metrics),
      },
    }

    this.alerts.push(alert)

    // Send notifications
    await this.sendNotifications(alert)

    // Store in database
    await this.storeAlert(alert)

    console.warn(`🚨 Alert triggered: ${alert.title}`, alert)
  }

  private sanitizeMetrics(metrics: any) {
    // Remove sensitive data from metrics before storing
    const sanitized = { ...metrics }
    delete sanitized.sensitive
    return sanitized
  }

  private async sendNotifications(alert: Alert) {
    const notifications = []

    // Email notifications for critical alerts
    if (alert.severity === 'critical') {
      notifications.push(this.sendEmailNotification(alert))
    }

    // Slack notifications
    if (alert.severity === 'high' || alert.severity === 'critical') {
      notifications.push(this.sendSlackNotification(alert))
    }

    // SMS for critical production issues
    if (alert.severity === 'critical' && process.env.NODE_ENV === 'production') {
      notifications.push(this.sendSMSNotification(alert))
    }

    // Discord webhook
    notifications.push(this.sendDiscordNotification(alert))

    await Promise.allSettled(notifications)
  }

  private async sendEmailNotification(alert: Alert) {
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: process.env.ALERT_EMAIL || 'admin@adsapp.com',
          subject: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
          html: this.generateEmailTemplate(alert),
        }),
      })

      if (!response.ok) {
        throw new Error(`Email notification failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  private async sendSlackNotification(alert: Alert) {
    if (!process.env.SLACK_WEBHOOK_URL) return

    try {
      const color = {
        low: '#36a64f',
        medium: '#ff9500',
        high: '#ff4500',
        critical: '#ff0000',
      }[alert.severity]

      const payload = {
        username: 'ADSapp Alerts',
        icon_emoji: ':rotating_light:',
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.description,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Type',
                value: alert.type,
                short: true,
              },
              {
                title: 'Time',
                value: new Date(alert.timestamp).toLocaleString(),
                short: false,
              },
            ],
            footer: 'ADSapp Monitoring',
            ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
          },
        ],
      }

      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  private async sendSMSNotification(alert: Alert) {
    // Implementation would depend on SMS provider (Twilio, AWS SNS, etc.)
    console.log('SMS notification would be sent for critical alert:', alert.title)
  }

  private async sendDiscordNotification(alert: Alert) {
    if (!process.env.DISCORD_WEBHOOK_URL) return

    try {
      const embedColor = {
        low: 0x36a64f,
        medium: 0xff9500,
        high: 0xff4500,
        critical: 0xff0000,
      }[alert.severity]

      const payload = {
        username: 'ADSapp Alerts',
        avatar_url: 'https://your-domain.com/alert-icon.png',
        embeds: [
          {
            title: `🚨 ${alert.title}`,
            description: alert.description,
            color: embedColor,
            fields: [
              {
                name: 'Severity',
                value: alert.severity.toUpperCase(),
                inline: true,
              },
              {
                name: 'Type',
                value: alert.type,
                inline: true,
              },
            ],
            timestamp: alert.timestamp,
            footer: {
              text: 'ADSapp Monitoring',
            },
          },
        ],
      }

      const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Discord notification failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send Discord notification:', error)
    }
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin: 0;">🚨 Alert: ${alert.title}</h2>
            <p style="margin: 10px 0; color: #6c757d;">
              <strong>Severity:</strong> ${alert.severity.toUpperCase()}<br>
              <strong>Type:</strong> ${alert.type}<br>
              <strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}
            </p>
            <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p style="margin: 0; color: #495057;">${alert.description}</p>
            </div>
            <p style="margin: 10px 0; font-size: 12px; color: #6c757d;">
              This alert was generated by ADSapp monitoring system.
            </p>
          </div>
        </body>
      </html>
    `
  }

  private async storeAlert(alert: Alert) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      })
    } catch (error) {
      console.error('Failed to store alert:', error)
    }
  }

  // Metric collection methods
  private async getAverageResponseTime(start: number, end: number): Promise<number> {
    // Implementation would query your analytics database
    return Math.random() * 3000 // Placeholder
  }

  private async getErrorRate(start: number, end: number): Promise<number> {
    // Implementation would calculate error rate from logs
    return Math.random() * 0.1 // Placeholder
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage()
    return usage.heapUsed / usage.heapTotal
  }

  private async getDatabaseStatus(): Promise<string> {
    try {
      const response = await fetch('/api/health')
      const health = await response.json()
      return health.services?.supabase?.status || 'unknown'
    } catch {
      return 'down'
    }
  }

  private async getRedisStatus(): Promise<string> {
    try {
      const response = await fetch('/api/health')
      const health = await response.json()
      return health.services?.redis?.status || 'unknown'
    } catch {
      return 'down'
    }
  }

  private async getFailedLogins(start: number, end: number): Promise<number> {
    // Implementation would query authentication logs
    return Math.floor(Math.random() * 20) // Placeholder
  }

  private async getSuspiciousActivity(start: number, end: number): Promise<number> {
    // Implementation would analyze security logs
    return Math.floor(Math.random() * 5) // Placeholder
  }

  private async getPaymentFailures(start: number, end: number): Promise<number> {
    // Implementation would query Stripe webhook logs
    return Math.floor(Math.random() * 10) // Placeholder
  }

  private async getActiveUsers(start: number, end: number): Promise<number> {
    // Implementation would query user activity
    return Math.floor(Math.random() * 1000) // Placeholder
  }

  private async getSubscriptionCancellations(start: number, end: number): Promise<number> {
    // Implementation would query subscription events
    return Math.floor(Math.random() * 5) // Placeholder
  }

  // Public methods
  public getAlerts(resolved?: boolean): Alert[] {
    return this.alerts.filter(alert => resolved === undefined || alert.resolved === resolved)
  }

  public resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
    }
  }

  public addRule(rule: AlertRule) {
    this.rules.push(rule)
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      Object.assign(rule, updates)
    }
  }

  public getRules(): AlertRule[] {
    return this.rules
  }
}

export const alertManager = AlertManager.getInstance()

// Initialize performance monitoring with alerts
if (typeof window !== 'undefined') {
  performanceMonitor.init()
}
