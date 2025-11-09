'use client'

/**
 * AI Reply Suggestions Component
 * Shows AI-generated reply suggestions above the message composer
 */

import { useState, useEffect } from 'react'
import { SparklesIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface ReplySuggestion {
  id: string
  text: string
  tone: 'professional' | 'friendly' | 'casual'
  confidence: number
  reasoning?: string
}

interface AISuggestionsProps {
  conversationId: string
  organizationId: string
  messages: Array<{
    id: string
    content: string
    is_from_contact: boolean
    created_at: string
  }>
  onSelectSuggestion: (text: string) => void
  enabled?: boolean
}

export function AISuggestions({
  conversationId,
  organizationId,
  messages,
  onSelectSuggestion,
  enabled = true,
}: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [selectedTone, setSelectedTone] = useState<'professional' | 'friendly' | 'casual'>(
    'professional'
  )

  // Load suggestions when conversation updates
  useEffect(() => {
    if (!enabled || dismissed) return

    // Only show suggestions if last message is from customer
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || !lastMessage.is_from_contact) {
      setSuggestions([])
      return
    }

    loadSuggestions()
  }, [messages, enabled, dismissed])

  async function loadSuggestions() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          organizationId,
          messages: messages.slice(-10).map(m => ({
            sender: m.is_from_contact ? 'customer' : 'agent',
            content: m.content,
            timestamp: m.created_at,
          })),
          tone: selectedTone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to load suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Failed to load AI suggestions:', err)
      setError('Kon geen suggesties laden')
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUseSuggestion(suggestion: ReplySuggestion) {
    onSelectSuggestion(suggestion.text)

    // Send feedback
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          feature: 'suggestion',
          action: 'accepted',
          suggestionId: suggestion.id,
        }),
      })
    } catch (err) {
      console.error('Failed to send feedback:', err)
    }

    // Clear suggestions after use
    setSuggestions([])
  }

  async function handleRejectSuggestion(suggestion: ReplySuggestion) {
    // Remove this suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))

    // Send feedback
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          feature: 'suggestion',
          action: 'rejected',
          suggestionId: suggestion.id,
        }),
      })
    } catch (err) {
      console.error('Failed to send feedback:', err)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    setSuggestions([])
  }

  async function handleRegenerateTone(tone: 'professional' | 'friendly' | 'casual') {
    setSelectedTone(tone)
    setDismissed(false)
    await loadSuggestions()
  }

  if (!enabled || dismissed) return null
  if (suggestions.length === 0 && !loading && !error) return null

  return (
    <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-900">AI Suggesties</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Tone selector */}
          <select
            value={selectedTone}
            onChange={e =>
              handleRegenerateTone(e.target.value as 'professional' | 'friendly' | 'casual')
            }
            className="text-xs border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="professional">Professioneel</option>
            <option value="friendly">Vriendelijk</option>
            <option value="casual">Casual</option>
          </select>

          <button
            onClick={() => handleRegenerateTone(selectedTone)}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Vernieuw suggesties"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Sluit suggesties"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 mb-2">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-600">Suggesties genereren...</span>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm text-gray-800 mb-2">{suggestion.text}</p>

                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                      {suggestion.tone === 'professional' && 'Professioneel'}
                      {suggestion.tone === 'friendly' && 'Vriendelijk'}
                      {suggestion.tone === 'casual' && 'Casual'}
                    </span>
                    <span>•</span>
                    <span>
                      {Math.round(suggestion.confidence * 100)}% betrouwbaar
                    </span>
                  </div>

                  {suggestion.reasoning && (
                    <p className="mt-1 text-xs text-gray-500 italic">
                      {suggestion.reasoning}
                    </p>
                  )}
                </div>

                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Gebruik deze suggestie"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRejectSuggestion(suggestion)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Verberg deze suggestie"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && !error && (
        <p className="text-sm text-gray-500 text-center py-2">
          Geen suggesties beschikbaar
        </p>
      )}
    </div>
  )
}

/**
 * Compact version for mobile/small screens
 */
export function AISuggestionsCompact({
  conversationId,
  organizationId,
  messages,
  onSelectSuggestion,
  enabled = true,
}: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || !lastMessage.is_from_contact) {
      setSuggestions([])
      return
    }

    loadSuggestions()
  }, [messages, enabled])

  async function loadSuggestions() {
    setLoading(true)

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          organizationId,
          messages: messages.slice(-10).map(m => ({
            sender: m.is_from_contact ? 'customer' : 'agent',
            content: m.content,
            timestamp: m.created_at,
          })),
          count: 2, // Only 2 suggestions for compact view
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (err) {
      console.error('Failed to load AI suggestions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!enabled || suggestions.length === 0) return null

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full border-t border-gray-200 bg-indigo-50 p-2 flex items-center justify-center space-x-2 hover:bg-indigo-100 transition-colors"
      >
        <SparklesIcon className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-medium text-indigo-700">
          {suggestions.length} AI suggestie{suggestions.length > 1 ? 's' : ''}
        </span>
      </button>
    )
  }

  return (
    <div className="border-t border-gray-200 bg-indigo-50 p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">AI Suggesties</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          Verberg
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map(suggestion => (
          <button
            key={suggestion.id}
            onClick={() => {
              onSelectSuggestion(suggestion.text)
              setExpanded(false)
            }}
            className="w-full text-left bg-white rounded-lg p-2 text-sm text-gray-800 hover:bg-gray-50 border border-gray-200"
          >
            {suggestion.text.length > 80
              ? suggestion.text.substring(0, 80) + '...'
              : suggestion.text}
          </button>
        ))}
      </div>
    </div>
  )
}
