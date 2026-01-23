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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  Plus,
  Star,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Shield,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'sepa_debit' | 'us_bank_account'
  brand?: string
  last4: string
  expiryMonth?: number
  expiryYear?: number
  country?: string
  isDefault: boolean
  isActive: boolean
  failureCount: number
  lastFailure?: {
    code: string
    message: string
    timestamp: string
  }
  createdAt: string
}

interface PaymentMethodsProps {
  organizationId: string
}

export function PaymentMethods({ organizationId }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [setupIntent, setSetupIntent] = useState<{
    clientSecret: string
    setupIntentId: string
  } | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    expiryMonth: '',
    expiryYear: '',
  })

  useEffect(() => {
    fetchPaymentMethods()
  }, [organizationId])

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/billing/payment-methods', {
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (response.ok) {
        const methods = await response.json()
        setPaymentMethods(methods)
      } else {
        throw new Error('Failed to fetch payment methods')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createSetupIntent = async () => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/billing/payment-methods/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({
          setAsDefault: paymentMethods.length === 0, // Set as default if it's the first method
        }),
      })

      if (response.ok) {
        const intent = await response.json()
        setSetupIntent(intent)
        setShowAddDialog(true)
      } else {
        throw new Error('Failed to create setup intent')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initialize payment method setup',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/billing/payment-methods/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({ paymentMethodId }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Default payment method updated',
        })
        await fetchPaymentMethods()
      } else {
        throw new Error('Failed to set default payment method')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update default payment method',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payment method removed',
        })
        await fetchPaymentMethods()
      } else {
        throw new Error('Failed to delete payment method')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove payment method',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const updatePaymentMethod = async () => {
    if (!editingMethod) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/billing/payment-methods/${editingMethod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId,
        },
        body: JSON.stringify({
          expiryMonth: parseInt(editForm.expiryMonth),
          expiryYear: parseInt(editForm.expiryYear),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payment method updated',
        })
        await fetchPaymentMethods()
        setShowEditDialog(false)
        setEditingMethod(null)
      } else {
        throw new Error('Failed to update payment method')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment method',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getCardBrandIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return (
          <div className='flex h-5 w-8 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white'>
            VISA
          </div>
        )
      case 'mastercard':
        return (
          <div className='flex h-5 w-8 items-center justify-center rounded bg-red-600 text-xs font-bold text-white'>
            MC
          </div>
        )
      case 'amex':
        return (
          <div className='flex h-5 w-8 items-center justify-center rounded bg-green-600 text-xs font-bold text-white'>
            AMEX
          </div>
        )
      default:
        return <CreditCard className='h-5 w-5 text-gray-500' />
    }
  }

  const formatExpiryDate = (month?: number, year?: number) => {
    if (!month || !year) return ''
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`
  }

  const isExpiringSoon = (month?: number, year?: number) => {
    if (!month || !year) return false

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const expiry = new Date(year, month - 1)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

    return expiry <= threeMonthsFromNow
  }

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method)
    setEditForm({
      expiryMonth: method.expiryMonth?.toString() || '',
      expiryYear: method.expiryYear?.toString() || '',
    })
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='animate-pulse space-y-4'>
            {[...Array(2)].map((_, i) => (
              <div key={i} className='flex items-center gap-4 rounded-lg border p-4'>
                <div className='h-5 w-8 rounded bg-gray-200'></div>
                <div className='flex-1'>
                  <div className='mb-2 h-4 w-32 rounded bg-gray-200'></div>
                  <div className='h-3 w-20 rounded bg-gray-200'></div>
                </div>
                <div className='h-8 w-16 rounded bg-gray-200'></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <CreditCard className='h-5 w-5' />
              Payment Methods
            </CardTitle>
            <CardDescription>Manage your payment methods and billing preferences</CardDescription>
          </div>
          <Button onClick={createSetupIntent} disabled={actionLoading}>
            {actionLoading ? (
              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Plus className='mr-2 h-4 w-4' />
            )}
            Add Payment Method
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className='py-8 text-center'>
            <CreditCard className='mx-auto mb-4 h-12 w-12 text-gray-400' />
            <h3 className='mb-2 text-lg font-semibold'>No payment methods</h3>
            <p className='text-muted-foreground mb-4'>
              Add a payment method to manage your subscription
            </p>
            <Button onClick={createSetupIntent} disabled={actionLoading}>
              {actionLoading ? (
                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Plus className='mr-2 h-4 w-4' />
              )}
              Add Payment Method
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  method.isDefault ? 'bg-blue-50 ring-2 ring-blue-600' : ''
                }`}
              >
                <div className='flex items-center gap-3'>
                  {getCardBrandIcon(method.brand)}
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>•••• •••• •••• {method.last4}</span>
                      {method.isDefault && (
                        <Badge variant='default' className='text-xs'>
                          <Star className='mr-1 h-3 w-3' />
                          Default
                        </Badge>
                      )}
                      {isExpiringSoon(method.expiryMonth, method.expiryYear) && (
                        <Badge variant='destructive' className='text-xs'>
                          <AlertTriangle className='mr-1 h-3 w-3' />
                          Expires Soon
                        </Badge>
                      )}
                      {method.failureCount > 0 && (
                        <Badge variant='destructive' className='text-xs'>
                          {method.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <div className='text-muted-foreground flex items-center gap-4 text-sm'>
                      {method.expiryMonth && method.expiryYear && (
                        <span className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3' />
                          Expires {formatExpiryDate(method.expiryMonth, method.expiryYear)}
                        </span>
                      )}
                      {method.country && <span className='uppercase'>{method.country}</span>}
                    </div>
                  </div>
                </div>

                <div className='ml-auto flex items-center gap-2'>
                  {!method.isDefault && method.isActive && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setDefaultPaymentMethod(method.id)}
                      disabled={actionLoading}
                    >
                      Set as Default
                    </Button>
                  )}

                  {method.type === 'card' && method.expiryMonth && method.expiryYear && (
                    <Button variant='outline' size='sm' onClick={() => openEditDialog(method)}>
                      <Edit className='h-4 w-4' />
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='outline' size='sm' disabled={method.isDefault}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove this payment method? This action cannot be
                          undone.
                          {method.isDefault && (
                            <span className='mt-2 block text-yellow-600'>
                              You cannot remove your default payment method. Set another method as
                              default first.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePaymentMethod(method.id)}
                          disabled={method.isDefault || actionLoading}
                          className='bg-red-600 hover:bg-red-700'
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>Add a new payment method for your subscription</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            {setupIntent ? (
              <div className='text-center'>
                <Shield className='mx-auto mb-4 h-12 w-12 text-blue-600' />
                <p className='text-muted-foreground text-sm'>
                  Integration with Stripe Elements would go here to collect payment method details
                  securely.
                </p>
                <div className='mt-4 rounded-lg bg-gray-50 p-4'>
                  <p className='text-xs text-gray-600'>
                    Setup Intent ID: {setupIntent.setupIntentId}
                  </p>
                </div>
              </div>
            ) : (
              <div className='py-8 text-center'>
                <RefreshCw className='mx-auto mb-4 h-8 w-8 animate-spin' />
                <p>Setting up payment method...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button disabled={!setupIntent}>Add Payment Method</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>Update the expiry date for your card</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='expiryMonth'>Expiry Month</Label>
                <Select
                  value={editForm.expiryMonth}
                  onValueChange={value => setEditForm({ ...editForm, expiryMonth: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Month' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='expiryYear'>Expiry Year</Label>
                <Select
                  value={editForm.expiryYear}
                  onValueChange={value => setEditForm({ ...editForm, expiryYear: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Year' />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(
                      year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={updatePaymentMethod}
              disabled={!editForm.expiryMonth || !editForm.expiryYear || actionLoading}
            >
              {actionLoading ? <RefreshCw className='mr-2 h-4 w-4 animate-spin' /> : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
