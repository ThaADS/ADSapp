// @ts-nocheck - Type definitions need review
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Zap,
  Shield,
  Crown,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export interface SubscriptionData {
  id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  planId: string
  planName: string
  price: number
  currency: string
  interval: 'month' | 'year'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEnd?: string
  cancelAt?: string
  canceledAt?: string
  createdAt: string
}

export interface PlanFeature {
  name: string
  description: string
  included: boolean
  limit?: number
}

export interface PlanData {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: PlanFeature[]
  popular: boolean
  stripePriceId: string
}

export interface UsageData {
  messages: { current: number; limit: number }
  users: { current: number; limit: number }
  contacts: { current: number; limit: number }
  automations: { current: number; limit: number }
  apiCalls: { current: number; limit: number }
  storage: { current: number; limit: number }
}

interface SubscriptionManagerProps {
  organizationId: string
}

export function SubscriptionManager({ organizationId }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [availablePlans, setAvailablePlans] = useState<PlanData[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFeedback, setCancelFeedback] = useState('')
  const [immediateCancel, setImmediateCancel] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
    fetchAvailablePlans()
    fetchUsageData()
  }, [organizationId])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/billing/subscription', {
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    }
  }

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/billing/plans')
      if (response.ok) {
        const plans = await response.json()
        setAvailablePlans(plans)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    }
  }

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/billing/usage', {
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (newPlanId: string) => {
    setActionLoading(true)
    try {
      const isUpgrade = subscription && isUpgradeFromCurrent(subscription.planId, newPlanId)
      const endpoint = isUpgrade ? '/api/billing/upgrade' : '/api/billing/downgrade'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({
          newPlanId,
          prorate: true,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: isUpgrade ? 'Plan Upgraded' : 'Plan Changed',
          description: `Successfully ${isUpgrade ? 'upgraded' : 'changed'} to ${newPlanId} plan.`,
        })
        await fetchSubscriptionData()
        setShowPlanSelector(false)
      } else {
        throw new Error('Failed to change plan')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change plan. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({
          immediate: immediateCancel,
          reason: cancelReason,
          feedback: cancelFeedback,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Subscription Cancelled',
          description: immediateCancel
            ? 'Your subscription has been cancelled immediately.'
            : 'Your subscription will be cancelled at the end of the current billing period.',
        })
        await fetchSubscriptionData()
        setShowCancelDialog(false)
      } else {
        throw new Error('Failed to cancel subscription')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/billing/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({
          planId: subscription?.planId || 'professional',
        }),
      })

      if (response.ok) {
        toast({
          title: 'Subscription Reactivated',
          description: 'Your subscription has been successfully reactivated.',
        })
        await fetchSubscriptionData()
      } else {
        throw new Error('Failed to reactivate subscription')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const isUpgradeFromCurrent = (currentPlan: string, newPlan: string): boolean => {
    const planHierarchy = { starter: 0, professional: 1, enterprise: 2 }
    return (
      planHierarchy[newPlan as keyof typeof planHierarchy] >
      planHierarchy[currentPlan as keyof typeof planHierarchy]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className='h-5 w-5 text-green-600' />
      case 'trialing':
        return <Clock className='h-5 w-5 text-blue-600' />
      case 'past_due':
        return <AlertTriangle className='h-5 w-5 text-yellow-600' />
      case 'canceled':
        return <XCircle className='h-5 w-5 text-red-600' />
      default:
        return <Clock className='h-5 w-5 text-gray-600' />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      canceled: 'outline',
      incomplete: 'destructive',
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100)
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Zap className='h-5 w-5' />
      case 'professional':
        return <Shield className='h-5 w-5' />
      case 'enterprise':
        return <Crown className='h-5 w-5' />
      default:
        return <Zap className='h-5 w-5' />
    }
  }

  if (loading) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardContent className='p-6'>
            <div className='animate-pulse space-y-4'>
              <div className='h-4 w-1/4 rounded bg-gray-200'></div>
              <div className='h-8 w-1/2 rounded bg-gray-200'></div>
              <div className='h-4 w-3/4 rounded bg-gray-200'></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Current Subscription
          </CardTitle>
          <CardDescription>Manage your subscription plan and billing</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {subscription ? (
            <>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {getPlanIcon(subscription.planId)}
                  <div>
                    <h3 className='text-lg font-semibold capitalize'>
                      {subscription.planName || subscription.planId} Plan
                    </h3>
                    <p className='text-muted-foreground text-sm'>
                      {formatCurrency(subscription.price)} / {subscription.interval}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  {getStatusIcon(subscription.status)}
                  {getStatusBadge(subscription.status)}
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <div>
                  <Label className='text-sm font-medium'>Current Period</Label>
                  <p className='text-muted-foreground text-sm'>
                    {formatDate(subscription.currentPeriodStart)} -{' '}
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>

                {subscription.trialEnd && (
                  <div>
                    <Label className='text-sm font-medium'>Trial Ends</Label>
                    <p className='text-muted-foreground text-sm'>
                      {formatDate(subscription.trialEnd)}
                    </p>
                  </div>
                )}

                {subscription.cancelAt && (
                  <div>
                    <Label className='text-sm font-medium'>Cancels At</Label>
                    <p className='text-sm text-red-600'>{formatDate(subscription.cancelAt)}</p>
                  </div>
                )}
              </div>

              <div className='flex flex-wrap gap-2'>
                {subscription.status === 'active' && !subscription.cancelAt && (
                  <>
                    <Button onClick={() => setShowPlanSelector(true)} variant='outline'>
                      <TrendingUp className='mr-2 h-4 w-4' />
                      Change Plan
                    </Button>
                    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant='outline'>
                          <XCircle className='mr-2 h-4 w-4' />
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            We're sorry to see you go. Please let us know why you're cancelling.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className='space-y-4'>
                          <div>
                            <Label htmlFor='reason'>Reason for cancellation</Label>
                            <Select value={cancelReason} onValueChange={setCancelReason}>
                              <SelectTrigger>
                                <SelectValue placeholder='Select a reason' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='too_expensive'>Too expensive</SelectItem>
                                <SelectItem value='not_using'>Not using enough</SelectItem>
                                <SelectItem value='missing_features'>Missing features</SelectItem>
                                <SelectItem value='poor_support'>Poor support</SelectItem>
                                <SelectItem value='switching_service'>
                                  Switching to another service
                                </SelectItem>
                                <SelectItem value='other'>Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor='feedback'>Additional feedback (optional)</Label>
                            <Textarea
                              id='feedback'
                              value={cancelFeedback}
                              onChange={e => setCancelFeedback(e.target.value)}
                              placeholder='Help us improve by sharing your feedback...'
                            />
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Switch
                              id='immediate'
                              checked={immediateCancel}
                              onCheckedChange={setImmediateCancel}
                            />
                            <Label htmlFor='immediate'>
                              Cancel immediately (vs. at period end)
                            </Label>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={!cancelReason || actionLoading}
                            className='bg-red-600 hover:bg-red-700'
                          >
                            {actionLoading ? (
                              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                            ) : null}
                            Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {subscription.status === 'canceled' && (
                  <Button onClick={handleReactivateSubscription} disabled={actionLoading}>
                    {actionLoading ? (
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <CheckCircle className='mr-2 h-4 w-4' />
                    )}
                    Reactivate Subscription
                  </Button>
                )}

                {subscription.cancelAt && (
                  <Button
                    onClick={handleReactivateSubscription}
                    variant='outline'
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <RefreshCw className='mr-2 h-4 w-4' />
                    )}
                    Undo Cancellation
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className='py-8 text-center'>
              <h3 className='mb-2 text-lg font-semibold'>No Active Subscription</h3>
              <p className='text-muted-foreground mb-4'>Choose a plan to get started with ADSapp</p>
              <Button onClick={() => setShowPlanSelector(true)}>Choose Plan</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Overview */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5' />
              Usage Overview
            </CardTitle>
            <CardDescription>Track your current usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4' />
                    Messages
                  </Label>
                  <span className='text-sm font-medium'>
                    {usage.messages.current.toLocaleString()} /{' '}
                    {usage.messages.limit === -1 ? '∞' : usage.messages.limit.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.messages.current, usage.messages.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.messages.current, usage.messages.limit)
                  )}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    Users
                  </Label>
                  <span className='text-sm font-medium'>
                    {usage.users.current} / {usage.users.limit === -1 ? '∞' : usage.users.limit}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.users.current, usage.users.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.users.current, usage.users.limit)
                  )}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    Contacts
                  </Label>
                  <span className='text-sm font-medium'>
                    {usage.contacts.current.toLocaleString()} /{' '}
                    {usage.contacts.limit === -1 ? '∞' : usage.contacts.limit.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.contacts.current, usage.contacts.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.contacts.current, usage.contacts.limit)
                  )}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <Zap className='h-4 w-4' />
                    Automations
                  </Label>
                  <span className='text-sm font-medium'>
                    {usage.automations.current} /{' '}
                    {usage.automations.limit === -1 ? '∞' : usage.automations.limit}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.automations.current, usage.automations.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.automations.current, usage.automations.limit)
                  )}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4' />
                    API Calls
                  </Label>
                  <span className='text-sm font-medium'>
                    {usage.apiCalls.current.toLocaleString()} /{' '}
                    {usage.apiCalls.limit === -1 ? '∞' : usage.apiCalls.limit.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.apiCalls.current, usage.apiCalls.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.apiCalls.current, usage.apiCalls.limit)
                  )}
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4' />
                    Storage
                  </Label>
                  <span className='text-sm font-medium'>
                    {(usage.storage.current / 1024).toFixed(1)} GB /{' '}
                    {usage.storage.limit === -1 ? '∞' : (usage.storage.limit / 1024).toFixed(1)} GB
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(usage.storage.current, usage.storage.limit)}
                  className={getUsageColor(
                    getUsagePercentage(usage.storage.current, usage.storage.limit)
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Selector Dialog */}
      <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>Select the plan that best fits your needs</DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {availablePlans.map(plan => (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'ring-2 ring-blue-600' : ''} ${
                  selectedPlan === plan.id ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className='absolute -top-2 left-1/2 -translate-x-1/2 transform bg-blue-600'>
                    Most Popular
                  </Badge>
                )}
                <CardHeader className='text-center'>
                  <div className='mb-2 flex justify-center'>{getPlanIcon(plan.id)}</div>
                  <CardTitle className='capitalize'>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className='text-3xl font-bold'>
                    {formatCurrency(plan.price)}
                    <span className='text-muted-foreground text-lg font-normal'>
                      /{plan.interval}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className='mb-6 space-y-2'>
                    {plan.features.map((feature, index) => (
                      <li key={index} className='flex items-start gap-2 text-sm'>
                        {feature.included ? (
                          <CheckCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-600' />
                        ) : (
                          <XCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400' />
                        )}
                        <span className={feature.included ? '' : 'text-gray-400'}>
                          {feature.name}
                          {feature.limit &&
                            ` (${feature.limit === -1 ? 'Unlimited' : feature.limit})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className='w-full'
                    variant={plan.id === subscription?.planId ? 'outline' : 'default'}
                    disabled={plan.id === subscription?.planId || actionLoading}
                    onClick={() => {
                      setSelectedPlan(plan.id)
                      handlePlanChange(plan.id)
                    }}
                  >
                    {actionLoading && selectedPlan === plan.id ? (
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    ) : null}
                    {plan.id === subscription?.planId ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowPlanSelector(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
