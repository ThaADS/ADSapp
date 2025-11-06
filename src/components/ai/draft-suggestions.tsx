'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, ThumbsUp, Copy, Check } from 'lucide-react'

interface DraftSuggestion {
  content: string
  tone: 'professional' | 'friendly' | 'empathetic'
  reasoning: string
  confidence: number
}

interface DraftSuggestionsProps {
  conversationId: string
  organizationId: string
  contactName: string
  onSelectDraft: (content: string) => void
  className?: string
}

export default function DraftSuggestions({
  conversationId,
  organizationId,
  contactName,
  onSelectDraft,
  className = '',
}: DraftSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(true)

  const generateDrafts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          organizationId,
          count: 3,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate drafts')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Draft generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyDraft = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional':
        return 'bg-blue-100 text-blue-700'
      case 'friendly':
        return 'bg-green-100 text-green-700'
      case 'empathetic':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'professional':
        return '💼'
      case 'friendly':
        return '😊'
      case 'empathetic':
        return '🤝'
      default:
        return '✨'
    }
  }

  return (
    <div className={`rounded-lg border border-emerald-200 bg-emerald-50 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-emerald-200 bg-emerald-100 px-4 py-3'>
        <div className='flex items-center space-x-2'>
          <Sparkles className='h-5 w-5 text-emerald-600' />
          <h3 className='text-sm font-semibold text-emerald-900'>AI Draft Suggestions</h3>
          {suggestions.length > 0 && !loading && (
            <span className='rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800'>
              {suggestions.length} options
            </span>
          )}
        </div>
        <div className='flex items-center space-x-2'>
          {suggestions.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className='text-xs text-emerald-700 hover:text-emerald-900'
            >
              {expanded ? 'Hide' : 'Show'}
            </button>
          )}
          <button
            onClick={generateDrafts}
            disabled={loading}
            className='flex items-center space-x-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? (
              <>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <RefreshCw className='h-3 w-3' />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className='p-4'>
          {error && (
            <div className='mb-3 rounded-md border border-red-200 bg-red-50 p-3'>
              <p className='text-sm text-red-800'>{error}</p>
            </div>
          )}

          {loading && (
            <div className='space-y-3'>
              {[1, 2, 3].map(i => (
                <div key={i} className='animate-pulse rounded-lg bg-white p-4'>
                  <div className='mb-2 h-4 w-20 rounded bg-gray-200'></div>
                  <div className='h-3 w-full rounded bg-gray-200'></div>
                  <div className='mt-2 h-3 w-4/5 rounded bg-gray-200'></div>
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && !error && (
            <div className='rounded-lg bg-white p-8 text-center'>
              <Sparkles className='mx-auto mb-3 h-12 w-12 text-emerald-300' />
              <p className='mb-2 text-sm font-medium text-gray-900'>Ready to save time?</p>
              <p className='mb-4 text-xs text-gray-600'>
                Click &quot;Generate&quot; to get 3 AI-powered response suggestions for{' '}
                {contactName}
              </p>
              <p className='text-xs text-emerald-700'>💡 Save 75% of your response time</p>
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className='space-y-3'>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className='group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md'
                >
                  {/* Tone Badge */}
                  <div className='mb-3 flex items-center justify-between'>
                    <span
                      className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-1 text-xs font-medium ${getToneColor(suggestion.tone)}`}
                    >
                      <span>{getToneIcon(suggestion.tone)}</span>
                      <span className='capitalize'>{suggestion.tone}</span>
                    </span>
                    {suggestion.confidence && (
                      <span className='text-xs text-gray-500'>
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>

                  {/* Draft Content */}
                  <p className='mb-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-900'>
                    {suggestion.content}
                  </p>

                  {/* Reasoning (optional, shown on hover) */}
                  {suggestion.reasoning && (
                    <details className='mb-3'>
                      <summary className='cursor-pointer text-xs text-gray-500 hover:text-gray-700'>
                        Why this suggestion?
                      </summary>
                      <p className='mt-2 text-xs text-gray-600'>{suggestion.reasoning}</p>
                    </details>
                  )}

                  {/* Actions */}
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={() => onSelectDraft(suggestion.content)}
                      className='flex flex-1 items-center justify-center space-x-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700'
                    >
                      <ThumbsUp className='h-3 w-3' />
                      <span>Use This</span>
                    </button>
                    <button
                      onClick={() => handleCopyDraft(suggestion.content, index)}
                      className='flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50'
                    >
                      {copiedIndex === index ? (
                        <Check className='h-3 w-3 text-green-600' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className='mt-4 rounded-md bg-emerald-100 p-3'>
              <p className='text-xs text-emerald-800'>
                <strong>⚡ Pro Tip:</strong> Select a draft to insert it into your message, then
                edit as needed. This saves ~75% of your typing time!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
