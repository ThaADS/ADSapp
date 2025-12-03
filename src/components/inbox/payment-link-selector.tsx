'use client'

/**
 * Payment Link Selector Component
 * Allows agents to select and send payment links in conversations
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  X,
  Send,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react'

interface PaymentLink {
  id: string
  name: string
  description?: string
  amount: number
  currency: string
  stripePaymentLinkUrl: string
  status: string
  useCount: number
}

interface PaymentLinkSelectorProps {
  conversationId: string
  contactId: string
  onSend?: (linkId: string) => void
  onClose?: () => void
}

export function PaymentLinkSelector({
  conversationId,
  contactId,
  onSend,
  onClose,
}: PaymentLinkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState<string | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New link form state
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkAmount, setNewLinkAmount] = useState('')
  const [newLinkDescription, setNewLinkDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchPaymentLinks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/payments/links?status=active')
      if (!response.ok) throw new Error('Failed to fetch payment links')

      const data = await response.json()
      setPaymentLinks(data.links || [])
    } catch (err) {
      setError('Could not load payment links')
      console.error('Fetch payment links error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchPaymentLinks()
    }
  }, [isOpen, fetchPaymentLinks])

  const handleCreateLink = async () => {
    if (!newLinkName.trim() || !newLinkAmount) return

    setIsCreating(true)
    setError(null)

    try {
      const amount = Math.round(parseFloat(newLinkAmount) * 100) // Convert to cents

      const response = await fetch('/api/payments/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLinkName,
          description: newLinkDescription || undefined,
          amount,
          currency: 'eur',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create payment link')
      }

      const data = await response.json()

      // Add to list and select it
      setPaymentLinks(prev => [data.paymentLink, ...prev])
      setSelectedLink(data.paymentLink)
      setShowCreateForm(false)
      setNewLinkName('')
      setNewLinkAmount('')
      setNewLinkDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSendLink = async () => {
    if (!selectedLink) return

    setIsSending(selectedLink.id)
    setError(null)

    try {
      const response = await fetch(`/api/payments/links/${selectedLink.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          contactId,
          personalMessage: personalMessage || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send payment link')
      }

      // Success - close and notify parent
      onSend?.(selectedLink.id)
      setIsOpen(false)
      setSelectedLink(null)
      setPersonalMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setIsSending(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        title="Betaallink versturen"
        aria-label="Betaallink versturen"
      >
        <CreditCard className="w-4 h-4" />
        <span className="hidden sm:inline">Betaallink</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Betaallink versturen</h3>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onClose?.()
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Sluiten"
              title="Sluiten"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="mx-4 mt-3 p-2 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {/* Create New Link Form */}
            {showCreateForm ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam
                  </label>
                  <input
                    type="text"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    placeholder="Bijv. Factuur #123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrag (EUR)
                  </label>
                  <input
                    type="number"
                    value={newLinkAmount}
                    onChange={e => setNewLinkAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Omschrijving (optioneel)
                  </label>
                  <textarea
                    value={newLinkDescription}
                    onChange={e => setNewLinkDescription(e.target.value)}
                    placeholder="Korte omschrijving..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateLink}
                    disabled={!newLinkName.trim() || !newLinkAmount || isCreating}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Aanmaken
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Payment Links List */}
                <div className="p-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : paymentLinks.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Geen betaallinks gevonden</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {paymentLinks.map(link => (
                        <button
                          type="button"
                          key={link.id}
                          onClick={() => setSelectedLink(link)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedLink?.id === link.id
                              ? 'bg-emerald-50 border-2 border-emerald-500'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{link.name}</span>
                            <span className="text-sm font-semibold text-emerald-600">
                              {formatCurrency(link.amount, link.currency)}
                            </span>
                          </div>
                          {link.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {link.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {link.useCount} keer verstuurd
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Create New Button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full mt-2 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nieuwe betaallink aanmaken
                  </button>
                </div>

                {/* Selected Link Actions */}
                {selectedLink && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Persoonlijk bericht (optioneel)
                      </label>
                      <textarea
                        value={personalMessage}
                        onChange={e => setPersonalMessage(e.target.value)}
                        placeholder="Voeg een persoonlijk bericht toe..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={selectedLink.stripePaymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={handleSendLink}
                        disabled={isSending !== null}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSending === selectedLink.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Versturen
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentLinkSelector
