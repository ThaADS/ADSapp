import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { isBuildTime } from '@/lib/build-safe-init'

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  inApp: boolean
  webhooks: boolean
  emailAddress?: string
  smsNumber?: string
  webhookUrl?: string
}

export interface NotificationData {
  organizationId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  urgency: 'low' | 'medium' | 'high' | 'critical'
  channels: string[]
}

export interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
  variables: Record<string, any>
}

export class NotificationService {
  private resend: Resend | null = null

  constructor() {
    if (process.env.RESEND_API_KEY && !isBuildTime()) {
      this.resend = new Resend(process.env.RESEND_API_KEY)
    }
  }

  // Subscription notifications
  async sendSubscriptionWelcome(organizationId: string, planId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'subscription_welcome',
      title: 'Welcome to ADSapp!',
      message: `Your ${planId} subscription is now active. You can start using all the features immediately.`,
      data: { planId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendPlanUpgradeNotification(organizationId: string, newPlanId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'plan_upgrade',
      title: 'Plan Upgraded Successfully',
      message: `Your subscription has been upgraded to ${newPlanId}. New features are now available!`,
      data: { newPlanId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendPlanDowngradeNotification(organizationId: string, newPlanId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'plan_downgrade',
      title: 'Plan Downgraded',
      message: `Your subscription has been changed to ${newPlanId}. Some features may be limited.`,
      data: { newPlanId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendSubscriptionCancellation(organizationId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      message:
        'Your subscription has been cancelled. You can reactivate it anytime from your billing settings.',
      urgency: 'high',
      channels: ['email', 'in_app'],
    })
  }

  async sendSubscriptionReactivation(organizationId: string, planId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'subscription_reactivated',
      title: 'Welcome Back!',
      message: `Your ${planId} subscription has been reactivated. All features are now available again.`,
      data: { planId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendTrialEndingNotification(organizationId: string, daysLeft: number): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'trial_ending',
      title: 'Trial Ending Soon',
      message: `Your free trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to continue using all features.`,
      data: { daysLeft },
      urgency: 'high',
      channels: ['email', 'in_app'],
    })
  }

  // Payment notifications
  async sendPaymentSuccess(organizationId: string, amount: number): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of $${(amount / 100).toFixed(2)} has been processed successfully.`,
      data: { amount },
      urgency: 'low',
      channels: ['email', 'in_app'],
    })
  }

  async sendPaymentFailed(organizationId: string, amount: number): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `We couldn't process your payment of $${(amount / 100).toFixed(2)}. Please update your payment method.`,
      data: { amount },
      urgency: 'critical',
      channels: ['email', 'in_app', 'sms'],
    })
  }

  async sendPaymentActionRequired(organizationId: string, invoiceUrl: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'payment_action_required',
      title: 'Action Required for Payment',
      message:
        'Your payment requires additional authentication. Please complete the verification process.',
      data: { invoiceUrl },
      urgency: 'high',
      channels: ['email', 'in_app'],
    })
  }

  // Invoice notifications
  async sendInvoiceFinalized(organizationId: string, invoiceId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'invoice_finalized',
      title: 'New Invoice Available',
      message:
        'Your new invoice is ready. Payment will be automatically charged to your default payment method.',
      data: { invoiceId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendUpcomingInvoice(organizationId: string, amount: number): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'upcoming_invoice',
      title: 'Upcoming Invoice',
      message: `Your next invoice of $${(amount / 100).toFixed(2)} will be charged in 3 days.`,
      data: { amount },
      urgency: 'low',
      channels: ['email', 'in_app'],
    })
  }

  // Usage notifications
  async sendUsageThresholdAlert(
    organizationId: string,
    metric: string,
    usage: number,
    limit: number,
    threshold: number
  ): Promise<void> {
    const percentage = Math.round((usage / limit) * 100)

    await this.sendNotification({
      organizationId,
      type: 'usage_threshold',
      title: `${metric} Usage Alert`,
      message: `You've used ${percentage}% of your ${metric} limit (${usage}/${limit}). Consider upgrading your plan.`,
      data: { metric, usage, limit, percentage },
      urgency: percentage >= 90 ? 'high' : 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendUsageLimitExceeded(
    organizationId: string,
    metric: string,
    usage: number,
    limit: number
  ): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'usage_limit_exceeded',
      title: `${metric} Limit Exceeded`,
      message: `You've exceeded your ${metric} limit (${usage}/${limit}). Overage charges may apply.`,
      data: { metric, usage, limit },
      urgency: 'high',
      channels: ['email', 'in_app'],
    })
  }

  // Checkout notifications
  async sendCheckoutSuccess(organizationId: string, planId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'checkout_success',
      title: 'Subscription Activated',
      message: `Your ${planId} subscription is now active. Welcome to ADSapp!`,
      data: { planId },
      urgency: 'medium',
      channels: ['email', 'in_app'],
    })
  }

  async sendCheckoutExpired(organizationId: string): Promise<void> {
    await this.sendNotification({
      organizationId,
      type: 'checkout_expired',
      title: 'Checkout Session Expired',
      message: 'Your checkout session has expired. Please try again to complete your subscription.',
      urgency: 'medium',
      channels: ['in_app'],
    })
  }

  // Core notification methods
  async sendNotification(notification: NotificationData): Promise<void> {
    const supabase = await createClient()

    // Get organization and notification preferences
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', notification.organizationId)
      .single()

    if (!org) {
      console.error('Organization not found:', notification.organizationId)
      return
    }

    const preferences = await this.getNotificationPreferences(notification.organizationId)

    // Store notification in database
    const { data: storedNotification } = await supabase
      .from('notifications')
      .insert({
        organization_id: notification.organizationId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        urgency: notification.urgency,
        channels: notification.channels,
        created_at: new Date().toISOString(),
        read: false,
      })
      .select()
      .single()

    // Send through enabled channels
    const sendPromises = []

    if (notification.channels.includes('email') && preferences.email && preferences.emailAddress) {
      sendPromises.push(this.sendEmailNotification(preferences.emailAddress, notification, org))
    }

    if (notification.channels.includes('sms') && preferences.sms && preferences.smsNumber) {
      sendPromises.push(this.sendSMSNotification(preferences.smsNumber, notification))
    }

    if (
      notification.channels.includes('webhook') &&
      preferences.webhooks &&
      preferences.webhookUrl
    ) {
      sendPromises.push(this.sendWebhookNotification(preferences.webhookUrl, notification))
    }

    // In-app notifications are handled by storing in database
    if (notification.channels.includes('in_app')) {
      // Already stored above, trigger real-time update if using websockets
      await this.triggerRealTimeUpdate(notification.organizationId, storedNotification)
    }

    // Wait for all notifications to send
    await Promise.allSettled(sendPromises)
  }

  async getNotificationPreferences(organizationId: string): Promise<NotificationPreferences> {
    const supabase = await createClient()

    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (!preferences) {
      // Return default preferences
      return {
        email: true,
        sms: false,
        inApp: true,
        webhooks: false,
      }
    }

    return {
      email: preferences.email_enabled,
      sms: preferences.sms_enabled,
      inApp: preferences.in_app_enabled,
      webhooks: preferences.webhook_enabled,
      emailAddress: preferences.email_address,
      smsNumber: preferences.sms_number,
      webhookUrl: preferences.webhook_url,
    }
  }

  async updateNotificationPreferences(
    organizationId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const supabase = await createClient()

    await supabase.from('notification_preferences').upsert({
      organization_id: organizationId,
      email_enabled: preferences.email,
      sms_enabled: preferences.sms,
      in_app_enabled: preferences.inApp,
      webhook_enabled: preferences.webhooks,
      email_address: preferences.emailAddress,
      sms_number: preferences.smsNumber,
      webhook_url: preferences.webhookUrl,
      updated_at: new Date().toISOString(),
    })
  }

  async getNotifications(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      type?: string
    } = {}
  ): Promise<{ notifications: any[]; total: number }> {
    const supabase = await createClient()

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (options.unreadOnly) {
      query = query.eq('read', false)
    }

    if (options.type) {
      query = query.eq('type', options.type)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, count, error } = await query

    if (error) {
      throw error
    }

    return {
      notifications: data || [],
      total: count || 0,
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
  }

  async markAllNotificationsAsRead(organizationId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('read', false)
  }

  // Private helper methods
  private async sendEmailNotification(
    emailAddress: string,
    notification: NotificationData,
    organization: any
  ): Promise<void> {
    if (!this.resend) {
      console.warn('Resend not configured, skipping email notification')
      return
    }

    try {
      const template = this.getEmailTemplate(notification, organization)

      await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@adsapp.com',
        to: emailAddress,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      })
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  private async sendSMSNotification(
    phoneNumber: string,
    notification: NotificationData
  ): Promise<void> {
    // Implement SMS notification using Twilio or similar service
    console.log(`SMS notification to ${phoneNumber}: ${notification.message}`)
  }

  private async sendWebhookNotification(
    webhookUrl: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ADSapp-Webhook/1.0',
        },
        body: JSON.stringify({
          event: notification.type,
          data: notification,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
    }
  }

  private async triggerRealTimeUpdate(organizationId: string, notification: any): Promise<void> {
    // Implement real-time notification using Supabase realtime or websockets
    console.log(`Real-time notification for org ${organizationId}:`, notification)
  }

  private getEmailTemplate(notification: NotificationData, organization: any): EmailTemplate {
    const baseTemplate = {
      variables: {
        organizationName: organization.name,
        notificationTitle: notification.title,
        notificationMessage: notification.message,
        urgency: notification.urgency,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        billingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        ...notification.data,
      },
    }

    switch (notification.type) {
      case 'payment_failed':
        return {
          ...baseTemplate,
          subject: '🚨 Payment Failed - Action Required',
          htmlContent: this.getPaymentFailedEmailHTML(baseTemplate.variables),
          textContent: this.getPaymentFailedEmailText(baseTemplate.variables),
        }

      case 'trial_ending':
        return {
          ...baseTemplate,
          subject: '⏰ Your trial expires soon',
          htmlContent: this.getTrialEndingEmailHTML(baseTemplate.variables),
          textContent: this.getTrialEndingEmailText(baseTemplate.variables),
        }

      case 'subscription_welcome':
        return {
          ...baseTemplate,
          subject: '🎉 Welcome to ADSapp!',
          htmlContent: this.getWelcomeEmailHTML(baseTemplate.variables),
          textContent: this.getWelcomeEmailText(baseTemplate.variables),
        }

      default:
        return {
          ...baseTemplate,
          subject: notification.title,
          htmlContent: this.getGenericEmailHTML(baseTemplate.variables),
          textContent: this.getGenericEmailText(baseTemplate.variables),
        }
    }
  }

  private getPaymentFailedEmailHTML(vars: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payment Failed</h2>
        <p>Hi ${vars.organizationName},</p>
        <p>We weren't able to process your payment of $${(vars.amount / 100).toFixed(2)}. To avoid service interruption, please update your payment method as soon as possible.</p>
        <div style="margin: 30px 0;">
          <a href="${vars.billingUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Payment Method</a>
        </div>
        <p>If you have questions, please contact our support team.</p>
        <p>Best regards,<br>The ADSapp Team</p>
      </div>
    `
  }

  private getPaymentFailedEmailText(vars: any): string {
    return `
Payment Failed

Hi ${vars.organizationName},

We weren't able to process your payment of $${(vars.amount / 100).toFixed(2)}. To avoid service interruption, please update your payment method as soon as possible.

Update your payment method: ${vars.billingUrl}

If you have questions, please contact our support team.

Best regards,
The ADSapp Team
    `.trim()
  }

  private getTrialEndingEmailHTML(vars: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Your trial expires in ${vars.daysLeft} day${vars.daysLeft !== 1 ? 's' : ''}</h2>
        <p>Hi ${vars.organizationName},</p>
        <p>Your free trial is ending soon. Upgrade now to continue using all ADSapp features without interruption.</p>
        <div style="margin: 30px 0;">
          <a href="${vars.billingUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Upgrade Now</a>
        </div>
        <p>Questions? We're here to help!</p>
        <p>Best regards,<br>The ADSapp Team</p>
      </div>
    `
  }

  private getTrialEndingEmailText(vars: any): string {
    return `
Your trial expires in ${vars.daysLeft} day${vars.daysLeft !== 1 ? 's' : ''}

Hi ${vars.organizationName},

Your free trial is ending soon. Upgrade now to continue using all ADSapp features without interruption.

Upgrade now: ${vars.billingUrl}

Questions? We're here to help!

Best regards,
The ADSapp Team
    `.trim()
  }

  private getWelcomeEmailHTML(vars: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Welcome to ADSapp!</h2>
        <p>Hi ${vars.organizationName},</p>
        <p>Your ${vars.planId} subscription is now active. You're all set to start managing your WhatsApp communications like a pro!</p>
        <div style="margin: 30px 0;">
          <a href="${vars.dashboardUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
        </div>
        <p>If you need any help getting started, check out our guides or contact support.</p>
        <p>Welcome aboard!<br>The ADSapp Team</p>
      </div>
    `
  }

  private getWelcomeEmailText(vars: any): string {
    return `
Welcome to ADSapp!

Hi ${vars.organizationName},

Your ${vars.planId} subscription is now active. You're all set to start managing your WhatsApp communications like a pro!

Go to your dashboard: ${vars.dashboardUrl}

If you need any help getting started, check out our guides or contact support.

Welcome aboard!
The ADSapp Team
    `.trim()
  }

  private getGenericEmailHTML(vars: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${vars.notificationTitle}</h2>
        <p>Hi ${vars.organizationName},</p>
        <p>${vars.notificationMessage}</p>
        <div style="margin: 30px 0;">
          <a href="${vars.dashboardUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Dashboard</a>
        </div>
        <p>Best regards,<br>The ADSapp Team</p>
      </div>
    `
  }

  private getGenericEmailText(vars: any): string {
    return `
${vars.notificationTitle}

Hi ${vars.organizationName},

${vars.notificationMessage}

View your dashboard: ${vars.dashboardUrl}

Best regards,
The ADSapp Team
    `.trim()
  }
}
