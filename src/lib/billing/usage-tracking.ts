import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/server'

export interface UsageMetrics {
  messages: number
  users: number
  contacts: number
  automationRuns: number
  apiCalls: number
  storageUsed: number // in MB
}

export interface UsageLimits {
  maxMessages: number
  maxUsers: number
  maxContacts: number
  maxAutomationRuns: number
  maxApiCalls: number
  maxStorageSize: number // in MB
  overageRates: {
    messagesPerCent: number
    usersPerDollar: number
    contactsPerCent: number
    automationRunsPerCent: number
    apiCallsPerCent: number
    storagePerGb: number
  }
}

export interface OverageCharges {
  messages: number
  users: number
  contacts: number
  automationRuns: number
  apiCalls: number
  storage: number
  total: number
}

export class UsageTracker {
  private supabase = createClient()

  async initializeUsageForOrganization(organizationId: string): Promise<void> {
    const supabase = await this.supabase
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Create initial usage record for current month
    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: startOfMonth.toISOString(),
        period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        messages_sent: 0,
        users_active: 0,
        contacts_managed: 0,
        automation_runs: 0,
        api_calls: 0,
        storage_used: 0,
        overage_charges: 0,
        last_updated: now.toISOString(),
      })
      .on('conflict', (existing) => existing.do_nothing())
  }

  async recordMessageUsage(organizationId: string, messageCount: number = 1): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        messages_sent: messageCount,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        messages_sent: existing.messages_sent + messageCount,
        last_updated: new Date().toISOString(),
      }))

    // Check if usage exceeds limits and calculate overage
    await this.calculateAndUpdateOverages(organizationId)
  }

  async recordUserActivity(organizationId: string, userId: string): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    // Record user activity for the current period
    await supabase
      .from('user_activity_tracking')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        period_start: currentPeriod.start,
        last_active: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        last_active: new Date().toISOString(),
      }))

    // Update monthly active users count
    await this.updateActiveUsersCount(organizationId)
  }

  async recordContactUsage(organizationId: string, contactCount: number): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        contacts_managed: contactCount,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        contacts_managed: Math.max(existing.contacts_managed, contactCount),
        last_updated: new Date().toISOString(),
      }))

    await this.calculateAndUpdateOverages(organizationId)
  }

  async recordAutomationUsage(organizationId: string, automationRuns: number = 1): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        automation_runs: automationRuns,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        automation_runs: existing.automation_runs + automationRuns,
        last_updated: new Date().toISOString(),
      }))

    await this.calculateAndUpdateOverages(organizationId)
  }

  async recordApiUsage(organizationId: string, apiCalls: number = 1): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        api_calls: apiCalls,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        api_calls: existing.api_calls + apiCalls,
        last_updated: new Date().toISOString(),
      }))

    await this.calculateAndUpdateOverages(organizationId)
  }

  async recordStorageUsage(organizationId: string, storageMB: number): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        storage_used: storageMB,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        storage_used: Math.max(existing.storage_used, storageMB),
        last_updated: new Date().toISOString(),
      }))

    await this.calculateAndUpdateOverages(organizationId)
  }

  async getCurrentUsage(organizationId: string): Promise<UsageMetrics> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period_start', currentPeriod.start)
      .single()

    if (!usage) {
      return {
        messages: 0,
        users: 0,
        contacts: 0,
        automationRuns: 0,
        apiCalls: 0,
        storageUsed: 0,
      }
    }

    return {
      messages: usage.messages_sent || 0,
      users: usage.users_active || 0,
      contacts: usage.contacts_managed || 0,
      automationRuns: usage.automation_runs || 0,
      apiCalls: usage.api_calls || 0,
      storageUsed: usage.storage_used || 0,
    }
  }

  async getPlanLimits(planId: string): Promise<UsageLimits> {
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]
    if (!plan) {
      return this.getDefaultLimits()
    }

    // Enhanced limits with overage rates
    const limits: UsageLimits = {
      maxMessages: plan.limits.maxMessages,
      maxUsers: plan.limits.maxUsers,
      maxContacts: plan.limits.maxContacts,
      maxAutomationRuns: plan.limits.automationRules * 100, // 100 runs per rule
      maxApiCalls: plan.limits.maxMessages * 2, // 2 API calls per message
      maxStorageSize: this.getStorageLimit(planId),
      overageRates: this.getOverageRates(planId),
    }

    return limits
  }

  async calculateOverageCharges(organizationId: string): Promise<number> {
    const supabase = await this.supabase

    // Get organization plan
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!org) return 0

    const usage = await this.getCurrentUsage(organizationId)
    const limits = await this.getPlanLimits(org.subscription_tier)

    let totalOverage = 0

    // Calculate message overage
    if (limits.maxMessages !== -1 && usage.messages > limits.maxMessages) {
      const overageMessages = usage.messages - limits.maxMessages
      totalOverage += Math.ceil(overageMessages / 100) * limits.overageRates.messagesPerCent
    }

    // Calculate user overage
    if (limits.maxUsers !== -1 && usage.users > limits.maxUsers) {
      const overageUsers = usage.users - limits.maxUsers
      totalOverage += overageUsers * limits.overageRates.usersPerDollar
    }

    // Calculate contact overage
    if (limits.maxContacts !== -1 && usage.contacts > limits.maxContacts) {
      const overageContacts = usage.contacts - limits.maxContacts
      totalOverage += Math.ceil(overageContacts / 100) * limits.overageRates.contactsPerCent
    }

    // Calculate automation overage
    if (limits.maxAutomationRuns !== -1 && usage.automationRuns > limits.maxAutomationRuns) {
      const overageRuns = usage.automationRuns - limits.maxAutomationRuns
      totalOverage += Math.ceil(overageRuns / 100) * limits.overageRates.automationRunsPerCent
    }

    // Calculate API overage
    if (limits.maxApiCalls !== -1 && usage.apiCalls > limits.maxApiCalls) {
      const overageCalls = usage.apiCalls - limits.maxApiCalls
      totalOverage += Math.ceil(overageCalls / 1000) * limits.overageRates.apiCallsPerCent
    }

    // Calculate storage overage
    if (limits.maxStorageSize !== -1 && usage.storageUsed > limits.maxStorageSize) {
      const overageStorage = usage.storageUsed - limits.maxStorageSize
      const overageGB = Math.ceil(overageStorage / 1024)
      totalOverage += overageGB * limits.overageRates.storagePerGb
    }

    return totalOverage
  }

  async addUsageBasedCharges(subscriptionId: string, amount: number): Promise<void> {
    if (amount <= 0) return

    try {
      // Create usage record on subscription
      await stripe.subscriptionItems.createUsageRecord(
        subscriptionId,
        {
          quantity: Math.round(amount * 100), // Convert to cents
          timestamp: Math.floor(Date.now() / 1000),
        }
      )
    } catch (error) {
      console.error('Failed to add usage-based charges:', error)
    }
  }

  async resetMonthlyUsage(organizationId: string): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    // Archive current usage
    const { data: currentUsage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period_start', currentPeriod.start)
      .single()

    if (currentUsage) {
      await supabase
        .from('usage_history')
        .insert({
          ...currentUsage,
          archived_at: new Date().toISOString(),
        })
    }

    // Create new usage record for next month
    const nextPeriod = this.getNextBillingPeriod()
    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: nextPeriod.start,
        period_end: nextPeriod.end,
        messages_sent: 0,
        users_active: 0,
        contacts_managed: 0,
        automation_runs: 0,
        api_calls: 0,
        storage_used: 0,
        overage_charges: 0,
        last_updated: new Date().toISOString(),
      })
  }

  async updatePlanLimits(organizationId: string, newPlanId: string): Promise<void> {
    // Implementation for updating plan limits
    console.log(`Updating plan limits for org ${organizationId} to ${newPlanId}`)
  }

  async enforceDowngradeLimits(organizationId: string, newPlanId: string): Promise<void> {
    const supabase = await this.supabase
    const newLimits = await this.getPlanLimits(newPlanId)

    // Enforce user limits
    if (newLimits.maxUsers !== -1) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })

      if (users && users.length > newLimits.maxUsers) {
        const usersToDeactivate = users.slice(newLimits.maxUsers)
        await supabase
          .from('profiles')
          .update({ is_active: false })
          .in('id', usersToDeactivate.map(u => u.id))
      }
    }

    // Enforce contact limits
    if (newLimits.maxContacts !== -1) {
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      if (contactCount && contactCount > newLimits.maxContacts) {
        // Archive oldest contacts
        const { data: contactsToArchive } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', organizationId)
          .order('last_message_at', { ascending: true, nullsFirst: true })
          .limit(contactCount - newLimits.maxContacts)

        if (contactsToArchive) {
          await supabase
            .from('contacts')
            .update({ is_archived: true })
            .in('id', contactsToArchive.map(c => c.id))
        }
      }
    }
  }

  private async updateActiveUsersCount(organizationId: string): Promise<void> {
    const supabase = await this.supabase
    const currentPeriod = this.getCurrentBillingPeriod()

    // Count unique active users in current period
    const { count: activeUsers } = await supabase
      .from('user_activity_tracking')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('period_start', currentPeriod.start)

    // Update usage tracking
    await supabase
      .from('usage_tracking')
      .upsert({
        organization_id: organizationId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        users_active: activeUsers || 0,
        last_updated: new Date().toISOString(),
      })
      .on('conflict', (existing) => ({
        ...existing,
        users_active: activeUsers || 0,
        last_updated: new Date().toISOString(),
      }))
  }

  private async calculateAndUpdateOverages(organizationId: string): Promise<void> {
    const overageAmount = await this.calculateOverageCharges(organizationId)

    if (overageAmount > 0) {
      const supabase = await this.supabase
      const currentPeriod = this.getCurrentBillingPeriod()

      await supabase
        .from('usage_tracking')
        .update({
          overage_charges: overageAmount,
          last_updated: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .eq('period_start', currentPeriod.start)
    }
  }

  private getCurrentBillingPeriod(): { start: string; end: string } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }

  private getNextBillingPeriod(): { start: string; end: string } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }

  private getStorageLimit(planId: string): number {
    const storageLimits = {
      starter: 1024, // 1GB
      professional: 10240, // 10GB
      enterprise: -1, // Unlimited
    }
    return storageLimits[planId as keyof typeof storageLimits] || 1024
  }

  private getOverageRates(planId: string): UsageLimits['overageRates'] {
    const baseRates = {
      messagesPerCent: 2, // $0.02 per 100 messages
      usersPerDollar: 5, // $5 per additional user
      contactsPerCent: 1, // $0.01 per 100 contacts
      automationRunsPerCent: 1, // $0.01 per 100 runs
      apiCallsPerCent: 1, // $0.01 per 1000 calls
      storagePerGb: 1, // $1 per GB
    }

    // Enterprise gets better rates
    if (planId === 'enterprise') {
      return {
        messagesPerCent: 1,
        usersPerDollar: 3,
        contactsPerCent: 0.5,
        automationRunsPerCent: 0.5,
        apiCallsPerCent: 0.5,
        storagePerGb: 0.5,
      }
    }

    return baseRates
  }

  private getDefaultLimits(): UsageLimits {
    return {
      maxMessages: 1000,
      maxUsers: 3,
      maxContacts: 1000,
      maxAutomationRuns: 500,
      maxApiCalls: 2000,
      maxStorageSize: 1024,
      overageRates: this.getOverageRates('starter'),
    }
  }
}