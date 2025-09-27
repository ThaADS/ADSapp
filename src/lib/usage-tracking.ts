/**
 * Usage Tracking System
 *
 * This module provides comprehensive resource usage tracking including:
 * - Real-time usage monitoring
 * - API call tracking
 * - Storage usage monitoring
 * - Bandwidth tracking
 * - Usage alerts and notifications
 * - Billing integration
 */

import { createClient } from '@supabase/supabase-js';

// Types for usage tracking
export interface UsageEvent {
  id: string;
  organization_id: string;
  event_type: UsageEventType;
  event_category: UsageCategory;
  resource_amount: number;
  bytes_consumed: number;
  user_id?: string;
  endpoint?: string;
  metadata: Record<string, any>;
  billable: boolean;
  cost_cents: number;
  created_at: string;
}

export interface UsageMetrics {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  metric_date: string;

  // API metrics
  api_calls_total: number;
  api_calls_whatsapp: number;
  api_calls_internal: number;
  api_calls_webhook: number;

  // Message metrics
  messages_sent: number;
  messages_received: number;
  messages_total: number;

  // Storage metrics (bytes)
  storage_used: number;
  storage_media: number;
  storage_documents: number;
  storage_backups: number;

  // Bandwidth metrics (bytes)
  bandwidth_in: number;
  bandwidth_out: number;

  // Contact and conversation metrics
  contacts_total: number;
  conversations_active: number;
  conversations_total: number;

  // Team metrics
  users_active: number;
  users_total: number;

  // Performance metrics
  avg_response_time?: string; // ISO duration
  uptime_percentage: number;

  created_at: string;
}

export interface UsageLimit {
  id: string;
  organization_id: string;
  limit_type: UsageLimitType;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  soft_limit?: number;
  hard_limit?: number;
  current_usage: number;
  alert_enabled: boolean;
  alert_threshold_percentage: number;
  last_alert_sent_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UsageEventType =
  | 'api_call'
  | 'whatsapp_api'
  | 'internal_api'
  | 'webhook'
  | 'message_sent'
  | 'message_received'
  | 'storage_upload'
  | 'storage_delete'
  | 'bandwidth_in'
  | 'bandwidth_out'
  | 'contact_created'
  | 'conversation_created'
  | 'user_invited'
  | 'automation_triggered'
  | 'template_used';

export type UsageCategory =
  | 'api'
  | 'messaging'
  | 'storage'
  | 'bandwidth'
  | 'contacts'
  | 'conversations'
  | 'users'
  | 'automations'
  | 'templates';

export type UsageLimitType =
  | 'api_calls'
  | 'messages'
  | 'storage'
  | 'bandwidth'
  | 'contacts'
  | 'users'
  | 'automations'
  | 'templates';

export interface UsageAlert {
  limitType: UsageLimitType;
  currentUsage: number;
  limit: number;
  percentage: number;
  alertType: 'warning' | 'critical' | 'exceeded';
  message: string;
}

export interface UsageReport {
  organizationId: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalApiCalls: number;
    totalMessages: number;
    totalStorage: number;
    totalBandwidth: number;
    totalCost: number;
  };
  breakdown: {
    api: UsageBreakdown;
    messaging: UsageBreakdown;
    storage: UsageBreakdown;
    bandwidth: UsageBreakdown;
  };
  alerts: UsageAlert[];
  trends: {
    apiCallsGrowth: number;
    messagesGrowth: number;
    storageGrowth: number;
  };
}

export interface UsageBreakdown {
  category: UsageCategory;
  current: number;
  limit?: number;
  percentage: number;
  cost: number;
  previousPeriod?: number;
  growth?: number;
}

export class UsageTracker {
  private supabase;
  private organizationId: string;

  constructor(supabaseUrl: string, supabaseKey: string, organizationId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.organizationId = organizationId;
  }

  /**
   * Track a usage event
   */
  async trackEvent(
    eventType: UsageEventType,
    options: {
      resourceAmount?: number;
      bytesConsumed?: number;
      userId?: string;
      endpoint?: string;
      metadata?: Record<string, any>;
      billable?: boolean;
      costCents?: number;
    } = {}
  ): Promise<UsageEvent | null> {
    const eventCategory = this.getEventCategory(eventType);

    const { data, error } = await this.supabase.rpc('track_usage_event', {
      org_id: this.organizationId,
      event_type_param: eventType,
      event_category_param: eventCategory,
      resource_amount_param: options.resourceAmount || 1,
      bytes_consumed_param: options.bytesConsumed || 0,
      user_id_param: options.userId || null,
      endpoint_param: options.endpoint || null,
      metadata_param: options.metadata || {},
    });

    if (error) {
      console.error('Error tracking usage event:', error);
      return null;
    }

    // Check if any limits are exceeded
    await this.checkLimits(eventType);

    return data;
  }

  /**
   * Get event category for event type
   */
  private getEventCategory(eventType: UsageEventType): UsageCategory {
    const categoryMap: Record<UsageEventType, UsageCategory> = {
      api_call: 'api',
      whatsapp_api: 'api',
      internal_api: 'api',
      webhook: 'api',
      message_sent: 'messaging',
      message_received: 'messaging',
      storage_upload: 'storage',
      storage_delete: 'storage',
      bandwidth_in: 'bandwidth',
      bandwidth_out: 'bandwidth',
      contact_created: 'contacts',
      conversation_created: 'conversations',
      user_invited: 'users',
      automation_triggered: 'automations',
      template_used: 'templates',
    };

    return categoryMap[eventType];
  }

  /**
   * Get current usage metrics
   */
  async getCurrentUsage(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<UsageMetrics | null> {
    const { data, error } = await this.supabase
      .from('tenant_usage_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('metric_date', this.getCurrentPeriodDate(period))
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching usage metrics:', error);
      return null;
    }

    return data;
  }

  /**
   * Get usage history
   */
  async getUsageHistory(
    days: number = 30,
    category?: UsageCategory
  ): Promise<UsageMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('tenant_usage_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get usage limits
   */
  async getUsageLimits(): Promise<UsageLimit[]> {
    const { data, error } = await this.supabase
      .from('tenant_usage_limits')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching usage limits:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Set usage limit
   */
  async setUsageLimit(
    limitType: UsageLimitType,
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    softLimit?: number,
    hardLimit?: number,
    alertThreshold: number = 80
  ): Promise<UsageLimit | null> {
    const { data, error } = await this.supabase
      .from('tenant_usage_limits')
      .upsert({
        organization_id: this.organizationId,
        limit_type: limitType,
        period_type: periodType,
        soft_limit: softLimit,
        hard_limit: hardLimit,
        alert_threshold_percentage: alertThreshold,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting usage limit:', error);
      return null;
    }

    return data;
  }

  /**
   * Check usage limits and trigger alerts
   */
  async checkLimits(eventType?: UsageEventType): Promise<UsageAlert[]> {
    const alerts: UsageAlert[] = [];
    const limits = await this.getUsageLimits();

    for (const limit of limits) {
      const limitCheck = await this.supabase.rpc('check_usage_limits', {
        org_id: this.organizationId,
        limit_type_param: limit.limit_type,
      });

      if (limitCheck.error) {
        continue;
      }

      const result = limitCheck.data;

      if (result.status === 'exceeded') {
        alerts.push({
          limitType: limit.limit_type as UsageLimitType,
          currentUsage: result.current_usage,
          limit: result.limit,
          percentage: (result.current_usage / result.limit) * 100,
          alertType: 'exceeded',
          message: `${limit.limit_type} limit exceeded`,
        });

        // Send alert if enabled
        if (limit.alert_enabled) {
          await this.sendUsageAlert(limit, result);
        }
      } else if (result.status === 'warning') {
        alerts.push({
          limitType: limit.limit_type as UsageLimitType,
          currentUsage: result.current_usage,
          limit: result.limit,
          percentage: (result.current_usage / result.limit) * 100,
          alertType: 'warning',
          message: `${limit.limit_type} usage at ${Math.round((result.current_usage / result.limit) * 100)}%`,
        });

        // Send warning if threshold reached
        const percentage = (result.current_usage / result.limit) * 100;
        if (percentage >= limit.alert_threshold_percentage && limit.alert_enabled) {
          await this.sendUsageAlert(limit, result);
        }
      }
    }

    return alerts;
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(
    startDate: Date,
    endDate: Date
  ): Promise<UsageReport> {
    const metrics = await this.supabase
      .from('tenant_usage_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0]);

    const events = await this.supabase
      .from('tenant_usage_events')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (metrics.error || events.error) {
      throw new Error('Failed to generate usage report');
    }

    const metricsData = metrics.data || [];
    const eventsData = events.data || [];

    // Calculate totals
    const totalApiCalls = metricsData.reduce((sum, m) => sum + m.api_calls_total, 0);
    const totalMessages = metricsData.reduce((sum, m) => sum + m.messages_total, 0);
    const totalStorage = Math.max(...metricsData.map(m => m.storage_used), 0);
    const totalBandwidth = metricsData.reduce((sum, m) => sum + m.bandwidth_in + m.bandwidth_out, 0);
    const totalCost = eventsData.reduce((sum, e) => sum + e.cost_cents, 0) / 100;

    // Calculate breakdown
    const breakdown = {
      api: this.calculateBreakdown('api', metricsData, totalApiCalls),
      messaging: this.calculateBreakdown('messaging', metricsData, totalMessages),
      storage: this.calculateBreakdown('storage', metricsData, totalStorage),
      bandwidth: this.calculateBreakdown('bandwidth', metricsData, totalBandwidth),
    };

    // Get current alerts
    const alerts = await this.checkLimits();

    // Calculate trends (compare with previous period)
    const trends = await this.calculateTrends(startDate, endDate);

    return {
      organizationId: this.organizationId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalApiCalls,
        totalMessages,
        totalStorage,
        totalBandwidth,
        totalCost,
      },
      breakdown,
      alerts,
      trends,
    };
  }

  /**
   * Calculate usage breakdown for a category
   */
  private calculateBreakdown(
    category: UsageCategory,
    metrics: any[],
    current: number
  ): UsageBreakdown {
    // This is a simplified calculation - you'd want more sophisticated logic
    return {
      category,
      current,
      percentage: 0, // Calculate based on limits
      cost: 0, // Calculate based on pricing
    };
  }

  /**
   * Calculate usage trends
   */
  private async calculateTrends(
    startDate: Date,
    endDate: Date
  ): Promise<{ apiCallsGrowth: number; messagesGrowth: number; storageGrowth: number }> {
    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(startDate.getTime() - periodLength);

    const prevMetrics = await this.supabase
      .from('tenant_usage_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('metric_date', prevStartDate.toISOString().split('T')[0])
      .lte('metric_date', prevEndDate.toISOString().split('T')[0]);

    if (prevMetrics.error || !prevMetrics.data) {
      return { apiCallsGrowth: 0, messagesGrowth: 0, storageGrowth: 0 };
    }

    // Calculate growth percentages
    const currentMetrics = await this.supabase
      .from('tenant_usage_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0]);

    const current = currentMetrics.data || [];
    const previous = prevMetrics.data || [];

    const currentApiCalls = current.reduce((sum, m) => sum + m.api_calls_total, 0);
    const previousApiCalls = previous.reduce((sum, m) => sum + m.api_calls_total, 0);

    const currentMessages = current.reduce((sum, m) => sum + m.messages_total, 0);
    const previousMessages = previous.reduce((sum, m) => sum + m.messages_total, 0);

    const currentStorage = Math.max(...current.map(m => m.storage_used), 0);
    const previousStorage = Math.max(...previous.map(m => m.storage_used), 0);

    return {
      apiCallsGrowth: this.calculateGrowthPercentage(previousApiCalls, currentApiCalls),
      messagesGrowth: this.calculateGrowthPercentage(previousMessages, currentMessages),
      storageGrowth: this.calculateGrowthPercentage(previousStorage, currentStorage),
    };
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowthPercentage(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Send usage alert
   */
  private async sendUsageAlert(limit: UsageLimit, usageResult: any): Promise<void> {
    // Check if we've already sent an alert recently (avoid spam)
    if (limit.last_alert_sent_at) {
      const lastAlert = new Date(limit.last_alert_sent_at);
      const hoursSinceLastAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAlert < 1) {
        return; // Don't send alerts more than once per hour
      }
    }

    // Update last alert timestamp
    await this.supabase
      .from('tenant_usage_limits')
      .update({ last_alert_sent_at: new Date().toISOString() })
      .eq('id', limit.id);

    // Send email notification (implement your email service)
    // await this.sendAlertEmail(limit, usageResult);

    // Send webhook notification if configured
    // await this.sendAlertWebhook(limit, usageResult);

    console.log(`Usage alert sent for ${limit.limit_type}: ${usageResult.current_usage}/${usageResult.limit}`);
  }

  /**
   * Get current period date
   */
  private getCurrentPeriodDate(period: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();

    switch (period) {
      case 'daily':
        return now.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      default:
        return now.toISOString().split('T')[0];
    }
  }

  /**
   * Get real-time usage stats
   */
  async getRealTimeStats(): Promise<{
    activeConnections: number;
    apiCallsLastHour: number;
    messagesLastHour: number;
    responseTime: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data: events, error } = await this.supabase
      .from('tenant_usage_events')
      .select('event_type, created_at')
      .eq('organization_id', this.organizationId)
      .gte('created_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error fetching real-time stats:', error);
      return {
        activeConnections: 0,
        apiCallsLastHour: 0,
        messagesLastHour: 0,
        responseTime: 0,
      };
    }

    const apiCalls = events?.filter(e => e.event_type.includes('api')).length || 0;
    const messages = events?.filter(e => e.event_type.includes('message')).length || 0;

    return {
      activeConnections: 0, // Would need WebSocket tracking
      apiCallsLastHour: apiCalls,
      messagesLastHour: messages,
      responseTime: 0, // Would need performance tracking
    };
  }

  /**
   * Export usage data
   */
  async exportUsageData(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' = 'json'
  ): Promise<string> {
    const events = await this.supabase
      .from('tenant_usage_events')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (events.error) {
      throw new Error('Failed to export usage data');
    }

    if (format === 'json') {
      return JSON.stringify(events.data, null, 2);
    }

    // Convert to CSV
    const csvHeaders = [
      'Date',
      'Event Type',
      'Category',
      'Resource Amount',
      'Bytes Consumed',
      'Cost (cents)',
      'Billable',
    ];

    const csvRows = events.data?.map(event => [
      new Date(event.created_at).toISOString(),
      event.event_type,
      event.event_category,
      event.resource_amount,
      event.bytes_consumed,
      event.cost_cents,
      event.billable,
    ]);

    return [csvHeaders, ...(csvRows || [])].map(row => row.join(',')).join('\n');
  }
}

/**
 * Usage tracking utilities
 */
export const usageUtils = {
  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Format currency
   */
  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  },

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(current: number, limit: number): number {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  },

  /**
   * Get usage status color
   */
  getUsageStatusColor(percentage: number): string {
    if (percentage < 50) return 'green';
    if (percentage < 80) return 'yellow';
    if (percentage < 95) return 'orange';
    return 'red';
  },

  /**
   * Estimate monthly cost
   */
  estimateMonthlyCost(dailyUsage: number, costPerUnit: number): number {
    return dailyUsage * 30 * costPerUnit;
  },
};

export default UsageTracker;